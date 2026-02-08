import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface RunPerformanceMetrics {
  id: string;
  runId: string;
  status: string;
  scenarioTag: string | null;
  expectedLines: number;
  inserted: number;
  updated: number;
  skipped: number;
  conflictCount: number;
  conflictRate: number | null;
  rowsPerSecond: number | null;
  peakChunkDurationMs: number | null;
  avgChunkDurationMs: number | null;
  parallelJobs: number;
  batchSize: number;
  durationMs: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface ScenarioSummary {
  scenario: string;
  runs: number;
  avgRowsPerSecond: number | null;
  avgConflictRate: number | null;
  avgDurationMs: number | null;
  p95ChunkMs: number | null;
  totalRows: number;
}

export function useRunPerformanceMetrics() {
  return useQuery<RunPerformanceMetrics[]>({
    queryKey: ['run-performance-metrics'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/billing-runs');
      const runs = await res.json();
      return (runs || []).map((r: any) => ({
        id: r.id,
        runId: r.runId || r.run_id,
        status: r.status,
        scenarioTag: r.scenarioTag || r.scenario_tag || null,
        expectedLines: r.expectedLines || r.expected_lines || 0,
        inserted: r.inserted || 0,
        updated: r.updated || 0,
        skipped: r.skipped || 0,
        conflictCount: r.conflictCount || r.conflict_count || 0,
        conflictRate: r.conflictRate || r.conflict_rate || null,
        rowsPerSecond: r.rowsPerSecond || r.rows_per_second || null,
        peakChunkDurationMs: r.peakChunkDurationMs || r.peak_chunk_duration_ms || null,
        avgChunkDurationMs: r.avgChunkDurationMs || r.avg_chunk_duration_ms || null,
        parallelJobs: r.parallelJobs || r.parallel_jobs || 1,
        batchSize: r.batchSize || r.batch_size || 10000,
        durationMs: r.startedAt && r.finishedAt
          ? new Date(r.finishedAt || r.finished_at).getTime() - new Date(r.startedAt || r.started_at).getTime()
          : r.started_at && r.finished_at
            ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
            : null,
        startedAt: r.startedAt || r.started_at,
        finishedAt: r.finishedAt || r.finished_at,
        createdAt: r.createdAt || r.created_at,
      }));
    },
    refetchInterval: 30_000,
  });
}

export function useScenarioSummaries(runs: RunPerformanceMetrics[] | undefined) {
  if (!runs || runs.length === 0) return [];

  const byScenario = new Map<string, RunPerformanceMetrics[]>();
  for (const r of runs) {
    const tag = r.scenarioTag || 'untagged';
    if (!byScenario.has(tag)) byScenario.set(tag, []);
    byScenario.get(tag)!.push(r);
  }

  const summaries: ScenarioSummary[] = [];
  for (const [scenario, group] of byScenario) {
    const completedRuns = group.filter(r => r.status === 'completed');
    const rps = completedRuns.filter(r => r.rowsPerSecond != null).map(r => r.rowsPerSecond!);
    const cr = completedRuns.filter(r => r.conflictRate != null).map(r => r.conflictRate!);
    const durations = completedRuns.filter(r => r.durationMs != null).map(r => r.durationMs!);
    const peaks = completedRuns.filter(r => r.peakChunkDurationMs != null).map(r => r.peakChunkDurationMs!);

    summaries.push({
      scenario,
      runs: group.length,
      avgRowsPerSecond: rps.length > 0 ? rps.reduce((a, b) => a + b, 0) / rps.length : null,
      avgConflictRate: cr.length > 0 ? cr.reduce((a, b) => a + b, 0) / cr.length : null,
      avgDurationMs: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
      p95ChunkMs: peaks.length > 0 ? peaks.sort((a, b) => a - b)[Math.floor(peaks.length * 0.95)] : null,
      totalRows: group.reduce((sum, r) => sum + r.expectedLines, 0),
    });
  }

  return summaries.sort((a, b) => a.scenario.localeCompare(b.scenario));
}
