import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { GitMerge, ExternalLink } from 'lucide-react';
import {
  useDuplicateGroups,
  type DuplicateGroup,
} from '@/hooks/useDuplicateResolution';
import { DuplicateResolutionDialog } from '@/components/banking/DuplicateResolutionDialog';
import { MergeUndoPanel } from './MergeUndoPanel';

export function ReconciliationDuplicates() {
  const { data, isLoading } = useDuplicateGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-64" />;

  const groups = data?.groups || [];

  return (
    <div className="space-y-4">
      <MergeUndoPanel />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Duplikat-Gruppen
          </CardTitle>
          <CardDescription>
            Identifizierte Duplikate basierend auf invoice_id + unit_id + line_type + normalized_description
          </CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Keine Duplikate gefunden ✓
            </p>
          ) : (
            <>
              <div className="mb-3">
                <Badge variant="secondary">{groups.length} Gruppe(n)</Badge>
                <Badge variant="outline" className="ml-2">
                  {data?.total || 0} betroffene Zeilen
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Duplikate</TableHead>
                      <TableHead className="text-right">Beträge</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow key={group.groupId}>
                        <TableCell className="text-sm max-w-64 truncate">
                          {group.normalizedDescription}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{group.lineType}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive" className="tabular-nums">
                            {group.rows.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {group.rows.map(r => `€${Number(r.amount).toFixed(2)}`).join(', ')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => setSelectedGroupId(group.groupId)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Auflösen
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedGroupId && (
        <DuplicateResolutionDialog
          groupId={selectedGroupId}
          open={!!selectedGroupId}
          onOpenChange={(open) => !open && setSelectedGroupId(null)}
          onResolved={() => setSelectedGroupId(null)}
        />
      )}
    </div>
  );
}
