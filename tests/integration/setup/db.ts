import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export { db, sql };

export const hasDb = !!process.env.DATABASE_URL;

/**
 * Generate a unique prefixed ID for test isolation.
 */
export function testId(prefix: string, label: string): string {
  return `${prefix}-${label}-${Date.now()}`;
}

/**
 * Delete rows matching a prefix pattern across common tables.
 * Order respects FK constraints.
 */
/**
 * Hard-reset: truncate all test-relevant tables with CASCADE.
 * Fast, deterministic, ideal for beforeAll/afterAll in integration suites.
 */
export async function resetDb() {
  await db.execute(sql`
    TRUNCATE TABLE
      payment_allocations,
      payments,
      invoice_lines,
      monthly_invoices,
      expenses,
      tenants,
      units,
      properties,
      organizations
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Delete rows matching a prefix pattern across common tables.
 * Order respects FK constraints. Use when you can't truncate shared tables.
 */
export async function cleanupByPrefix(prefix: string) {
  const like = prefix + '%';
  await db.execute(sql`DELETE FROM payment_allocations WHERE payment_id LIKE ${like}`);
  await db.execute(sql`DELETE FROM invoice_lines WHERE invoice_id IN (SELECT id FROM monthly_invoices WHERE id LIKE ${like})`);
  await db.execute(sql`DELETE FROM payments WHERE id LIKE ${like}`);
  await db.execute(sql`DELETE FROM monthly_invoices WHERE id LIKE ${like}`);
  await db.execute(sql`DELETE FROM expenses WHERE id LIKE ${like}`);
  await db.execute(sql`DELETE FROM tenants WHERE id LIKE ${like}`);
  await db.execute(sql`DELETE FROM units WHERE id LIKE ${like}`);
  await db.execute(sql`DELETE FROM properties WHERE id LIKE ${like}`);
  await db.execute(sql`DELETE FROM organizations WHERE id LIKE ${like}`);
}

/**
 * Delete specific IDs from a table.
 */
export async function deleteIds(table: string, ids: string[]) {
  for (const id of ids) {
    await db.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE id = ${id}`);
  }
}
