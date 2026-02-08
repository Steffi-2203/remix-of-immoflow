import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useReconciliationAudit } from '@/hooks/useBillingRuns';

const ACTION_LABELS: Record<string, string> = {
  upsert_missing_lines: 'Zeilen-Upsert',
  bulk_accept: 'Run akzeptiert',
  bulk_decline: 'Run abgelehnt',
  duplicate_merge: 'Duplikat-Merge',
  duplicate_resolve: 'Duplikat-Auflösung',
};

export function ReconciliationAuditExplorer() {
  const [actionFilter, setActionFilter] = useState<string>('all');
  const { data: logs, isLoading } = useReconciliationAudit(
    actionFilter === 'all' ? undefined : actionFilter
  );

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Audit Explorer
            </CardTitle>
            <CardDescription>
              Alle Reconciliation-bezogenen Audit-Einträge
            </CardDescription>
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Alle Aktionen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Aktionen</SelectItem>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Keine Audit-Einträge gefunden
          </p>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeitpunkt</TableHead>
                  <TableHead>Aktion</TableHead>
                  <TableHead>Tabelle</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), 'dd.MM.yy HH:mm:ss', { locale: de })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{log.tableName}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {log.recordId ? (log.recordId.length > 12 ? log.recordId.slice(0, 12) + '…' : log.recordId) : '–'}
                    </TableCell>
                    <TableCell className="max-w-64">
                      {log.newData && (
                        <pre className="text-xs bg-muted rounded px-2 py-1 overflow-hidden text-ellipsis whitespace-nowrap max-w-64">
                          {typeof log.newData === 'string' ? log.newData : JSON.stringify(log.newData)}
                        </pre>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
