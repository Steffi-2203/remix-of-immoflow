-- Atomic job claim function for background job processing
CREATE OR REPLACE FUNCTION public.claim_next_job()
RETURNS SETOF job_queue
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE job_queue
  SET status = 'processing', started_at = now(), updated_at = now()
  WHERE id = (
    SELECT id FROM job_queue
    WHERE status IN ('pending', 'retrying')
    AND scheduled_for <= now()
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;