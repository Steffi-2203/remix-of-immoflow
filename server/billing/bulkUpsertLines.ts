import { sql } from "drizzle-orm";
import { normalizeDescription } from "../lib/normalizeDescription";
import { roundMoney } from "@shared/utils";
import { metrics, METRIC } from "../lib/metrics";
import { createTrace, withSpan, BILLING_SPANS, type Trace, type TraceResult } from "../lib/tracing";
import { logAuditEvent } from "../audit/auditEvents.service";

/**
 * Configurable threshold – lines below this use the legacy 500-chunk path.
 * Override via env var BILLING_BULK_THRESHOLD (e.g. 999999 to disable).
 */
export const BULK_THRESHOLD = Number(process.env.BILLING_BULK_THRESHOLD) || 5000;

/** Chunk helper for temp-table inserts (larger chunks than legacy path). */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

type BulkUpsertOpts = {
  tx: any;
  allLines: any[];
  userId: string;
  runId: string;
};

type BulkUpsertResult = {
  upsertedLinesCount: number;
  conflictCount: number;
  trace?: TraceResult;
};

/**
 * P2-7: Bulk upsert path for large batches (≥ BULK_THRESHOLD lines).
 *
 * Strategy:
 *   1. CREATE TEMP TABLE _tmp_invoice_lines (ON COMMIT DROP)
 *   2. Multi-row INSERT into temp table (5000-row chunks)
 *   3. Single CTE: upsert from temp → invoice_lines + write audit_logs
 *
 * This reduces DB roundtrips from O(n/500) to O(n/5000) + 1 CTE.
 */
export async function bulkUpsertLines(opts: BulkUpsertOpts): Promise<BulkUpsertResult> {
  const { tx, allLines, userId, runId } = opts;
  const trace = createTrace('billing-bulk-upsert', runId);

  metrics.increment(METRIC.BULK_PATH_USED);

  // Step 1: Create temp table (traced)
  await withSpan(trace, BILLING_SPANS.TEMP_TABLE_CREATE, async (span) => {
    await tx.execute(sql`
      CREATE TEMP TABLE _tmp_invoice_lines (
        invoice_id UUID NOT NULL,
        unit_id UUID,
        line_type TEXT NOT NULL,
        description TEXT,
        normalized_description TEXT,
        amount NUMERIC(12,2) NOT NULL,
        tax_rate NUMERIC(5,2),
        meta JSONB DEFAULT '{}'::jsonb
      ) ON COMMIT DROP
    `);
    span.setAttribute('table', '_tmp_invoice_lines');
  });

  // Step 2: Insert into temp table in 5000-row chunks (traced)
  await withSpan(trace, BILLING_SPANS.COPY_TO_TEMP, async (span) => {
    const batches = chunk(allLines, 5000);
    span.setAttribute('chunk_count', batches.length);
    span.setAttribute('total_lines', allLines.length);
    for (const batch of batches) {
      if (batch.length === 0) continue;
      metrics.histogram(METRIC.BATCH_SIZE, batch.length);

      const values = batch.map(line =>
        sql`(${line.invoiceId}, ${line.unitId}, ${line.lineType}, ${line.description}, ${normalizeDescription(line.description)}, ${roundMoney(line.amount)}, ${line.taxRate}, ${JSON.stringify(line.meta || {})}::jsonb)`
      );
      await tx.execute(sql`
        INSERT INTO _tmp_invoice_lines (invoice_id, unit_id, line_type, description, normalized_description, amount, tax_rate, meta)
        VALUES ${sql.join(values, sql`, `)}
      `);
      span.addEvent('chunk_inserted', { rows: batch.length });
    }
  });

  // Step 3: Single CTE – upsert + audit in one roundtrip (traced)
  const { upsertedLinesCount, conflictCount } = await withSpan(trace, BILLING_SPANS.UPSERT_CTE, async (span) => {
    const result = await tx.execute(sql`
      WITH upserted AS (
        INSERT INTO invoice_lines (invoice_id, unit_id, line_type, description, normalized_description, amount, tax_rate, meta, created_at)
        SELECT invoice_id, unit_id, line_type, description, normalized_description, amount, tax_rate, meta, now()
        FROM _tmp_invoice_lines
        ON CONFLICT (invoice_id, unit_id, line_type, normalized_description)
        DO UPDATE SET
          amount = EXCLUDED.amount,
          tax_rate = EXCLUDED.tax_rate,
          meta = COALESCE(invoice_lines.meta::jsonb, '{}'::jsonb) || EXCLUDED.meta::jsonb,
          created_at = LEAST(invoice_lines.created_at, EXCLUDED.created_at)
        RETURNING id, invoice_id, unit_id, line_type, description, amount
      ),
      audit AS (
        INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
        SELECT
          ${userId}::uuid,
          'invoice_lines',
          u.id::text,
          'invoice_line_upsert',
          jsonb_build_object(
            'run_id', ${runId},
            'trace_id', ${trace.traceId},
            'actor', ${userId},
            'operation', 'upsert',
            'invoice_id', u.invoice_id,
            'unit_id', u.unit_id,
            'line_type', u.line_type,
            'description', u.description,
            'normalized_description', t.normalized_description,
            'new_amount', u.amount
          ),
          now()
        FROM upserted u
        JOIN _tmp_invoice_lines t ON t.invoice_id = u.invoice_id
          AND t.unit_id IS NOT DISTINCT FROM u.unit_id
          AND t.line_type = u.line_type
        RETURNING id
      )
      SELECT
        (SELECT count(*) FROM upserted) AS upserted_count,
        (SELECT count(*) FROM audit) AS audit_count
    `);

    const row = result.rows?.[0] || {};
    const upserted = Number(row.upserted_count || 0);
    const conflicts = allLines.length - upserted;

    span.setAttribute('upserted', upserted);
    span.setAttribute('conflicts', conflicts);
    span.setAttribute('audit_rows', Number(row.audit_count || 0));

    return { upsertedLinesCount: upserted, conflictCount: conflicts };
  });

  await logAuditEvent(tx, {
    runId,
    actor: userId,
    type: 'invoice_line_bulk_upsert',
    entity: 'invoice_lines',
    operation: 'insert',
    new: { upsertedLinesCount, conflictCount, totalLines: allLines.length },
  });

  const traceResult = trace.finish();

  return { upsertedLinesCount, conflictCount, trace: traceResult };
}
