import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reclaim stale battles (in_progress > 5 min) and abort those over retry limit.
 * Called every 60s from the main loop.
 */
export async function reclaimStaleBattles(admin: SupabaseClient): Promise<void> {
  const { data, error } = await admin.rpc("reclaim_stale_battles");

  if (error) {
    console.error("[cron] reclaim error:", error.message);
    return;
  }

  const reclaimed = typeof data === "number" ? data : 0;
  if (reclaimed > 0) {
    console.log(`[cron] reclaimed ${reclaimed} stale battle(s)`);
  }
}
