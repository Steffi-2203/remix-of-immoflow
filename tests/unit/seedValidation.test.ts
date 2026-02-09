import { describe, test, expect } from 'vitest';
import { generateTestData } from '../seeds/generateTestData';

/**
 * Validates that the seed data generator produces consistent, realistic test data.
 */

describe('Test Data Generator', () => {
  const data = generateTestData();

  test('generates 4 properties', () => {
    expect(data.properties).toHaveLength(4);
  });

  test('generates 200 units total (22+48+80+50)', () => {
    expect(data.units).toHaveLength(200);
  });

  test('units are linked to properties', () => {
    const propIds = new Set(data.properties.map(p => p.id));
    for (const unit of data.units) {
      expect(propIds.has(unit.property_id)).toBe(true);
    }
  });

  test('~93% of units have tenants (every 15th is vacant)', () => {
    const vacantCount = data.units.filter(u => u.status === 'leer').length;
    // 200 units, every 15th vacant → ~13 vacant
    expect(vacantCount).toBeGreaterThanOrEqual(10);
    expect(vacantCount).toBeLessThanOrEqual(20);
    expect(data.tenants.length).toBe(200 - vacantCount);
  });

  test('each tenant has 12 monthly invoices', () => {
    const tenantIds = new Set(data.tenants.map(t => t.id));
    for (const tenantId of tenantIds) {
      const invoices = data.monthlyInvoices.filter(i => i.tenant_id === tenantId);
      expect(invoices).toHaveLength(12);
    }
  });

  test('invoices have valid amounts', () => {
    for (const inv of data.monthlyInvoices) {
      expect(inv.gesamtbetrag).toBeGreaterThan(0);
      expect(inv.grundmiete).toBeGreaterThanOrEqual(0);
      expect(inv.betriebskosten).toBeGreaterThanOrEqual(0);
    }
  });

  test('payments exist for paid invoices', () => {
    expect(data.payments.length).toBeGreaterThan(0);
    const paidInvoiceIds = new Set(
      data.monthlyInvoices.filter(i => i.status === 'bezahlt').map(i => i.id)
    );
    for (const p of data.payments) {
      expect(paidInvoiceIds.has(p.invoice_id)).toBe(true);
    }
  });

  test('expenses cover all BK categories', () => {
    const categories = new Set(data.expenses.map(e => e.category));
    expect(categories.has('versicherung')).toBe(true);
    expect(categories.has('wasser')).toBe(true);
    expect(categories.has('muell')).toBe(true);
    expect(categories.has('hausbetreuung')).toBe(true);
  });

  test('includes non-allocable expenses', () => {
    const nonAllocable = data.expenses.filter(e => !e.ist_umlagefaehig);
    expect(nonAllocable.length).toBeGreaterThan(0);
    expect(nonAllocable.some(e => e.category === 'instandhaltung')).toBe(true);
  });

  test('water readings for non-garage units', () => {
    expect(data.waterReadings.length).toBeGreaterThan(0);
    // Each non-garage tenant gets 4 quarterly readings
    const garageUnits = new Set(
      data.units.filter(u => u.type === 'garage' || u.type === 'stellplatz').map(u => u.id)
    );
    for (const wr of data.waterReadings) {
      expect(garageUnits.has(wr.unit_id)).toBe(false);
    }
  });

  test('heating readings for non-garage units', () => {
    expect(data.heatingReadings.length).toBeGreaterThan(0);
    for (const hr of data.heatingReadings) {
      expect(hr.consumption).toBeGreaterThan(0);
      expect(hr.period_from).toBe('2025-01-01');
      expect(hr.period_to).toBe('2025-12-31');
    }
  });

  test('deterministic: two runs produce identical data', () => {
    const data2 = generateTestData();
    expect(data.summary).toEqual(data2.summary);
    expect(data.properties[0].id).toBe(data2.properties[0].id);
    expect(data.tenants[0].id).toBe(data2.tenants[0].id);
  });

  test('summary numbers are consistent', () => {
    expect(data.summary.totalProperties).toBe(data.properties.length);
    expect(data.summary.totalUnits).toBe(data.units.length);
    expect(data.summary.totalTenants).toBe(data.tenants.length);
    expect(data.summary.totalExpenses).toBe(data.expenses.length);
    expect(data.summary.totalInvoices).toBe(data.monthlyInvoices.length);
    expect(data.summary.totalPayments).toBe(data.payments.length);
  });
});
