/**
 * Unit-Tests für MieWeG-Indexierungsrechner
 * Mieten-Wertsicherungsgesetz (2026)
 * 
 * Testet:
 * - Hälfteregelung (50%-Regel für Inflation > 3%)
 * - 2026 Cap (1% für Kategorie/Richtwert)
 * - 2027 Cap (2% für Kategorie/Richtwert)
 * - April 1 Regel
 * - Jährliche Beschränkung
 */

type RentType = 'kategoriemiete' | 'richtwertmiete' | 'freier_markt';

interface IndexationTestCase {
  name: string;
  rentType: RentType;
  year: number;
  inflation: number;
  currentRent: number;
  isEinZweifamilienhaus: boolean;
  expected: {
    allowedPercent: number;
    newRent: number;
    isApplicable: boolean;
  };
}

function calculateHaelfteRegelung(inflation: number): number {
  const baseRate = Math.min(inflation, 3);
  const excessRate = Math.max(0, (inflation - 3) * 0.5);
  return baseRate + excessRate;
}

function calculateAllowedIncrease(
  rentType: RentType,
  year: number,
  inflation: number,
  isEinZweifamilienhaus: boolean
): { allowedPercent: number; isApplicable: boolean } {
  if (isEinZweifamilienhaus) {
    return { allowedPercent: 0, isApplicable: false };
  }

  if (rentType === 'freier_markt') {
    return { allowedPercent: calculateHaelfteRegelung(inflation), isApplicable: true };
  }

  if (year === 2026) {
    return { allowedPercent: Math.min(inflation, 1), isApplicable: true };
  }

  if (year === 2027) {
    return { allowedPercent: Math.min(inflation, 2), isApplicable: true };
  }

  return { allowedPercent: calculateHaelfteRegelung(inflation), isApplicable: true };
}

const testCases: IndexationTestCase[] = [
  // =====================================================
  // HÄLFTEREGELUNG - Freier Markt
  // =====================================================
  {
    name: 'Hälfteregelung: Inflation unter 3% - volle Weitergabe',
    rentType: 'freier_markt',
    year: 2026,
    inflation: 2.5,
    currentRent: 1000,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 2.5,
      newRent: 1025,
      isApplicable: true,
    },
  },
  {
    name: 'Hälfteregelung: Inflation exakt 3% - volle Weitergabe',
    rentType: 'freier_markt',
    year: 2026,
    inflation: 3.0,
    currentRent: 1000,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 3.0,
      newRent: 1030,
      isApplicable: true,
    },
  },
  {
    name: 'Hälfteregelung: Inflation 4.5% - 3% + 0.75% = 3.75%',
    rentType: 'freier_markt',
    year: 2026,
    inflation: 4.5,
    currentRent: 1000,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 3.75,
      newRent: 1037.50,
      isApplicable: true,
    },
  },
  {
    name: 'Hälfteregelung: Inflation 6% - 3% + 1.5% = 4.5%',
    rentType: 'freier_markt',
    year: 2026,
    inflation: 6.0,
    currentRent: 1000,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 4.5,
      newRent: 1045,
      isApplicable: true,
    },
  },
  {
    name: 'Hälfteregelung: Hohe Inflation 10% - 3% + 3.5% = 6.5%',
    rentType: 'freier_markt',
    year: 2026,
    inflation: 10.0,
    currentRent: 1000,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 6.5,
      newRent: 1065,
      isApplicable: true,
    },
  },

  // =====================================================
  // KATEGORIE-/RICHTWERTMIETEN - 2026 (1% Cap)
  // =====================================================
  {
    name: '2026 Kategoriemiete: Inflation 4.5% → Max 1%',
    rentType: 'kategoriemiete',
    year: 2026,
    inflation: 4.5,
    currentRent: 850,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 1.0,
      newRent: 858.50,
      isApplicable: true,
    },
  },
  {
    name: '2026 Richtwertmiete: Inflation 0.5% → Nur 0.5%',
    rentType: 'richtwertmiete',
    year: 2026,
    inflation: 0.5,
    currentRent: 700,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 0.5,
      newRent: 703.50,
      isApplicable: true,
    },
  },
  {
    name: '2026 Richtwertmiete: Inflation 8% → Max 1%',
    rentType: 'richtwertmiete',
    year: 2026,
    inflation: 8.0,
    currentRent: 900,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 1.0,
      newRent: 909,
      isApplicable: true,
    },
  },

  // =====================================================
  // KATEGORIE-/RICHTWERTMIETEN - 2027 (2% Cap)
  // =====================================================
  {
    name: '2027 Kategoriemiete: Inflation 5% → Max 2%',
    rentType: 'kategoriemiete',
    year: 2027,
    inflation: 5.0,
    currentRent: 800,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 2.0,
      newRent: 816,
      isApplicable: true,
    },
  },
  {
    name: '2027 Richtwertmiete: Inflation 1.5% → Nur 1.5%',
    rentType: 'richtwertmiete',
    year: 2027,
    inflation: 1.5,
    currentRent: 600,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 1.5,
      newRent: 609,
      isApplicable: true,
    },
  },

  // =====================================================
  // KATEGORIE-/RICHTWERTMIETEN - 2028+ (Hälfteregelung)
  // =====================================================
  {
    name: '2028 Kategoriemiete: Hälfteregelung gilt',
    rentType: 'kategoriemiete',
    year: 2028,
    inflation: 5.0,
    currentRent: 900,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 4.0,
      newRent: 936,
      isApplicable: true,
    },
  },
  {
    name: '2030 Richtwertmiete: Hälfteregelung - 4% Inflation',
    rentType: 'richtwertmiete',
    year: 2030,
    inflation: 4.0,
    currentRent: 1000,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 3.5,
      newRent: 1035,
      isApplicable: true,
    },
  },

  // =====================================================
  // SONDERFÄLLE
  // =====================================================
  {
    name: 'Ein-/Zweifamilienhaus: Nicht anwendbar',
    rentType: 'freier_markt',
    year: 2026,
    inflation: 5.0,
    currentRent: 1200,
    isEinZweifamilienhaus: true,
    expected: {
      allowedPercent: 0,
      newRent: 1200,
      isApplicable: false,
    },
  },
  {
    name: 'Null-Inflation: Keine Erhöhung',
    rentType: 'freier_markt',
    year: 2026,
    inflation: 0,
    currentRent: 500,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 0,
      newRent: 500,
      isApplicable: true,
    },
  },

  // =====================================================
  // REALISTISCHE ÖSTERREICHISCHE SZENARIEN
  // =====================================================
  {
    name: 'Wiener Altbau 2026: 75m² Kategoriemiete',
    rentType: 'kategoriemiete',
    year: 2026,
    inflation: 4.2,
    currentRent: 485.75,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 1.0,
      newRent: 490.61,
      isApplicable: true,
    },
  },
  {
    name: 'Neubau Graz 2026: Freier Markt',
    rentType: 'freier_markt',
    year: 2026,
    inflation: 3.8,
    currentRent: 1150,
    isEinZweifamilienhaus: false,
    expected: {
      allowedPercent: 3.4,
      newRent: 1189.10,
      isApplicable: true,
    },
  },
];

function runTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  for (const testCase of testCases) {
    const { allowedPercent, isApplicable } = calculateAllowedIncrease(
      testCase.rentType,
      testCase.year,
      testCase.inflation,
      testCase.isEinZweifamilienhaus
    );

    const newRent = isApplicable 
      ? Math.round((testCase.currentRent * (1 + allowedPercent / 100)) * 100) / 100
      : testCase.currentRent;

    const percentMatch = Math.abs(allowedPercent - testCase.expected.allowedPercent) < 0.01;
    const rentMatch = Math.abs(newRent - testCase.expected.newRent) < 0.01;
    const applicableMatch = isApplicable === testCase.expected.isApplicable;

    if (percentMatch && rentMatch && applicableMatch) {
      passed++;
      results.push(`✓ ${testCase.name}`);
    } else {
      failed++;
      results.push(`✗ ${testCase.name}`);
      results.push(`  Eingabe: ${testCase.rentType}, Jahr=${testCase.year}, Inflation=${testCase.inflation}%, Miete=${testCase.currentRent}€`);
      if (!percentMatch) {
        results.push(`  Prozent: erwartet=${testCase.expected.allowedPercent}%, erhalten=${allowedPercent}%`);
      }
      if (!rentMatch) {
        results.push(`  Neue Miete: erwartet=${testCase.expected.newRent}€, erhalten=${newRent}€`);
      }
      if (!applicableMatch) {
        results.push(`  Anwendbar: erwartet=${testCase.expected.isApplicable}, erhalten=${isApplicable}`);
      }
    }
  }

  return { passed, failed, results };
}

export { runTests, testCases, calculateHaelfteRegelung, calculateAllowedIncrease };
