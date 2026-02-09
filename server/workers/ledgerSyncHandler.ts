import { db } from "../db";
import { sql, eq, and, inArray } from "drizzle-orm";
import { ledgerEntries, payments, monthlyInvoices } from "@shared/schema";
import { roundMoney } from "@shared/utils";

/**
 * Ledger Sync Job Handler
 *
 * Writes payment and charge entries into ledger_entries
 * after a payment has been allocated by PaymentService.
 * All inserts are idempotent (skip if entry already exists).
 */
export async function handleLedgerSync(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const paymentId = payload.paymentId as string;
  const tenantId = payload.tenantId as string;
  const unapplied = payload.unapplied as number | undefined;

  if (!paymentId || !tenantId) {
    throw new Error("ledger_sync requires paymentId and tenantId");
  }

  let entriesCreated = 0;

  await db.transaction(async (tx) => {
    // 1. Record payment in ledger (idempotent)
    const existingPayment = await tx
      .select({ id: ledgerEntries.id })
      .from(ledgerEntries)
      .where(and(
        eq(ledgerEntries.paymentId, paymentId),
        eq(ledgerEntries.type, "payment")
      ))
      .limit(1);

    if (!existingPayment.length) {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

      if (payment) {
        await tx.insert(ledgerEntries).values({
          tenantId,
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
          type: "payment",
          amount: String(roundMoney(Number(payment.betrag || 0))),
          bookingDate: payment.buchungsDatum,
        });
        entriesCreated++;
      }
    }

    // 2. Sync outstanding invoice charges (skip already-tracked invoices)
    const existingChargeInvoiceIds = await tx
      .select({ invoiceId: ledgerEntries.invoiceId })
      .from(ledgerEntries)
      .where(and(
        eq(ledgerEntries.tenantId, tenantId),
        eq(ledgerEntries.type, "charge")
      ));

    const trackedIds = new Set(existingChargeInvoiceIds.map(r => r.invoiceId).filter(Boolean));

    const openInvoices = await tx
      .select()
      .from(monthlyInvoices)
      .where(and(
        eq(monthlyInvoices.tenantId, tenantId),
        inArray(monthlyInvoices.status, ["offen", "teilbezahlt"])
      ));

    for (const inv of openInvoices) {
      if (trackedIds.has(inv.id)) continue;

      await tx.insert(ledgerEntries).values({
        tenantId,
        invoiceId: inv.id,
        type: "charge",
        amount: String(roundMoney(Number(inv.gesamtbetrag || 0))),
        bookingDate: inv.faelligAm,
      });
      entriesCreated++;
    }

    // 3. Record overpayment as credit
    if (unapplied && unapplied > 0) {
      await tx.insert(ledgerEntries).values({
        tenantId,
        paymentId,
        type: "credit",
        amount: String(roundMoney(unapplied)),
        bookingDate: new Date().toISOString().split("T")[0],
      });
      entriesCreated++;
    }
  });

  console.info(`[LedgerSync] Created ${entriesCreated} ledger entries for payment ${paymentId}`);
  return { paymentId, tenantId, entriesCreated };
}
