/**
 * Tests: MRG §27 Deposit Interest Calculation (refined with variable rates)
 */
import { describe, it, expect } from "vitest";
import {
  calculateDepositInterest,
  calculateDepositRefund,
  type DepositInterestInput,
} from "../../server/services/depositInterestService";

describe("MRG §27 Deposit Interest – Fixed Rate", () => {
  it("calculates 1-year interest at 1.5% for Barkaution", () => {
    const input: DepositInterestInput = {
      depositType: "bar",
      amount: 3000,
      depositDate: "2025-01-01",
      endDate: "2026-01-01",
      fixedRate: 1.5,
    };
    const result = calculateDepositInterest(input);
    expect(result.totalInterest).toBeCloseTo(45, 0);
    expect(result.grossRefund).toBeCloseTo(3045, 0);
    expect(result.periods).toHaveLength(1);
  });

  it("returns 0 interest for Bankgarantie", () => {
    const input: DepositInterestInput = {
      depositType: "bankgarantie",
      amount: 5000,
      depositDate: "2024-01-01",
      endDate: "2025-01-01",
      fixedRate: 2.0,
    };
    const result = calculateDepositInterest(input);
    expect(result.totalInterest).toBe(0);
    expect(result.grossRefund).toBe(5000);
  });

  it("returns 0 interest for Versicherung", () => {
    const input: DepositInterestInput = {
      depositType: "versicherung",
      amount: 3000,
      depositDate: "2024-01-01",
      endDate: "2025-01-01",
      fixedRate: 1.0,
    };
    expect(calculateDepositInterest(input).totalInterest).toBe(0);
  });

  it("calculates interest for Sparbuch type", () => {
    const input: DepositInterestInput = {
      depositType: "sparbuch",
      amount: 4000,
      depositDate: "2025-01-01",
      endDate: "2026-01-01",
      fixedRate: 2.0,
    };
    const result = calculateDepositInterest(input);
    expect(result.totalInterest).toBeCloseTo(80, 0);
  });

  it("returns 0 for same-day deposit/end", () => {
    const input: DepositInterestInput = {
      depositType: "bar",
      amount: 3000,
      depositDate: "2025-06-01",
      endDate: "2025-06-01",
      fixedRate: 1.5,
    };
    expect(calculateDepositInterest(input).totalInterest).toBe(0);
  });

  it("returns 0 for negative duration", () => {
    const input: DepositInterestInput = {
      depositType: "bar",
      amount: 3000,
      depositDate: "2025-06-01",
      endDate: "2025-01-01",
      fixedRate: 1.5,
    };
    expect(calculateDepositInterest(input).totalInterest).toBe(0);
  });
});

describe("MRG §27 Deposit Interest – Variable Rates", () => {
  it("applies different rates across periods", () => {
    const input: DepositInterestInput = {
      depositType: "bar",
      amount: 3000,
      depositDate: "2023-01-01",
      endDate: "2025-01-01",
      ratePeriods: [
        { from: "2023-01-01", to: "2024-01-01", rate: 0.5 },
        { from: "2024-01-01", to: null, rate: 1.5 },
      ],
    };
    const result = calculateDepositInterest(input);
    expect(result.periods).toHaveLength(2);
    // Year 1: 3000 * 0.005 * (365/365) ≈ 15
    expect(result.periods[0].interest).toBeCloseTo(15, 0);
    // Year 2: 3000 * 0.015 * (366/365) ≈ 45 (2024 is leap year)
    expect(result.periods[1].interest).toBeCloseTo(45, 0);
    expect(result.totalInterest).toBeCloseTo(60, 0);
  });

  it("handles deposit date within a rate period", () => {
    const input: DepositInterestInput = {
      depositType: "bar",
      amount: 2000,
      depositDate: "2024-07-01",
      endDate: "2025-01-01",
      ratePeriods: [
        { from: "2024-01-01", to: "2025-01-01", rate: 2.0 },
      ],
    };
    const result = calculateDepositInterest(input);
    expect(result.periods).toHaveLength(1);
    // ~184 days / 365 * 2000 * 0.02
    expect(result.totalInterest).toBeCloseTo(20.16, 1);
  });

  it("ignores rate periods outside deposit range", () => {
    const input: DepositInterestInput = {
      depositType: "bar",
      amount: 1000,
      depositDate: "2025-01-01",
      endDate: "2025-06-01",
      ratePeriods: [
        { from: "2023-01-01", to: "2024-01-01", rate: 5.0 }, // before deposit
        { from: "2025-01-01", to: null, rate: 1.0 },
      ],
    };
    const result = calculateDepositInterest(input);
    // Only the second period should contribute
    expect(result.periods).toHaveLength(1);
    expect(result.periods[0].rate).toBe(1.0);
  });
});

describe("MRG §27 Deposit Refund with Deductions", () => {
  it("calculates net refund after deductions", () => {
    const input: DepositInterestInput = {
      depositType: "bar",
      amount: 3000,
      depositDate: "2024-01-01",
      endDate: "2025-01-01",
      fixedRate: 1.5,
    };
    const result = calculateDepositRefund(input, [500, 150]);
    expect(result.totalDeductions).toBe(650);
    expect(result.netRefund).toBeCloseTo(3045 - 650, 0);
  });

  it("net refund is 0 when deductions exceed deposit+interest", () => {
    const input: DepositInterestInput = {
      depositType: "bar",
      amount: 1000,
      depositDate: "2024-01-01",
      endDate: "2025-01-01",
      fixedRate: 1.0,
    };
    const result = calculateDepositRefund(input, [800, 300]);
    expect(result.netRefund).toBe(0);
  });
});
