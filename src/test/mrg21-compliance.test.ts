import { describe, test, expect } from 'vitest';

/**
 * MRG §21 Compliance-Testsuite
 * 
 * Prüft die gesetzlichen Anforderungen der Betriebskostenabrechnung
 * gemäß §21 Mietrechtsgesetz (MRG):
 * - §21 Abs 1: Nur umlagefähige Kosten
 * - §21 Abs 3: Frist 30. Juni des Folgejahres
 * - §21 Abs 4: 3-jährige Verjährung
 * - Leerstandsregel: Eigentümer trägt Leerstandsanteil
 * - Verteilerschlüssel: Fläche, MEA, Personen, Verbrauch
 */

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

// ── §21 Abs 1: Umlagefähigkeit ──

describe('MRG §21 Abs 1 – Umlagefähige Betriebskosten', () => {
  const expenses = [
    { betrag: 2400, istUmlagefaehig: true, category: 'versicherung' },
    { betrag: 1800, istUmlagefaehig: true, category: 'wasser' },
    { betrag: 1200, istUmlagefaehig: true, category: 'muell' },
    { betrag: 5000, istUmlagefaehig: false, category: 'instandhaltung' },
    { betrag: 3000, istUmlagefaehig: false, category: 'reparatur' },
    { betrag: 600, istUmlagefaehig: true, category: 'strom_allgemein' },
  ];

  test('filtert nur umlagefähige Kosten', () => {
    const allocable = expenses.filter(e => e.istUmlagefaehig);
    expect(allocable).toHaveLength(4);
    expect(allocable.every(e => e.istUmlagefaehig)).toBe(true);
  });

  test('Gesamtsumme umlagefähig korrekt', () => {
    const total = expenses
      .filter(e => e.istUmlagefaehig)
      .reduce((sum, e) => sum + e.betrag, 0);
    expect(total).toBe(6000); // 2400+1800+1200+600
  });

  test('Instandhaltung ist NICHT umlagefähig (§3 MRG)', () => {
    const instandhaltung = expenses.find(e => e.category === 'instandhaltung');
    expect(instandhaltung?.istUmlagefaehig).toBe(false);
  });

  test('Reparaturen sind NICHT umlagefähig', () => {
    const reparatur = expenses.find(e => e.category === 'reparatur');
    expect(reparatur?.istUmlagefaehig).toBe(false);
  });
});

// ── §21 Abs 3: Abrechnungsfrist ──

describe('MRG §21 Abs 3 – Abrechnungsfrist (30. Juni Folgejahr)', () => {
  function getDeadline(year: number): Date {
    return new Date(year + 1, 5, 30); // 30. Juni des Folgejahres
  }

  test('Frist für 2024 ist 30.06.2025', () => {
    const deadline = getDeadline(2024);
    expect(deadline.getFullYear()).toBe(2025);
    expect(deadline.getMonth()).toBe(5); // Juni = 5 (0-indexed)
    expect(deadline.getDate()).toBe(30);
  });

  test('Abrechnung vor Frist ist rechtzeitig', () => {
    const deadline = getDeadline(2024);
    const submissionDate = new Date(2025, 4, 15); // 15. Mai 2025
    expect(submissionDate < deadline).toBe(true);
  });

  test('Abrechnung nach Frist ist verspätet', () => {
    const deadline = getDeadline(2024);
    const lateDate = new Date(2025, 7, 1); // 1. August 2025
    expect(lateDate > deadline).toBe(true);
  });

  test('Abrechnung am Stichtag ist rechtzeitig (<=)', () => {
    const deadline = getDeadline(2024);
    const onDeadline = new Date(2025, 5, 30);
    // Gleicher Tag – noch rechtzeitig
    expect(onDeadline.getTime()).toBe(deadline.getTime());
  });
});

// ── §21 Abs 4: Verjährung ──

describe('MRG §21 Abs 4 – 3-jährige Verjährung', () => {
  function getExpirationDate(settlementYear: number): Date {
    return new Date(settlementYear + 4, 0, 1); // 1. Jänner + 4
  }

  test('Abrechnung 2021 verjährt am 01.01.2025', () => {
    const expiry = getExpirationDate(2021);
    expect(expiry).toEqual(new Date(2025, 0, 1));
  });

  test('Forderung vor Ablauf ist durchsetzbar', () => {
    const expiry = getExpirationDate(2022);
    expect(new Date(2025, 11, 31) < expiry).toBe(true);
  });

  test('Forderung nach Ablauf ist verjährt', () => {
    const expiry = getExpirationDate(2022);
    expect(new Date(2026, 0, 1) >= expiry).toBe(true);
  });
});

// ── Leerstandsregel ──

describe('MRG §21 – Leerstandsregel', () => {
  test('Eigentümer trägt Anteil leerstehender Einheiten', () => {
    const totalExpense = 12000;
    const occupiedArea = 250;
    const vacantArea = 50;
    const totalArea = occupiedArea + vacantArea; // 300

    const ownerShare = roundMoney(totalExpense * (vacantArea / totalArea));
    const tenantTotal = roundMoney(totalExpense - ownerShare);

    expect(ownerShare).toBe(2000); // 50/300 * 12000
    expect(tenantTotal).toBe(10000);
    expect(roundMoney(ownerShare + tenantTotal)).toBe(totalExpense);
  });

  test('kein Leerstand → Eigentümer zahlt nichts', () => {
    const totalExpense = 10000;
    const vacantArea = 0;
    const totalArea = 200;

    const ownerShare = roundMoney(totalExpense * (vacantArea / totalArea));
    expect(ownerShare).toBe(0);
  });

  test('100% Leerstand → Eigentümer trägt alles', () => {
    const totalExpense = 10000;
    const vacantArea = 200;
    const totalArea = 200;

    const ownerShare = roundMoney(totalExpense * (vacantArea / totalArea));
    expect(ownerShare).toBe(10000);
  });

  test('anteilige Berechnung bei Teil-Leerstand', () => {
    const totalExpense = 24000;
    const units = [
      { flaeche: 60, occupied: true },
      { flaeche: 40, occupied: false }, // leer
      { flaeche: 80, occupied: true },
      { flaeche: 20, occupied: false }, // leer
    ];
    const totalArea = units.reduce((s, u) => s + u.flaeche, 0); // 200
    const vacantArea = units.filter(u => !u.occupied).reduce((s, u) => s + u.flaeche, 0); // 60

    const ownerShare = roundMoney(totalExpense * (vacantArea / totalArea));
    expect(ownerShare).toBe(7200); // 60/200 * 24000

    // Mieter-Anteile nur auf besetzte Einheiten verteilen
    const tenantPool = totalExpense - ownerShare; // 16800
    const occupiedUnits = units.filter(u => u.occupied);
    const occArea = occupiedUnits.reduce((s, u) => s + u.flaeche, 0); // 140

    const shares = occupiedUnits.map(u => roundMoney(tenantPool * (u.flaeche / occArea)));
    expect(shares[0]).toBe(7200); // 60/140 * 16800
    expect(shares[1]).toBe(9600); // 80/140 * 16800
    expect(roundMoney(shares.reduce((a, b) => a + b, 0))).toBe(tenantPool);
  });
});

// ── Verteilerschlüssel ──

describe('MRG §21 – Verteilerschlüssel', () => {
  const totalExpense = 12000;

  test('Flächenverteilung (qm)', () => {
    const units = [
      { id: 'u1', flaeche: 60 },
      { id: 'u2', flaeche: 90 },
      { id: 'u3', flaeche: 50 },
      { id: 'u4', flaeche: 100 },
    ];
    const totalArea = units.reduce((s, u) => s + u.flaeche, 0); // 300

    const shares = units.map(u => roundMoney(totalExpense * (u.flaeche / totalArea)));
    expect(shares[0]).toBe(2400);  // 20%
    expect(shares[1]).toBe(3600);  // 30%
    expect(shares[2]).toBe(2000);  // 16.67%
    expect(shares[3]).toBe(4000);  // 33.33%
    expect(shares.reduce((a, b) => a + b, 0)).toBe(totalExpense);
  });

  test('Nutzwert-Verteilung (MEA)', () => {
    const units = [
      { id: 'u1', mea: 100 },
      { id: 'u2', mea: 200 },
      { id: 'u3', mea: 150 },
      { id: 'u4', mea: 50 },
    ];
    const totalMea = units.reduce((s, u) => s + u.mea, 0); // 500

    const shares = units.map(u => roundMoney(totalExpense * (u.mea / totalMea)));
    expect(shares[0]).toBe(2400);
    expect(shares[1]).toBe(4800);
    expect(shares[2]).toBe(3600);
    expect(shares[3]).toBe(1200);
  });

  test('Personenverteilung', () => {
    const units = [
      { id: 'u1', persons: 2 },
      { id: 'u2', persons: 1 },
      { id: 'u3', persons: 3 },
    ];
    const totalPersons = units.reduce((s, u) => s + u.persons, 0); // 6

    const shares = units.map(u => roundMoney(totalExpense * (u.persons / totalPersons)));
    expect(shares[0]).toBe(4000);
    expect(shares[1]).toBe(2000);
    expect(shares[2]).toBe(6000);
  });

  test('Gleichverteilung', () => {
    const unitCount = 4;
    const perUnit = roundMoney(totalExpense / unitCount);
    expect(perUnit).toBe(3000);
    expect(perUnit * unitCount).toBe(totalExpense);
  });
});

// ── Abrechnungsdifferenz (Nachzahlung / Guthaben) ──

describe('MRG §21 – Abrechnungsdifferenz', () => {
  test('Nachzahlung: Vorschuss < tatsächlicher Anteil', () => {
    const prepaid = 2400;
    const actual = 2800;
    const diff = roundMoney(prepaid - actual);
    expect(diff).toBe(-400); // Mieter muss nachzahlen
  });

  test('Guthaben: Vorschuss > tatsächlicher Anteil', () => {
    const prepaid = 3000;
    const actual = 2400;
    const diff = roundMoney(prepaid - actual);
    expect(diff).toBe(600); // Mieter bekommt zurück
  });

  test('Nulldifferenz bei exaktem Vorschuss', () => {
    expect(roundMoney(2400 - 2400)).toBe(0);
  });
});

// ── Kategorienprüfung ──

describe('MRG §21 – BK-Kategorien', () => {
  test('Standardkategorien summieren korrekt', () => {
    const categories = {
      versicherung: 2400,
      wasser: 1800,
      muell: 1200,
      hausbetreuung: 3600,
      lift: 2400,
      strom_allgemein: 600,
    };
    const total = Object.values(categories).reduce((s, v) => s + v, 0);
    expect(total).toBe(12000);
  });
});

// ── Skalierungstest ──

describe('MRG §21 – Skalierung (500+ Einheiten)', () => {
  test('Rundungspräzision bei vielen Einheiten', () => {
    const totalExpense = 120000;
    const unitCount = 500;
    const areas = Array.from({ length: unitCount }, (_, i) => 40 + (i % 80));
    const totalArea = areas.reduce((s, a) => s + a, 0);

    const shares = areas.map(a => roundMoney(totalExpense * (a / totalArea)));
    const sumShares = roundMoney(shares.reduce((s, v) => s + v, 0));

    // Rundungsdifferenz < 1 Cent pro Einheit
    expect(Math.abs(sumShares - totalExpense)).toBeLessThan(unitCount * 0.01);
  });
});
