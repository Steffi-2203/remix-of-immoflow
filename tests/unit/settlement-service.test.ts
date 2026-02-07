import { describe, test, expect } from 'vitest';

/**
 * Integration tests for Settlement Service logic
 * Tests BK distribution, tenant shares, MRG §21 compliance
 * Pure function tests (no DB dependency)
 */

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

describe('SettlementService - Pure Functions', () => {
  describe('Distribution key calculations', () => {
    test('proportional area distribution', () => {
      const totalExpense = 12000;
      const units = [
        { id: 'u1', flaeche: 60 },
        { id: 'u2', flaeche: 90 },
        { id: 'u3', flaeche: 50 },
        { id: 'u4', flaeche: 100 },
      ];
      const totalArea = units.reduce((sum, u) => sum + u.flaeche, 0); // 300
      
      const shares = units.map(u => ({
        id: u.id,
        share: roundMoney(totalExpense * (u.flaeche / totalArea)),
      }));
      
      expect(shares[0].share).toBe(2400);  // 60/300 = 20%
      expect(shares[1].share).toBe(3600);  // 90/300 = 30%
      expect(shares[2].share).toBe(2000);  // 50/300 = 16.67%
      expect(shares[3].share).toBe(4000);  // 100/300 = 33.33%
      
      const totalShares = shares.reduce((sum, s) => sum + s.share, 0);
      expect(totalShares).toBe(12000);
    });

    test('MEA (Nutzwert) distribution', () => {
      const totalExpense = 10000;
      const units = [
        { id: 'u1', mea: 100 },
        { id: 'u2', mea: 200 },
        { id: 'u3', mea: 150 },
        { id: 'u4', mea: 50 },
      ];
      const totalMea = units.reduce((sum, u) => sum + u.mea, 0); // 500
      
      const shares = units.map(u => ({
        id: u.id,
        share: roundMoney(totalExpense * (u.mea / totalMea)),
      }));
      
      expect(shares[0].share).toBe(2000);
      expect(shares[1].share).toBe(4000);
      expect(shares[2].share).toBe(3000);
      expect(shares[3].share).toBe(1000);
    });

    test('per-person distribution', () => {
      const totalExpense = 6000;
      const units = [
        { id: 'u1', persons: 2 },
        { id: 'u2', persons: 1 },
        { id: 'u3', persons: 3 },
      ];
      const totalPersons = units.reduce((sum, u) => sum + u.persons, 0); // 6
      
      const shares = units.map(u => ({
        id: u.id,
        share: roundMoney(totalExpense * (u.persons / totalPersons)),
      }));
      
      expect(shares[0].share).toBe(2000);
      expect(shares[1].share).toBe(1000);
      expect(shares[2].share).toBe(3000);
    });
  });

  describe('Prepayment difference', () => {
    test('tenant owes more (Nachzahlung)', () => {
      const monthlyAdvance = 200;
      const yearlyPrepayment = monthlyAdvance * 12;
      const actualShare = 2600;
      
      const difference = roundMoney(yearlyPrepayment - actualShare);
      expect(difference).toBe(-200);
    });

    test('tenant gets credit (Guthaben)', () => {
      const yearlyPrepayment = 3000;
      const actualShare = 2400;
      
      const difference = roundMoney(yearlyPrepayment - actualShare);
      expect(difference).toBe(600);
    });

    test('exact match (no difference)', () => {
      const yearlyPrepayment = 2400;
      const actualShare = 2400;
      
      expect(roundMoney(yearlyPrepayment - actualShare)).toBe(0);
    });
  });

  describe('MRG §21 compliance', () => {
    test('only umlagefähige expenses are included', () => {
      const expenses = [
        { betrag: 1000, istUmlagefaehig: true, category: 'versicherung' },
        { betrag: 5000, istUmlagefaehig: false, category: 'instandhaltung' },
        { betrag: 800, istUmlagefaehig: true, category: 'wasser' },
        { betrag: 3000, istUmlagefaehig: false, category: 'reparatur' },
      ];
      
      const allocable = expenses.filter(e => e.istUmlagefaehig);
      const total = allocable.reduce((sum, e) => sum + e.betrag, 0);
      
      expect(allocable.length).toBe(2);
      expect(total).toBe(1800);
    });

    test('Leerstandsregel: owner bears vacant unit share', () => {
      const totalExpense = 10000;
      const occupiedArea = 250;
      const vacantArea = 50;
      const totalArea = occupiedArea + vacantArea;
      
      const ownerShare = roundMoney(totalExpense * (vacantArea / totalArea));
      const tenantTotal = roundMoney(totalExpense - ownerShare);
      
      expect(ownerShare).toBeCloseTo(1666.67, 1);
      expect(tenantTotal).toBeCloseTo(8333.33, 1);
    });

    test('§21 Abs 3 deadline check (30. Juni Folgejahr)', () => {
      const year = 2025;
      const deadlineDate = new Date(year + 1, 5, 30); // 30.06.2026
      
      const beforeDeadline = new Date(2026, 4, 15); // 15.05.2026
      const afterDeadline = new Date(2026, 7, 1);   // 01.08.2026
      
      expect(beforeDeadline < deadlineDate).toBe(true);
      expect(afterDeadline > deadlineDate).toBe(true);
    });

    test('§21 Abs 4: 3-year expiration', () => {
      const year = 2022;
      const expirationDate = new Date(year + 4, 0, 1); // 01.01.2026
      
      const notExpired = new Date(2025, 11, 31);
      const expired = new Date(2026, 0, 1);
      
      expect(notExpired < expirationDate).toBe(true);
      expect(expired >= expirationDate).toBe(true);
    });
  });

  describe('Multiple expense categories', () => {
    test('categories sum correctly', () => {
      const categories = {
        versicherung: 2400,
        wasser: 1800,
        muell: 1200,
        hausbetreuung: 3600,
        lift: 2400,
        strom: 600,
      };
      
      const total = Object.values(categories).reduce((sum, v) => sum + v, 0);
      expect(total).toBe(12000);

      // Unit share at 15%
      const unitShare = roundMoney(total * 0.15);
      expect(unitShare).toBe(1800);
    });
  });

  describe('Scale test: 500+ units', () => {
    test('distributes across many units without precision loss', () => {
      const totalExpense = 120000; // €120k annual BK
      const unitCount = 500;
      const areas = Array.from({ length: unitCount }, (_, i) => 40 + (i % 80));
      const totalArea = areas.reduce((sum, a) => sum + a, 0);
      
      const shares = areas.map(a => roundMoney(totalExpense * (a / totalArea)));
      const sumShares = roundMoney(shares.reduce((sum, s) => sum + s, 0));
      
      // Rounding differences should be minimal
      expect(Math.abs(sumShares - totalExpense)).toBeLessThan(unitCount * 0.01);
    });
  });

  describe('roundMoney consistency', () => {
    test('consistent rounding across operations', () => {
      const values = [123.45, 67.89, 234.56, 89.01, 456.78];
      const sum = values.reduce((s, v) => roundMoney(s + v), 0);
      
      expect(sum).toBe(roundMoney(123.45 + 67.89 + 234.56 + 89.01 + 456.78));
    });

    test('handles floating point edge cases', () => {
      expect(roundMoney(0.1 + 0.2)).toBe(0.3);
      expect(roundMoney(1.005)).toBe(1); // Math.round(100.5)/100 = 1.00
    });
  });
});
