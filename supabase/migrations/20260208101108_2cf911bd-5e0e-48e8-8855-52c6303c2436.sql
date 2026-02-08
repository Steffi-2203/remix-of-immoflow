
-- P2-8c: Artifact metadata for encrypted storage + retention
CREATE TABLE IF NOT EXISTS public.artifact_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id UUID,
  file_path TEXT NOT NULL,
  encryption_key_id TEXT NOT NULL DEFAULT 'default',
  retention_days INTEGER NOT NULL DEFAULT 365,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '365 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artifact_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org artifacts"
  ON public.artifact_metadata FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org artifacts"
  ON public.artifact_metadata FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete artifacts"
  ON public.artifact_metadata FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

CREATE INDEX idx_artifact_metadata_expires ON public.artifact_metadata (expires_at);
CREATE INDEX idx_artifact_metadata_org ON public.artifact_metadata (organization_id);
