import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Plus, Calculator, ArrowUpRight } from 'lucide-react';
import { useRentIndexClauses, useRentAdjustments, useCreateRentIndexClause, useApplyRentAdjustment } from '@/hooks/useRentIndexing';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface RentIndexCardProps {
  tenantId: string;
  currentGrundmiete: number;
  tenantName: string;
}

function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}`;
}

export function RentIndexCard({ tenantId, currentGrundmiete, tenantName }: RentIndexCardProps) {
  const { data: clauses, isLoading: clausesLoading } = useRentIndexClauses(tenantId);
  const { data: adjustments } = useRentAdjustments(tenantId);
  const createClause = useCreateRentIndexClause();
  const applyAdjustment = useApplyRentAdjustment();

  const [clauseDialogOpen, setClauseDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [clauseForm, setClauseForm] = useState({
    index_type: 'vpi' as 'vpi' | 'richtwert',
    base_index_value: '',
    base_index_date: new Date().toISOString().split('T')[0],
    threshold_percent: '5',
    notes: '',
  });
  const [adjustForm, setAdjustForm] = useState({
    new_index_value: '',
    adjustment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const activeClause = clauses?.find(c => c.is_active);

  const handleCreateClause = async () => {
    await createClause.mutateAsync({
      tenant_id: tenantId,
      index_type: clauseForm.index_type,
      base_index_value: parseFloat(clauseForm.base_index_value),
      base_index_date: clauseForm.base_index_date,
      current_index_value: parseFloat(clauseForm.base_index_value),
      threshold_percent: parseFloat(clauseForm.threshold_percent),
      is_active: true,
      notes: clauseForm.notes || null,
    });
    setClauseDialogOpen(false);
  };

  const handleApplyAdjustment = async () => {
    if (!activeClause) return;
    
    const newIndexValue = parseFloat(adjustForm.new_index_value);
    const oldIndexValue = activeClause.current_index_value || activeClause.base_index_value;
    const changePercent = ((newIndexValue - oldIndexValue) / oldIndexValue) * 100;
    const newGrundmiete = Math.round((currentGrundmiete * (newIndexValue / oldIndexValue)) * 100) / 100;

    await applyAdjustment.mutateAsync({
      tenant_id: tenantId,
      clause_id: activeClause.id,
      adjustment_date: adjustForm.adjustment_date,
      old_grundmiete: currentGrundmiete,
      new_grundmiete: newGrundmiete,
      old_index_value: oldIndexValue,
      new_index_value: newIndexValue,
      change_percent: Math.round(changePercent * 100) / 100,
      applied_by: null,
      notes: adjustForm.notes || null,
    });
    setAdjustDialogOpen(false);
  };

  // Calculate pending adjustment preview
  const pendingChange = activeClause && adjustForm.new_index_value
    ? (() => {
        const newVal = parseFloat(adjustForm.new_index_value);
        const oldVal = activeClause.current_index_value || activeClause.base_index_value;
        if (isNaN(newVal) || oldVal === 0) return null;
        const pct = ((newVal - oldVal) / oldVal) * 100;
        const newRent = Math.round((currentGrundmiete * (newVal / oldVal)) * 100) / 100;
        return { pct: Math.round(pct * 100) / 100, newRent };
      })()
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Indexanpassung / Wertsicherung
          </div>
          {!activeClause && (
            <Dialog open={clauseDialogOpen} onOpenChange={setClauseDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Klausel anlegen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Wertsicherungsklausel anlegen</DialogTitle>
                  <DialogDescription>
                    Definieren Sie die Indexklausel für die Mietanpassung von {tenantName}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Index-Typ</Label>
                    <Select value={clauseForm.index_type} onValueChange={(v) => setClauseForm(f => ({ ...f, index_type: v as 'vpi' | 'richtwert' }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vpi">VPI (Verbraucherpreisindex)</SelectItem>
                        <SelectItem value="richtwert">Richtwertmietzins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Basis-Indexwert</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={clauseForm.base_index_value}
                        onChange={(e) => setClauseForm(f => ({ ...f, base_index_value: e.target.value }))}
                        placeholder="z.B. 112.3"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Basis-Datum</Label>
                      <Input
                        type="date"
                        value={clauseForm.base_index_date}
                        onChange={(e) => setClauseForm(f => ({ ...f, base_index_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Schwellenwert (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={clauseForm.threshold_percent}
                      onChange={(e) => setClauseForm(f => ({ ...f, threshold_percent: e.target.value }))}
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground">
                      Anpassung erst ab dieser prozentualen Änderung des Index (Standard: 5% gem. MRG)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setClauseDialogOpen(false)}>Abbrechen</Button>
                  <Button onClick={handleCreateClause} disabled={!clauseForm.base_index_value || createClause.isPending}>
                    Klausel speichern
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeClause ? (
          <>
            {/* Active clause info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-xs text-muted-foreground">Index-Typ</p>
                <Badge variant="secondary">
                  {activeClause.index_type === 'vpi' ? 'VPI' : 'Richtwert'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Basis-Wert</p>
                <p className="font-medium">{activeClause.base_index_value}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktueller Wert</p>
                <p className="font-medium">{activeClause.current_index_value || activeClause.base_index_value}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Schwelle</p>
                <p className="font-medium">{activeClause.threshold_percent}%</p>
              </div>
            </div>

            {/* Apply adjustment */}
            <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  Indexanpassung durchführen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Indexanpassung berechnen</DialogTitle>
                  <DialogDescription>
                    Geben Sie den neuen Indexwert ein, um die Mietanpassung zu berechnen.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Neuer Indexwert</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={adjustForm.new_index_value}
                        onChange={(e) => setAdjustForm(f => ({ ...f, new_index_value: e.target.value }))}
                        placeholder="z.B. 118.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Anpassungsdatum</Label>
                      <Input
                        type="date"
                        value={adjustForm.adjustment_date}
                        onChange={(e) => setAdjustForm(f => ({ ...f, adjustment_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  {pendingChange && (
                    <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <ArrowUpRight className="h-4 w-4 text-primary" />
                        Vorschau der Anpassung
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Änderung</p>
                          <p className={`font-bold ${pendingChange.pct > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                            {pendingChange.pct > 0 ? '+' : ''}{pendingChange.pct}%
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Neue Grundmiete</p>
                          <p className="font-bold">{formatCurrency(pendingChange.newRent)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Aktuelle Grundmiete</p>
                          <p>{formatCurrency(currentGrundmiete)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Differenz</p>
                          <p className="font-medium">
                            {formatCurrency(pendingChange.newRent - currentGrundmiete)}/Monat
                          </p>
                        </div>
                      </div>
                      {Math.abs(pendingChange.pct) < activeClause.threshold_percent && (
                        <p className="text-xs text-amber-600 font-medium mt-2">
                          ⚠️ Änderung liegt unter dem Schwellenwert von {activeClause.threshold_percent}%
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Anmerkung (optional)</Label>
                    <Input
                      value={adjustForm.notes}
                      onChange={(e) => setAdjustForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="z.B. VPI-Anpassung gem. Statistik Austria"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Abbrechen</Button>
                  <Button 
                    onClick={handleApplyAdjustment} 
                    disabled={!adjustForm.new_index_value || applyAdjustment.isPending}
                  >
                    Anpassung durchführen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* History */}
            {adjustments && adjustments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Anpassungshistorie</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Index alt → neu</TableHead>
                      <TableHead>Miete alt → neu</TableHead>
                      <TableHead>Änderung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map(adj => (
                      <TableRow key={adj.id}>
                        <TableCell>{format(parseISO(adj.adjustment_date), 'dd.MM.yyyy', { locale: de })}</TableCell>
                        <TableCell>{adj.old_index_value} → {adj.new_index_value}</TableCell>
                        <TableCell>{formatCurrency(adj.old_grundmiete)} → {formatCurrency(adj.new_grundmiete)}</TableCell>
                        <TableCell>
                          <Badge variant={adj.change_percent > 0 ? 'default' : 'secondary'}>
                            {adj.change_percent > 0 ? '+' : ''}{adj.change_percent}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine Wertsicherungsklausel hinterlegt. Erstellen Sie eine Klausel, um automatische Mietanpassungen basierend auf dem VPI oder Richtwert zu ermöglichen.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
