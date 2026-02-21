-- 006_counseling.sql — Counseling MVP tables, RLS, realtime

-- ─── counseling_posts ───
CREATE TABLE IF NOT EXISTS public.counseling_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  raw_input TEXT NOT NULL,
  organized_content TEXT NOT NULL DEFAULT '',
  emotion_tags TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  best_response_id UUID,
  is_crisis BOOLEAN NOT NULL DEFAULT FALSE,
  response_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ─── counseling_responses ───
CREATE TABLE IF NOT EXISTS public.counseling_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.counseling_posts(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  is_best BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, responder_id)
);

-- FK from counseling_posts.best_response_id → counseling_responses
ALTER TABLE public.counseling_posts
  ADD CONSTRAINT fk_best_response
  FOREIGN KEY (best_response_id) REFERENCES public.counseling_responses(id);

-- ─── profiles: counseling quota columns ───
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_counseling_posts_remaining INTEGER NOT NULL DEFAULT 3;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS free_counseling_responses_remaining INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS counseling_quota_reset_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── RPC: reset counseling quota if 24h passed ───
CREATE OR REPLACE FUNCTION public.reset_counseling_quota_if_needed(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    free_counseling_posts_remaining = 3,
    free_counseling_responses_remaining = 5,
    counseling_quota_reset_at = now()
  WHERE id = p_user_id
    AND counseling_quota_reset_at < now() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── RLS ───
ALTER TABLE public.counseling_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counseling_responses ENABLE ROW LEVEL SECURITY;

-- Posts: anyone authed can read
CREATE POLICY counseling_posts_select ON public.counseling_posts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Posts: author can insert
CREATE POLICY counseling_posts_insert ON public.counseling_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Posts: author can update (for best_response_id, status, resolved_at)
CREATE POLICY counseling_posts_update ON public.counseling_posts
  FOR UPDATE USING (auth.uid() = author_id);

-- Responses: anyone authed can read
CREATE POLICY counseling_responses_select ON public.counseling_responses
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Responses: responder can insert
CREATE POLICY counseling_responses_insert ON public.counseling_responses
  FOR INSERT WITH CHECK (auth.uid() = responder_id);

-- Responses: responder can update (for is_best — set by admin client anyway)
CREATE POLICY counseling_responses_update ON public.counseling_responses
  FOR UPDATE USING (auth.uid() = responder_id);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_counseling_posts_author ON public.counseling_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_counseling_posts_status ON public.counseling_posts(status);
CREATE INDEX IF NOT EXISTS idx_counseling_posts_created ON public.counseling_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_counseling_responses_post ON public.counseling_responses(post_id);

-- ─── Realtime ───
ALTER PUBLICATION supabase_realtime ADD TABLE public.counseling_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.counseling_responses;
