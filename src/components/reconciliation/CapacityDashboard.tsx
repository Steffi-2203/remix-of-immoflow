import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Activity, Gauge, Timer, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import {
  useRunPerformanceMetrics,
  useScenarioSummaries,
  type RunPerformanceMetrics,
} from '@/hooks/useCapacityMetrics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line,
} from 'recharts';

function formatDuration(ms: number | null) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRate(rate: number | null) {
  if (rate == null) return '—';
  return `${(rate * 100).toFixed(2)}%`;
}

function formatNumber(n: number | null) {
  if (n == null) return '—';
  return n.toLocaleString('de-AT', { maximumFractionDigits: 1 });
}

function scenarioBadgeVariant(tag: string | null): "default" | "secondary" | "outline" | "destructive" {
  if (!tag) return 'outline';
  if (tag.includes('S3') || tag.includes('100k')) return 'destructive';
  if (tag.includes('S2') || tag.includes('50k')) return 'default';
  return 'secondary';
}

export function CapacityDashboard() {
  const { data: runs, isLoading } = useRunPerformanceMetrics();
  const summaries = useScenarioSummaries(runs);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const completedRuns = (runs || []).filter(r => r.status === 'completed');

  // Chart data: throughput over time
  const throughputData = completedRuns
    .filter(r => r.rowsPerSecond != null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-20)
    .map(r => ({
      name: r.scenarioTag || r.runId.slice(0, 8),
      rowsPerSec: r.rowsPerSecond,
      peakChunkMs: r.peakChunkDurationMs,
      conflictPct: (r.conflictRate || 0) * 100,
      date: new Date(r.createdAt).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' }),
    }));

  // Scenario comparison chart data
  const scenarioChartData = summaries.map(s => ({
    name: s.scenario,
    avgRowsPerSec: s.avgRowsPerSecond,
    p95ChunkMs: s.p95ChunkMs,
    avgDurationSec: s.avgDurationMs ? s.avgDurationMs / 1000 : null,
    conflictPct: (s.avgConflictRate || 0) * 100,
    runs: s.runs,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={<Zap className="h-4 w-4" />}
          title="Letzter Durchsatz"
          value={completedRuns.length > 0 ? `${formatNumber(completedRuns[completedRuns.length - 1]?.rowsPerSecond)} rows/s` : '—'}
        />
        <KPICard
          icon={<Timer className="h-4 w-4" />}
          title="Letzte p100 Chunk-Latenz"
          value={formatDuration(completedRuns[completedRuns.length - 1]?.peakChunkDurationMs ?? null)}
        />
        <KPICard
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Letzte Konflikt-Rate"
          value={formatRate(completedRuns[completedRuns.length - 1]?.conflictRate ?? null)}
        />
        <KPICard
          icon={<Activity className="h-4 w-4" />}
          title="Abgeschlossene Runs"
          value={String(completedRuns.length)}
        />
      </div>

      {/* Scenario Comparison Table */}
      {summaries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-5 w-5" />
              Szenario-Vergleich (S1/S2/S3)
            </CardTitle>
            <CardDescription>
              Aggregierte Metriken pro Load-Test-Szenario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Szenario</TableHead>
                    <TableHead className="text-right">Runs</TableHead>
                    <TableHead className="text-right">⌀ Rows/s</TableHead>
                    <TableHead className="text-right">⌀ Dauer</TableHead>
                    <TableHead className="text-right">p95 Chunk</TableHead>
                    <TableHead className="text-right">⌀ Konflikt-Rate</TableHead>
                    <TableHead className="text-right">Gesamt-Zeilen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map(s => (
                    <TableRow key={s.scenario}>
                      <TableCell>
                        <Badge variant={scenarioBadgeVariant(s.scenario)}>
                          {s.scenario}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.runs}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatNumber(s.avgRowsPerSecond)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatDuration(s.avgDurationMs)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatDuration(s.p95ChunkMs)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatRate(s.avgConflictRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.totalRows.toLocaleString('de-AT')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Throughput Chart */}
      {throughputData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Durchsatz-Verlauf (letzte 20 Runs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar dataKey="rowsPerSec" name="Rows/s" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Latency + Conflicts Chart */}
      {throughputData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-5 w-5" />
              Chunk-Latenz & Konflikt-Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={throughputData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                <YAxis yAxisId="left" className="text-xs fill-muted-foreground" />
                <YAxis yAxisId="right" orientation="right" className="text-xs fill-muted-foreground" />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="peakChunkMs" name="Peak Chunk (ms)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="conflictPct" name="Konflikte (%)" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Runs Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Letzte Runs (Detail)</CardTitle>
          <CardDescription>Performance-Metriken pro einzelnem Run</CardDescription>
        </CardHeader>
        <CardContent>
          {completedRuns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine abgeschlossenen Runs mit Performance-Daten vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Szenario</TableHead>
                    <TableHead className="text-right">Zeilen</TableHead>
                    <TableHead className="text-right">Rows/s</TableHead>
                    <TableHead className="text-right">Dauer</TableHead>
                    <TableHead className="text-right">Peak Chunk</TableHead>
                    <TableHead className="text-right">⌀ Chunk</TableHead>
                    <TableHead className="text-right">Konflikte</TableHead>
                    <TableHead className="text-right">Parallel</TableHead>
                    <TableHead className="text-right">Batch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedRuns.slice(-15).reverse().map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">
                        {r.runId.slice(0, 12)}…
                      </TableCell>
                      <TableCell>
                        {r.scenarioTag ? (
                          <Badge variant={scenarioBadgeVariant(r.scenarioTag)} className="text-xs">
                            {r.scenarioTag}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.expectedLines.toLocaleString('de-AT')}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatNumber(r.rowsPerSecond)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatDuration(r.durationMs)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatDuration(r.peakChunkDurationMs)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatDuration(r.avgChunkDurationMs)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.conflictCount > 0 ? (
                          <span className="text-destructive">{r.conflictCount} ({formatRate(r.conflictRate)})</span>
                        ) : '0'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{r.parallelJobs}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.batchSize.toLocaleString('de-AT')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Szenario-Referenz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <Badge variant="secondary" className="mb-2">S1 — Baseline</Badge>
              <p className="text-sm text-muted-foreground">10.000 Zeilen, 1 Worker, Single-Threaded</p>
              <p className="text-xs text-muted-foreground mt-1">Ziel: {'<'} 30s, 0% Konflikte</p>
            </div>
            <div className="rounded-md border p-3">
              <Badge variant="default" className="mb-2">S2 — Medium</Badge>
              <p className="text-sm text-muted-foreground">50.000 Zeilen, 1 Worker, Single-Threaded</p>
              <p className="text-xs text-muted-foreground mt-1">Ziel: {'<'} 120s, {'<'} 1% Konflikte</p>
            </div>
            <div className="rounded-md border p-3">
              <Badge variant="destructive" className="mb-2">S3 — Stress</Badge>
              <p className="text-sm text-muted-foreground">100.000 Zeilen, 4 × 25k Worker, Parallel</p>
              <p className="text-xs text-muted-foreground mt-1">Ziel: {'<'} 180s, {'<'} 2% Konflikte</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          {icon}
          {title}
        </div>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
