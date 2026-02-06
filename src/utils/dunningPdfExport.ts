import jsPDF from 'jspdf';

const monthNames = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

interface DunningPdfParams {
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  amount: number;
  dueDate: string;
  invoiceMonth: number;
  invoiceYear: number;
  dunningLevel: 1 | 2;
  tenantAddress?: string;
}

export function generateDunningPdf(params: DunningPdfParams) {
  const {
    tenantName,
    propertyName,
    unitNumber,
    amount,
    dueDate,
    invoiceMonth,
    invoiceYear,
    dunningLevel,
    tenantAddress,
  } = params;

  const doc = new jsPDF();
  const monthName = monthNames[invoiceMonth - 1];
  const formattedAmount = amount.toLocaleString('de-AT', { minimumFractionDigits: 2 });
  const formattedDueDate = new Date(dueDate).toLocaleDateString('de-AT');
  const today = new Date().toLocaleDateString('de-AT');

  const isReminder = dunningLevel === 1;
  const title = isReminder ? 'Zahlungserinnerung' : 'Mahnung';

  // Header
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Hausverwaltung', 20, 20);
  doc.text(`Datum: ${today}`, 190, 20, { align: 'right' });

  // Recipient
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(tenantName, 20, 45);
  if (tenantAddress) {
    const addressLines = tenantAddress.split('\n');
    addressLines.forEach((line, i) => {
      doc.text(line, 20, 51 + i * 5);
    });
  }

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 75);

  // Body
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  let y = 90;

  if (isReminder) {
    doc.text(`Sehr geehrte/r ${tenantName},`, 20, y);
    y += 10;
    doc.text(
      'bei Durchsicht unserer Buchhaltung ist uns aufgefallen, dass die nachstehende',
      20, y
    );
    y += 6;
    doc.text('Forderung noch offen ist:', 20, y);
  } else {
    doc.text(`Sehr geehrte/r ${tenantName},`, 20, y);
    y += 10;
    doc.text(
      'trotz unserer Zahlungserinnerung ist die nachstehende Forderung weiterhin offen:',
      20, y
    );
  }

  // Details table
  y += 15;
  const labelX = 20;
  const valueX = 90;
  const rowHeight = 8;

  const rows = [
    ['Objekt', `${propertyName} - Top ${unitNumber}`],
    ['Abrechnungsmonat', `${monthName} ${invoiceYear}`],
    ['Fällig seit', formattedDueDate],
    ['Offener Betrag', `€ ${formattedAmount}`],
  ];

  rows.forEach(([label, value], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(labelX, y - 5, 170, rowHeight, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.text(label, labelX + 2, y);
    doc.setFont('helvetica', 'normal');
    if (label === 'Offener Betrag') {
      doc.setTextColor(200, 0, 0);
    }
    doc.text(value, valueX, y);
    doc.setTextColor(0);
    y += rowHeight;
  });

  y += 10;

  if (isReminder) {
    doc.text(
      'Wir bitten Sie, den offenen Betrag innerhalb der nächsten 7 Tage zu überweisen.',
      20, y
    );
    y += 12;
    doc.text(
      'Sollte sich diese Erinnerung mit Ihrer Zahlung überschnitten haben, bitten wir Sie,',
      20, y
    );
    y += 6;
    doc.text('dieses Schreiben als gegenstandslos zu betrachten.', 20, y);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0);
    doc.text(
      'Wir fordern Sie hiermit letztmalig auf, den offenen Betrag innerhalb von',
      20, y
    );
    y += 6;
    doc.text('5 Tagen zu überweisen.', 20, y);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    y += 12;
    doc.text(
      'Sollte der Betrag nicht fristgerecht bei uns eingehen, behalten wir uns rechtliche',
      20, y
    );
    y += 6;
    doc.text('Schritte vor, deren Kosten zu Ihren Lasten gehen.', 20, y);
  }

  y += 20;
  doc.text('Mit freundlichen Grüßen,', 20, y);
  y += 6;
  doc.text('Ihre Hausverwaltung', 20, y);

  // Save
  const fileName = `${title}_${tenantName.replace(/\s+/g, '_')}_${monthName}_${invoiceYear}.pdf`;
  doc.save(fileName);
}
