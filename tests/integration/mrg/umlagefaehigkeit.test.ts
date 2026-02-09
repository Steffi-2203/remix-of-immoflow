import { describe, test, expect } from 'vitest';
import { mrg } from '../../../server/mrg/mrgRules';

describe('MRG – Umlagefähigkeit', () => {
  test('Verwaltungskosten sind umlagefähig', () => {
    expect(mrg.isUmlagefaehig({ type: 'verwaltung', amount: 1000 })).toBe(true);
  });

  test('Versicherung ist umlagefähig', () => {
    expect(mrg.isUmlagefaehig({ type: 'versicherung', amount: 3000 })).toBe(true);
  });

  test('Hausbetreuung ist umlagefähig', () => {
    expect(mrg.isUmlagefaehig({ type: 'hausbetreuung', amount: 500 })).toBe(true);
  });

  test('Instandhaltung ist NICHT umlagefähig', () => {
    expect(mrg.isUmlagefaehig({ type: 'instandhaltung', amount: 2000 })).toBe(false);
  });

  test('Finanzierungskosten sind NICHT umlagefähig', () => {
    expect(mrg.isUmlagefaehig({ type: 'finanzierung', amount: 5000 })).toBe(false);
  });

  test('Rücklagen sind NICHT umlagefähig', () => {
    expect(mrg.isUmlagefaehig({ type: 'ruecklage', amount: 3000 })).toBe(false);
  });
});

describe('MRG – Hauptmietzins', () => {
  test('berechnet Hauptmietzins korrekt für Kategorie A', () => {
    const result = mrg.calculateHauptmietzins({
      flaeche: 80, kategorie: 'A', richtwert: 6.15,
    });
    expect(result).toBeCloseTo(492); // 80 × 6.15 × 1.0
  });

  test('Kategorie B = 75% des Richtwerts', () => {
    const result = mrg.calculateHauptmietzins({
      flaeche: 80, kategorie: 'B', richtwert: 6.15,
    });
    expect(result).toBeCloseTo(369); // 80 × 6.15 × 0.75
  });

  test('Kategorie D (Substandard) hat reduzierten Satz', () => {
    const result = mrg.calculateHauptmietzins({
      flaeche: 50, kategorie: 'D', richtwert: 6.15,
    });
    expect(result).toBeLessThan(200); // 50 × 6.15 × 0.25 = 76.88
    expect(result).toBeCloseTo(76.88);
  });
});

describe('MRG – VPI Wertsicherung', () => {
  test('unter Schwelle → Miete unverändert', () => {
    const result = mrg.calculateIndexAdjustment({
      baseRent: 800, baseIndex: 100, currentIndex: 104,
    });
    expect(result.thresholdMet).toBe(false);
    expect(result.adjustedRent).toBe(800);
  });

  test('Schwelle erreicht → Anpassung', () => {
    const result = mrg.calculateIndexAdjustment({
      baseRent: 800, baseIndex: 100, currentIndex: 106,
    });
    expect(result.thresholdMet).toBe(true);
    expect(result.adjustedRent).toBeGreaterThan(800);
  });

  test('Hälfteregelung', () => {
    const result = mrg.calculateIndexAdjustment({
      baseRent: 1000, baseIndex: 100, currentIndex: 110, halfRule: true,
    });
    expect(result.appliedPercent).toBe(5);
    expect(result.adjustedRent).toBe(1050);
  });
});

describe('MRG – Fristen', () => {
  test('Abrechnungsfrist: 30. Juni Folgejahr', () => {
    const deadline = mrg.getAbrechnungsDeadline(2024);
    expect(deadline.getFullYear()).toBe(2025);
    expect(deadline.getMonth()).toBe(5);
    expect(deadline.getDate()).toBe(30);
  });

  test('Verjährung: 3 Jahre nach Abrechnungsfrist', () => {
    const deadline = mrg.getVerjaehrungsDeadline(2024);
    expect(deadline.getFullYear()).toBe(2028);
  });
});

describe('MRG – Befristungsabschlag', () => {
  test('befristeter Vertrag: 25% Abschlag', () => {
    const result = mrg.calculateBefristungsabschlag({
      nettoMiete: 500, befristet: true,
    });
    expect(result).toBe(375);
  });

  test('unbefristeter Vertrag: kein Abschlag', () => {
    const result = mrg.calculateBefristungsabschlag({
      nettoMiete: 500, befristet: false,
    });
    expect(result).toBe(500);
  });
});

describe('MRG – Verzugszinsen §1333 ABGB', () => {
  test('4% p.a. auf 1000€ für 30 Tage', () => {
    const zinsen = mrg.calculateVerzugszinsen(1000, 30);
    expect(zinsen).toBeCloseTo(3.29, 1);
  });
});
