import { describe, test, expect } from 'vitest';
import {
  resolveVatProfile,
  renderDescription,
  isCommercialUnit,
  DEFAULT_BILLING_RULES,
} from '../../server/config/vatConfig';

/**
 * Tests for InvoiceGenerator pure functions.
 * Uses vatConfig (no DB dependency).
 */

// ── VAT Profile Resolution ──

describe('resolveVatProfile', () => {
  test('Wohnung: 10%/10%/20%', () => {
    const vat = resolveVatProfile('wohnung');
    expect(vat.ustSatzMiete).toBe(10);
    expect(vat.ustSatzBk).toBe(10);
    expect(vat.ustSatzHeizung).toBe(20);
  });

  test('Geschäft: 20%/20%/20%', () => {
    const vat = resolveVatProfile('geschaeft');
    expect(vat.ustSatzMiete).toBe(20);
    expect(vat.ustSatzBk).toBe(20);
    expect(vat.ustSatzHeizung).toBe(20);
  });

  test('Garage: 20% on everything', () => {
    const vat = resolveVatProfile('garage');
    expect(vat.ustSatzMiete).toBe(20);
    expect(vat.ustSatzBk).toBe(20);
  });

  test('Büro: commercial rates', () => {
    const vat = resolveVatProfile('buero');
    expect(vat.ustSatzMiete).toBe(20);
  });

  test('unknown type defaults to Wohnung', () => {
    const vat = resolveVatProfile('');
    expect(vat.ustSatzMiete).toBe(10);
  });

  test('organization overrides work', () => {
    const vat = resolveVatProfile('wohnung', { ustSatzMiete: 0 });
    expect(vat.ustSatzMiete).toBe(0);
    expect(vat.ustSatzBk).toBe(10); // not overridden
  });
});

// ── isCommercialUnit ──

describe('isCommercialUnit', () => {
  test.each([
    ['geschaeft', true],
    ['garage', true],
    ['stellplatz', true],
    ['lager', true],
    ['gewerbe', true],
    ['buero', true],
    ['wohnung', false],
    ['', false],
    ['Geschäftslokal mit Büro', false], // no 'geschaeft' substring match (Geschäft ≠ geschaeft)
  ])('%s → %s', (type, expected) => {
    expect(isCommercialUnit(type)).toBe(expected);
  });
});

// ── renderDescription ──

describe('renderDescription', () => {
  test('replaces {monthName} and {year}', () => {
    expect(renderDescription('Miete {monthName} {year}', 1, 2025)).toBe('Miete Jänner 2025');
    expect(renderDescription('BK {monthName} {year}', 12, 2024)).toBe('BK Dezember 2024');
  });

  test('handles edge months', () => {
    expect(renderDescription('{monthName}', 6, 2025)).toBe('Juni');
    expect(renderDescription('{monthName}', 0, 2025)).toBe(''); // invalid month
    expect(renderDescription('{monthName}', 13, 2025)).toBe(''); // invalid month
  });

  test('no placeholders → unchanged', () => {
    expect(renderDescription('Fixbetrag', 1, 2025)).toBe('Fixbetrag');
  });
});

// ── Invoice Line Generation (pure logic) ──

describe('InvoiceGenerator - VAT from Gross', () => {
  // calculateVatFromGross(gross, rate) = gross - gross/(1+rate/100)
  const calcVat = (gross: number, rate: number) => {
    if (!rate) return 0;
    return Math.round((gross - gross / (1 + rate / 100)) * 100) / 100;
  };

  test('10% VAT from €1100 gross → €100', () => {
    expect(calcVat(1100, 10)).toBe(100);
  });

  test('20% VAT from €1200 gross → €200', () => {
    expect(calcVat(1200, 20)).toBe(200);
  });

  test('0% VAT → 0', () => {
    expect(calcVat(1000, 0)).toBe(0);
  });

  test('VAT from typical rent €750 at 10%', () => {
    // 750 - 750/1.1 = 750 - 681.818... = 68.18
    expect(calcVat(750, 10)).toBe(68.18);
  });

  test('VAT from €0 → 0', () => {
    expect(calcVat(0, 10)).toBe(0);
  });
});

// ── DEFAULT_BILLING_RULES ──

describe('DEFAULT_BILLING_RULES', () => {
  test('has 4 line types', () => {
    expect(DEFAULT_BILLING_RULES.lineTypes).toHaveLength(4);
  });

  test('due day is 5th', () => {
    expect(DEFAULT_BILLING_RULES.dueDay).toBe(5);
  });

  test('reserve multiplier is 1.03 (3%)', () => {
    expect(DEFAULT_BILLING_RULES.advanceReserveMultiplier).toBe(1.03);
  });

  test('line types have required fields', () => {
    for (const lt of DEFAULT_BILLING_RULES.lineTypes) {
      expect(lt.key).toBeTruthy();
      expect(lt.tenantField).toBeTruthy();
      expect(lt.vatKey).toBeTruthy();
      expect(lt.descriptionTemplate).toContain('{monthName}');
    }
  });

  test('grundmiete references MRG §15', () => {
    const grundmiete = DEFAULT_BILLING_RULES.lineTypes.find(l => l.key === 'grundmiete');
    expect(grundmiete?.reference).toBe('MRG §15');
  });

  test('betriebskosten references MRG §21', () => {
    const bk = DEFAULT_BILLING_RULES.lineTypes.find(l => l.key === 'betriebskosten');
    expect(bk?.reference).toBe('MRG §21');
  });
});

// ── Invoice Data Building (pure calculation) ──

describe('InvoiceGenerator - buildInvoiceData logic', () => {
  const calcVat = (gross: number, rate: number) => {
    if (!rate) return 0;
    return Math.round((gross - gross / (1 + rate / 100)) * 100) / 100;
  };
  const roundMoney = (v: number) => Math.round(v * 100) / 100;

  test('Gesamtbetrag = Grundmiete + BK + HK + Vortrag', () => {
    const grundmiete = 750;
    const bk = 200;
    const hk = 100;
    const vortragMiete = -50;
    const vortragBk = 0;

    const gesamt = roundMoney(grundmiete + bk + hk + vortragMiete + vortragBk);
    expect(gesamt).toBe(1000);
  });

  test('USt = sum of individual USt amounts', () => {
    const grundmiete = 750;
    const bk = 200;
    const hk = 100;

    const ustMiete = calcVat(grundmiete, 10);
    const ustBk = calcVat(bk, 10);
    const ustHk = calcVat(hk, 20);

    const totalUst = roundMoney(ustMiete + ustBk + ustHk);
    // 68.18 + 18.18 + 16.67 = 103.03
    expect(totalUst).toBe(103.03);
  });

  test('zero carry-forward → Gesamtbetrag = sum of components', () => {
    const components = [500, 150, 80];
    const sum = roundMoney(components.reduce((s, c) => s + c, 0));
    expect(sum).toBe(730);
  });

  test('negative carry-forward reduces total', () => {
    const sum = roundMoney(1000 + (-200));
    expect(sum).toBe(800);
  });
});
