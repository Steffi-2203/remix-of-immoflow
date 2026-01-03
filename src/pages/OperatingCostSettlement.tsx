import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Loader2, Calculator, Download, Euro, Home, FileText, Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { useExpenses } from '@/hooks/useExpenses';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Distribution key mapping for expense types (without heating - handled separately)
const expenseDistributionKeys: Record<string, 'mea' | 'qm' | 'personen'> = {
  lift: 'mea',
  versicherung: 'qm',
  grundsteuer: 'qm',
  muellabfuhr: 'personen',
  wasser_abwasser: 'personen',
  strom_allgemein: 'mea',
  hausbetreuung: 'qm',
  gartenpflege: 'qm',
  schneeraeumung: 'qm',
  verwaltung: 'mea',
  ruecklage: 'mea',
  sonstiges: 'qm',
};

const expenseTypeLabels: Record<string, string> = {
  versicherung: 'Versicherung',
  grundsteuer: 'Grundsteuer',
  muellabfuhr: 'Müllabfuhr',
  wasser_abwasser: 'Wasser/Abwasser',
  strom_allgemein: 'Allgemeinstrom',
  hausbetreuung: 'Hausbetreuung',
  lift: 'Lift',
  gartenpflege: 'Gartenpflege',
  schneeraeumung: 'Schneeräumung',
  verwaltung: 'Verwaltung',
  ruecklage: 'Rücklage',
  sonstiges: 'Sonstiges',
};

const distributionKeyLabels: Record<string, string> = {
  mea: 'MEA (‰)',
  qm: 'Quadratmeter',
  personen: 'Personen',
};

interface UnitWithTenant {
  id: string;
  top_nummer: string;
  type: string;
  qm: number;
  mea: number;
  vs_personen: number | null;
  status: string;
  tenant_id: string | null;
  tenant_name: string | null;
  bk_vorschuss_monatlich: number;
  hk_vorschuss_monatlich: number;
}

export default function OperatingCostSettlement() {
  const currentYear = new Date().getFullYear();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(1); // null = ganzes Jahr

  const { data: properties, isLoading: isLoadingProperties } = useProperties();
  const { data: expenses, isLoading: isLoadingExpenses } = useExpenses(
    selectedPropertyId || undefined,
    selectedYear,
    selectedMonth || undefined
  );

  // Fetch ALL units (including vacancies) with tenant info and advance payments
  const { data: units, isLoading: isLoadingUnits } = useQuery({
    queryKey: ['units-with-tenants-advances', selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return [];
      
      // Get all units first
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('id, top_nummer, type, qm, mea, vs_personen, status')
        .eq('property_id', selectedPropertyId)
        .order('top_nummer');
      
      if (unitsError) throw unitsError;
      if (!unitsData) return [];

      // Get active tenants for this property's units with advance payment info
      const unitIds = unitsData.map(u => u.id);
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('id, first_name, last_name, unit_id, betriebskosten_vorschuss, heizungskosten_vorschuss')
        .in('unit_id', unitIds)
        .eq('status', 'aktiv');

      // Map tenants to units
      const tenantMap = new Map(tenantsData?.map(t => [t.unit_id, t]) || []);

      return unitsData.map(u => {
        const tenant = tenantMap.get(u.id);
        return {
          id: u.id,
          top_nummer: u.top_nummer,
          type: u.type,
          qm: Number(u.qm),
          mea: Number(u.mea),
          vs_personen: u.vs_personen,
          status: u.status,
          tenant_id: tenant?.id || null,
          tenant_name: tenant ? `${tenant.first_name} ${tenant.last_name}` : null,
          bk_vorschuss_monatlich: Number(tenant?.betriebskosten_vorschuss || 0),
          hk_vorschuss_monatlich: Number(tenant?.heizungskosten_vorschuss || 0),
        };
      });
    },
    enabled: !!selectedPropertyId,
  });

  // Calculate totals for distribution
  const totals = useMemo(() => {
    if (!units) return { qm: 0, mea: 0, personen: 0 };
    return units.reduce(
      (acc, unit) => ({
        qm: acc.qm + Number(unit.qm),
        mea: acc.mea + Number(unit.mea),
        personen: acc.personen + (unit.vs_personen || 1),
      }),
      { qm: 0, mea: 0, personen: 0 }
    );
  }, [units]);

  // Calculate number of months for the period
  const monthCount = selectedMonth ? 1 : 12;

  // Separate BK expenses (without heating) and Heating expenses
  const bkKosten = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter(e => 
      e.category === 'betriebskosten_umlagefaehig' && e.expense_type !== 'heizung'
    );
  }, [expenses]);

  const hkKosten = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter(e => 
      e.category === 'betriebskosten_umlagefaehig' && e.expense_type === 'heizung'
    );
  }, [expenses]);

  // Calculate total by expense type (BK only, without heating)
  const expensesByType = useMemo(() => {
    const grouped: Record<string, number> = {};
    bkKosten.forEach(exp => {
      grouped[exp.expense_type] = (grouped[exp.expense_type] || 0) + Number(exp.betrag);
    });
    return grouped;
  }, [bkKosten]);

  // Total heating costs
  const totalHeizkosten = hkKosten.reduce((sum, e) => sum + Number(e.betrag), 0);

  // Calculate distribution per unit (BK and HK separately)
  const unitDistribution = useMemo(() => {
    if (!units || units.length === 0) return [];

    return units.map(unit => {
      const unitCosts: Record<string, number> = {};
      let totalBkCost = 0;

      // Calculate BK costs per expense type
      Object.entries(expensesByType).forEach(([expenseType, totalAmount]) => {
        const distributionKey = expenseDistributionKeys[expenseType] || 'qm';
        let unitShare = 0;
        let unitValue = 0;
        let totalValue = 0;

        switch (distributionKey) {
          case 'mea':
            unitValue = Number(unit.mea);
            totalValue = totals.mea;
            break;
          case 'qm':
            unitValue = Number(unit.qm);
            totalValue = totals.qm;
            break;
          case 'personen':
            unitValue = unit.vs_personen || 1;
            totalValue = totals.personen;
            break;
        }

        if (totalValue > 0) {
          unitShare = (unitValue / totalValue) * totalAmount;
        }

        unitCosts[expenseType] = Math.round(unitShare * 100) / 100;
        totalBkCost += unitShare;
      });

      // Calculate HK costs (distributed by qm)
      let hkCost = 0;
      if (totals.qm > 0) {
        hkCost = (Number(unit.qm) / totals.qm) * totalHeizkosten;
      }

      // Calculate advance payments for the period
      const bkVorschussGesamt = unit.bk_vorschuss_monatlich * monthCount;
      const hkVorschussGesamt = unit.hk_vorschuss_monatlich * monthCount;

      // Calculate balance (Guthaben/Nachzahlung)
      // Positive = tenant pays more (Nachzahlung)
      // Negative = tenant gets back (Guthaben)
      const isLeerstand = unit.status === 'leerstand' || !unit.tenant_id;
      const bkSaldo = isLeerstand ? 0 : Math.round((totalBkCost - bkVorschussGesamt) * 100) / 100;
      const hkSaldo = isLeerstand ? 0 : Math.round((hkCost - hkVorschussGesamt) * 100) / 100;

      return {
        ...unit,
        costs: unitCosts,
        totalBkCost: Math.round(totalBkCost * 100) / 100,
        hkCost: Math.round(hkCost * 100) / 100,
        bkVorschuss: bkVorschussGesamt,
        hkVorschuss: hkVorschussGesamt,
        bkSaldo,
        hkSaldo,
        gesamtSaldo: bkSaldo + hkSaldo,
        isLeerstand,
      };
    });
  }, [units, expensesByType, totals, totalHeizkosten, monthCount]);

  const totalBkKosten = bkKosten.reduce((sum, e) => sum + Number(e.betrag), 0);

  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);

  const isLoading = isLoadingProperties || isLoadingExpenses || isLoadingUnits;

  return (
    <MainLayout
      title="BK-Abrechnung"
      subtitle="Betriebskostenabrechnung nach Verteilerschlüsseln"
    >
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Liegenschaft</label>
              <Select
                value={selectedPropertyId}
                onValueChange={setSelectedPropertyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Liegenschaft wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {properties?.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Jahr</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Monat</label>
              <Select
                value={selectedMonth?.toString() || 'all'}
                onValueChange={(v) => setSelectedMonth(v === 'all' ? null : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Gesamtes Jahr</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {new Date(2000, i).toLocaleString('de-AT', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedPropertyId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Wählen Sie eine Liegenschaft aus</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Euro className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Betriebskosten</p>
                    <p className="text-xl font-bold">€ {totalBkKosten.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <Flame className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Heizkosten</p>
                    <p className="text-xl font-bold">€ {totalHeizkosten.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Einheiten</p>
                    <p className="text-xl font-bold">{units?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <span className="text-primary font-bold text-sm">m²</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gesamt-qm</p>
                    <p className="text-xl font-bold">{totals.qm.toLocaleString('de-AT')} m²</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <span className="text-primary font-bold text-sm">‰</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gesamt-MEA</p>
                    <p className="text-xl font-bold">{totals.mea.toLocaleString('de-AT')}‰</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense Types with Distribution Keys */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Betriebskosten nach Verteilerschlüssel
              </CardTitle>
              <CardDescription>
                {selectedMonth 
                  ? `${new Date(selectedYear, selectedMonth - 1).toLocaleString('de-AT', { month: 'long', year: 'numeric' })}`
                  : `Jahr ${selectedYear}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(expensesByType).length === 0 && totalHeizkosten === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Keine umlagefähigen Kosten für diesen Zeitraum erfasst.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kostenart</TableHead>
                      <TableHead>Verteilerschlüssel</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(expensesByType).map(([type, amount]) => (
                      <TableRow key={type}>
                        <TableCell className="font-medium">
                          {expenseTypeLabels[type] || type}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {distributionKeyLabels[expenseDistributionKeys[type] || 'qm']}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          € {Number(amount).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold">Summe Betriebskosten</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold">
                        € {totalBkKosten.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                    {/* Heizung als separate Position */}
                    <TableRow className="bg-orange-50">
                      <TableCell className="font-medium flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-600" />
                        Heizkosten
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                          Quadratmeter
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        € {totalHeizkosten.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-t-2 bg-muted/50">
                      <TableCell className="font-bold">Gesamtkosten</TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold">
                        € {(totalBkKosten + totalHeizkosten).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Abrechnung per Unit with Saldo */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Abrechnung pro Einheit
                  </CardTitle>
                  <CardDescription>
                    Anteilige Kosten, Vorauszahlungen und Saldo ({monthCount} {monthCount === 1 ? 'Monat' : 'Monate'})
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {unitDistribution.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Keine Einheiten vorhanden.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Top</TableHead>
                        <TableHead>Mieter</TableHead>
                        <TableHead className="text-right">qm</TableHead>
                        <TableHead className="text-right bg-blue-50">BK Anteil</TableHead>
                        <TableHead className="text-right bg-blue-50">BK Vorschuss</TableHead>
                        <TableHead className="text-right bg-blue-50">BK Saldo</TableHead>
                        <TableHead className="text-right bg-orange-50">HK Anteil</TableHead>
                        <TableHead className="text-right bg-orange-50">HK Vorschuss</TableHead>
                        <TableHead className="text-right bg-orange-50">HK Saldo</TableHead>
                        <TableHead className="text-right font-bold">Gesamt Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unitDistribution.map(unit => (
                        <TableRow key={unit.id} className={unit.isLeerstand ? 'bg-muted/30' : ''}>
                          <TableCell className="font-medium">
                            {unit.top_nummer}
                            {unit.isLeerstand && (
                              <Badge variant="outline" className="ml-2 text-xs">Leerstand</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {unit.tenant_name || (
                              <span className="text-muted-foreground italic">
                                {unit.isLeerstand ? 'Eigentümer' : '—'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{Number(unit.qm).toLocaleString('de-AT')}</TableCell>
                          {/* BK */}
                          <TableCell className="text-right bg-blue-50/50">
                            € {unit.totalBkCost.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right bg-blue-50/50">
                            {unit.isLeerstand ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              `€ ${unit.bkVorschuss.toLocaleString('de-AT', { minimumFractionDigits: 2 })}`
                            )}
                          </TableCell>
                          <TableCell className="text-right bg-blue-50/50">
                            {unit.isLeerstand ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className={`flex items-center justify-end gap-1 ${unit.bkSaldo > 0 ? 'text-destructive' : unit.bkSaldo < 0 ? 'text-success' : ''}`}>
                                {unit.bkSaldo > 0 && <TrendingUp className="h-3 w-3" />}
                                {unit.bkSaldo < 0 && <TrendingDown className="h-3 w-3" />}
                                € {Math.abs(unit.bkSaldo).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </TableCell>
                          {/* HK */}
                          <TableCell className="text-right bg-orange-50/50">
                            € {unit.hkCost.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right bg-orange-50/50">
                            {unit.isLeerstand ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              `€ ${unit.hkVorschuss.toLocaleString('de-AT', { minimumFractionDigits: 2 })}`
                            )}
                          </TableCell>
                          <TableCell className="text-right bg-orange-50/50">
                            {unit.isLeerstand ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span className={`flex items-center justify-end gap-1 ${unit.hkSaldo > 0 ? 'text-destructive' : unit.hkSaldo < 0 ? 'text-success' : ''}`}>
                                {unit.hkSaldo > 0 && <TrendingUp className="h-3 w-3" />}
                                {unit.hkSaldo < 0 && <TrendingDown className="h-3 w-3" />}
                                € {Math.abs(unit.hkSaldo).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </TableCell>
                          {/* Gesamt */}
                          <TableCell className="text-right font-bold">
                            {unit.isLeerstand ? (
                              <span className="text-muted-foreground">
                                € {(unit.totalBkCost + unit.hkCost).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                                <span className="text-xs block font-normal">(Eigentümer)</span>
                              </span>
                            ) : (
                              <span className={`flex items-center justify-end gap-1 ${unit.gesamtSaldo > 0 ? 'text-destructive' : unit.gesamtSaldo < 0 ? 'text-success' : ''}`}>
                                {unit.gesamtSaldo > 0 && <TrendingUp className="h-4 w-4" />}
                                {unit.gesamtSaldo < 0 && <TrendingDown className="h-4 w-4" />}
                                € {Math.abs(unit.gesamtSaldo).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                                <span className="text-xs font-normal ml-1">
                                  {unit.gesamtSaldo > 0 ? '(Nachz.)' : unit.gesamtSaldo < 0 ? '(Guthaben)' : ''}
                                </span>
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Summenzeile */}
                      <TableRow className="border-t-2 bg-muted/50">
                        <TableCell className="font-bold">Summe</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-medium">{totals.qm.toLocaleString('de-AT')}</TableCell>
                        <TableCell className="text-right font-medium bg-blue-50/50">
                          € {unitDistribution.reduce((sum, u) => sum + u.totalBkCost, 0).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium bg-blue-50/50">
                          € {unitDistribution.filter(u => !u.isLeerstand).reduce((sum, u) => sum + u.bkVorschuss, 0).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium bg-blue-50/50">
                          € {unitDistribution.filter(u => !u.isLeerstand).reduce((sum, u) => sum + u.bkSaldo, 0).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium bg-orange-50/50">
                          € {unitDistribution.reduce((sum, u) => sum + u.hkCost, 0).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium bg-orange-50/50">
                          € {unitDistribution.filter(u => !u.isLeerstand).reduce((sum, u) => sum + u.hkVorschuss, 0).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium bg-orange-50/50">
                          € {unitDistribution.filter(u => !u.isLeerstand).reduce((sum, u) => sum + u.hkSaldo, 0).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          € {unitDistribution.filter(u => !u.isLeerstand).reduce((sum, u) => sum + u.gesamtSaldo, 0).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Legende */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-destructive" />
                  <span>Nachzahlung (Mieter zahlt mehr)</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-success" />
                  <span>Guthaben (Mieter erhält zurück)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Leerstand</Badge>
                  <span>Kosten trägt Eigentümer</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </MainLayout>
  );
}
