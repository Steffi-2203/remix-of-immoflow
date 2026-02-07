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

function reconcileRounding(lines: any[], expectedTotal: number): void {
  const roundedSum = lines.reduce((s, l) => s + roundMoney(l.amount || 0), 0);
  let diff = roundMoney(expectedTotal - roundedSum);
  if (Math.abs(diff) < 0.01) return;

  lines.sort((a, b) => Math.abs(b.amount || 0) - Math.abs(a.amount || 0));
  let i = 0;
  while (Math.abs(diff) >= 0.01 && i < lines.length * 2) {
    const adjust = diff > 0 ? 0.01 : -0.01;
    lines[i % lines.length].amount = roundMoney(lines[i % lines.length].amount + adjust);
    diff = roundMoney(diff - adjust);
    i++;
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

    const vacancyTenants = await db.select().from(tenants).where(
      sql`${tenants.unitId} IN (${sql.join(unitIds.map(id => sql`${id}`), sql`, `)}) AND ${tenants.status} = 'leerstand'`
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

    for (const vt of vacancyTenants) {
      const unit = unitsData.find(u => u.id === vt.unitId);
      const unitType = unitTypeMap.get(vt.unitId || '') || 'wohnung';
      const vatRates = invoiceGenerator.getVatRates(unitType);
      const bk = roundMoney(Number(unit?.leerstandBk ?? vt.betriebskostenVorschuss) || 0);
      const hk = roundMoney(Number(unit?.leerstandHk ?? vt.heizkostenVorschuss) || 0);
      const ust = roundMoney(
        invoiceGenerator.calculateVatFromGross(bk, vatRates.ustSatzBk) +
        invoiceGenerator.calculateVatFromGross(hk, vatRates.ustSatzHeizung)
      );
      const gesamtbetrag = roundMoney(bk + hk);
      invoicesToCreate.push({
        tenantId: vt.id,
        unitId: vt.unitId,
        year,
        month,
        grundmiete: 0,
        betriebskosten: bk,
        heizungskosten: hk,
        gesamtbetrag,
        ust,
        ustSatzMiete: vatRates.ustSatzMiete,
        ustSatzBk: vatRates.ustSatzBk,
        ustSatzHeizung: vatRates.ustSatzHeizung,
        status: "offen" as const,
        faelligAm: dueDate,
        vortragMiete: 0,
        vortragBk: 0,
        vortragHk: 0,
        vortragSonstige: 0,
        isVacancy: true,
      });
    }

    if (dryRun) {
      const preview = [];
      for (const inv of invoicesToCreate) {
        const id = `preview-${inv.tenantId}-${inv.year}-${inv.month}`;
        const vatRates = invoiceGenerator.getVatRates(unitTypeFromTenant(inv.unitId, unitTypeMap));
        const isVacancyPreview = (inv as any).isVacancy === true;
        let tenant = tenantsData.find(x => x.id === inv.tenantId);
        if (!tenant && isVacancyPreview) {
          const vt = vacancyTenants.find(x => x.id === inv.tenantId);
          if (vt) {
            const unit = unitsData.find(u => u.id === vt.unitId);
            tenant = {
              ...vt,
              grundmiete: '0',
              betriebskostenVorschuss: String(unit?.leerstandBk ?? vt.betriebskostenVorschuss ?? '0'),
              heizkostenVorschuss: String(unit?.leerstandHk ?? vt.heizkostenVorschuss ?? '0'),
              wasserkostenVorschuss: '0',
              sonstigeKosten: null,
            } as typeof tenants.$inferSelect;
          }
        }
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

    try {
      const createdInvoices = await db.transaction(async (tx) => {
        const insertedInvoices: any[] = [];
        for (const inv of invoicesToCreate) {
          const isVacancy = (inv as any).isVacancy === true;
          const res = await tx.execute(sql`
            INSERT INTO monthly_invoices (id, tenant_id, unit_id, year, month, grundmiete, betriebskosten, heizungskosten, gesamtbetrag, ust, ust_satz_miete, ust_satz_bk, ust_satz_heizung, status, faellig_am, vortrag_miete, vortrag_bk, vortrag_hk, vortrag_sonstige, is_vacancy, run_id, created_at)
            VALUES (gen_random_uuid(), ${inv.tenantId}, ${inv.unitId}, ${inv.year}, ${inv.month}, ${inv.grundmiete}, ${inv.betriebskosten}, ${inv.heizungskosten}, ${inv.gesamtbetrag}, ${inv.ust}, ${inv.ustSatzMiete}, ${inv.ustSatzBk}, ${inv.ustSatzHeizung}, ${inv.status}, ${inv.faelligAm}, ${inv.vortragMiete}, ${inv.vortragBk}, ${inv.vortragHk}, ${inv.vortragSonstige}, ${isVacancy}, ${runId}::uuid, now())
            ON CONFLICT (tenant_id, year, month) DO NOTHING
            RETURNING *
          `);
          if (res.rows && res.rows.length) {
            insertedInvoices.push(res.rows[0]);
          }
        }

        const allLines: any[] = [];
        let skippedLines: { type: string; reason: string }[] = [];
        
        const vacancyTenantOverrides = new Map<string, typeof tenants.$inferSelect>();
        for (const vt of vacancyTenants) {
          const unit = unitsData.find(u => u.id === vt.unitId);
          vacancyTenantOverrides.set(vt.id, {
            ...vt,
            grundmiete: '0',
            betriebskostenVorschuss: String(unit?.leerstandBk ?? vt.betriebskostenVorschuss ?? '0'),
            heizkostenVorschuss: String(unit?.leerstandHk ?? vt.heizkostenVorschuss ?? '0'),
            wasserkostenVorschuss: '0',
            sonstigeKosten: null,
          } as typeof tenants.$inferSelect);
        }
        const allTenantsForLookup = [...tenantsData, ...vacancyTenants];
        for (const inv of insertedInvoices) {
          const isVacancyInv = inv.is_vacancy === true;
          const tenant = isVacancyInv
            ? vacancyTenantOverrides.get(inv.tenant_id)
            : tenantsData.find(t => t.id === inv.tenant_id);
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
        let conflictCount = 0;
        const conflictKeys: { invoiceId: string; lineType: string; description: string }[] = [];
        
        const batches = chunk(allLines, 500);
        for (const batch of batches) {
          if (batch.length > 0) {
            const values = batch.map(line => 
              sql`(${line.invoiceId}, ${line.unitId}, ${line.lineType}, ${line.description}, ${roundMoney(line.amount)}, ${line.taxRate}, ${JSON.stringify(line.meta || {})}::jsonb, now())`
            );
            const result = await tx.execute(sql`
              WITH inserted AS (
                INSERT INTO invoice_lines (invoice_id, unit_id, line_type, description, amount, tax_rate, meta, created_at)
                VALUES ${sql.join(values, sql`, `)}
                ON CONFLICT ON CONSTRAINT invoice_lines_unique_key DO NOTHING
                RETURNING id, invoice_id, line_type, description
              )
              SELECT COUNT(*) as cnt, array_agg(invoice_id) as inserted_ids FROM inserted
            `);
            const inserted = Number(result.rows?.[0]?.cnt || 0);
            const rawIds = result.rows?.[0]?.inserted_ids as string[] | null;
            const insertedIds = new Set<string>((rawIds || []).map(String));
            
            for (const line of batch) {
              if (!insertedIds.has(line.invoiceId)) {
                if (conflictKeys.length < 20) {
                  conflictKeys.push({ invoiceId: line.invoiceId, lineType: line.lineType, description: line.description });
                }
              }
            }
            
            insertedLinesCount += inserted;
            conflictCount += batch.length - inserted;
          }
        }
        
        if (conflictCount > 0) {
          console.warn(`Invoice lines: ${conflictCount} conflicts (duplicates skipped)`, conflictKeys.slice(0, 5));
        }

        await tx.execute(sql`
          UPDATE invoice_runs SET status = 'completed', updated_at = now()
          WHERE run_id = ${runId}::uuid
        `);

        await tx.execute(sql`
          INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
          VALUES (${userId}::uuid, 'monthly_invoices', ${runId}, 'generate_invoices', ${JSON.stringify({ 
            period, 
            invoicesCount: insertedInvoices.length, 
            linesCount: allLines.length,
            insertedLinesCount,
            conflictCount,
            conflictKeys: conflictKeys.slice(0, 10),
            skippedLinesCount: skippedLines.length,
            skippedDetails: skippedLines.slice(0, 10)
          })}::jsonb, now())
        `);

        return insertedInvoices;
      });

      return { runId, success: true, period, created: createdInvoices.length, invoices: createdInvoices };
    } catch (err: any) {
      await db.execute(sql`
        UPDATE invoice_runs SET status = 'failed', error = ${String(err.message || err)}, updated_at = now()
        WHERE run_id = ${runId}::uuid
      `);

      await db.execute(sql`
        INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
        VALUES (${userId}::uuid, 'monthly_invoices', ${runId}, 'generate_invoices_failed', ${JSON.stringify({ error: String(err.message || err) })}::jsonb, now())
      `);

      throw err;
    }
  }
}

export const billingService = new BillingService();
