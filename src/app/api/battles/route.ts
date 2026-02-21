import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbToAgent } from "@/types/agent";
import { pickTopicFromDb } from "@/data/topics";
import type { Provider } from "@/lib/ai";
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

  // 2. Parse request (before quota check — need api_key for BYOK)
  const body = await request.json();
  const { agent_id, api_key, provider, model } = body as {
    agent_id?: string;
    api_key?: string;
    provider?: Provider;
    model?: string;
  };

  // 3. Check free battle quota — BYOK bypasses when exhausted
  const { data: profile } = await supabase
    .from("profiles")
    .select("free_battles_remaining")
    .eq("id", user.id)
    .single();

  const remaining = profile?.free_battles_remaining ?? 0;
  const isByok = remaining <= 0 && typeof api_key === "string" && api_key.length >= 10;

  if (remaining <= 0 && !isByok) {
    return NextResponse.json(
      { error: "FREE_BATTLES_EXHAUSTED", remaining: 0 },
      { status: 403 },
    );
  }
  if (!agent_id) {
    return NextResponse.json({ error: "agent_id required" }, { status: 400 });
  }

  // 4. Fetch user's agent
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

  // 5. Find opponent — try PvP first, then NPC fallback
  // Step A: Real player agents within ELO ±200
  let { data: pvpCandidates } = await admin
    .from("agents")
    .select("*")
    .neq("owner_id", user.id)
    .neq("owner_id", NPC_OWNER_ID)
    .eq("is_active", true)
    .gte("elo", playerAgent.elo - 200)
    .lte("elo", playerAgent.elo + 200)
    .limit(10);

  let opponents = pvpCandidates && pvpCandidates.length > 0 ? pvpCandidates : null;

  // Step B: NPC agents (ELO ±200)
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

  // Step C: Any NPC
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

  // Pick random opponent
  const opponentRow = opponents[Math.floor(Math.random() * opponents.length)];
  const opponentAgent = dbToAgent(opponentRow);

  // 6. Random PRO/CON assignment — agent_a is always PRO
  const playerIsPro = Math.random() < 0.5;
  const agentA = playerIsPro ? playerAgent : opponentAgent;
  const agentB = playerIsPro ? opponentAgent : playerAgent;

  // 7. Pick topic from DB (ELO-based difficulty)
  const avgElo = Math.round((playerAgent.elo + opponentAgent.elo) / 2);
  const { topic, category } = await pickTopicFromDb(admin, avgElo);

  // 8. Build BYOK config for worker (if applicable)
  const byokConfig = isByok
    ? { provider: provider || "openai", api_key: api_key!, model: model || "" }
    : null;

  // 9. Create battle record as PENDING (worker will pick it up)
  const { data: battle, error: battleErr } = await admin
    .from("battles")
    .insert({
      agent_a_id: agentA.id,
      agent_b_id: agentB.id,
      topic,
      topic_category: category,
      status: "pending",
      model_tier: isByok ? (provider || "openai") : "free",
      byok_config: byokConfig,
    })
    .select("id")
    .single();

  if (battleErr || !battle) {
    return NextResponse.json(
      { error: "Failed to create battle record" },
      { status: 500 },
    );
  }

  // 10. Decrement free battle counter immediately (skip for BYOK)
  const newRemaining = isByok ? remaining : Math.max(0, remaining - 1);
  if (!isByok) {
    await admin
      .from("profiles")
      .update({ free_battles_remaining: newRemaining })
      .eq("id", user.id);
  }

  // Return immediately (~200ms) — worker handles execution
  return NextResponse.json({
    battle_id: battle.id,
    free_battles_remaining: newRemaining,
  });
}
