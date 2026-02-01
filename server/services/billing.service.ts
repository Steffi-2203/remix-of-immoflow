import { db } from "../db";
import { invoiceGenerator } from "./invoice.generator";
import { roundMoney } from "@shared/utils";
import { sql, eq, inArray } from "drizzle-orm";
import {
  monthlyInvoices,
  invoiceLines,
  tenants,
  units,
  auditLogs
} from "@shared/schema";

/**
 * BillingService
 * - orchestrates dry-run and persist generation
 * - ensures deterministic dry-run -> persist behavior
 * - writes one audit summary per run inside transaction
 */

export class BillingService {
  async generateMonthlyInvoices(params: {
    userId: string;
    propertyIds: string[];
    year: number;
    month: number;
    dryRun?: boolean;
  }) {
    const { userId, propertyIds, year, month, dryRun = true } = params;
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
          const lines = invoiceGenerator.buildInvoiceLines(id, tenant, vatRates, month, year);
          preview.push({ invoice: inv, lines });
        }
      }
      return { success: true, dryRun: true, count: preview.length, preview };
    }

    const createdInvoices = await db.transaction(async (tx) => {
      const insertedInvoices: any[] = [];
      for (const inv of invoicesToCreate) {
        const res = await tx.execute(sql`
          INSERT INTO monthly_invoices (id, tenant_id, unit_id, year, month, grundmiete, betriebskosten, heizungskosten, gesamtbetrag, ust, ust_satz_miete, ust_satz_bk, ust_satz_heizung, status, faellig_am, vortrag_miete, vortrag_bk, vortrag_hk, vortrag_sonstige, created_at)
          VALUES (gen_random_uuid(), ${inv.tenantId}, ${inv.unitId}, ${inv.year}, ${inv.month}, ${inv.grundmiete}, ${inv.betriebskosten}, ${inv.heizungskosten}, ${inv.gesamtbetrag}, ${inv.ust}, ${inv.ustSatzMiete}, ${inv.ustSatzBk}, ${inv.ustSatzHeizung}, ${inv.status}, ${inv.faelligAm}, ${inv.vortragMiete}, ${inv.vortragBk}, ${inv.vortragHk}, ${inv.vortragSonstige}, now())
          ON CONFLICT (tenant_id, year, month) DO NOTHING
          RETURNING *
        `);
        if (res.rows && res.rows.length) {
          insertedInvoices.push(res.rows[0]);
        }
      }

      const allLines: any[] = [];
      for (const inv of insertedInvoices) {
        const tenant = tenantsData.find(t => t.id === inv.tenant_id);
        if (!tenant) continue;
        const unitType = unitTypeMap.get(inv.unit_id || '') || 'wohnung';
        const vatRates = invoiceGenerator.getVatRates(unitType);
        const lines = invoiceGenerator.buildInvoiceLines(inv.id, tenant, vatRates, inv.month, inv.year);
        allLines.push(...lines);
      }

      for (let i = 0; i < allLines.length; i += 500) {
        const batch = allLines.slice(i, i + 500);
        for (const line of batch) {
          await tx.execute(sql`
            INSERT INTO invoice_lines (invoice_id, expense_type, description, net_amount, ust_satz, gross_amount, allocation_reference, created_at)
            VALUES (${line.invoiceId}, ${line.expenseType}, ${line.description}, ${line.netAmount}, ${line.vatRate}, ${line.grossAmount}, ${line.allocationReference}, now())
          `);
        }
      }

      await tx.execute(sql`
        INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
        VALUES (${userId}, 'monthly_invoices', NULL, 'bulk_create', ${JSON.stringify({ createdCount: insertedInvoices.length, year, month })}::jsonb, now())
      `);

      return insertedInvoices;
    });

    return { success: true, dryRun: false, created: createdInvoices.length, invoices: createdInvoices };
  }
}

function unitTypeFromTenant(unitId: string | null, unitTypeMap: Map<string, string>) {
  if (!unitId) return 'wohnung';
  return unitTypeMap.get(unitId) || 'wohnung';
}

export const billingService = new BillingService();
