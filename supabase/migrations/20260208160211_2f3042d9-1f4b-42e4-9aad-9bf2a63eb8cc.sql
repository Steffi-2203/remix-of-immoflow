
-- =====================================================
-- Phase 1: Fix overpermissive RLS SELECT policies
-- Replace USING(true) with organization-scoped checks
-- =====================================================

-- 1. invoice_lines: Replace open SELECT with org-scoped check via monthly_invoices -> tenant -> unit -> property
DROP POLICY IF EXISTS "Users can view invoice lines" ON public.invoice_lines;
CREATE POLICY "Users can view invoice lines in their org"
  ON public.invoice_lines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM monthly_invoices mi
      JOIN units u ON mi.unit_id = u.id
      WHERE mi.id = invoice_lines.invoice_id
        AND u.property_id IN (SELECT get_managed_property_ids(auth.uid()))
    )
  );

-- 2. property_budgets: Replace open SELECT with org check
DROP POLICY IF EXISTS "Authenticated users can view budgets" ON public.property_budgets;
CREATE POLICY "Users can view budgets in their org"
  ON public.property_budgets
  FOR SELECT
  TO authenticated
  USING (organization_id = user_org_id());

-- 3. rent_index_clauses: Replace open SELECT with org check via tenant ownership
DROP POLICY IF EXISTS "Authenticated users can view rent index clauses" ON public.rent_index_clauses;
-- The existing "Org members can read rent index clauses" with owns_tenant() already covers this correctly

-- 4. rent_adjustments: Replace open SELECT with org check
DROP POLICY IF EXISTS "Authenticated users can view rent adjustments" ON public.rent_adjustments;
-- The existing "Org members can read rent adjustments" with owns_tenant() already covers this correctly

-- 5. tenant_deposits: Replace open SELECT with org check
DROP POLICY IF EXISTS "Authenticated users can view tenant deposits" ON public.tenant_deposits;
-- The existing "Org members can read tenant deposits" with owns_tenant() already covers this correctly
