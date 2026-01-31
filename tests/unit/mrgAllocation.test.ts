/**
 * Unit-Tests für MRG-konforme Zahlungsaufteilung
 * Priorität: BK → HK → Miete (gemäß MRG)
 */

import { calculateMrgAllocation } from '../../src/hooks/useMrgAllocation';

interface TestCase {
  name: string;
  sollBk: number;
  sollHk: number;
  sollMiete: number;
  totalIst: number;
  expected: {
    istBk: number;
    istHk: number;
    istMiete: number;
    ueberzahlung: number;
    unterzahlung: number;
  };
}

const testCases: TestCase[] = [
  // =====================================================
  // GRUNDFÄLLE
  // =====================================================
  {
    name: 'Vollständige Zahlung - exakter Betrag',
    sollBk: 150,
    sollHk: 100,
    sollMiete: 500,
    totalIst: 750,
    expected: {
      istBk: 150,
      istHk: 100,
      istMiete: 500,
      ueberzahlung: 0,
      unterzahlung: 0,
    },
  },
  {
    name: 'Keine Zahlung eingegangen',
    sollBk: 150,
    sollHk: 100,
    sollMiete: 500,
    totalIst: 0,
    expected: {
      istBk: 0,
      istHk: 0,
      istMiete: 0,
      ueberzahlung: 0,
      unterzahlung: 750,
    },
  },
  {
    name: 'Überzahlung - mehr als SOLL',
    sollBk: 150,
    sollHk: 100,
    sollMiete: 500,
    totalIst: 800,
    expected: {
      istBk: 150,
      istHk: 100,
      istMiete: 500,
      ueberzahlung: 50,
      unterzahlung: 0,
    },
  },

  // =====================================================
  // MRG-PRIORITÄT: BK → HK → Miete
  // =====================================================
  {
    name: 'Teilzahlung deckt nur BK',
    sollBk: 150,
    sollHk: 100,
    sollMiete: 500,
    totalIst: 100,
    expected: {
      istBk: 100,
      istHk: 0,
      istMiete: 0,
      ueberzahlung: 0,
      unterzahlung: 650,
    },
  },
  {
    name: 'Teilzahlung deckt BK vollständig, HK teilweise',
    sollBk: 150,
    sollHk: 100,
    sollMiete: 500,
    totalIst: 200,
    expected: {
      istBk: 150,
      istHk: 50,
      istMiete: 0,
      ueberzahlung: 0,
      unterzahlung: 550,
    },
  },
  {
    name: 'Teilzahlung deckt BK und HK, Miete teilweise',
    sollBk: 150,
    sollHk: 100,
    sollMiete: 500,
    totalIst: 400,
    expected: {
      istBk: 150,
      istHk: 100,
      istMiete: 150,
      ueberzahlung: 0,
      unterzahlung: 350,
    },
  },

  // =====================================================
  // SONDERFÄLLE
  // =====================================================
  {
    name: 'Keine BK - nur HK und Miete',
    sollBk: 0,
    sollHk: 100,
    sollMiete: 500,
    totalIst: 400,
    expected: {
      istBk: 0,
      istHk: 100,
      istMiete: 300,
      ueberzahlung: 0,
      unterzahlung: 200,
    },
  },
  {
    name: 'Keine HK - nur BK und Miete',
    sollBk: 150,
    sollHk: 0,
    sollMiete: 500,
    totalIst: 400,
    expected: {
      istBk: 150,
      istHk: 0,
      istMiete: 250,
      ueberzahlung: 0,
      unterzahlung: 250,
    },
  },
  {
    name: 'Nur Miete - keine BK/HK',
    sollBk: 0,
    sollHk: 0,
    sollMiete: 500,
    totalIst: 300,
    expected: {
      istBk: 0,
      istHk: 0,
      istMiete: 300,
      ueberzahlung: 0,
      unterzahlung: 200,
    },
  },

  // =====================================================
  // REALISTISCHE ÖSTERREICHISCHE SZENARIEN
  // =====================================================
  {
    name: 'Typische Wiener Wohnung - vollständig bezahlt',
    sollBk: 180.50,
    sollHk: 95.30,
    sollMiete: 650.00,
    totalIst: 925.80,
    expected: {
      istBk: 180.50,
      istHk: 95.30,
      istMiete: 650.00,
      ueberzahlung: 0,
      unterzahlung: 0,
    },
  },
  {
    name: 'Runde Zahlung - Mieter zahlt gerundeten Betrag',
    sollBk: 180.50,
    sollHk: 95.30,
    sollMiete: 650.00,
    totalIst: 900.00, // Mieter rundet ab
    expected: {
      istBk: 180.50,
      istHk: 95.30,
      istMiete: 624.20,
      ueberzahlung: 0,
      unterzahlung: 25.80,
    },
  },
  {
    name: 'Geringfügige Überzahlung - Rundungsdifferenz',
    sollBk: 180.50,
    sollHk: 95.30,
    sollMiete: 650.00,
    totalIst: 926.00, // Mieter rundet auf
    expected: {
      istBk: 180.50,
      istHk: 95.30,
      istMiete: 650.00,
      ueberzahlung: 0.20,
      unterzahlung: 0,
    },
  },
  {
    name: 'Altbau mit hohen BK - Teilzahlung',
    sollBk: 280.00,
    sollHk: 150.00,
    sollMiete: 420.00,
    totalIst: 500.00,
    expected: {
      istBk: 280.00,
      istHk: 150.00,
      istMiete: 70.00,
      ueberzahlung: 0,
      unterzahlung: 350.00,
    },
  },
  {
    name: 'Gewerbeeinheit mit 20% USt auf HK',
    sollBk: 300.00,
    sollHk: 240.00, // inkl. 20% USt
    sollMiete: 1200.00,
    totalIst: 1740.00,
    expected: {
      istBk: 300.00,
      istHk: 240.00,
      istMiete: 1200.00,
      ueberzahlung: 0,
      unterzahlung: 0,
    },
  },

  // =====================================================
  // EDGE CASES
  // =====================================================
  {
    name: 'Minimalbetrag - 1 Cent Zahlung',
    sollBk: 150,
    sollHk: 100,
    sollMiete: 500,
    totalIst: 0.01,
    expected: {
      istBk: 0.01,
      istHk: 0,
      istMiete: 0,
      ueberzahlung: 0,
      unterzahlung: 749.99,
    },
  },
  {
    name: 'Sehr große Beträge',
    sollBk: 15000,
    sollHk: 8000,
    sollMiete: 45000,
    totalIst: 50000,
    expected: {
      istBk: 15000,
      istHk: 8000,
      istMiete: 27000,
      ueberzahlung: 0,
      unterzahlung: 18000,
    },
  },
  {
    name: 'Alle SOLL-Werte sind 0',
    sollBk: 0,
    sollHk: 0,
    sollMiete: 0,
    totalIst: 100,
    expected: {
      istBk: 0,
      istHk: 0,
      istMiete: 0,
      ueberzahlung: 100,
      unterzahlung: 0,
    },
  },
];

function runTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  for (const testCase of testCases) {
    const result = calculateMrgAllocation(
      testCase.sollBk,
      testCase.sollHk,
      testCase.sollMiete,
      testCase.totalIst
    );

    const isPass =
      Math.abs(result.istBk - testCase.expected.istBk) < 0.001 &&
      Math.abs(result.istHk - testCase.expected.istHk) < 0.001 &&
      Math.abs(result.istMiete - testCase.expected.istMiete) < 0.001 &&
      Math.abs(result.ueberzahlung - testCase.expected.ueberzahlung) < 0.001 &&
      Math.abs(result.unterzahlung - testCase.expected.unterzahlung) < 0.001;

    if (isPass) {
      passed++;
      results.push(`✓ ${testCase.name}`);
    } else {
      failed++;
      results.push(`✗ ${testCase.name}`);
      results.push(`  Eingabe: BK=${testCase.sollBk}, HK=${testCase.sollHk}, Miete=${testCase.sollMiete}, IST=${testCase.totalIst}`);
      results.push(`  Erwartet: istBk=${testCase.expected.istBk}, istHk=${testCase.expected.istHk}, istMiete=${testCase.expected.istMiete}`);
      results.push(`  Erhalten: istBk=${result.istBk}, istHk=${result.istHk}, istMiete=${result.istMiete}`);
      results.push(`  Über-/Unterzahlung: erwartet=${testCase.expected.ueberzahlung}/${testCase.expected.unterzahlung}, erhalten=${result.ueberzahlung}/${result.unterzahlung}`);
    }
  }

  return { passed, failed, results };
}

// Export for runner
export { runTests, testCases };

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  const { passed, failed, results } = runTests();
  console.log('\n=== MRG-Zahlungsaufteilung Unit-Tests ===\n');
  results.forEach(r => console.log(r));
  console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
  process.exit(failed > 0 ? 1 : 0);
}
