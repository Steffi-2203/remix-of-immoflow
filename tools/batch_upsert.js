#!/usr/bin/env node
// tools/batch_upsert.js
// =====================
// Bulk-upserts invoice_lines from a CSV via COPY → temp table → single CTE.
// Supports chunked ingest with idempotent checkpoints via reconcile_runs table.
//
// Usage:
//   node tools/batch_upsert.js \
//     --csv=missing_lines.csv \
//     --run-id=RUN_ID \
//     --database-url=postgres://... \
//     [--batch-size=5000] \
//     [--dry-run] \
//     [--resume]
//
// --resume: Skip chunks already marked as 'done' in reconcile_runs (idempotent restart)
//
// CSV columns (header required):
//   invoice_id, unit_id, line_type, description, amount, tax_rate, meta
//
// Requires: npm install pg minimist pg-copy-streams

'use strict';

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const argv = require('minimist')(process.argv.slice(2));
const copyFrom = require('pg-copy-streams').from;

const CSV_PATH = path.resolve(process.cwd(), argv.csv || 'missing_lines.csv');
const BATCH_SIZE = Number(argv['batch-size'] || 5000);
const RUN_ID = argv['run-id'] || process.env.RUN_ID || 'manual-batch-' + Date.now();
const DATABASE_URL = argv['database-url'] || process.env.DATABASE_POOLER_URL || process.env.DATABASE_URL;
const DRY_RUN = !!argv['dry-run'];
const RESUME = !!argv['resume'];

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

const totalChunks = Math.ceil(dataLines.length / BATCH_SIZE);

console.log(`[batch_upsert] CSV: ${CSV_PATH}`);
console.log(`[batch_upsert] Rows: ${dataLines.length}, Chunk size: ${BATCH_SIZE}, Chunks: ${totalChunks}`);
console.log(`[batch_upsert] Run ID: ${RUN_ID}`);
console.log(`[batch_upsert] Resume: ${RESUME}`);

if (dataLines.length === 0) {
  console.log('[batch_upsert] No data rows — nothing to do.');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('[batch_upsert] DRY RUN — no DB writes.');
  console.log(`[batch_upsert] Would process ${dataLines.length} rows in ${totalChunks} chunks.`);
  process.exit(0);
}

// ── Checkpoint helpers ──

async function ensureReconcileRunsTable(client) {
  // Create table if not exists (safe for CI environments without migration)
  await client.query(`
    CREATE TABLE IF NOT EXISTS reconcile_runs (
      id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      run_id text NOT NULL,
      chunk_id integer NOT NULL,
      total_chunks integer NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      rows_in_chunk integer NOT NULL DEFAULT 0,
      inserted integer NOT NULL DEFAULT 0,
      updated integer NOT NULL DEFAULT 0,
      error_message text,
      started_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (run_id, chunk_id)
    )
  `);
}

async function registerChunks(client, runId, totalChunks, chunkSizes) {
  for (let i = 0; i < totalChunks; i++) {
    await client.query(
      `INSERT INTO reconcile_runs (run_id, chunk_id, total_chunks, rows_in_chunk, status)
       VALUES ($1, $2, $3, $4, 'pending')
       ON CONFLICT (run_id, chunk_id) DO NOTHING`,
      [runId, i, totalChunks, chunkSizes[i]]
    );
  }
}

async function getCompletedChunks(client, runId) {
  const res = await client.query(
    `SELECT chunk_id FROM reconcile_runs WHERE run_id = $1 AND status = 'done'`,
    [runId]
  );
  return new Set(res.rows.map(r => r.chunk_id));
}

async function updateChunkStatus(client, runId, chunkId, status, inserted, updated, errorMessage) {
  await client.query(
    `UPDATE reconcile_runs
     SET status = $3,
         inserted = $4,
         updated = $5,
         error_message = $6,
         started_at = CASE WHEN $3 = 'processing' THEN now() ELSE started_at END,
         completed_at = CASE WHEN $3 IN ('done', 'failed') THEN now() ELSE completed_at END
     WHERE run_id = $1 AND chunk_id = $2`,
    [runId, chunkId, status, inserted || 0, updated || 0, errorMessage || null]
  );
}

// ── Main ──

(async () => {
  const startTime = Date.now();
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  let totalInserted = 0;
  let totalUpdated = 0;
  let skippedChunks = 0;

  try {
    await ensureReconcileRunsTable(client);

    // Pre-compute chunk sizes
    const chunkSizes = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, dataLines.length);
      chunkSizes.push(end - start);
    }

    // Register all chunks
    await registerChunks(client, RUN_ID, totalChunks, chunkSizes);

    // Get already-completed chunks for resume
    const completedChunks = RESUME ? await getCompletedChunks(client, RUN_ID) : new Set();

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const offset = chunkIdx * BATCH_SIZE;
      const batch = dataLines.slice(offset, offset + BATCH_SIZE);

      // Skip completed chunks on resume
      if (completedChunks.has(chunkIdx)) {
        console.log(`[batch_upsert] Chunk ${chunkIdx + 1}/${totalChunks} — SKIPPED (already done)`);
        skippedChunks++;
        continue;
      }

      console.log(`[batch_upsert] Chunk ${chunkIdx + 1}/${totalChunks} (${batch.length} rows)`);

      // Mark as processing
      await updateChunkStatus(client, RUN_ID, chunkIdx, 'processing', 0, 0);

      await client.query('BEGIN');

      try {
        // 1. Create temp table
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

        // 2. COPY CSV data into temp table
        const copyStream = client.query(
          copyFrom(
            `COPY tmp_invoice_lines (invoice_id, unit_id, line_type, description, amount, tax_rate, meta)
             FROM STDIN WITH (FORMAT csv, HEADER false, NULL '')`
          )
        );

        const csvData = batch.join('\n') + '\n';
        const readable = Readable.from([csvData]);
        await pipeline(readable, copyStream);

        // 3. Upsert CTE
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
              'chunk_id',        $2,
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
          [RUN_ID, chunkIdx]
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

        await client.query('COMMIT');

        // Mark chunk as done
        await updateChunkStatus(client, RUN_ID, chunkIdx, 'done', batchInserted, batchUpdated);

        console.log(
          `[batch_upsert] Chunk ${chunkIdx + 1}: ${batchInserted} inserted, ${batchUpdated} updated ✓`
        );

      } catch (err) {
        await client.query('ROLLBACK');

        // Mark chunk as failed
        const errMsg = err.code === '23503'
          ? `FK VIOLATION: ${err.detail || err.message}`
          : `${err.code || 'unknown'}: ${err.message}`;

        await updateChunkStatus(client, RUN_ID, chunkIdx, 'failed', 0, 0, errMsg);

        if (err.code === '23503') {
          console.error(`[batch_upsert] Chunk ${chunkIdx + 1} FK VIOLATION: ${err.detail || err.message}`);
          console.error('[batch_upsert] Hint: Ensure referenced invoices/units exist. Use seed data in CI.');
        } else {
          console.error(`[batch_upsert] Chunk ${chunkIdx + 1} FAILED (${err.code || 'unknown'}):`, err.message);
        }
        // Continue to next chunk instead of aborting entirely
        console.error(`[batch_upsert] Continuing with remaining chunks...`);
      }
    }

    const durationMs = Date.now() - startTime;

    // Summary query from reconcile_runs
    const summaryRes = await client.query(
      `SELECT status, count(*)::int AS cnt, sum(inserted)::int AS ins, sum(updated)::int AS upd
       FROM reconcile_runs WHERE run_id = $1 GROUP BY status ORDER BY status`,
      [RUN_ID]
    );

    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║       CHUNKED BATCH UPSERT COMPLETE      ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Run ID:    ${RUN_ID.substring(0, 28).padEnd(28)} ║`);
    console.log(`║  Total:     ${String(dataLines.length).padEnd(28)} ║`);
    console.log(`║  Chunks:    ${String(totalChunks).padEnd(28)} ║`);
    console.log(`║  Skipped:   ${String(skippedChunks).padEnd(28)} ║`);
    console.log(`║  Inserted:  ${String(totalInserted).padEnd(28)} ║`);
    console.log(`║  Updated:   ${String(totalUpdated).padEnd(28)} ║`);
    console.log(`║  Duration:  ${(durationMs / 1000).toFixed(2).padEnd(25)}s  ║`);
    console.log('╠══════════════════════════════════════════╣');

    for (const row of summaryRes.rows) {
      console.log(`║  ${row.status.padEnd(10)} ${String(row.cnt).padEnd(5)} chunks  ${String(row.ins).padEnd(5)}i ${String(row.upd).padEnd(5)}u ║`);
    }

    console.log('╚══════════════════════════════════════════╝');

    // Exit with error if any chunks failed
    const failedChunks = summaryRes.rows.find(r => r.status === 'failed');
    if (failedChunks && failedChunks.cnt > 0) {
      console.error(`\n⚠ ${failedChunks.cnt} chunk(s) failed. Re-run with --resume to retry.`);
      process.exit(2);
    }

  } finally {
    await client.end();
  }
})().catch(err => {
  console.error('[batch_upsert] FATAL:', err);
  process.exit(1);
});
