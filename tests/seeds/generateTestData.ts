/**
 * Testdaten-Seed für ImmoflowMe
 * 
 * Generiert realistische Testdaten:
 * - 3 Liegenschaften (MRG-Mietwohnung, WEG, Gemischt)
 * - 50-200 Einheiten mit Mietern
 * - Ausgaben, Wasser-/Heizungszähler
 * - Zahlungen und Vorschreibungen
 * 
 * Verwendung: npx tsx tests/seeds/generateTestData.ts
 */

import { v4 as uuidv4 } from 'uuid';

// ── Deterministic UUID generator for reproducibility ──
let seedCounter = 0;
function deterministicId(prefix: string): string {
  seedCounter++;
  return `${prefix}-${String(seedCounter).padStart(6, '0')}`;
}

// ── Configuration ──
const SEED_CONFIG = {
  properties: [
    { name: 'Musterstraße 10', city: 'Wien', zip: '1010', type: 'mrg', unitCount: 22 },
    { name: 'Beispielgasse 5', city: 'Wien', zip: '1030', type: 'weg', unitCount: 48 },
    { name: 'Testweg 7-9', city: 'Graz', zip: '8010', type: 'mixed', unitCount: 80 },
    { name: 'Großanlage 1-4', city: 'Linz', zip: '4020', type: 'weg', unitCount: 50 },
  ],
  year: 2025,
};

// ── Generators ──

const FIRST_NAMES = ['Anna', 'Bernd', 'Clara', 'David', 'Eva', 'Franz', 'Gabi', 'Hans', 'Ines', 'Jan', 'Katrin', 'Lukas', 'Maria', 'Norbert', 'Olga', 'Peter', 'Renate', 'Stefan', 'Tanja', 'Uwe'];
const LAST_NAMES = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Braun', 'Zimmermann'];
const UNIT_TYPES = ['wohnung', 'wohnung', 'wohnung', 'geschaeft', 'garage', 'stellplatz'];

function randomElement<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

function randomFlaeche(type: string): number {
  if (type === 'garage') return 15 + (seedCounter % 10);
  if (type === 'stellplatz') return 10 + (seedCounter % 5);
  if (type === 'geschaeft') return 60 + (seedCounter % 120);
  return 35 + (seedCounter % 85); // 35-120 qm
}

function randomRent(flaeche: number, type: string): number {
  const perQm = type === 'geschaeft' ? 12 + (seedCounter % 8) : 7 + (seedCounter % 5);
  return Math.round(flaeche * perQm * 100) / 100;
}

// ── BK Categories ──

const BK_CATEGORIES = [
  { category: 'versicherung', perUnit: 200, label: 'Gebäudeversicherung' },
  { category: 'wasser', perUnit: 180, label: 'Wasser/Abwasser' },
  { category: 'muell', perUnit: 120, label: 'Müllabfuhr' },
  { category: 'hausbetreuung', perUnit: 150, label: 'Hausbetreuung' },
  { category: 'strom_allgemein', perUnit: 50, label: 'Allgemeinstrom' },
  { category: 'lift', perUnit: 100, label: 'Aufzugswartung' },
  { category: 'rauchfangkehrer', perUnit: 30, label: 'Rauchfangkehrer' },
  { category: 'schädlingsbekämpfung', perUnit: 15, label: 'Schädlingsbekämpfung' },
];

// ── Data Generation ──

export interface SeedData {
  properties: any[];
  units: any[];
  tenants: any[];
  expenses: any[];
  waterReadings: any[];
  heatingReadings: any[];
  monthlyInvoices: any[];
  payments: any[];
  summary: {
    totalProperties: number;
    totalUnits: number;
    totalTenants: number;
    totalExpenses: number;
    totalInvoices: number;
    totalPayments: number;
  };
}

export function generateTestData(): SeedData {
  seedCounter = 0;
  const orgId = deterministicId('org');

  const properties: any[] = [];
  const allUnits: any[] = [];
  const allTenants: any[] = [];
  const allExpenses: any[] = [];
  const allWaterReadings: any[] = [];
  const allHeatingReadings: any[] = [];
  const allInvoices: any[] = [];
  const allPayments: any[] = [];

  for (const propConfig of SEED_CONFIG.properties) {
    const propertyId = deterministicId('prop');
    properties.push({
      id: propertyId,
      organization_id: orgId,
      name: propConfig.name,
      address: propConfig.name,
      city: propConfig.city,
      postal_code: propConfig.zip,
      management_type: propConfig.type,
      unit_count: propConfig.unitCount,
    });

    // Generate units
    for (let u = 0; u < propConfig.unitCount; u++) {
      const unitId = deterministicId('unit');
      const unitType = randomElement(UNIT_TYPES, u);
      const flaeche = randomFlaeche(unitType);
      const mea = Math.round(flaeche * (1 + (u % 3) * 0.1)); // MEA slightly varies from qm
      const topNummer = unitType === 'stellplatz' ? `SP${u + 1}` : unitType === 'garage' ? `G${u + 1}` : `Top ${u + 1}`;

      allUnits.push({
        id: unitId,
        property_id: propertyId,
        top_nummer: topNummer,
        type: unitType,
        flaeche,
        mea,
        stock: unitType === 'garage' ? -1 : Math.floor(u / 4),
        zimmer: unitType === 'wohnung' ? 1 + (u % 4) : null,
        status: u % 15 === 0 ? 'leer' : 'vermietet',
      });

      // Generate tenant for occupied units
      if (u % 15 !== 0) { // ~93% occupied
        const tenantId = deterministicId('tenant');
        const firstName = randomElement(FIRST_NAMES, u);
        const lastName = randomElement(LAST_NAMES, u + 7);
        const grundmiete = randomRent(flaeche, unitType);
        const bkVorschuss = Math.round(flaeche * 2.5 * 100) / 100;
        const hkVorschuss = unitType === 'garage' ? 0 : Math.round(flaeche * 1.2 * 100) / 100;

        allTenants.push({
          id: tenantId,
          unit_id: unitId,
          first_name: firstName,
          last_name: lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
          phone: `+43 ${660 + (u % 40)} ${1000000 + u * 1234}`,
          grundmiete,
          betriebskosten_vorschuss: bkVorschuss,
          heizkosten_vorschuss: hkVorschuss,
          status: 'aktiv',
          vertragsbeginn: `${2020 + (u % 5)}-0${1 + (u % 9)}-01`,
          kaution: Math.round(grundmiete * 3 * 100) / 100,
        });

        // Generate monthly invoices for 2025
        for (let m = 1; m <= 12; m++) {
          const invId = deterministicId('inv');
          const gesamt = Math.round((grundmiete + bkVorschuss + hkVorschuss) * 100) / 100;
          const isPaid = m <= 10; // Oct paid, Nov/Dec open
          const isLate = u % 8 === 0 && m === 10; // some late payments

          allInvoices.push({
            id: invId,
            tenant_id: tenantId,
            unit_id: unitId,
            year: SEED_CONFIG.year,
            month: m,
            grundmiete,
            betriebskosten: bkVorschuss,
            heizungskosten: hkVorschuss,
            gesamtbetrag: gesamt,
            status: isPaid ? 'bezahlt' : isLate ? 'ueberfaellig' : 'offen',
            faellig_am: `${SEED_CONFIG.year}-${String(m).padStart(2, '0')}-05`,
          });

          // Generate payment for paid invoices
          if (isPaid && !isLate) {
            allPayments.push({
              id: deterministicId('pay'),
              tenant_id: tenantId,
              invoice_id: invId,
              betrag: gesamt,
              buchungs_datum: `${SEED_CONFIG.year}-${String(m).padStart(2, '0')}-0${3 + (u % 5)}`,
              payment_type: 'ueberweisung',
              verwendungszweck: `Miete ${String(m).padStart(2, '0')}/${SEED_CONFIG.year} ${firstName} ${lastName}`,
            });
          }
        }

        // Water readings (quarterly)
        if (unitType !== 'garage' && unitType !== 'stellplatz') {
          for (const quarter of [3, 6, 9, 12]) {
            allWaterReadings.push({
              id: deterministicId('wr'),
              unit_id: unitId,
              property_id: propertyId,
              reading_date: `${SEED_CONFIG.year}-${String(quarter).padStart(2, '0')}-28`,
              consumption: 8 + (u % 15), // m³
              coefficient: unitType === 'geschaeft' ? 1.2 : 1.0,
              reading_type: 'cold',
            });
          }
        }

        // Heating readings (annual)
        if (unitType !== 'garage' && unitType !== 'stellplatz') {
          allHeatingReadings.push({
            id: deterministicId('hr'),
            unit_id: unitId,
            property_id: propertyId,
            period_from: `${SEED_CONFIG.year}-01-01`,
            period_to: `${SEED_CONFIG.year}-12-31`,
            consumption: 800 + flaeche * 10 + (u % 200),
            consumption_unit: 'kWh',
            cost_share: Math.round((800 + flaeche * 10) * 0.08 * 100) / 100,
            source: 'ista',
          });
        }
      }
    }

    // Generate property-level expenses
    for (const bk of BK_CATEGORIES) {
      for (let m = 1; m <= 12; m++) {
        allExpenses.push({
          id: deterministicId('exp'),
          property_id: propertyId,
          year: SEED_CONFIG.year,
          month: m,
          category: bk.category,
          bezeichnung: `${bk.label} ${String(m).padStart(2, '0')}/${SEED_CONFIG.year}`,
          betrag: Math.round(bk.perUnit * propConfig.unitCount / 12 * 100) / 100,
          ist_umlagefaehig: true,
          datum: `${SEED_CONFIG.year}-${String(m).padStart(2, '0')}-15`,
          expense_type: 'betriebskosten',
        });
      }
    }

    // Non-allocable expenses (Instandhaltung)
    allExpenses.push({
      id: deterministicId('exp'),
      property_id: propertyId,
      year: SEED_CONFIG.year,
      month: 6,
      category: 'instandhaltung',
      bezeichnung: `Fassadenreparatur ${propConfig.name}`,
      betrag: 5000 + (properties.length * 2000),
      ist_umlagefaehig: false,
      datum: `${SEED_CONFIG.year}-06-20`,
      expense_type: 'instandhaltung',
    });
  }

  return {
    properties,
    units: allUnits,
    tenants: allTenants,
    expenses: allExpenses,
    waterReadings: allWaterReadings,
    heatingReadings: allHeatingReadings,
    monthlyInvoices: allInvoices,
    payments: allPayments,
    summary: {
      totalProperties: properties.length,
      totalUnits: allUnits.length,
      totalTenants: allTenants.length,
      totalExpenses: allExpenses.length,
      totalInvoices: allInvoices.length,
      totalPayments: allPayments.length,
    },
  };
}

// ── CLI Entry Point ──
if (typeof process !== 'undefined' && process.argv[1]?.includes('generateTestData')) {
  const data = generateTestData();
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║  ImmoflowMe – Test Data Summary           ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`  Liegenschaften:  ${data.summary.totalProperties}`);
  console.log(`  Einheiten:       ${data.summary.totalUnits}`);
  console.log(`  Mieter:          ${data.summary.totalTenants}`);
  console.log(`  Ausgaben:        ${data.summary.totalExpenses}`);
  console.log(`  Vorschreibungen: ${data.summary.totalInvoices}`);
  console.log(`  Zahlungen:       ${data.summary.totalPayments}`);
  console.log(`  Wasserzähler:    ${data.waterReadings.length}`);
  console.log(`  Heizungsabl.:    ${data.heatingReadings.length}`);
  console.log('\n✓ Seed-Daten generiert (in-memory)');
  console.log('  → Für DB-Import: JSON.stringify(generateTestData())');
}
