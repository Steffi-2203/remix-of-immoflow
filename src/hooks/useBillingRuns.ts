import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface BillingRunSummary {
  id: string;
  runId: string;
  status: string;
  description: string | null;
  expectedLines: number;
  totalChunks: number;
  completedChunks: number;
  failedChunks: number;
  inserted: number;
  updated: number;
  skipped: number;
  artifacts: any[];
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  chunks?: ChunkSummary[];
}

export interface ChunkSummary {
  chunkId: number;
  status: string;
  rowsInChunk: number;
  inserted: number;
  updated: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SampleRow {
  id: string;
  invoice_id: string;
  unit_id: string;
  line_type: string;
  description: string;
  amount: number;
  tax_rate: number;
  created_at: string;
  operation: string;
  chunk_id: string;
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  tableName: string;
  recordId: string | null;
  action: string;
  oldData: any;
  newData: any;
  createdAt: string;
}

export function useBillingRuns() {
  return useQuery<BillingRunSummary[]>({
    queryKey: ['billing-runs'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/billing-runs');
      return res.json();
    },
    refetchInterval: 10_000,
  });
}

export function useBillingRunDetail(runId: string | null) {
  return useQuery<BillingRunSummary>({
    queryKey: ['billing-runs', runId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/billing-runs/${runId}`);
      return res.json();
    },
    enabled: !!runId,
    refetchInterval: 5_000,
  });
}

export function useBillingRunSamples(runId: string | null) {
  return useQuery<SampleRow[]>({
    queryKey: ['billing-run-samples', runId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/billing-runs/${runId}/samples?limit=50`);
      return res.json();
    },
    enabled: !!runId,
  });
}

export function useAcceptRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ runId, comment }: { runId: string; comment?: string }) => {
      const res = await apiRequest('POST', `/api/admin/billing-runs/${runId}/accept`, { comment });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-runs'] });
    },
  });
}

export function useDeclineRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ runId, reason }: { runId: string; reason?: string }) => {
      const res = await apiRequest('POST', `/api/admin/billing-runs/${runId}/decline`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-runs'] });
    },
  });
}

export function useRollbackRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ runId, reason }: { runId: string; reason?: string }) => {
      const res = await apiRequest('POST', `/api/admin/billing-runs/${runId}/rollback`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-runs'] });
    },
  });
}

export function useReprocessRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ runId }: { runId: string }) => {
      const res = await apiRequest('POST', `/api/admin/billing-runs/${runId}/reprocess`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-runs'] });
    },
  });
}

export function useReconciliationAudit(action?: string) {
  return useQuery<AuditEntry[]>({
    queryKey: ['reconciliation-audit', action],
    queryFn: async () => {
      const params = action ? `?action=${action}` : '';
      const res = await apiRequest('GET', `/api/admin/reconciliation-audit${params}`);
      return res.json();
    },
  });
}
