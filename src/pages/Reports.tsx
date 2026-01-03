import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Home,
  Euro,
  FileText,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Building2,
  Receipt,
} from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { useExpenses } from '@/hooks/useExpenses';
import { toast } from 'sonner';
import {
  generateRenditeReport,
  generateLeerstandReport,
  generateUmsatzReport,
  generateUstVoranmeldung,
} from '@/utils/reportPdfExport';

// Berechnet Netto aus Brutto
const calculateNetFromGross = (gross: number, vatRate: number): number => {
  if (vatRate === 0) return gross;
  return gross / (1 + vatRate / 100);
};

// Berechnet USt aus Brutto
const calculateVatFromGross = (gross: number, vatRate: number): number => {
  if (vatRate === 0) return 0;
  return gross - (gross / (1 + vatRate / 100));
};

const unitTypeLabels: Record<string, string> = {
  wohnung: 'Wohnung',
  geschaeft: 'Geschäft',
  garage: 'Garage',
  stellplatz: 'Stellplatz',
  lager: 'Lager',
};

const reports = [
  {
    id: 'rendite',
    title: 'Renditereport',
    description: 'Übersicht der Rendite pro Liegenschaft und gesamt',
    icon: TrendingUp,
    color: 'bg-success/10 text-success',
  },
  {
    id: 'leerstand',
    title: 'Leerstandsreport',
    description: 'Analyse der Leerstandsquote und Dauer',
    icon: Home,
    color: 'bg-warning/10 text-warning',
  },
  {
    id: 'umsatz',
    title: 'Umsatzreport',
    description: 'Monatliche und jährliche Umsatzübersicht',
    icon: Euro,
    color: 'bg-primary/10 text-primary',
  },
  {
    id: 'ust',
    title: 'USt-Voranmeldung',
    description: 'Umsatzsteuer vs. Vorsteuer für das Finanzamt',
    icon: FileText,
    color: 'bg-accent/10 text-accent-foreground',
  },
];

const monthNames = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function Reports() {
  const currentDate = new Date();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [reportPeriod, setReportPeriod] = useState<'monthly' | 'yearly'>('monthly');
  
  const { data: properties, isLoading: isLoadingProperties } = useProperties();
  const { data: allUnits, isLoading: isLoadingUnits } = useUnits();
  const { data: allTenants, isLoading: isLoadingTenants } = useTenants();
  const { data: allInvoices, isLoading: isLoadingInvoices } = useInvoices();
  const { data: allExpenses, isLoading: isLoadingExpenses } = useExpenses();

  const isLoading = isLoadingProperties || isLoadingUnits || isLoadingTenants || isLoadingInvoices || isLoadingExpenses;

  // Generate year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  // Filter data by selected property
  const units = selectedPropertyId === 'all' 
    ? allUnits 
    : allUnits?.filter(u => u.property_id === selectedPropertyId);
  
  const expenses = selectedPropertyId === 'all'
    ? allExpenses
    : allExpenses?.filter(e => e.property_id === selectedPropertyId);

  // Get unit IDs for filtering invoices
  const unitIds = units?.map(u => u.id) || [];
  const invoices = selectedPropertyId === 'all'
    ? allInvoices
    : allInvoices?.filter(inv => unitIds.includes(inv.unit_id));

  const selectedProperty = properties?.find(p => p.id === selectedPropertyId);

  // Filter invoices by selected period
  const periodInvoices = invoices?.filter(inv => {
    if (reportPeriod === 'yearly') {
      return inv.year === selectedYear;
    }
    return inv.year === selectedYear && inv.month === selectedMonth;
  }) || [];

  // Filter expenses by selected period
  const periodExpenses = expenses?.filter(exp => {
    if (reportPeriod === 'yearly') {
      return exp.year === selectedYear;
    }
    return exp.year === selectedYear && exp.month === selectedMonth;
  }) || [];

  // Vacancy rate
  const totalUnits = units?.length || 0;
  const vacantUnits = units?.filter(u => u.status === 'leerstand').length || 0;
  const vacancyRate = totalUnits > 0 ? (vacantUnits / totalUnits) * 100 : 0;

  // Revenue from invoices for selected period
  const periodRevenue = periodInvoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0);
  
  // Annual revenue (always for selected year)
  const yearInvoices = invoices?.filter(inv => inv.year === selectedYear) || [];
  const annualRevenue = yearInvoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0);

  // Calculate input VAT from expenses (Vorsteuer)
  const vorsteuerFromExpenses = periodExpenses.reduce((sum, exp) => {
    // Assume 20% VAT on expenses for simplicity
    const betrag = Number(exp.betrag || 0);
    return sum + (betrag - betrag / 1.2);
  }, 0);

  // Simple yield calculation based on property value or total qm
  const totalQm = selectedPropertyId === 'all'
    ? properties?.reduce((sum, p) => sum + Number(p.total_qm || 0), 0) || 0
    : Number(selectedProperty?.total_qm || 0);
  const estimatedPropertyValue = totalQm * 3000; // €3000 per m² estimate
  const annualYield = estimatedPropertyValue > 0 ? (annualRevenue / estimatedPropertyValue) * 100 : 0;

  // Calculate gross totals per category from invoices
  const totalGrundmiete = periodInvoices.reduce((sum, inv) => sum + Number(inv.grundmiete || 0), 0);
  const totalBetriebskosten = periodInvoices.reduce((sum, inv) => sum + Number(inv.betriebskosten || 0), 0);
  const totalHeizungskosten = periodInvoices.reduce((sum, inv) => sum + Number(inv.heizungskosten || 0), 0);
  const totalGesamtbetrag = periodInvoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0);

  // Calculate Netto totals using helper function
  const nettoMieteTotal = periodInvoices.reduce((sum, inv) => 
    sum + calculateNetFromGross(Number(inv.grundmiete || 0), Number(inv.ust_satz_miete || 0)), 0);
  const nettoBkTotal = periodInvoices.reduce((sum, inv) => 
    sum + calculateNetFromGross(Number(inv.betriebskosten || 0), Number(inv.ust_satz_bk || 10)), 0);
  const nettoHkTotal = periodInvoices.reduce((sum, inv) => 
    sum + calculateNetFromGross(Number(inv.heizungskosten || 0), Number(inv.ust_satz_heizung || 20)), 0);
  const totalNetto = nettoMieteTotal + nettoBkTotal + nettoHkTotal;

  // Calculate USt breakdown from gross amounts using helper function
  const ustMiete = periodInvoices.reduce((sum, inv) => 
    sum + calculateVatFromGross(Number(inv.grundmiete || 0), Number(inv.ust_satz_miete || 0)), 0);
  const ustBk = periodInvoices.reduce((sum, inv) => 
    sum + calculateVatFromGross(Number(inv.betriebskosten || 0), Number(inv.ust_satz_bk || 10)), 0);
  const ustHeizung = periodInvoices.reduce((sum, inv) => 
    sum + calculateVatFromGross(Number(inv.heizungskosten || 0), Number(inv.ust_satz_heizung || 20)), 0);
  const totalUst = ustMiete + ustBk + ustHeizung;

  // VAT liability: USt (was ans Finanzamt geht) - Vorsteuer (was abgezogen werden kann)
  const vatLiability = totalUst - vorsteuerFromExpenses;

  // Period label for display
  const periodLabel = reportPeriod === 'yearly' 
    ? `Jahr ${selectedYear}` 
    : `${monthNames[selectedMonth - 1]} ${selectedYear}`;

  // Report generation handler
  const handleGenerateReport = (reportId: string) => {
    if (!properties || !allUnits || !allTenants || !allInvoices || !allExpenses) {
      toast.error('Daten werden noch geladen...');
      return;
    }

    try {
      switch (reportId) {
        case 'rendite':
          generateRenditeReport(
            properties,
            allUnits,
            allInvoices,
            selectedPropertyId,
            selectedYear,
            reportPeriod,
            selectedMonth
          );
          toast.success('Renditereport wurde erstellt');
          break;
        case 'leerstand':
          generateLeerstandReport(
            properties,
            allUnits,
            allTenants,
            selectedPropertyId,
            selectedYear
          );
          toast.success('Leerstandsreport wurde erstellt');
          break;
        case 'umsatz':
          generateUmsatzReport(
            properties,
            allUnits,
            allTenants,
            allInvoices,
            selectedPropertyId,
            selectedYear,
            reportPeriod,
            selectedMonth
          );
          toast.success('Umsatzreport wurde erstellt');
          break;
        case 'ust':
          generateUstVoranmeldung(
            properties,
            allUnits,
            allTenants,
            allInvoices,
            allExpenses,
            selectedPropertyId,
            selectedYear,
            reportPeriod,
            selectedMonth
          );
          toast.success('USt-Voranmeldung wurde erstellt');
          break;
        default:
          toast.error('Report nicht gefunden');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Fehler beim Erstellen des Reports');
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Reports & Auswertungen" subtitle="Analysen und Berichte für Ihre Immobilien">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Reports & Auswertungen" subtitle="Analysen und Berichte für Ihre Immobilien">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Property Filter */}
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Liegenschaft wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Liegenschaften</SelectItem>
              {properties?.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Period Toggle */}
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Tabs value={reportPeriod} onValueChange={(v) => setReportPeriod(v as 'monthly' | 'yearly')}>
            <TabsList>
              <TabsTrigger value="monthly">Monatlich</TabsTrigger>
              <TabsTrigger value="yearly">Jährlich</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Year Selection */}
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month Selection (only visible if monthly) */}
        {reportPeriod === 'monthly' && (
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((month, index) => (
                <SelectItem key={index + 1} value={(index + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selectedPropertyId !== 'all' && selectedProperty && (
          <span className="text-sm text-muted-foreground">
            {Number(selectedProperty.total_qm).toLocaleString('de-AT')} m² • {units?.length || 0} Einheiten
          </span>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jahresrendite (geschätzt)</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {annualYield.toFixed(1)}%
                </p>
              </div>
              <div className="flex items-center gap-1 text-success text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {totalQm.toLocaleString('de-AT')} m²
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leerstandsquote</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {vacancyRate.toFixed(1)}%
                </p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${vacancyRate > 10 ? 'text-destructive' : 'text-success'}`}>
                {vacancyRate > 10 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                {vacantUnits} von {totalUnits}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Umsatz {periodLabel}</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  €{periodRevenue.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex items-center gap-1 text-success text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {periodInvoices.length} Vorschreibungen
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">USt-Zahllast</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  €{vatLiability.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">{periodLabel}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Cards */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Verfügbare Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-card-hover transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div className="flex items-start gap-4">
                <div className={`rounded-lg p-2.5 ${report.color}`}>
                  <report.icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="mt-1">{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" onClick={() => handleGenerateReport(report.id)}>
                  <Download className="h-4 w-4 mr-2" />
                  Generieren
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* USt Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>USt-Voranmeldung {periodLabel}</CardTitle>
              <CardDescription>
                Basierend auf {periodInvoices.length} Vorschreibungen
                {selectedPropertyId !== 'all' && selectedProperty && ` für ${selectedProperty.name}`}
              </CardDescription>
            </div>
            <Button onClick={() => handleGenerateReport('ust')}>
              <Download className="h-4 w-4 mr-2" />
              PDF Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Einnahmen aus Vorschreibungen - Netto und Brutto */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">Einnahmen aus Vorschreibungen</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Grundmiete</p>
                <p className="text-lg font-bold text-foreground">
                  €{totalGrundmiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>Netto: €{nettoMieteTotal.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                  <p>USt: €{ustMiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Betriebskosten</p>
                <p className="text-lg font-bold text-foreground">
                  €{totalBetriebskosten.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>Netto: €{nettoBkTotal.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                  <p>USt: €{ustBk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Heizungskosten</p>
                <p className="text-lg font-bold text-foreground">
                  €{totalHeizungskosten.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>Netto: €{nettoHkTotal.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                  <p>USt: €{ustHeizung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Gesamt</p>
                <p className="text-lg font-bold text-primary">
                  €{totalGesamtbetrag.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <p>Netto: €{totalNetto.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                  <p>USt: €{totalUst.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* USt Berechnung */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Umsatzsteuer (aus Vorschreibungen)</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                €{totalUst.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <p>Miete: €{ustMiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                <p>Betriebskosten: €{ustBk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                <p>Heizung: €{ustHeizung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Vorsteuer (aus Ausgaben)</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                €{vorsteuerFromExpenses.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                <p>{periodExpenses.length} Ausgaben in {periodLabel}</p>
              </div>
            </div>
            <div className={`rounded-lg border p-4 ${vatLiability >= 0 ? 'border-success/30 bg-success/5' : 'border-primary/30 bg-primary/5'}`}>
              <p className="text-sm text-muted-foreground">
                {vatLiability >= 0 ? 'Zahllast' : 'Gutschrift'}
              </p>
              <p className={`text-2xl font-bold mt-2 ${vatLiability >= 0 ? 'text-success' : 'text-primary'}`}>
                €{Math.abs(vatLiability).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                {reportPeriod === 'monthly' && (
                  <p>Fällig bis: 15.{(selectedMonth + 1 > 12 ? 1 : selectedMonth + 1).toString().padStart(2, '0')}.{selectedMonth === 12 ? selectedYear + 1 : selectedYear}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detaillierte USt-Übersicht pro Rechnung */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-accent/10">
              <Receipt className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle>USt-Berechnung pro Rechnung</CardTitle>
              <CardDescription>
                Detaillierte Aufschlüsselung mit Netto- und Bruttobeträgen für {periodLabel}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {periodInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Vorschreibungen für {periodLabel} vorhanden.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Mieter / Einheit</TableHead>
                    <TableHead className="text-right">Typ</TableHead>
                    <TableHead className="text-right">Miete Netto</TableHead>
                    <TableHead className="text-right">USt Miete</TableHead>
                    <TableHead className="text-right">BK Netto</TableHead>
                    <TableHead className="text-right">USt BK</TableHead>
                    <TableHead className="text-right">HK Netto</TableHead>
                    <TableHead className="text-right">USt HK</TableHead>
                    <TableHead className="text-right font-semibold">Gesamt Netto</TableHead>
                    <TableHead className="text-right font-semibold">Gesamt USt</TableHead>
                    <TableHead className="text-right font-semibold">Gesamt Brutto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodInvoices.map((invoice) => {
                    const unit = allUnits?.find(u => u.id === invoice.unit_id);
                    const tenant = allTenants?.find(t => t.id === invoice.tenant_id);
                    const property = properties?.find(p => p.id === unit?.property_id);
                    
                    const grundmiete = Number(invoice.grundmiete || 0);
                    const betriebskosten = Number(invoice.betriebskosten || 0);
                    const heizungskosten = Number(invoice.heizungskosten || 0);
                    const ustSatzMiete = Number(invoice.ust_satz_miete || 0);
                    const ustSatzBk = Number(invoice.ust_satz_bk || 10);
                    const ustSatzHeizung = Number(invoice.ust_satz_heizung || 20);
                    
                    const nettoMiete = calculateNetFromGross(grundmiete, ustSatzMiete);
                    const nettoBk = calculateNetFromGross(betriebskosten, ustSatzBk);
                    const nettoHk = calculateNetFromGross(heizungskosten, ustSatzHeizung);
                    
                    const ustMieteRow = calculateVatFromGross(grundmiete, ustSatzMiete);
                    const ustBkRow = calculateVatFromGross(betriebskosten, ustSatzBk);
                    const ustHkRow = calculateVatFromGross(heizungskosten, ustSatzHeizung);
                    
                    const gesamtNetto = nettoMiete + nettoBk + nettoHk;
                    const gesamtUst = ustMieteRow + ustBkRow + ustHkRow;
                    const gesamtBrutto = grundmiete + betriebskosten + heizungskosten;
                    
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unbekannt'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {property?.name} - Top {unit?.top_nummer}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={unit?.type === 'wohnung' ? 'secondary' : 'default'}>
                            {unitTypeLabels[unit?.type || 'wohnung'] || unit?.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          €{nettoMiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          <span className="text-xs text-muted-foreground ml-1">({ustSatzMiete}%)</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          €{ustMieteRow.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          €{nettoBk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          <span className="text-xs text-muted-foreground ml-1">({ustSatzBk}%)</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          €{ustBkRow.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          €{nettoHk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          <span className="text-xs text-muted-foreground ml-1">({ustSatzHeizung}%)</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          €{ustHkRow.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{gesamtNetto.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          €{gesamtUst.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          €{gesamtBrutto.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Summenzeile */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={2}>Summe</TableCell>
                    <TableCell className="text-right">
                      €{nettoMieteTotal.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      €{ustMiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      €{nettoBkTotal.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      €{ustBk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      €{nettoHkTotal.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      €{ustHeizung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      €{totalNetto.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      €{totalUst.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      €{totalGesamtbetrag.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}