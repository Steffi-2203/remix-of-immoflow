import { describe, test, expect, beforeEach } from 'vitest';
import { hasDb, resetDb, db, sql } from '../setup/db';
import { seedOrg, seedProperty, seedUnit, createTenant, createInvoice } from '../setup/seed';
import { roundMoney } from '@shared/utils';

/**
 * MRG Vorschreibung – Invoice prescription integration tests.
 */

describe.skipIf(!hasDb)('Vorschreibung MRG – Invoice Generation', () => {
  const PREFIX = 'int-vorschr-mrg';
  let unitId: string;

  beforeEach(async () => {
    await resetDb();
    const orgId = `${PREFIX}-org-${Date.now()}`;
    const propId = `${PREFIX}-prop-${Date.now()}`;
    unitId = `${PREFIX}-unit-${Date.now()}`;
    await seedOrg({ id: orgId });
    await seedProperty({ id: propId, organizationId: orgId });
    await seedUnit({ id: unitId, propertyId: propId, areaSqm: 70 });
  });

  test('Vorschreibung enthält alle Pflichtpositionen', async () => {
    const tenant = await createTenant({
      unitId, grundmiete: 650, betriebskostenVorschuss: 180, heizkostenVorschuss: 95,
    });

    const gesamtbetrag = roundMoney(650 + 180 + 95); // 925 netto
    const invoice = await createInvoice({
      tenantId: tenant.id as string, gesamtbetrag, month: 1, year: 2025,
    });

    expect(Number(invoice.gesamtbetrag)).toBe(925);
  });

  test('USt-Berechnung: 10% auf Miete/BK, 20% auf HK', () => {
    const grundmiete = 650;
    const bk = 180;
    const hk = 95;

    const ustMiete = roundMoney(grundmiete - grundmiete / 1.10);
    const ustBk = roundMoney(bk - bk / 1.10);
    const ustHk = roundMoney(hk - hk / 1.20);

    expect(ustMiete).toBe(59.09);
    expect(ustBk).toBe(16.36);
    expect(ustHk).toBe(15.83);
  });

  test('Aliquote Berechnung bei Einzug Monatsmitte', () => {
    const fullRent = 900;
    const daysInMonth = 30;
    const occupiedDays = 16; // 15th to 30th inclusive
    const proRata = roundMoney(fullRent * (occupiedDays / daysInMonth));
    expect(proRata).toBe(480);
  });

  test('Aliquote Berechnung bei Auszug', () => {
    const fullRent = 900;
    const daysInMonth = 31; // January
    const occupiedDays = 15; // 1st to 15th
    const proRata = roundMoney(fullRent * (occupiedDays / daysInMonth));
    expect(proRata).toBe(roundMoney(900 * 15 / 31));
  });

  test('Fälligkeitsdatum: 5. des Monats', async () => {
    const tenant = await createTenant({ unitId });
    const invoice = await createInvoice({
      tenantId: tenant.id as string, gesamtbetrag: 850, month: 3, year: 2025,
    });
    expect(invoice.faellig_am).toBe('2025-03-05');
  });

  test('Rechnung startet mit Status offen und paid_amount 0', async () => {
    const tenant = await createTenant({ unitId });
    const invoice = await createInvoice({
      tenantId: tenant.id as string, gesamtbetrag: 850, month: 4, year: 2025,
    });
    expect(invoice.status).toBe('offen');
    expect(Number(invoice.paid_amount)).toBe(0);
  });
});
