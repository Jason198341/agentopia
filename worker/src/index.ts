import { createClient } from "@supabase/supabase-js";
import { claimBattle } from "./claim.js";
import { executeBattle } from "./execute.js";
import { reclaimStaleBattles } from "./cron.js";
import { startHealthServer, incrementProcessed } from "./health.js";
import { randomUUID } from "node:crypto";

// ─── Config ───

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORT = parseInt(process.env.PORT || "8080", 10);
const POLL_INTERVAL = 2000; // 2s between polls
const CRON_INTERVAL = 60000; // 60s between stale checks
const WORKER_ID = `worker-${randomUUID().slice(0, 8)}`;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Main Loop ───

let busy = false;

async function poll() {
  if (busy) return; // skip if still executing previous battle
  busy = true;

  try {
    const battle = await claimBattle(admin, WORKER_ID);
    if (!battle) {
      busy = false;
      return;
    }

    console.log(`[poll] claimed battle ${battle.id} (retry=${battle.retry_count})`);

    try {
      await executeBattle(admin, battle);
      incrementProcessed();
      console.log(`[poll] completed battle ${battle.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[poll] battle ${battle.id} failed:`, msg);

      // Mark as pending (will be retried) or aborted (max retries)
      if (battle.retry_count < 2) {
        await admin
          .from("battles")
          .update({
            status: "pending",
            worker_id: null,
            worker_claimed_at: null,
            retry_count: battle.retry_count + 1,
            error_message: msg,
          })
          .eq("id", battle.id);
      } else {
        await admin
          .from("battles")
          .update({
            status: "aborted",
            error_message: `Failed after ${battle.retry_count + 1} attempts: ${msg}`,
          })
          .eq("id", battle.id);
      }
    }
  } catch (err) {
    console.error("[poll] unexpected error:", err);
  } finally {
    busy = false;
  }
}

// ─── Start ───

console.log(`[worker] starting ${WORKER_ID}`);
startHealthServer(PORT);

// Poll for battles
setInterval(poll, POLL_INTERVAL);

// Reclaim stale battles periodically
setInterval(() => reclaimStaleBattles(admin), CRON_INTERVAL);

// Initial poll
poll();
