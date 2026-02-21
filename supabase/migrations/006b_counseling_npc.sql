-- 006b_counseling_npc.sql — NPC counselor auto-response support

-- Add NPC columns to counseling_responses
ALTER TABLE public.counseling_responses ADD COLUMN IF NOT EXISTS is_npc BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.counseling_responses ADD COLUMN IF NOT EXISTS npc_name TEXT;

-- Drop old UNIQUE constraint (it prevents multiple NPC responses per post)
ALTER TABLE public.counseling_responses DROP CONSTRAINT IF EXISTS counseling_responses_post_id_responder_id_key;

-- Re-add partial UNIQUE: real users still limited to 1 response per post
CREATE UNIQUE INDEX IF NOT EXISTS uq_counseling_responses_real_user
  ON public.counseling_responses(post_id, responder_id)
  WHERE is_npc = FALSE;

-- Index for NPC filtering
CREATE INDEX IF NOT EXISTS idx_counseling_responses_npc ON public.counseling_responses(is_npc) WHERE is_npc = TRUE;
