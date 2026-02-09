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
