-- 009_reset_free_battles.sql
-- 모든 유저 free_battles_remaining 50으로 초기화
-- 개발/테스트 용도

UPDATE public.profiles
SET free_battles_remaining = 50
WHERE free_battles_remaining < 50;
