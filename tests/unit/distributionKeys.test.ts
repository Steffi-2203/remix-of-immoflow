/**
 * Unit-Tests für Verteilerschlüssel
 * MRG-konforme Kostenverteilung
 * 
 * Testet:
 * - MEA (Miteigentumsanteile)
 * - QM (Quadratmeter/Fläche)
 * - Personen
 * - Verbrauch
 * - Einheiten (pauschal)
 */

type DistributionKeyType = 'mea' | 'qm' | 'personen' | 'einheiten' | 'verbrauch';

interface DistributionTestCase {
  name: string;
  keyType: DistributionKeyType;
  totalCost: number;
  units: {
    id: string;
    mea: number;
    qm: number;
    personen: number;
    verbrauch: number;
  }[];
  expectedShares: { id: string; share: number }[];
}

function calculateDistributionShare(
  keyType: DistributionKeyType,
  totalCost: number,
  unitValue: number,
  totalValue: number
): number {
  if (totalValue === 0) return 0;
  const share = (totalCost * unitValue) / totalValue;
  return Math.round(share * 100) / 100;
}

function getUnitValue(
  unit: { mea: number; qm: number; personen: number; verbrauch: number },
  keyType: DistributionKeyType
): number {
  switch (keyType) {
    case 'mea': return unit.mea;
    case 'qm': return unit.qm;
    case 'personen': return unit.personen;
    case 'verbrauch': return unit.verbrauch;
    case 'einheiten': return 1;
    default: return 0;
  }
}

function calculateDistribution(
  keyType: DistributionKeyType,
  totalCost: number,
  units: { id: string; mea: number; qm: number; personen: number; verbrauch: number }[]
): { id: string; share: number }[] {
  const totalValue = units.reduce((sum, u) => sum + getUnitValue(u, keyType), 0);
  
  return units.map(unit => ({
    id: unit.id,
    share: calculateDistributionShare(keyType, totalCost, getUnitValue(unit, keyType), totalValue)
  }));
}

const testCases: DistributionTestCase[] = [
  // =====================================================
  // MEA-VERTEILUNG
  // =====================================================
  {
    name: 'MEA: Standard-Verteilung 3 Einheiten',
    keyType: 'mea',
    totalCost: 1000,
    units: [
      { id: 'u1', mea: 100, qm: 50, personen: 2, verbrauch: 0 },
      { id: 'u2', mea: 150, qm: 75, personen: 3, verbrauch: 0 },
      { id: 'u3', mea: 250, qm: 100, personen: 1, verbrauch: 0 },
    ],
    expectedShares: [
      { id: 'u1', share: 200 },
      { id: 'u2', share: 300 },
      { id: 'u3', share: 500 },
    ],
  },
  {
    name: 'MEA: Gleichverteilung',
    keyType: 'mea',
    totalCost: 900,
    units: [
      { id: 'u1', mea: 100, qm: 60, personen: 2, verbrauch: 0 },
      { id: 'u2', mea: 100, qm: 80, personen: 1, verbrauch: 0 },
      { id: 'u3', mea: 100, qm: 70, personen: 3, verbrauch: 0 },
    ],
    expectedShares: [
      { id: 'u1', share: 300 },
      { id: 'u2', share: 300 },
      { id: 'u3', share: 300 },
    ],
  },

  // =====================================================
  // FLÄCHEN-VERTEILUNG (QM)
  // =====================================================
  {
    name: 'QM: Versicherung nach Fläche',
    keyType: 'qm',
    totalCost: 1500,
    units: [
      { id: 'u1', mea: 0, qm: 50, personen: 2, verbrauch: 0 },
      { id: 'u2', mea: 0, qm: 100, personen: 1, verbrauch: 0 },
    ],
    expectedShares: [
      { id: 'u1', share: 500 },
      { id: 'u2', share: 1000 },
    ],
  },
  {
    name: 'QM: Unterschiedliche Wohnungsgrößen',
    keyType: 'qm',
    totalCost: 2400,
    units: [
      { id: 'u1', mea: 0, qm: 35, personen: 1, verbrauch: 0 },
      { id: 'u2', mea: 0, qm: 65, personen: 2, verbrauch: 0 },
      { id: 'u3', mea: 0, qm: 100, personen: 4, verbrauch: 0 },
    ],
    expectedShares: [
      { id: 'u1', share: 420 },
      { id: 'u2', share: 780 },
      { id: 'u3', share: 1200 },
    ],
  },

  // =====================================================
  // PERSONEN-VERTEILUNG
  // =====================================================
  {
    name: 'Personen: Müllabfuhr',
    keyType: 'personen',
    totalCost: 600,
    units: [
      { id: 'u1', mea: 0, qm: 50, personen: 1, verbrauch: 0 },
      { id: 'u2', mea: 0, qm: 50, personen: 2, verbrauch: 0 },
      { id: 'u3', mea: 0, qm: 50, personen: 3, verbrauch: 0 },
    ],
    expectedShares: [
      { id: 'u1', share: 100 },
      { id: 'u2', share: 200 },
      { id: 'u3', share: 300 },
    ],
  },
  {
    name: 'Personen: Wasser/Abwasser',
    keyType: 'personen',
    totalCost: 1200,
    units: [
      { id: 'u1', mea: 0, qm: 80, personen: 4, verbrauch: 0 },
      { id: 'u2', mea: 0, qm: 50, personen: 2, verbrauch: 0 },
    ],
    expectedShares: [
      { id: 'u1', share: 800 },
      { id: 'u2', share: 400 },
    ],
  },

  // =====================================================
  // EINHEITEN (Pauschal)
  // =====================================================
  {
    name: 'Einheiten: Pauschalverteilung',
    keyType: 'einheiten',
    totalCost: 500,
    units: [
      { id: 'u1', mea: 100, qm: 30, personen: 1, verbrauch: 0 },
      { id: 'u2', mea: 200, qm: 60, personen: 2, verbrauch: 0 },
      { id: 'u3', mea: 300, qm: 90, personen: 3, verbrauch: 0 },
      { id: 'u4', mea: 400, qm: 120, personen: 4, verbrauch: 0 },
      { id: 'u5', mea: 0, qm: 0, personen: 1, verbrauch: 0 },
    ],
    expectedShares: [
      { id: 'u1', share: 100 },
      { id: 'u2', share: 100 },
      { id: 'u3', share: 100 },
      { id: 'u4', share: 100 },
      { id: 'u5', share: 100 },
    ],
  },

  // =====================================================
  // VERBRAUCH
  // =====================================================
  {
    name: 'Verbrauch: Heizkosten nach kWh',
    keyType: 'verbrauch',
    totalCost: 4000,
    units: [
      { id: 'u1', mea: 0, qm: 0, personen: 0, verbrauch: 3000 },
      { id: 'u2', mea: 0, qm: 0, personen: 0, verbrauch: 4500 },
      { id: 'u3', mea: 0, qm: 0, personen: 0, verbrauch: 2500 },
    ],
    expectedShares: [
      { id: 'u1', share: 1200 },
      { id: 'u2', share: 1800 },
      { id: 'u3', share: 1000 },
    ],
  },

  // =====================================================
  // SONDERFÄLLE
  // =====================================================
  {
    name: 'Einzelne Einheit: 100% der Kosten',
    keyType: 'mea',
    totalCost: 500,
    units: [
      { id: 'u1', mea: 1000, qm: 100, personen: 4, verbrauch: 5000 },
    ],
    expectedShares: [
      { id: 'u1', share: 500 },
    ],
  },
  {
    name: 'Null-Werte: Keine Verteilung möglich',
    keyType: 'verbrauch',
    totalCost: 1000,
    units: [
      { id: 'u1', mea: 100, qm: 50, personen: 2, verbrauch: 0 },
      { id: 'u2', mea: 100, qm: 50, personen: 2, verbrauch: 0 },
    ],
    expectedShares: [
      { id: 'u1', share: 0 },
      { id: 'u2', share: 0 },
    ],
  },
];

function runTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  for (const testCase of testCases) {
    const calculated = calculateDistribution(testCase.keyType, testCase.totalCost, testCase.units);
    
    let allMatch = true;
    for (let i = 0; i < testCase.expectedShares.length; i++) {
      const expected = testCase.expectedShares[i];
      const actual = calculated.find(c => c.id === expected.id);
      if (!actual || Math.abs(actual.share - expected.share) > 0.01) {
        allMatch = false;
        break;
      }
    }

    if (allMatch) {
      passed++;
      results.push(`✓ ${testCase.name}`);
    } else {
      failed++;
      results.push(`✗ ${testCase.name}`);
      results.push(`  Schlüssel: ${testCase.keyType}, Kosten: ${testCase.totalCost}€`);
      for (let i = 0; i < testCase.expectedShares.length; i++) {
        const expected = testCase.expectedShares[i];
        const actual = calculated.find(c => c.id === expected.id);
        results.push(`  ${expected.id}: erwartet ${expected.share}€, erhalten ${actual?.share ?? 'n/a'}€`);
      }
    }
  }

  return { passed, failed, results };
}

export { 
  runTests, 
  calculateDistributionShare, 
  calculateDistribution, 
  getUnitValue 
};
