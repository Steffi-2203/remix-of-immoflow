import { describe, test, expect } from 'vitest';
import {
  calculateMonthlyDistribution,
  checkMinReserve,
  type WegBusinessPlanItem,
} from '@/hooks/useWegBusinessPlan';

/**
 * WEG Compliance-Testsuite
 *
 * Prüft die Berechnungen für Wohnungseigentümergemeinschaften:
 * - Monatliche Vorschreibung nach MEA (Nutzwert)
 * - USt-Berechnung (10%/20%)
 * - Rücklage: steuerfrei, Mindestdotierung §31 WEG (0,90 €/m²/Monat)
 * - Aliquotierung bei Eigentümerwechsel (§34 WEG)
 * - Rundungsdeterminismus
 */

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// ── Helpers ──

function makeOwners(entries: Array<{ id: string; mea: number }>) {
  return entries.map(e => ({
    ownerId: e.id,
    ownerName: `Eigentümer ${e.id}`,
    unitId: `unit-${e.id}`,
    mea: e.mea,
    qm: e.mea, // simplified
  }));
}

function makePlanItem(overrides: Partial<WegBusinessPlanItem> & { annual_amount: number; category: string }): WegBusinessPlanItem {
  return {
    id: 'item-1',
    business_plan_id: 'plan-1',
    description: 'Test',
    tax_rate: 10,
    distribution_key: 'mea',
    created_at: new Date().toISOString(),
    ...overrides,
  } as WegBusinessPlanItem;
}

// ── MEA-Verteilung ──

describe('WEG – MEA-basierte Vorschreibung', () => {
  const owners = makeOwners([
    { id: 'A', mea: 100 },
    { id: 'B', mea: 200 },
    { id: 'C', mea: 200 },
  ]);
  // Total MEA = 500

  test('Verteilung proportional zum Nutzwert', () => {
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ annual_amount: 12000, category: 'betriebskosten', tax_rate: 10 }),
    ];
    const result = calculateMonthlyDistribution(items, owners);

    expect(result).toHaveLength(3);
    // A: 100/500 = 20%, monthly = 12000/12 * 0.2 = 200
    expect(result[0].monthlyNet).toBe(200);
    // B: 200/500 = 40%, monthly = 400
    expect(result[1].monthlyNet).toBe(400);
    // C: 200/500 = 40%, monthly = 400
    expect(result[2].monthlyNet).toBe(400);
  });

  test('Summe aller Anteile = Jahresbetrag / 12', () => {
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ annual_amount: 36000, category: 'verwaltung', tax_rate: 20 }),
    ];
    const result = calculateMonthlyDistribution(items, owners);
    const totalNet = roundMoney(result.reduce((s, r) => s + r.monthlyNet, 0));
    expect(totalNet).toBe(3000); // 36000 / 12
  });

  test('leeres ownerUnits → leeres Ergebnis', () => {
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ annual_amount: 12000, category: 'betriebskosten' }),
    ];
    expect(calculateMonthlyDistribution(items, [])).toEqual([]);
  });

  test('totalMea = 0 → leeres Ergebnis', () => {
    const zeroOwners = makeOwners([{ id: 'X', mea: 0 }]);
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ annual_amount: 12000, category: 'betriebskosten' }),
    ];
    expect(calculateMonthlyDistribution(items, zeroOwners)).toEqual([]);
  });
});

// ── USt-Berechnung ──

describe('WEG – USt-Berechnung', () => {
  const owners = makeOwners([{ id: 'A', mea: 100 }]);

  test('10% USt auf Betriebskosten', () => {
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ annual_amount: 12000, category: 'betriebskosten', tax_rate: 10 }),
    ];
    const result = calculateMonthlyDistribution(items, owners);
    // monthly = 1000, tax = 1000 * 0.10 = 100
    expect(result[0].monthlyNet).toBe(1000);
    expect(result[0].monthlyTax).toBe(100);
  });

  test('20% USt auf Verwaltung', () => {
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ annual_amount: 12000, category: 'verwaltung', tax_rate: 20 }),
    ];
    const result = calculateMonthlyDistribution(items, owners);
    expect(result[0].monthlyTax).toBe(200); // 1000 * 0.20
  });

  test('Brutto = Netto + USt + Rücklage', () => {
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ annual_amount: 12000, category: 'betriebskosten', tax_rate: 10 }),
      makePlanItem({ id: 'item-2', annual_amount: 6000, category: 'ruecklage', tax_rate: 0 }),
    ];
    const result = calculateMonthlyDistribution(items, owners);
    // BK: net=1000, tax=100, reserve: 500
    expect(result[0].monthlyGross).toBe(1600); // 1000 + 100 + 500
  });
});

// ── Rücklage ──

describe('WEG – Rücklage (steuerfrei)', () => {
  const owners = makeOwners([
    { id: 'A', mea: 100 },
    { id: 'B', mea: 100 },
  ]);

  test('Rücklage wird nicht besteuert', () => {
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ annual_amount: 24000, category: 'ruecklage', tax_rate: 0 }),
    ];
    const result = calculateMonthlyDistribution(items, owners);
    // Each: 24000/12 * 0.5 = 1000
    expect(result[0].reserveContribution).toBe(1000);
    expect(result[0].monthlyTax).toBe(0);
    expect(result[0].monthlyNet).toBe(0); // Rücklage zählt nicht zu net
  });

  test('Rücklage wird separat ausgewiesen', () => {
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ annual_amount: 12000, category: 'betriebskosten', tax_rate: 10 }),
      makePlanItem({ id: 'r1', annual_amount: 6000, category: 'ruecklage', tax_rate: 0 }),
    ];
    const result = calculateMonthlyDistribution(items, owners);
    // Each owner 50%: BK net=500, BK tax=50, reserve=250
    expect(result[0].monthlyNet).toBe(500);
    expect(result[0].monthlyTax).toBe(50);
    expect(result[0].reserveContribution).toBe(250);
    expect(result[0].monthlyGross).toBe(800); // 500+50+250
  });
});

// ── Mindestrücklage §31 WEG ──

describe('WEG – Mindestrücklage (0,90 €/m²/Monat)', () => {
  test('ausreichende Rücklage wird bestätigt', () => {
    // 500 m², 0.90 * 12 * 500 = 5400 Minimum
    const result = checkMinReserve(6000, 500);
    expect(result.ok).toBe(true);
    expect(result.perQmMonth).toBe(1); // 6000/12/500
    expect(result.minimum).toBe(0.9);
  });

  test('unzureichende Rücklage wird erkannt', () => {
    // 500 m², Minimum = 5400, nur 4800 dotiert
    const result = checkMinReserve(4800, 500);
    expect(result.ok).toBe(false);
    expect(result.perQmMonth).toBe(0.8); // 4800/12/500
  });

  test('exakt am Minimum ist ok', () => {
    // 0.90 * 12 * 100 = 1080
    const result = checkMinReserve(1080, 100);
    expect(result.ok).toBe(true);
    expect(result.perQmMonth).toBe(0.9);
  });

  test('0 m² → perQmMonth = 0, nicht ok', () => {
    const result = checkMinReserve(5000, 0);
    expect(result.ok).toBe(false);
    expect(result.perQmMonth).toBe(0);
  });
});

// ── Aliquotierung §34 WEG ──

describe('WEG §34 – Aliquotierung bei Eigentümerwechsel', () => {
  function prorateAmount(monthlyAmount: number, daysInMonth: number, ownerDays: number): number {
    return roundMoney(monthlyAmount * (ownerDays / daysInMonth));
  }

  test('Wechsel am 15. März → alter Eigentümer: 14 Tage, neuer: 17 Tage', () => {
    const monthly = 1000;
    const daysInMarch = 31;
    const oldOwnerDays = 14; // 1.-14. März
    const newOwnerDays = 17; // 15.-31. März

    const oldShare = prorateAmount(monthly, daysInMarch, oldOwnerDays);
    const newShare = prorateAmount(monthly, daysInMarch, newOwnerDays);

    expect(oldShare).toBe(451.61);
    expect(newShare).toBe(548.39);
    expect(roundMoney(oldShare + newShare)).toBe(monthly);
  });

  test('Wechsel am 1. des Monats → neuer Eigentümer zahlt alles', () => {
    const monthly = 800;
    const daysInMonth = 30;

    const oldShare = prorateAmount(monthly, daysInMonth, 0);
    const newShare = prorateAmount(monthly, daysInMonth, 30);

    expect(oldShare).toBe(0);
    expect(newShare).toBe(800);
  });

  test('Wechsel am letzten Tag → alter Eigentümer zahlt fast alles', () => {
    const monthly = 600;
    const daysInMonth = 31;

    const oldShare = prorateAmount(monthly, daysInMonth, 30);
    const newShare = prorateAmount(monthly, daysInMonth, 1);

    expect(roundMoney(oldShare + newShare)).toBe(monthly);
    expect(oldShare).toBe(580.65);
    expect(newShare).toBe(19.35);
  });
});

// ── Mehrere Positionen ──

describe('WEG – Kombinierter Wirtschaftsplan', () => {
  test('BK + Verwaltung + Rücklage korrekt kombiniert', () => {
    const owners = makeOwners([
      { id: 'A', mea: 300 },
      { id: 'B', mea: 200 },
    ]);
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ id: 'i1', annual_amount: 24000, category: 'betriebskosten', tax_rate: 10 }),
      makePlanItem({ id: 'i2', annual_amount: 6000, category: 'verwaltung', tax_rate: 20 }),
      makePlanItem({ id: 'i3', annual_amount: 5400, category: 'ruecklage', tax_rate: 0 }),
    ];

    const result = calculateMonthlyDistribution(items, owners);

    // Owner A: 300/500 = 60%
    // BK: 24000/12 * 0.6 = 1200 net, 120 tax
    // Verwaltung: 6000/12 * 0.6 = 300 net, 60 tax
    // Rücklage: 5400/12 * 0.6 = 270
    const ownerA = result.find(r => r.ownerId === 'A')!;
    expect(ownerA.monthlyNet).toBe(1500); // 1200 + 300
    expect(ownerA.monthlyTax).toBe(180);  // 120 + 60
    expect(ownerA.reserveContribution).toBe(270);
    expect(ownerA.monthlyGross).toBe(1950); // 1500 + 180 + 270
  });
});

// ── Rundungsdeterminismus ──

describe('WEG – Rundungsdeterminismus', () => {
  test('identische Eingaben → identische Ausgaben', () => {
    const owners = makeOwners([
      { id: 'A', mea: 137 },
      { id: 'B', mea: 263 },
      { id: 'C', mea: 100 },
    ]);
    const items: WegBusinessPlanItem[] = [
      makePlanItem({ annual_amount: 17777, category: 'betriebskosten', tax_rate: 10 }),
    ];

    const run1 = calculateMonthlyDistribution(items, owners);
    const run2 = calculateMonthlyDistribution(items, owners);

    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].monthlyNet).toBe(run2[i].monthlyNet);
      expect(run1[i].monthlyTax).toBe(run2[i].monthlyTax);
      expect(run1[i].monthlyGross).toBe(run2[i].monthlyGross);
      expect(run1[i].reserveContribution).toBe(run2[i].reserveContribution);
    }
  });

  test('floating-point Edge-Cases', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1); // IEEE754: 1.005*100 = 100.4999...
  });
});
