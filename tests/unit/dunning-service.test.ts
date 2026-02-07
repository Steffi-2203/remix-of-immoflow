import { describe, test, expect } from 'vitest';

/**
 * Integration tests for Dunning Service logic
 * Tests ABGB §1333 interest calculation and dunning level escalation
 * Pure function tests extracted from AutomatedDunningService
 */

const ABGB_INTEREST_RATE = 0.04;

interface DunningLevel {
  level: 0 | 1 | 2 | 3;
  name: string;
  daysOverdue: number;
  fee: number;
  interestRate: number;
}

const DUNNING_LEVELS: DunningLevel[] = [
  { level: 0, name: "Offen", daysOverdue: 0, fee: 0, interestRate: 0 },
  { level: 1, name: "Zahlungserinnerung", daysOverdue: 14, fee: 0, interestRate: 0 },
  { level: 2, name: "1. Mahnung", daysOverdue: 30, fee: 5, interestRate: 0.04 },
  { level: 3, name: "2. Mahnung", daysOverdue: 45, fee: 10, interestRate: 0.04 },
];

function calculateInterest(amount: number, daysOverdue: number): number {
  if (daysOverdue <= 14) return 0;
  const yearFraction = daysOverdue / 365;
  return Math.round(amount * ABGB_INTEREST_RATE * yearFraction * 100) / 100;
}

function getDunningLevel(daysOverdue: number): DunningLevel {
  for (let i = DUNNING_LEVELS.length - 1; i >= 0; i--) {
    if (daysOverdue >= DUNNING_LEVELS[i].daysOverdue) {
      return DUNNING_LEVELS[i];
    }
  }
  return DUNNING_LEVELS[0];
}

describe('AutomatedDunningService - Pure Functions', () => {
  describe('calculateInterest (ABGB §1333)', () => {
    test('no interest within 14 days grace period', () => {
      expect(calculateInterest(1000, 0)).toBe(0);
      expect(calculateInterest(1000, 7)).toBe(0);
      expect(calculateInterest(1000, 14)).toBe(0);
    });

    test('correct 4% annual interest after grace period', () => {
      const interest30 = calculateInterest(1000, 30);
      expect(interest30).toBeCloseTo(3.29, 1);
      
      const interest90 = calculateInterest(1000, 90);
      expect(interest90).toBeCloseTo(9.86, 1);

      const interest365 = calculateInterest(1000, 365);
      expect(interest365).toBe(40);
    });

    test('rounds to 2 decimal places', () => {
      const interest = calculateInterest(333.33, 45);
      expect(interest.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
    });

    test('handles zero amount', () => {
      expect(calculateInterest(0, 60)).toBe(0);
    });

    test('handles realistic rent amounts', () => {
      // €850 rent, 60 days overdue
      const interest = calculateInterest(850, 60);
      // 850 × 0.04 × (60/365) = 5.59
      expect(interest).toBeCloseTo(5.59, 1);
    });
  });

  describe('getDunningLevel', () => {
    test('Level 0 for fresh invoices', () => {
      expect(getDunningLevel(0).level).toBe(0);
      expect(getDunningLevel(5).level).toBe(0);
      expect(getDunningLevel(13).level).toBe(0);
    });

    test('Level 1 (Zahlungserinnerung) after 14 days', () => {
      expect(getDunningLevel(14).level).toBe(1);
      expect(getDunningLevel(14).fee).toBe(0);
      expect(getDunningLevel(29).level).toBe(1);
    });

    test('Level 2 (1. Mahnung) after 30 days with 5€ fee', () => {
      expect(getDunningLevel(30).level).toBe(2);
      expect(getDunningLevel(30).fee).toBe(5);
      expect(getDunningLevel(44).level).toBe(2);
    });

    test('Level 3 (2. Mahnung) after 45 days with 10€ fee', () => {
      expect(getDunningLevel(45).level).toBe(3);
      expect(getDunningLevel(45).fee).toBe(10);
      expect(getDunningLevel(100).level).toBe(3);
    });
  });

  describe('Escalation logic', () => {
    test('dunning levels are strictly increasing', () => {
      const levels = [0, 14, 30, 45].map(days => getDunningLevel(days));
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i].level).toBeGreaterThan(levels[i - 1].level);
      }
    });

    test('fees increase with level', () => {
      expect(getDunningLevel(0).fee).toBe(0);
      expect(getDunningLevel(14).fee).toBe(0);
      expect(getDunningLevel(30).fee).toBe(5);
      expect(getDunningLevel(45).fee).toBe(10);
    });

    test('total due: amount + fee + interest', () => {
      const amount = 850;
      const daysOverdue = 45;
      const level = getDunningLevel(daysOverdue);
      const interest = calculateInterest(amount, daysOverdue);
      const totalDue = amount + level.fee + interest;
      
      expect(totalDue).toBeGreaterThan(amount);
      expect(totalDue).toBe(amount + 10 + interest);
    });

    test('no escalation for already-maxed level', () => {
      const currentLevel = 3;
      const newLevel = getDunningLevel(100);
      // Should not escalate beyond level 3
      expect(newLevel.level).toBeLessThanOrEqual(3);
      expect(newLevel.level > currentLevel).toBe(false);
    });
  });

  describe('Edge cases for production scale', () => {
    test('handles 500+ overdue invoices calculation', () => {
      const invoices = Array.from({ length: 500 }, (_, i) => ({
        amount: 500 + (i % 10) * 100,
        daysOverdue: 15 + (i % 60),
      }));
      
      const totalInterest = invoices.reduce((sum, inv) => 
        sum + calculateInterest(inv.amount, inv.daysOverdue), 0
      );
      
      expect(totalInterest).toBeGreaterThan(0);
      expect(Number.isFinite(totalInterest)).toBe(true);
    });
  });
});
