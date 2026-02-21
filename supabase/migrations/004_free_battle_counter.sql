-- ─── Free Battle Counter ───
-- Adds free_battles_remaining to profiles for BYOK transition model.
-- New users get 50 free battles. After exhaustion, they must register their own API key.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS free_battles_remaining INTEGER NOT NULL DEFAULT 50;

-- Give existing users 50 free battles
UPDATE public.profiles SET free_battles_remaining = 50 WHERE free_battles_remaining IS NULL;
