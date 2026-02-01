// scripts/reconcile_check.ts
// Korrigierte Spaltennamen für ImmoflowMe Datenbank
import { pool } from "../server/db";

const INVOICE_IDS = [
  "00000000-0000-0000-0000-000000000031",
  "00000000-0000-0000-0000-000000000032"
];

async function run() {
  console.log("Reconciliation Check Start");
  
  // 1. Invoice invariants
  for (const id of INVOICE_IDS) {
    const result = await pool.query(
      `SELECT id, gesamtbetrag, paid_amount, status FROM monthly_invoices WHERE id = $1::uuid`,
      [id]
    );
    const inv = result.rows[0];
    console.log("Invoice", id, inv);
    if (inv && Number(inv.paid_amount) > Number(inv.gesamtbetrag)) {
      console.error("VIOLATION: paid_amount > gesamtbetrag for", id);
    }
  }

  // 2. Period summary last 30 days
  const period = await pool.query(`
    WITH invoices AS (
      SELECT id, gesamtbetrag FROM monthly_invoices WHERE created_at >= now() - interval '30 days'
    ),
    incoming AS (
      SELECT COALESCE(SUM(betrag),0) AS incoming FROM payments WHERE created_at >= now() - interval '30 days'
    ),
    applied AS (
      SELECT COALESCE(SUM(applied_amount),0) AS applied FROM payment_allocations WHERE created_at >= now() - interval '30 days'
    ),
    over AS (
      SELECT COALESCE(SUM(amount),0) AS over FROM transactions WHERE booking_text ILIKE '%Überzahlung%' AND created_at >= now() - interval '30 days'
    )
    SELECT (SELECT COALESCE(SUM(gesamtbetrag),0) FROM invoices) AS soll,
           (SELECT incoming FROM incoming) AS eingang,
           (SELECT applied FROM applied) AS angewendet,
           (SELECT over FROM over) AS ueberzahlungen;
  `);
  console.log("Period Summary", period.rows[0]);
  const { eingang, angewendet, ueberzahlungen } = period.rows[0] as any;
  if (Number(eingang) !== Number(angewendet) + Number(ueberzahlungen)) {
    console.error("BALANCE MISMATCH: incoming != applied + over");
    console.log(`  eingang: ${eingang}, angewendet: ${angewendet}, ueberzahlungen: ${ueberzahlungen}`);
    console.log(`  Differenz: ${Number(eingang) - Number(angewendet) - Number(ueberzahlungen)}`);
  } else {
    console.log("BALANCE OK");
  }

  // 3. List orphan allocations
  const orphan = await pool.query(`
    SELECT pa.id FROM payment_allocations pa
    LEFT JOIN payments p ON pa.payment_id = p.id
    LEFT JOIN monthly_invoices mi ON pa.invoice_id = mi.id
    WHERE p.id IS NULL OR mi.id IS NULL
    LIMIT 10;
  `);
  console.log("Orphan allocations sample", orphan.rows);
  
  // 4. Zusätzliche Prüfung: Zahlungen ohne Zuordnung
  const unallocated = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(betrag), 0) as summe
    FROM payments p
    WHERE NOT EXISTS (
      SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = p.id
    )
    AND created_at >= now() - interval '30 days';
  `);
  console.log("Unallocated payments (30 days)", unallocated.rows[0]);

  await pool.end();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
