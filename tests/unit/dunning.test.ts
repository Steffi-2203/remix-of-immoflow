/**
 * Unit-Tests für Mahnwesen
 * ABGB §1333 Zinsberechnung und 3-Stufen-Eskalation
 * 
 * Testet:
 * - Verzugszinsen-Berechnung (4% Basiszins + 4% = 8% für Verbraucher)
 * - Mahnstufen-Eskalation
 * - Mahnfristen
 */

interface InterestTestCase {
  name: string;
  principal: number;
  daysOverdue: number;
  annualRate: number;
  expected: number;
}

interface DunningLevelTestCase {
  name: string;
  currentLevel: number;
  daysOverdue: number;
  expectedNextLevel: number | null;
  expectedLabel: string;
}

function calculateInterest(
  principal: number,
  daysOverdue: number,
  annualRate: number = 8
): number {
  const dailyRate = annualRate / 100 / 365;
  const interest = principal * dailyRate * daysOverdue;
  return Math.round(interest * 100) / 100;
}

function getDunningLevel(daysOverdue: number): number {
  if (daysOverdue > 30) return 2;
  if (daysOverdue > 14) return 1;
  return 0;
}

function getDunningStatusLabel(level: number): string {
  switch (level) {
    case 0: return 'Keine';
    case 1: return 'Zahlungserinnerung';
    case 2: return 'Mahnung';
    default: return 'Unbekannt';
  }
}

function getNextDunningAction(level: number): { level: 1 | 2; label: string } | null {
  switch (level) {
    case 0: return { level: 1, label: 'Zahlungserinnerung senden' };
    case 1: return { level: 2, label: 'Mahnung senden' };
    default: return null;
  }
}

const interestTestCases: InterestTestCase[] = [
  {
    name: 'Standard-Fall: 1000€, 30 Tage, 8%',
    principal: 1000,
    daysOverdue: 30,
    annualRate: 8,
    expected: 6.58,
  },
  {
    name: 'Kleiner Betrag: 100€, 14 Tage',
    principal: 100,
    daysOverdue: 14,
    annualRate: 8,
    expected: 0.31,
  },
  {
    name: 'Großer Betrag: 5000€, 60 Tage',
    principal: 5000,
    daysOverdue: 60,
    annualRate: 8,
    expected: 65.75,
  },
  {
    name: 'Ein Tag überfällig',
    principal: 500,
    daysOverdue: 1,
    annualRate: 8,
    expected: 0.11,
  },
  {
    name: 'Null Tage (kein Verzug)',
    principal: 1000,
    daysOverdue: 0,
    annualRate: 8,
    expected: 0,
  },
  {
    name: 'Gewerbe: Höherer Zinssatz 9.2%',
    principal: 2000,
    daysOverdue: 45,
    annualRate: 9.2,
    expected: 22.68,
  },
  {
    name: 'Langfristiger Verzug: 90 Tage',
    principal: 750,
    daysOverdue: 90,
    annualRate: 8,
    expected: 14.79,
  },
  {
    name: 'Typische Miete: 925.80€, 21 Tage',
    principal: 925.80,
    daysOverdue: 21,
    annualRate: 8,
    expected: 4.26,
  },
];

const dunningLevelTestCases: DunningLevelTestCase[] = [
  {
    name: 'Keine Mahnung: 0-14 Tage',
    currentLevel: 0,
    daysOverdue: 10,
    expectedNextLevel: 1,
    expectedLabel: 'Keine',
  },
  {
    name: 'Zahlungserinnerung fällig: 15 Tage',
    currentLevel: 0,
    daysOverdue: 15,
    expectedNextLevel: 1,
    expectedLabel: 'Zahlungserinnerung',
  },
  {
    name: 'Mahnung fällig: 31 Tage',
    currentLevel: 1,
    daysOverdue: 31,
    expectedNextLevel: 2,
    expectedLabel: 'Mahnung',
  },
  {
    name: 'Maximum erreicht: keine weitere Aktion',
    currentLevel: 2,
    daysOverdue: 60,
    expectedNextLevel: null,
    expectedLabel: 'Mahnung',
  },
  {
    name: 'Genau 14 Tage: noch keine Erinnerung',
    currentLevel: 0,
    daysOverdue: 14,
    expectedNextLevel: 1,
    expectedLabel: 'Keine',
  },
  {
    name: 'Genau 30 Tage: noch keine Mahnung',
    currentLevel: 1,
    daysOverdue: 30,
    expectedNextLevel: 2,
    expectedLabel: 'Zahlungserinnerung',
  },
];

function runTests(): { passed: number; failed: number; results: string[] } {
  let passed = 0;
  let failed = 0;
  const results: string[] = [];

  results.push('--- ABGB §1333 Verzugszinsen ---');
  for (const testCase of interestTestCases) {
    const interest = calculateInterest(
      testCase.principal,
      testCase.daysOverdue,
      testCase.annualRate
    );
    if (Math.abs(interest - testCase.expected) < 0.01) {
      passed++;
      results.push(`✓ ${testCase.name}`);
    } else {
      failed++;
      results.push(`✗ ${testCase.name}`);
      results.push(`  Kapital: ${testCase.principal}€, Tage: ${testCase.daysOverdue}, Satz: ${testCase.annualRate}%`);
      results.push(`  Erwartet: ${testCase.expected}€, Erhalten: ${interest}€`);
    }
  }

  results.push('');
  results.push('--- Mahnstufen-Eskalation ---');
  for (const testCase of dunningLevelTestCases) {
    const calculatedLevel = getDunningLevel(testCase.daysOverdue);
    const label = getDunningStatusLabel(calculatedLevel);
    const nextAction = getNextDunningAction(testCase.currentLevel);
    
    const labelMatch = label === testCase.expectedLabel;
    const nextMatch = testCase.expectedNextLevel === null 
      ? nextAction === null 
      : nextAction?.level === testCase.expectedNextLevel;
    
    if (labelMatch && nextMatch) {
      passed++;
      results.push(`✓ ${testCase.name}`);
    } else {
      failed++;
      results.push(`✗ ${testCase.name}`);
      if (!labelMatch) {
        results.push(`  Label: erwartet '${testCase.expectedLabel}', erhalten '${label}'`);
      }
      if (!nextMatch) {
        results.push(`  Nächste Stufe: erwartet ${testCase.expectedNextLevel}, erhalten ${nextAction?.level ?? 'null'}`);
      }
    }
  }

  return { passed, failed, results };
}

export { 
  runTests, 
  calculateInterest, 
  getDunningLevel, 
  getDunningStatusLabel, 
  getNextDunningAction 
};
