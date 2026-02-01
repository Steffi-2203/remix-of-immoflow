export function roundMoney(x: number): number {
  return Math.round(x * 100) / 100;
}

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
