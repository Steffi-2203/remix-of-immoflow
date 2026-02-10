/**
 * Booking Period Lock Guard.
 * Prevents financial mutations (payments, invoices, expenses) on locked periods.
 */
import { db } from "../db";
import { sql } from "drizzle-orm";

export class PeriodLockError extends Error {
  public readonly status = 409;
  constructor(year: number, month: number) {
    super(`Buchungsperiode ${month}/${year} ist gesperrt. Keine Änderungen möglich.`);
    this.name = "PeriodLockError";
  }
}

/**
 * Check if a booking period is locked for the given organization.
 * @throws PeriodLockError if the period is locked.
 */
export async function assertPeriodOpen(params: {
  organizationId: string;
  year: number;
  month: number;
}): Promise<void> {
  const { organizationId, year, month } = params;

  const rows = await db.execute(sql`
    SELECT is_locked FROM booking_periods
    WHERE organization_id = ${organizationId}::uuid
      AND year = ${year}
      AND month = ${month}
    LIMIT 1
  `);

  const row = rows.rows[0] as any;
  if (row?.is_locked) {
    throw new PeriodLockError(year, month);
  }
}

/**
 * Check period lock for a given date string (YYYY-MM-DD).
 */
export async function assertPeriodOpenForDate(params: {
  organizationId: string;
  date: string; // YYYY-MM-DD or ISO date
}): Promise<void> {
  const d = new Date(params.date);
  await assertPeriodOpen({
    organizationId: params.organizationId,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
  });
}
