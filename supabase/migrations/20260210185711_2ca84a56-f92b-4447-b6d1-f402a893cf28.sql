-- Performance indexes for critical queries
CREATE INDEX IF NOT EXISTS idx_monthly_invoices_tenant_status ON public.monthly_invoices (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_monthly_invoices_org_period ON public.monthly_invoices (year, month);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_date ON public.payments (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_property_year ON public.expenses (property_id, year, month);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant ON public.ledger_entries (tenant_id, booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org_date ON public.journal_entries (organization_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_unit ON public.tenants (unit_id);
CREATE INDEX IF NOT EXISTS idx_units_property ON public.units (property_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON public.job_runs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retention_locks_entity ON public.retention_locks (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_booking_periods_org ON public.booking_periods (organization_id, year, month);