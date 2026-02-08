import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  CheckCircle2, XCircle, Clock, Loader2, Ban, ChevronRight, Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useBillingRuns, type BillingRunSummary } from '@/hooks/useBillingRuns';
import { RunStatusBadge, formatDuration } from './shared';

interface Props {
  onSelectRun: (runId: string) => void;
}

export function ReconciliationRunsList({ onSelectRun }: Props) {
  const { data: runs, isLoading } = useBillingRuns();

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Billing Runs
        </CardTitle>
        <CardDescription>
          Alle Batch-Verarbeitungsläufe mit Status und Fortschritt
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
                    <TableRow
                      key={run.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onSelectRun(run.runId)}
                    >
                      <TableCell className="font-mono text-sm">
                        {run.runId.length > 24 ? run.runId.slice(0, 24) + '…' : run.runId}
                      </TableCell>
                      <TableCell><RunStatusBadge status={run.status} /></TableCell>
                      <TableCell className="text-right tabular-nums">{run.expectedLines.toLocaleString('de-DE')}</TableCell>
                      <TableCell className="text-right tabular-nums">{run.inserted.toLocaleString('de-DE')}</TableCell>
                      <TableCell className="text-right tabular-nums">{run.updated.toLocaleString('de-DE')}</TableCell>
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
  );
}
