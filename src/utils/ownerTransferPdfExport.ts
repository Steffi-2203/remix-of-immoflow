import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function fmt(amount: number): string {
  return `€ ${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface OwnerTransferClosingPdfParams {
  propertyName: string;
  propertyAddress: string;
  unitNumber: string;
  oldOwnerName: string;
  newOwnerName: string;
  transferDate: string;
  landRegistryRef: string | null;
  legalReason: string;
  outstandingAmount: number;
  reserveBalanceTransferred: number;
  openInvoices: { month: number; year: number; amountGross: number; status: string }[];
  solidarhaftungWarning: boolean;
  solidarhaftungAmount: number;
}

export function generateOwnerTransferClosingPdf(params: OwnerTransferClosingPdfParams): Blob {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Abschlussrechnung – Eigentümerwechsel', 14, 22);

  doc.setFontSize(10);
  doc.text(`Liegenschaft: ${params.propertyName}`, 14, 34);
  doc.text(`Adresse: ${params.propertyAddress}`, 14, 40);
  doc.text(`Einheit: ${params.unitNumber}`, 14, 46);
  doc.text(`Übergabedatum: ${new Date(params.transferDate).toLocaleDateString('de-AT')}`, 14, 56);
  doc.text(`Rechtsgrund: ${params.legalReason}`, 14, 62);
  if (params.landRegistryRef) {
    doc.text(`Grundbuch TZ: ${params.landRegistryRef}`, 14, 68);
  }

  doc.setFontSize(12);
  doc.text('Bisheriger Eigentümer', 14, 80);
  doc.setFontSize(10);
  doc.text(params.oldOwnerName, 14, 86);

  doc.setFontSize(12);
  doc.text('Neuer Eigentümer', 14, 96);
  doc.setFontSize(10);
  doc.text(params.newOwnerName, 14, 102);

  // Open invoices
  if (params.openInvoices.length > 0) {
    doc.setFontSize(12);
    doc.text('Offene Vorschreibungen', 14, 114);

    autoTable(doc, {
      startY: 120,
      head: [['Monat/Jahr', 'Brutto', 'Status']],
      body: params.openInvoices.map((inv) => [`${inv.month}/${inv.year}`, fmt(inv.amountGross), inv.status]),
      foot: [['Offener Gesamtbetrag', fmt(params.outstandingAmount), '']],
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [192, 57, 43] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    });
  }

  const afterTable = (doc as any).lastAutoTable?.finalY || 130;

  doc.setFontSize(10);
  doc.text(`Übertragener Rücklage-Anteil: ${fmt(params.reserveBalanceTransferred)}`, 14, afterTable + 12);

  if (params.solidarhaftungWarning) {
    doc.setTextColor(192, 57, 43);
    doc.setFontSize(10);
    doc.text(`⚠ Solidarhaftung gem. § 38 WEG: Der neue Eigentümer haftet für`, 14, afterTable + 24);
    doc.text(`offene Forderungen der letzten 3 Jahre (${fmt(params.solidarhaftungAmount)}).`, 14, afterTable + 30);
    doc.setTextColor(0, 0, 0);
  }

  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(`Erstellt am ${new Date().toLocaleDateString('de-AT')}`, 14, 285);

  return doc.output('blob');
}
