import { sql } from "drizzle-orm";
import { db } from "../db";

/**
 * Performs an optimistic update on a single row identified by `id`.
 * Uses a `version` column to detect concurrent modifications.
 * Fully parameterized – no sql.raw() with interpolated strings.
 */
export async function optimisticUpdate<T = any>(params: {
  tableName: string;
  id: string;
  updateFields: (currentRow: T) => Record<string, any>;
  maxRetries?: number;
  delayMs?: number;
  tx?: any;
}): Promise<{ success: boolean; attempts: number; updatedRow?: T }> {
  const {
    tableName,
    id,
    updateFields,
    maxRetries = 3,
    delayMs = 50,
    tx,
  } = params;

  let attempts = 0;

  while (attempts < maxRetries) {
    attempts += 1;

    const executor = tx ?? db;

    // Parameterized SELECT
    const selectRes = await executor.execute(
      sql`SELECT * FROM ${sql.identifier(tableName)} WHERE id = ${id} FOR UPDATE`
    );
    const row = selectRes.rows[0] as T | undefined;
    if (!row) return { success: false, attempts };

    const oldVersion = Number((row as any).version || 1);
    const fields = updateFields(row);

    // Build SET clause dynamically but parameterized
    const setClauses: ReturnType<typeof sql>[] = [];
    for (const [key, value] of Object.entries(fields)) {
      setClauses.push(sql`${sql.identifier(key)} = ${value}`);
    }
    setClauses.push(sql`version = ${oldVersion + 1}`);
    setClauses.push(sql`updated_at = now()`);

    const setClause = sql.join(setClauses, sql`, `);

    const updateRes = await executor.execute(
      sql`UPDATE ${sql.identifier(tableName)} SET ${setClause} WHERE id = ${id} AND version = ${oldVersion}`
    );

    if (updateRes.rowCount && updateRes.rowCount > 0) {
      const newRes = await executor.execute(
        sql`SELECT * FROM ${sql.identifier(tableName)} WHERE id = ${id}`
      );
      return { success: true, attempts, updatedRow: newRes.rows[0] as T };
    }

    if (attempts < maxRetries) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { success: false, attempts };
}
