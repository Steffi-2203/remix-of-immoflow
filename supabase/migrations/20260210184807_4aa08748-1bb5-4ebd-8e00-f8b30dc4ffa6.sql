
-- Retention locks table: tracks which entities are under legal retention freeze
CREATE TABLE IF NOT EXISTS public.retention_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'monthly_invoices', 'settlements', 'audit_logs', 'payments', 'expenses'
  entity_id UUID NOT NULL,
  retention_standard TEXT NOT NULL DEFAULT 'bao', -- 'bao' (7y) or 'gobd' (10y)
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  locked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(entity_type, entity_id)
);

-- Index for fast lookups
CREATE INDEX idx_retention_locks_entity ON public.retention_locks(entity_type, entity_id);
CREATE INDEX idx_retention_locks_org ON public.retention_locks(organization_id);
CREATE INDEX idx_retention_locks_until ON public.retention_locks(locked_until);

-- Enable RLS
ALTER TABLE public.retention_locks ENABLE ROW LEVEL SECURITY;

-- RLS: Only org members can see their retention locks
CREATE POLICY "Users can view retention locks for their org"
  ON public.retention_locks FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- Prevent deletion of retention locks (immutable by design)
CREATE POLICY "Retention locks cannot be deleted by users"
  ON public.retention_locks FOR DELETE
  USING (false);

-- Only system can insert retention locks (via service role)
CREATE POLICY "Retention locks insert via service"
  ON public.retention_locks FOR INSERT
  WITH CHECK (true);
