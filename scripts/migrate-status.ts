#!/usr/bin/env npx tsx
/**
 * migrate:status — Show which migrations have been applied and which are pending.
 *
 * Usage:
 *   npx tsx scripts/migrate-status.ts
 *   DATABASE_URL=postgres://... npx tsx scripts/migrate-status.ts
 */

import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../migrations");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migration_history (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        checksum TEXT
      )
    `);

    // Get applied migrations
    const { rows: applied } = await client.query<{ name: string; applied_at: Date }>(
      `SELECT name, applied_at FROM _migration_history ORDER BY applied_at`
    );
    const appliedSet = new Set(applied.map((r) => r.name));

    // Discover migration files (.sql and .ts, excluding _down files and run-migration.cjs)
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(
        (f) =>
          (f.endsWith(".sql") || f.endsWith(".ts")) &&
          !f.includes("_down") &&
          !f.endsWith(".cjs")
      )
      .sort();

    console.log("\n📋 Migration Status\n");
    console.log("  Status     │ Migration");
    console.log("─────────────┼──────────────────────────────────────────────────────");

    let pendingCount = 0;

    for (const file of files) {
      const name = file.replace(/\.(sql|ts)$/, "");
      const isApplied = appliedSet.has(name);

      if (isApplied) {
        const row = applied.find((r) => r.name === name)!;
        const date = new Date(row.applied_at).toISOString().slice(0, 16).replace("T", " ");
        console.log(`  ✅ ${date} │ ${file}`);
      } else {
        console.log(`  ⏳ pending    │ ${file}`);
        pendingCount++;
      }
    }

    console.log(`\n  Total: ${files.length} | Applied: ${files.length - pendingCount} | Pending: ${pendingCount}\n`);

    if (pendingCount > 0) {
      console.log("  Run: npx tsx scripts/migrate-up.ts\n");
    } else {
      console.log("  All migrations applied ✅\n");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
