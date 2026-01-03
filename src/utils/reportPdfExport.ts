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
  
  // Calculate data per property
  const tableData = targetProperties.map(property => {
    const propertyUnits = units.filter(u => u.property_id === property.id);
    const unitIds = propertyUnits.map(u => u.id);
    
    const propertyInvoices = invoices.filter(inv => {
      const matchesUnit = unitIds.includes(inv.unit_id);
      if (reportPeriod === 'yearly') {
        return matchesUnit && inv.year === selectedYear;
      }
      return matchesUnit && inv.year === selectedYear && inv.month === selectedMonth;
    });
    
    const revenue = propertyInvoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0);
    const annualRevenue = reportPeriod === 'monthly' ? revenue * 12 : revenue;
    const estimatedValue = Number(property.total_qm) * 3000;
    const yieldPercent = estimatedValue > 0 ? (annualRevenue / estimatedValue) * 100 : 0;
    const vacantUnits = propertyUnits.filter(u => u.status === 'leerstand').length;
    const occupancyRate = propertyUnits.length > 0 ? ((propertyUnits.length - vacantUnits) / propertyUnits.length) * 100 : 0;
    
    return [
      property.name,
      `${Number(property.total_qm).toLocaleString('de-AT')} m²`,
      property.total_units.toString(),
      formatCurrency(revenue),
      formatPercent(yieldPercent),
      formatPercent(occupancyRate),
    ];
  });

  // Total row
  const totalQm = targetProperties.reduce((sum, p) => sum + Number(p.total_qm), 0);
  const totalUnits = targetProperties.reduce((sum, p) => sum + p.total_units, 0);
  const totalRevenue = tableData.reduce((sum, row) => {
    const val = row[3].replace('€ ', '').replace(/\./g, '').replace(',', '.');
    return sum + parseFloat(val);
  }, 0);
  const totalValue = totalQm * 3000;
  const annualTotalRevenue = reportPeriod === 'monthly' ? totalRevenue * 12 : totalRevenue;
  const totalYield = totalValue > 0 ? (annualTotalRevenue / totalValue) * 100 : 0;

  autoTable(doc, {
    startY: 45,
    head: [['Liegenschaft', 'Fläche', 'Einheiten', `Umsatz ${periodLabel}`, 'Rendite p.a.', 'Belegung']],
    body: tableData,
    foot: [['Gesamt', `${totalQm.toLocaleString('de-AT')} m²`, totalUnits.toString(), formatCurrency(totalRevenue), formatPercent(totalYield), '-']],
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

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

  // Filter units
  const targetUnits = selectedPropertyId === 'all' ? units : units.filter(u => u.property_id === selectedPropertyId);
  const unitIds = targetUnits.map(u => u.id);
  
  // Filter invoices
  const periodInvoices = invoices.filter(inv => {
    const matchesUnit = unitIds.includes(inv.unit_id);
    if (reportPeriod === 'yearly') {
      return matchesUnit && inv.year === selectedYear;
    }
    return matchesUnit && inv.year === selectedYear && inv.month === selectedMonth;
  });

  // Table data
  const tableData = periodInvoices.map(invoice => {
    const unit = targetUnits.find(u => u.id === invoice.unit_id);
    const tenant = tenants.find(t => t.id === invoice.tenant_id);
    const property = properties.find(p => p.id === unit?.property_id);
    
    return [
      property?.name || '-',
      `Top ${unit?.top_nummer || '-'}`,
      unitTypeLabels[unit?.type || ''] || '-',
      tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Leerstand',
      `${invoice.month}/${invoice.year}`,
      formatCurrency(Number(invoice.grundmiete)),
      formatCurrency(Number(invoice.betriebskosten)),
      formatCurrency(Number(invoice.heizungskosten)),
      formatCurrency(Number(invoice.gesamtbetrag)),
    ];
  });

  // Totals
  const totalMiete = periodInvoices.reduce((sum, inv) => sum + Number(inv.grundmiete), 0);
  const totalBK = periodInvoices.reduce((sum, inv) => sum + Number(inv.betriebskosten), 0);
  const totalHK = periodInvoices.reduce((sum, inv) => sum + Number(inv.heizungskosten), 0);
  const totalGesamt = periodInvoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag), 0);

  autoTable(doc, {
    startY: 45,
    head: [['Liegenschaft', 'Einheit', 'Typ', 'Mieter', 'Monat', 'Miete', 'BK', 'HK', 'Gesamt']],
    body: tableData,
    foot: [['Summe', '', '', '', '', formatCurrency(totalMiete), formatCurrency(totalBK), formatCurrency(totalHK), formatCurrency(totalGesamt)]],
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
    footStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 8 },
  });

  doc.save(`Umsatzreport_${periodLabel.replace(' ', '_')}.pdf`);
};

// ====== UST VORANMELDUNG ======
export const generateUstVoranmeldung = (
  properties: PropertyData[],
  units: UnitData[],
  tenants: TenantData[],
  invoices: InvoiceData[],
  expenses: ExpenseData[],
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

  // Filter data
  const targetUnits = selectedPropertyId === 'all' ? units : units.filter(u => u.property_id === selectedPropertyId);
  const unitIds = targetUnits.map(u => u.id);
  
  const periodInvoices = invoices.filter(inv => {
    const matchesUnit = unitIds.includes(inv.unit_id);
    if (reportPeriod === 'yearly') {
      return matchesUnit && inv.year === selectedYear;
    }
    return matchesUnit && inv.year === selectedYear && inv.month === selectedMonth;
  });

  const periodExpenses = selectedPropertyId === 'all'
    ? expenses.filter(exp => {
        if (reportPeriod === 'yearly') return exp.year === selectedYear;
        return exp.year === selectedYear && exp.month === selectedMonth;
      })
    : expenses.filter(exp => {
        const matchesProp = exp.property_id === selectedPropertyId;
        if (reportPeriod === 'yearly') return matchesProp && exp.year === selectedYear;
        return matchesProp && exp.year === selectedYear && exp.month === selectedMonth;
      });

  // Calculate totals
  const totalGrundmiete = periodInvoices.reduce((sum, inv) => sum + Number(inv.grundmiete || 0), 0);
  const totalBetriebskosten = periodInvoices.reduce((sum, inv) => sum + Number(inv.betriebskosten || 0), 0);
  const totalHeizungskosten = periodInvoices.reduce((sum, inv) => sum + Number(inv.heizungskosten || 0), 0);
  const totalGesamtbetrag = periodInvoices.reduce((sum, inv) => sum + Number(inv.gesamtbetrag || 0), 0);

  // Calculate Netto
  const nettoMieteTotal = periodInvoices.reduce((sum, inv) => 
    sum + calculateNetFromGross(Number(inv.grundmiete || 0), Number(inv.ust_satz_miete || 0)), 0);
  const nettoBkTotal = periodInvoices.reduce((sum, inv) => 
    sum + calculateNetFromGross(Number(inv.betriebskosten || 0), Number(inv.ust_satz_bk || 10)), 0);
  const nettoHkTotal = periodInvoices.reduce((sum, inv) => 
    sum + calculateNetFromGross(Number(inv.heizungskosten || 0), Number(inv.ust_satz_heizung || 20)), 0);
  const totalNetto = nettoMieteTotal + nettoBkTotal + nettoHkTotal;

  // Calculate USt
  const ustMiete = periodInvoices.reduce((sum, inv) => 
    sum + calculateVatFromGross(Number(inv.grundmiete || 0), Number(inv.ust_satz_miete || 0)), 0);
  const ustBk = periodInvoices.reduce((sum, inv) => 
    sum + calculateVatFromGross(Number(inv.betriebskosten || 0), Number(inv.ust_satz_bk || 10)), 0);
  const ustHeizung = periodInvoices.reduce((sum, inv) => 
    sum + calculateVatFromGross(Number(inv.heizungskosten || 0), Number(inv.ust_satz_heizung || 20)), 0);
  const totalUst = ustMiete + ustBk + ustHeizung;

  // Vorsteuer from expenses (assuming 20% VAT)
  const vorsteuerFromExpenses = periodExpenses.reduce((sum, exp) => {
    const betrag = Number(exp.betrag || 0);
    return sum + (betrag - betrag / 1.2);
  }, 0);

  const vatLiability = totalUst - vorsteuerFromExpenses;

  // Section 1: Einnahmen
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Einnahmen aus Vorschreibungen', 14, 50);

  autoTable(doc, {
    startY: 55,
    head: [['Position', 'Brutto', 'Netto', 'USt']],
    body: [
      ['Grundmiete', formatCurrency(totalGrundmiete), formatCurrency(nettoMieteTotal), formatCurrency(ustMiete)],
      ['Betriebskosten', formatCurrency(totalBetriebskosten), formatCurrency(nettoBkTotal), formatCurrency(ustBk)],
      ['Heizungskosten', formatCurrency(totalHeizungskosten), formatCurrency(nettoHkTotal), formatCurrency(ustHeizung)],
    ],
    foot: [['Gesamt', formatCurrency(totalGesamtbetrag), formatCurrency(totalNetto), formatCurrency(totalUst)]],
    theme: 'plain',
    headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
    footStyles: { fillColor: [219, 234, 254], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10 },
  });

  const y1 = (doc as any).lastAutoTable?.finalY || 100;

  // Section 2: Ausgaben / Vorsteuer
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Vorsteuer aus Ausgaben', 14, y1 + 15);

  autoTable(doc, {
    startY: y1 + 20,
    head: [['Beschreibung', 'Anzahl', 'Betrag Brutto', 'Vorsteuer (20%)']],
    body: [
      ['Ausgaben gesamt', `${periodExpenses.length} Positionen`, formatCurrency(periodExpenses.reduce((sum, e) => sum + Number(e.betrag), 0)), formatCurrency(vorsteuerFromExpenses)],
    ],
    theme: 'plain',
    headStyles: { fillColor: [229, 231, 235], textColor: [0, 0, 0], fontStyle: 'bold' },
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
      ['./. Vorsteuer (aus Ausgaben)', formatCurrency(vorsteuerFromExpenses)],
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
