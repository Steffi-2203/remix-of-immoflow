import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable: { finalY: number };
  }
}

interface PropertyData {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  total_qm: number;
  total_units: number;
}

interface UnitData {
  id: string;
  top_nummer: string;
  type: string;
  qm: number;
  mea: number;
  status: string;
  property_id: string;
}

interface TenantData {
  id: string;
  first_name: string;
  last_name: string;
  unit_id: string;
  grundmiete: number;
  betriebskosten_vorschuss: number;
  heizungskosten_vorschuss: number;
  status: string;
}

interface InvoiceData {
  id: string;
  tenant_id: string;
  unit_id: string;
  year: number;
  month: number;
  grundmiete: number;
  betriebskosten: number;
  heizungskosten: number;
  gesamtbetrag: number;
  ust: number;
  ust_satz_miete: number;
  ust_satz_bk: number;
  ust_satz_heizung: number;
}

interface ExpenseData {
  id: string;
  bezeichnung: string;
  betrag: number;
  category: string;
  expense_type: string;
  property_id: string;
  year: number;
  month: number;
}

export interface PaymentData {
  id: string;
  tenant_id: string;
  betrag: number;
  eingangs_datum: string;
  buchungs_datum: string;
  invoice_id?: string | null;
}

export interface TransactionData {
  id: string;
  amount: number;
  transaction_date: string;
  category_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  description: string | null;
}

export interface CategoryData {
  id: string;
  name: string;
  type: string;
}

// Kategorien für Instandhaltung (mindern Rendite)
const INSTANDHALTUNG_CATEGORIES = ['Instandhaltung', 'Reparaturen'];

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

const unitTypeLabels: Record<string, string> = {
  wohnung: 'Wohnung',
  geschaeft: 'Geschäft',
  garage: 'Garage',
  stellplatz: 'Stellplatz',
  lager: 'Lager',
  sonstiges: 'Sonstiges',
};

const monthNames = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Helper functions
const calculateNetFromGross = (gross: number, vatRate: number): number => {
  if (vatRate === 0) return gross;
  return gross / (1 + vatRate / 100);
};

const calculateVatFromGross = (gross: number, vatRate: number): number => {
  if (vatRate === 0) return 0;
  return gross - (gross / (1 + vatRate / 100));
};

const formatCurrency = (value: number): string => {
  return `€ ${value.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// PDF Helper
const addHeader = (doc: jsPDF, title: string, subtitle: string, propertyName?: string) => {
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 14, 28);
  
  if (propertyName) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Liegenschaft: ${propertyName}`, 14, 35);
    doc.setTextColor(0);
  }
  
  // Date
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-AT')}`, doc.internal.pageSize.width - 14, 20, { align: 'right' });
  doc.setTextColor(0);
};

// ====== RENDITE REPORT ======
export const generateRenditeReport = (
  properties: PropertyData[],
  units: UnitData[],
  invoices: InvoiceData[],
  transactions: TransactionData[],
  categories: CategoryData[],
  selectedPropertyId: string,
  selectedYear: number,
  reportPeriod: 'monthly' | 'yearly',
  selectedMonth?: number
) => {
  const doc = new jsPDF();
  const periodLabel = reportPeriod === 'yearly' 
    ? `Jahr ${selectedYear}` 
    : `${monthNames[(selectedMonth || 1) - 1]} ${selectedYear}`;
  
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  
  addHeader(
    doc, 
    'Renditereport', 
    periodLabel,
    selectedPropertyId !== 'all' ? selectedProperty?.name : 'Alle Liegenschaften'
  );

  // Filter properties
  const targetProperties = selectedPropertyId === 'all' ? properties : properties.filter(p => p.id === selectedPropertyId);

  // Get category IDs for income and maintenance
  const mieteinnahmenCategoryId = categories.find(c => c.name === 'Mieteinnahmen')?.id;
  const instandhaltungCategoryIds = categories
    .filter(c => INSTANDHALTUNG_CATEGORIES.includes(c.name))
    .map(c => c.id);
  
  // Calculate data per property
  const tableData = targetProperties.map(property => {
    const propertyUnits = units.filter(u => u.property_id === property.id);
    
    // Filter transactions for this property and period
    const propertyTransactions = transactions.filter(t => {
      const date = new Date(t.transaction_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const matchesProp = t.property_id === property.id;
      
      if (reportPeriod === 'yearly') {
        return matchesProp && year === selectedYear;
      }
      return matchesProp && year === selectedYear && month === selectedMonth;
    });

    // Calculate income from transactions
    const mieteinnahmen = propertyTransactions
      .filter(t => t.amount > 0 && t.category_id === mieteinnahmenCategoryId)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Calculate maintenance costs from transactions
    const instandhaltung = propertyTransactions
      .filter(t => t.amount < 0 && instandhaltungCategoryIds.includes(t.category_id || ''))
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    // Nettoertrag = Mieteinnahmen - Instandhaltung
    const nettoertrag = mieteinnahmen - instandhaltung;
    const annualNettoertrag = reportPeriod === 'monthly' ? nettoertrag * 12 : nettoertrag;
    const estimatedValue = Number(property.total_qm) * 3000;
    const yieldPercent = estimatedValue > 0 ? (annualNettoertrag / estimatedValue) * 100 : 0;
    const vacantUnits = propertyUnits.filter(u => u.status === 'leerstand').length;
    const occupancyRate = propertyUnits.length > 0 ? ((propertyUnits.length - vacantUnits) / propertyUnits.length) * 100 : 0;
    
    return [
      property.name,
      `${Number(property.total_qm).toLocaleString('de-AT')} m²`,
      property.total_units.toString(),
      formatCurrency(mieteinnahmen),
      formatCurrency(instandhaltung),
      formatCurrency(nettoertrag),
      formatPercent(yieldPercent),
      formatPercent(occupancyRate),
    ];
  });

  // Total row
  const totalQm = targetProperties.reduce((sum, p) => sum + Number(p.total_qm), 0);
  const totalUnits = targetProperties.reduce((sum, p) => sum + p.total_units, 0);
  
  // Calculate totals from transactions
  const allPropertyIds = targetProperties.map(p => p.id);
  const allPeriodTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const matchesProp = allPropertyIds.includes(t.property_id || '');
    
    if (reportPeriod === 'yearly') {
      return matchesProp && year === selectedYear;
    }
    return matchesProp && year === selectedYear && month === selectedMonth;
  });

  const totalMieteinnahmen = allPeriodTransactions
    .filter(t => t.amount > 0 && t.category_id === mieteinnahmenCategoryId)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalInstandhaltung = allPeriodTransactions
    .filter(t => t.amount < 0 && instandhaltungCategoryIds.includes(t.category_id || ''))
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const totalNettoertrag = totalMieteinnahmen - totalInstandhaltung;
  const annualTotalNettoertrag = reportPeriod === 'monthly' ? totalNettoertrag * 12 : totalNettoertrag;
  const totalValue = totalQm * 3000;
  const totalYield = totalValue > 0 ? (annualTotalNettoertrag / totalValue) * 100 : 0;

  autoTable(doc, {
    startY: 45,
    head: [['Liegenschaft', 'Fläche', 'Einheiten', 'Mieteinnahmen', 'Instandhaltung', 'Nettoertrag', 'Rendite p.a.', 'Belegung']],
    body: tableData,
    foot: [['Gesamt', `${totalQm.toLocaleString('de-AT')} m²`, totalUnits.toString(), formatCurrency(totalMieteinnahmen), formatCurrency(totalInstandhaltung), formatCurrency(totalNettoertrag), formatPercent(totalYield), '-']],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  // Add explanation
  const y1 = (doc as any).lastAutoTable?.finalY || 150;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text('Hinweis: Rendite = (Mieteinnahmen - Instandhaltungskosten) / Immobilienwert × 100', 14, y1 + 10);
  doc.text('Betriebskosten sind nicht enthalten, da diese auf die Mieter umgelegt werden.', 14, y1 + 16);
  doc.setTextColor(0);

  doc.save(`Renditereport_${periodLabel.replace(' ', '_')}.pdf`);
};

// ====== LEERSTAND REPORT ======
export const generateLeerstandReport = (
  properties: PropertyData[],
  units: UnitData[],
  tenants: TenantData[],
  selectedPropertyId: string,
  selectedYear: number
) => {
  const doc = new jsPDF();
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  
  addHeader(
    doc, 
    'Leerstandsreport', 
    `Stand: ${new Date().toLocaleDateString('de-AT')}`,
    selectedPropertyId !== 'all' ? selectedProperty?.name : 'Alle Liegenschaften'
  );

  const targetUnits = selectedPropertyId === 'all' ? units : units.filter(u => u.property_id === selectedPropertyId);
  const vacantUnits = targetUnits.filter(u => u.status === 'leerstand');
  
  // Summary
  const vacancyRate = targetUnits.length > 0 ? (vacantUnits.length / targetUnits.length) * 100 : 0;
  const vacantQm = vacantUnits.reduce((sum, u) => sum + Number(u.qm), 0);
  const totalQm = targetUnits.reduce((sum, u) => sum + Number(u.qm), 0);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Zusammenfassung', 14, 45);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Leerstandsquote: ${formatPercent(vacancyRate)}`, 14, 53);
  doc.text(`Leerstehende Einheiten: ${vacantUnits.length} von ${targetUnits.length}`, 14, 60);
  doc.text(`Leerstehende Fläche: ${vacantQm.toLocaleString('de-AT')} m² von ${totalQm.toLocaleString('de-AT')} m²`, 14, 67);

  // Vacant units table
  if (vacantUnits.length > 0) {
    const tableData = vacantUnits.map(unit => {
      const property = properties.find(p => p.id === unit.property_id);
      return [
        property?.name || '-',
        `Top ${unit.top_nummer}`,
        unitTypeLabels[unit.type] || unit.type,
        `${Number(unit.qm).toLocaleString('de-AT')} m²`,
        `${Number(unit.mea).toLocaleString('de-AT')}`,
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [['Liegenschaft', 'Einheit', 'Typ', 'Fläche', 'MEA']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [245, 158, 11] },
    });
  } else {
    doc.setFontSize(11);
    doc.text('Keine leerstehenden Einheiten vorhanden.', 14, 80);
  }

  // Per property summary
  const targetProperties = selectedPropertyId === 'all' ? properties : properties.filter(p => p.id === selectedPropertyId);
  
  const propertyData = targetProperties.map(property => {
    const propUnits = targetUnits.filter(u => u.property_id === property.id);
    const propVacant = propUnits.filter(u => u.status === 'leerstand');
    const propVacancyRate = propUnits.length > 0 ? (propVacant.length / propUnits.length) * 100 : 0;
    const propVacantQm = propVacant.reduce((sum, u) => sum + Number(u.qm), 0);
    
    return [
      property.name,
      `${propVacant.length} / ${propUnits.length}`,
      formatPercent(propVacancyRate),
      `${propVacantQm.toLocaleString('de-AT')} m²`,
    ];
  });

  const lastY = (doc as any).lastAutoTable?.finalY || 90;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Übersicht pro Liegenschaft', 14, lastY + 15);

  autoTable(doc, {
    startY: lastY + 20,
    head: [['Liegenschaft', 'Leerstand', 'Quote', 'Fläche leer']],
    body: propertyData,
    theme: 'striped',
    headStyles: { fillColor: [107, 114, 128] },
  });

  doc.save(`Leerstandsreport_${selectedYear}.pdf`);
};

// ====== UMSATZ REPORT ======
export const generateUmsatzReport = (
  properties: PropertyData[],
  units: UnitData[],
  tenants: TenantData[],
  invoices: InvoiceData[],
  payments: PaymentData[],
  transactions: TransactionData[],
  categories: CategoryData[],
  selectedPropertyId: string,
  selectedYear: number,
  reportPeriod: 'monthly' | 'yearly',
  selectedMonth?: number
) => {
  const doc = new jsPDF('landscape');
  const periodLabel = reportPeriod === 'yearly' 
    ? `Jahr ${selectedYear}` 
    : `${monthNames[(selectedMonth || 1) - 1]} ${selectedYear}`;
  
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  
  addHeader(
    doc, 
    'Umsatzreport', 
    periodLabel,
    selectedPropertyId !== 'all' ? selectedProperty?.name : 'Alle Liegenschaften'
  );

  // Filter transactions for period
  const periodTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const matchesProp = selectedPropertyId === 'all' || t.property_id === selectedPropertyId;
    
    if (reportPeriod === 'yearly') {
      return matchesProp && year === selectedYear;
    }
    return matchesProp && year === selectedYear && month === selectedMonth;
  });

  // Calculate totals from transactions
  const incomeTransactions = periodTransactions.filter(t => t.amount > 0);
  const expenseTransactions = periodTransactions.filter(t => t.amount < 0);
  
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const netResult = totalIncome - totalExpenses;

  // Summary text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Zusammenfassung aus Buchhaltung', 14, 45);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Einnahmen: ${formatCurrency(totalIncome)} (${incomeTransactions.length} Buchungen)`, 14, 53);
  doc.text(`Ausgaben: ${formatCurrency(totalExpenses)} (${expenseTransactions.length} Buchungen)`, 14, 60);
  doc.text(`Ergebnis: ${formatCurrency(netResult)}`, 14, 67);

  // Transaction table
  const tableData = periodTransactions.slice(0, 50).map(t => {
    const category = categories.find(c => c.id === t.category_id);
    const property = properties.find(p => p.id === t.property_id);
    const isIncome = t.amount > 0;
    
    return [
      new Date(t.transaction_date).toLocaleDateString('de-AT'),
      property?.name || '-',
      t.description || '-',
      category?.name || 'Nicht kategorisiert',
      isIncome ? formatCurrency(t.amount) : '-',
      !isIncome ? formatCurrency(Math.abs(t.amount)) : '-',
    ];
  });

  autoTable(doc, {
    startY: 75,
    head: [['Datum', 'Liegenschaft', 'Beschreibung', 'Kategorie', 'Einnahme', 'Ausgabe']],
    body: tableData,
    foot: [['Summe', '', '', '', formatCurrency(totalIncome), formatCurrency(totalExpenses)]],
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  if (periodTransactions.length > 50) {
    const y = (doc as any).lastAutoTable?.finalY || 200;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`... und ${periodTransactions.length - 50} weitere Buchungen`, 14, y + 10);
    doc.setTextColor(0);
  }

  doc.save(`Umsatzreport_${periodLabel.replace(' ', '_')}.pdf`);
};

// ====== UST VORANMELDUNG ======
export const generateUstVoranmeldung = (
  properties: PropertyData[],
  units: UnitData[],
  tenants: TenantData[],
  invoices: InvoiceData[],
  expenses: ExpenseData[],
  transactions: TransactionData[],
  categories: CategoryData[],
  selectedPropertyId: string,
  selectedYear: number,
  reportPeriod: 'monthly' | 'yearly',
  selectedMonth?: number
) => {
  const doc = new jsPDF();
  const periodLabel = reportPeriod === 'yearly' 
    ? `Jahr ${selectedYear}` 
    : `${monthNames[(selectedMonth || 1) - 1]} ${selectedYear}`;
  
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  
  addHeader(
    doc, 
    'USt-Voranmeldung', 
    periodLabel,
    selectedPropertyId !== 'all' ? selectedProperty?.name : 'Alle Liegenschaften'
  );

  // Filter transactions for period
  const periodTransactions = transactions.filter(t => {
    const date = new Date(t.transaction_date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const matchesProp = selectedPropertyId === 'all' || t.property_id === selectedPropertyId;
    
    if (reportPeriod === 'yearly') {
      return matchesProp && year === selectedYear;
    }
    return matchesProp && year === selectedYear && month === selectedMonth;
  });

  // Get category IDs
  const mieteinnahmenCategoryId = categories.find(c => c.name === 'Mieteinnahmen')?.id;
  const bkVorauszCategoryId = categories.find(c => c.name === 'Betriebskostenvorauszahlungen')?.id;

  const incomeTransactions = periodTransactions.filter(t => t.amount > 0);
  const expenseTransactions = periodTransactions.filter(t => t.amount < 0);

  // Mieteinnahmen (0% USt für Wohnungen)
  const mieteinnahmen = incomeTransactions
    .filter(t => t.category_id === mieteinnahmenCategoryId)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const ustMieteinnahmen = 0; // Mieteinnahmen sind meist unecht umsatzsteuerbefreit

  // BK-Vorauszahlungen (10% USt)
  const bkVorauszahlungen = incomeTransactions
    .filter(t => t.category_id === bkVorauszCategoryId)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const ustBkVorausz = bkVorauszahlungen - (bkVorauszahlungen / 1.1);

  // Sonstige Einnahmen
  const sonstigeEinnahmen = incomeTransactions
    .filter(t => t.category_id !== mieteinnahmenCategoryId && t.category_id !== bkVorauszCategoryId)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const ustSonstige = sonstigeEinnahmen - (sonstigeEinnahmen / 1.2);

  const totalEinnahmen = mieteinnahmen + bkVorauszahlungen + sonstigeEinnahmen;
  const totalUst = ustMieteinnahmen + ustBkVorausz + ustSonstige;

  // Vorsteuer aus Ausgaben (differenziert nach Kategorie)
  const totalAusgaben = expenseTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  
  // Ausgaben nach USt-Satz gruppieren
  const ausgaben20 = expenseTransactions.filter(t => {
    const catName = categories.find(c => c.id === t.category_id)?.name || '';
    return (CATEGORY_VAT_RATES[catName] ?? 20) === 20;
  });
  const ausgaben10 = expenseTransactions.filter(t => {
    const catName = categories.find(c => c.id === t.category_id)?.name || '';
    return CATEGORY_VAT_RATES[catName] === 10;
  });
  const ausgaben0 = expenseTransactions.filter(t => {
    const catName = categories.find(c => c.id === t.category_id)?.name || '';
    return CATEGORY_VAT_RATES[catName] === 0;
  });
  
  const brutto20 = ausgaben20.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const brutto10 = ausgaben10.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const brutto0 = ausgaben0.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  
  const vorsteuer20 = calculateVatFromGross(brutto20, 20);
  const vorsteuer10 = calculateVatFromGross(brutto10, 10);
  const vorsteuer = vorsteuer20 + vorsteuer10;

  const vatLiability = totalUst - vorsteuer;

  // Section 1: Einnahmen aus Transaktionen
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Einnahmen aus Buchhaltung', 14, 50);

  autoTable(doc, {
    startY: 55,
    head: [['Position', 'Brutto', 'USt-Satz', 'USt']],
    body: [
      ['Mieteinnahmen', formatCurrency(mieteinnahmen), '0%', formatCurrency(ustMieteinnahmen)],
      ['BK-Vorauszahlungen', formatCurrency(bkVorauszahlungen), '10%', formatCurrency(ustBkVorausz)],
      ['Sonstige Einnahmen', formatCurrency(sonstigeEinnahmen), '20%', formatCurrency(ustSonstige)],
    ],
    foot: [['Gesamt', formatCurrency(totalEinnahmen), '', formatCurrency(totalUst)]],
    theme: 'plain',
    headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
    footStyles: { fillColor: [219, 234, 254], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10 },
  });

  const y1 = (doc as any).lastAutoTable?.finalY || 100;

  // Section 2: Ausgaben / Vorsteuer (nach USt-Sätzen aufgeschlüsselt)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Vorsteuer aus Ausgaben', 14, y1 + 15);

  autoTable(doc, {
    startY: y1 + 20,
    head: [['Position', 'Anzahl', 'Brutto', 'USt-Satz', 'Vorsteuer']],
    body: [
      ['Ausgaben (20% USt)', `${ausgaben20.length}`, formatCurrency(brutto20), '20%', formatCurrency(vorsteuer20)],
      ['Ausgaben (10% USt)', `${ausgaben10.length}`, formatCurrency(brutto10), '10%', formatCurrency(vorsteuer10)],
      ['Ausgaben (0% USt)', `${ausgaben0.length}`, formatCurrency(brutto0), '0%', formatCurrency(0)],
    ],
    foot: [['Gesamt', `${expenseTransactions.length}`, formatCurrency(totalAusgaben), '', formatCurrency(vorsteuer)]],
    theme: 'plain',
    headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
    footStyles: { fillColor: [219, 234, 254], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10 },
  });

  const y2 = (doc as any).lastAutoTable?.finalY || 150;

  // Section 3: Berechnung
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. USt-Berechnung', 14, y2 + 15);

  autoTable(doc, {
    startY: y2 + 20,
    body: [
      ['Umsatzsteuer (aus Einnahmen)', formatCurrency(totalUst)],
      ['./. Vorsteuer (aus Ausgaben)', formatCurrency(vorsteuer)],
      [vatLiability >= 0 ? 'Zahllast an Finanzamt' : 'Gutschrift vom Finanzamt', formatCurrency(Math.abs(vatLiability))],
    ],
    theme: 'plain',
    bodyStyles: { fontSize: 11 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
    },
  });

  const y3 = (doc as any).lastAutoTable?.finalY || 200;

  // Highlight box for result
  doc.setFillColor(vatLiability >= 0 ? 220 : 254, vatLiability >= 0 ? 252 : 226, vatLiability >= 0 ? 231 : 226);
  doc.roundedRect(14, y3 + 10, 180, 25, 3, 3, 'F');
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(vatLiability >= 0 ? 22 : 180, vatLiability >= 0 ? 163 : 83, vatLiability >= 0 ? 74 : 9);
  doc.text(
    vatLiability >= 0 
      ? `Zahllast: ${formatCurrency(vatLiability)}`
      : `Gutschrift: ${formatCurrency(Math.abs(vatLiability))}`,
    104,
    y3 + 25,
    { align: 'center' }
  );
  doc.setTextColor(0);

  // Due date for monthly
  if (reportPeriod === 'monthly' && selectedMonth) {
    const dueMonth = selectedMonth + 1 > 12 ? 1 : selectedMonth + 1;
    const dueYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Fällig bis: 15.${dueMonth.toString().padStart(2, '0')}.${dueYear}`, 104, y3 + 32, { align: 'center' });
    doc.setTextColor(0);
  }

  doc.save(`USt-Voranmeldung_${periodLabel.replace(' ', '_')}.pdf`);
};

// ====== OFFENE POSTEN REPORT ======
interface OpenItemInvoice {
  id: string;
  tenant_id: string;
  unit_id: string;
  year: number;
  month: number;
  grundmiete: number;
  betriebskosten: number;
  heizungskosten: number;
  gesamtbetrag: number;
  status: string;
  faellig_am: string;
}

export const generateOffenePostenReport = (
  properties: PropertyData[],
  units: UnitData[],
  tenants: TenantData[],
  invoices: OpenItemInvoice[],
  payments: PaymentData[],
  selectedPropertyId: string,
  selectedYear: number
) => {
  const doc = new jsPDF('landscape');
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  
  addHeader(
    doc, 
    'Offene Posten Liste', 
    `Stand: ${new Date().toLocaleDateString('de-AT')}`,
    selectedPropertyId !== 'all' ? selectedProperty?.name : 'Alle Liegenschaften'
  );

  // Filter units
  const targetUnits = selectedPropertyId === 'all' ? units : units.filter(u => u.property_id === selectedPropertyId);
  const unitIds = targetUnits.map(u => u.id);
  
  // Get tenant IDs for these units
  const relevantTenants = tenants.filter(t => unitIds.includes(t.unit_id));
  const tenantIds = relevantTenants.map(t => t.id);
  
  // Filter invoices for selected year
  const yearInvoices = invoices.filter(inv => {
    const matchesUnit = unitIds.includes(inv.unit_id);
    return matchesUnit && inv.year === selectedYear;
  });

  // Filter payments for selected year
  const yearPayments = payments.filter(p => {
    const paymentDate = new Date(p.eingangs_datum);
    return tenantIds.includes(p.tenant_id) && paymentDate.getFullYear() === selectedYear;
  });

  // Calculate balance per tenant
  interface TenantBalance {
    tenantId: string;
    tenantName: string;
    unitId: string;
    unitNummer: string;
    propertyName: string;
    sollBetrag: number;
    habenBetrag: number;
    saldo: number; // Negative = Überzahlung (Guthaben), Positive = Unterzahlung (offen)
    invoiceCount: number;
    paymentCount: number;
    oldestDueDate: Date | null;
    daysOverdue: number;
  }

  const tenantBalances: TenantBalance[] = [];
  const today = new Date();

  relevantTenants.forEach(tenant => {
    const tenantInvoices = yearInvoices.filter(inv => inv.tenant_id === tenant.id);
    const tenantPayments = yearPayments.filter(p => p.tenant_id === tenant.id);
    
    const sollBetrag = tenantInvoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0);
    const habenBetrag = tenantPayments.reduce((sum, p) => sum + Number(p.betrag || 0), 0);
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

    const unit = targetUnits.find(u => u.id === tenant.unit_id);
    const property = properties.find(p => p.id === unit?.property_id);

    // Only include if there's activity or a balance
    if (sollBetrag > 0 || habenBetrag > 0) {
      tenantBalances.push({
        tenantId: tenant.id,
        tenantName: `${tenant.first_name} ${tenant.last_name}`,
        unitId: tenant.unit_id,
        unitNummer: unit?.top_nummer || '-',
        propertyName: property?.name || '-',
        sollBetrag,
        habenBetrag,
        saldo,
        invoiceCount: tenantInvoices.length,
        paymentCount: tenantPayments.length,
        oldestDueDate,
        daysOverdue,
      });
    }
  });

  // Sort: Positive saldo (Unterzahlung) first, then by amount descending
  tenantBalances.sort((a, b) => {
    // First: underpayments (positive saldo)
    if (a.saldo > 0 && b.saldo <= 0) return -1;
    if (a.saldo <= 0 && b.saldo > 0) return 1;
    // Then by absolute amount
    return Math.abs(b.saldo) - Math.abs(a.saldo);
  });

  // Summary calculations
  const totalSoll = tenantBalances.reduce((sum, t) => sum + t.sollBetrag, 0);
  const totalHaben = tenantBalances.reduce((sum, t) => sum + t.habenBetrag, 0);
  const totalSaldo = tenantBalances.reduce((sum, t) => sum + t.saldo, 0);
  const underpaidTenants = tenantBalances.filter(t => t.saldo > 0);
  const overpaidTenants = tenantBalances.filter(t => t.saldo < 0);
  const totalUnterzahlung = underpaidTenants.reduce((sum, t) => sum + t.saldo, 0);
  const totalUeberzahlung = Math.abs(overpaidTenants.reduce((sum, t) => sum + t.saldo, 0));

  // Summary text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Soll: ${formatCurrency(totalSoll)} | Haben: ${formatCurrency(totalHaben)} | Saldo: ${formatCurrency(totalSaldo)}`, 14, 40);
  doc.text(`Unterzahlungen: ${formatCurrency(totalUnterzahlung)} (${underpaidTenants.length} Mieter) | Überzahlungen: ${formatCurrency(totalUeberzahlung)} (${overpaidTenants.length} Mieter)`, 14, 46);

  // Table data
  const tableData = tenantBalances.map(tb => {
    let statusLabel = 'Ausgeglichen';
    if (tb.saldo > 0) {
      statusLabel = 'Unterzahlung';
    } else if (tb.saldo < 0) {
      statusLabel = 'Überzahlung';
    }
    
    return [
      tb.propertyName,
      `Top ${tb.unitNummer}`,
      tb.tenantName,
      formatCurrency(tb.sollBetrag),
      formatCurrency(tb.habenBetrag),
      tb.daysOverdue > 0 ? `${tb.daysOverdue} Tage` : '-',
      statusLabel,
      formatCurrency(tb.saldo),
    ];
  });

  autoTable(doc, {
    startY: 52,
    head: [['Liegenschaft', 'Einheit', 'Mieter', 'Soll', 'Haben', 'Überfällig', 'Status', 'Saldo']],
    body: tableData,
    foot: [['Gesamt', '', '', formatCurrency(totalSoll), formatCurrency(totalHaben), '', '', formatCurrency(totalSaldo)]],
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] },
    footStyles: { fillColor: [254, 226, 226], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9 },
    didParseCell: (data) => {
      // Style the Saldo column based on value
      if (data.section === 'body' && data.column.index === 7) {
        const saldoText = data.cell.text[0];
        if (saldoText) {
          // Parse the value - negative means overpayment (green), positive means underpayment (red)
          const value = parseFloat(saldoText.replace('€ ', '').replace(/\./g, '').replace(',', '.'));
          if (value > 0) {
            data.cell.styles.textColor = [239, 68, 68]; // Red for underpayment
            data.cell.styles.fontStyle = 'bold';
          } else if (value < 0) {
            data.cell.styles.textColor = [34, 197, 94]; // Green for overpayment
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
      // Style Status column
      if (data.section === 'body' && data.column.index === 6) {
        const status = data.cell.text[0];
        if (status === 'Unterzahlung') {
          data.cell.styles.textColor = [239, 68, 68];
        } else if (status === 'Überzahlung') {
          data.cell.styles.textColor = [34, 197, 94];
        }
      }
      // Highlight overdue
      if (data.section === 'body' && data.column.index === 5) {
        const daysText = data.cell.text[0];
        if (daysText && daysText !== '-') {
          data.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
  });

  doc.save(`Offene_Posten_${selectedYear}.pdf`);
};
