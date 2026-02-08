#!/usr/bin/env node
// tools/batch_upsert.js
// =====================
// Bulk-upserts invoice_lines from a CSV via COPY → temp table → single CTE.
//
// Usage:
//   node tools/batch_upsert.js \
//     --csv=missing_lines.csv \
//     --run-id=RUN_ID \
//     --database-url=postgres://... \
//     [--batch-size=50000] \
//     [--dry-run]
//
// CSV columns (header required):
//   invoice_id, unit_id, line_type, description, amount, tax_rate, meta
//
// Requires: npm install pg minimist

'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const argv = require('minimist')(process.argv.slice(2));
const copyFrom = require('pg-copy-streams').from;

const CSV_PATH = path.resolve(process.cwd(), argv.csv || 'missing_lines.csv');
const BATCH_SIZE = Number(argv['batch-size'] || 50000);
const RUN_ID = argv['run-id'] || process.env.RUN_ID || 'manual-batch-' + Date.now();
const DATABASE_URL = argv['database-url'] || process.env.DATABASE_URL;
const DRY_RUN = !!argv['dry-run'];

// ── Validate inputs ──

if (!DATABASE_URL) {
  console.error('ERROR: --database-url or DATABASE_URL env required.');
  process.exit(1);
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`ERROR: CSV not found at ${CSV_PATH}`);
  process.exit(1);
}

const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const lines = csvContent.trim().split('\n');
const header = lines[0];
const dataLines = lines.slice(1).filter(l => l.trim().length > 0);

console.log(`[batch_upsert] CSV: ${CSV_PATH}`);
console.log(`[batch_upsert] Rows: ${dataLines.length}, Batch size: ${BATCH_SIZE}`);
console.log(`[batch_upsert] Run ID: ${RUN_ID}`);

if (dataLines.length === 0) {
  console.log('[batch_upsert] No data rows — nothing to do.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('[batch_upsert] DRY RUN — no DB writes.');
  console.log(`[batch_upsert] Would process ${dataLines.length} rows.`);
  process.exit(0);
}

// ── Main ──

(async () => {
  const startTime = Date.now();
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  let totalInserted = 0;
  let totalUpdated = 0;

  try {
    // Process in batches
    for (let offset = 0; offset < dataLines.length; offset += BATCH_SIZE) {
      const batch = dataLines.slice(offset, offset + BATCH_SIZE);
      const batchNum = Math.floor(offset / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(dataLines.length / BATCH_SIZE);

      console.log(`[batch_upsert] Batch ${batchNum}/${totalBatches} (${batch.length} rows)`);

      await client.query('BEGIN');

      try {
        // 1. Create temp table (dropped automatically at end of transaction)
        await client.query(`
          CREATE TEMP TABLE tmp_invoice_lines (
            invoice_id uuid,
            unit_id uuid,
            line_type text,
            description text,
            amount numeric,
            tax_rate numeric,
            meta jsonb
          ) ON COMMIT DROP
        `);

        // 2. COPY CSV data into temp table via streaming
        const copyStream = client.query(
          copyFrom(
            `COPY tmp_invoice_lines (invoice_id, unit_id, line_type, description, amount, tax_rate, meta)
             FROM STDIN WITH (FORMAT csv, HEADER false, NULL '')`
          )
        );

        const csvData = batch.join('\n') + '\n';
        const readable = Readable.from([csvData]);
        await pipeline(readable, copyStream);

        // 3. Single UPSERT CTE: upsert + audit in one atomic statement
        //
        //    xmax = 0 means the row was freshly inserted (no prior version);
        //    xmax != 0 means an existing row was updated.
        const upsertResult = await client.query(
          `
          WITH upserted AS (
            INSERT INTO invoice_lines
              (invoice_id, unit_id, line_type, description, normalized_description,
               amount, tax_rate, meta, created_at)
            SELECT
              invoice_id,
              unit_id,
              line_type,
              description,
              regexp_replace(lower(trim(description)), '\\s+', ' ', 'g') AS normalized_description,
              amount,
              tax_rate,
              COALESCE(meta, '{}'::jsonb),
              now()
            FROM tmp_invoice_lines
            ON CONFLICT (invoice_id, unit_id, line_type, normalized_description)
            DO UPDATE SET
              amount     = EXCLUDED.amount,
              tax_rate   = EXCLUDED.tax_rate,
              meta       = COALESCE(invoice_lines.meta::jsonb, '{}'::jsonb) || EXCLUDED.meta::jsonb,
              created_at = LEAST(invoice_lines.created_at, EXCLUDED.created_at)
            RETURNING
              invoice_lines.id          AS id,
              invoice_lines.invoice_id  AS invoice_id,
              invoice_lines.unit_id     AS unit_id,
              invoice_lines.line_type   AS line_type,
              invoice_lines.description AS old_description,
              EXCLUDED.description      AS new_description,
              invoice_lines.amount      AS old_amount,
              EXCLUDED.amount           AS new_amount,
              (xmax = 0)                AS inserted_flag
          )
          INSERT INTO audit_logs
            (user_id, table_name, record_id, action, old_data, new_data,
             ip_address, user_agent, created_at)
          SELECT
            NULL,
            'invoice_lines',
            id::text,
            'upsert_missing_lines',
            to_jsonb(json_build_object(
              'old_amount',      old_amount,
              'old_description', old_description
            )),
            to_jsonb(json_build_object(
              'run_id',          $1,
              'new_amount',      new_amount,
              'new_description', new_description,
              'operation',       CASE WHEN inserted_flag THEN 'insert' ELSE 'update' END
            )),
            NULL,
            NULL,
            now()
          FROM upserted
          RETURNING (new_data->>'operation') AS operation
          `,
          [RUN_ID]
        );

        // 4. Count inserts vs updates
        let batchInserted = 0;
        let batchUpdated = 0;
        for (const row of upsertResult.rows) {
          if (row.operation === 'insert') batchInserted++;
          else batchUpdated++;
        }

        totalInserted += batchInserted;
        totalUpdated += batchUpdated;

        console.log(
          `[batch_upsert] Batch ${batchNum}: ${batchInserted} inserted, ${batchUpdated} updated`
        );

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23503') {
          console.error(`[batch_upsert] Batch ${batchNum} FK VIOLATION: ${err.detail || err.message}`);
          console.error('[batch_upsert] Hint: Ensure referenced invoices/units exist. Use seed data in CI.');
        } else {
          console.error(`[batch_upsert] Batch ${batchNum} ROLLED BACK (${err.code || 'unknown'}):`, err.message);
        }
        throw err;
      }
    }

    const durationMs = Date.now() - startTime;
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║         BATCH UPSERT COMPLETE            ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Run ID:    ${RUN_ID.substring(0, 28).padEnd(28)} ║`);
    console.log(`║  Total:     ${String(dataLines.length).padEnd(28)} ║`);
    console.log(`║  Inserted:  ${String(totalInserted).padEnd(28)} ║`);
    console.log(`║  Updated:   ${String(totalUpdated).padEnd(28)} ║`);
    console.log(`║  Duration:  ${(durationMs / 1000).toFixed(2).padEnd(25)}s  ║`);
    console.log('╚══════════════════════════════════════════╝');
  } finally {
    await client.end();
  }
})().catch(err => {
  console.error('[batch_upsert] FATAL:', err);
  process.exit(1);
});
