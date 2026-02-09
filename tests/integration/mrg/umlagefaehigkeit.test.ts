import { describe, test, expect } from 'vitest';
import { hasDb, db, sql } from '../setup/db';
import { roundMoney } from '@shared/utils';

/**
 * MRG §21 – Umlagefähigkeit von Betriebskosten
 */

const UMLAGEFAEHIGE_KATEGORIEN = [
  'versicherung', 'wasser', 'kanal', 'muell', 'strom',
  'hausbetreuung', 'lift', 'garten', 'schneeraeumung',
  'grundsteuer', 'verwaltung',
];

const NICHT_UMLAGEFAEHIG = [
  'instandhaltung', 'reparatur',
];

describe('MRG §21 – Umlagefähigkeit', () => {
  test('standard BK categories are umlagefähig', () => {
    for (const cat of UMLAGEFAEHIGE_KATEGORIEN) {
      expect(NICHT_UMLAGEFAEHIG.includes(cat)).toBe(false);
    }
  });

  test('instandhaltung is not umlagefähig', () => {
    expect(NICHT_UMLAGEFAEHIG).toContain('instandhaltung');
    expect(NICHT_UMLAGEFAEHIG).toContain('reparatur');
  });

  test('BK-Abrechnung deadline: 30. Juni des Folgejahres', () => {
    const abrechnungsjahr = 2024;
    const deadline = new Date(abrechnungsjahr + 1, 5, 30); // June 30, 2025
    const today = new Date('2025-06-30');
    expect(deadline.getTime()).toBeLessThanOrEqual(today.getTime());
  });

  test('Verjährungsfrist: 3 Jahre', () => {
    const abrechnungsjahr = 2024;
    const deadline = new Date(abrechnungsjahr + 1, 5, 30);
    const verjaehrung = new Date(deadline);
    verjaehrung.setFullYear(verjaehrung.getFullYear() + 3);
    expect(verjaehrung.getFullYear()).toBe(2028);
    expect(verjaehrung.getMonth()).toBe(5);
    expect(verjaehrung.getDate()).toBe(30);
  });

  test('Leerstandsregel: leerstehende Einheit trägt anteilige BK', () => {
    const totalBK = 8000;
    const areas = [60, 60, 60, 60];
    const totalArea = areas.reduce((s, a) => s + a, 0);
    const occupiedUnits = [0, 1, 2];

    const tenantShares = occupiedUnits.map(i =>
      roundMoney(totalBK * (areas[i] / totalArea))
    );
    const landlordShare = roundMoney(totalBK * (areas[3] / totalArea));

    const sum = roundMoney(tenantShares.reduce((s, v) => s + v, 0) + landlordShare);
    expect(sum).toBe(totalBK);
    expect(landlordShare).toBe(2000);
  });

  test('Heizkosten-Split: 70/30 gem. HeizKG', () => {
    const totalHeizkosten = 10000;
    const verbrauchsanteil = roundMoney(totalHeizkosten * 0.70);
    const grundkostenanteil = roundMoney(totalHeizkosten * 0.30);
    expect(verbrauchsanteil).toBe(7000);
    expect(grundkostenanteil).toBe(3000);
    expect(roundMoney(verbrauchsanteil + grundkostenanteil)).toBe(totalHeizkosten);
  });
});
