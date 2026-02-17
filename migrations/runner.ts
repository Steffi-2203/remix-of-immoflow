import { Pool } from "pg";

interface Migration {
  name: string;
  up: string;
  down: string;
}

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(pool: Pool): Promise<string[]> {
  const result = await pool.query(`SELECT name FROM _migrations ORDER BY id`);
  return result.rows.map((r: { name: string }) => r.name);
}

export async function runMigrations(migrations: Migration[], direction: "up" | "down" = "up"): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("[Migration] DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);

    if (direction === "up") {
      for (const migration of migrations) {
        if (applied.includes(migration.name)) {
          console.log(`[Migration] Skipping (already applied): ${migration.name}`);
          continue;
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          console.log(`[Migration] Running UP: ${migration.name}`);
          await client.query(migration.up);
          await client.query("INSERT INTO _migrations (name) VALUES ($1)", [migration.name]);
          await client.query("COMMIT");
          console.log(`[Migration] Applied: ${migration.name}`);
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(`[Migration] ROLLBACK ${migration.name}:`, err);
          throw err;
        } finally {
          client.release();
        }
      }
    } else {
      const reversed = [...migrations].reverse();
      for (const migration of reversed) {
        if (!applied.includes(migration.name)) {
          console.log(`[Migration] Skipping (not applied): ${migration.name}`);
          continue;
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          console.log(`[Migration] Running DOWN: ${migration.name}`);
          await client.query(migration.down);
          await client.query("DELETE FROM _migrations WHERE name = $1", [migration.name]);
          await client.query("COMMIT");
          console.log(`[Migration] Rolled back: ${migration.name}`);
        } catch (err) {
          await client.query("ROLLBACK");
          console.error(`[Migration] ROLLBACK ${migration.name}:`, err);
          throw err;
        } finally {
          client.release();
        }
      }
    }

    console.log(`[Migration] ${direction.toUpperCase()} complete`);
  } finally {
    await pool.end();
  }
}
