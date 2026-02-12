#!/usr/bin/env npx tsx
/**
 * migrate:up — Apply all pending migrations in order.
 *
 * Usage:
 *   npx tsx scripts/migrate-up.ts                # apply all pending
 *   npx tsx scripts/migrate-up.ts --dry-run      # show what would run
 *   npx tsx scripts/migrate-up.ts --target 20260208_add_normalized_description  # up to specific migration
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const { Pool } = pg;

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../migrations");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const targetIdx = args.indexOf("--target");
const targetName = targetIdx !== -1 ? args[targetIdx + 1] : undefined;

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
    const { rows: applied } = await client.query<{ name: string }>(
      `SELECT name FROM _migration_history`
    );
    const appliedSet = new Set(applied.map((r) => r.name));

    // Discover SQL migration files (skip _down, skip .cjs)
    const sqlFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(
        (f) =>
          f.endsWith(".sql") &&
          !f.includes("_down")
      )
      .sort();

    // Filter pending
    let pending = sqlFiles.filter((f) => {
      const name = f.replace(/\.sql$/, "");
      return !appliedSet.has(name);
    });

    // Apply target filter
    if (targetName) {
      const idx = pending.findIndex((f) => f.startsWith(targetName));
      if (idx === -1) {
        console.log(`⚠️  Target "${targetName}" not found in pending migrations.`);
        process.exit(0);
      }
      pending = pending.slice(0, idx + 1);
    }

    if (pending.length === 0) {
      console.log("\n✅ No pending migrations. Database is up to date.\n");
      process.exit(0);
    }

    console.log(`\n${dryRun ? "🔍 DRY RUN" : "🚀 Applying"} ${pending.length} migration(s):\n`);

    for (const file of pending) {
      const name = file.replace(/\.sql$/, "");
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, "utf-8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex").slice(0, 16);

      if (dryRun) {
        console.log(`  ⏳ Would apply: ${file}  (sha256:${checksum})`);
        continue;
      }

      const start = Date.now();
      try {
        // Execute migration in a transaction (unless it already contains BEGIN/COMMIT)
        const hasTransaction = /^\s*BEGIN\b/im.test(sql);

        if (!hasTransaction) {
          await client.query("BEGIN");
        }

        await client.query(sql);

        // Record in history
        await client.query(
          `INSERT INTO _migration_history (name, checksum) VALUES ($1, $2)
           ON CONFLICT (name) DO NOTHING`,
          [name, checksum]
        );

        if (!hasTransaction) {
          await client.query("COMMIT");
        }

        const elapsed = Date.now() - start;
        console.log(`  ✅ ${file}  (${elapsed}ms, sha256:${checksum})`);
      } catch (err: any) {
        if (!/^\s*BEGIN\b/im.test(sql)) {
          await client.query("ROLLBACK").catch(() => {});
        }
        console.error(`  ❌ ${file} FAILED: ${err.message}`);
        process.exit(1);
      }
    }

    console.log(`\n✅ Done. ${pending.length} migration(s) applied.\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
