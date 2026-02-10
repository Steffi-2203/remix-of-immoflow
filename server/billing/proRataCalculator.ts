import { roundMoney } from "@shared/utils";

/**
 * Pro-rata calculator for mid-year tenant changes.
 * Calculates proportional shares based on occupancy days within a period.
 *
 * Austrian MRG: If a tenant moves in/out mid-month, costs are split
 * proportionally by calendar days.
 */

export interface OccupancyPeriod {
  tenantId: string;
  moveIn: Date;
  moveOut: Date | null; // null = still active
}

interface ProRataShare {
  tenantId: string;
  days: number;
  totalDays: number;
  ratio: number;
  amount: number;
}

/**
 * Calculate the number of days a tenant occupied a unit within a given year.
 */
export function calculateOccupancyDays(
  moveIn: Date,
  moveOut: Date | null,
  yearStart: Date,
  yearEnd: Date
): number {
  const effectiveStart = moveIn > yearStart ? moveIn : yearStart;
  const effectiveEnd = moveOut && moveOut < yearEnd ? moveOut : yearEnd;

  if (effectiveStart > effectiveEnd) return 0;

  const diffMs = effectiveEnd.getTime() - effectiveStart.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
}

/**
 * For a given unit and year, calculate each tenant's pro-rata share
 * of a total cost amount based on their occupancy days.
 *
 * Handles:
 * - Single tenant (full year) → 100%
 * - Tenant change mid-year → proportional split
 * - Vacancy periods → allocated to owner (returned as owner share)
 */
export function calculateProRataShares(
  periods: OccupancyPeriod[],
  totalAmount: number,
  year: number
): { tenantShares: ProRataShare[]; ownerShare: number; vacancyDays: number } {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const totalDaysInYear = calculateOccupancyDays(yearStart, yearEnd, yearStart, yearEnd);

  const tenantShares: ProRataShare[] = [];
  let occupiedDays = 0;

  for (const period of periods) {
    const days = calculateOccupancyDays(period.moveIn, period.moveOut, yearStart, yearEnd);
    occupiedDays += days;

    const ratio = totalDaysInYear > 0 ? days / totalDaysInYear : 0;
    tenantShares.push({
      tenantId: period.tenantId,
      days,
      totalDays: totalDaysInYear,
      ratio: Math.round(ratio * 10000) / 10000,
      amount: roundMoney(totalAmount * ratio),
    });
  }

  const vacancyDays = Math.max(0, totalDaysInYear - occupiedDays);
  const ownerShare = roundMoney(totalAmount * (vacancyDays / totalDaysInYear));

  // Reconcile rounding so shares sum to totalAmount
  const sumShares = tenantShares.reduce((s, t) => s + t.amount, 0) + ownerShare;
  const diff = roundMoney(totalAmount - sumShares);
  if (Math.abs(diff) >= 0.01 && tenantShares.length > 0) {
    tenantShares[0].amount = roundMoney(tenantShares[0].amount + diff);
  }

  return { tenantShares, ownerShare, vacancyDays };
}

/**
 * Calculate monthly pro-rata for a single month (used in Vorschreibungen).
 * E.g. tenant moves in on the 15th → pays 16/30 of that month.
 */
export function calculateMonthlyProRata(
  moveIn: Date,
  moveOut: Date | null,
  year: number,
  month: number,
  monthlyAmount: number
): number {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // last day of month
  const totalDays = monthEnd.getDate();

  const days = calculateOccupancyDays(moveIn, moveOut, monthStart, monthEnd);
  if (days >= totalDays) return monthlyAmount;
  if (days <= 0) return 0;

  return roundMoney(monthlyAmount * (days / totalDays));
}
