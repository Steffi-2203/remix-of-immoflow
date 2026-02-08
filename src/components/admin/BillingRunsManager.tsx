import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Play, CheckCircle2, XCircle, Clock, Loader2, Ban, ChevronRight, Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useBillingRuns, useBillingRunDetail, type BillingRunSummary } from '@/hooks/useBillingRuns';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:   { label: 'Wartend',     icon: Clock,        variant: 'outline' },
  running:   { label: 'Läuft',       icon: Loader2,      variant: 'secondary' },
  completed: { label: 'Abgeschlossen', icon: CheckCircle2, variant: 'default' },
  failed:    { label: 'Fehlgeschlagen', icon: XCircle,     variant: 'destructive' },
  cancelled: { label: 'Abgebrochen', icon: Ban,           variant: 'outline' },
};

function RunStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}

function ChunkStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    done: 'bg-green-500/10 text-green-700 border-green-200',
    failed: 'bg-destructive/10 text-destructive border-destructive/20',
    processing: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
    pending: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}

function formatDuration(startedAt: string | null, finishedAt: string | null): string {
  if (!startedAt) return '–';
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export function BillingRunsManager() {
  const { data: runs, isLoading } = useBillingRuns();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: detail } = useBillingRunDetail(selectedRunId);

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Billing Runs
          </CardTitle>
          <CardDescription>
            Run Lifecycle und Chunk-Status für Batch-Verarbeitungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!runs || runs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Keine Billing Runs vorhanden
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Erwartet</TableHead>
                    <TableHead className="text-right">Eingefügt</TableHead>
                    <TableHead className="text-right">Aktualisiert</TableHead>
                    <TableHead>Fortschritt</TableHead>
                    <TableHead>Dauer</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => {
                    const progress = run.totalChunks > 0
                      ? Math.round(((run.completedChunks + run.failedChunks) / run.totalChunks) * 100)
                      : 0;
                    return (
                      <TableRow key={run.id} className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedRunId(run.runId)}>
                        <TableCell className="font-mono text-sm">
                          {run.runId.length > 24 ? run.runId.slice(0, 24) + '…' : run.runId}
                        </TableCell>
                        <TableCell><RunStatusBadge status={run.status} /></TableCell>
                        <TableCell className="text-right tabular-nums">{run.expectedLines.toLocaleString('de-DE')}</TableCell>
                        <TableCell className="text-right tabular-nums text-green-600">{run.inserted.toLocaleString('de-DE')}</TableCell>
                        <TableCell className="text-right tabular-nums text-blue-600">{run.updated.toLocaleString('de-DE')}</TableCell>
                        <TableCell className="w-32">
                          <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-2" />
                            <span className="text-xs text-muted-foreground w-8">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDuration(run.startedAt, run.finishedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(run.createdAt), 'dd.MM.yy HH:mm', { locale: de })}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRunId} onOpenChange={() => setSelectedRunId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Run: <span className="font-mono text-base">{detail?.runId || selectedRunId}</span>
            </DialogTitle>
            <DialogDescription>Chunk-Details und Artefakte</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              {/* Run Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard label="Status" value={<RunStatusBadge status={detail.status} />} />
                <SummaryCard label="Erwartet" value={detail.expectedLines.toLocaleString('de-DE')} />
                <SummaryCard label="Eingefügt" value={<span className="text-green-600">{detail.inserted.toLocaleString('de-DE')}</span>} />
                <SummaryCard label="Aktualisiert" value={<span className="text-blue-600">{detail.updated.toLocaleString('de-DE')}</span>} />
                <SummaryCard label="Chunks" value={`${detail.completedChunks}/${detail.totalChunks}`} />
                <SummaryCard label="Fehlgeschlagen" value={<span className={detail.failedChunks > 0 ? 'text-destructive' : ''}>{detail.failedChunks}</span>} />
                <SummaryCard label="Dauer" value={formatDuration(detail.startedAt, detail.finishedAt)} />
                <SummaryCard label="Übersprungen" value={String(detail.skipped)} />
              </div>

              {/* Error */}
              {detail.errorMessage && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">Fehler</p>
                  <p className="text-sm text-destructive/80 font-mono mt-1">{detail.errorMessage}</p>
                </div>
              )}

              {/* Artifacts */}
              {detail.artifacts && detail.artifacts.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Artefakte</p>
                  <div className="space-y-1">
                    {detail.artifacts.map((a: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-3 py-1.5">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-mono">{typeof a === 'string' ? a : a.path || JSON.stringify(a)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chunks */}
              {detail.chunks && detail.chunks.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Chunks ({detail.chunks.length})</p>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Zeilen</TableHead>
                          <TableHead className="text-right">Ins</TableHead>
                          <TableHead className="text-right">Upd</TableHead>
                          <TableHead>Dauer</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.chunks.map((chunk) => (
                          <TableRow key={chunk.chunkId}>
                            <TableCell className="font-mono text-xs">{chunk.chunkId}</TableCell>
                            <TableCell><ChunkStatusBadge status={chunk.status} /></TableCell>
                            <TableCell className="text-right tabular-nums">{chunk.rowsInChunk}</TableCell>
                            <TableCell className="text-right tabular-nums text-green-600">{chunk.inserted}</TableCell>
                            <TableCell className="text-right tabular-nums text-blue-600">{chunk.updated}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDuration(chunk.startedAt, chunk.completedAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}
