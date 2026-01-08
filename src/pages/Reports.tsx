import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
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
  Plus,
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
import { allocatePayment, type InvoiceAmounts } from '@/lib/paymentAllocation';
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
  const [isGeneratingInvoices, setIsGeneratingInvoices] = useState(false);
  
  const queryClient = useQueryClient();
  
  const { data: properties, isLoading: isLoadingProperties } = useProperties();
  const { data: allUnits, isLoading: isLoadingUnits } = useUnits();
  const { data: allTenants, isLoading: isLoadingTenants } = useTenants();
  const { data: allInvoices, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useInvoices();
  const { data: allExpenses, isLoading: isLoadingExpenses } = useExpenses();
  const { data: allPayments, isLoading: isLoadingPayments } = usePayments();
  const { data: allTransactions, isLoading: isLoadingTransactions } = useTransactions();
  const { data: categories, isLoading: isLoadingCategories } = useAccountCategories();
  const { syncExistingPaymentsToTransactions } = usePaymentSync();

  const isLoading = isLoadingProperties || isLoadingUnits || isLoadingTenants || isLoadingInvoices || isLoadingExpenses || isLoadingPayments || isLoadingTransactions || isLoadingCategories;

  // Generate monthly invoices for the selected period
  const handleGenerateInvoices = useCallback(async () => {
    setIsGeneratingInvoices(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Bitte melden Sie sich an');
        return;
      }

      const response = await supabase.functions.invoke('generate-monthly-invoices', {
        body: { year: selectedYear, month: selectedMonth }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      if (result.created > 0) {
        toast.success(`${result.created} Vorschreibung(en) für ${monthNames[selectedMonth - 1]} ${selectedYear} erstellt`);
      } else if (result.skipped > 0) {
        toast.info(`Alle ${result.skipped} Mieter haben bereits Vorschreibungen für ${monthNames[selectedMonth - 1]} ${selectedYear}`);
      } else {
        toast.warning('Keine aktiven Mieter gefunden');
      }
      
      // Refresh invoices data
      await refetchInvoices();
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error) {
      console.error('Error generating invoices:', error);
      toast.error(`Fehler beim Erstellen der Vorschreibungen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsGeneratingInvoices(false);
    }
  }, [selectedYear, selectedMonth, refetchInvoices, queryClient]);

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

  // Kategorie-IDs ermitteln
  const mieteinnahmenCategoryId = categories?.find(c => c.name === 'Mieteinnahmen')?.id;
  const bkVorauszCategoryId = categories?.find(c => c.name === 'Betriebskostenvorauszahlungen')?.id;
  const instandhaltungCategoryIds = categories
    ?.filter(c => INSTANDHALTUNG_CATEGORIES.includes(c.name))
    .map(c => c.id) || [];
  const betriebskostenCategoryIds = categories
    ?.filter(c => BETRIEBSKOSTEN_CATEGORIES.includes(c.name))
    .map(c => c.id) || [];

  // ====== IST-EINNAHMEN AUS PAYMENTS-TABELLE (NUR MIETE-ANTEIL) ======
  // Zahlungsaufteilung: BK → Heizung → Miete
  // Für die Buchhaltungsübersicht zeigen wir nur den Miete-Anteil
  
  const paymentAllocationDetails = useMemo(() => {
    let totalMieteAnteil = 0;
    let totalBkAnteil = 0;
    let totalHkAnteil = 0;
    let totalGesamt = 0;
    
    periodPayments.forEach(p => {
      // Finde den Mieter für diese Zahlung
      const tenant = allTenants?.find(t => t.id === p.tenant_id);
      if (!tenant) {
        // Wenn kein Mieter gefunden, zähle alles als Miete
        totalMieteAnteil += Number(p.betrag);
        totalGesamt += Number(p.betrag);
        return;
      }
      
      // Erstelle die Invoice-Beträge aus Mieterdaten
      const invoiceAmounts: InvoiceAmounts = {
        grundmiete: Number(tenant.grundmiete || 0),
        betriebskosten: Number(tenant.betriebskosten_vorschuss || 0),
        heizungskosten: Number(tenant.heizungskosten_vorschuss || 0),
        gesamtbetrag: Number(tenant.grundmiete || 0) + 
                      Number(tenant.betriebskosten_vorschuss || 0) + 
                      Number(tenant.heizungskosten_vorschuss || 0)
      };
      
      // Berechne die Zuordnung (BK → Heizung → Miete)
      const allocation = allocatePayment(Number(p.betrag), invoiceAmounts, false);
      
      totalBkAnteil += allocation.allocation.betriebskosten_anteil;
      totalHkAnteil += allocation.allocation.heizung_anteil;
      totalMieteAnteil += allocation.allocation.miete_anteil;
      totalGesamt += Number(p.betrag);
    });
    
    return {
      mieteAnteil: totalMieteAnteil,
      bkAnteil: totalBkAnteil,
      hkAnteil: totalHkAnteil,
      gesamt: totalGesamt
    };
  }, [periodPayments, allTenants]);
  
  // IST-Einnahmen = NUR Miete-Anteil (ohne BK und Heizung)
  const totalIstEinnahmenMiete = paymentAllocationDetails.mieteAnteil;
  const totalIstEinnahmenGesamt = paymentAllocationDetails.gesamt;
  
  // Für Abwärtskompatibilität
  const totalIstEinnahmen = totalIstEinnahmenMiete;
  const totalPaymentsAmount = totalIstEinnahmenGesamt;
  
  // Aufschlüsselung nach Mieter/Unit (für spätere Zuordnung)
  const paymentsByTenant = new Map<string, number>();
  periodPayments.forEach(p => {
    const current = paymentsByTenant.get(p.tenant_id) || 0;
    paymentsByTenant.set(p.tenant_id, current + Number(p.betrag));
  });

  // ====== AUSGABEN AUS TRANSAKTIONEN (negative Beträge) ======
  const incomeTransactions = periodTransactions.filter(t => t.amount > 0);
  const expenseTransactions = periodTransactions.filter(t => t.amount < 0);

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

  // ====== RENDITE-BERECHNUNG (IST-Basis) ======
  // Nettoertrag = IST-Mieteinnahmen - Instandhaltungskosten
  const nettoertrag = totalIstEinnahmen - instandhaltungskostenFromTransactions;
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
  
  // ====== SOLL-VERSTEUERUNG: USt BASIERT AUF SOLL-WERTEN AUS MIETERN ======
  // Bei Soll-Versteuerung entsteht die USt-Schuld mit Rechnungsstellung,
  // basierend auf den monatlichen SOLL-Werten der aktiven Mieter
  
  // Berechne SOLL-Werte aus aktiven Mietern für den Zeitraum
  const activeTenants = allTenants?.filter(t => t.status === 'aktiv') || [];
  const relevantTenants = selectedPropertyId === 'all' 
    ? activeTenants 
    : activeTenants.filter(t => {
        const unit = allUnits?.find(u => u.id === t.unit_id);
        return unit?.property_id === selectedPropertyId;
      });
  
  // Monatliche SOLL-Summen aus Mieterdaten
  const sollGrundmiete = relevantTenants.reduce((sum, t) => sum + Number(t.grundmiete || 0), 0);
  const sollBk = relevantTenants.reduce((sum, t) => sum + Number(t.betriebskosten_vorschuss || 0), 0);
  const sollHk = relevantTenants.reduce((sum, t) => sum + Number(t.heizungskosten_vorschuss || 0), 0);
  
  // Bei jährlicher Ansicht: x12 Monate
  const monthMultiplier = reportPeriod === 'yearly' ? 12 : 1;
  const periodSollGrundmiete = sollGrundmiete * monthMultiplier;
  const periodSollBk = sollBk * monthMultiplier;
  const periodSollHk = sollHk * monthMultiplier;
  const periodSollGesamt = periodSollGrundmiete + periodSollBk + periodSollHk;
  
  // USt aus SOLL-Werten berechnen (nach Einheitstyp)
  const ustFromSollMiete = relevantTenants.reduce((sum, t) => {
    const betrag = Number(t.grundmiete || 0) * monthMultiplier;
    const vatRate = getVatRateForUnit(t.unit_id, 'miete');
    return sum + calculateVatFromGross(betrag, vatRate);
  }, 0);
  
  const ustFromSollBk = relevantTenants.reduce((sum, t) => {
    const betrag = Number(t.betriebskosten_vorschuss || 0) * monthMultiplier;
    const vatRate = getVatRateForUnit(t.unit_id, 'bk');
    return sum + calculateVatFromGross(betrag, vatRate);
  }, 0);
  
  const ustFromSollHk = relevantTenants.reduce((sum, t) => {
    const betrag = Number(t.heizungskosten_vorschuss || 0) * monthMultiplier;
    return sum + calculateVatFromGross(betrag, 20); // Heizung immer 20%
  }, 0);
  
  // Gesamte USt aus SOLL-Einnahmen
  const totalUstEinnahmen = ustFromSollMiete + ustFromSollBk + ustFromSollHk;
  
  // Vorsteuer aus Ausgaben (aus Transaktionen - diese haben die Kategorien)
  const vorsteuerFromTransactions = expenseTransactions.reduce((sum, t) => {
    const betrag = Math.abs(Number(t.amount));
    const categoryName = categories?.find(c => c.id === t.category_id)?.name || '';
    const vatRate = CATEGORY_VAT_RATES[categoryName] ?? 20; // Default 20% wenn Kategorie unbekannt
    return sum + calculateVatFromGross(betrag, vatRate);
  }, 0);

  // USt-Zahllast = USt aus Vorschreibungen - Vorsteuer aus Ausgaben
  const vatLiabilityFromTransactions = totalUstEinnahmen - vorsteuerFromTransactions;
  
  // Brutto-Beträge für Anzeige - aus SOLL-Werten der Mieter
  const bruttoGrundmiete = periodSollGrundmiete;
  const bruttoBk = periodSollBk;
  const bruttoHeizung = periodSollHk;
  
  // USt-Beträge für Anzeige - aus SOLL-Werten
  const ustGrundmieteDisplay = ustFromSollMiete;
  const ustBkDisplay = ustFromSollBk;
  const ustHeizungDisplay = ustFromSollHk;
  
  // Heizung-Kategorie für Offene Posten (falls vorhanden)
  const heizungCategoryId = categories?.find(c => c.name === 'Heizung' && c.type === 'income')?.id || 
                            categories?.find(c => c.name === 'Heizungskostenvorauszahlungen')?.id;

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
                <p className="text-sm text-muted-foreground">Mieteinnahmen {periodLabel} (IST)</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  €{totalIstEinnahmenMiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  nur Miete (ohne BK/Heizung)
                </p>
              </div>
              <div className="flex items-center gap-1 text-success text-sm">
                <ArrowUpRight className="h-4 w-4" />
                {periodPayments.length} Zahlungen
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

      {/* Einnahmen/Ausgaben Übersicht */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Buchhaltungsübersicht {periodLabel}</CardTitle>
          <CardDescription>
            IST-Einnahmen aus {periodPayments.length} Mietzahlungen • Ausgaben aus {expenseTransactions.length} Buchungen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Einnahmen (IST aus payments - aufgeschlüsselt) */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-success flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Einnahmen (IST) - Zahlungszuordnung
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 rounded-lg border border-success/20 bg-success/5">
                  <div>
                    <span className="text-sm font-medium">Miete (Netto-Ertrag)</span>
                    <p className="text-xs text-muted-foreground">Eigentumsrelevant</p>
                  </div>
                  <span className="font-semibold text-success">
                    €{paymentAllocationDetails.mieteAnteil.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-muted bg-muted/30">
                  <div>
                    <span className="text-sm">Betriebskosten</span>
                    <p className="text-xs text-muted-foreground">Durchlaufposten</p>
                  </div>
                  <span className="font-semibold text-muted-foreground">
                    €{paymentAllocationDetails.bkAnteil.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-muted bg-muted/30">
                  <div>
                    <span className="text-sm">Heizung</span>
                    <p className="text-xs text-muted-foreground">Durchlaufposten</p>
                  </div>
                  <span className="font-semibold text-muted-foreground">
                    €{paymentAllocationDetails.hkAnteil.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-border bg-muted/50">
                  <span className="text-sm">Gesamt eingegangen</span>
                  <span className="font-semibold">
                    €{paymentAllocationDetails.gesamt.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border-2 border-success bg-success/10">
                  <span className="font-semibold">IST-Mieteinnahmen</span>
                  <span className="font-bold text-success text-lg">
                    €{paymentAllocationDetails.mieteAnteil.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              {/* SOLL vs IST Vergleich - nur Miete */}
              <div className="mt-4 p-3 rounded-lg border border-border bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground mb-2">SOLL vs IST Vergleich (nur Miete)</p>
                <div className="flex justify-between text-sm">
                  <span>SOLL Miete:</span>
                  <span>€{periodSollGrundmiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>IST Miete:</span>
                  <span>€{paymentAllocationDetails.mieteAnteil.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className={`flex justify-between text-sm font-semibold mt-1 pt-1 border-t ${periodSollGrundmiete - paymentAllocationDetails.mieteAnteil > 0 ? 'text-destructive' : 'text-success'}`}>
                  <span>Differenz:</span>
                  <span>€{(periodSollGrundmiete - paymentAllocationDetails.mieteAnteil).toLocaleString('de-AT', { minimumFractionDigits: 2 })}</span>
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
                  IST-Einnahmen (€{totalIstEinnahmen.toLocaleString('de-AT', { minimumFractionDigits: 2 })}) 
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
                Einnahmen aus {relevantTenants.length} aktiven Mietern (SOLL), Vorsteuer aus {expenseTransactions.length} Ausgaben
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
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Einnahmen (Soll-Versteuerung - SOLL aus Mieterdaten)
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
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Gesamt SOLL-Einnahmen ({reportPeriod === 'yearly' ? '12 Monate' : 'Monat'}):</span>
                <span className="text-lg font-bold">€{periodSollGesamt.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            {periodInvoices.length === 0 && (
              <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Keine Vorschreibungen für {monthNames[selectedMonth - 1]} {selectedYear} gefunden
                    </p>
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                      Erstellen Sie monatliche Mietvorschreibungen basierend auf den aktiven Mietern.
                    </p>
                    <Button 
                      onClick={handleGenerateInvoices}
                      disabled={isGeneratingInvoices}
                      className="mt-3"
                      size="sm"
                    >
                      {isGeneratingInvoices ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generiere...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Vorschreibungen für {monthNames[selectedMonth - 1]} generieren
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
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
            // Zeige ALLE Einheiten mit IST-Zahlungen aus PAYMENTS-Tabelle
            const today = new Date();
            
            // Alle Zahlungen für das Jahr aus payments-Tabelle
            const yearPayments = (allPayments || []).filter(p => {
              const paymentDate = new Date(p.eingangs_datum);
              return paymentDate.getFullYear() === selectedYear;
            });

            // Filter invoices for selected year
            const yearInvoices = (invoices || []).filter(inv => 
              unitIds.includes(inv.unit_id) && inv.year === selectedYear
            );

            // Calculate balance per UNIT (not tenant)
            interface UnitBalance {
              unitId: string;
              unitNummer: string;
              unitType: string;
              propertyName: string;
              tenantName: string;
              sollBetrag: number; // aus SOLL (tenants) x Monate
              habenBetrag: number; // IST aus payments
              saldo: number;
              daysOverdue: number;
              isLeerstand: boolean;
            }

            const unitBalances: UnitBalance[] = [];
            
            // Wie viele Monate im Jahr?
            const monthsInYear = 12;

            // Alle relevanten Units durchgehen
            units?.forEach(unit => {
              const property = properties?.find(p => p.id === unit.property_id);
              
              // Aktiver Mieter für diese Unit
              const activeTenant = allTenants?.find(t => 
                t.unit_id === unit.id && t.status === 'aktiv'
              );
              
              // SOLL = Monatliche SOLL-Werte aus tenant x 12 Monate
              const sollMonatlich = activeTenant 
                ? Number(activeTenant.grundmiete || 0) + 
                  Number(activeTenant.betriebskosten_vorschuss || 0) + 
                  Number(activeTenant.heizungskosten_vorschuss || 0)
                : 0;
              const sollBetrag = sollMonatlich * monthsInYear;
              
              // HABEN = IST-Zahlungen aus payments für diesen Mieter
              const tenantPayments = activeTenant 
                ? yearPayments.filter(p => p.tenant_id === activeTenant.id)
                : [];
              const habenBetrag = tenantPayments.reduce((sum, p) => sum + Number(p.betrag || 0), 0);
              
              // SALDO = Soll - Haben
              const saldo = sollBetrag - habenBetrag;

              // Überfällige Tage berechnen basierend auf SOLL vs IST
              // Wenn Unterzahlung und mehr als 30 Tage seit Jahresbeginn
              const today = new Date();
              const daysSinceYearStart = Math.floor((today.getTime() - new Date(selectedYear, 0, 1).getTime()) / (1000 * 60 * 60 * 24));
              const daysOverdue = saldo > 0 && daysSinceYearStart > 30 ? Math.min(daysSinceYearStart - 30, 365) : 0;

              // Zeige alle Units (auch Leerstand mit 0-Werten wenn gewünscht)
              unitBalances.push({
                unitId: unit.id,
                unitNummer: unit.top_nummer || '-',
                unitType: unitTypeLabels[unit.type] || unit.type,
                propertyName: property?.name || '-',
                tenantName: activeTenant 
                  ? `${activeTenant.first_name} ${activeTenant.last_name}`
                  : 'Leerstand',
                sollBetrag,
                habenBetrag,
                saldo,
                daysOverdue,
                isLeerstand: unit.status === 'leerstand',
              });
            });

            // Sort: underpayments first, then by amount
            unitBalances.sort((a, b) => {
              if (a.saldo > 0 && b.saldo <= 0) return -1;
              if (a.saldo <= 0 && b.saldo > 0) return 1;
              return Math.abs(b.saldo) - Math.abs(a.saldo);
            });

            // Calculations
            const totalSoll = unitBalances.reduce((sum, t) => sum + t.sollBetrag, 0);
            const totalHaben = unitBalances.reduce((sum, t) => sum + t.habenBetrag, 0);
            const totalSaldo = unitBalances.reduce((sum, t) => sum + t.saldo, 0);
            const underpaidUnits = unitBalances.filter(t => t.saldo > 0);
            const overpaidUnits = unitBalances.filter(t => t.saldo < 0);
            const totalUnterzahlung = underpaidUnits.reduce((sum, t) => sum + t.saldo, 0);
            const totalUeberzahlung = Math.abs(overpaidUnits.reduce((sum, t) => sum + t.saldo, 0));

            if (unitBalances.length === 0) {
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
                    <p className="text-xs text-muted-foreground">Haben (IST-Zahlungen)</p>
                    <p className="text-lg font-bold text-foreground">
                      €{totalHaben.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs text-muted-foreground">Unterzahlungen</p>
                    <p className="text-lg font-bold text-destructive">
                      €{totalUnterzahlung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{underpaidUnits.length} Einheiten</p>
                  </div>
                  <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                    <p className="text-xs text-muted-foreground">Überzahlungen</p>
                    <p className="text-lg font-bold text-success">
                      €{totalUeberzahlung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">{overpaidUnits.length} Einheiten</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Einheit / Mieter</TableHead>
                        <TableHead>Typ</TableHead>
                        <TableHead className="text-right">Soll</TableHead>
                        <TableHead className="text-right">Haben (IST)</TableHead>
                        <TableHead>Überfällig</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unitBalances.slice(0, 15).map((ub) => {
                        let statusLabel = 'Ausgeglichen';
                        let statusVariant: 'default' | 'destructive' | 'secondary' | 'outline' = 'outline';
                        if (ub.isLeerstand) {
                          statusLabel = 'Leerstand';
                          statusVariant = 'secondary';
                        } else if (ub.saldo > 0) {
                          statusLabel = 'Unterzahlung';
                          statusVariant = 'destructive';
                        } else if (ub.saldo < 0) {
                          statusLabel = 'Überzahlung';
                          statusVariant = 'default';
                        }
                        
                        return (
                          <TableRow key={ub.unitId}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">Top {ub.unitNummer}</span>
                                <span className="text-xs text-muted-foreground">
                                  {ub.tenantName} • {ub.propertyName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {ub.unitType}
                            </TableCell>
                            <TableCell className="text-right">
                              €{ub.sollBetrag.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              €{ub.habenBetrag.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {ub.daysOverdue > 0 ? (
                                <span className="text-destructive font-medium">{ub.daysOverdue} Tage</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant}>{statusLabel}</Badge>
                            </TableCell>
                            <TableCell className={`text-right font-bold ${ub.saldo > 0 ? 'text-destructive' : ub.saldo < 0 ? 'text-success' : ''}`}>
                              €{ub.saldo.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {unitBalances.length > 15 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      ... und {unitBalances.length - 15} weitere Einheiten. PDF für vollständige Liste exportieren.
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

          {/* Mietvorschreibungen - Monatliche SOLL-Werte pro Mieter/Einheit */}
          {selectedReportId === 'mietvorschreibung' && (() => {
            // SOLL-Werte direkt aus tenants-Tabelle (aktive Mieter)
            // Gruppiere nach Liegenschaft
            const propertiesData = new Map<string, {
              property: typeof properties extends (infer P)[] ? P : never;
              tenantsSoll: Array<{
                tenant: typeof allTenants extends (infer T)[] ? T : never;
                unit: typeof allUnits extends (infer U)[] ? U : never;
                grundmiete: number;
                betriebskosten: number;
                heizungskosten: number;
                gesamt: number;
              }>;
              totalGrundmiete: number;
              totalBK: number;
              totalHK: number;
              totalGesamt: number;
            }>();

            // Initialisiere Properties
            properties?.forEach(prop => {
              propertiesData.set(prop.id, {
                property: prop as any,
                tenantsSoll: [],
                totalGrundmiete: 0,
                totalBK: 0,
                totalHK: 0,
                totalGesamt: 0,
              });
            });

            // Filtere nur relevante Units
            const relevantUnits = selectedPropertyId === 'all' 
              ? allUnits 
              : allUnits?.filter(u => u.property_id === selectedPropertyId);

            // Fülle SOLL-Daten aus Mietern
            relevantUnits?.forEach(unit => {
              const property = properties?.find(p => p.id === unit.property_id);
              if (!property) return;

              // Finde aktive Mieter für diese Unit
              const activeTenants = allTenants?.filter(t => 
                t.unit_id === unit.id && t.status === 'aktiv'
              ) || [];

              activeTenants.forEach(tenant => {
                const grundmiete = Number(tenant.grundmiete) || 0;
                const bk = Number(tenant.betriebskosten_vorschuss) || 0;
                const hk = Number(tenant.heizungskosten_vorschuss) || 0;
                const gesamt = grundmiete + bk + hk;

                if (gesamt > 0) {
                  const propData = propertiesData.get(property.id)!;
                  propData.tenantsSoll.push({
                    tenant: tenant as any,
                    unit: unit as any,
                    grundmiete,
                    betriebskosten: bk,
                    heizungskosten: hk,
                    gesamt,
                  });
                  propData.totalGrundmiete += grundmiete;
                  propData.totalBK += bk;
                  propData.totalHK += hk;
                  propData.totalGesamt += gesamt;
                }
              });

              // Für Leerstand zeigen wir die Einheit ohne Mieter-Soll
              if (activeTenants.length === 0 && unit.status === 'leerstand') {
                const propData = propertiesData.get(property.id)!;
                propData.tenantsSoll.push({
                  tenant: null as any,
                  unit: unit as any,
                  grundmiete: 0,
                  betriebskosten: 0,
                  heizungskosten: 0,
                  gesamt: 0,
                });
              }
            });

            // Gesamtsummen
            const totals = Array.from(propertiesData.values()).reduce((acc, p) => ({
              grundmiete: acc.grundmiete + p.totalGrundmiete,
              bk: acc.bk + p.totalBK,
              hk: acc.hk + p.totalHK,
              gesamt: acc.gesamt + p.totalGesamt,
            }), { grundmiete: 0, bk: 0, hk: 0, gesamt: 0 });

            return (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold">Mietvorschreibungen - Monatliche SOLL-Werte</h3>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedReportId(null)}>
                    Schließen
                  </Button>
                </div>

                {/* Gesamtübersicht */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Grundmiete (SOLL)</p>
                    <p className="text-lg font-bold text-foreground">
                      €{totals.grundmiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Betriebskosten (SOLL)</p>
                    <p className="text-lg font-bold text-foreground">
                      €{totals.bk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Heizung (SOLL)</p>
                    <p className="text-lg font-bold text-foreground">
                      €{totals.hk.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs text-muted-foreground">Gesamt (SOLL/Monat)</p>
                    <p className="text-lg font-bold text-primary">
                      €{totals.gesamt.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {Array.from(propertiesData.values())
                  .filter(p => p.tenantsSoll.length > 0)
                  .map((propData) => (
                  <div key={propData.property?.id} className="border rounded-lg overflow-hidden mb-4">
                    <div className="bg-muted p-4 flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-lg">{propData.property?.name}</h4>
                        <p className="text-sm text-muted-foreground">{propData.property?.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">SOLL: €{propData.totalGesamt.toLocaleString('de-AT', { minimumFractionDigits: 2 })}/Monat</p>
                        <p className="text-xs text-muted-foreground">
                          Miete: €{propData.totalGrundmiete.toLocaleString('de-AT')} | BK: €{propData.totalBK.toLocaleString('de-AT')} | HK: €{propData.totalHK.toLocaleString('de-AT')}
                        </p>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Einheit</TableHead>
                          <TableHead>Mieter</TableHead>
                          <TableHead className="text-right">Grundmiete</TableHead>
                          <TableHead className="text-right">BK</TableHead>
                          <TableHead className="text-right">Heizung</TableHead>
                          <TableHead className="text-right">Gesamt (SOLL)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {propData.tenantsSoll.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">Top {item.unit?.top_nummer || '-'}</span>
                                <span className="text-xs text-muted-foreground">
                                  {unitTypeLabels[item.unit?.type || ''] || item.unit?.type}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.tenant ? (
                                `${item.tenant.first_name} ${item.tenant.last_name}`
                              ) : (
                                <Badge variant="outline">Leerstand</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              €{item.grundmiete.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              €{item.betriebskosten.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">
                              €{item.heizungskosten.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              €{item.gesamt.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </>
            );
          })()}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
