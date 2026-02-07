import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const monthNames = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function fmt(amount: number): string {
  return `€ ${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface WegVorschreibungPdfParams {
  ownerName: string;
  propertyName: string;
  propertyAddress: string;
  unitNumber: string;
  year: number;
  month: number;
  positions: { description: string; category: string; netAmount: number; taxRate: number; taxAmount: number; grossAmount: number }[];
  reserveContribution: number;
  totalNet: number;
  totalTax: number;
  totalGross: number;
  dueDate: string;
  iban?: string;
  bic?: string;
  isProrated?: boolean;
  proratedDays?: number;
  totalDays?: number;
}

export function generateWegVorschreibungPdf(params: WegVorschreibungPdfParams): Blob {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text('Vorschreibung', 14, 22);
  doc.setFontSize(10);
  doc.text(`${monthNames[params.month - 1]} ${params.year}`, 14, 30);

  // Property & Owner info
  doc.setFontSize(10);
  doc.text(`Liegenschaft: ${params.propertyName}`, 14, 42);
  doc.text(`Adresse: ${params.propertyAddress}`, 14, 48);
  doc.text(`Einheit: ${params.unitNumber}`, 14, 54);
  doc.text(`Eigentümer: ${params.ownerName}`, 14, 60);

  if (params.isProrated && params.proratedDays && params.totalDays) {
    doc.setTextColor(180, 80, 0);
    doc.text(`Aliquot: ${params.proratedDays}/${params.totalDays} Tage`, 14, 66);
    doc.setTextColor(0, 0, 0);
  }

  const startY = params.isProrated ? 74 : 68;

  // Positions table
  const tableData = params.positions.map((p) => [
    p.description,
    `${p.taxRate}%`,
    fmt(p.netAmount),
    fmt(p.taxAmount),
    fmt(p.grossAmount),
  ]);

  if (params.reserveContribution > 0) {
    tableData.push(['Instandhaltungsrücklage', '0%', fmt(params.reserveContribution), fmt(0), fmt(params.reserveContribution)]);
  }

  autoTable(doc, {
    startY,
    head: [['Position', 'USt', 'Netto', 'USt-Betrag', 'Brutto']],
    body: tableData,
    foot: [['Gesamt', '', fmt(params.totalNet + params.reserveContribution), fmt(params.totalTax), fmt(params.totalGross)]],
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || startY + 60;

  doc.setFontSize(10);
  doc.text(`Fällig am: ${new Date(params.dueDate).toLocaleDateString('de-AT')}`, 14, finalY + 12);
  if (params.iban) {
    doc.text(`Zahlbar auf: ${params.iban}${params.bic ? ` (BIC: ${params.bic})` : ''}`, 14, finalY + 18);
  }

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Erstellt am ${new Date().toLocaleDateString('de-AT')}`, 14, 285);

  return doc.output('blob');
}

export interface WegWirtschaftsplanPdfParams {
  propertyName: string;
  propertyAddress: string;
  year: number;
  title: string;
  effectiveDate: string;
  items: { description: string; category: string; annualAmount: number; taxRate: number; distributionKey: string }[];
  totalAnnual: number;
  ownerBreakdown: { ownerName: string; unitNumber: string; mea: number; monthlyGross: number; monthlyReserve: number }[];
}

export function generateWirtschaftsplanPdf(params: WegWirtschaftsplanPdfParams): Blob {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(params.title, 14, 22);
  doc.setFontSize(10);
  doc.text(`${params.propertyName} – ${params.propertyAddress}`, 14, 30);
  doc.text(`Gültig ab: ${new Date(params.effectiveDate).toLocaleDateString('de-AT')}`, 14, 36);

  // Budget positions
  autoTable(doc, {
    startY: 44,
    head: [['Position', 'Kategorie', 'Jahresbetrag', 'USt', 'Verteilung']],
    body: params.items.map((i) => [i.description, i.category, fmt(i.annualAmount), `${i.taxRate}%`, i.distributionKey.toUpperCase()]),
    foot: [['Gesamt', '', fmt(params.totalAnnual), '', '']],
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] },
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

  const afterTable = (doc as any).lastAutoTable?.finalY || 100;

  // Owner breakdown
  doc.setFontSize(12);
  doc.text('Monatliche Vorschüsse je Eigentümer', 14, afterTable + 12);

  autoTable(doc, {
    startY: afterTable + 18,
    head: [['Eigentümer', 'Einheit', 'MEA', 'Monatl. Brutto', 'davon Rücklage']],
    body: params.ownerBreakdown.map((o) => [o.ownerName, o.unitNumber, o.mea.toString(), fmt(o.monthlyGross), fmt(o.monthlyReserve)]),
    theme: 'striped',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [46, 139, 87] },
  });

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Erstellt am ${new Date().toLocaleDateString('de-AT')}`, 14, 285);

  return doc.output('blob');
}
