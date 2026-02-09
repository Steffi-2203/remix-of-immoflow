import { db } from "../db";
import { sql, eq, and, inArray } from "drizzle-orm";
import { ledgerEntries, payments, monthlyInvoices, paymentAllocations } from "@shared/schema";
import { roundMoney } from "@shared/utils";

const ANNUAL_INTEREST_RATE = 4; // §1333 ABGB – 4% p.a.
const DUNNING_FEES: Record<number, number> = { 1: 0, 2: 5, 3: 10 };

function calculateInterest(principal: number, daysOverdue: number): number {
  if (daysOverdue <= 0 || principal <= 0) return 0;
  return roundMoney(principal * (ANNUAL_INTEREST_RATE / 365 / 100) * daysOverdue);
}

function getDunningLevel(daysOverdue: number): number {
  if (daysOverdue >= 45) return 3;
  if (daysOverdue >= 30) return 2;
  if (daysOverdue >= 14) return 1;
  return 0;
}

/**
 * Ledger Sync Job Handler
 *
 * Writes payment, charge, interest, fee, and credit entries into ledger_entries
 * after a payment has been allocated by PaymentService.
 * All inserts are idempotent (skip if entry already exists).
 */
export async function handleLedgerSync(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const paymentId = payload.paymentId as string;
  const tenantId = payload.tenantId as string;
  const applied = payload.applied as number | undefined;
  const unapplied = payload.unapplied as number | undefined;

  if (!paymentId || !tenantId) {
    throw new Error("ledger_sync requires paymentId and tenantId");
  }

  let entriesCreated = 0;
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  await db.transaction(async (tx) => {
    // ──────────────────────────────────────────────
    // 1. Record payment in ledger (idempotent)
    // ──────────────────────────────────────────────
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

    // ──────────────────────────────────────────────
    // 2. Sync invoice charges + partial payment tracking
    // ──────────────────────────────────────────────
    const existingChargeInvoiceIds = await tx
      .select({ invoiceId: ledgerEntries.invoiceId })
      .from(ledgerEntries)
      .where(and(
        eq(ledgerEntries.tenantId, tenantId),
        eq(ledgerEntries.type, "charge")
      ));

    const trackedChargeIds = new Set(existingChargeInvoiceIds.map(r => r.invoiceId).filter(Boolean));

    const openInvoices = await tx
      .select()
      .from(monthlyInvoices)
      .where(and(
        eq(monthlyInvoices.tenantId, tenantId),
        inArray(monthlyInvoices.status, ["offen", "teilbezahlt", "ueberfaellig"])
      ));

    for (const inv of openInvoices) {
      // 2a. Charge entry (once per invoice)
      if (!trackedChargeIds.has(inv.id)) {
        await tx.insert(ledgerEntries).values({
          tenantId,
          invoiceId: inv.id,
          type: "charge",
          amount: String(roundMoney(Number(inv.gesamtbetrag || 0))),
          bookingDate: inv.faelligAm,
        });
        entriesCreated++;
      }

      // 2b. Interest on overdue invoices (§1333 ABGB, 4% p.a.)
      if (!inv.faelligAm) continue;
      const dueDate = new Date(inv.faelligAm);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue > 0) {
        const invoiceTotal = roundMoney(Number(inv.gesamtbetrag || 0));
        const paidAmount = roundMoney(Number((inv as any).paidAmount ?? (inv as any).paid_amount ?? 0));
        const outstanding = roundMoney(invoiceTotal - paidAmount);

        if (outstanding > 0) {
          // Idempotent: only one interest entry per invoice per payment event
          const existingInterest = await tx
            .select({ id: ledgerEntries.id })
            .from(ledgerEntries)
            .where(and(
              eq(ledgerEntries.invoiceId, inv.id),
              eq(ledgerEntries.paymentId, paymentId),
              eq(ledgerEntries.type, "interest")
            ))
            .limit(1);

          if (!existingInterest.length) {
            const interest = calculateInterest(outstanding, daysOverdue);
            if (interest > 0) {
              await tx.insert(ledgerEntries).values({
                tenantId,
                invoiceId: inv.id,
                paymentId,
                type: "interest",
                amount: String(interest),
                bookingDate: todayStr,
              });
              entriesCreated++;
            }
          }

          // 2c. Dunning fee based on overdue level
          const level = getDunningLevel(daysOverdue);
          const fee = DUNNING_FEES[level] ?? 0;

          if (fee > 0) {
            const existingFee = await tx
              .select({ id: ledgerEntries.id })
              .from(ledgerEntries)
              .where(and(
                eq(ledgerEntries.invoiceId, inv.id),
                eq(ledgerEntries.paymentId, paymentId),
                eq(ledgerEntries.type, "fee")
              ))
              .limit(1);

            if (!existingFee.length) {
              await tx.insert(ledgerEntries).values({
                tenantId,
                invoiceId: inv.id,
                paymentId,
                type: "fee",
                amount: String(roundMoney(fee)),
                bookingDate: todayStr,
              });
              entriesCreated++;
            }
          }
        }
      }
    }

    // ──────────────────────────────────────────────
    // 3. Overpayment → credit entry
    // ──────────────────────────────────────────────
    if (unapplied && unapplied > 0) {
      const existingCredit = await tx
        .select({ id: ledgerEntries.id })
        .from(ledgerEntries)
        .where(and(
          eq(ledgerEntries.paymentId, paymentId),
          eq(ledgerEntries.type, "credit")
        ))
        .limit(1);

      if (!existingCredit.length) {
        await tx.insert(ledgerEntries).values({
          tenantId,
          paymentId,
          type: "credit",
          amount: String(roundMoney(unapplied)),
          bookingDate: todayStr,
        });
        entriesCreated++;
      }
    }
  });

  console.info(`[LedgerSync] Created ${entriesCreated} ledger entries for payment ${paymentId}`);
  return { paymentId, tenantId, entriesCreated };
}
