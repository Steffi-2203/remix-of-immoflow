
-- Step 2: Create artifact_access_log and tighten RLS (enum values now committed)
CREATE TABLE IF NOT EXISTS public.artifact_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  artifact_id UUID REFERENCES public.artifact_metadata(id) ON DELETE SET NULL,
  run_id TEXT,
  action TEXT NOT NULL,
  file_path TEXT,
  ip_address INET,
  user_agent TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artifact_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artifact_access_log_select_privileged"
  ON public.artifact_access_log FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'auditor') OR
    public.has_role(auth.uid(), 'ops')
  );

CREATE INDEX idx_artifact_access_log_user ON public.artifact_access_log(user_id);
CREATE INDEX idx_artifact_access_log_artifact ON public.artifact_access_log(artifact_id);
CREATE INDEX idx_artifact_access_log_created ON public.artifact_access_log(created_at DESC);

DROP POLICY IF EXISTS "artifact_metadata_select" ON public.artifact_metadata;
CREATE POLICY "artifact_metadata_select_privileged"
  ON public.artifact_metadata FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'auditor') OR
    public.has_role(auth.uid(), 'ops')
  );
