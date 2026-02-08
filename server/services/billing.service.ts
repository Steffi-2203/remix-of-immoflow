import { v4 as uuidv4 } from 'uuid';
import { db } from "../db";
import { invoiceGenerator } from "./invoice.generator";
import { roundMoney } from "@shared/utils";
import { sql, eq, inArray } from "drizzle-orm";
import {
  monthlyInvoices,
  invoiceLines,
  tenants,
  units,
  auditLogs,
  invoiceRuns
} from "@shared/schema";

type GenerateOpts = {
  userId: string;
  propertyIds: string[];
  year: number;
  month: number;
  dryRun?: boolean;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Distributes rounding differences (≤ lines.length × 0.01 €) across invoice lines
 * so that their sum matches `expectedTotal` exactly.
 *
 * **Tolerance:** Differences < 0.01 € are ignored (sub-cent, irrelevant for accounting).
 * The loop is capped at `lines.length * 2` iterations to prevent infinite loops.
 * If a residual ≥ 0.01 € remains after the cap, a warning is logged — this indicates
 * an unexpectedly large discrepancy that should be investigated.
 *
 * **Determinism:** Lines are sorted by |amount| desc → lineType asc → unitId asc,
 * guaranteeing identical cent distribution across repeated runs.
 */
function reconcileRounding(lines: any[], expectedTotal: number): void {
  const roundedSum = lines.reduce((s, l) => s + roundMoney(l.amount || 0), 0);
  let diff = roundMoney(expectedTotal - roundedSum);

  // Sub-cent tolerance — no adjustment needed
  if (Math.abs(diff) < 0.01) return;

  // Deterministic sort: amount desc → lineType asc → unitId asc
  lines.sort((a, b) => {
    const d = Math.abs(b.amount || 0) - Math.abs(a.amount || 0);
    if (d !== 0) return d;
    const typeCmp = (a.lineType || '').localeCompare(b.lineType || '');
    if (typeCmp !== 0) return typeCmp;
    return (a.unitId || '').localeCompare(b.unitId || '');
  });

  const maxIterations = lines.length * 2;
  let i = 0;
  while (Math.abs(diff) >= 0.01 && i < maxIterations) {
    const adjust = diff > 0 ? 0.01 : -0.01;
    lines[i % lines.length].amount = roundMoney(lines[i % lines.length].amount + adjust);
    diff = roundMoney(diff - adjust);
    i++;
  }

  // Warn if residual remains after cap — should not happen in normal operation
  if (Math.abs(diff) >= 0.01) {
    console.warn(
      `[reconcileRounding] Residual ${diff.toFixed(2)} € after ${maxIterations} iterations. ` +
      `Expected total: ${expectedTotal}, lines: ${lines.length}. Investigate discrepancy.`
    );
  }
}

function unitTypeFromTenant(unitId: string | null, unitTypeMap: Map<string, string>) {
  if (!unitId) return 'wohnung';
  return unitTypeMap.get(unitId) || 'wohnung';
}

export class BillingService {
  async generateMonthlyInvoices(opts: GenerateOpts) {
    const { userId, propertyIds, year, month, dryRun = true } = opts;
    const runId = uuidv4();
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const isJanuary = month === 1;
    const dueDate = new Date(year, month - 1, 5).toISOString().split('T')[0];

    const unitsData = await db.select().from(units).where(inArray(units.propertyId, propertyIds));
    const unitIds = unitsData.map(u => u.id);
    const unitTypeMap = new Map(unitsData.map(u => [u.id, u.type || 'wohnung']));

    const tenantsData = await db.select().from(tenants).where(
      sql`${tenants.unitId} IN (${sql.join(unitIds.map(id => sql`${id}`), sql`, `)}) AND ${tenants.status} = 'aktiv'`
    );

    const carryForwardMap = new Map<string, any>();
    if (isJanuary) {
      for (const t of tenantsData) {
        carryForwardMap.set(t.id, { vortragMiete: 0, vortragBk: 0, vortragHk: 0, vortragSonstige: 0 });
      }
    }

    const invoicesToCreate = tenantsData.map(t => {
      const unitType = unitTypeMap.get(t.unitId || '') || 'wohnung';
      const carryForward = carryForwardMap.get(t.id) || { vortragMiete: 0, vortragBk: 0, vortragHk: 0, vortragSonstige: 0 };
      return invoiceGenerator.buildInvoiceData(t, unitType, year, month, dueDate, carryForward);
    });

    if (dryRun) {
      const preview = [];
      for (const inv of invoicesToCreate) {
        const id = `preview-${inv.tenantId}-${inv.year}-${inv.month}`;
        const vatRates = invoiceGenerator.getVatRates(unitTypeFromTenant(inv.unitId, unitTypeMap));
        const tenant = tenantsData.find(x => x.id === inv.tenantId);
        if (tenant) {
          const rawLines = invoiceGenerator.buildInvoiceLines(id, tenant, vatRates, month, year);
          const validLines = rawLines.filter(l => roundMoney(l.amount) > 0 && l.lineType && l.invoiceId);
          const expectedTotal = roundMoney(inv.gesamtbetrag || 0);
          reconcileRounding(validLines, expectedTotal);
          preview.push({ invoice: inv, lines: validLines });
        }
      }
      const summary = {
        count: preview.length,
        total: roundMoney(preview.reduce((s, p) => s + (p.invoice.gesamtbetrag || 0), 0)),
        linesCount: preview.reduce((s, p) => s + p.lines.length, 0)
      };
      return { runId, dryRun: true, period, count: preview.length, summary, preview };
    }

    const insertedRun = await db.execute(sql`
      INSERT INTO invoice_runs (run_id, period, initiated_by, status)
      VALUES (${runId}::uuid, ${period}, ${userId}::uuid, 'started')
      ON CONFLICT (run_id) DO NOTHING
      RETURNING id
    `);

    if (!insertedRun.rows || insertedRun.rows.length === 0) {
      return { runId, error: 'Run already exists' };
    }

    const startTime = Date.now();

    try {
      const createdInvoices = await db.transaction(async (tx) => {
        const insertedInvoices: any[] = [];
        for (const inv of invoicesToCreate) {
          const res = await tx.execute(sql`
            INSERT INTO monthly_invoices (id, tenant_id, unit_id, year, month, grundmiete, betriebskosten, heizungskosten, gesamtbetrag, ust, ust_satz_miete, ust_satz_bk, ust_satz_heizung, status, faellig_am, vortrag_miete, vortrag_bk, vortrag_hk, vortrag_sonstige, run_id, created_at)
            VALUES (gen_random_uuid(), ${inv.tenantId}, ${inv.unitId}, ${inv.year}, ${inv.month}, ${inv.grundmiete}, ${inv.betriebskosten}, ${inv.heizungskosten}, ${inv.gesamtbetrag}, ${inv.ust}, ${inv.ustSatzMiete}, ${inv.ustSatzBk}, ${inv.ustSatzHeizung}, ${inv.status}, ${inv.faelligAm}, ${inv.vortragMiete}, ${inv.vortragBk}, ${inv.vortragHk}, ${inv.vortragSonstige}, ${runId}::uuid, now())
            ON CONFLICT (tenant_id, year, month) DO NOTHING
            RETURNING *
          `);
          if (res.rows && res.rows.length) {
            insertedInvoices.push(res.rows[0]);
          }
        }

        const allLines: any[] = [];
        let skippedLines: { type: string; reason: string }[] = [];
        
        for (const inv of insertedInvoices) {
          const tenant = tenantsData.find(t => t.id === inv.tenant_id);
          if (!tenant) continue;
          const unitType = unitTypeMap.get(inv.unit_id || '') || 'wohnung';
          const vatRates = invoiceGenerator.getVatRates(unitType);
          const rawLines = invoiceGenerator.buildInvoiceLines(inv.id, tenant, vatRates, inv.month, inv.year, inv.unit_id);
          
          const validLines = rawLines.filter(line => {
            const amt = roundMoney(line.amount);
            if (amt <= 0 || !line.lineType || !line.invoiceId) {
              skippedLines.push({ type: line.lineType || 'unknown', reason: `amount=${amt}` });
              return false;
            }
            return true;
          });
          
          const expectedTotal = roundMoney(inv.gesamtbetrag || 0);
          reconcileRounding(validLines, expectedTotal);
          
          allLines.push(...validLines);
        }

        let insertedLinesCount = 0;
        let upsertedLinesCount = 0;
        let conflictCount = 0;
        const conflictKeys: { invoiceId: string; lineType: string; description: string }[] = [];
        
        const batches = chunk(allLines, 500);
        for (const batch of batches) {
          if (batch.length > 0) {
            const values = batch.map(line => 
              sql`(${line.invoiceId}, ${line.unitId}, ${line.lineType}, ${line.description}, ${roundMoney(line.amount)}, ${line.taxRate}, ${JSON.stringify(line.meta || {})}::jsonb, now())`
            );
            const result = await tx.execute(sql`
              INSERT INTO invoice_lines (invoice_id, unit_id, line_type, description, amount, tax_rate, meta, created_at)
              VALUES ${sql.join(values, sql`, `)}
              ON CONFLICT ON CONSTRAINT idx_invoice_lines_unique
              DO UPDATE SET
                amount = EXCLUDED.amount,
                tax_rate = EXCLUDED.tax_rate,
                meta = COALESCE(invoice_lines.meta::jsonb, '{}'::jsonb) || EXCLUDED.meta::jsonb,
                created_at = LEAST(invoice_lines.created_at, EXCLUDED.created_at)
              RETURNING id, invoice_id, unit_id, line_type, description, amount
            `);

            const upsertedRows = result.rows || [];
            upsertedLinesCount += upsertedRows.length;
            conflictCount += batch.length - upsertedRows.length;

            // Audit log for each upserted row
            if (upsertedRows.length > 0) {
              const auditValues = upsertedRows.map((r: any) =>
                sql`(${userId}::uuid, 'invoice_lines', ${r.id}::text, 'invoice_line_upsert', ${JSON.stringify({
                  run_id: runId,
                  invoice_id: r.invoice_id,
                  unit_id: r.unit_id,
                  line_type: r.line_type,
                  description: r.description,
                  amount: r.amount,
                })}::jsonb, now())`
              );
              await tx.execute(sql`
                INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
                VALUES ${sql.join(auditValues, sql`, `)}
              `);
            }
          }
        }

        const durationMs = Date.now() - startTime;
        const expectedLines = allLines.length;

        // ── Structured run metrics ──
        const metrics = {
          run_id: runId,
          period,
          invoicesExpected: invoicesToCreate.length,
          invoicesInserted: insertedInvoices.length,
          expectedLines,
          insertedLines: upsertedLinesCount,
          upsertedLines: upsertedLinesCount,
          conflictCount,
          skippedLinesCount: skippedLines.length,
          durationMs,
        };

        // Alert conditions
        if (upsertedLinesCount < expectedLines) {
          console.warn(
            `[BillingMetrics] ALERT: insertedLines (${upsertedLinesCount}) < expectedLines (${expectedLines}). ` +
            `${expectedLines - upsertedLinesCount} lines may be missing. Run: ${runId}`
          );
        }
        if (conflictCount > 0) {
          console.warn(
            `[BillingMetrics] ALERT: ${conflictCount} conflict(s) during upsert. ` +
            `Possible duplicate data. Run: ${runId}`,
            conflictKeys.slice(0, 5)
          );
        }

        // Always log metrics
        console.info(`[BillingMetrics]`, JSON.stringify(metrics));

        await tx.execute(sql`
          UPDATE invoice_runs SET status = 'completed', updated_at = now()
          WHERE run_id = ${runId}::uuid
        `);

        // Structured audit log with full metrics
        await tx.execute(sql`
          INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
          VALUES (${userId}::uuid, 'monthly_invoices', ${runId}, 'generate_invoices', ${JSON.stringify({
            ...metrics,
            conflictKeys: conflictKeys.slice(0, 10),
            skippedDetails: skippedLines.slice(0, 10),
          })}::jsonb, now())
        `);

        return insertedInvoices;
      });

      const totalDurationMs = Date.now() - startTime;
      return {
        runId,
        success: true,
        period,
        created: createdInvoices.length,
        invoices: createdInvoices,
        durationMs: totalDurationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      await db.execute(sql`
        UPDATE invoice_runs SET status = 'failed', error = ${String(err.message || err)}, updated_at = now()
        WHERE run_id = ${runId}::uuid
      `);

      await db.execute(sql`
        INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
        VALUES (${userId}::uuid, 'monthly_invoices', ${runId}, 'generate_invoices_failed', ${JSON.stringify({
          error: String(err.message || err),
          durationMs,
          period,
        })}::jsonb, now())
      `);

      throw err;
    }
  }
}

export const billingService = new BillingService();
