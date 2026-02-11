/**
 * server/services/depositInterestService.ts
 *
 * MRG §27 Abs 1: Kautionszinsen-Berechnung.
 *
 * Bei Barkautionen muss der Vermieter die Kaution verzinst zurückgeben.
 * Die Zinsen entsprechen dem Sparbuchzinssatz (angemessene Veranlagung).
 * Dieser Service unterstützt:
 *  - Variable Zinssätze (jährlich anpassbar)
 *  - Tagesgenaue Berechnung (act/365)
 *  - Nur Barkaution/Sparbuch wird verzinst (Bankgarantie/Versicherung = 0)
 */

import { billingLogger } from "../lib/logger";

const logger = billingLogger.child({ module: "deposit-interest" });

export type DepositType = "bar" | "bankgarantie" | "sparbuch" | "versicherung";

/** A single interest rate period. Rates are applied chronologically. */
export interface InterestRatePeriod {
  /** Start date of this rate (inclusive), ISO string */
  from: string;
  /** End date of this rate (exclusive), ISO string. null = open-ended */
  to: string | null;
  /** Annual interest rate as percentage (e.g. 1.5 = 1.5% p.a.) */
  rate: number;
}

export interface DepositInterestInput {
  depositType: DepositType;
  amount: number;
  depositDate: string;
  /** End date for calculation (e.g. move-out date) */
  endDate: string;
  /**
   * Variable rate schedule. If empty/null, falls back to a single fixed rate.
   * Periods should be sorted chronologically and non-overlapping.
   */
  ratePeriods?: InterestRatePeriod[];
  /** Fallback fixed rate if no ratePeriods provided (percentage) */
  fixedRate?: number;
}

export interface DepositInterestResult {
  principal: number;
  totalInterest: number;
  grossRefund: number;
  periods: {
    from: string;
    to: string;
    rate: number;
    days: number;
    interest: number;
  }[];
}

const INTEREST_BEARING_TYPES: DepositType[] = ["bar", "sparbuch"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / MS_PER_DAY));
}

function roundMoney(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Calculate deposit interest per MRG §27.
 * Supports variable rate periods for accurate Sparbuchzins tracking.
 */
export function calculateDepositInterest(input: DepositInterestInput): DepositInterestResult {
  const { depositType, amount, depositDate, endDate } = input;

  // Non-interest-bearing types
  if (!INTEREST_BEARING_TYPES.includes(depositType) || amount <= 0) {
    return { principal: amount, totalInterest: 0, grossRefund: amount, periods: [] };
  }

  const start = new Date(depositDate);
  const end = new Date(endDate);

  if (end <= start) {
    return { principal: amount, totalInterest: 0, grossRefund: amount, periods: [] };
  }

  // Build effective rate periods
  const ratePeriods = input.ratePeriods && input.ratePeriods.length > 0
    ? input.ratePeriods
    : [{ from: depositDate, to: null, rate: input.fixedRate ?? 0 }];

  const periods: DepositInterestResult["periods"] = [];
  let totalInterest = 0;

  for (const rp of ratePeriods) {
    const periodStart = new Date(Math.max(start.getTime(), new Date(rp.from).getTime()));
    const periodEnd = rp.to
      ? new Date(Math.min(end.getTime(), new Date(rp.to).getTime()))
      : new Date(end.getTime());

    if (periodEnd <= periodStart) continue;

    const days = daysBetween(periodStart, periodEnd);
    if (days <= 0) continue;

    // act/365 day count convention
    const interest = roundMoney(amount * (rp.rate / 100) * (days / 365));
    totalInterest += interest;

    periods.push({
      from: periodStart.toISOString().split("T")[0],
      to: periodEnd.toISOString().split("T")[0],
      rate: rp.rate,
      days,
      interest,
    });
  }

  totalInterest = roundMoney(totalInterest);

  logger.info(
    { depositType, amount, depositDate, endDate, totalInterest, periodCount: periods.length },
    "MRG §27: Deposit interest calculated"
  );

  return {
    principal: amount,
    totalInterest,
    grossRefund: roundMoney(amount + totalInterest),
    periods,
  };
}

/**
 * Calculate full deposit refund including deductions.
 * MRG §27 Abs 1: Kaution + Zinsen - berechtigte Abzüge
 */
export function calculateDepositRefund(
  input: DepositInterestInput,
  deductions: number[] = []
): {
  interest: DepositInterestResult;
  totalDeductions: number;
  netRefund: number;
} {
  const interest = calculateDepositInterest(input);
  const totalDeductions = roundMoney(deductions.reduce((s, d) => s + d, 0));
  const netRefund = Math.max(0, roundMoney(interest.grossRefund - totalDeductions));

  return { interest, totalDeductions, netRefund };
}
