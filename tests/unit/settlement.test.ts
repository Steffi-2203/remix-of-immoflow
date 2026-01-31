/**
 * Unit-Tests für Betriebskostenabrechnung (§21 MRG)
 * 
 * Testet:
 * - Verteilung nach MEA/QM/Personen
 * - Leerstandskosten (Eigentümer trägt)
 * - BK/HK getrennte Berechnung
 * - Jahresmieter vs. aktueller Mieter
 */

interface DistributionTestCase {
  name: string;
  totalCost: number;
  units: {
    id: string;
    flaeche: number;
    mea: number;
    hasCurrentTenant: boolean;
    hasYearTenant: boolean;
  }[];
  expectedResults: {
    unitId: string;
    share: number;
    paidByOwner: boolean;
  }[];
}

interface VacancyTestCase {
  name: string;
  unit: {
    flaeche: number;
    mea: number;
    currentTenant: { name: string; bkVorschuss: number } | null;
    yearTenant: { name: string; hkVorschuss: number } | null;
  };
  bkCost: number;
  hkCost: number;
  expected: {
    bkSaldo: number;
    hkSaldo: number;
    isLeerstandBK: boolean;
    isLeerstandHK: boolean;
    bkPaidBy: string;
    hkPaidBy: string;
  };
}

function calculateDistributionShare(
  totalCost: number,
  unitValue: number,
  totalValue: number
): number {
  if (totalValue === 0) return 0;
  return Math.round((totalCost * unitValue / totalValue) * 100) / 100;
}

function calculateSettlementBalance(
  cost: number,
  prepayment: number,
  hasPayingTenant: boolean
): { saldo: number; paidByOwner: boolean } {
  if (!hasPayingTenant) {
    return { saldo: 0, paidByOwner: true };
  }
  return { saldo: Math.round((cost - prepayment) * 100) / 100, paidByOwner: false };
}

const distributionTests: DistributionTestCase[] = [
  {
    name: 'MEA-Verteilung: 3 Einheiten mit unterschiedlichen Anteilen',
    totalCost: 1000,
    units: [
      { id: 'u1', flaeche: 50, mea: 100, hasCurrentTenant: true, hasYearTenant: true },
      { id: 'u2', flaeche: 75, mea: 150, hasCurrentTenant: true, hasYearTenant: true },
      { id: 'u3', flaeche: 100, mea: 250, hasCurrentTenant: true, hasYearTenant: true },
    ],
    expectedResults: [
      { unitId: 'u1', share: 200, paidByOwner: false },
      { unitId: 'u2', share: 300, paidByOwner: false },
      { unitId: 'u3', share: 500, paidByOwner: false },
    ],
  },
  {
    name: 'Flächen-Verteilung (QM): 2 Einheiten',
    totalCost: 600,
    units: [
      { id: 'u1', flaeche: 60, mea: 0, hasCurrentTenant: true, hasYearTenant: true },
      { id: 'u2', flaeche: 90, mea: 0, hasCurrentTenant: true, hasYearTenant: true },
    ],
    expectedResults: [
      { unitId: 'u1', share: 240, paidByOwner: false },
      { unitId: 'u2', share: 360, paidByOwner: false },
    ],
  },
  {
    name: 'Leerstand: Eine Einheit ohne Mieter',
    totalCost: 1000,
    units: [
      { id: 'u1', flaeche: 50, mea: 100, hasCurrentTenant: true, hasYearTenant: true },
      { id: 'u2', flaeche: 50, mea: 100, hasCurrentTenant: false, hasYearTenant: false },
    ],
    expectedResults: [
      { unitId: 'u1', share: 500, paidByOwner: false },
      { unitId: 'u2', share: 500, paidByOwner: true },
    ],
  },
  {
    name: 'Gemischte Belegung: 50% Leerstand',
    totalCost: 2000,
    units: [
      { id: 'u1', flaeche: 100, mea: 250, hasCurrentTenant: true, hasYearTenant: true },
      { id: 'u2', flaeche: 100, mea: 250, hasCurrentTenant: false, hasYearTenant: false },
      { id: 'u3', flaeche: 100, mea: 250, hasCurrentTenant: true, hasYearTenant: true },
      { id: 'u4', flaeche: 100, mea: 250, hasCurrentTenant: false, hasYearTenant: false },
    ],
    expectedResults: [
      { unitId: 'u1', share: 500, paidByOwner: false },
      { unitId: 'u2', share: 500, paidByOwner: true },
      { unitId: 'u3', share: 500, paidByOwner: false },
      { unitId: 'u4', share: 500, paidByOwner: true },
    ],
  },
];

const vacancyTests: VacancyTestCase[] = [
  {
    name: 'Vollvermietet: BK und HK vom Mieter - Nachzahlung',
    unit: {
      flaeche: 75,
      mea: 150,
      currentTenant: { name: 'Müller', bkVorschuss: 120 },
      yearTenant: { name: 'Müller', hkVorschuss: 80 },
    },
    bkCost: 1800,
    hkCost: 1200,
    expected: {
      bkSaldo: 360,
      hkSaldo: 240,
      isLeerstandBK: false,
      isLeerstandHK: false,
      bkPaidBy: 'Mieter (Müller)',
      hkPaidBy: 'Mieter (Müller)',
    },
  },
  {
    name: 'Mieterwechsel: BK neuer Mieter, HK Altmieter',
    unit: {
      flaeche: 75,
      mea: 150,
      currentTenant: { name: 'Schmidt', bkVorschuss: 140 },
      yearTenant: { name: 'Huber', hkVorschuss: 90 },
    },
    bkCost: 1800,
    hkCost: 1200,
    expected: {
      bkSaldo: 120,
      hkSaldo: 120,
      isLeerstandBK: false,
      isLeerstandHK: false,
      bkPaidBy: 'Mieter (Schmidt)',
      hkPaidBy: 'Altmieter (Huber)',
    },
  },
  {
    name: 'Vollständiger Leerstand: Eigentümer zahlt alles',
    unit: {
      flaeche: 75,
      mea: 150,
      currentTenant: null,
      yearTenant: null,
    },
    bkCost: 1800,
    hkCost: 1200,
    expected: {
      bkSaldo: 0,
      hkSaldo: 0,
      isLeerstandBK: true,
      isLeerstandHK: true,
      bkPaidBy: 'Eigentümer',
      hkPaidBy: 'Eigentümer',
    },
  },
  {
    name: 'Partieller Leerstand: Kein aktueller Mieter, aber Altmieter für HK',
    unit: {
      flaeche: 75,
      mea: 150,
      currentTenant: null,
      yearTenant: { name: 'Huber', hkVorschuss: 90 },
    },
    bkCost: 1800,
    hkCost: 1200,
    expected: {
      bkSaldo: 0,
      hkSaldo: 120,
      isLeerstandBK: true,
      isLeerstandHK: false,
      bkPaidBy: 'Eigentümer',
      hkPaidBy: 'Altmieter (Huber)',
    },
  },
  {
    name: 'Neuvermietung: Aktueller Mieter für BK, kein Altmieter für HK',
    unit: {
      flaeche: 75,
      mea: 150,
      currentTenant: { name: 'Neumann', bkVorschuss: 140 },
      yearTenant: null,
    },
    bkCost: 1800,
    hkCost: 1200,
    expected: {
      bkSaldo: 120,
      hkSaldo: 0,
      isLeerstandBK: false,
      isLeerstandHK: true,
      bkPaidBy: 'Mieter (Neumann)',
      hkPaidBy: 'Eigentümer',
    },
  },
  {
    name: 'Guthaben: Vorschuss höher als tatsächliche Kosten',
    unit: {
      flaeche: 75,
      mea: 150,
      currentTenant: { name: 'Weber', bkVorschuss: 200 },
      yearTenant: { name: 'Weber', hkVorschuss: 150 },
    },
    bkCost: 1800,
    hkCost: 1200,
    expected: {
      bkSaldo: -600,
      hkSaldo: -600,
      isLeerstandBK: false,
      isLeerstandHK: false,
      bkPaidBy: 'Mieter (Weber)',
      hkPaidBy: 'Mieter (Weber)',
    },
  },
];

function runDistributionTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  for (const test of distributionTests) {
    const totalValue = test.units.reduce((sum, u) => sum + u.mea, 0) || 
                       test.units.reduce((sum, u) => sum + u.flaeche, 0);
    
    let allMatch = true;
    for (let i = 0; i < test.units.length; i++) {
      const unit = test.units[i];
      const expected = test.expectedResults[i];
      
      const unitValue = unit.mea > 0 ? unit.mea : unit.flaeche;
      const calculatedShare = calculateDistributionShare(test.totalCost, unitValue, totalValue);
      const paidByOwner = !unit.hasCurrentTenant;
      
      if (Math.abs(calculatedShare - expected.share) > 0.01 || paidByOwner !== expected.paidByOwner) {
        allMatch = false;
      }
    }
    
    if (allMatch) {
      passed++;
      results.push(`✓ ${test.name}`);
    } else {
      failed++;
      results.push(`✗ ${test.name}`);
    }
  }

  return { passed, failed, results };
}

function runVacancyTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  for (const test of vacancyTests) {
    const isLeerstandBK = !test.unit.currentTenant;
    const isLeerstandHK = !test.unit.yearTenant;
    
    const monthCount = 12;
    const bkVorschuss = test.unit.currentTenant ? test.unit.currentTenant.bkVorschuss * monthCount : 0;
    const hkVorschuss = test.unit.yearTenant ? test.unit.yearTenant.hkVorschuss * monthCount : 0;
    
    const bkSaldo = isLeerstandBK ? 0 : Math.round((test.bkCost - bkVorschuss) * 100) / 100;
    const hkSaldo = isLeerstandHK ? 0 : Math.round((test.hkCost - hkVorschuss) * 100) / 100;
    
    const match = 
      Math.abs(bkSaldo - test.expected.bkSaldo) < 0.01 &&
      Math.abs(hkSaldo - test.expected.hkSaldo) < 0.01 &&
      isLeerstandBK === test.expected.isLeerstandBK &&
      isLeerstandHK === test.expected.isLeerstandHK;
    
    if (match) {
      passed++;
      results.push(`✓ ${test.name}`);
    } else {
      failed++;
      results.push(`✗ ${test.name}`);
      results.push(`  Erwartet: BK-Saldo=${test.expected.bkSaldo}, HK-Saldo=${test.expected.hkSaldo}`);
      results.push(`  Erhalten: BK-Saldo=${bkSaldo}, HK-Saldo=${hkSaldo}`);
      results.push(`  Leerstand: BK=${isLeerstandBK}/${test.expected.isLeerstandBK}, HK=${isLeerstandHK}/${test.expected.isLeerstandHK}`);
    }
  }

  return { passed, failed, results };
}

export function runTests(): { passed: number; failed: number; results: string[] } {
  const allResults: string[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  allResults.push('--- Verteilungsschlüssel Tests ---');
  const distResults = runDistributionTests();
  totalPassed += distResults.passed;
  totalFailed += distResults.failed;
  allResults.push(...distResults.results);

  allResults.push('');
  allResults.push('--- Leerstand Tests (§21 MRG) ---');
  const vacResults = runVacancyTests();
  totalPassed += vacResults.passed;
  totalFailed += vacResults.failed;
  allResults.push(...vacResults.results);

  return { passed: totalPassed, failed: totalFailed, results: allResults };
}

export { distributionTests, vacancyTests };
