
-- Performance Indexes for High-Traffic Tables

-- Payments: invoice_id for allocation lookups
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
  ON public.payments (invoice_id);

-- Heating cost readings: period + unit lookups
CREATE INDEX IF NOT EXISTS idx_heating_readings_unit_period
  ON public.heating_cost_readings (unit_id, period_from, period_to);

CREATE INDEX IF NOT EXISTS idx_heating_readings_property
  ON public.heating_cost_readings (property_id);

-- Monthly invoices: unit lookup for settlement calculations
CREATE INDEX IF NOT EXISTS idx_monthly_invoices_unit
  ON public.monthly_invoices (unit_id);

-- Water readings: unit + date for settlement queries  
CREATE INDEX IF NOT EXISTS idx_water_readings_unit_date
  ON public.water_readings (unit_id, reading_date);

-- Audit logs: efficient lookup by table + record
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
  ON public.audit_logs (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);
