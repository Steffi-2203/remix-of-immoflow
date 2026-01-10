
-- Fix Security Definer View issues by using SECURITY INVOKER
-- This ensures RLS of the querying user is applied

-- Drop and recreate views with explicit security invoker
DROP VIEW IF EXISTS public.tenants_safe;
DROP VIEW IF EXISTS public.property_owners_safe;
DROP VIEW IF EXISTS public.transactions_safe;

-- 2.1 Secure view for tenants - masks IBAN/BIC for non-finance users
CREATE VIEW public.tenants_safe 
WITH (security_invoker = true)
AS
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
CREATE VIEW public.property_owners_safe 
WITH (security_invoker = true)
AS
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
CREATE VIEW public.transactions_safe 
WITH (security_invoker = true)
AS
SELECT 
  id, organization_id, bank_account_id, property_id, unit_id, tenant_id,
  amount, transaction_date, booking_date, description, reference,
  counterpart_name, status, notes, tags, is_split, category_id,
  matched_by, matched_at, match_confidence, currency, created_at, updated_at,
  CASE WHEN public.has_finance_access(auth.uid()) THEN counterpart_iban ELSE 
    CASE WHEN counterpart_iban IS NOT NULL THEN CONCAT(LEFT(counterpart_iban, 4), ' **** **** ', RIGHT(counterpart_iban, 4)) ELSE NULL END
  END as counterpart_iban
FROM public.transactions;

-- Re-grant access to the views
GRANT SELECT ON public.tenants_safe TO authenticated;
GRANT SELECT ON public.property_owners_safe TO authenticated;
GRANT SELECT ON public.transactions_safe TO authenticated;
