const { Pool } = require("pg");
const { up } = require("./20260201_add_paid_amount_version_unique_invoices");

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const db = {
      execute: async (q) => await client.query(q.sql || q),
    };
    await up(db);
    console.log("Migration applied");
  } catch (err) {
    console.error("Migration failed", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
