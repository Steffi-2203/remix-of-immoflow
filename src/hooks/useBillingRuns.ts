import { useQuery } from '@tanstack/react-query';
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
