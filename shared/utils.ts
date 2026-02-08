/** Round to nearest cent (2 decimal places). Single source of truth for all monetary rounding. */
export function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/** Alias for roundMoney — use whichever name reads better in context. */
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
