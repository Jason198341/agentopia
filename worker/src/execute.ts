import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClaimedBattle } from "./claim.js";
import { dbToAgent, type Agent } from "@/types/agent";
import { TURN_SEQUENCE } from "@/types/battle";
import { checkNewBadges } from "@/types/badge";
import {
  executeTurn,
  judgeBattle,
  calculateElo,
} from "@/lib/battle-engine";
import {
  fireworksCompletion,
  createCompletionFn,
  type CompletionFn,
  type Provider,
} from "@/lib/ai";

/**
 * Execute a full battle: 5 turns + judge + ELO + badges + traits.
 * Each turn is saved to DB immediately → triggers Supabase Realtime.
 */
export async function executeBattle(
  admin: SupabaseClient,
  battle: ClaimedBattle,
): Promise<void> {
  // 1. Fetch both agents
  const [{ data: agentARow }, { data: agentBRow }] = await Promise.all([
    admin.from("agents").select("*").eq("id", battle.agent_a_id).single(),
    admin.from("agents").select("*").eq("id", battle.agent_b_id).single(),
  ]);

  if (!agentARow || !agentBRow) {
    throw new Error(`Agent not found: A=${battle.agent_a_id} B=${battle.agent_b_id}`);
  }

  const agentA = dbToAgent(agentARow);
  const agentB = dbToAgent(agentBRow);

  // 2. Build completion function (BYOK or Fireworks)
  let complete: CompletionFn = fireworksCompletion;
  if (battle.byok_config?.api_key) {
    const cfg = battle.byok_config;
    complete = createCompletionFn(
      (cfg.provider || "openai") as Provider,
      cfg.api_key,
      cfg.model,
    );
  }

  // 3. Execute turns one by one, saving each immediately
  interface TurnResult {
    pro: { content: string; tokens: number };
    con: { content: string; tokens: number };
  }
  const turns: TurnResult[] = [];

  for (let i = 0; i < TURN_SEQUENCE.length; i++) {
    const { turn: turnNumber, type: turnType } = TURN_SEQUENCE[i];
    const prevTurn = i > 0 ? turns[i - 1] : undefined;

    const result = await executeTurn(
      agentA,
      agentB,
      battle.topic,
      turnType,
      prevTurn?.pro.content,
      prevTurn?.con.content,
      complete,
      battle.topic_category,
    );

    turns.push(result);

    // INSERT turn rows immediately → Realtime fires
    await admin.from("battle_turns").insert([
      {
        battle_id: battle.id,
        turn_number: turnNumber,
        agent_id: agentA.id,
        role: "pro",
        content: result.pro.content,
        turn_type: turnType,
        tokens_used: result.pro.tokens,
      },
      {
        battle_id: battle.id,
        turn_number: turnNumber,
        agent_id: agentB.id,
        role: "con",
        content: result.con.content,
        turn_type: turnType,
        tokens_used: result.con.tokens,
      },
    ]);

    // UPDATE current_turn → Realtime fires (progress bar)
    await admin
      .from("battles")
      .update({ current_turn: turnNumber })
      .eq("id", battle.id);

    console.log(`  [turn ${turnNumber}/5] done`);
  }

  // 4. Judge
  const judgeResult = await judgeBattle(
    battle.topic,
    agentA,
    agentB,
    turns,
    complete,
  );

  // 5. ELO calculation
  const { changeA, changeB } = calculateElo(
    agentA.elo,
    agentB.elo,
    judgeResult.score_a.total,
    judgeResult.score_b.total,
  );

  // 6. Determine winner
  let winner_id: string | null = null;
  if (judgeResult.score_a.total > judgeResult.score_b.total) {
    winner_id = agentA.id;
  } else if (judgeResult.score_b.total > judgeResult.score_a.total) {
    winner_id = agentB.id;
  }

  // 7. Update battle with results
  await admin
    .from("battles")
    .update({
      status: "completed",
      winner_id,
      score_a: judgeResult.score_a,
      score_b: judgeResult.score_b,
      elo_change_a: changeA,
      elo_change_b: changeB,
      completed_at: new Date().toISOString(),
    })
    .eq("id", battle.id);

  // 8. Update agent ELOs and W/L
  const winnerIsA = winner_id === agentA.id;
  const winnerIsB = winner_id === agentB.id;

  await Promise.all([
    admin
      .from("agents")
      .update({
        elo: agentA.elo + changeA,
        wins: agentA.wins + (winnerIsA ? 1 : 0),
        losses: agentA.losses + (winnerIsB ? 1 : 0),
      })
      .eq("id", agentA.id),
    admin
      .from("agents")
      .update({
        elo: agentB.elo + changeB,
        wins: agentB.wins + (winnerIsB ? 1 : 0),
        losses: agentB.losses + (winnerIsA ? 1 : 0),
      })
      .eq("id", agentB.id),
  ]);

  // 9. Record ELO history
  await admin.from("elo_history").insert([
    {
      agent_id: agentA.id,
      battle_id: battle.id,
      elo_before: agentA.elo,
      elo_after: agentA.elo + changeA,
      change: changeA,
    },
    {
      agent_id: agentB.id,
      battle_id: battle.id,
      elo_before: agentB.elo,
      elo_after: agentB.elo + changeB,
      change: changeB,
    },
  ]);

  // 10. Update topic stats
  if (winner_id) {
    const winnerIsPro = winner_id === agentA.id;
    const field = winnerIsPro ? "pro_wins" : "con_wins";
    const { data: topicRow } = await admin
      .from("topics")
      .select(`${field}, id`)
      .eq("topic", battle.topic)
      .single();
    if (topicRow) {
      await admin
        .from("topics")
        .update({ [field]: (topicRow as Record<string, number>)[field] + 1 })
        .eq("id", topicRow.id);
    }
  }

  // 11. Badges + trait evolution for both agents (they're both "players")
  await updateBadgesAndTraits(admin, agentA, agentB, winner_id, judgeResult, changeA);
  await updateBadgesAndTraits(admin, agentB, agentA, winner_id, judgeResult, changeB);

  console.log(`  [judge] winner=${winner_id ? (winner_id === agentA.id ? agentA.name : agentB.name) : "draw"} elo=${changeA > 0 ? "+" : ""}${changeA}/${changeB > 0 ? "+" : ""}${changeB}`);
}

// ─── Badge & Trait update for a single agent ───

async function updateBadgesAndTraits(
  admin: SupabaseClient,
  agent: Agent,
  opponent: Agent,
  winner_id: string | null,
  judgeResult: { score_a: { total: number }; score_b: { total: number } },
  _eloChange: number,
) {
  const won = winner_id === agent.id;
  const isAgentA = agent.id !== opponent.id; // heuristic; always works because agents differ

  // Fetch recent battles for streak
  const { data: recentBattles } = await admin
    .from("battles")
    .select("winner_id, agent_a_id, agent_b_id")
    .or(`agent_a_id.eq.${agent.id},agent_b_id.eq.${agent.id}`)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(15);

  const recentResults: ("win" | "loss")[] = (recentBattles ?? []).map((b) =>
    b.winner_id === agent.id ? "win" : "loss",
  );

  const existingBadges: string[] = (agent.traits._badges as unknown as string[]) ?? [];
  const playerScore = isAgentA ? judgeResult.score_a.total : judgeResult.score_b.total;
  const opponentScore = isAgentA ? judgeResult.score_b.total : judgeResult.score_a.total;

  const newBadges = checkNewBadges(existingBadges, {
    won,
    totalWins: agent.wins + (won ? 1 : 0),
    totalBattles: agent.wins + agent.losses + 1,
    winMargin: playerScore - opponentScore,
    opponentElo: opponent.elo,
    agentElo: agent.elo,
    recentResults,
  });

  // Auto-trait evolution
  const totalBattles = agent.wins + agent.losses + 1;
  const currentTraits = { ...agent.traits };

  const streak = countStreak(recentResults);
  if (streak >= 5 && !currentTraits["Confidence"]) {
    currentTraits["Confidence"] = 1;
  }
  const lossStreak = countLossStreak(recentResults);
  if (lossStreak >= 3 && !currentTraits["Caution"]) {
    currentTraits["Caution"] = 1;
  }
  if (won && recentResults.length >= 2 && recentResults[1] === "loss" && !currentTraits["Grit"]) {
    const prevLosses = recentResults.slice(1).findIndex((r) => r === "win");
    if (prevLosses >= 2) currentTraits["Grit"] = 1;
  }
  if (won && opponent.elo - agent.elo >= 200 && !currentTraits["Giant Slayer"]) {
    currentTraits["Giant Slayer"] = 1;
  }
  if (totalBattles >= 10 && !currentTraits["Experienced"]) {
    currentTraits["Experienced"] = 1;
  }

  const updatedBadges = [...existingBadges, ...newBadges];
  if (newBadges.length > 0 || JSON.stringify(currentTraits) !== JSON.stringify(agent.traits)) {
    currentTraits._badges = updatedBadges as unknown as number;
    await admin
      .from("agents")
      .update({ traits: currentTraits })
      .eq("id", agent.id);
  }
}

function countStreak(results: ("win" | "loss")[]): number {
  let s = 0;
  for (const r of results) {
    if (r === "win") s++;
    else break;
  }
  return s;
}

function countLossStreak(results: ("win" | "loss")[]): number {
  let s = 0;
  for (const r of results) {
    if (r === "loss") s++;
    else break;
  }
  return s;
}
