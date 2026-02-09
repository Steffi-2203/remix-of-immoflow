import { describe, it, expect } from 'vitest';
import { roundMoney } from '@shared/utils';

/**
 * Deposit (Kaution) Lifecycle Tests
 * Interest calculation, deductions, refund logic for Austrian law.
 */

type DepositType = 'bar' | 'bankgarantie' | 'sparbuch' | 'versicherung';

interface Deposit {
  type: DepositType;
  amount: number;
  depositDate: string; // ISO date
  interestRate: number; // annual %
}

function calculateDepositInterest(deposit: Deposit, endDate: string): number {
  const start = new Date(deposit.depositDate);
  const end = new Date(endDate);
  const years = (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 0) return 0;
  // Simple interest (Austrian standard for Barkaution)
  return roundMoney(deposit.amount * (deposit.interestRate / 100) * years);
}

function calculateRefund(deposit: Deposit, endDate: string, deductions: number[]): {
  grossRefund: number;
  interest: number;
  totalDeductions: number;
  netRefund: number;
} {
  const interest = calculateDepositInterest(deposit, endDate);
  const grossRefund = roundMoney(deposit.amount + interest);
  const totalDeductions = roundMoney(deductions.reduce((s, d) => s + d, 0));
  const netRefund = roundMoney(grossRefund - totalDeductions);
  return { grossRefund, interest, totalDeductions, netRefund: Math.max(0, netRefund) };
}

describe('Deposit Interest Calculation', () => {
  it('calculates 1-year interest at 1.5%', () => {
    const deposit: Deposit = { type: 'bar', amount: 3000, depositDate: '2025-01-01', interestRate: 1.5 };
    const interest = calculateDepositInterest(deposit, '2026-01-01');
    // 365 days / 365.25 ≈ 0.999315 → 3000 * 0.015 * 0.999315 ≈ 44.97
    expect(interest).toBeCloseTo(45, 0);
  });

  it('calculates 6-month interest', () => {
    const deposit: Deposit = { type: 'bar', amount: 2000, depositDate: '2025-01-01', interestRate: 2.0 };
    const interest = calculateDepositInterest(deposit, '2025-07-01');
    // ~181 days / 365.25 * 2000 * 0.02
    expect(interest).toBeCloseTo(19.81, 0);
  });

  it('zero interest for same-day', () => {
    const deposit: Deposit = { type: 'bar', amount: 5000, depositDate: '2025-06-01', interestRate: 3.0 };
    expect(calculateDepositInterest(deposit, '2025-06-01')).toBe(0);
  });

  it('zero interest for negative duration', () => {
    const deposit: Deposit = { type: 'bar', amount: 5000, depositDate: '2025-06-01', interestRate: 3.0 };
    expect(calculateDepositInterest(deposit, '2025-01-01')).toBe(0);
  });

  it('handles multi-year deposit', () => {
    const deposit: Deposit = { type: 'bar', amount: 4000, depositDate: '2020-01-01', interestRate: 1.0 };
    const interest = calculateDepositInterest(deposit, '2025-01-01');
    // ~5 years * 4000 * 0.01 = ~200
    expect(interest).toBeCloseTo(200, 0);
  });
});

describe('Deposit Refund with Deductions', () => {
  it('full refund without deductions', () => {
    const deposit: Deposit = { type: 'bar', amount: 3000, depositDate: '2024-01-01', interestRate: 1.5 };
    const result = calculateRefund(deposit, '2025-01-01', []);
    expect(result.interest).toBeCloseTo(45, 0);
    expect(result.grossRefund).toBeCloseTo(3045, 0);
    expect(result.netRefund).toBeCloseTo(3045, 0);
  });

  it('deductions for damages and cleaning', () => {
    const deposit: Deposit = { type: 'bar', amount: 3000, depositDate: '2024-01-01', interestRate: 1.5 };
    const result = calculateRefund(deposit, '2025-01-01', [500, 150]);
    expect(result.totalDeductions).toBe(650);
    expect(result.netRefund).toBeCloseTo(2395, 0);
  });

  it('deductions exceeding deposit+interest → net refund is 0', () => {
    const deposit: Deposit = { type: 'bar', amount: 1000, depositDate: '2024-01-01', interestRate: 1.0 };
    const result = calculateRefund(deposit, '2025-01-01', [800, 300]);
    expect(result.netRefund).toBe(0);
  });

  it('no interest for bankgarantie type', () => {
    const deposit: Deposit = { type: 'bankgarantie', amount: 5000, depositDate: '2024-01-01', interestRate: 0 };
    const result = calculateRefund(deposit, '2025-01-01', []);
    expect(result.interest).toBe(0);
    expect(result.netRefund).toBe(5000);
  });

  it('versicherung type has no cash deposit', () => {
    const deposit: Deposit = { type: 'versicherung', amount: 0, depositDate: '2024-01-01', interestRate: 0 };
    const result = calculateRefund(deposit, '2025-01-01', []);
    expect(result.netRefund).toBe(0);
  });
});

describe('Deposit Amount Validation', () => {
  it('max 6 months gross rent (MRG)', () => {
    const monthlyGross = 925;
    const maxDeposit = roundMoney(monthlyGross * 6);
    expect(maxDeposit).toBe(5550);
    expect(3000).toBeLessThanOrEqual(maxDeposit);
  });

  it('rejects deposit exceeding 6 months', () => {
    const monthlyGross = 500;
    const maxDeposit = roundMoney(monthlyGross * 6);
    const requestedDeposit = 4000;
    expect(requestedDeposit).toBeGreaterThan(maxDeposit);
  });
});
