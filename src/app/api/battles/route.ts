import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbToAgent } from "@/types/agent";
import { TURN_SEQUENCE } from "@/types/battle";
import { pickRandomTopic } from "@/data/topics";
import { runFullBattle } from "@/lib/battle-engine";
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

  // 4. Find NPC opponent (ELO ±200, not owned by player)
  let opponentQuery = admin
    .from("agents")
    .select("*")
    .eq("owner_id", NPC_OWNER_ID)
    .gte("elo", playerAgent.elo - 200)
    .lte("elo", playerAgent.elo + 200)
    .limit(10);

  let { data: opponents } = await opponentQuery;

  // Fallback: any NPC if no close-ELO match
  if (!opponents || opponents.length === 0) {
    const { data: fallback } = await admin
      .from("agents")
      .select("*")
      .eq("owner_id", NPC_OWNER_ID)
      .limit(10);
    opponents = fallback;
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

  // 6. Pick topic
  const { topic, category } = pickRandomTopic();

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
