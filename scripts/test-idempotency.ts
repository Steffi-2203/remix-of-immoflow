import { paymentService } from "../server/services/paymentService";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

const testPaymentId = "11111111-1111-1111-1111-111111111111";
const tenantId = "00000000-0000-0000-0000-000000000021";

async function testIdempotency() {
  await db.execute(sql`DELETE FROM payments WHERE id = ${testPaymentId}`);
  
  console.log("=== Idempotenz-Test ===");
  console.log("PaymentId:", testPaymentId);
  
  // Erster Aufruf
  try {
    const r1 = await paymentService.allocatePayment({ paymentId: testPaymentId, tenantId, amount: 100 });
    console.log("1. Aufruf:", r1.success ? "Erfolgreich" : "Fehlgeschlagen");
  } catch (e: any) {
    console.log("1. Aufruf Fehler:", e.message);
  }
  
  // Zweiter Aufruf mit gleicher paymentId
  try {
    const r2 = await paymentService.allocatePayment({ paymentId: testPaymentId, tenantId, amount: 100 });
    console.log("2. Aufruf:", r2.success ? "Erfolgreich" : "Fehlgeschlagen");
  } catch (e: any) {
    console.log("2. Aufruf Fehler:", e.message);
  }
  
  // Zählen
  const result = await db.execute(sql`SELECT COUNT(*) as c FROM payments WHERE id = ${testPaymentId}`);
  console.log("\nAnzahl Zahlungen mit dieser ID:", (result.rows[0] as any).c);
  console.log("Erwartet: 1 (Idempotenz)");
  
  process.exit(0);
}

testIdempotency();
