import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbToAgent } from "@/types/agent";
import { TURN_SEQUENCE } from "@/types/battle";
import { pickTopicForElo } from "@/data/topics";
import { runFullBattle } from "@/lib/battle-engine";
import { checkNewBadges } from "@/types/badge";
import { NextResponse } from "next/server";

// NPC system user ID — matches the seed script
const NPC_OWNER_ID = "00000000-0000-0000-0000-000000000000";

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2. Parse request
  const body = await request.json();
  const { agent_id } = body;
  if (!agent_id) {
    return NextResponse.json({ error: "agent_id required" }, { status: 400 });
  }

  // 3. Fetch user's agent
  const { data: agentRow, error: agentErr } = await supabase
    .from("agents")
    .select("*")
    .eq("id", agent_id)
    .eq("owner_id", user.id)
    .single();

  if (agentErr || !agentRow) {
    return NextResponse.json({ error: "Agent not found or not owned" }, { status: 404 });
  }
  const playerAgent = dbToAgent(agentRow);

  // 4. Find opponent — try PvP first, then NPC fallback
  // Step A: Look for real player agents within ELO ±200 (exclude same owner)
  let { data: pvpCandidates } = await admin
    .from("agents")
    .select("*")
    .neq("owner_id", user.id) // not same owner
    .neq("owner_id", NPC_OWNER_ID) // not NPC
    .eq("is_active", true)
    .gte("elo", playerAgent.elo - 200)
    .lte("elo", playerAgent.elo + 200)
    .limit(10);

  let opponents = pvpCandidates && pvpCandidates.length > 0 ? pvpCandidates : null;

  // Step B: Fallback to NPC agents (ELO ±200)
  if (!opponents) {
    const { data: npcClose } = await admin
      .from("agents")
      .select("*")
      .eq("owner_id", NPC_OWNER_ID)
      .gte("elo", playerAgent.elo - 200)
      .lte("elo", playerAgent.elo + 200)
      .limit(10);
    opponents = npcClose && npcClose.length > 0 ? npcClose : null;
  }

  // Step C: Fallback to any NPC
  if (!opponents) {
    const { data: npcAny } = await admin
      .from("agents")
      .select("*")
      .eq("owner_id", NPC_OWNER_ID)
      .limit(10);
    opponents = npcAny && npcAny.length > 0 ? npcAny : null;
  }

  if (!opponents || opponents.length === 0) {
    return NextResponse.json(
      { error: "No opponents available. Seed NPC agents first." },
      { status: 503 },
    );
  }

  // Pick random opponent from candidates
  const opponentRow = opponents[Math.floor(Math.random() * opponents.length)];
  const opponentAgent = dbToAgent(opponentRow);

  // 5. Random PRO/CON assignment — agent_a is always PRO
  const playerIsPro = Math.random() < 0.5;
  const agentA = playerIsPro ? playerAgent : opponentAgent; // PRO
  const agentB = playerIsPro ? opponentAgent : playerAgent; // CON

  // 6. Pick topic (ELO-based difficulty: <1000 casual, 1000-1500 standard, 1500+ advanced)
  const avgElo = Math.round((playerAgent.elo + opponentAgent.elo) / 2);
  const { topic, category } = pickTopicForElo(avgElo);

  // 7. Create battle record (pending)
  const { data: battle, error: battleErr } = await admin
    .from("battles")
    .insert({
      agent_a_id: agentA.id,
      agent_b_id: agentB.id,
      topic,
      topic_category: category,
      status: "in_progress",
      model_tier: "free",
    })
    .select("id")
    .single();

  if (battleErr || !battle) {
    return NextResponse.json(
      { error: "Failed to create battle record" },
      { status: 500 },
    );
  }

  const battleId = battle.id;

  try {
    // 8. Run the full battle engine
    const result = await runFullBattle(agentA, agentB, topic);

    // 9. Persist turns
    const turnInserts = result.turns.flatMap((turn, i) => {
      const seq = TURN_SEQUENCE[i];
      return [
        {
          battle_id: battleId,
          turn_number: seq.turn,
          agent_id: agentA.id,
          role: "pro",
          content: turn.pro.content,
          turn_type: seq.type,
          tokens_used: turn.pro.tokens,
        },
        {
          battle_id: battleId,
          turn_number: seq.turn,
          agent_id: agentB.id,
          role: "con",
          content: turn.con.content,
          turn_type: seq.type,
          tokens_used: turn.con.tokens,
        },
      ];
    });

    await admin.from("battle_turns").insert(turnInserts);

    // 10. Update battle with results
    await admin
      .from("battles")
      .update({
        status: "completed",
        winner_id: result.winner_id,
        score_a: result.judgeResult.score_a,
        score_b: result.judgeResult.score_b,
        elo_change_a: result.elo_change_a,
        elo_change_b: result.elo_change_b,
        completed_at: new Date().toISOString(),
      })
      .eq("id", battleId);

    // 11. Update agent ELOs and W/L records
    const winnerIsA = result.winner_id === agentA.id;
    const winnerIsB = result.winner_id === agentB.id;

    await admin
      .from("agents")
      .update({
        elo: agentA.elo + result.elo_change_a,
        wins: agentA.wins + (winnerIsA ? 1 : 0),
        losses: agentA.losses + (winnerIsB ? 1 : 0),
      })
      .eq("id", agentA.id);

    await admin
      .from("agents")
      .update({
        elo: agentB.elo + result.elo_change_b,
        wins: agentB.wins + (winnerIsB ? 1 : 0),
        losses: agentB.losses + (winnerIsA ? 1 : 0),
      })
      .eq("id", agentB.id);

    // 12. Record ELO history
    await admin.from("elo_history").insert([
      {
        agent_id: agentA.id,
        battle_id: battleId,
        elo_before: agentA.elo,
        elo_after: agentA.elo + result.elo_change_a,
        change: result.elo_change_a,
      },
      {
        agent_id: agentB.id,
        battle_id: battleId,
        elo_before: agentB.elo,
        elo_after: agentB.elo + result.elo_change_b,
        change: result.elo_change_b,
      },
    ]);

    // 13. Award badges for the player's agent
    const playerIsA = agentA.id === playerAgent.id;
    const playerWon = result.winner_id === playerAgent.id;
    const playerScoreTotal = playerIsA
      ? result.judgeResult.score_a.total
      : result.judgeResult.score_b.total;
    const opponentScoreTotal = playerIsA
      ? result.judgeResult.score_b.total
      : result.judgeResult.score_a.total;

    // Fetch recent battle results for streak calculation
    const { data: recentBattles } = await admin
      .from("battles")
      .select("winner_id, agent_a_id, agent_b_id")
      .or(`agent_a_id.eq.${playerAgent.id},agent_b_id.eq.${playerAgent.id}`)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(15);

    const recentResults: ("win" | "loss")[] = (recentBattles ?? []).map((b) =>
      b.winner_id === playerAgent.id ? "win" : "loss",
    );

    const existingBadges: string[] = (playerAgent.traits._badges as unknown as string[]) ?? [];
    const newBadges = checkNewBadges(existingBadges, {
      won: playerWon,
      totalWins: playerAgent.wins + (playerWon ? 1 : 0),
      totalBattles: playerAgent.wins + playerAgent.losses + 1,
      winMargin: playerScoreTotal - opponentScoreTotal,
      opponentElo: opponentAgent.elo,
      agentElo: playerAgent.elo,
      recentResults,
    });

    // 14. Auto-trait evolution (P015)
    const totalBattles = playerAgent.wins + playerAgent.losses + 1;
    const currentTraits = { ...playerAgent.traits };
    const streak = countStreak(recentResults);

    // 5 win streak → "Confidence" trait (+1 boldness flavor)
    if (streak >= 5 && !currentTraits["Confidence"]) {
      currentTraits["Confidence"] = 1;
    }
    // 3 loss streak → "Caution" trait (defensive adaptation)
    const lossStreak = countLossStreak(recentResults);
    if (lossStreak >= 3 && !currentTraits["Caution"]) {
      currentTraits["Caution"] = 1;
    }
    // Comeback win (win after 3+ losses) → "Grit"
    if (playerWon && recentResults.length >= 2 && recentResults[1] === "loss" && !currentTraits["Grit"]) {
      const prevLosses = recentResults.slice(1).findIndex((r) => r === "win");
      if (prevLosses >= 2) currentTraits["Grit"] = 1;
    }
    // Beat opponent 200+ ELO higher → "Giant Slayer" trait
    if (playerWon && opponentAgent.elo - playerAgent.elo >= 200 && !currentTraits["Giant Slayer"]) {
      currentTraits["Giant Slayer"] = 1;
    }
    // 10+ battles → experience marker
    if (totalBattles >= 10 && !currentTraits["Experienced"]) {
      currentTraits["Experienced"] = 1;
    }

    // Merge badges into traits
    const updatedBadges = [...existingBadges, ...newBadges];
    if (newBadges.length > 0 || JSON.stringify(currentTraits) !== JSON.stringify(playerAgent.traits)) {
      currentTraits._badges = updatedBadges as unknown as number;
      await admin
        .from("agents")
        .update({ traits: currentTraits })
        .eq("id", playerAgent.id);
    }

    return NextResponse.json({ battle_id: battleId });
  } catch (err) {
    // Mark battle as aborted on error
    await admin
      .from("battles")
      .update({ status: "aborted" })
      .eq("id", battleId);

    console.error("Battle engine error:", err);
    return NextResponse.json(
      { error: "Battle execution failed. Please try again." },
      { status: 500 },
    );
  }
}

function countStreak(results: ("win" | "loss")[]): number {
  let streak = 0;
  for (const r of results) {
    if (r === "win") streak++;
    else break;
  }
  return streak;
}

function countLossStreak(results: ("win" | "loss")[]): number {
  let streak = 0;
  for (const r of results) {
    if (r === "loss") streak++;
    else break;
  }
  return streak;
}
