import { db } from "../db";
import { sql } from "drizzle-orm";
import { roundMoney } from "@shared/utils";

/**
 * Ledger Sync Job Handler
 * 
 * Writes payment and charge entries into ledger_entries
 * after a payment has been allocated by PaymentService.
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

  await db.transaction(async (tx) => {
    // 1. Record payment in ledger (idempotent – skip if already exists)
    const existingPayment = await tx.execute(sql`
      SELECT id FROM ledger_entries
      WHERE payment_id = ${paymentId}::uuid AND type = 'payment'
      LIMIT 1
    `);

    if (!existingPayment.rows?.length) {
      const payment = await tx.execute(sql`
        SELECT id, tenant_id, betrag, buchungs_datum, invoice_id
        FROM payments WHERE id = ${paymentId}::uuid
      `).then(r => r.rows?.[0]);

      if (payment) {
        await tx.execute(sql`
          INSERT INTO ledger_entries (tenant_id, payment_id, invoice_id, type, amount, booking_date)
          VALUES (
            ${tenantId}::uuid,
            ${paymentId}::uuid,
            ${(payment as any).invoice_id || null},
            'payment',
            ${roundMoney(Number((payment as any).betrag || 0))},
            COALESCE(${(payment as any).buchungs_datum}::date, now()::date)
          )
        `);
        entriesCreated++;
      }
    }

    // 2. Sync outstanding invoice charges (idempotent per invoice)
    const invoices = await tx.execute(sql`
      SELECT id, gesamtbetrag, faellig_am
      FROM monthly_invoices
      WHERE tenant_id = ${tenantId}::uuid
        AND status IN ('offen', 'teilbezahlt')
        AND id NOT IN (
          SELECT invoice_id FROM ledger_entries
          WHERE tenant_id = ${tenantId}::uuid AND type = 'charge' AND invoice_id IS NOT NULL
        )
      ORDER BY year, month
    `).then(r => r.rows || []);

    for (const inv of invoices) {
      await tx.execute(sql`
        INSERT INTO ledger_entries (tenant_id, invoice_id, type, amount, booking_date)
        VALUES (
          ${tenantId}::uuid,
          ${(inv as any).id}::uuid,
          'charge',
          ${roundMoney(Number((inv as any).gesamtbetrag || 0))},
          COALESCE(${(inv as any).faellig_am}::date, now()::date)
        )
      `);
      entriesCreated++;
    }

    // 3. Record overpayment as credit if applicable
    if (unapplied && unapplied > 0) {
      await tx.execute(sql`
        INSERT INTO ledger_entries (tenant_id, payment_id, type, amount, booking_date)
        VALUES (
          ${tenantId}::uuid,
          ${paymentId}::uuid,
          'credit',
          ${roundMoney(unapplied)},
          now()::date
        )
      `);
      entriesCreated++;
    }
  });

  console.info(`[LedgerSync] Created ${entriesCreated} ledger entries for payment ${paymentId}`);
  return { paymentId, tenantId, entriesCreated };
}
