-- Performance indexes for 500+ unit scale
-- Sprint 3: Skalierung & Performance

-- Monthly invoices: critical queries by tenant, year/month, and status
CREATE INDEX IF NOT EXISTS idx_monthly_invoices_tenant_year_month 
  ON public.monthly_invoices (tenant_id, year, month);

CREATE INDEX IF NOT EXISTS idx_monthly_invoices_status 
  ON public.monthly_invoices (status) WHERE status IN ('offen', 'teilbezahlt', 'ueberfaellig');

CREATE INDEX IF NOT EXISTS idx_monthly_invoices_year_month 
  ON public.monthly_invoices (year, month);

CREATE INDEX IF NOT EXISTS idx_monthly_invoices_faellig_am 
  ON public.monthly_invoices (faellig_am) WHERE status != 'bezahlt';

-- Payments: fast lookup by tenant and date range
CREATE INDEX IF NOT EXISTS idx_payments_tenant_date 
  ON public.payments (tenant_id, buchungs_datum);

CREATE INDEX IF NOT EXISTS idx_payments_eingangs_datum 
  ON public.payments (eingangs_datum);

-- Expenses: settlement queries
CREATE INDEX IF NOT EXISTS idx_expenses_property_year 
  ON public.expenses (property_id, year);

CREATE INDEX IF NOT EXISTS idx_expenses_umlagefaehig 
  ON public.expenses (property_id, year) WHERE ist_umlagefaehig = true;

-- Tenants: active tenant queries
CREATE INDEX IF NOT EXISTS idx_tenants_unit_status 
  ON public.tenants (unit_id, status);

CREATE INDEX IF NOT EXISTS idx_tenants_active 
  ON public.tenants (unit_id) WHERE status = 'aktiv';

-- Units: property-level queries
CREATE INDEX IF NOT EXISTS idx_units_property_status 
  ON public.units (property_id, status);

-- Transactions: bank account and date queries
CREATE INDEX IF NOT EXISTS idx_transactions_bank_account_date 
  ON public.transactions (bank_account_id, transaction_date);

-- Journal entries: accounting queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_org_date 
  ON public.journal_entries (organization_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_journal_entries_source 
  ON public.journal_entries (source_type, source_id);

-- Audit logs: performance for large-scale operations
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action 
  ON public.audit_logs (table_name, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
  ON public.audit_logs (user_id, created_at DESC);