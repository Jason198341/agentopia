import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS.
// Used server-side only for writing to battles/battle_turns/elo_history.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY — check .env.local");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
