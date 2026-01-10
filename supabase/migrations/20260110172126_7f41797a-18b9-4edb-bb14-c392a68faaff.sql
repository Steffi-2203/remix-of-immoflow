
-- Phase 1b: Create has_finance_access function
-- Uses the newly committed enum values
CREATE OR REPLACE FUNCTION public.has_finance_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'finance')
  )
$$;

-- Phase 2: Create secure views for sensitive data

-- 2.1 Secure view for tenants - masks IBAN/BIC for non-finance users
CREATE OR REPLACE VIEW public.tenants_safe AS
SELECT 
  id, unit_id, first_name, last_name, email, phone,
  mietbeginn, mietende, kaution, kaution_bezahlt,
  grundmiete, betriebskosten_vorschuss, heizungskosten_vorschuss,
  sepa_mandat, mandat_reference, status, created_at, updated_at,
  CASE WHEN public.has_finance_access(auth.uid()) THEN iban ELSE 
    CASE WHEN iban IS NOT NULL THEN CONCAT(LEFT(iban, 4), ' **** **** ', RIGHT(iban, 4)) ELSE NULL END
  END as iban,
  CASE WHEN public.has_finance_access(auth.uid()) THEN bic ELSE 
    CASE WHEN bic IS NOT NULL THEN '****' ELSE NULL END
  END as bic
FROM public.tenants;

-- 2.2 Secure view for property owners - masks IBAN/BIC for non-finance users
CREATE OR REPLACE VIEW public.property_owners_safe AS
SELECT 
  id, property_id, name, email, phone, address, city, postal_code,
  ownership_share, is_primary, created_at, updated_at,
  CASE WHEN public.has_finance_access(auth.uid()) THEN iban ELSE 
    CASE WHEN iban IS NOT NULL THEN CONCAT(LEFT(iban, 4), ' **** **** ', RIGHT(iban, 4)) ELSE NULL END
  END as iban,
  CASE WHEN public.has_finance_access(auth.uid()) THEN bic ELSE 
    CASE WHEN bic IS NOT NULL THEN '****' ELSE NULL END
  END as bic
FROM public.property_owners;

-- 2.3 Secure view for transactions - masks counterpart IBAN for non-finance users
CREATE OR REPLACE VIEW public.transactions_safe AS
SELECT 
  id, organization_id, bank_account_id, property_id, unit_id, tenant_id,
  amount, transaction_date, booking_date, description, reference,
  counterpart_name, status, notes, tags, is_split, category_id,
  matched_by, matched_at, match_confidence, currency, created_at, updated_at,
  CASE WHEN public.has_finance_access(auth.uid()) THEN counterpart_iban ELSE 
    CASE WHEN counterpart_iban IS NOT NULL THEN CONCAT(LEFT(counterpart_iban, 4), ' **** **** ', RIGHT(counterpart_iban, 4)) ELSE NULL END
  END as counterpart_iban
FROM public.transactions;

-- Grant access to the views
GRANT SELECT ON public.tenants_safe TO authenticated;
GRANT SELECT ON public.property_owners_safe TO authenticated;
GRANT SELECT ON public.transactions_safe TO authenticated;

-- Phase 4: Audit logging for sensitive data access
CREATE TABLE IF NOT EXISTS public.sensitive_data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  access_type text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet
);

ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access logs"
ON public.sensitive_data_access_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert access logs"
ON public.sensitive_data_access_log
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  _access_type text,
  _table_name text,
  _record_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sensitive_data_access_log (user_id, access_type, table_name, record_id)
  VALUES (auth.uid(), _access_type, _table_name, _record_id);
END;
$$;
