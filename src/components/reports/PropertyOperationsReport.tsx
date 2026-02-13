import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Building2, Users, Euro, Download, ArrowUpRight, ArrowDownRight, Percent } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';

interface RentDistributionItem {
  unitId: string;
  unitName: string;
  unitType: string;
  flaeche: number;
  status: string;
  tenantName: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  monthsActive: number;
  spiegel: {
    grundmiete: number;
    betriebskosten: number;
    heizkosten: number;
    gesamt: number;
  };
  ist: number;
  differenz: number;
  mietpreis_m2: number;
}

interface ExpenseBreakdownItem {
  category: string;
  amount: number;
  count: number;
  umlagefaehig: boolean;
}

interface OperationsReport {
  meta: {
    propertyId: string;
    propertyName: string;
    address: string | null;
    year: number;
    generatedAt: string;
  };
  kpis: {
    totalUnits: number;
    occupiedUnits: number;
    occupancyRate: number;
    collectionRate: number;
    totalArea: number;
    sollMieteJahr: number;
    sollGesamtJahr: number;
    istGesamtJahr: number;
    differenz: number;
    totalExpenses: number;
    nettoertrag: number;
    renditePercent: number | null;
    renditePerM2: number;
    purchasePrice: number | null;
  };
  rentDistribution: RentDistributionItem[];
  expenseBreakdown: ExpenseBreakdownItem[];
}

const fmt = (n: number) => n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const categoryLabels: Record<string, string> = {
  versicherung: 'Versicherungen',
  instandhaltung: 'Instandhaltung',
  reparatur: 'Reparaturen',
  lift: 'Lift/Aufzug',
  heizung: 'Heizung',
  wasser: 'Wasser/Abwasser',
  strom: 'Strom Allgemein',
  muell: 'Müllabfuhr',
  hausbetreuung: 'Hausbetreuung',
  garten: 'Gartenpflege',
  schneeraeumung: 'Schneeräumung',
  grundsteuer: 'Grundsteuer',
  verwaltung: 'Verwaltung',
  kanal: 'Kanalgebühren',
  sonstiges: 'Sonstiges',
  betriebskosten_umlagefaehig: 'BK umlagefähig',
};

interface Props {
  selectedYear: number;
  initialPropertyId?: string;
}

export function PropertyOperationsReport({ selectedYear, initialPropertyId }: Props) {
  const { data: properties, isLoading: loadingProperties } = useProperties();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId || '');
  const [report, setReport] = useState<OperationsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select first property
  useEffect(() => {
    if (!selectedPropertyId && properties?.length) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/properties/${selectedPropertyId}/operations-report?year=${selectedYear}`, {
      credentials: 'include',
    })
      .then(r => {
        if (!r.ok) throw new Error('Bericht konnte nicht geladen werden');
        return r.json();
      })
      .then(setReport)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedPropertyId, selectedYear]);

  if (loadingProperties) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Property Selector */}
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Liegenschaft wählen" />
          </SelectTrigger>
          <SelectContent>
            {properties?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline">{selectedYear}</Badge>
      </div>

      {loading && (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      )}

      {error && (
        <Card className="border-destructive"><CardContent className="pt-6 text-destructive">{error}</CardContent></Card>
      )}

      {report && !loading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <KpiCard label="Einheiten" value={`${report.kpis.occupiedUnits}/${report.kpis.totalUnits}`} sub="Belegt/Gesamt" icon={<Building2 className="h-4 w-4" />} />
            <KpiCard label="Auslastung" value={`${report.kpis.occupancyRate}%`} sub={`${report.kpis.totalArea.toFixed(0)} m²`}
              color={report.kpis.occupancyRate >= 90 ? 'text-success' : report.kpis.occupancyRate >= 70 ? 'text-warning' : 'text-destructive'}
              icon={<Users className="h-4 w-4" />} />
            <KpiCard label="Soll-Miete p.a." value={`€${fmt(report.kpis.sollMieteJahr)}`} sub="Grundmiete" icon={<Euro className="h-4 w-4" />} />
            <KpiCard label="IST-Einnahmen" value={`€${fmt(report.kpis.istGesamtJahr)}`} sub={`Inkasso: ${report.kpis.collectionRate}%`}
              color={report.kpis.collectionRate >= 95 ? 'text-success' : 'text-warning'}
              icon={<TrendingUp className="h-4 w-4" />} />
            <KpiCard label="Nettoertrag" value={`€${fmt(report.kpis.nettoertrag)}`} sub="Miete - Instandhaltung"
              color={report.kpis.nettoertrag >= 0 ? 'text-success' : 'text-destructive'}
              icon={report.kpis.nettoertrag >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />} />
            <KpiCard label="Rendite" value={report.kpis.renditePercent !== null ? `${report.kpis.renditePercent}%` : '–'}
              sub={`€${fmt(report.kpis.renditePerM2)}/m²`}
              color={report.kpis.renditePercent !== null && report.kpis.renditePercent >= 3 ? 'text-success' : 'text-muted-foreground'}
              icon={<Percent className="h-4 w-4" />} />
          </div>

          {/* Rent Distribution Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="h-5 w-5" />
                Mietverteilung {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Einheit</TableHead>
                      <TableHead>Mieter</TableHead>
                      <TableHead className="text-right">m²</TableHead>
                      <TableHead className="text-right">€/m²</TableHead>
                      <TableHead className="text-right">Soll Miete</TableHead>
                      <TableHead className="text-right">Soll BK</TableHead>
                      <TableHead className="text-right">Soll HK</TableHead>
                      <TableHead className="text-right">Soll Gesamt</TableHead>
                      <TableHead className="text-right">IST</TableHead>
                      <TableHead className="text-right">Differenz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rentDistribution.map(r => (
                      <TableRow key={r.unitId} className={r.status !== 'aktiv' ? 'opacity-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.unitName}</span>
                            {r.status !== 'aktiv' && <Badge variant="outline" className="text-xs">Leer</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{r.tenantName || '—'}</TableCell>
                        <TableCell className="text-right">{r.flaeche > 0 ? r.flaeche.toFixed(1) : '–'}</TableCell>
                        <TableCell className="text-right">{r.mietpreis_m2 > 0 ? `€${r.mietpreis_m2.toFixed(2)}` : '–'}</TableCell>
                        <TableCell className="text-right">€{fmt(r.spiegel.grundmiete)}</TableCell>
                        <TableCell className="text-right">€{fmt(r.spiegel.betriebskosten)}</TableCell>
                        <TableCell className="text-right">€{fmt(r.spiegel.heizkosten)}</TableCell>
                        <TableCell className="text-right font-medium">€{fmt(r.spiegel.gesamt)}</TableCell>
                        <TableCell className="text-right font-medium">€{fmt(r.ist)}</TableCell>
                        <TableCell className={`text-right font-bold ${r.differenz >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {r.differenz >= 0 ? '+' : ''}€{fmt(r.differenz)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Totals Row */}
                    <TableRow className="border-t-2 font-bold bg-muted/50">
                      <TableCell>Gesamt</TableCell>
                      <TableCell>{report.rentDistribution.filter(r => r.tenantName).length} Mieter</TableCell>
                      <TableCell className="text-right">{report.kpis.totalArea.toFixed(1)}</TableCell>
                      <TableCell />
                      <TableCell className="text-right">€{fmt(report.rentDistribution.reduce((s, r) => s + r.spiegel.grundmiete, 0))}</TableCell>
                      <TableCell className="text-right">€{fmt(report.rentDistribution.reduce((s, r) => s + r.spiegel.betriebskosten, 0))}</TableCell>
                      <TableCell className="text-right">€{fmt(report.rentDistribution.reduce((s, r) => s + r.spiegel.heizkosten, 0))}</TableCell>
                      <TableCell className="text-right">€{fmt(report.kpis.sollGesamtJahr)}</TableCell>
                      <TableCell className="text-right">€{fmt(report.kpis.istGesamtJahr)}</TableCell>
                      <TableCell className={`text-right ${report.kpis.differenz >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {report.kpis.differenz >= 0 ? '+' : ''}€{fmt(report.kpis.differenz)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Ausgaben nach Kategorie {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategorie</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead className="text-right">Anzahl</TableHead>
                      <TableHead className="text-center">Umlagefähig</TableHead>
                      <TableHead className="text-right">Anteil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.expenseBreakdown.map(e => (
                      <TableRow key={e.category}>
                        <TableCell className="font-medium">{categoryLabels[e.category] || e.category}</TableCell>
                        <TableCell className="text-right">€{fmt(e.amount)}</TableCell>
                        <TableCell className="text-right">{e.count}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={e.umlagefaehig ? 'default' : 'secondary'} className="text-xs">
                            {e.umlagefaehig ? 'Ja' : 'Nein'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {report.kpis.totalExpenses > 0
                            ? `${((e.amount / report.kpis.totalExpenses) * 100).toFixed(1)}%`
                            : '–'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-bold bg-muted/50">
                      <TableCell>Gesamt</TableCell>
                      <TableCell className="text-right">€{fmt(report.kpis.totalExpenses)}</TableCell>
                      <TableCell className="text-right">{report.expenseBreakdown.reduce((s, e) => s + e.count, 0)}</TableCell>
                      <TableCell />
                      <TableCell className="text-right">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Soll-Mieteinnahmen</p>
                  <p className="text-2xl font-bold text-foreground">€{fmt(report.kpis.sollMieteJahr)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">− Instandhaltung & Kosten</p>
                  <p className="text-2xl font-bold text-destructive">€{fmt(report.kpis.totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">= Nettoertrag</p>
                  <p className={`text-2xl font-bold ${report.kpis.nettoertrag >= 0 ? 'text-success' : 'text-destructive'}`}>
                    €{fmt(report.kpis.nettoertrag)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-lg font-bold mt-0.5 ${color || 'text-foreground'}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
