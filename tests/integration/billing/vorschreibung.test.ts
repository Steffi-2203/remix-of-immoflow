import { describe, test, expect, beforeEach } from 'vitest';
import { hasDb, resetDb } from '../setup/db';
import { seedUnits, createTenant } from '../setup/seed';
import { vorschreibungService } from '../../../server/billing/vorschreibungService';
import { roundMoney } from '@shared/utils';

describe.skipIf(!hasDb)('MRG – Vorschreibung', () => {
  let unitId: string;

  beforeEach(async () => {
    await resetDb();
    const result = await seedUnits(1);
    unitId = result.unitIds[0];
  });

  test('Vorschreibung enthält alle Positionen', async () => {
    const tenant = await createTenant({
      unitId, grundmiete: 650, betriebskostenVorschuss: 180, heizkostenVorschuss: 95,
    });

    const result = await vorschreibungService.generateVorschreibung({
      tenantId: tenant.id as string, year: 2025, month: 3,
    });

    expect(result).not.toBeNull();
    expect(result!.grundmiete).toBe(650);
    expect(result!.betriebskosten).toBe(180);
    expect(result!.heizungskosten).toBe(95);
    expect(result!.lines.length).toBe(3);
  });

  test('USt korrekt: 10% Miete/BK, 20% HK', async () => {
    const tenant = await createTenant({
      unitId, grundmiete: 1000, betriebskostenVorschuss: 200, heizkostenVorschuss: 100,
    });

    const result = await vorschreibungService.generateVorschreibung({
      tenantId: tenant.id as string, year: 2025, month: 1,
    });

    expect(result!.ust).toBe(roundMoney(1000 * 0.10 + 200 * 0.10 + 100 * 0.20));
  });

  test('Fälligkeitsdatum ist der 5. des Monats', async () => {
    const tenant = await createTenant({ unitId });

    const result = await vorschreibungService.generateVorschreibung({
      tenantId: tenant.id as string, year: 2025, month: 7,
    });

    expect(result!.faelligAm).toBe('2025-07-05');
  });

  test('pro-rata bei Einzug Monatsmitte', () => {
    const proRata = vorschreibungService.calculateProRata(900, 30, 16);
    expect(proRata).toBe(480);
  });

  test('Gesamtbetrag = Netto + USt', async () => {
    const tenant = await createTenant({
      unitId, grundmiete: 500, betriebskostenVorschuss: 100, heizkostenVorschuss: 50,
    });

    const result = await vorschreibungService.generateVorschreibung({
      tenantId: tenant.id as string, year: 2025, month: 2,
    });

    const expectedNetto = 500 + 100 + 50;
    expect(result!.gesamtbetrag).toBe(roundMoney(expectedNetto + result!.ust));
  });
});
