-- 005_async_battles.sql
-- Railway Docker Worker 비동기 배틀 시스템을 위한 스키마 변경

-- 1. 워커 추적 컬럼 추가
ALTER TABLE public.battles
  ADD COLUMN IF NOT EXISTS current_turn SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS worker_claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS retry_count SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS byok_config JSONB;

-- 2. 워커 폴링 인덱스 (pending 배틀을 빠르게 찾기 위함)
CREATE INDEX IF NOT EXISTS idx_battles_pending
  ON public.battles (created_at ASC) WHERE status = 'pending';

-- 3. 원자적 배틀 claim RPC (FOR UPDATE SKIP LOCKED)
-- 여러 워커가 동시에 폴링해도 같은 배틀을 두 번 가져가지 않음
CREATE OR REPLACE FUNCTION public.claim_pending_battle(p_worker_id TEXT)
RETURNS SETOF public.battles LANGUAGE sql AS $$
  UPDATE public.battles
  SET status = 'in_progress',
      worker_id = p_worker_id,
      worker_claimed_at = now()
  WHERE id = (
    SELECT id FROM public.battles
    WHERE status = 'pending' AND worker_id IS NULL
    ORDER BY created_at ASC LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;

-- 4. 스테일 배틀 복구 RPC
-- 워커가 죽었을 때 5분 이상 된 in_progress 배틀을 pending으로 되돌림
CREATE OR REPLACE FUNCTION public.reclaim_stale_battles()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE reclaimed INTEGER;
BEGIN
  WITH stale AS (
    UPDATE public.battles
    SET status = 'pending', worker_id = NULL, worker_claimed_at = NULL,
        retry_count = retry_count + 1
    WHERE status = 'in_progress'
      AND worker_claimed_at < now() - interval '5 minutes'
      AND retry_count < 3
    RETURNING id
  ) SELECT count(*) INTO reclaimed FROM stale;

  -- 3회 초과 재시도한 배틀은 aborted 처리
  UPDATE public.battles
  SET status = 'aborted', error_message = 'Max retries exceeded'
  WHERE status = 'in_progress'
    AND worker_claimed_at < now() - interval '5 minutes'
    AND retry_count >= 3;

  RETURN reclaimed;
END; $$;

-- 5. Realtime 활성화 — 클라이언트가 턴별 업데이트를 실시간 수신
ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_turns;
