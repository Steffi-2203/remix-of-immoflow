import Papa from 'papaparse';

export interface ParsedTransaction {
  date: string;
  amount: number;
  description: string;
  reference?: string;
  counterpartName?: string;
  counterpartIban?: string;
  bookingDate?: string;
}

export interface CSVParseResult {
  transactions: ParsedTransaction[];
  errors: string[];
}

// Common Austrian/German bank CSV column names
const DATE_COLUMNS = ['datum', 'buchungsdatum', 'valuta', 'date', 'buchungstag', 'wertstellung'];
const AMOUNT_COLUMNS = ['betrag', 'amount', 'umsatz', 'soll/haben', 'betrag in eur'];
const DESCRIPTION_COLUMNS = ['verwendungszweck', 'beschreibung', 'text', 'buchungstext', 'zahlungsreferenz'];
const REFERENCE_COLUMNS = ['referenz', 'reference', 'kundendaten', 'zahlungsreferenz'];
const COUNTERPART_NAME_COLUMNS = ['empfänger', 'auftraggeber', 'name', 'partner', 'zahlungspartner'];
const COUNTERPART_IBAN_COLUMNS = ['iban', 'konto', 'empfänger-iban', 'auftraggeber-iban'];

function findColumn(headers: string[], possibleNames: string[]): string | null {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  for (const name of possibleNames) {
    const index = lowerHeaders.findIndex(h => h.includes(name.toLowerCase()));
    if (index !== -1) {
      return headers[index];
    }
  }
  return null;
}

function parseGermanNumber(value: string): number {
  if (!value) return 0;
  // Handle German number format: 1.234,56 -> 1234.56
  const cleaned = value
    .replace(/[€\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function parseDate(value: string): string {
  if (!value) return new Date().toISOString().split('T')[0];
  
  // Try different date formats
  // DD.MM.YYYY (German format)
  const germanMatch = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (germanMatch) {
    const [, day, month, year] = germanMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // YYYY-MM-DD (ISO format)
  const isoMatch = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return value.substring(0, 10);
  }
  
  // DD/MM/YYYY
  const slashMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return new Date().toISOString().split('T')[0];
}

export function parseCSV(content: string): CSVParseResult {
  const errors: string[] = [];
  const transactions: ParsedTransaction[] = [];
  
  // Parse CSV
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });
  
  if (result.errors && result.errors.length > 0) {
    errors.push(...result.errors.map(e => `Zeile ${e.row}: ${e.message}`));
  }
  
  if (!result.data || result.data.length === 0) {
    errors.push('Keine Daten in der CSV-Datei gefunden');
    return { transactions, errors };
  }
  
  const headers = Object.keys(result.data[0]);
  
  // Find relevant columns
  const dateColumn = findColumn(headers, DATE_COLUMNS);
  const amountColumn = findColumn(headers, AMOUNT_COLUMNS);
  const descriptionColumn = findColumn(headers, DESCRIPTION_COLUMNS);
  const referenceColumn = findColumn(headers, REFERENCE_COLUMNS);
  const counterpartNameColumn = findColumn(headers, COUNTERPART_NAME_COLUMNS);
  const counterpartIbanColumn = findColumn(headers, COUNTERPART_IBAN_COLUMNS);
  
  if (!dateColumn) {
    errors.push('Keine Datumsspalte gefunden. Erwartete Spalten: ' + DATE_COLUMNS.join(', '));
  }
  if (!amountColumn) {
    errors.push('Keine Betragsspalte gefunden. Erwartete Spalten: ' + AMOUNT_COLUMNS.join(', '));
  }
  
  if (!dateColumn || !amountColumn) {
    return { transactions, errors };
  }
  
  // Parse rows
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    
    try {
      const amount = parseGermanNumber(row[amountColumn]);
      if (amount === 0) continue; // Skip zero transactions
      
      transactions.push({
        date: parseDate(row[dateColumn]),
        amount,
        description: descriptionColumn ? row[descriptionColumn] || '' : '',
        reference: referenceColumn ? row[referenceColumn] : undefined,
        counterpartName: counterpartNameColumn ? row[counterpartNameColumn] : undefined,
        counterpartIban: counterpartIbanColumn ? row[counterpartIbanColumn] : undefined,
      });
    } catch (e) {
      errors.push(`Zeile ${i + 2}: Fehler beim Parsen`);
    }
  }
  
  return { transactions, errors };
}

// Auto-matching logic
export interface MatchResult {
  unitId: string | null;
  tenantId: string | null;
  confidence: number;
  matchReason: string;
}

export interface Unit {
  id: string;
  top_nummer: string;
  property_id: string;
}

export interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  unit_id: string;
}

export function autoMatchTransaction(
  transaction: ParsedTransaction,
  units: Unit[],
  tenants: Tenant[]
): MatchResult {
  const description = (transaction.description || '').toLowerCase();
  const counterpartName = (transaction.counterpartName || '').toLowerCase();
  const reference = (transaction.reference || '').toLowerCase();
  const searchText = `${description} ${counterpartName} ${reference}`;
  
  let bestMatch: MatchResult = {
    unitId: null,
    tenantId: null,
    confidence: 0,
    matchReason: '',
  };
  
  // Try to match by unit number (Top X)
  for (const unit of units) {
    const topNummer = unit.top_nummer.toLowerCase();
    const variations = [
      topNummer,
      topNummer.replace(/\s/g, ''),
      `top ${topNummer}`,
      `top${topNummer}`,
      `wohnung ${topNummer}`,
      `einheit ${topNummer}`,
    ];
    
    for (const variation of variations) {
      if (searchText.includes(variation)) {
        const tenant = tenants.find(t => t.unit_id === unit.id);
        bestMatch = {
          unitId: unit.id,
          tenantId: tenant?.id || null,
          confidence: 0.8,
          matchReason: `Einheit "${unit.top_nummer}" im Verwendungszweck gefunden`,
        };
        break;
      }
    }
    if (bestMatch.confidence > 0) break;
  }
  
  // Try to match by tenant name
  if (bestMatch.confidence === 0) {
    for (const tenant of tenants) {
      const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
      const lastName = tenant.last_name.toLowerCase();
      
      if (searchText.includes(fullName)) {
        bestMatch = {
          unitId: tenant.unit_id,
          tenantId: tenant.id,
          confidence: 0.9,
          matchReason: `Mieter "${tenant.first_name} ${tenant.last_name}" im Namen/Verwendungszweck gefunden`,
        };
        break;
      } else if (searchText.includes(lastName) && lastName.length > 3) {
        bestMatch = {
          unitId: tenant.unit_id,
          tenantId: tenant.id,
          confidence: 0.6,
          matchReason: `Nachname "${tenant.last_name}" im Namen/Verwendungszweck gefunden`,
        };
      }
    }
  }
  
  return bestMatch;
}
