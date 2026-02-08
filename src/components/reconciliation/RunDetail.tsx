import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Check, X, Package, Loader2, RotateCcw, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  useBillingRunDetail,
  useBillingRunSamples,
  useAcceptRun,
  useDeclineRun,
  useRollbackRun,
  useReprocessRun,
} from '@/hooks/useBillingRuns';
import { RunStatusBadge, ChunkStatusBadge, formatDuration } from './shared';

interface Props {
  runId: string;
  onBack: () => void;
}

export function ReconciliationRunDetail({ runId, onBack }: Props) {
  const { data: detail, isLoading } = useBillingRunDetail(runId);
  const { data: samples, isLoading: samplesLoading } = useBillingRunSamples(runId);
  const acceptMutation = useAcceptRun();
  const declineMutation = useDeclineRun();
  const rollbackMutation = useRollbackRun();
  const reprocessMutation = useReprocessRun();

  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [rollbackReason, setRollbackReason] = useState('');

  if (isLoading) return <Skeleton className="h-96" />;
  if (!detail) return <p className="text-muted-foreground text-center py-8">Run nicht gefunden</p>;

  const progress = detail.totalChunks > 0
    ? Math.round(((detail.completedChunks + detail.failedChunks) / detail.totalChunks) * 100)
    : 0;

  const canDecide = detail.status === 'completed' || detail.status === 'running';
  const canRollback = !['rolled_back', 'pending_reprocess'].includes(detail.status);
  const canReprocess = ['failed', 'rolled_back', 'cancelled'].includes(detail.status);

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync({ runId, comment });
      toast.success('Run akzeptiert');
      setShowAcceptDialog(false);
    } catch {
      toast.error('Fehler beim Akzeptieren');
    }
  };

  const handleDecline = async () => {
    try {
      await declineMutation.mutateAsync({ runId, reason });
      toast.success('Run abgelehnt');
      setShowDeclineDialog(false);
    } catch {
      toast.error('Fehler beim Ablehnen');
    }
  };

  const handleRollback = async () => {
    try {
      const result = await rollbackMutation.mutateAsync({ runId, reason: rollbackReason });
      toast.success(`Rollback erfolgreich: ${result.softDeletedLines} Zeilen soft-gelöscht`);
      setShowRollbackDialog(false);
      setRollbackReason('');
    } catch {
      toast.error('Fehler beim Rollback');
    }
  };

  const handleReprocess = async () => {
    try {
      await reprocessMutation.mutateAsync({ runId });
      toast.success('Run zum Reprocessing markiert');
    } catch {
      toast.error('Fehler beim Reprocess');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>
        <div className="flex gap-2 flex-wrap">
          {canReprocess && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={handleReprocess}
              disabled={reprocessMutation.isPending}
            >
              {reprocessMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Reprocess
            </Button>
          )}
          {canRollback && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-destructive border-destructive/30"
              onClick={() => setShowRollbackDialog(true)}
            >
              <RotateCcw className="h-4 w-4" /> Rollback
            </Button>
          )}
          {canDecide && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-destructive border-destructive/30"
                onClick={() => setShowDeclineDialog(true)}
              >
                <X className="h-4 w-4" /> Ablehnen
              </Button>
              <Button size="sm" className="gap-1" onClick={() => setShowAcceptDialog(true)}>
                <Check className="h-4 w-4" /> Akzeptieren
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            <span className="font-mono">{detail.runId}</span>
            <RunStatusBadge status={detail.status} />
          </CardTitle>
          {detail.description && (
            <CardDescription>{detail.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatBox label="Erwartet" value={detail.expectedLines.toLocaleString('de-DE')} />
            <StatBox label="Eingefügt" value={detail.inserted.toLocaleString('de-DE')} className="text-primary" />
            <StatBox label="Aktualisiert" value={detail.updated.toLocaleString('de-DE')} />
            <StatBox label="Dauer" value={formatDuration(detail.startedAt, detail.finishedAt)} />
          </div>
          <div className="flex items-center gap-3">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-sm text-muted-foreground">
              {detail.completedChunks}/{detail.totalChunks} Chunks
              {detail.failedChunks > 0 && (
                <span className="text-destructive ml-1">({detail.failedChunks} fehlg.)</span>
              )}
            </span>
          </div>

          {detail.errorMessage && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {detail.errorMessage}
            </div>
          )}

          {/* Artifacts */}
          {detail.artifacts && Array.isArray(detail.artifacts) && detail.artifacts.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Artefakte</p>
              <div className="space-y-1">
                {detail.artifacts.map((a: any, i: number) => (
                  <div key={i} className="text-xs font-mono bg-muted rounded px-2 py-1">
                    {typeof a === 'string' ? a : a.path || JSON.stringify(a)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chunks */}
      {detail.chunks && detail.chunks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Chunks ({detail.chunks.length})</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <TableHead>Fehler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.chunks.map((chunk) => (
                    <TableRow key={chunk.chunkId}>
                      <TableCell className="font-mono text-xs">{chunk.chunkId}</TableCell>
                      <TableCell><ChunkStatusBadge status={chunk.status} /></TableCell>
                      <TableCell className="text-right tabular-nums">{chunk.rowsInChunk}</TableCell>
                      <TableCell className="text-right tabular-nums">{chunk.inserted}</TableCell>
                      <TableCell className="text-right tabular-nums">{chunk.updated}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDuration(chunk.startedAt, chunk.completedAt)}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-48 truncate">
                        {chunk.errorMessage || '–'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sample Rows */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sample Rows</CardTitle>
          <CardDescription>Stichprobe der verarbeiteten Zeilen dieses Runs</CardDescription>
        </CardHeader>
        <CardContent>
          {samplesLoading ? (
            <Skeleton className="h-32" />
          ) : !samples || samples.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Keine Sample-Daten verfügbar
            </p>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typ</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead className="text-right">USt %</TableHead>
                    <TableHead>Operation</TableHead>
                    <TableHead>Chunk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {samples.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs font-mono">{row.line_type}</TableCell>
                      <TableCell className="text-sm max-w-48 truncate">{row.description}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        €{Number(row.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.tax_rate}%</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${row.operation === 'insert' ? 'text-primary' : 'text-muted-foreground'}`}>
                          {row.operation || '–'}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {row.chunk_id ?? '–'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accept Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run akzeptieren</DialogTitle>
            <DialogDescription>
              Bestätigt {detail.inserted + detail.updated} verarbeitete Zeilen als korrekt.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Kommentar (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>Abbrechen</Button>
            <Button onClick={handleAccept} disabled={acceptMutation.isPending}>
              {acceptMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Akzeptieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run ablehnen</DialogTitle>
            <DialogDescription>
              Markiert den Run als abgelehnt. Begründung wird in Audit-Logs gespeichert.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Begründung"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleDecline} disabled={declineMutation.isPending}>
              {declineMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-destructive" />
              Run Rollback
            </DialogTitle>
            <DialogDescription>
              Alle {detail.inserted + detail.updated} Zeilen dieses Runs werden soft-gelöscht.
              Der Run wird als &quot;rolled_back&quot; markiert und kann anschließend reprocessed werden.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Grund für den Rollback (wird im Audit-Log gespeichert)"
            value={rollbackReason}
            onChange={(e) => setRollbackReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>Abbrechen</Button>
            <Button variant="destructive" onClick={handleRollback} disabled={rollbackMutation.isPending || !rollbackReason.trim()}>
              {rollbackMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Rollback durchführen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 tabular-nums ${className || ''}`}>{value}</p>
    </div>
  );
}
