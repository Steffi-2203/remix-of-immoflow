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
  AlertCircle,
} from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useInvoices } from '@/hooks/useInvoices';
import { useExpenses } from '@/hooks/useExpenses';
import { usePayments } from '@/hooks/usePayments';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccountCategories } from '@/hooks/useAccountCategories';
import { usePaymentSync } from '@/hooks/usePaymentSync';
import { toast } from 'sonner';
import {
  generateRenditeReport,
  generateLeerstandReport,
  generateUmsatzReport,
  generateUstVoranmeldung,
  generateOffenePostenReport,
  type PaymentData,
  type TransactionData,
  type CategoryData,
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

// Kategorien für Instandhaltung (mindern Rendite)
const INSTANDHALTUNG_CATEGORIES = ['Instandhaltung', 'Reparaturen'];

// Kategorien für Betriebskosten (werden auf Mieter umgelegt, mindern NICHT die Rendite)
const BETRIEBSKOSTEN_CATEGORIES = [
  'Versicherungen', 'Lift/Aufzug', 'Heizung', 'Wasser/Abwasser', 
  'Strom Allgemein', 'Müllabfuhr', 'Hausbetreuung/Reinigung', 
  'Gartenpflege', 'Schneeräumung', 'Grundsteuer', 'Verwaltungskosten'
];

// USt-Sätze pro Ausgabenkategorie (österreichische Regelung)
const CATEGORY_VAT_RATES: Record<string, number> = {
  // 20% Normalsteuersatz
  'Lift/Aufzug': 20,
  'Heizung': 20,
  'Strom Allgemein': 20,
  'Hausbetreuung/Reinigung': 20,
  'Gartenpflege': 20,
  'Schneeräumung': 20,
  'Verwaltungskosten': 20,
  'Instandhaltung': 20,
  'Reparaturen': 20,
  'Müllabfuhr': 20,
  'Sonstige Ausgaben': 20,
  
  // 10% ermäßigter Steuersatz
  'Wasser/Abwasser': 10,
  
  // 0% - Keine Vorsteuer
  'Versicherungen': 0,  // Versicherungssteuer ist keine Vorsteuer
  'Grundsteuer': 0,     // Keine USt auf Grundsteuer
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
  {
    id: 'offeneposten',
    title: 'Offene Posten Liste',
    description: 'Übersicht aller unbezahlten Rechnungen',
    icon: AlertCircle,
    color: 'bg-destructive/10 text-destructive',
  },
  {
    id: 'detailbericht',
    title: 'Detailbericht',
    description: 'Einnahmen & Ausgaben pro Einheit/Liegenschaft',
    icon: Building2,
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    id: 'mietvorschreibung',
    title: 'Mietvorschreibungen',
    description: 'Monatliche Miete, BK & HK pro Mieter',
    icon: Receipt,
    color: 'bg-purple-500/10 text-purple-600',
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
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  const { data: properties, isLoading: isLoadingProperties } = useProperties();
  const { data: allUnits, isLoading: isLoadingUnits } = useUnits();
  const { data: allTenants, isLoading: isLoadingTenants } = useTenants();
  const { data: allInvoices, isLoading: isLoadingInvoices } = useInvoices();
  const { data: allExpenses, isLoading: isLoadingExpenses } = useExpenses();
  const { data: allPayments, isLoading: isLoadingPayments } = usePayments();
  const { data: allTransactions, isLoading: isLoadingTransactions } = useTransactions();
  const { data: categories, isLoading: isLoadingCategories } = useAccountCategories();
  const { syncExistingPaymentsToTransactions } = usePaymentSync();

  const isLoading = isLoadingProperties || isLoadingUnits || isLoadingTenants || isLoadingInvoices || isLoadingExpenses || isLoadingPayments || isLoadingTransactions || isLoadingCategories;

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

  // ====== TRANSAKTIONEN FILTERN ======
  // Bei Property-Filter: auch Transaktionen einbeziehen die über unit_id zur Property gehören
  const periodTransactions = allTransactions?.filter(t => {
    const date = new Date(t.transaction_date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    // Property-Filter: direkt ODER über unit_id ODER alle wenn 'all' ausgewählt
    let propertyMatch = selectedPropertyId === 'all';
    if (!propertyMatch) {
      // Direkte Property-Zuordnung
      if (t.property_id === selectedPropertyId) {
        propertyMatch = true;
      }
      // Über Unit-Zuordnung
      else if (t.unit_id) {
        const unit = allUnits?.find(u => u.id === t.unit_id);
        propertyMatch = unit?.property_id === selectedPropertyId;
      }
    }
    
    if (reportPeriod === 'yearly') {
      return year === selectedYear && propertyMatch;
    }
    return year === selectedYear && month === selectedMonth && propertyMatch;
  }) || [];

  // ====== ZAHLUNGEN AUS PAYMENTS-TABELLE (für Vergleich) ======
  const periodPayments = allPayments?.filter(p => {
    const date = new Date(p.eingangs_datum);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    if (reportPeriod === 'yearly') {
      return year === selectedYear;
    }
    return year === selectedYear && month === selectedMonth;
  }) || [];
  
  const totalPaymentsAmount = periodPayments.reduce((sum, p) => sum + Number(p.betrag), 0);

  // Kategorie-IDs ermitteln
  const mieteinnahmenCategoryId = categories?.find(c => c.name === 'Mieteinnahmen')?.id;
  const bkVorauszCategoryId = categories?.find(c => c.name === 'Betriebskostenvorauszahlungen')?.id;
  const instandhaltungCategoryIds = categories
    ?.filter(c => INSTANDHALTUNG_CATEGORIES.includes(c.name))
    .map(c => c.id) || [];
  const betriebskostenCategoryIds = categories
    ?.filter(c => BETRIEBSKOSTEN_CATEGORIES.includes(c.name))
    .map(c => c.id) || [];

  // ====== EINNAHMEN AUS TRANSAKTIONEN ======
  const incomeTransactions = periodTransactions.filter(t => t.amount > 0);
  const expenseTransactions = periodTransactions.filter(t => t.amount < 0);

  // Mieteinnahmen aus Transaktionen
  const mieteinnahmenFromTransactions = incomeTransactions
    .filter(t => t.category_id === mieteinnahmenCategoryId)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // BK-Vorauszahlungen aus Transaktionen  
  const bkVorauszahlungenFromTransactions = incomeTransactions
    .filter(t => t.category_id === bkVorauszCategoryId)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Gesamteinnahmen aus Transaktionen
  const totalIncomeFromTransactions = incomeTransactions
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // ====== AUSGABEN AUS TRANSAKTIONEN ======
  // Instandhaltungskosten (mindern die Rendite)
  const instandhaltungskostenFromTransactions = expenseTransactions
    .filter(t => instandhaltungCategoryIds.includes(t.category_id || ''))
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  // Betriebskosten (werden umgelegt, mindern NICHT die Rendite)
  const betriebskostenFromTransactions = expenseTransactions
    .filter(t => betriebskostenCategoryIds.includes(t.category_id || ''))
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  // Gesamtausgaben aus Transaktionen
  const totalExpensesFromTransactions = expenseTransactions
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  // ====== RENDITE-BERECHNUNG (NUR AUF TRANSAKTIONEN BASIERT) ======
  // Nettoertrag = Mieteinnahmen - Instandhaltungskosten (NICHT Betriebskosten)
  const nettoertrag = mieteinnahmenFromTransactions - instandhaltungskostenFromTransactions;
  const annualNettoertrag = reportPeriod === 'monthly' ? nettoertrag * 12 : nettoertrag;

  // Vacancy rate
  const totalUnits = units?.length || 0;
  const vacantUnits = units?.filter(u => u.status === 'leerstand').length || 0;
  const vacancyRate = totalUnits > 0 ? (vacantUnits / totalUnits) * 100 : 0;

  // Property value estimation
  const totalQm = selectedPropertyId === 'all'
    ? properties?.reduce((sum, p) => sum + Number(p.total_qm || 0), 0) || 0
    : Number(selectedProperty?.total_qm || 0);
  const estimatedPropertyValue = totalQm * 3000; // €3000 per m² estimate
  
  // Rendite basierend auf Transaktionen
  const annualYieldFromTransactions = estimatedPropertyValue > 0 
    ? (annualNettoertrag / estimatedPropertyValue) * 100 
    : 0;

  // ====== UST BERECHNUNG - KOMBINIERT AUS TRANSAKTIONEN UND INVOICES ======
  // USt-Sätze nach Einheitstyp (österreichische Regelung):
  // - Wohnung: Miete 10%, BK 10%, Heizung 20%
  // - Geschäft/Stellplatz: Alles 20%
  // - Garage: Alles 20%
  
  // Hilfsfunktion: USt-Satz nach Einheitstyp ermitteln
  const getVatRateForUnit = (unitId: string | null | undefined, component: 'miete' | 'bk' | 'heizung'): number => {
    if (!unitId) return 20; // Default 20% wenn keine Unit
    const unit = allUnits?.find(u => u.id === unitId);
    if (!unit) return 20;
    
    const unitType = unit.type;
    
    // Geschäft, Stellplatz, Garage = alles 20%
    if (unitType === 'geschaeft' || unitType === 'stellplatz' || unitType === 'garage') {
      return 20;
    }
    
    // Wohnung, Lager, Sonstiges
    if (component === 'heizung') {
      return 20; // Heizung ist immer 20%
    }
    return 10; // Miete und BK für Wohnungen = 10%
  };
  
  // USt aus Invoices (wenn vorhanden)
  const ustGrundmieteFromInvoices = periodInvoices.reduce((sum, inv) => 
    sum + calculateVatFromGross(Number(inv.grundmiete || 0), Number(inv.ust_satz_miete || getVatRateForUnit(inv.unit_id, 'miete'))), 0);
  const ustBkFromInvoices = periodInvoices.reduce((sum, inv) => 
    sum + calculateVatFromGross(Number(inv.betriebskosten || 0), Number(inv.ust_satz_bk || getVatRateForUnit(inv.unit_id, 'bk'))), 0);
  const ustHeizungFromInvoices = periodInvoices.reduce((sum, inv) => 
    sum + calculateVatFromGross(Number(inv.heizungskosten || 0), Number(inv.ust_satz_heizung || getVatRateForUnit(inv.unit_id, 'heizung'))), 0);
  
  // USt aus TRANSAKTIONEN berechnen (für den Fall, dass keine Invoices existieren)
  // Mieteinnahmen-Transaktionen nach Einheitstyp aufschlüsseln
  const ustFromMieteinnahmenTransactions = incomeTransactions
    .filter(t => t.category_id === mieteinnahmenCategoryId)
    .reduce((sum, t) => {
      const betrag = Number(t.amount);
      const vatRate = getVatRateForUnit(t.unit_id, 'miete');
      return sum + calculateVatFromGross(betrag, vatRate);
    }, 0);
  
  // BK-Vorauszahlungen aus Transaktionen
  const ustFromBkTransactions = incomeTransactions
    .filter(t => t.category_id === bkVorauszCategoryId)
    .reduce((sum, t) => {
      const betrag = Number(t.amount);
      const vatRate = getVatRateForUnit(t.unit_id, 'bk');
      return sum + calculateVatFromGross(betrag, vatRate);
    }, 0);
  
  // Heizungskategorien suchen (falls vorhanden)
  const heizungCategoryId = categories?.find(c => c.name === 'Heizung' && c.type === 'income')?.id;
  const ustFromHeizungTransactions = incomeTransactions
    .filter(t => t.category_id === heizungCategoryId)
    .reduce((sum, t) => {
      const betrag = Number(t.amount);
      return sum + calculateVatFromGross(betrag, 20); // Heizung immer 20%
    }, 0);
  
  // Gesamte USt aus Einnahmen - PRIORISIERT Transaktionen, Fallback auf Invoices
  const hasTransactionData = mieteinnahmenFromTransactions > 0 || bkVorauszahlungenFromTransactions > 0;
  const hasInvoiceData = periodInvoices.length > 0;
  
  // Wenn wir Transaktionsdaten haben, verwenden wir diese primär
  // Wenn nicht, fallen wir auf Invoice-Daten zurück
  const totalUstEinnahmen = hasTransactionData 
    ? (ustFromMieteinnahmenTransactions + ustFromBkTransactions + ustFromHeizungTransactions)
    : (ustGrundmieteFromInvoices + ustBkFromInvoices + ustHeizungFromInvoices);
  
  // Vorsteuer aus Ausgaben (aus Transaktionen - diese haben die Kategorien)
  const vorsteuerFromTransactions = expenseTransactions.reduce((sum, t) => {
    const betrag = Math.abs(Number(t.amount));
    const categoryName = categories?.find(c => c.id === t.category_id)?.name || '';
    const vatRate = CATEGORY_VAT_RATES[categoryName] ?? 20; // Default 20% wenn Kategorie unbekannt
    return sum + calculateVatFromGross(betrag, vatRate);
  }, 0);

  // USt-Zahllast = USt aus Einnahmen - Vorsteuer aus Ausgaben
  const vatLiabilityFromTransactions = totalUstEinnahmen - vorsteuerFromTransactions;
  
  // Brutto-Beträge für Anzeige - priorisiere Transaktionen
  const bruttoGrundmiete = hasTransactionData 
    ? mieteinnahmenFromTransactions 
    : periodInvoices.reduce((sum, inv) => sum + Number(inv.grundmiete || 0), 0);
  const bruttoBk = hasTransactionData 
    ? bkVorauszahlungenFromTransactions 
    : periodInvoices.reduce((sum, inv) => sum + Number(inv.betriebskosten || 0), 0);
  const bruttoHeizung = hasTransactionData 
    ? incomeTransactions.filter(t => t.category_id === heizungCategoryId).reduce((s, t) => s + Number(t.amount), 0)
    : periodInvoices.reduce((sum, inv) => sum + Number(inv.heizungskosten || 0), 0);
  
  // USt-Beträge für Anzeige
  const ustGrundmieteDisplay = hasTransactionData ? ustFromMieteinnahmenTransactions : ustGrundmieteFromInvoices;
  const ustBkDisplay = hasTransactionData ? ustFromBkTransactions : ustBkFromInvoices;
  const ustHeizungDisplay = hasTransactionData ? ustFromHeizungTransactions : ustHeizungFromInvoices;

  // ====== FALLBACK: AUCH ALTE DATEN AUS INVOICES ANZEIGEN ======
  // Revenue from invoices for selected period (als Vergleich)
  const periodRevenueFromInvoices = periodInvoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0);
  
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

  // Vorsteuer from expenses (differenziert nach Kategorie)
  const expenseTypeToCategory: Record<string, string> = {
    'versicherung': 'Versicherungen',
    'grundsteuer': 'Grundsteuer',
    'muellabfuhr': 'Müllabfuhr',
    'wasser_abwasser': 'Wasser/Abwasser',
    'heizung': 'Heizung',
    'strom_allgemein': 'Strom Allgemein',
    'hausbetreuung': 'Hausbetreuung/Reinigung',
    'lift': 'Lift/Aufzug',
    'gartenpflege': 'Gartenpflege',
    'schneeraeumung': 'Schneeräumung',
    'verwaltung': 'Verwaltungskosten',
    'ruecklage': 'Sonstige Ausgaben',
    'reparatur': 'Reparaturen',
    'sanierung': 'Instandhaltung',
    'sonstiges': 'Sonstige Ausgaben',
  };
  
  const vorsteuerFromExpenses = periodExpenses.reduce((sum, exp) => {
    const betrag = Number(exp.betrag || 0);
    const categoryName = expenseTypeToCategory[exp.expense_type] || 'Sonstige Ausgaben';
    const vatRate = CATEGORY_VAT_RATES[categoryName] ?? 20;
    return sum + calculateVatFromGross(betrag, vatRate);
  }, 0);

  // VAT liability from invoices (alt)
  const vatLiability = totalUst - vorsteuerFromExpenses;

  // Period label for display
  const periodLabel = reportPeriod === 'yearly' 
    ? `Jahr ${selectedYear}` 
    : `${monthNames[selectedMonth - 1]} ${selectedYear}`;

  // Report generation handler
  const handleGenerateReport = (reportId: string) => {
    if (!properties || !allUnits || !allTenants || !allInvoices || !allExpenses || !allPayments) {
      toast.error('Daten werden noch geladen...');
      return;
    }

    console.log('Generating report:', reportId);

    try {
      // Prepare transaction data for PDF export
      const transactionData: TransactionData[] = (allTransactions || []).map(t => ({
        id: t.id,
        amount: t.amount,
        transaction_date: t.transaction_date,
        category_id: t.category_id,
        property_id: t.property_id,
        unit_id: t.unit_id,
        description: t.description,
      }));

      const categoryData: CategoryData[] = (categories || []).map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }));

      console.log('Data prepared, calling generator...');

      switch (reportId) {
        case 'rendite':
          console.log('Generating Rendite report...');
          generateRenditeReport(
            properties,
            allUnits,
            allInvoices,
            transactionData,
            categoryData,
            selectedPropertyId,
            selectedYear,
            reportPeriod,
            selectedMonth
          );
          toast.success('Renditereport wurde erstellt');
          break;
        case 'leerstand':
          console.log('Generating Leerstand report...');
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
          console.log('Generating Umsatz report...');
          generateUmsatzReport(
            properties,
            allUnits,
            allTenants,
            allInvoices,
            allPayments as PaymentData[],
            transactionData,
            categoryData,
            selectedPropertyId,
            selectedYear,
            reportPeriod,
            selectedMonth
          );
          toast.success('Umsatzreport wurde erstellt');
          break;
        case 'ust':
          console.log('Generating USt report...');
          generateUstVoranmeldung(
            properties,
            allUnits,
            allTenants,
            allInvoices,
            allExpenses,
            transactionData,
            categoryData,
            selectedPropertyId,
            selectedYear,
            reportPeriod,
            selectedMonth
          );
          toast.success('USt-Voranmeldung wurde erstellt');
          break;
        case 'offeneposten':
          console.log('Generating Offene Posten report...');
          generateOffenePostenReport(
            properties,
            allUnits,
            allTenants,
            allInvoices as any,
            allPayments as PaymentData[],
            selectedPropertyId,
            selectedYear
          );
          toast.success('Offene Posten Liste wurde erstellt');
          break;
        default:
          toast.error('Report nicht gefunden');
      }
      console.log('Report generation completed.');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Fehler beim Erstellen des Reports: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
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

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => syncExistingPaymentsToTransactions.mutate()}
          disabled={syncExistingPaymentsToTransactions.isPending}
          className="ml-auto"
        >
          {syncExistingPaymentsToTransactions.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Mieteinnahmen synchronisieren
        </Button>
      </div>

      {/* Quick Stats - JETZT AUS TRANSAKTIONEN */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jahresrendite (Netto)</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {annualYieldFromTransactions.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Mieteinnahmen - Instandhaltung
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
                  €{totalIncomeFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  aus {incomeTransactions.length} Buchungen
                </p>
              </div>
              <div className="flex items-center gap-1 text-success text-sm">
                <ArrowUpRight className="h-4 w-4" />
                Buchhaltung
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">USt-Zahllast (Buchhaltung)</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  €{vatLiabilityFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">{periodLabel}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Einnahmen/Ausgaben aus Buchhaltung */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Buchhaltungsübersicht {periodLabel}</CardTitle>
          <CardDescription>
            Einnahmen und Ausgaben aus der Buchhaltung ({periodTransactions.length} Transaktionen)
            {periodPayments.length > 0 && ` • ${periodPayments.length} Mietzahlungen erfasst`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Einnahmen */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-success flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Einnahmen
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 rounded-lg border border-success/20 bg-success/5">
                  <span className="text-sm">Mieteinnahmen</span>
                  <span className="font-semibold text-success">
                    €{mieteinnahmenFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-success/20 bg-success/5">
                  <span className="text-sm">BK-Vorauszahlungen</span>
                  <span className="font-semibold text-success">
                    €{bkVorauszahlungenFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-success/20 bg-success/5">
                  <span className="text-sm">Sonstige Einnahmen</span>
                  <span className="font-semibold text-success">
                    €{(totalIncomeFromTransactions - mieteinnahmenFromTransactions - bkVorauszahlungenFromTransactions).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border-2 border-success bg-success/10">
                  <span className="font-semibold">Gesamt Einnahmen</span>
                  <span className="font-bold text-success text-lg">
                    €{totalIncomeFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Ausgaben */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4" />
                Ausgaben
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <div>
                    <span className="text-sm">Betriebskosten</span>
                    <p className="text-xs text-muted-foreground">Umlagefähig auf Mieter</p>
                  </div>
                  <span className="font-semibold text-destructive">
                    €{betriebskostenFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
                  <div>
                    <span className="text-sm">Instandhaltung</span>
                    <p className="text-xs text-muted-foreground">Mindert Rendite</p>
                  </div>
                  <span className="font-semibold text-orange-600">
                    €{instandhaltungskostenFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                  <span className="text-sm">Sonstige Ausgaben</span>
                  <span className="font-semibold text-destructive">
                    €{(totalExpensesFromTransactions - betriebskostenFromTransactions - instandhaltungskostenFromTransactions).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border-2 border-destructive bg-destructive/10">
                  <span className="font-semibold">Gesamt Ausgaben</span>
                  <span className="font-bold text-destructive text-lg">
                    €{totalExpensesFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Nettoertrag */}
          <div className="mt-6 p-4 rounded-lg border-2 border-primary bg-primary/5">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-semibold text-lg">Nettoertrag (für Rendite)</span>
                <p className="text-sm text-muted-foreground">
                  Mieteinnahmen (€{mieteinnahmenFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}) 
                  - Instandhaltung (€{instandhaltungskostenFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })})
                </p>
              </div>
              <span className="font-bold text-primary text-2xl">
                €{nettoertrag.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

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
                {/* PDF-fähige Berichte */}
                {['rendite', 'leerstand', 'umsatz', 'ust', 'offeneposten'].includes(report.id) && (
                  <Button size="sm" onClick={() => handleGenerateReport(report.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF Export
                  </Button>
                )}
                {/* Inline-Berichte (Detailbericht, Mietvorschreibungen) */}
                {['detailbericht', 'mietvorschreibung'].includes(report.id) && (
                  <Button size="sm" onClick={() => setSelectedReportId(report.id)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Anzeigen
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* USt Preview - KOMBINIERT AUS INVOICES UND TRANSAKTIONEN */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>USt-Voranmeldung {periodLabel}</CardTitle>
              <CardDescription>
                Einnahmen aus {periodInvoices.length} Mietrechnungen, Vorsteuer aus {expenseTransactions.length} Ausgaben
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
          {/* Einnahmen aus Buchhaltung */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Einnahmen ({hasTransactionData ? 'aus Transaktionen' : 'aus Mietrechnungen'})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Mieteinnahmen</p>
                <p className="text-lg font-bold text-foreground">
                  €{bruttoGrundmiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                  <p>USt: €{ustGrundmieteDisplay.toLocaleString('de-AT', { minimumFractionDigits: 2 })} (10-20%)</p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Betriebskosten</p>
                <p className="text-lg font-bold text-foreground">
                  €{bruttoBk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                  <p>USt: €{ustBkDisplay.toLocaleString('de-AT', { minimumFractionDigits: 2 })} (10-20%)</p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Heizung</p>
                <p className="text-lg font-bold text-foreground">
                  €{bruttoHeizung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                  <p>USt: €{ustHeizungDisplay.toLocaleString('de-AT', { minimumFractionDigits: 2 })} (20%)</p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Ausgaben (Vorsteuer)</p>
                <p className="text-lg font-bold text-foreground">
                  €{totalExpensesFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                  <p>Vorsteuer: €{vorsteuerFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className={`rounded-lg border p-3 ${vatLiabilityFromTransactions >= 0 ? 'border-success/30 bg-success/5' : 'border-primary/30 bg-primary/5'}`}>
                <p className="text-xs text-muted-foreground">
                  {vatLiabilityFromTransactions >= 0 ? 'Zahllast' : 'Gutschrift'}
                </p>
                <p className={`text-lg font-bold ${vatLiabilityFromTransactions >= 0 ? 'text-success' : 'text-primary'}`}>
                  €{Math.abs(vatLiabilityFromTransactions).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            {!hasTransactionData && !hasInvoiceData && (
              <p className="text-sm text-orange-600 mt-3">
                ⚠️ Keine Einnahmen für den ausgewählten Zeitraum gefunden. Erfassen Sie Mieteinnahmen in der Buchhaltung.
              </p>
            )}
          </div>

          {/* USt Berechnung */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Umsatzsteuer (aus Einnahmen)</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                €{totalUstEinnahmen.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <p>Mieteinnahmen: €{ustGrundmieteDisplay.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                <p>BK: €{ustBkDisplay.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                <p>Heizung (20%): €{ustHeizungDisplay.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-sm text-muted-foreground">Vorsteuer (aus Ausgaben)</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                €{vorsteuerFromTransactions.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                <p>{expenseTransactions.length} Ausgaben-Buchungen</p>
              </div>
            </div>
            <div className={`rounded-lg border p-4 ${vatLiabilityFromTransactions >= 0 ? 'border-success/30 bg-success/5' : 'border-primary/30 bg-primary/5'}`}>
              <p className="text-sm text-muted-foreground">
                {vatLiabilityFromTransactions >= 0 ? 'Zahllast' : 'Gutschrift'}
              </p>
              <p className={`text-2xl font-bold mt-2 ${vatLiabilityFromTransactions >= 0 ? 'text-success' : 'text-primary'}`}>
                €{Math.abs(vatLiabilityFromTransactions).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
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

      {/* Detaillierte Transaktionen */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-accent/10">
              <Receipt className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle>Transaktionen aus Buchhaltung</CardTitle>
              <CardDescription>
                {periodTransactions.length} Buchungen für {periodLabel}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {periodTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Buchungen für {periodLabel} vorhanden. 
              <br />
              <span className="text-sm">Erfassen Sie Einnahmen und Ausgaben in der Buchhaltung.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodTransactions.slice(0, 15).map((t) => {
                    const category = categories?.find(c => c.id === t.category_id);
                    const isIncome = t.amount > 0;
                    
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(t.transaction_date).toLocaleDateString('de-AT')}
                        </TableCell>
                        <TableCell>{t.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={isIncome ? 'secondary' : 'outline'}>
                            {category?.name || 'Nicht kategorisiert'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${isIncome ? 'text-success' : 'text-destructive'}`}>
                          {isIncome ? '+' : ''}{Number(t.amount).toLocaleString('de-AT', { minimumFractionDigits: 2 })} €
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {periodTransactions.length > 15 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  ... und {periodTransactions.length - 15} weitere Buchungen.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offene Posten Vorschau */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2.5 bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle>Offene Posten / Salden {selectedYear}</CardTitle>
                <CardDescription>
                  Mietrechnungen vs. Mieteinnahmen (aus Buchhaltung)
                  {selectedPropertyId !== 'all' && selectedProperty && ` für ${selectedProperty.name}`}
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => handleGenerateReport('offeneposten')}>
              <Download className="h-4 w-4 mr-2" />
              PDF Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            // Get relevant tenants based on selected units
            const relevantTenants = allTenants?.filter(t => unitIds.includes(t.unit_id)) || [];
            const tenantIds = relevantTenants.map(t => t.id);
            
            // Filter invoices for selected year
            const yearInvoices = (invoices || []).filter(inv => 
              unitIds.includes(inv.unit_id) && inv.year === selectedYear
            );

            // Filter payments for selected year
            const yearPayments = (allPayments || []).filter(p => {
              const paymentDate = new Date(p.eingangs_datum);
              return tenantIds.includes(p.tenant_id) && paymentDate.getFullYear() === selectedYear;
            });

            // Calculate balance per tenant
            interface TenantBalance {
              tenantId: string;
              tenantName: string;
              unitNummer: string;
              propertyName: string;
              sollBetrag: number;
              habenBetrag: number;
              saldo: number;
              daysOverdue: number;
            }

            const tenantBalances: TenantBalance[] = [];
            const today = new Date();

            // Alle Einnahmen-Kategorien die für Mieteinnahmen relevant sind (Miete, BK, Heizung)
            const allIncomeCategories = [
              mieteinnahmenCategoryId,
              bkVorauszCategoryId,
              heizungCategoryId
            ].filter(Boolean);
            
            // Alle Einnahmen aus Buchhaltung (transactions) für das Jahr
            const allIncomeTransactions = allTransactions?.filter(t => {
              const date = new Date(t.transaction_date);
              return date.getFullYear() === selectedYear && 
                     t.amount > 0 &&
                     (allIncomeCategories.includes(t.category_id || '') || 
                      t.tenant_id || 
                      t.unit_id); // Auch nicht-kategorisierte aber zugeordnete Transaktionen
            }) || [];

            relevantTenants.forEach(tenant => {
              const tenantInvoices = yearInvoices.filter(inv => inv.tenant_id === tenant.id);
              
              // Alle Zahlungen aus Buchhaltung die diesem Mieter oder dessen Unit zugeordnet sind
              const tenantZahlungen = allIncomeTransactions.filter(t => 
                t.tenant_id === tenant.id || t.unit_id === tenant.unit_id
              );
              
              // SOLL = Erwartete Einnahmen (Vorschreibungen)
              const sollBetrag = tenantInvoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0);
              
              // HABEN = Tatsächlich erhaltene Zahlungen aus Buchhaltung
              const habenBetrag = tenantZahlungen.reduce((sum, t) => sum + Number(t.amount || 0), 0);
              
              // SALDO = Soll - Haben (positiv = Unterzahlung, negativ = Überzahlung, 0 = ausgeglichen)
              const saldo = sollBetrag - habenBetrag;

              // Find oldest unpaid invoice
              const openInvoices = tenantInvoices.filter(inv => 
                inv.status === 'offen' || inv.status === 'teilbezahlt' || inv.status === 'ueberfaellig'
              );
              const oldestDueDate = openInvoices.length > 0 
                ? new Date(Math.min(...openInvoices.map(inv => new Date(inv.faellig_am).getTime())))
                : null;
              const daysOverdue = oldestDueDate && oldestDueDate < today 
                ? Math.floor((today.getTime() - oldestDueDate.getTime()) / (1000 * 60 * 60 * 24))
                : 0;

              const unit = allUnits?.find(u => u.id === tenant.unit_id);
              const property = properties?.find(p => p.id === unit?.property_id);

              // Only include if there's activity
              if (sollBetrag > 0 || habenBetrag > 0) {
                tenantBalances.push({
                  tenantId: tenant.id,
                  tenantName: `${tenant.first_name} ${tenant.last_name}`,
                  unitNummer: unit?.top_nummer || '-',
                  propertyName: property?.name || '-',
                  sollBetrag,
                  habenBetrag,
                  saldo,
                  daysOverdue,
                });
              }
            });

            // Sort: underpayments first, then by amount
            tenantBalances.sort((a, b) => {
              if (a.saldo > 0 && b.saldo <= 0) return -1;
              if (a.saldo <= 0 && b.saldo > 0) return 1;
              return Math.abs(b.saldo) - Math.abs(a.saldo);
            });

            // Calculations
            const totalSoll = tenantBalances.reduce((sum, t) => sum + t.sollBetrag, 0);
            const totalHaben = tenantBalances.reduce((sum, t) => sum + t.habenBetrag, 0);
            const totalSaldo = tenantBalances.reduce((sum, t) => sum + t.saldo, 0);
            const underpaidTenants = tenantBalances.filter(t => t.saldo > 0);
            const overpaidTenants = tenantBalances.filter(t => t.saldo < 0);
            const totalUnterzahlung = underpaidTenants.reduce((sum, t) => sum + t.saldo, 0);
            const totalUeberzahlung = Math.abs(overpaidTenants.reduce((sum, t) => sum + t.saldo, 0));

            if (tenantBalances.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Daten für {selectedYear} vorhanden.
                </div>
              );
            }

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Soll (Rechnungen)</p>
                    <p className="text-lg font-bold text-foreground">
                      €{totalSoll.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Haben (Zahlungen)</p>
                    <p className="text-lg font-bold text-foreground">
                      €{totalHaben.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs text-muted-foreground">Unterzahlungen</p>
                    <p className="text-lg font-bold text-destructive">
                      €{totalUnterzahlung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{underpaidTenants.length} Mieter</p>
                  </div>
                  <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                    <p className="text-xs text-muted-foreground">Überzahlungen</p>
                    <p className="text-lg font-bold text-success">
                      €{totalUeberzahlung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{overpaidTenants.length} Mieter</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Mieter / Einheit</TableHead>
                        <TableHead className="text-right">Soll</TableHead>
                        <TableHead className="text-right">Haben</TableHead>
                        <TableHead>Überfällig</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantBalances.slice(0, 10).map((tb) => {
                        let statusLabel = 'Ausgeglichen';
                        let statusVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'outline';
                        if (tb.saldo > 0) {
                          statusLabel = 'Unterzahlung';
                          statusVariant = 'destructive';
                        } else if (tb.saldo < 0) {
                          statusLabel = 'Überzahlung';
                          statusVariant = 'secondary';
                        }
                        
                        return (
                          <TableRow key={tb.tenantId}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{tb.tenantName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {tb.propertyName} - Top {tb.unitNummer}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              €{tb.sollBetrag.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              €{tb.habenBetrag.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {tb.daysOverdue > 0 ? (
                                <span className="text-destructive font-medium">{tb.daysOverdue} Tage</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant}>{statusLabel}</Badge>
                            </TableCell>
                            <TableCell className={`text-right font-bold ${tb.saldo > 0 ? 'text-destructive' : tb.saldo < 0 ? 'text-success' : ''}`}>
                              €{tb.saldo.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {tenantBalances.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      ... und {tenantBalances.length - 10} weitere Mieter. PDF für vollständige Liste exportieren.
                    </p>
                  )}
                </div>
              </>
            );
          })()}

          {/* Detailbericht - Einnahmen/Ausgaben pro Einheit */}
          {selectedReportId === 'detailbericht' && (() => {
            // Gruppiere Transaktionen nach Einheiten
            const unitTransactions = new Map<string, { 
              unit: typeof units extends (infer U)[] ? U : never;
              property: typeof properties extends (infer P)[] ? P : never;
              income: number; 
              expenses: number; 
              transactions: typeof periodTransactions;
              tenants: typeof allTenants;
            }>();

            // Initialisiere alle Einheiten
            units?.forEach(unit => {
              const property = properties?.find(p => p.id === unit.property_id);
              const unitTenants = allTenants?.filter(t => t.unit_id === unit.id) || [];
              unitTransactions.set(unit.id, {
                unit: unit as any,
                property: property as any,
                income: 0,
                expenses: 0,
                transactions: [],
                tenants: unitTenants as any,
              });
            });

            // Verteile Transaktionen
            periodTransactions.forEach(t => {
              if (t.unit_id && unitTransactions.has(t.unit_id)) {
                const data = unitTransactions.get(t.unit_id)!;
                if (t.amount > 0) {
                  data.income += Number(t.amount);
                } else {
                  data.expenses += Math.abs(Number(t.amount));
                }
                (data.transactions as any[]).push(t);
              }
            });

            // Nicht zugeordnete Transaktionen
            const unassignedTransactions = periodTransactions.filter(t => !t.unit_id);
            const unassignedIncome = unassignedTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + Number(t.amount), 0);
            const unassignedExpenses = unassignedTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

            // Gruppiere nach Liegenschaft
            const propertiesData = new Map<string, {
              property: typeof properties extends (infer P)[] ? P : never;
              units: Array<{
                unit: typeof units extends (infer U)[] ? U : never;
                income: number;
                expenses: number;
                tenants: typeof allTenants;
              }>;
              totalIncome: number;
              totalExpenses: number;
            }>();

            properties?.forEach(prop => {
              propertiesData.set(prop.id, {
                property: prop as any,
                units: [],
                totalIncome: 0,
                totalExpenses: 0,
              });
            });

            unitTransactions.forEach((data, unitId) => {
              if (data.property && propertiesData.has(data.property.id)) {
                const propData = propertiesData.get(data.property.id)!;
                propData.units.push({
                  unit: data.unit,
                  income: data.income,
                  expenses: data.expenses,
                  tenants: data.tenants,
                });
                propData.totalIncome += data.income;
                propData.totalExpenses += data.expenses;
              }
            });

            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold">Detailbericht - Einnahmen & Ausgaben pro Einheit</h3>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedReportId(null)}>
                    Schließen
                  </Button>
                </div>

                <div className="space-y-6">
                  {Array.from(propertiesData.values())
                    .filter(p => selectedPropertyId === 'all' || p.property?.id === selectedPropertyId)
                    .map((propData) => (
                    <div key={propData.property?.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted p-4 flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-lg">{propData.property?.name}</h4>
                          <p className="text-sm text-muted-foreground">{propData.property?.address}, {propData.property?.postal_code} {propData.property?.city}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-success font-semibold">+€{propData.totalIncome.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                          <p className="text-destructive font-semibold">-€{propData.totalExpenses.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Einheit</TableHead>
                            <TableHead>Mieter</TableHead>
                            <TableHead className="text-right">Einnahmen</TableHead>
                            <TableHead className="text-right">Ausgaben</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {propData.units.map((unitData) => {
                            const activeTenant = (unitData.tenants as any[])?.find((t: any) => t.status === 'aktiv');
                            const saldo = unitData.income - unitData.expenses;
                            return (
                              <TableRow key={unitData.unit?.id}>
                                <TableCell className="font-medium">Top {unitData.unit?.top_nummer}</TableCell>
                                <TableCell>
                                  {activeTenant ? `${activeTenant.first_name} ${activeTenant.last_name}` : <span className="text-muted-foreground">Leerstand</span>}
                                </TableCell>
                                <TableCell className="text-right text-success">
                                  €{unitData.income.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-right text-destructive">
                                  €{unitData.expenses.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className={`text-right font-bold ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  €{saldo.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ))}

                  {unassignedTransactions.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted p-4">
                        <h4 className="font-semibold">Nicht zugeordnete Buchungen</h4>
                        <p className="text-sm text-muted-foreground">{unassignedTransactions.length} Transaktionen ohne Einheitszuordnung</p>
                      </div>
                      <div className="p-4">
                        <div className="flex gap-8">
                          <div>
                            <p className="text-sm text-muted-foreground">Einnahmen</p>
                            <p className="text-success font-semibold">€{unassignedIncome.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Ausgaben</p>
                            <p className="text-destructive font-semibold">€{unassignedExpenses.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* Mietvorschreibungen - Monatliche Miete/BK/HK pro Mieter */}
          {selectedReportId === 'mietvorschreibung' && (() => {
            // Gruppiere Invoices nach Monat und Mieter
            const monthlyData = new Map<string, Array<{
              month: number;
              year: number;
              tenant: typeof allTenants extends (infer T)[] ? T : never;
              unit: typeof allUnits extends (infer U)[] ? U : never;
              property: typeof properties extends (infer P)[] ? P : never;
              grundmiete: number;
              betriebskosten: number;
              heizungskosten: number;
              gesamt: number;
              status: string;
            }>>();

            // Fülle die Daten
            periodInvoices.forEach(inv => {
              const tenant = allTenants?.find(t => t.id === inv.tenant_id);
              const unit = allUnits?.find(u => u.id === inv.unit_id);
              const property = unit ? properties?.find(p => p.id === unit.property_id) : null;
              
              const key = `${inv.year}-${inv.month}`;
              if (!monthlyData.has(key)) {
                monthlyData.set(key, []);
              }
              
              monthlyData.get(key)!.push({
                month: inv.month,
                year: inv.year,
                tenant: tenant as any,
                unit: unit as any,
                property: property as any,
                grundmiete: Number(inv.grundmiete) || 0,
                betriebskosten: Number(inv.betriebskosten) || 0,
                heizungskosten: Number(inv.heizungskosten) || 0,
                gesamt: Number(inv.gesamtbetrag) || 0,
                status: inv.status,
              });
            });

            // Sortiere nach Datum
            const sortedMonths = Array.from(monthlyData.entries())
              .sort((a, b) => {
                const [aYear, aMonth] = a[0].split('-').map(Number);
                const [bYear, bMonth] = b[0].split('-').map(Number);
                return bYear - aYear || bMonth - aMonth;
              });

            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">Mietvorschreibungen - Monatliche Übersicht</h3>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedReportId(null)}>
                    Schließen
                  </Button>
                </div>

                {sortedMonths.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Keine Mietvorschreibungen für den gewählten Zeitraum gefunden.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sortedMonths.map(([monthKey, invoices]) => {
                      const [year, month] = monthKey.split('-').map(Number);
                      const totals = invoices.reduce((acc, inv) => ({
                        grundmiete: acc.grundmiete + inv.grundmiete,
                        betriebskosten: acc.betriebskosten + inv.betriebskosten,
                        heizungskosten: acc.heizungskosten + inv.heizungskosten,
                        gesamt: acc.gesamt + inv.gesamt,
                      }), { grundmiete: 0, betriebskosten: 0, heizungskosten: 0, gesamt: 0 });

                      return (
                        <div key={monthKey} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted p-4 flex justify-between items-center">
                            <h4 className="font-semibold text-lg">{monthNames[month - 1]} {year}</h4>
                            <div className="text-right">
                              <p className="font-bold">Gesamt: €{totals.gesamt.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                              <p className="text-xs text-muted-foreground">
                                Miete: €{totals.grundmiete.toLocaleString('de-AT')} | BK: €{totals.betriebskosten.toLocaleString('de-AT')} | HK: €{totals.heizungskosten.toLocaleString('de-AT')}
                              </p>
                            </div>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Mieter</TableHead>
                                <TableHead>Einheit</TableHead>
                                <TableHead>Liegenschaft</TableHead>
                                <TableHead className="text-right">Grundmiete</TableHead>
                                <TableHead className="text-right">BK</TableHead>
                                <TableHead className="text-right">Heizung</TableHead>
                                <TableHead className="text-right">Gesamt</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoices.map((inv, idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">
                                    {inv.tenant ? `${inv.tenant.first_name} ${inv.tenant.last_name}` : 'Unbekannt'}
                                  </TableCell>
                                  <TableCell>Top {inv.unit?.top_nummer || '-'}</TableCell>
                                  <TableCell className="text-muted-foreground">{inv.property?.name || '-'}</TableCell>
                                  <TableCell className="text-right">€{inv.grundmiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right">€{inv.betriebskosten.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right">€{inv.heizungskosten.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-right font-bold">€{inv.gesamt.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      inv.status === 'bezahlt' ? 'default' :
                                      inv.status === 'ueberfaellig' ? 'destructive' :
                                      inv.status === 'teilbezahlt' ? 'secondary' : 'outline'
                                    }>
                                      {inv.status === 'bezahlt' ? 'Bezahlt' :
                                       inv.status === 'ueberfaellig' ? 'Überfällig' :
                                       inv.status === 'teilbezahlt' ? 'Teilbezahlt' : 'Offen'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
