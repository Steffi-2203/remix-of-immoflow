import { describe, it, expect } from 'vitest';

const UST_BK = 0.10;
const UST_HEIZUNG = 0.20;
const UST_RUECKLAGE = 0.00;
const UST_INSTANDHALTUNG = 0.20;
const UST_VERWALTUNG = 0.20;

function calculateWegUst(positions: {
  betriebskosten: number;
  heizung: number;
  ruecklage: number;
  instandhaltung: number;
  verwaltungshonorar: number;
}) {
  const ustBk = Math.round(positions.betriebskosten * UST_BK * 100) / 100;
  const ustHeizung = Math.round(positions.heizung * UST_HEIZUNG * 100) / 100;
  const ustRuecklage = Math.round(positions.ruecklage * UST_RUECKLAGE * 100) / 100;
  const ustInstandhaltung = Math.round(positions.instandhaltung * UST_INSTANDHALTUNG * 100) / 100;
  const ustVerwaltung = Math.round(positions.verwaltungshonorar * UST_VERWALTUNG * 100) / 100;

  return {
    ustBk,
    ustHeizung,
    ustRuecklage,
    ustInstandhaltung,
    ustVerwaltung,
    ustGesamt: ustBk + ustHeizung + ustRuecklage + ustInstandhaltung + ustVerwaltung,
  };
}

function categorizeWegBudgetLine(category: string): 'betriebskosten' | 'heizung' | 'ruecklage' | 'instandhaltung' | 'verwaltung' {
  const cat = category.toLowerCase();
  if (cat.includes('rücklage') || cat.includes('ruecklage') || cat === 'reserve') return 'ruecklage';
  if (cat.includes('instandhaltung') || cat.includes('reparatur') || cat.includes('sanierung')) return 'instandhaltung';
  if (cat.includes('verwaltung') || cat.includes('honorar') || cat.includes('management')) return 'verwaltung';
  if (cat.includes('heizung') || cat.includes('heizkosten') || cat.includes('wärme') || cat.includes('fernwärme') || cat.includes('heating')) return 'heizung';
  return 'betriebskosten';
}

function distributeByMea(totalAmount: number, ownerMea: number, totalMea: number): number {
  return Math.round((totalAmount * (ownerMea / totalMea)) * 100) / 100;
}

describe('WEG-Vorschreibungen: Austrian USt Rates', () => {
  it('applies 10% USt to Betriebskosten', () => {
    const bk = 500;
    const ust = Math.round(bk * UST_BK * 100) / 100;
    expect(ust).toBe(50);
  });

  it('applies 20% USt to Heizung', () => {
    const hz = 300;
    const ust = Math.round(hz * UST_HEIZUNG * 100) / 100;
    expect(ust).toBe(60);
  });

  it('applies 0% USt to Rücklage (steuerbefreit)', () => {
    const rl = 1000;
    const ust = Math.round(rl * UST_RUECKLAGE * 100) / 100;
    expect(ust).toBe(0);
  });

  it('applies 20% USt to Instandhaltung', () => {
    const ih = 200;
    const ust = Math.round(ih * UST_INSTANDHALTUNG * 100) / 100;
    expect(ust).toBe(40);
  });

  it('applies 20% USt to Verwaltungshonorar', () => {
    const vh = 150;
    const ust = Math.round(vh * UST_VERWALTUNG * 100) / 100;
    expect(ust).toBe(30);
  });

  it('calculates combined USt correctly for all 5 positions', () => {
    const positions = {
      betriebskosten: 500,
      heizung: 300,
      ruecklage: 1000,
      instandhaltung: 200,
      verwaltungshonorar: 150,
    };
    const result = calculateWegUst(positions);
    expect(result.ustBk).toBe(50);
    expect(result.ustHeizung).toBe(60);
    expect(result.ustRuecklage).toBe(0);
    expect(result.ustInstandhaltung).toBe(40);
    expect(result.ustVerwaltung).toBe(30);
    expect(result.ustGesamt).toBe(180);
  });

  it('handles zero amounts correctly', () => {
    const positions = {
      betriebskosten: 0,
      heizung: 0,
      ruecklage: 0,
      instandhaltung: 0,
      verwaltungshonorar: 0,
    };
    const result = calculateWegUst(positions);
    expect(result.ustGesamt).toBe(0);
  });

  it('handles cent-level rounding correctly', () => {
    const positions = {
      betriebskosten: 33.33,
      heizung: 66.67,
      ruecklage: 100.01,
      instandhaltung: 15.55,
      verwaltungshonorar: 7.77,
    };
    const result = calculateWegUst(positions);
    expect(result.ustBk).toBe(3.33);
    expect(result.ustHeizung).toBe(13.33);
    expect(result.ustRuecklage).toBe(0);
    expect(result.ustInstandhaltung).toBe(3.11);
    expect(result.ustVerwaltung).toBe(1.55);
  });
});

describe('WEG-Vorschreibungen: Budget Line Categorization', () => {
  it('categorizes Betriebskosten items correctly', () => {
    expect(categorizeWegBudgetLine('Strom Allgemein')).toBe('betriebskosten');
    expect(categorizeWegBudgetLine('Versicherung')).toBe('betriebskosten');
    expect(categorizeWegBudgetLine('Wasser')).toBe('betriebskosten');
    expect(categorizeWegBudgetLine('Müllabfuhr')).toBe('betriebskosten');
    expect(categorizeWegBudgetLine('Lift')).toBe('betriebskosten');
  });

  it('categorizes Heizung items correctly', () => {
    expect(categorizeWegBudgetLine('Heizung')).toBe('heizung');
    expect(categorizeWegBudgetLine('Heizkosten')).toBe('heizung');
    expect(categorizeWegBudgetLine('Fernwärme')).toBe('heizung');
    expect(categorizeWegBudgetLine('Wärmeversorgung')).toBe('heizung');
    expect(categorizeWegBudgetLine('Heating')).toBe('heizung');
  });

  it('categorizes Rücklage items correctly', () => {
    expect(categorizeWegBudgetLine('Rücklage')).toBe('ruecklage');
    expect(categorizeWegBudgetLine('Ruecklage')).toBe('ruecklage');
    expect(categorizeWegBudgetLine('Reserve')).toBe('ruecklage');
  });

  it('categorizes Instandhaltung items correctly', () => {
    expect(categorizeWegBudgetLine('Instandhaltung')).toBe('instandhaltung');
    expect(categorizeWegBudgetLine('Reparaturen')).toBe('instandhaltung');
    expect(categorizeWegBudgetLine('Sanierung Dach')).toBe('instandhaltung');
  });

  it('categorizes Verwaltung items correctly', () => {
    expect(categorizeWegBudgetLine('Verwaltungshonorar')).toBe('verwaltung');
    expect(categorizeWegBudgetLine('Honorar')).toBe('verwaltung');
    expect(categorizeWegBudgetLine('Management Fee')).toBe('verwaltung');
  });

  it('falls back to Betriebskosten for unknown categories', () => {
    expect(categorizeWegBudgetLine('Sonstiges')).toBe('betriebskosten');
    expect(categorizeWegBudgetLine('Grundsteuer')).toBe('betriebskosten');
    expect(categorizeWegBudgetLine('')).toBe('betriebskosten');
  });
});

describe('WEG-Vorschreibungen: MEA Distribution', () => {
  it('distributes costs proportionally by MEA share', () => {
    const totalAmount = 12000;
    const totalMea = 1000;

    expect(distributeByMea(totalAmount, 100, totalMea)).toBe(1200);
    expect(distributeByMea(totalAmount, 250, totalMea)).toBe(3000);
    expect(distributeByMea(totalAmount, 50, totalMea)).toBe(600);
  });

  it('handles equal MEA shares', () => {
    const totalAmount = 12000;
    const totalMea = 400;

    const owner1 = distributeByMea(totalAmount, 100, totalMea);
    const owner2 = distributeByMea(totalAmount, 100, totalMea);
    const owner3 = distributeByMea(totalAmount, 100, totalMea);
    const owner4 = distributeByMea(totalAmount, 100, totalMea);

    expect(owner1).toBe(3000);
    expect(owner1 + owner2 + owner3 + owner4).toBe(totalAmount);
  });

  it('handles uneven distribution with rounding', () => {
    const totalAmount = 10000;
    const totalMea = 300;

    const owner1 = distributeByMea(totalAmount, 100, totalMea);
    const owner2 = distributeByMea(totalAmount, 100, totalMea);
    const owner3 = distributeByMea(totalAmount, 100, totalMea);

    expect(owner1).toBe(3333.33);
    expect(owner2).toBe(3333.33);
    expect(owner3).toBe(3333.33);
  });

  it('handles small MEA shares correctly', () => {
    const totalAmount = 12000;
    const totalMea = 1000;

    const result = distributeByMea(totalAmount, 1, totalMea);
    expect(result).toBe(12);
  });

  it('handles decimal MEA shares', () => {
    const totalAmount = 12000;
    const totalMea = 1000;

    const result = distributeByMea(totalAmount, 33.5, totalMea);
    expect(result).toBe(402);
  });
});

describe('WEG-Vorschreibungen: Gesamtbetrag Calculation', () => {
  it('calculates brutto correctly (netto + USt)', () => {
    const netto = {
      betriebskosten: 500,
      heizung: 300,
      ruecklage: 1000,
      instandhaltung: 200,
      verwaltungshonorar: 150,
    };
    const ust = calculateWegUst(netto);
    const nettoSum = netto.betriebskosten + netto.heizung + netto.ruecklage + netto.instandhaltung + netto.verwaltungshonorar;
    const brutto = nettoSum + ust.ustGesamt;

    expect(nettoSum).toBe(2150);
    expect(ust.ustGesamt).toBe(180);
    expect(brutto).toBe(2330);
  });

  it('Rücklage contributes to total but not to USt', () => {
    const netto = {
      betriebskosten: 0,
      heizung: 0,
      ruecklage: 500,
      instandhaltung: 0,
      verwaltungshonorar: 0,
    };
    const ust = calculateWegUst(netto);
    const nettoSum = netto.ruecklage;
    const brutto = nettoSum + ust.ustGesamt;

    expect(ust.ustGesamt).toBe(0);
    expect(brutto).toBe(500);
  });

  it('monthly amount = yearly / 12 distributed by MEA', () => {
    const yearlyBk = 12000;
    const monthlyBk = yearlyBk / 12;
    const totalMea = 1000;
    const ownerMea = 250;

    const ownerMonthly = distributeByMea(monthlyBk, ownerMea, totalMea);
    expect(ownerMonthly).toBe(250);
  });
});
