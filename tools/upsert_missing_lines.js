// tools/upsert_missing_lines.js
// Usage:
//   node tools/upsert_missing_lines.js --csv=missing_lines.csv --run-id=RUN_ID --database-url=postgres://... [--batch-size=100] [--dry-run]
// Requires: npm install pg csv-parse minimist

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { Client } = require('pg');
const argv = require('minimist')(process.argv.slice(2));

// Try to import normalizeDescription from server lib; fallback to inline normalizer if not available
let normalizeDescription;
try {
  normalizeDescription = require(path.resolve(process.cwd(), 'server/lib/normalizeDescription')).normalizeDescription;
  if (typeof normalizeDescription !== 'function') throw new Error('normalizeDescription not a function');
} catch (e) {
  // fallback deterministic normalizer (same logic as DB trigger)
  normalizeDescription = (raw) => {
    if (raw === undefined || raw === null) return null;
    let s = String(raw).trim();
    s = s.normalize ? s.normalize('NFC') : s;
    s = s.replace(/\s+/g, ' ');
    s = s.toLowerCase();
    s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
    return s;
  };
  console.warn('Warning: using fallback normalizeDescription. Prefer importing server/lib/normalizeDescription.');
}

const CSV_PATH = path.resolve(process.cwd(), argv.csv || 'missing_lines.csv');
const BATCH_SIZE = Number(argv['batch-size'] || 100);
const RUN_ID = argv['run-id'] || process.env.RUN_ID || 'manual-reconcile';
const DATABASE_URL = argv['database-url'] || process.env.DATABASE_URL;
const DRY_RUN = !!argv['dry-run'];

if (!DATABASE_URL) {
  console.error('DATABASE_URL not provided. Use --database-url or set env DATABASE_URL.');
  process.exit(1);
}

if (!fs.existsSync(CSV_PATH)) {
  console.error('CSV not found at', CSV_PATH);
  process.exit(1);
}

const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

console.log(`Loaded ${records.length} rows from ${CSV_PATH}`);
if (records.length === 0) process.exit(0);

if (DRY_RUN) {
  console.log('Dry run mode: no DB writes will be performed.');
  console.table(records.slice(0, 10));
  process.exit(0);
}

(async () => {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} rows)`);

      const values = [];
      const placeholders = batch.map((r, idx) => {
        const base = idx * 8;
        const amount = r.amount ? Number(r.amount) : 0;
        const taxRate = r.tax_rate ? Number(r.tax_rate) : 0;
        const meta = r.meta ? r.meta : '{}';
        const normalized = normalizeDescription(r.description || '');

        values.push(
          r.invoice_id || null,
          r.unit_id || null,
          r.line_type || null,
          r.description || '',
          normalized,
          amount,
          taxRate,
          meta
        );

        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}::jsonb, now())`;
      }).join(', ');

      const upsertSql = `
        INSERT INTO invoice_lines
          (invoice_id, unit_id, line_type, description, normalized_description, amount, tax_rate, meta, created_at)
        VALUES ${placeholders}
        ON CONFLICT (invoice_id, unit_id, line_type, normalized_description)
        DO UPDATE SET
          amount = EXCLUDED.amount,
          tax_rate = EXCLUDED.tax_rate,
          meta = COALESCE(invoice_lines.meta::jsonb, '{}'::jsonb) || EXCLUDED.meta::jsonb,
          created_at = LEAST(invoice_lines.created_at, COALESCE(EXCLUDED.created_at, now()))
        RETURNING id, invoice_id, unit_id, line_type, description, normalized_description, amount;
      `;

      await client.query('BEGIN');

      try {
        const upsertRes = await client.query(upsertSql, values);

        if (upsertRes.rows.length) {
          // Write audit logs matching actual audit_logs schema
          const auditPlaceholders = upsertRes.rows.map((_, idx) => {
            const base = idx * 5;
            return `($${base + 1}::uuid, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::jsonb, now())`;
          }).join(', ');

          const auditParams = [];
          for (const r of upsertRes.rows) {
            auditParams.push(
              null, // user_id (system/manual reconcile)
              'invoice_lines', // table_name
              r.id, // record_id
              'invoice_line_reconcile', // action
              JSON.stringify({
                run_id: RUN_ID,
                invoice_id: r.invoice_id,
                unit_id: r.unit_id,
                line_type: r.line_type,
                description: r.description,
                normalized_description: r.normalized_description,
                amount: r.amount,
                note: 'reconciled missing line'
              })
            );
          }

          const auditSql = `
            INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
            VALUES ${auditPlaceholders};
          `;

          await client.query(auditSql, auditParams);
        }

        await client.query('COMMIT');
        console.log(`Batch committed. Upserted ${upsertRes.rows.length} rows.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during batch upsert, rolled back. Error:', err.message);
        throw err;
      }
    }

    console.log('All batches processed successfully.');
  } finally {
    await client.end();
  }
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
