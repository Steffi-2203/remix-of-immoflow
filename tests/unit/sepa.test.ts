/**
 * Unit-Tests für SEPA-Export
 * pain.008.001.02 (Lastschrift) und pain.001.001.03 (Überweisung)
 * 
 * Testet:
 * - IBAN-Validierung
 * - BIC-Validierung
 * - XML-Generierung
 * - Betragsformatierung
 */

interface IbanTestCase {
  name: string;
  iban: string;
  isValid: boolean;
  country?: string;
}

interface SepaAmountTestCase {
  name: string;
  amount: number;
  expected: string;
}

function validateIban(iban: string): boolean {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(cleanIban)) {
    return false;
  }

  const countryLengths: Record<string, number> = {
    'AT': 20,
    'DE': 22,
    'CH': 21,
    'LI': 21,
  };

  const country = cleanIban.substring(0, 2);
  const expectedLength = countryLengths[country];
  if (expectedLength && cleanIban.length !== expectedLength) {
    return false;
  }

  const rearranged = cleanIban.substring(4) + cleanIban.substring(0, 4);
  const numericIban = rearranged.split('').map(char => {
    const code = char.charCodeAt(0);
    return code >= 65 && code <= 90 ? (code - 55).toString() : char;
  }).join('');

  let remainder = 0;
  for (let i = 0; i < numericIban.length; i++) {
    remainder = (remainder * 10 + parseInt(numericIban[i])) % 97;
  }

  return remainder === 1;
}

function validateBic(bic: string): boolean {
  const cleanBic = bic.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanBic);
}

function formatSepaAmount(amount: number): string {
  return amount.toFixed(2);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const ibanTestCases: IbanTestCase[] = [
  { name: 'Gültige österreichische IBAN', iban: 'AT611904300234573201', isValid: true, country: 'AT' },
  { name: 'Gültige österreichische IBAN mit Leerzeichen', iban: 'AT61 1904 3002 3457 3201', isValid: true, country: 'AT' },
  { name: 'Gültige deutsche IBAN', iban: 'DE89370400440532013000', isValid: true, country: 'DE' },
  { name: 'Gültige Schweizer IBAN', iban: 'CH9300762011623852957', isValid: true, country: 'CH' },
  { name: 'Ungültige IBAN - falsche Prüfziffer', iban: 'AT611904300234573202', isValid: false },
  { name: 'Ungültige IBAN - zu kurz', iban: 'AT61190430023457320', isValid: false },
  { name: 'Ungültige IBAN - zu lang', iban: 'AT6119043002345732011', isValid: false },
  { name: 'Ungültige IBAN - falsche Zeichen', iban: 'AT61-1904-3002-3457-3201', isValid: false },
  { name: 'Leere IBAN', iban: '', isValid: false },
];

const bicTestCases = [
  { name: 'Gültiger BIC 8 Zeichen', bic: 'BKAUATWW', isValid: true },
  { name: 'Gültiger BIC 11 Zeichen', bic: 'BKAUATWWXXX', isValid: true },
  { name: 'Gültiger BIC mit Leerzeichen', bic: 'BKAU AT WW', isValid: true },
  { name: 'Ungültiger BIC - zu kurz', bic: 'BKAUATW', isValid: false },
  { name: 'Ungültiger BIC - falsche Zeichen', bic: 'BKAU1TWW', isValid: false },
  { name: 'Leerer BIC', bic: '', isValid: false },
];

const amountTestCases: SepaAmountTestCase[] = [
  { name: 'Ganzzahl', amount: 100, expected: '100.00' },
  { name: 'Mit Dezimalen', amount: 150.50, expected: '150.50' },
  { name: 'Ein Cent', amount: 0.01, expected: '0.01' },
  { name: 'Rundung', amount: 99.999, expected: '100.00' },
  { name: 'Große Summe', amount: 15000.00, expected: '15000.00' },
  { name: 'Null', amount: 0, expected: '0.00' },
];

const xmlEscapeTestCases = [
  { name: 'Ampersand', input: 'Müller & Söhne', expected: 'Müller &amp; Söhne' },
  { name: 'Kleiner als', input: 'Betrag < 100', expected: 'Betrag &lt; 100' },
  { name: 'Größer als', input: 'Betrag > 50', expected: 'Betrag &gt; 50' },
  { name: 'Anführungszeichen', input: 'Firma "Test"', expected: 'Firma &quot;Test&quot;' },
  { name: 'Apostroph', input: "O'Brien", expected: "O&apos;Brien" },
  { name: 'Keine Sonderzeichen', input: 'Normale Referenz', expected: 'Normale Referenz' },
];

function runTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  results.push('--- IBAN-Validierung ---');
  for (const testCase of ibanTestCases) {
    const isValid = validateIban(testCase.iban);
    if (isValid === testCase.isValid) {
      passed++;
      results.push(`✓ ${testCase.name}`);
    } else {
      failed++;
      results.push(`✗ ${testCase.name}`);
      results.push(`  IBAN: ${testCase.iban}, erwartet: ${testCase.isValid}, erhalten: ${isValid}`);
    }
  }

  results.push('');
  results.push('--- BIC-Validierung ---');
  for (const testCase of bicTestCases) {
    const isValid = validateBic(testCase.bic);
    if (isValid === testCase.isValid) {
      passed++;
      results.push(`✓ ${testCase.name}`);
    } else {
      failed++;
      results.push(`✗ ${testCase.name}`);
      results.push(`  BIC: ${testCase.bic}, erwartet: ${testCase.isValid}, erhalten: ${isValid}`);
    }
  }

  results.push('');
  results.push('--- Betragsformatierung ---');
  for (const testCase of amountTestCases) {
    const formatted = formatSepaAmount(testCase.amount);
    if (formatted === testCase.expected) {
      passed++;
      results.push(`✓ ${testCase.name}`);
    } else {
      failed++;
      results.push(`✗ ${testCase.name}`);
      results.push(`  Betrag: ${testCase.amount}, erwartet: ${testCase.expected}, erhalten: ${formatted}`);
    }
  }

  results.push('');
  results.push('--- XML-Escape ---');
  for (const testCase of xmlEscapeTestCases) {
    const escaped = escapeXml(testCase.input);
    if (escaped === testCase.expected) {
      passed++;
      results.push(`✓ ${testCase.name}`);
    } else {
      failed++;
      results.push(`✗ ${testCase.name}`);
      results.push(`  Input: ${testCase.input}, erwartet: ${testCase.expected}, erhalten: ${escaped}`);
    }
  }

  return { passed, failed, results };
}

export { runTests, validateIban, validateBic, formatSepaAmount, escapeXml };
