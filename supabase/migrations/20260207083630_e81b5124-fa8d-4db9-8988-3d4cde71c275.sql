
-- ====================================================
-- Feature 16: Multi-Mandanten – user_organizations table
-- ====================================================
CREATE TABLE public.user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- Users can see their own org memberships
CREATE POLICY "Users can view own org memberships"
  ON public.user_organizations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage org memberships within their org
CREATE POLICY "Org admins can insert memberships"
  ON public.user_organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_admin(auth.uid(), organization_id)
  );

CREATE POLICY "Org admins can delete memberships"
  ON public.user_organizations FOR DELETE
  TO authenticated
  USING (
    public.is_org_admin(auth.uid(), organization_id)
  );

-- Backfill existing users: create user_organizations entries from profiles
INSERT INTO public.user_organizations (user_id, organization_id, role, is_default)
SELECT p.id, p.organization_id, COALESCE(ur.role, 'viewer'), true
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ====================================================
-- Feature 17: Revisionssicheres Logging – Write-Once
-- ====================================================

-- Add hash column for integrity chain
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS hash TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS previous_hash TEXT;

-- Trigger: prevent UPDATE on audit_logs
CREATE OR REPLACE FUNCTION public.prevent_audit_log_update()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_update();

-- Trigger: prevent DELETE on audit_logs
CREATE OR REPLACE FUNCTION public.prevent_audit_log_delete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be deleted';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_audit_logs_no_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_delete();

-- Auto-compute hash on INSERT
CREATE OR REPLACE FUNCTION public.audit_log_hash_chain()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _prev_hash TEXT;
  _payload TEXT;
BEGIN
  -- Get the hash of the most recent audit log
  SELECT hash INTO _prev_hash
  FROM public.audit_logs
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  NEW.previous_hash := COALESCE(_prev_hash, 'GENESIS');

  -- Build payload for hashing
  _payload := COALESCE(NEW.id::text, '') || '|' ||
              COALESCE(NEW.user_id::text, '') || '|' ||
              COALESCE(NEW.table_name, '') || '|' ||
              COALESCE(NEW.record_id::text, '') || '|' ||
              COALESCE(NEW.action, '') || '|' ||
              COALESCE(NEW.created_at::text, '') || '|' ||
              COALESCE(NEW.previous_hash, '');

  NEW.hash := encode(digest(_payload, 'sha256'), 'hex');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_log_hash
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_hash_chain();
