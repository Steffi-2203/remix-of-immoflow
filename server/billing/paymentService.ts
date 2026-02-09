import { db } from "../db";
import { 
  payments, 
  monthlyInvoices, 
  tenants,
  units,
  properties,
  messages,
  transactions,
  auditLogs,
  paymentAllocations
} from "@shared/schema";
import { eq, and, gte, lte, desc, or, inArray, sql } from "drizzle-orm";
import { roundMoney } from "@shared/utils";
import { optimisticUpdate } from "../lib/optimisticLock";
import { logAuditEvent } from "../audit/auditEvents.service";

interface DunningLevel {
  level: 1 | 2 | 3;
  name: string;
  daysOverdue: number;
  fee: number;
}

interface DunningResult {
  tenantId: string;
  tenantName: string;
  email: string | null;
  outstandingAmount: number;
  dunningLevel: DunningLevel;
  overdueInvoices: Array<{
    id: string;
    month: number;
    year: number;
    amount: number;
    dueDate: string;
  }>;
}

const DUNNING_LEVELS: DunningLevel[] = [
  { level: 1, name: "Zahlungserinnerung", daysOverdue: 14, fee: 0 },
  { level: 2, name: "1. Mahnung", daysOverdue: 30, fee: 5 },
  { level: 3, name: "2. Mahnung", daysOverdue: 45, fee: 10 },
];

export class PaymentService {
  async allocatePayment(params: {
    paymentId: string;
    tenantId: string;
    amount: number;
    bookingDate?: string;
    paymentType?: string;
    reference?: string;
    userId?: string;
  }) {
    const { paymentId, tenantId, amount, bookingDate, paymentType = "ueberweisung", reference, userId } = params;
    const roundedAmount = roundMoney(amount);

    return await db.transaction(async (tx) => {
      await tx.execute(sql`
        INSERT INTO payments (id, tenant_id, invoice_id, betrag, buchungs_datum, payment_type, verwendungszweck, created_at)
        VALUES (${paymentId}, ${tenantId}, NULL, ${roundedAmount}, ${bookingDate ?? sql`now()::date`}, ${paymentType}, ${reference || null}, now())
        ON CONFLICT (id) DO NOTHING
      `);

      const invoices = await tx.execute(sql`
        SELECT id, gesamtbetrag, COALESCE(paid_amount, 0) AS paid_amount
        FROM monthly_invoices
        WHERE tenant_id = ${tenantId} AND status IN ('offen','teilbezahlt')
        ORDER BY year, month
        FOR UPDATE
      `).then(r => r.rows);

      // Resolve organization_id from tenant for overpayment tracking
      const tenantRow = await tx.execute(sql`
        SELECT t.id, u.property_id, p.organization_id
        FROM tenants t
        LEFT JOIN units u ON u.id = t.unit_id
        LEFT JOIN properties p ON p.id = u.property_id
        WHERE t.id = ${tenantId}
      `).then(r => r.rows[0]);
      const orgId = (tenantRow as any)?.organization_id || null;

      let remaining = roundedAmount;
      let appliedTotal = 0;

      for (const inv of invoices) {
        if (remaining <= 0) break;

        const total = roundMoney(Number(inv.gesamtbetrag || 0));
        const paid = roundMoney(Number(inv.paid_amount || 0));
        const due = roundMoney(total - paid);
        if (due <= 0) continue;

        const apply = roundMoney(Math.min(remaining, due));
        const newPaid = roundMoney(paid + apply);
        remaining = roundMoney(remaining - apply);
        appliedTotal = roundMoney(appliedTotal + apply);

        const newStatus = newPaid >= total ? "bezahlt" : newPaid > 0 ? "teilbezahlt" : "offen";

        const optRes = await optimisticUpdate({
          tableName: "monthly_invoices",
          id: inv.id as string,
          updateFields: () => ({
            paid_amount: newPaid,
            status: newStatus,
          }),
          maxRetries: 5,
          delayMs: 40,
          tx
        });

        if (!optRes.success) {
          await tx.execute(sql`
            UPDATE monthly_invoices
            SET paid_amount = ${newPaid},
                status = CASE WHEN ${newPaid} >= ${total} THEN 'bezahlt' WHEN ${newPaid} > 0 THEN 'teilbezahlt' ELSE status END,
                version = COALESCE(version, 1) + 1,
                updated_at = now()
            WHERE id = ${inv.id}
          `);
        }

        // Record payment allocation
        await tx.execute(sql`
          INSERT INTO payment_allocations (id, payment_id, invoice_id, applied_amount, allocation_type, created_at)
          VALUES (gen_random_uuid(), ${paymentId}, ${inv.id}, ${apply}, 'auto', now())
        `);

        await tx.execute(sql`
          INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
          VALUES (${userId || null}, 'monthly_invoices', ${inv.id}, 'payment_allocated', ${JSON.stringify({ paymentId, applied: apply })}::jsonb, now())
        `);

        await logAuditEvent(tx, {
          actor: userId || 'system',
          type: 'payment_allocated',
          entity: 'monthly_invoices',
          entityId: inv.id as string,
          operation: 'allocate',
          old: { paidAmount: paid, status: inv.status },
          new: { paidAmount: newPaid, status: newStatus, applied: apply },
        });
      }

      let unapplied = remaining;
      if (unapplied > 0) {
        await tx.execute(sql`
          INSERT INTO transactions (id, organization_id, bank_account_id, amount, transaction_date, booking_text, created_at)
          VALUES (gen_random_uuid(), ${orgId}, NULL, ${unapplied}, now()::date, ${'Überzahlung / Gutschrift für Tenant ' + tenantId}, now())
        `);

        await tx.execute(sql`
          UPDATE payments SET notizen = COALESCE(notizen, '') || ${' Überzahlung ' + unapplied.toFixed(2) + ' €'} WHERE id = ${paymentId}
        `);
      }

      await tx.execute(sql`
        INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
        VALUES (${userId || null}, 'payments', ${paymentId}, 'allocated', ${JSON.stringify({
          tenantId,
          paymentId,
          amount: roundedAmount,
          applied: appliedTotal,
          unapplied
        })}::jsonb, now())
      `);

      // Enqueue async ledger sync job
      await tx.execute(sql`
        INSERT INTO job_queue (id, job_type, payload, status, created_at)
        VALUES (gen_random_uuid(), 'ledger_sync', ${JSON.stringify({ paymentId, tenantId, amount: roundedAmount, applied: appliedTotal, unapplied })}::jsonb, 'pending', now())
      `);
      return {
        success: true,
        paymentId,
        applied: appliedTotal,
        unapplied,
      };
    });
  }

  async getTenantBalance(tenantId: string, year?: number) {
    const whereYear = year ? sql`AND year = ${year}` : sql``;
    const result = await db.execute(sql`
      SELECT COALESCE(SUM(gesamtbetrag),0) AS total_soll, COALESCE(SUM(paid_amount),0) AS total_ist
      FROM monthly_invoices
      WHERE tenant_id = ${tenantId} ${whereYear}
    `).then(r => r.rows[0]);

    const totalSoll = roundMoney(Number(result?.total_soll || 0));
    const totalIst = roundMoney(Number(result?.total_ist || 0));
    return { 
      totalSoll, 
      totalIst, 
      saldo: roundMoney(totalSoll - totalIst),
      sollGesamt: totalSoll,
      istGesamt: totalIst,
    };
  }

  getDunningLevel(daysOverdue: number): number {
    if (daysOverdue >= 45) return 3;
    if (daysOverdue >= 30) return 2;
    if (daysOverdue >= 14) return 1;
    return 0;
  }

  async recordDunningAction(params: { 
    tenantId: string; 
    level: number; 
    userId?: string; 
    note?: string 
  }) {
    const { tenantId, level, userId, note } = params;
    
    await db.execute(sql`
      INSERT INTO audit_logs (user_id, table_name, record_id, action, new_data, created_at)
      VALUES (${userId || null}, 'dunning', ${tenantId}, 'create', ${JSON.stringify({ level, note })}::jsonb, now())
    `);
    
    return { success: true, level };
  }

  async getTenantsForDunning(organizationId: string, minDaysOverdue: number = 14): Promise<DunningResult[]> {
    const today = new Date();
    const results: DunningResult[] = [];

    const orgTenants = await db
      .select({
        tenant: tenants,
        unit: units,
        property: properties,
      })
      .from(tenants)
      .leftJoin(units, eq(tenants.unitId, units.id))
      .leftJoin(properties, eq(units.propertyId, properties.id))
      .where(eq(properties.organizationId, organizationId));

    for (const { tenant, unit, property } of orgTenants) {
      if (!tenant) continue;

      const overdueInvoices = await db
        .select()
        .from(monthlyInvoices)
        .where(
          and(
            eq(monthlyInvoices.tenantId, tenant.id),
            or(
              eq(monthlyInvoices.status, "offen"),
              eq(monthlyInvoices.status, "teilbezahlt"),
              eq(monthlyInvoices.status, "ueberfaellig")
            )
          )
        )
        .orderBy(monthlyInvoices.year, monthlyInvoices.month);

      const overdueDetails: DunningResult["overdueInvoices"] = [];
      let maxDaysOverdue = 0;
      let totalOutstanding = 0;

      for (const invoice of overdueInvoices) {
        if (!invoice.faelligAm) continue;

        const dueDate = new Date(invoice.faelligAm);
        const daysOverdue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysOverdue >= minDaysOverdue) {
          const invoiceTotal = Number(invoice.gesamtbetrag) || 0;
          const paidAmount = Number((invoice as any).paidAmount ?? 0);
          const outstanding = roundMoney(invoiceTotal - paidAmount);

          if (outstanding > 0) {
            overdueDetails.push({
              id: invoice.id,
              month: invoice.month,
              year: invoice.year,
              amount: outstanding,
              dueDate: invoice.faelligAm,
            });
            totalOutstanding = roundMoney(totalOutstanding + outstanding);
            maxDaysOverdue = Math.max(maxDaysOverdue, daysOverdue);
          }
        }
      }

      if (overdueDetails.length > 0) {
        const dunningLevel =
          DUNNING_LEVELS.find((l) => maxDaysOverdue >= l.daysOverdue) ||
          DUNNING_LEVELS[0];

        results.push({
          tenantId: tenant.id,
          tenantName: `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim(),
          email: tenant.email,
          outstandingAmount: totalOutstanding,
          dunningLevel,
          overdueInvoices: overdueDetails,
        });
      }
    }

    return results.sort((a, b) => b.outstandingAmount - a.outstandingAmount);
  }

  async sendDunningReminder(
    tenantId: string,
    dunningLevel: DunningLevel,
    userId: string
  ): Promise<{ success: boolean; messageId?: string }> {
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .then((r) => r[0]);

    if (!tenant || !tenant.email) {
      return { success: false };
    }

    const balance = await this.getTenantBalance(tenantId);
    const subject = `${dunningLevel.name} - Offener Betrag: €${balance.saldo.toFixed(2)}`;

    const body = `
Sehr geehrte/r ${tenant.firstName} ${tenant.lastName},

wir möchten Sie daran erinnern, dass folgende Beträge noch offen sind:

Offener Gesamtbetrag: €${balance.saldo.toFixed(2)}
${dunningLevel.fee > 0 ? `Mahngebühr: €${dunningLevel.fee.toFixed(2)}` : ""}

Bitte überweisen Sie den offenen Betrag innerhalb von 7 Tagen.

Mit freundlichen Grüßen,
Ihre Hausverwaltung
    `.trim();

    const [message] = await db
      .insert(messages)
      .values({
        recipientEmail: tenant.email,
        recipientType: "tenant",
        subject,
        messageBody: body,
        messageType: "dunning",
        status: "pending",
      })
      .returning();

    await this.recordDunningAction({
      tenantId,
      level: dunningLevel.level,
      userId,
      note: `${dunningLevel.name} versendet`,
    });

    return { success: true, messageId: message.id };
  }

  calculateInterest(
    principal: number,
    daysOverdue: number,
    annualRate: number = 4
  ): number {
    const dailyRate = annualRate / 365 / 100;
    return roundMoney(principal * dailyRate * daysOverdue);
  }
}

export const paymentService = new PaymentService();
