import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use pooler URL if available (transaction pooling via PgBouncer/Supavisor),
// otherwise fall back to direct DATABASE_URL.
const connectionString = process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;

const isPooler = !!process.env.DATABASE_POOLER_URL;

export const pool = new Pool({
  connectionString,
  // Transaction-pooling compatible settings
  max: isPooler ? 20 : 10,           // Higher limit behind a pooler
  min: isPooler ? 2 : 1,
  idleTimeoutMillis: 30_000,          // Release idle clients after 30s
  connectionTimeoutMillis: 10_000,    // Fail fast if pool exhausted
  // IMPORTANT: Disable prepared statements when using transaction pooling
  // PgBouncer/Supavisor in transaction mode cannot track prepared statements
  ...(isPooler ? { statement_timeout: 60_000 } : {}),
});

// Direct connection pool for operations that need session-level features
// (e.g. advisory locks, LISTEN/NOTIFY, prepared statements)
export const directPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
