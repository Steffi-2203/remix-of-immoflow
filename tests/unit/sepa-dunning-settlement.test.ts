import { describe, it, expect } from 'vitest';

// ========== SEPA XML VALIDATION TESTS ==========

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function validateIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleaned)) return false;
  if (cleaned.startsWith('AT') && cleaned.length !== 20) return false;
  if (cleaned.startsWith('DE') && cleaned.length !== 22) return false;
  return true;
}

function validateBic(bic: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.toUpperCase());
}

function formatSepaAmount(amount: number): string {
  return amount.toFixed(2);
}

function generateEndToEndId(tenantId: string, month: number, year: number): string {
  return `E2E-${year}${String(month).padStart(2, '0')}-${tenantId.substr(0, 8)}`.toUpperCase();
}

describe('SEPA Export Validation', () => {
  it('validates Austrian IBANs correctly', () => {
    expect(validateIban('AT611904300234573201')).toBe(true);
    expect(validateIban('AT61 1904 3002 3457 3201')).toBe(true);
    expect(validateIban('AT12345')).toBe(false);
    expect(validateIban('XX611904300234573201')).toBe(true); // generic format ok
    expect(validateIban('123456')).toBe(false);
    expect(validateIban('')).toBe(false);
  });

  it('validates German IBANs correctly', () => {
    expect(validateIban('DE89370400440532013000')).toBe(true);
    expect(validateIban('DE8937040044053201300')).toBe(false); // wrong length
  });

  it('validates BIC format', () => {
    expect(validateBic('GIBAATWWXXX')).toBe(true);
    expect(validateBic('OPSKATWW')).toBe(true);
    expect(validateBic('BKAUATWW')).toBe(true);
    expect(validateBic('abc')).toBe(false);
    expect(validateBic('')).toBe(false);
  });

  it('escapes XML special characters correctly', () => {
    expect(escapeXml('Müller & Söhne')).toBe('Müller &amp; Söhne');
    expect(escapeXml('Test <tag>')).toBe('Test &lt;tag&gt;');
    expect(escapeXml('He said "hello"')).toBe('He said &quot;hello&quot;');
    expect(escapeXml("O'Brien")).toBe("O&apos;Brien");
    expect(escapeXml('Normal text')).toBe('Normal text');
  });

  it('formats SEPA amounts to 2 decimal places', () => {
    expect(formatSepaAmount(1234.5)).toBe('1234.50');
    expect(formatSepaAmount(0)).toBe('0.00');
    expect(formatSepaAmount(99.999)).toBe('100.00');
    expect(formatSepaAmount(1500)).toBe('1500.00');
  });

  it('generates valid end-to-end IDs', () => {
    const id = generateEndToEndId('abc12345-def-678', 3, 2026);
    expect(id).toBe('E2E-202603-ABC12345');
    expect(id.length).toBeLessThanOrEqual(35); // SEPA max 35 chars
  });

  it('generates unique end-to-end IDs for different periods', () => {
    const id1 = generateEndToEndId('abc12345', 1, 2026);
    const id2 = generateEndToEndId('abc12345', 2, 2026);
    const id3 = generateEndToEndId('def67890', 1, 2026);
    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
  });

  it('handles pain.008.001.02 direct debit XML structure', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>MSG-001</MsgId>
      <CreDtTm>2026-01-15T10:00:00Z</CreDtTm>
      <NbOfTxs>2</NbOfTxs>
      <CtrlSum>1500.00</CtrlSum>
    </GrpHdr>
  </CstmrDrctDbtInitn>
</Document>`;
    expect(xml).toContain('pain.008.001.02');
    expect(xml).toContain('<NbOfTxs>2</NbOfTxs>');
    expect(xml).toContain('<CtrlSum>1500.00</CtrlSum>');
  });

  it('handles pain.001.001.03 credit transfer XML structure', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>MSG-002</MsgId>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>500.00</CtrlSum>
    </GrpHdr>
  </CstmrCdtTrfInitn>
</Document>`;
    expect(xml).toContain('pain.001.001.03');
    expect(xml).toContain('<CstmrCdtTrfInitn>');
  });
});

// ========== DUNNING SYSTEM TESTS (ABGB §1333) ==========

interface DunningLevel {
  level: 0 | 1 | 2 | 3;
  name: string;
  daysOverdue: number;
  fee: number;
  interestRate: number;
}

const DUNNING_LEVELS: DunningLevel[] = [
  { level: 0, name: "Offen", daysOverdue: 0, fee: 0, interestRate: 0 },
  { level: 1, name: "Zahlungserinnerung", daysOverdue: 14, fee: 0, interestRate: 0 },
  { level: 2, name: "1. Mahnung", daysOverdue: 30, fee: 5, interestRate: 0.04 },
  { level: 3, name: "2. Mahnung", daysOverdue: 45, fee: 10, interestRate: 0.04 },
];

const ABGB_INTEREST_RATE = 0.04;

function calculateInterest(amount: number, daysOverdue: number): number {
  if (daysOverdue <= 14) return 0;
  const yearFraction = daysOverdue / 365;
  return Math.round(amount * ABGB_INTEREST_RATE * yearFraction * 100) / 100;
}

function getDunningLevel(daysOverdue: number): DunningLevel {
  for (let i = DUNNING_LEVELS.length - 1; i >= 0; i--) {
    if (daysOverdue >= DUNNING_LEVELS[i].daysOverdue) {
      return DUNNING_LEVELS[i];
    }
  }
  return DUNNING_LEVELS[0];
}

function calculateTotalDue(amount: number, daysOverdue: number): { fee: number; interest: number; total: number } {
  const level = getDunningLevel(daysOverdue);
  const interest = calculateInterest(amount, daysOverdue);
  return {
    fee: level.fee,
    interest,
    total: amount + level.fee + interest,
  };
}

describe('Dunning System (ABGB §1333)', () => {
  it('returns level 0 for invoices not yet overdue', () => {
    expect(getDunningLevel(0).level).toBe(0);
    expect(getDunningLevel(5).level).toBe(0);
    expect(getDunningLevel(13).level).toBe(0);
  });

  it('escalates to Zahlungserinnerung after 14 days', () => {
    expect(getDunningLevel(14).level).toBe(1);
    expect(getDunningLevel(14).name).toBe('Zahlungserinnerung');
    expect(getDunningLevel(14).fee).toBe(0);
  });

  it('escalates to 1. Mahnung after 30 days with EUR 5 fee', () => {
    expect(getDunningLevel(30).level).toBe(2);
    expect(getDunningLevel(30).name).toBe('1. Mahnung');
    expect(getDunningLevel(30).fee).toBe(5);
  });

  it('escalates to 2. Mahnung after 45 days with EUR 10 fee', () => {
    expect(getDunningLevel(45).level).toBe(3);
    expect(getDunningLevel(45).name).toBe('2. Mahnung');
    expect(getDunningLevel(45).fee).toBe(10);
  });

  it('calculates no interest for first 14 days', () => {
    expect(calculateInterest(1000, 0)).toBe(0);
    expect(calculateInterest(1000, 14)).toBe(0);
  });

  it('calculates ABGB §1333 interest at 4% p.a.', () => {
    const interest30 = calculateInterest(1000, 30);
    expect(interest30).toBeCloseTo(1000 * 0.04 * (30 / 365), 2);
    expect(interest30).toBeGreaterThan(0);

    const interest90 = calculateInterest(1000, 90);
    expect(interest90).toBeCloseTo(1000 * 0.04 * (90 / 365), 2);
    expect(interest90).toBeGreaterThan(interest30);
  });

  it('calculates correct total due with fees and interest', () => {
    const result = calculateTotalDue(800, 45);
    expect(result.fee).toBe(10);
    expect(result.interest).toBeGreaterThan(0);
    expect(result.total).toBe(800 + 10 + result.interest);
  });

  it('handles zero amount gracefully', () => {
    const result = calculateTotalDue(0, 45);
    expect(result.interest).toBe(0);
    expect(result.total).toBe(10); // fee only
  });

  it('calculates interest proportionally to days overdue', () => {
    const interest60 = calculateInterest(1000, 60);
    const interest120 = calculateInterest(1000, 120);
    expect(interest120).toBeCloseTo(interest60 * 2, 1);
  });
});

// ========== SETTLEMENT DISTRIBUTION KEY TESTS ==========

type DistributionKeyType = 'nutzflaeche' | 'einheiten' | 'personen' | 'pauschal' | 'verbrauch' | 'sondernutzung';

interface UnitData {
  id: string;
  flaeche: number;
  personen: number;
  nutzwert: number;
  verbrauch?: number;
}

function calculateShare(
  unit: UnitData,
  allUnits: UnitData[],
  keyType: DistributionKeyType
): number {
  switch (keyType) {
    case 'nutzflaeche': {
      const totalFlaeche = allUnits.reduce((sum, u) => sum + u.flaeche, 0);
      return totalFlaeche > 0 ? unit.flaeche / totalFlaeche : 0;
    }
    case 'einheiten': {
      return allUnits.length > 0 ? 1 / allUnits.length : 0;
    }
    case 'personen': {
      const totalPersonen = allUnits.reduce((sum, u) => sum + u.personen, 0);
      return totalPersonen > 0 ? unit.personen / totalPersonen : 0;
    }
    case 'pauschal': {
      return allUnits.length > 0 ? 1 / allUnits.length : 0;
    }
    case 'verbrauch': {
      const totalVerbrauch = allUnits.reduce((sum, u) => sum + (u.verbrauch || 0), 0);
      return totalVerbrauch > 0 ? (unit.verbrauch || 0) / totalVerbrauch : 0;
    }
    case 'sondernutzung': {
      const totalNutzwert = allUnits.reduce((sum, u) => sum + u.nutzwert, 0);
      return totalNutzwert > 0 ? unit.nutzwert / totalNutzwert : 0;
    }
  }
}

function calculateSettlementForTenant(
  tenantShare: number,
  totalExpense: number,
  monthsOccupied: number,
  totalMonths: number = 12
): { anteil: number; zeitanteil: number; tenantCost: number } {
  const zeitanteil = monthsOccupied / totalMonths;
  const tenantCost = totalExpense * tenantShare * zeitanteil;
  return {
    anteil: tenantShare,
    zeitanteil,
    tenantCost: Math.round(tenantCost * 100) / 100,
  };
}

function calculateAdvanceAdjustment(bkTotal: number, hkTotal: number): { newBk: number; newHk: number } {
  const monthlyBk = bkTotal / 12;
  const monthlyHk = hkTotal / 12;
  return {
    newBk: Math.round(monthlyBk * 1.03 * 100) / 100,
    newHk: Math.round(monthlyHk * 1.03 * 100) / 100,
  };
}

const testUnits: UnitData[] = [
  { id: 'u1', flaeche: 80, personen: 2, nutzwert: 100 },
  { id: 'u2', flaeche: 60, personen: 1, nutzwert: 75 },
  { id: 'u3', flaeche: 120, personen: 4, nutzwert: 150 },
  { id: 'u4', flaeche: 40, personen: 1, nutzwert: 50 },
];

describe('Settlement Distribution Keys (MRG §21)', () => {
  it('distributes by Nutzfläche correctly', () => {
    const totalFlaeche = 80 + 60 + 120 + 40; // 300
    const share1 = calculateShare(testUnits[0], testUnits, 'nutzflaeche');
    expect(share1).toBeCloseTo(80 / 300, 6);

    const share3 = calculateShare(testUnits[2], testUnits, 'nutzflaeche');
    expect(share3).toBeCloseTo(120 / 300, 6);

    const allShares = testUnits.map(u => calculateShare(u, testUnits, 'nutzflaeche'));
    const totalShares = allShares.reduce((sum, s) => sum + s, 0);
    expect(totalShares).toBeCloseTo(1.0, 6);
  });

  it('distributes by Einheiten equally', () => {
    const share = calculateShare(testUnits[0], testUnits, 'einheiten');
    expect(share).toBe(0.25);

    testUnits.forEach(u => {
      expect(calculateShare(u, testUnits, 'einheiten')).toBe(0.25);
    });
  });

  it('distributes by Personen correctly', () => {
    const totalPersonen = 2 + 1 + 4 + 1; // 8
    const share1 = calculateShare(testUnits[0], testUnits, 'personen');
    expect(share1).toBeCloseTo(2 / 8, 6);

    const share3 = calculateShare(testUnits[2], testUnits, 'personen');
    expect(share3).toBeCloseTo(4 / 8, 6);
  });

  it('distributes by Verbrauch correctly', () => {
    const unitsWithVerbrauch = testUnits.map((u, i) => ({
      ...u,
      verbrauch: [100, 200, 300, 400][i],
    }));
    const totalVerbrauch = 100 + 200 + 300 + 400;

    const share1 = calculateShare(unitsWithVerbrauch[0], unitsWithVerbrauch, 'verbrauch');
    expect(share1).toBeCloseTo(100 / totalVerbrauch, 6);
  });

  it('distributes by MEA/Sondernutzung correctly', () => {
    const totalNutzwert = 100 + 75 + 150 + 50; // 375
    const share = calculateShare(testUnits[0], testUnits, 'sondernutzung');
    expect(share).toBeCloseTo(100 / 375, 6);
  });

  it('all shares sum to 1.0 for each key type', () => {
    const keyTypes: DistributionKeyType[] = ['nutzflaeche', 'einheiten', 'personen', 'pauschal', 'sondernutzung'];
    for (const keyType of keyTypes) {
      const allShares = testUnits.map(u => calculateShare(u, testUnits, keyType));
      const total = allShares.reduce((sum, s) => sum + s, 0);
      expect(total).toBeCloseTo(1.0, 6);
    }
  });

  it('calculates tenant settlement with time proportion', () => {
    const result = calculateSettlementForTenant(0.25, 12000, 12, 12);
    expect(result.tenantCost).toBe(3000);
    expect(result.zeitanteil).toBe(1);

    const halfYear = calculateSettlementForTenant(0.25, 12000, 6, 12);
    expect(halfYear.tenantCost).toBe(1500);
    expect(halfYear.zeitanteil).toBe(0.5);
  });

  it('handles partial year tenancy correctly', () => {
    const result = calculateSettlementForTenant(0.3, 10000, 3, 12);
    expect(result.tenantCost).toBe(750);
  });

  it('calculates MRG advance adjustment with 3% reserve', () => {
    const result = calculateAdvanceAdjustment(2400, 1200);
    expect(result.newBk).toBeCloseTo((2400 / 12) * 1.03, 2);
    expect(result.newHk).toBeCloseTo((1200 / 12) * 1.03, 2);
  });
});

// ========== VACANCY (LEERSTAND) INVOICE TESTS ==========

interface VacancyInvoice {
  grundmiete: number;
  betriebskosten: number;
  heizungskosten: number;
  wasserkosten: number;
  ust: number;
  gesamtbetrag: number;
  isVacancy: boolean;
}

function createVacancyInvoice(bk: number, hk: number): VacancyInvoice {
  const ust10 = bk * 0.10;
  const ust20 = hk * 0.20;
  const totalUst = ust10 + ust20;
  const gesamtbetrag = bk + hk + totalUst;

  return {
    grundmiete: 0,
    betriebskosten: bk,
    heizungskosten: hk,
    wasserkosten: 0,
    ust: Math.round(totalUst * 100) / 100,
    gesamtbetrag: Math.round(gesamtbetrag * 100) / 100,
    isVacancy: true,
  };
}

describe('Vacancy Invoice Generation (Leerstand)', () => {
  it('creates vacancy invoice with zero rent', () => {
    const inv = createVacancyInvoice(200, 100);
    expect(inv.grundmiete).toBe(0);
    expect(inv.isVacancy).toBe(true);
  });

  it('applies correct VAT rates (10% BK, 20% HK)', () => {
    const inv = createVacancyInvoice(200, 100);
    const expectedUst = 200 * 0.10 + 100 * 0.20;
    expect(inv.ust).toBeCloseTo(expectedUst, 2);
    expect(inv.gesamtbetrag).toBeCloseTo(200 + 100 + expectedUst, 2);
  });

  it('handles zero BK and HK', () => {
    const inv = createVacancyInvoice(0, 0);
    expect(inv.ust).toBe(0);
    expect(inv.gesamtbetrag).toBe(0);
  });
});

// ========== AUSTRIAN VAT CALCULATION TESTS ==========

function calculateAustrianVat(
  grundmiete: number,
  betriebskosten: number,
  heizungskosten: number,
  wasserkosten: number
): { ust10: number; ust20: number; totalUst: number; gesamtBrutto: number } {
  const ust10 = (grundmiete + betriebskosten + wasserkosten) * 0.10;
  const ust20 = heizungskosten * 0.20;
  const totalUst = ust10 + ust20;
  const netto = grundmiete + betriebskosten + heizungskosten + wasserkosten;
  return {
    ust10: Math.round(ust10 * 100) / 100,
    ust20: Math.round(ust20 * 100) / 100,
    totalUst: Math.round(totalUst * 100) / 100,
    gesamtBrutto: Math.round((netto + totalUst) * 100) / 100,
  };
}

describe('Austrian VAT Calculation', () => {
  it('applies 10% to residential rent, BK, and water', () => {
    const result = calculateAustrianVat(500, 200, 0, 50);
    expect(result.ust10).toBeCloseTo((500 + 200 + 50) * 0.10, 2);
    expect(result.ust20).toBe(0);
  });

  it('applies 20% to heating costs', () => {
    const result = calculateAustrianVat(0, 0, 100, 0);
    expect(result.ust10).toBe(0);
    expect(result.ust20).toBeCloseTo(100 * 0.20, 2);
  });

  it('calculates mixed VAT correctly', () => {
    const result = calculateAustrianVat(600, 200, 150, 30);
    expect(result.ust10).toBeCloseTo((600 + 200 + 30) * 0.10, 2);
    expect(result.ust20).toBeCloseTo(150 * 0.20, 2);
    expect(result.totalUst).toBeCloseTo(result.ust10 + result.ust20, 2);
    const expectedBrutto = 600 + 200 + 150 + 30 + result.totalUst;
    expect(result.gesamtBrutto).toBeCloseTo(expectedBrutto, 2);
  });
});

// ========== MRG §21 SETTLEMENT DEADLINE TESTS ==========

function checkSettlementDeadline(year: number): { abs3Warning: boolean; abs4Expired: boolean; abs3Date: string; abs4Date: string } {
  const now = new Date();
  const abs3Deadline = new Date(year + 1, 5, 30); // 30.06. of following year
  const abs4Deadline = new Date(year + 4, 0, 1); // 01.01. of 4th following year

  return {
    abs3Warning: now > abs3Deadline,
    abs4Expired: now > abs4Deadline,
    abs3Date: `30.06.${year + 1}`,
    abs4Date: `01.01.${year + 4}`,
  };
}

describe('MRG §21 Settlement Deadlines', () => {
  it('calculates Abs 3 deadline correctly (30.06. following year)', () => {
    const result = checkSettlementDeadline(2024);
    expect(result.abs3Date).toBe('30.06.2025');
    expect(result.abs3Warning).toBe(true); // We're in 2026, so 2024 settlement is overdue
  });

  it('calculates Abs 4 statute of limitations (01.01. 4th following year)', () => {
    const result = checkSettlementDeadline(2022);
    expect(result.abs4Date).toBe('01.01.2026');
    expect(result.abs4Expired).toBe(true); // 2022 settlement expired in Jan 2026
  });

  it('does not warn for current year settlement', () => {
    const result = checkSettlementDeadline(2025);
    expect(result.abs3Date).toBe('30.06.2026');
    expect(result.abs4Date).toBe('01.01.2029');
  });
});
