import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClipboardList, Plus, Loader2, Euro, CheckCircle2, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useProperties } from '@/hooks/useProperties';
import { useToast } from '@/hooks/use-toast';

const fmtEur = (v: number | string | null | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  return n.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });
};

const months = [
  { value: '1', label: 'Jänner' }, { value: '2', label: 'Februar' }, { value: '3', label: 'März' },
  { value: '4', label: 'April' }, { value: '5', label: 'Mai' }, { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' }, { value: '11', label: 'November' }, { value: '12', label: 'Dezember' },
];

const statusLabels: Record<string, string> = {
  offen: 'Offen', bezahlt: 'Bezahlt', teilbezahlt: 'Teilbezahlt', ueberfaellig: 'Überfällig',
};

const statusStyles: Record<string, string> = {
  offen: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  bezahlt: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  teilbezahlt: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ueberfaellig: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function WegVorschreibungen() {
  const { toast } = useToast();
  const now = new Date();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genMonth, setGenMonth] = useState<number>(now.getMonth() + 1);
  const [genYear, setGenYear] = useState<number>(now.getFullYear());
  const [deleteRunId, setDeleteRunId] = useState<string | null>(null);

  const { data: allProperties = [] } = useProperties();
  const wegProperties = allProperties.filter((p: any) => (p.management_type || p.managementType) === 'weg');

  const { data: owners = [] } = useQuery({
    queryKey: ['/api/owners'],
    queryFn: async () => {
      const res = await fetch('/api/owners', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ['/api/units', selectedPropertyId],
    queryFn: async () => {
      const res = await fetch(`/api/units?propertyId=${selectedPropertyId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedPropertyId,
  });

  const queryParams = new URLSearchParams();
  if (selectedPropertyId) queryParams.set('propertyId', selectedPropertyId);
  queryParams.set('year', String(selectedYear));
  if (selectedMonth) queryParams.set('month', String(selectedMonth));

  const { data: vorschreibungen = [], isLoading } = useQuery({
    queryKey: ['/api/weg/vorschreibungen', selectedPropertyId, selectedYear, selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/weg/vorschreibungen?${queryParams.toString()}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedPropertyId,
  });

  const generateMut = useMutation({
    mutationFn: async (data: { propertyId: string; year: number; month: number }) => {
      const res = await apiRequest('POST', '/api/weg/vorschreibungen/generate', {
        property_id: data.propertyId,
        year: data.year,
        month: data.month,
      });
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/weg/vorschreibungen'] });
      setGenDialogOpen(false);
      toast({
        title: 'Vorschreibungen erstellt',
        description: `${result.count} WEG-Vorschreibungen für ${genMonth}/${genYear} generiert.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Fehler',
        description: err.message || 'Fehler beim Generieren der Vorschreibungen.',
        variant: 'destructive',
      });
    },
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest('PATCH', `/api/weg/vorschreibungen/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weg/vorschreibungen'] });
    },
  });

  const deleteRunMut = useMutation({
    mutationFn: async (runId: string) => {
      const res = await apiRequest('DELETE', `/api/weg/vorschreibungen/run/${runId}`);
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/weg/vorschreibungen'] });
      setDeleteRunId(null);
      toast({
        title: 'Gelöscht',
        description: `${result.count} Vorschreibungen wurden gelöscht.`,
      });
    },
  });

  const getOwnerName = (ownerId: string) => {
    const o = owners.find((o: any) => o.id === ownerId);
    if (!o) return ownerId?.substring(0, 8) + '...';
    return o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim() || ownerId.substring(0, 8);
  };

  const getUnitLabel = (unitId: string) => {
    const u = units.find((u: any) => u.id === unitId);
    return u ? (u.top_nummer || u.topNummer || unitId.substring(0, 8)) : unitId.substring(0, 8);
  };

  const totalGesamt = vorschreibungen.reduce((s: number, v: any) => s + (parseFloat(v.gesamtbetrag) || 0), 0);
  const totalBk = vorschreibungen.reduce((s: number, v: any) => s + (parseFloat(v.betriebskosten) || 0), 0);
  const totalRl = vorschreibungen.reduce((s: number, v: any) => s + (parseFloat(v.ruecklage) || 0), 0);
  const totalIh = vorschreibungen.reduce((s: number, v: any) => s + (parseFloat(v.instandhaltung) || 0), 0);
  const totalVh = vorschreibungen.reduce((s: number, v: any) => s + (parseFloat(v.verwaltungshonorar) || 0), 0);
  const totalHz = vorschreibungen.reduce((s: number, v: any) => s + (parseFloat(v.heizung) || 0), 0);
  const totalUst = vorschreibungen.reduce((s: number, v: any) => s + (parseFloat(v.ust) || 0), 0);

  const currentRuns: string[] = [...new Set(vorschreibungen.map((v: any) => v.run_id as string).filter(Boolean))];

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i);

  return (
    <MainLayout
      title="WEG-Vorschreibungen"
      subtitle="Monatliche Eigentümer-Vorschreibungen aus dem Wirtschaftsplan"
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-[280px]" data-testid="select-weg-vs-property">
              <SelectValue placeholder="WEG-Liegenschaft wählen..." />
            </SelectTrigger>
            <SelectContent>
              {wegProperties.length === 0 && (
                <SelectItem value="__none" disabled>Keine WEG-Liegenschaften vorhanden</SelectItem>
              )}
              {wegProperties.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]" data-testid="select-weg-vs-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedMonth ? String(selectedMonth) : 'all'} onValueChange={(v) => setSelectedMonth(v === 'all' ? undefined : parseInt(v))}>
            <SelectTrigger className="w-[160px]" data-testid="select-weg-vs-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Monate</SelectItem>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="ml-auto">
            <Button onClick={() => setGenDialogOpen(true)} disabled={!selectedPropertyId} data-testid="button-generate-weg-vs">
              <Plus className="h-4 w-4 mr-2" /> Vorschreibungen generieren
            </Button>
          </div>
        </div>

        {!selectedPropertyId ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Bitte wählen Sie eine WEG-Liegenschaft aus.</p>
              {wegProperties.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Es gibt noch keine WEG-Liegenschaften. Legen Sie zuerst eine Liegenschaft mit Verwaltungsart "WEG" an.
                </p>
              )}
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : vorschreibungen.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine Vorschreibungen für den gewählten Zeitraum.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Erstellen Sie Vorschreibungen aus dem Wirtschaftsplan.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">Betriebskosten (10%)</p>
                  <p className="text-lg font-semibold" data-testid="text-weg-vs-total-bk">{fmtEur(totalBk)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">Heizung (20%)</p>
                  <p className="text-lg font-semibold" data-testid="text-weg-vs-total-hz">{fmtEur(totalHz)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">Rücklage (0%)</p>
                  <p className="text-lg font-semibold" data-testid="text-weg-vs-total-rl">{fmtEur(totalRl)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">Instandhaltung (20%)</p>
                  <p className="text-lg font-semibold" data-testid="text-weg-vs-total-ih">{fmtEur(totalIh)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">Verwaltung (20%)</p>
                  <p className="text-lg font-semibold" data-testid="text-weg-vs-total-vh">{fmtEur(totalVh)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">USt gesamt</p>
                  <p className="text-lg font-semibold" data-testid="text-weg-vs-total-ust">{fmtEur(totalUst)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">Gesamt (brutto)</p>
                  <p className="text-lg font-bold" data-testid="text-weg-vs-total-gesamt">{fmtEur(totalGesamt)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">
                  {vorschreibungen.length} Vorschreibung{vorschreibungen.length !== 1 && 'en'}
                </CardTitle>
                {currentRuns.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteRunId(currentRuns[0])}
                    data-testid="button-delete-weg-vs-run"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Lauf löschen
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Monat</TableHead>
                      <TableHead>Einheit</TableHead>
                      <TableHead>Eigentümer</TableHead>
                      <TableHead>MEA</TableHead>
                      <TableHead className="text-right">BK</TableHead>
                      <TableHead className="text-right">Heizung</TableHead>
                      <TableHead className="text-right">Rücklage</TableHead>
                      <TableHead className="text-right">Instandh.</TableHead>
                      <TableHead className="text-right">Verwaltung</TableHead>
                      <TableHead className="text-right">USt</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vorschreibungen.map((v: any) => (
                      <TableRow key={v.id} data-testid={`row-weg-vs-${v.id}`}>
                        <TableCell>{v.month}/{v.year}</TableCell>
                        <TableCell className="font-medium">{getUnitLabel(v.unit_id)}</TableCell>
                        <TableCell>{getOwnerName(v.owner_id)}</TableCell>
                        <TableCell>{parseFloat(v.mea_share || 0).toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{fmtEur(v.betriebskosten)}</TableCell>
                        <TableCell className="text-right">{fmtEur(v.heizung)}</TableCell>
                        <TableCell className="text-right">{fmtEur(v.ruecklage)}</TableCell>
                        <TableCell className="text-right">{fmtEur(v.instandhaltung)}</TableCell>
                        <TableCell className="text-right">{fmtEur(v.verwaltungshonorar)}</TableCell>
                        <TableCell className="text-right">{fmtEur(v.ust)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtEur(v.gesamtbetrag)}</TableCell>
                        <TableCell>
                          <Select
                            value={v.status}
                            onValueChange={(newStatus) => statusMut.mutate({ id: v.id, status: newStatus })}
                          >
                            <SelectTrigger className="w-[130px]" data-testid={`select-weg-vs-status-${v.id}`}>
                              <Badge className={statusStyles[v.status] || ''}>
                                {statusLabels[v.status] || v.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WEG-Vorschreibungen generieren</DialogTitle>
            <DialogDescription>
              Erstellt monatliche Vorschreibungen für alle Eigentümer basierend auf dem Wirtschaftsplan und den MEA-Anteilen.
              Positionen: Betriebskosten (10% USt), Heizung (20% USt), Rücklage (0% USt), Instandhaltung (20% USt), Verwaltungshonorar (20% USt).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Monat</label>
                <Select value={String(genMonth)} onValueChange={(v) => setGenMonth(parseInt(v))}>
                  <SelectTrigger data-testid="select-gen-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jahr</label>
                <Select value={String(genYear)} onValueChange={(v) => setGenYear(parseInt(v))}>
                  <SelectTrigger data-testid="select-gen-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenDialogOpen(false)} data-testid="button-cancel-gen">
              Abbrechen
            </Button>
            <Button
              onClick={() => generateMut.mutate({ propertyId: selectedPropertyId, year: genYear, month: genMonth })}
              disabled={generateMut.isPending}
              data-testid="button-confirm-gen"
            >
              {generateMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRunId} onOpenChange={(v) => { if (!v) setDeleteRunId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vorschreibungen löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie alle Vorschreibungen dieses Laufs wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-run">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRunId && deleteRunMut.mutate(deleteRunId)}
              data-testid="button-confirm-delete-run"
            >
              {deleteRunMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}