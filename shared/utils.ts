/**
 * Rundet auf ganze Cent (2 Nachkommastellen).
 * Zentrale Rundungsfunktion für alle Geldbeträge im gesamten System:
 * billing.service (dryRun + persist), upsert tools, dryrun script, tests.
 * 
 * Alias: roundToCents (identisch, für explizite Semantik)
 */
export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export const roundToCents = roundMoney;

export function formatMoney(amount: number, locale: string = 'de-AT'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function parseMoneyInput(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, '').replace(',', '.');
  return roundMoney(parseFloat(cleaned) || 0);
}
