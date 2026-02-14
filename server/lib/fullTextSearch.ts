import { pool } from "../db";

export async function setupFullTextSearch() {
  const client = await pool.connect();
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_properties_name_trgm ON properties USING gin (name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_properties_address_trgm ON properties USING gin (address gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_properties_city_trgm ON properties USING gin (city gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_properties_postal_code_trgm ON properties USING gin (postal_code gin_trgm_ops);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_units_top_nummer_trgm ON units USING gin (top_nummer gin_trgm_ops);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_first_name_trgm ON tenants USING gin (first_name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_tenants_last_name_trgm ON tenants USING gin (last_name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_tenants_email_trgm ON tenants USING gin (email gin_trgm_ops);
    `);

    await client.query(`SET pg_trgm.similarity_threshold = 0.1`);

    console.log("Full-text search with pg_trgm initialized successfully");
  } catch (error: any) {
    console.warn("Full-text search setup warning:", error.message);
  } finally {
    client.release();
  }
}
