import { describe, test, expect } from 'vitest';
import { db, sql, hasDb } from '../setup/db';
import { roundMoney } from '@shared/utils';

describe.skipIf(!hasDb)('Vorschreibung – invoice generation integrity', () => {
  test('invoice line amounts sum to gesamtbetrag', async () => {
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
    const fullRent = 900;
    const daysInMonth = 30;
    const occupiedDays = 16;
    const proRata = roundMoney(fullRent * (occupiedDays / daysInMonth));

    expect(proRata).toBe(480);
  });
});
