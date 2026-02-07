/**
 * BMD/DATEV Export-Modul für österreichische Hausverwaltung
 * 
 * Exportiert Journal-Buchungen im BMD-kompatiblen CSV-Format
 * sowie im DATEV-kompatiblen Format für den Steuerberater.
 */

export interface JournalEntryExport {
  booking_number: string;
  entry_date: string;
  description: string;
  account_number: string;
  account_name: string;
  debit: number;
  credit: number;
  beleg_nummer?: string;
  property_name?: string;
  tenant_name?: string;
}

/**
 * BMD-Buchungsexport (NTCS-kompatibel)
 * Spaltenformat: Belegnummer;Belegdatum;Buchungstext;Konto;Gegenkonto;Soll;Haben;Steuerschlüssel;Kostenstelle
 */
export function generateBmdCsv(entries: JournalEntryExport[]): string {
  const headers = [
    'Belegnummer',
    'Belegdatum',
    'Buchungstext',
    'Konto',
    'Soll',
    'Haben',
    'Steuerschlüssel',
    'Kostenstelle',
  ];

  const rows = entries.map(e => {
    const date = new Date(e.entry_date);
    const belegDatum = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    
    // Determine tax code based on account
    let steuerSchluessel = '';
    if (e.account_number.startsWith('40') || e.account_number.startsWith('41')) {
      steuerSchluessel = '10'; // 10% USt Wohnung
    } else if (e.account_number.startsWith('42') || e.account_number.startsWith('43')) {
      steuerSchluessel = '20'; // 20% USt Geschäft
    } else if (e.account_number === '2500') {
      steuerSchluessel = 'VSt'; // Vorsteuer
    }

    return [
      e.beleg_nummer || e.booking_number,
      belegDatum,
      e.description,
      e.account_number,
      e.debit > 0 ? e.debit.toFixed(2) : '',
      e.credit > 0 ? e.credit.toFixed(2) : '',
      steuerSchluessel,
      e.property_name || '',
    ].join(';');
  });

  return '\uFEFF' + [headers.join(';'), ...rows].join('\n');
}

/**
 * DATEV-Buchungsstapel-Export (KRE-Format, vereinfacht)
 * Für Import in DATEV-kompatible Steuerberater-Software
 */
export function generateDatevCsv(entries: JournalEntryExport[]): string {
  const headers = [
    'Umsatz (ohne Soll/Haben-Kz)',
    'Soll/Haben-Kennzeichen',
    'WKZ Umsatz',
    'Konto',
    'Gegenkonto (ohne BU-Schlüssel)',
    'BU-Schlüssel',
    'Belegdatum',
    'Belegfeld 1',
    'Buchungstext',
    'Kostenstelle',
  ];

  // Group by journal entry to get debit/credit pairs
  const grouped = new Map<string, JournalEntryExport[]>();
  for (const e of entries) {
    const key = e.booking_number;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  const rows: string[] = [];

  for (const [bookingNr, lines] of grouped) {
    const debitLines = lines.filter(l => l.debit > 0);
    const creditLines = lines.filter(l => l.credit > 0);

    // Create one row per debit/credit pair
    for (const debit of debitLines) {
      const credit = creditLines[0]; // Primary credit account
      if (!credit) continue;

      const date = new Date(debit.entry_date);
      const datevDate = `${String(date.getDate()).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}`;

      rows.push([
        debit.debit.toFixed(2).replace('.', ','),
        'S',
        'EUR',
        debit.account_number,
        credit.account_number,
        '', // BU-Schlüssel
        datevDate,
        debit.beleg_nummer || bookingNr,
        debit.description,
        debit.property_name || '',
      ].join(';'));
    }
  }

  return '\uFEFF' + [headers.join(';'), ...rows].join('\n');
}

/**
 * Download helper
 */
export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
