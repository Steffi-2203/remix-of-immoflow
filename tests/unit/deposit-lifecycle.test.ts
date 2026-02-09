import { describe, it, expect } from 'vitest';
import { roundMoney } from '../../shared/utils';

interface DepositDeduction {
  description: string;
  amount: number;
}

interface DeductionResult {
  originalDeposit: number;
  totalDeductions: number;
  remainingDeposit: number;
  appliedDeductions: DepositDeduction[];
  error?: string;
}

interface DepositTypeMetadata {
  type: string;
  label: string;
  requiresBankDetails: boolean;
  interestBearing: boolean;
}

function calculateDepositInterest(principal: number, annualRate: number, days: number): number {
  if (days <= 0 || annualRate < 0) return 0;
  return roundMoney((principal * annualRate * days) / 365);
}

function processDepositDeduction(deposit: number, deductions: DepositDeduction[]): DeductionResult {
  const validDeductions = deductions.filter(d => d.amount > 0);
  const totalDeductions = roundMoney(validDeductions.reduce((sum, d) => sum + d.amount, 0));

  if (totalDeductions > deposit) {
    return {
      originalDeposit: deposit,
      totalDeductions: deposit,
      remainingDeposit: 0,
      appliedDeductions: validDeductions,
      error: 'Abzüge übersteigen Kautionsbetrag',
    };
  }

  return {
    originalDeposit: deposit,
    totalDeductions,
    remainingDeposit: roundMoney(deposit - totalDeductions),
    appliedDeductions: validDeductions,
  };
}

function getDepositType(type: string): DepositTypeMetadata | null {
  const types: Record<string, DepositTypeMetadata> = {
    bar: { type: 'bar', label: 'Barkaution', requiresBankDetails: false, interestBearing: true },
    bankgarantie: { type: 'bankgarantie', label: 'Bankgarantie', requiresBankDetails: true, interestBearing: false },
    sparbuch: { type: 'sparbuch', label: 'Sparbuch', requiresBankDetails: true, interestBearing: true },
  };
  return types[type] || null;
}

describe('Deposit (Kaution) Lifecycle', () => {
  describe('Interest Calculation', () => {
    it('interest calculation for 1 year at 0.5%', () => {
      const interest = calculateDepositInterest(3000, 0.005, 365);
      expect(interest).toBe(15);
    });

    it('interest calculation for 6 months', () => {
      const interest = calculateDepositInterest(3000, 0.005, 182);
      expect(interest).toBe(roundMoney(3000 * 0.005 * 182 / 365));
    });

    it('interest calculation for 0 days returns 0', () => {
      expect(calculateDepositInterest(3000, 0.005, 0)).toBe(0);
    });

    it('interest with negative rate returns 0', () => {
      expect(calculateDepositInterest(3000, -0.01, 365)).toBe(0);
    });
  });

  describe('Deposit Deductions', () => {
    it('single deduction', () => {
      const result = processDepositDeduction(3000, [
        { description: 'Malerarbeiten', amount: 500 },
      ]);
      expect(result.totalDeductions).toBe(500);
      expect(result.remainingDeposit).toBe(2500);
    });

    it('multiple deductions', () => {
      const result = processDepositDeduction(3000, [
        { description: 'Malerarbeiten', amount: 500 },
        { description: 'Reinigung', amount: 200 },
        { description: 'Schlüsselersatz', amount: 80 },
      ]);
      expect(result.totalDeductions).toBe(780);
      expect(result.remainingDeposit).toBe(2220);
    });

    it('deductions cannot exceed deposit amount', () => {
      const result = processDepositDeduction(1000, [
        { description: 'Sanierung', amount: 800 },
        { description: 'Reinigung', amount: 500 },
      ]);
      expect(result.error).toContain('übersteigen');
      expect(result.remainingDeposit).toBe(0);
    });

    it('deduction with zero amount is skipped', () => {
      const result = processDepositDeduction(3000, [
        { description: 'Malerarbeiten', amount: 500 },
        { description: 'Nichts', amount: 0 },
      ]);
      expect(result.appliedDeductions).toHaveLength(1);
      expect(result.totalDeductions).toBe(500);
      expect(result.remainingDeposit).toBe(2500);
    });
  });

  describe('Deposit Types', () => {
    it('Bar deposit type returns correct metadata', () => {
      const meta = getDepositType('bar');
      expect(meta).not.toBeNull();
      expect(meta!.label).toBe('Barkaution');
      expect(meta!.requiresBankDetails).toBe(false);
      expect(meta!.interestBearing).toBe(true);
    });

    it('Bankgarantie deposit type', () => {
      const meta = getDepositType('bankgarantie');
      expect(meta).not.toBeNull();
      expect(meta!.label).toBe('Bankgarantie');
      expect(meta!.requiresBankDetails).toBe(true);
      expect(meta!.interestBearing).toBe(false);
    });

    it('Sparbuch deposit type', () => {
      const meta = getDepositType('sparbuch');
      expect(meta).not.toBeNull();
      expect(meta!.label).toBe('Sparbuch');
      expect(meta!.requiresBankDetails).toBe(true);
      expect(meta!.interestBearing).toBe(true);
    });
  });

  describe('Full Lifecycle', () => {
    it('deposit -> interest -> deductions -> refund calculation', () => {
      const principal = 3000;
      const annualRate = 0.005;
      const tenancyDays = 730;

      const interest = calculateDepositInterest(principal, annualRate, tenancyDays);
      const totalWithInterest = roundMoney(principal + interest);

      expect(interest).toBe(30);
      expect(totalWithInterest).toBe(3030);

      const deductionResult = processDepositDeduction(totalWithInterest, [
        { description: 'Malerarbeiten', amount: 400 },
        { description: 'Reinigung', amount: 150 },
      ]);

      expect(deductionResult.totalDeductions).toBe(550);
      const refundAmount = deductionResult.remainingDeposit;
      expect(refundAmount).toBe(2480);
    });
  });
});
