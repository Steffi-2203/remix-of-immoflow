
-- ═══════════════════════════════════════════════════════════════
-- Feature 1: DMS Versioning & Tagging
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL CHECK (document_type IN ('property', 'unit', 'tenant')),
  document_id UUID NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_versions_lookup ON public.document_versions (document_type, document_id);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document versions in their org"
  ON public.document_versions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert document versions"
  ON public.document_versions FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE TABLE public.document_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL CHECK (document_type IN ('property', 'unit', 'tenant')),
  document_id UUID NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_type, document_id, tag)
);

CREATE INDEX idx_document_tags_lookup ON public.document_tags (document_type, document_id);
CREATE INDEX idx_document_tags_tag ON public.document_tags (tag);

ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document tags"
  ON public.document_tags FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage tags"
  ON public.document_tags FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- Feature 2: Rules Engine
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE public.automation_trigger_type AS ENUM (
  'zahlungseingang', 'mietende', 'faelligkeit', 'leerstand'
);

CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type public.automation_trigger_type NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rules in their org"
  ON public.automation_rules FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id());

CREATE POLICY "Users can manage rules in their org"
  ON public.automation_rules FOR ALL TO authenticated
  USING (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());

-- ═══════════════════════════════════════════════════════════════
-- Feature 5: eIDAS Document Signatures
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type TEXT NOT NULL CHECK (document_type IN ('property', 'unit', 'tenant')),
  document_id UUID NOT NULL,
  hash TEXT NOT NULL,
  signer_id UUID REFERENCES auth.users(id) NOT NULL,
  signer_email TEXT,
  signature_level TEXT NOT NULL DEFAULT 'advanced' CHECK (signature_level IN ('simple', 'advanced')),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_signatures_lookup ON public.document_signatures (document_type, document_id);

ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures"
  ON public.document_signatures FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create signatures"
  ON public.document_signatures FOR INSERT TO authenticated
  WITH CHECK (signer_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- Feature 6: Saved Reports
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.saved_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  query_definition JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view saved reports in their org"
  ON public.saved_reports FOR SELECT TO authenticated
  USING (organization_id = public.user_org_id());

CREATE POLICY "Users can manage saved reports in their org"
  ON public.saved_reports FOR ALL TO authenticated
  USING (organization_id = public.user_org_id())
  WITH CHECK (organization_id = public.user_org_id());
