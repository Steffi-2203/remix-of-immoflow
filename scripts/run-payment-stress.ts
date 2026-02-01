import { db } from "../server/db";
import { payments, transactions } from "../shared/schema";
import { paymentService } from "../server/services/paymentService";
import { sql, and, gte } from "drizzle-orm";

interface InvoiceRow {
  id: string;
  gesamtbetrag: string;
  paid_amount: string;
  status: string;
  [key: string]: unknown;
}

async function runStressTest() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log("Usage: npx tsx scripts/run-payment-stress.ts <tenantId> <invoiceId> <numRequests> [amountPerRequest]");
    console.log("Example: npx tsx scripts/run-payment-stress.ts 00000000-0000-0000-0000-000000000021 <invoiceId> 50 50");
    console.log("\nTo find test data:");
    console.log("  SELECT id, first_name, last_name FROM tenants WHERE last_name = 'Mieter';");
    console.log("  SELECT id, gesamtbetrag, paid_amount, status FROM monthly_invoices WHERE tenant_id = '<tenantId>';");
    process.exit(1);
  }

  const tenantId = args[0];
  const invoiceId = args[1];
  const numRequests = parseInt(args[2], 10);
  const amountPerRequest = parseFloat(args[3] || "50");

  console.log(`\n=== Payment Stress Test ===`);
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`Invoice ID: ${invoiceId}`);
  console.log(`Parallel Requests: ${numRequests}`);
  console.log(`Amount per Request: €${amountPerRequest.toFixed(2)}`);
  console.log(`Total Amount: €${(numRequests * amountPerRequest).toFixed(2)}`);

  // Get invoice before test (use raw SQL for migration-added columns)
  const invoiceBeforeResult = await db.execute<InvoiceRow>(
    sql`SELECT id, gesamtbetrag, paid_amount, status FROM monthly_invoices WHERE id = ${invoiceId}`
  );
  const invoiceBefore = invoiceBeforeResult.rows[0];

  if (!invoiceBefore) {
    console.error(`\nError: Invoice ${invoiceId} not found`);
    process.exit(1);
  }

  const totalAmount = parseFloat(invoiceBefore.gesamtbetrag);
  const paidBefore = parseFloat(invoiceBefore.paid_amount || "0");

  console.log(`\n--- Before Test ---`);
  console.log(`Invoice Total: €${totalAmount.toFixed(2)}`);
  console.log(`Already Paid: €${paidBefore.toFixed(2)}`);
  console.log(`Status: ${invoiceBefore.status}`);

  const startTime = Date.now();
  const testStartDate = new Date();

  // Create parallel payment requests
  const promises = Array.from({ length: numRequests }, (_, i) => {
    const paymentId = crypto.randomUUID();
    return paymentService.allocatePayment({
      paymentId,
      tenantId,
      amount: amountPerRequest,
      bookingDate: new Date().toISOString().split('T')[0],
      reference: `Stress-Test Zahlung ${i + 1}/${numRequests}`,
    }).then(result => ({ index: i, success: true, result }))
      .catch(error => ({ index: i, success: false, error: error.message }));
  });

  console.log(`\n--- Running ${numRequests} parallel requests... ---`);
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;

  // Analyze results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n--- Results ---`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Successful: ${successful.length}/${numRequests}`);
  console.log(`Failed: ${failed.length}/${numRequests}`);

  if (failed.length > 0) {
    console.log(`\nFailure reasons:`);
    const errorCounts: Record<string, number> = {};
    for (const f of failed) {
      const msg = (f as any).error || 'unknown';
      errorCounts[msg] = (errorCounts[msg] || 0) + 1;
    }
    for (const [msg, count] of Object.entries(errorCounts)) {
      console.log(`  ${count}x: ${msg}`);
    }
  }

  // Get invoice after test
  const invoiceAfterResult = await db.execute<InvoiceRow>(
    sql`SELECT id, gesamtbetrag, paid_amount, status FROM monthly_invoices WHERE id = ${invoiceId}`
  );
  const invoiceAfter = invoiceAfterResult.rows[0];

  const paidAfter = parseFloat(invoiceAfter.paid_amount || "0");

  console.log(`\n--- After Test ---`);
  console.log(`Invoice Total: €${totalAmount.toFixed(2)}`);
  console.log(`Paid Amount: €${paidAfter.toFixed(2)}`);
  console.log(`Status: ${invoiceAfter.status}`);

  // Verify consistency
  const expectedPaid = Math.min(
    paidBefore + (successful.length * amountPerRequest),
    totalAmount
  );
  
  console.log(`\n--- Consistency Check ---`);
  console.log(`Expected paid (max): €${expectedPaid.toFixed(2)}`);
  console.log(`Actual paid: €${paidAfter.toFixed(2)}`);
  
  if (Math.abs(paidAfter - expectedPaid) < 0.01) {
    console.log(`✓ PASSED: Amounts match`);
  } else {
    console.log(`✗ WARNING: Amount mismatch - possible race condition`);
  }

  // Count related records
  const [paymentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .where(and(
      sql`${payments.tenantId}::text = ${tenantId}`,
      gte(payments.createdAt, testStartDate)
    ));

  const [transactionCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(gte(transactions.createdAt, testStartDate));

  console.log(`\n--- Database Records Created ---`);
  console.log(`Payments: ${paymentCount.count}`);
  console.log(`Transactions: ${transactionCount.count}`);

  // Check for overpayment transactions
  const [overpaymentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(and(
      sql`${transactions.bookingText} ILIKE '%Überzahlung%'`,
      gte(transactions.createdAt, testStartDate)
    ));

  if (Number(overpaymentCount.count) > 0) {
    console.log(`Overpayment transactions: ${overpaymentCount.count}`);
  }

  console.log(`\n=== Test Complete ===\n`);
  process.exit(0);
}

runStressTest().catch(err => {
  console.error("Stress test failed:", err);
  process.exit(1);
});
