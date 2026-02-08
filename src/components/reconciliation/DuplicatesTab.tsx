import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { GitMerge, ExternalLink, CheckCheck, XCircle, Loader2, Star } from 'lucide-react';
import {
  useDuplicateGroups,
  type DuplicateGroup,
} from '@/hooks/useDuplicateResolution';
import { DuplicateResolutionDialog } from '@/components/banking/DuplicateResolutionDialog';
import { MergeUndoPanel } from './MergeUndoPanel';
import { toast } from 'sonner';

export function ReconciliationDuplicates() {
  const { data, isLoading } = useDuplicateGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'accept' | 'decline'>('accept');
  const [bulkComment, setBulkComment] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const groups = data?.groups || [];

  const toggleGroup = useCallback((groupId: string) => {
    setSelectedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groups.map(g => g.groupId)));
    }
  }, [groups, selectedGroups.size]);

  const handleBulkAction = async (action: 'accept' | 'decline') => {
    setBulkAction(action);
    setShowBulkDialog(true);
  };

  const executeBulkAction = async () => {
    if (bulkComment.length < 5) {
      toast.error('Kommentar muss mindestens 5 Zeichen lang sein');
      return;
    }
    setBulkProcessing(true);
    try {
      const res = await fetch('/api/admin/duplicates/bulk-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupIds: Array.from(selectedGroups),
          action: bulkAction,
          comment: bulkComment,
          mergePolicy: bulkAction === 'accept' ? 'keep_latest' : 'manual',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = await res.json();
      toast.success(`${result.processed} Gruppen ${bulkAction === 'accept' ? 'aufgelöst' : 'abgelehnt'}`);
      setSelectedGroups(new Set());
      setShowBulkDialog(false);
      setBulkComment('');
    } catch (err: any) {
      toast.error(`Fehler: ${err.message}`);
    } finally {
      setBulkProcessing(false);
    }
  };

  /**
   * Suggested canonical: the row with the earliest created_at in a group.
   */
  const getSuggestedCanonical = (group: DuplicateGroup): string | null => {
    if (!group.rows || group.rows.length === 0) return null;
    const sorted = [...group.rows].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sorted[0].id;
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <MergeUndoPanel />

      {/* Bulk action bar */}
      {selectedGroups.size > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium">
              {selectedGroups.size} Gruppe(n) ausgewählt
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => handleBulkAction('accept')}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Alle auflösen (keep_latest)
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-destructive border-destructive/30"
                onClick={() => handleBulkAction('decline')}
              >
                <XCircle className="h-3.5 w-3.5" />
                Alle ablehnen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            Duplikat-Gruppen
          </CardTitle>
          <CardDescription>
            Identifizierte Duplikate basierend auf invoice_id + unit_id + line_type + normalized_description.
            <Star className="inline h-3 w-3 ml-1 text-amber-500" /> = vorgeschlagener Canonical (ältester Eintrag).
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
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedGroups.size === groups.length && groups.length > 0}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Duplikate</TableHead>
                      <TableHead className="text-right">Beträge</TableHead>
                      <TableHead>Canonical</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => {
                      const canonical = getSuggestedCanonical(group);
                      return (
                        <TableRow key={group.groupId}>
                          <TableCell>
                            <Checkbox
                              checked={selectedGroups.has(group.groupId)}
                              onCheckedChange={() => toggleGroup(group.groupId)}
                            />
                          </TableCell>
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
                            {canonical && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                <Star className="h-3 w-3" />
                                {canonical.slice(0, 8)}…
                              </span>
                            )}
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
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk confirm dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'accept' ? 'Bulk-Auflösung' : 'Bulk-Ablehnung'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'accept'
                ? `${selectedGroups.size} Gruppen werden mit "keep_latest" aufgelöst (ältester Eintrag als Canonical).`
                : `${selectedGroups.size} Gruppen werden als "kein Duplikat" markiert.`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Audit-Kommentar (min. 5 Zeichen)"
            value={bulkComment}
            onChange={e => setBulkComment(e.target.value)}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Abbrechen</Button>
            <Button
              variant={bulkAction === 'decline' ? 'destructive' : 'default'}
              onClick={executeBulkAction}
              disabled={bulkProcessing || bulkComment.length < 5}
            >
              {bulkProcessing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {bulkAction === 'accept' ? 'Auflösen' : 'Ablehnen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
