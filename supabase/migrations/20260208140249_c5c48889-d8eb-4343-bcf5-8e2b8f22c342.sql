
-- Soft-delete column on invoice_lines
ALTER TABLE public.invoice_lines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of active rows
CREATE INDEX IF NOT EXISTS idx_invoice_lines_deleted_at ON public.invoice_lines (deleted_at) WHERE deleted_at IS NOT NULL;

-- Merge tombstones: stores undo data for each merge operation
CREATE TABLE public.merge_tombstones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merge_audit_log_id UUID NOT NULL,
  group_id TEXT NOT NULL,
  canonical_id UUID NOT NULL,
  deleted_row_ids UUID[] NOT NULL DEFAULT '{}',
  deleted_rows_snapshot JSONB NOT NULL DEFAULT '[]',
  canonical_before_snapshot JSONB NOT NULL DEFAULT '{}',
  merge_policy TEXT NOT NULL,
  merged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  undone_at TIMESTAMPTZ DEFAULT NULL,
  purged_at TIMESTAMPTZ DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.merge_tombstones ENABLE ROW LEVEL SECURITY;

-- Admins and finance users can read tombstones
CREATE POLICY "Finance users can read tombstones"
  ON public.merge_tombstones FOR SELECT
  USING (public.has_finance_access(auth.uid()));

-- Only the merger can undo (or admins)
CREATE POLICY "Merger or admin can update tombstones"
  ON public.merge_tombstones FOR UPDATE
  USING (merged_by = auth.uid() OR public.is_admin(auth.uid()));

-- Insert policy for edge function (service role bypasses RLS anyway)
CREATE POLICY "Service can insert tombstones"
  ON public.merge_tombstones FOR INSERT
  WITH CHECK (true);

-- Index for undo window queries
CREATE INDEX idx_merge_tombstones_expires ON public.merge_tombstones (expires_at) WHERE undone_at IS NULL AND purged_at IS NULL;
