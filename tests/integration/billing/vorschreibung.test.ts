import { describe, test, expect } from 'vitest';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';
import { roundMoney } from '@shared/utils';

const hasDb = !!process.env.DATABASE_URL;
const PREFIX = 'int-vorschr';

describe.skipIf(!hasDb)('Vorschreibung – invoice generation integrity', () => {
  test('invoice line amounts sum to gesamtbetrag', async () => {
    // Verify integrity across existing invoices (sample check)
    const rows = await db.execute(sql`
      SELECT mi.id, mi.gesamtbetrag,
        COALESCE(SUM(il.amount), 0) as lines_sum
      FROM monthly_invoices mi
      LEFT JOIN invoice_lines il ON il.invoice_id = mi.id AND il.deleted_at IS NULL
      GROUP BY mi.id, mi.gesamtbetrag
      HAVING COUNT(il.id) > 0
      LIMIT 20
    `).then(r => r.rows);

    for (const row of rows) {
      const gesamtbetrag = Number(row.gesamtbetrag);
      const linesSum = Number(row.lines_sum);
      // Lines should sum to gesamtbetrag within rounding tolerance
      expect(Math.abs(gesamtbetrag - linesSum)).toBeLessThanOrEqual(0.02);
    }
  });

  test('USt calculation: 10% on Miete/BK, 20% on HK', () => {
    const grundmiete = 650;
    const betriebskosten = 180;
    const heizkosten = 95;

    const ustMiete = roundMoney(grundmiete - grundmiete / 1.10);
    const ustBk = roundMoney(betriebskosten - betriebskosten / 1.10);
    const ustHk = roundMoney(heizkosten - heizkosten / 1.20);

    expect(ustMiete).toBe(59.09);
    expect(ustBk).toBe(16.36);
    expect(ustHk).toBe(15.83);
  });

  test('pro-rata calculation for mid-month move-in', () => {
    // Tenant moves in on 15th of a 30-day month
    const fullRent = 900;
    const daysInMonth = 30;
    const occupiedDays = 16; // 15th to 30th inclusive
    const proRata = roundMoney(fullRent * (occupiedDays / daysInMonth));

    expect(proRata).toBe(480);
  });
});
