import { db } from "../db";
import { eq, and, sql, asc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { roundMoney } from "@shared/utils";

export async function syncInvoicePaidAmount(invoiceId: string, tx?: any): Promise<{ paidAmount: number; status: string }> {
  const executor = tx || db;

  const result = await executor.execute(sql`
    SELECT COALESCE(SUM(applied_amount::numeric), 0) AS total_allocated
    FROM payment_allocations
    WHERE invoice_id = ${invoiceId}
  `);
  const totalAllocated = roundMoney(Number(((result.rows || result)[0] as any).total_allocated || 0));

  const invoiceResult = await executor.execute(sql`
    SELECT gesamtbetrag FROM monthly_invoices WHERE id = ${invoiceId}
  `);
  const gesamtbetrag = roundMoney(Number(((invoiceResult.rows || invoiceResult)[0] as any)?.gesamtbetrag || 0));

  const status = totalAllocated >= gesamtbetrag ? "bezahlt" : totalAllocated > 0 ? "teilbezahlt" : "offen";

  await executor.execute(sql`
    UPDATE monthly_invoices
    SET paid_amount = ${totalAllocated},
        status = ${status},
        updated_at = NOW()
    WHERE id = ${invoiceId}
  `);

  return { paidAmount: totalAllocated, status };
}

interface ComponentAllocation {
  miete: number;
  bk: number;
  hk: number;
  wk: number;
  ust: number;
}

interface InvoiceAllocation {
  invoiceId: string;
  allocatedAmount: number;
  components: ComponentAllocation;
  remaining: number;
  status: string;
}

interface SplitResult {
  allocations: InvoiceAllocation[];
  totalAllocated: number;
  remainingAmount: number;
}

interface AutoMatchResult {
  matched: Array<{ paymentId: string; invoiceId: string; amount: number; reason: string }>;
  unmatched: string[];
  suggestions: Array<{
    paymentId: string;
    invoiceId: string;
    amount: number;
    confidence: number;
    reason: string;
  }>;
}

export async function splitPaymentByPriority(
  paymentAmount: number,
  tenantId: string,
  orgId: string,
  paymentId?: string
): Promise<SplitResult> {
  let remaining = roundMoney(paymentAmount);
  const allocations: InvoiceAllocation[] = [];

  let effectivePaymentId = paymentId;
  if (!effectivePaymentId) {
    const payResult = await db.execute(sql`
      INSERT INTO payments (tenant_id, betrag, buchungs_datum, payment_type, verwendungszweck, source)
      VALUES (${tenantId}, ${remaining}, now()::date, 'ueberweisung', 'Automatische Zuordnung (Split)', 'auto')
      RETURNING id
    `);
    effectivePaymentId = ((payResult.rows || payResult)[0] as any).id;
  }

  const invoices = await db.execute(sql`
    SELECT mi.*
    FROM monthly_invoices mi
    JOIN units u ON u.id = mi.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE mi.tenant_id = ${tenantId}
      AND mi.status IN ('offen', 'teilbezahlt', 'ueberfaellig')
      AND p.organization_id = ${orgId}
      AND mi.is_vacancy = false
    ORDER BY mi.faellig_am ASC NULLS LAST, mi.year ASC, mi.month ASC
  `);

  const invoiceRows: any[] = (invoices.rows || invoices) as any[];

  for (const inv of invoiceRows) {
    if (remaining <= 0) break;

    const existingAllocations = await db.execute(sql`
      SELECT COALESCE(SUM(applied_amount::numeric), 0) AS already_paid
      FROM payment_allocations
      WHERE invoice_id = ${inv.id}
    `);
    const alreadyPaid = roundMoney(Number(((existingAllocations.rows || existingAllocations)[0] as any).already_paid || 0));

    const grundmiete = roundMoney(Number(inv.grundmiete || 0));
    const bk = roundMoney(Number(inv.betriebskosten || 0));
    const hk = roundMoney(Number(inv.heizungskosten || 0));
    const wk = roundMoney(Number(inv.wasserkosten || 0));
    const ust = roundMoney(Number(inv.ust || 0));
    const total = roundMoney(Number(inv.gesamtbetrag || 0));
    const invoiceDue = roundMoney(Math.max(0, total - alreadyPaid));

    if (invoiceDue <= 0) continue;

    const nettoTotal = roundMoney(grundmiete + bk + hk + wk);
    const ustRatio = nettoTotal > 0 ? ust / nettoTotal : 0;

    const components: ComponentAllocation = { miete: 0, bk: 0, hk: 0, wk: 0, ust: 0 };
    let invoiceAllocated = 0;

    const priorityItems: Array<{ key: keyof Omit<ComponentAllocation, 'ust'>; amount: number }> = [
      { key: "miete", amount: grundmiete },
      { key: "bk", amount: bk },
      { key: "hk", amount: hk },
      { key: "wk", amount: wk },
    ];

    const paidProportion = alreadyPaid > 0 ? alreadyPaid / total : 0;

    for (const item of priorityItems) {
      if (remaining <= 0) break;

      const componentDue = roundMoney(item.amount * (1 - paidProportion));
      if (componentDue <= 0) continue;

      const componentUst = roundMoney(componentDue * ustRatio);
      const componentTotal = roundMoney(componentDue + componentUst);
      const apply = roundMoney(Math.min(remaining, componentTotal));

      const netApply = roundMoney(apply / (1 + ustRatio));
      const ustApply = roundMoney(apply - netApply);

      components[item.key] = roundMoney(components[item.key] + netApply);
      components.ust = roundMoney(components.ust + ustApply);
      invoiceAllocated = roundMoney(invoiceAllocated + apply);
      remaining = roundMoney(remaining - apply);
    }

    if (invoiceAllocated > 0) {
      await db.execute(sql`
        INSERT INTO payment_allocations (id, payment_id, invoice_id, applied_amount, allocation_type, created_at)
        VALUES (gen_random_uuid(), ${effectivePaymentId}, ${inv.id}, ${invoiceAllocated}, 'auto', now())
      `);

      const synced = await syncInvoicePaidAmount(inv.id);

      allocations.push({
        invoiceId: inv.id,
        allocatedAmount: invoiceAllocated,
        components,
        remaining: roundMoney(total - synced.paidAmount),
        status: synced.status,
      });
    }
  }

  return {
    allocations,
    totalAllocated: roundMoney(paymentAmount - remaining),
    remainingAmount: remaining,
  };
}

export async function allocatePaymentToInvoice(
  paymentId: string,
  invoiceId: string,
  amount: number,
  orgId?: string
): Promise<any> {
  const roundedAmount = roundMoney(amount);

  if (orgId) {
    const paymentCheck = await db.execute(sql`
      SELECT p.id FROM payments p
      JOIN properties pr ON pr.id = p.property_id
      WHERE p.id = ${paymentId} AND pr.organization_id = ${orgId}
    `);
    if (!((paymentCheck.rows || paymentCheck) as any[]).length) {
      throw new Error("Zahlung nicht gefunden oder kein Zugriff");
    }

    const invoiceCheck = await db.execute(sql`
      SELECT mi.id FROM monthly_invoices mi
      JOIN units u ON u.id = mi.unit_id
      JOIN properties pr ON pr.id = u.property_id
      WHERE mi.id = ${invoiceId} AND pr.organization_id = ${orgId}
    `);
    if (!((invoiceCheck.rows || invoiceCheck) as any[]).length) {
      throw new Error("Rechnung nicht gefunden oder kein Zugriff");
    }
  }

  const [allocation] = await db
    .insert(schema.paymentAllocations)
    .values({
      paymentId,
      invoiceId,
      appliedAmount: String(roundedAmount),
      allocationType: "miete",
    })
    .returning();

  await syncInvoicePaidAmount(invoiceId);

  return allocation;
}

export async function getUnallocatedPayments(
  orgId: string,
  tenantId?: string
): Promise<any[]> {
  let tenantFilter = sql``;
  if (tenantId) {
    tenantFilter = sql`AND p.tenant_id = ${tenantId}`;
  }

  const result = await db.execute(sql`
    SELECT
      p.*,
      t.first_name AS tenant_first_name,
      t.last_name AS tenant_last_name,
      COALESCE(pa.allocated_total, 0) AS allocated_total,
      p.betrag::numeric - COALESCE(pa.allocated_total, 0) AS unallocated_amount
    FROM payments p
    JOIN tenants t ON t.id = p.tenant_id
    JOIN units u ON u.id = t.unit_id
    JOIN properties prop ON prop.id = u.property_id
    LEFT JOIN (
      SELECT payment_id, SUM(applied_amount::numeric) AS allocated_total
      FROM payment_allocations
      GROUP BY payment_id
    ) pa ON pa.payment_id = p.id
    WHERE prop.organization_id = ${orgId}
      AND (pa.allocated_total IS NULL OR pa.allocated_total < p.betrag::numeric)
      ${tenantFilter}
    ORDER BY p.buchungs_datum DESC
  `);

  return (result.rows || result) as any[];
}

export async function autoMatchPayments(orgId: string): Promise<AutoMatchResult> {
  const matched: AutoMatchResult["matched"] = [];
  const unmatched: string[] = [];
  const suggestions: AutoMatchResult["suggestions"] = [];

  const unallocated = await getUnallocatedPayments(orgId);

  for (const payment of unallocated) {
    const paymentAmount = roundMoney(Number(payment.betrag || 0));
    const allocatedTotal = roundMoney(Number(payment.allocated_total || 0));
    const unallocatedAmount = roundMoney(paymentAmount - allocatedTotal);

    if (unallocatedAmount <= 0) continue;

    const openInvoicesResult = await db.execute(sql`
      SELECT mi.*, COALESCE(pa_sum.allocated, 0) AS already_allocated
      FROM monthly_invoices mi
      LEFT JOIN (
        SELECT invoice_id, SUM(applied_amount::numeric) AS allocated
        FROM payment_allocations
        GROUP BY invoice_id
      ) pa_sum ON pa_sum.invoice_id = mi.id
      WHERE mi.tenant_id = ${payment.tenant_id}
        AND mi.status IN ('offen', 'teilbezahlt', 'ueberfaellig')
        AND mi.is_vacancy = false
      ORDER BY mi.year ASC, mi.month ASC
    `);

    const openInvoices: any[] = (openInvoicesResult.rows || openInvoicesResult) as any[];

    let didMatch = false;

    for (const inv of openInvoices) {
      const invTotal = roundMoney(Number(inv.gesamtbetrag || 0));
      const invAllocated = roundMoney(Number(inv.already_allocated || 0));
      const invDue = roundMoney(invTotal - invAllocated);

      if (invDue <= 0) continue;

      if (Math.abs(unallocatedAmount - invDue) < 0.01) {
        await allocatePaymentToInvoice(payment.id, inv.id, unallocatedAmount);
        matched.push({
          paymentId: payment.id,
          invoiceId: inv.id,
          amount: unallocatedAmount,
          reason: "Exakte Betragsübereinstimmung",
        });
        didMatch = true;
        break;
      }

      if (Math.abs(unallocatedAmount - invDue) < 1.0) {
        suggestions.push({
          paymentId: payment.id,
          invoiceId: inv.id,
          amount: invDue,
          confidence: 80,
          reason: `Betrag fast identisch (Differenz: ${roundMoney(Math.abs(unallocatedAmount - invDue)).toFixed(2)} EUR)`,
        });
      }
    }

    if (!didMatch && suggestions.filter((s) => s.paymentId === payment.id).length === 0) {
      let totalDue = 0;
      for (const inv of openInvoices) {
        totalDue = roundMoney(totalDue + roundMoney(Number(inv.gesamtbetrag || 0) - Number(inv.already_allocated || 0)));
      }

      if (totalDue > 0 && Math.abs(unallocatedAmount - totalDue) < 0.01) {
        for (const inv of openInvoices) {
          const invDue = roundMoney(Number(inv.gesamtbetrag || 0) - Number(inv.already_allocated || 0));
          if (invDue > 0) {
            await allocatePaymentToInvoice(payment.id, inv.id, invDue);
            matched.push({
              paymentId: payment.id,
              invoiceId: inv.id,
              amount: invDue,
              reason: "Summe aller offenen Rechnungen stimmt überein",
            });
          }
        }
        didMatch = true;
      }
    }

    if (!didMatch) {
      unmatched.push(payment.id);
    }
  }

  return { matched, unmatched, suggestions };
}
