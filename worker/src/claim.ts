import type { SupabaseClient } from "@supabase/supabase-js";

export interface ClaimedBattle {
  id: string;
  agent_a_id: string;
  agent_b_id: string;
  topic: string;
  topic_category: string;
  model_tier: string;
  byok_config: { provider: string; api_key: string; model?: string } | null;
  current_turn: number;
  retry_count: number;
}

/**
 * Atomically claim one pending battle using FOR UPDATE SKIP LOCKED.
 * Returns null if no pending battles exist.
 */
export async function claimBattle(
  admin: SupabaseClient,
  workerId: string,
): Promise<ClaimedBattle | null> {
  const { data, error } = await admin.rpc("claim_pending_battle", {
    p_worker_id: workerId,
  });

  if (error) {
    console.error("[claim] RPC error:", error.message);
    return null;
  }

  // RPC returns an array (SETOF), take the first row
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    id: row.id,
    agent_a_id: row.agent_a_id,
    agent_b_id: row.agent_b_id,
    topic: row.topic,
    topic_category: row.topic_category,
    model_tier: row.model_tier,
    byok_config: row.byok_config,
    current_turn: row.current_turn ?? 0,
    retry_count: row.retry_count ?? 0,
  };
}
