
-- GDPR Export Requests tracking table
CREATE TABLE public.gdpr_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'failed', 'expired')),
  scope TEXT NOT NULL DEFAULT 'full' CHECK (scope IN ('full', 'personal', 'organization')),
  delivery_method TEXT NOT NULL DEFAULT 'download' CHECK (delivery_method IN ('download', 'email')),
  format_version TEXT NOT NULL DEFAULT '1.0',
  manifest JSONB,
  manifest_hash TEXT,
  manifest_signature TEXT,
  file_path TEXT,
  file_size_bytes BIGINT,
  download_url_expires_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  error_message TEXT,
  legal_basis TEXT DEFAULT 'Art. 15 DSGVO',
  retention_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  prepared_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gdpr_export_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own export requests
CREATE POLICY "Users can view own export requests"
  ON public.gdpr_export_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own export requests
CREATE POLICY "Users can create own export requests"
  ON public.gdpr_export_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only system (service role) can update export requests
CREATE POLICY "Service role can update export requests"
  ON public.gdpr_export_requests FOR UPDATE
  USING (true);

-- Admins can view all export requests in their org
CREATE POLICY "Admins can view org export requests"
  ON public.gdpr_export_requests FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND organization_id = public.user_org_id()
    AND public.is_admin(auth.uid())
  );

-- Index for fast lookups
CREATE INDEX idx_gdpr_exports_user_id ON public.gdpr_export_requests(user_id);
CREATE INDEX idx_gdpr_exports_status ON public.gdpr_export_requests(status);
CREATE INDEX idx_gdpr_exports_org ON public.gdpr_export_requests(organization_id);

-- Trigger for updated_at
CREATE TRIGGER update_gdpr_export_requests_updated_at
  BEFORE UPDATE ON public.gdpr_export_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for GDPR exports (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gdpr-exports', 'gdpr-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can read their own exports
CREATE POLICY "Users can read own GDPR exports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gdpr-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role can insert GDPR exports
CREATE POLICY "Service can insert GDPR exports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gdpr-exports');
