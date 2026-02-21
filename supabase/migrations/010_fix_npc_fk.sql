-- 010_fix_npc_fk.sql
-- NPC 자동 응답 FK 제약 문제 수정
--
-- 문제: counseling_responses.responder_id → profiles(id) FK 때문에
--       NPC 센티널 UUID(00000000-...-0001)가 profiles에 없어 INSERT 실패
--
-- 해결:
--   1. responder_id FK 제약 제거 (NPC는 profiles에 없는 가상 ID 사용)
--   2. agent_id nullable + FK 제거 (NPC는 agents row 없음)

-- 1. responder_id FK 제거
ALTER TABLE public.counseling_responses
  DROP CONSTRAINT IF EXISTS counseling_responses_responder_id_fkey;

-- 2. agent_id nullable 허용
ALTER TABLE public.counseling_responses
  ALTER COLUMN agent_id DROP NOT NULL;

-- 3. agent_id FK 제거
ALTER TABLE public.counseling_responses
  DROP CONSTRAINT IF EXISTS counseling_responses_agent_id_fkey;
