import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Flame, Trash2, Eye, Calculator } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useProperties } from '@/hooks/useProperties';

function formatEur(value: number): string {
  return value.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  entwurf: { label: 'Entwurf', variant: 'secondary' },
  berechnet: { label: 'Berechnet', variant: 'default' },
  versendet: { label: 'Versendet', variant: 'outline' },
  abgeschlossen: { label: 'Abgeschlossen', variant: 'default' },
};

export default function Heizkosten() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('abrechnungen');
  const [viewingSettlement, setViewingSettlement] = useState<any>(null);

  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [fixedCostShare, setFixedCostShare] = useState('45');
  const [variableCostShare, setVariableCostShare] = useState('55');
  const [notes, setNotes] = useState('');
  const [createdSettlement, setCreatedSettlement] = useState<any>(null);
  const [consumptionInputs, setConsumptionInputs] = useState<Record<string, { consumption: string; prepayment: string }>>({});
  const [calculatedDetails, setCalculatedDetails] = useState<any[]>([]);

  const { data: properties = [], isLoading: propertiesLoading } = useProperties();

  const { data: settlements = [], isLoading: settlementsLoading } = useQuery({
    queryKey: ['/api/heating-settlements', selectedPropertyId],
    queryFn: async () => {
      const url = selectedPropertyId
        ? `/api/heating-settlements?propertyId=${selectedPropertyId}`
        : '/api/heating-settlements';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      return res.json();
    },
  });

  const { data: propertyUnits = [], isLoading: unitsLoading } = useQuery({
    queryKey: ['/api/units', createdSettlement?.propertyId],
    queryFn: async () => {
      if (!createdSettlement?.propertyId) return [];
      const res = await fetch(`/api/units?propertyId=${createdSettlement.propertyId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden der Einheiten');
      return res.json();
    },
    enabled: !!createdSettlement?.propertyId,
  });

  const { data: viewDetails } = useQuery({
    queryKey: ['/api/heating-settlements', viewingSettlement?.id],
    queryFn: async () => {
      const res = await fetch(`/api/heating-settlements/${viewingSettlement.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      return res.json();
    },
    enabled: !!viewingSettlement?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/heating-settlements', data);
      return res.json();
    },
    onSuccess: (settlement) => {
      setCreatedSettlement(settlement);
      setConsumptionInputs({});
      setCalculatedDetails([]);
      queryClient.invalidateQueries({ queryKey: ['/api/heating-settlements'] });
      toast({ title: 'Abrechnung erstellt', description: 'Sie können nun die Verbrauchsdaten eingeben.' });
    },
    onError: (error: any) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (data: { id: number; consumptionData: any[] }) => {
      const res = await apiRequest('POST', `/api/heating-settlements/${data.id}/calculate`, { consumptionData: data.consumptionData });
      return res.json();
    },
    onSuccess: (details) => {
      setCalculatedDetails(details);
      queryClient.invalidateQueries({ queryKey: ['/api/heating-settlements'] });
      toast({ title: 'Berechnung abgeschlossen', description: 'Die Heizkosten wurden verteilt.' });
    },
    onError: (error: any) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/heating-settlements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/heating-settlements'] });
      toast({ title: 'Abrechnung gelöscht' });
    },
    onError: (error: any) => {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    },
  });

  const handleFixedChange = (val: string) => {
    const num = Number(val);
    setFixedCostShare(val);
    setVariableCostShare(String(100 - num));
  };

  const handleCreate = () => {
    if (!selectedPropertyId || !periodStart || !periodEnd || !totalCost) {
      toast({ title: 'Fehler', description: 'Bitte alle Pflichtfelder ausfüllen.', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      propertyId: selectedPropertyId,
      periodStart,
      periodEnd,
      totalCost: Number(totalCost),
      fixedCostShare: Number(fixedCostShare),
      variableCostShare: Number(variableCostShare),
      notes: notes || undefined,
    });
  };

  const handleCalculate = () => {
    if (!createdSettlement) return;
    const consumptionData = Object.entries(consumptionInputs)
      .filter(([, v]) => Number(v.consumption) > 0)
      .map(([unitId, v]) => ({
        unitId,
        consumption: Number(v.consumption),
        prepayment: Number(v.prepayment || 0),
      }));

    if (consumptionData.length === 0) {
      toast({ title: 'Fehler', description: 'Bitte Verbrauchsdaten eingeben.', variant: 'destructive' });
      return;
    }

    calculateMutation.mutate({ id: createdSettlement.id, consumptionData });
  };

  const handleConsumptionChange = (unitId: string, field: 'consumption' | 'prepayment', value: string) => {
    setConsumptionInputs(prev => ({
      ...prev,
      [unitId]: { ...prev[unitId], [field]: value },
    }));
  };

  return (
    <MainLayout title="Heizkostenabrechnung" subtitle="HeizKG-konforme Abrechnung nach Verbrauch und Fläche">
      <div className="space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5" />
              Liegenschaft auswählen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {propertiesLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" data-testid="loader-properties" />
            ) : (
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId} data-testid="select-property">
                <SelectTrigger data-testid="select-property-trigger">
                  <SelectValue placeholder="Liegenschaft wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {(properties as any[]).map((p: any) => (
                    <SelectItem key={p.id} value={p.id} data-testid={`select-property-${p.id}`}>
                      {p.name || p.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="abrechnungen" data-testid="tab-abrechnungen">Abrechnungen</TabsTrigger>
            <TabsTrigger value="neu" data-testid="tab-neu">Neue Abrechnung</TabsTrigger>
          </TabsList>

          <TabsContent value="abrechnungen">
            <Card>
              <CardContent className="p-0">
                {settlementsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin" data-testid="loader-settlements" />
                  </div>
                ) : settlements.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground" data-testid="text-no-settlements">
                    Keine Abrechnungen vorhanden.
                  </div>
                ) : viewingSettlement && viewDetails ? (
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-lg font-semibold" data-testid="text-settlement-detail-title">
                        Abrechnung #{viewingSettlement.id} — {viewingSettlement.propertyName}
                      </h3>
                      <Button variant="outline" onClick={() => setViewingSettlement(null)} data-testid="button-back">
                        Zurück
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Zeitraum</Label>
                        <p data-testid="text-settlement-period">{viewDetails.periodStart} — {viewDetails.periodEnd}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Gesamtkosten</Label>
                        <p data-testid="text-settlement-total">{formatEur(Number(viewDetails.totalCost))}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Fix / Variabel</Label>
                        <p data-testid="text-settlement-split">{viewDetails.fixedCostShare}% / {viewDetails.variableCostShare}%</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Status</Label>
                        <Badge variant={statusLabels[viewDetails.status]?.variant || 'secondary'} data-testid="badge-settlement-status">
                          {statusLabels[viewDetails.status]?.label || viewDetails.status}
                        </Badge>
                      </div>
                    </div>
                    {viewDetails.details && viewDetails.details.length > 0 && (
                      <Table data-testid="table-settlement-details">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Einheit</TableHead>
                            <TableHead>Mieter</TableHead>
                            <TableHead className="text-right">Fläche (m²)</TableHead>
                            <TableHead className="text-right">Verbrauch</TableHead>
                            <TableHead className="text-right">Fixanteil</TableHead>
                            <TableHead className="text-right">Variabel</TableHead>
                            <TableHead className="text-right">Gesamt</TableHead>
                            <TableHead className="text-right">Vorauszahlung</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewDetails.details.map((d: any) => {
                            const balance = Number(d.balance);
                            return (
                              <TableRow key={d.id} data-testid={`row-detail-${d.id}`}>
                                <TableCell>{d.unitId}</TableCell>
                                <TableCell>{d.tenantName || '—'}</TableCell>
                                <TableCell className="text-right">{Number(d.area).toFixed(2)}</TableCell>
                                <TableCell className="text-right">{Number(d.consumption).toFixed(2)}</TableCell>
                                <TableCell className="text-right">{formatEur(Number(d.fixedAmount))}</TableCell>
                                <TableCell className="text-right">{formatEur(Number(d.variableAmount))}</TableCell>
                                <TableCell className="text-right font-medium">{formatEur(Number(d.totalAmount))}</TableCell>
                                <TableCell className="text-right">{formatEur(Number(d.prepayment))}</TableCell>
                                <TableCell className={`text-right font-medium ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : ''}`} data-testid={`text-balance-${d.id}`}>
                                  {balance > 0 ? `${formatEur(balance)} Nachzahlung` : balance < 0 ? `${formatEur(Math.abs(balance))} Guthaben` : formatEur(0)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                ) : (
                  <Table data-testid="table-settlements">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zeitraum</TableHead>
                        <TableHead>Liegenschaft</TableHead>
                        <TableHead className="text-right">Gesamtkosten</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements.map((s: any) => (
                        <TableRow key={s.id} data-testid={`row-settlement-${s.id}`}>
                          <TableCell data-testid={`text-period-${s.id}`}>{s.periodStart} — {s.periodEnd}</TableCell>
                          <TableCell data-testid={`text-property-${s.id}`}>{s.propertyName || '—'}</TableCell>
                          <TableCell className="text-right" data-testid={`text-cost-${s.id}`}>{formatEur(Number(s.totalCost))}</TableCell>
                          <TableCell>
                            <Badge variant={statusLabels[s.status]?.variant || 'secondary'} data-testid={`badge-status-${s.id}`}>
                              {statusLabels[s.status]?.label || s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setViewingSettlement(s)} data-testid={`button-view-${s.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {s.status === 'entwurf' && (
                                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(s.id)} data-testid={`button-delete-${s.id}`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="neu">
            <div className="space-y-6">
              {!createdSettlement ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Neue Heizkostenabrechnung erstellen</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Zeitraum von</Label>
                        <Input
                          type="date"
                          value={periodStart}
                          onChange={e => setPeriodStart(e.target.value)}
                          data-testid="input-period-start"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Zeitraum bis</Label>
                        <Input
                          type="date"
                          value={periodEnd}
                          onChange={e => setPeriodEnd(e.target.value)}
                          data-testid="input-period-end"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Gesamte Heizkosten (EUR)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalCost}
                        onChange={e => setTotalCost(e.target.value)}
                        placeholder="z.B. 12000.00"
                        data-testid="input-total-cost"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fixkostenanteil (35–45%)</Label>
                        <Input
                          type="number"
                          min="35"
                          max="45"
                          value={fixedCostShare}
                          onChange={e => handleFixedChange(e.target.value)}
                          data-testid="input-fixed-share"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Variabler Anteil (55–65%)</Label>
                        <Input
                          type="number"
                          min="55"
                          max="65"
                          value={variableCostShare}
                          disabled
                          data-testid="input-variable-share"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Anmerkungen</Label>
                      <Input
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Optionale Anmerkungen..."
                        data-testid="input-notes"
                      />
                    </div>
                    <Button
                      onClick={handleCreate}
                      disabled={createMutation.isPending || !selectedPropertyId}
                      data-testid="button-create-settlement"
                    >
                      {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Abrechnung erstellen
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Verbrauchsdaten eingeben
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-muted-foreground text-xs">Zeitraum</Label>
                          <p data-testid="text-created-period">{createdSettlement.periodStart} — {createdSettlement.periodEnd}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Gesamtkosten</Label>
                          <p data-testid="text-created-total">{formatEur(Number(createdSettlement.totalCost))}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">Fix / Variabel</Label>
                          <p data-testid="text-created-split">{createdSettlement.fixedCostShare}% / {createdSettlement.variableCostShare}%</p>
                        </div>
                      </div>
                      {unitsLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" data-testid="loader-units" />
                      ) : propertyUnits.length === 0 ? (
                        <p className="text-muted-foreground" data-testid="text-no-units">Keine Einheiten für diese Liegenschaft gefunden.</p>
                      ) : (
                        <>
                          <Table data-testid="table-consumption-input">
                            <TableHeader>
                              <TableRow>
                                <TableHead>Einheit</TableHead>
                                <TableHead>Fläche (m²)</TableHead>
                                <TableHead>Verbrauch (kWh)</TableHead>
                                <TableHead>Vorauszahlung (EUR)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(propertyUnits as any[]).map((unit: any) => (
                                <TableRow key={unit.id} data-testid={`row-unit-${unit.id}`}>
                                  <TableCell>{unit.name || unit.bezeichnung || unit.id}</TableCell>
                                  <TableCell>{Number(unit.flaeche || 0).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={consumptionInputs[unit.id]?.consumption || ''}
                                      onChange={e => handleConsumptionChange(unit.id, 'consumption', e.target.value)}
                                      placeholder="0.00"
                                      data-testid={`input-consumption-${unit.id}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={consumptionInputs[unit.id]?.prepayment || ''}
                                      onChange={e => handleConsumptionChange(unit.id, 'prepayment', e.target.value)}
                                      placeholder="0.00"
                                      data-testid={`input-prepayment-${unit.id}`}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <div className="mt-4 flex gap-2 flex-wrap">
                            <Button
                              onClick={handleCalculate}
                              disabled={calculateMutation.isPending}
                              data-testid="button-calculate"
                            >
                              {calculateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                              Berechnen
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setCreatedSettlement(null);
                                setConsumptionInputs({});
                                setCalculatedDetails([]);
                              }}
                              data-testid="button-new-settlement"
                            >
                              Neue Abrechnung
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {calculatedDetails.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Ergebnis der Heizkostenverteilung</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table data-testid="table-results">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Einheit</TableHead>
                              <TableHead>Mieter</TableHead>
                              <TableHead className="text-right">Fläche (m²)</TableHead>
                              <TableHead className="text-right">Verbrauch</TableHead>
                              <TableHead className="text-right">Fixanteil</TableHead>
                              <TableHead className="text-right">Variabel</TableHead>
                              <TableHead className="text-right">Gesamt</TableHead>
                              <TableHead className="text-right">Vorauszahlung</TableHead>
                              <TableHead className="text-right">Saldo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {calculatedDetails.map((d: any) => {
                              const balance = Number(d.balance);
                              const unitInfo = (propertyUnits as any[]).find((u: any) => u.id === d.unitId);
                              return (
                                <TableRow key={d.id} data-testid={`row-result-${d.id}`}>
                                  <TableCell>{unitInfo?.name || unitInfo?.bezeichnung || d.unitId}</TableCell>
                                  <TableCell>{d.tenantName || '—'}</TableCell>
                                  <TableCell className="text-right">{Number(d.area).toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{Number(d.consumption).toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{formatEur(Number(d.fixedAmount))}</TableCell>
                                  <TableCell className="text-right">{formatEur(Number(d.variableAmount))}</TableCell>
                                  <TableCell className="text-right font-medium">{formatEur(Number(d.totalAmount))}</TableCell>
                                  <TableCell className="text-right">{formatEur(Number(d.prepayment))}</TableCell>
                                  <TableCell className={`text-right font-medium ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-600' : ''}`} data-testid={`text-result-balance-${d.id}`}>
                                    {balance > 0 ? `${formatEur(balance)} Nachzahlung` : balance < 0 ? `${formatEur(Math.abs(balance))} Guthaben` : formatEur(0)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
