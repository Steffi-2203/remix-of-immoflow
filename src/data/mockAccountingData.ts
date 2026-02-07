import type { JournalEntry, JournalEntryLine, AccountBalance } from '@/hooks/useJournalEntries';
import type { ChartAccount } from '@/hooks/useChartOfAccounts';

// ============ Mock Kontenplan (Österr. HV-Einheitskontenrahmen) ============
export const mockChartOfAccounts: ChartAccount[] = [
  // Klasse 0 – Anlagevermögen
  { id: 'acc-0100', organization_id: null, account_number: '0100', name: 'Grundstücke', account_type: 'asset', parent_id: null, is_system: true, is_active: true, description: 'Grundstücke und grundstücksgleiche Rechte', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-0200', organization_id: null, account_number: '0200', name: 'Gebäude', account_type: 'asset', parent_id: null, is_system: true, is_active: true, description: 'Gebäude auf eigenen Grundstücken', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-0500', organization_id: null, account_number: '0500', name: 'Betriebs- und Geschäftsausstattung', account_type: 'asset', parent_id: null, is_system: true, is_active: true, description: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-0700', organization_id: null, account_number: '0700', name: 'Kumulierte Abschreibungen', account_type: 'asset', parent_id: null, is_system: true, is_active: true, description: 'Wertberichtigungen Anlagevermögen', created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Klasse 2 – Umlaufvermögen / Aktive RA
  { id: 'acc-2000', organization_id: null, account_number: '2000', name: 'Mietforderungen', account_type: 'asset', parent_id: null, is_system: true, is_active: true, description: 'Offene Mietforderungen', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-2500', organization_id: null, account_number: '2500', name: 'Vorsteuer', account_type: 'asset', parent_id: null, is_system: true, is_active: true, description: 'Vorsteuer aus Eingangsrechnungen', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-2700', organization_id: null, account_number: '2700', name: 'Bankkonto', account_type: 'asset', parent_id: null, is_system: true, is_active: true, description: 'Hausverwaltungskonto', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-2800', organization_id: null, account_number: '2800', name: 'Kassa', account_type: 'asset', parent_id: null, is_system: true, is_active: true, description: 'Bargeldkasse', created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Klasse 3 – Verbindlichkeiten
  { id: 'acc-3300', organization_id: null, account_number: '3300', name: 'Verbindlichkeiten Lieferanten', account_type: 'liability', parent_id: null, is_system: true, is_active: true, description: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-3400', organization_id: null, account_number: '3400', name: 'Kautionen Mieter', account_type: 'liability', parent_id: null, is_system: true, is_active: true, description: 'Erhaltene Mietkautionen', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-3500', organization_id: null, account_number: '3500', name: 'BK-Guthaben Mieter', account_type: 'liability', parent_id: null, is_system: true, is_active: true, description: 'Überzahlungen aus BK-Abrechnung', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-3540', organization_id: null, account_number: '3540', name: 'USt-Zahllast', account_type: 'liability', parent_id: null, is_system: true, is_active: true, description: 'Umsatzsteuerschuld ans Finanzamt', created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Klasse 4 – Erträge
  { id: 'acc-4000', organization_id: null, account_number: '4000', name: 'Mieterlöse Wohnung', account_type: 'income', parent_id: null, is_system: true, is_active: true, description: 'Grundmiete Wohnungen (10% USt)', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-4100', organization_id: null, account_number: '4100', name: 'BK-Erlöse', account_type: 'income', parent_id: null, is_system: true, is_active: true, description: 'Betriebskostenvorschüsse (10% USt)', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-4200', organization_id: null, account_number: '4200', name: 'HK-Erlöse', account_type: 'income', parent_id: null, is_system: true, is_active: true, description: 'Heizungskostenvorschüsse (20% USt)', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-4300', organization_id: null, account_number: '4300', name: 'Mieterlöse Geschäft', account_type: 'income', parent_id: null, is_system: true, is_active: true, description: 'Geschäftsmieten (20% USt)', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-4400', organization_id: null, account_number: '4400', name: 'Garage/Stellplatz-Erlöse', account_type: 'income', parent_id: null, is_system: true, is_active: true, description: 'Garagenmieten (20% USt)', created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Klasse 5–7 – Aufwendungen
  { id: 'acc-5000', organization_id: null, account_number: '5000', name: 'Betriebskosten', account_type: 'expense', parent_id: null, is_system: true, is_active: true, description: 'Umlagefähige BK (Wasser, Müll, etc.)', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-5100', organization_id: null, account_number: '5100', name: 'Heizungskosten', account_type: 'expense', parent_id: null, is_system: true, is_active: true, description: 'Heizung & Warmwasser', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-5200', organization_id: null, account_number: '5200', name: 'Versicherungen', account_type: 'expense', parent_id: null, is_system: true, is_active: true, description: 'Gebäudeversicherung', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-5300', organization_id: null, account_number: '5300', name: 'Grundsteuer', account_type: 'expense', parent_id: null, is_system: true, is_active: true, description: null, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-6000', organization_id: null, account_number: '6000', name: 'Instandhaltung', account_type: 'expense', parent_id: null, is_system: true, is_active: true, description: 'Reparaturen & Instandhaltung', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-6100', organization_id: null, account_number: '6100', name: 'Hausbetreuung', account_type: 'expense', parent_id: null, is_system: true, is_active: true, description: 'Hausmeister/Reinigung', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-7000', organization_id: null, account_number: '7000', name: 'Verwaltungskosten', account_type: 'expense', parent_id: null, is_system: true, is_active: true, description: 'Honorare Hausverwaltung', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-7100', organization_id: null, account_number: '7100', name: 'AfA Gebäude', account_type: 'expense', parent_id: null, is_system: true, is_active: true, description: 'Lineare Abschreibung Gebäude', created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Klasse 9 – Eigenkapital
  { id: 'acc-9000', organization_id: null, account_number: '9000', name: 'Eigenkapital', account_type: 'equity', parent_id: null, is_system: true, is_active: true, description: 'Eigenkapital/Rücklage', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'acc-9800', organization_id: null, account_number: '9800', name: 'Instandhaltungsrücklage', account_type: 'equity', parent_id: null, is_system: true, is_active: true, description: 'Gem. MRG §31', created_at: '2024-01-01', updated_at: '2024-01-01' },
];

// ============ Mock Journal Entries (Jänner–Februar 2026) ============
let lineId = 0;
const lid = () => `demo-jl-${++lineId}`;

function makeLine(journalId: string, accountId: string, debit: number, credit: number, desc?: string): JournalEntryLine {
  const acc = mockChartOfAccounts.find(a => a.id === accountId)!;
  return {
    id: lid(),
    journal_entry_id: journalId,
    account_id: accountId,
    debit,
    credit,
    description: desc || null,
    created_at: '2026-01-01',
    account: acc ? { account_number: acc.account_number, name: acc.name, account_type: acc.account_type } : undefined,
  };
}

export const mockJournalEntries: JournalEntry[] = [
  // --- Jänner 2026: Vorschreibung Mozartstraße ---
  {
    id: 'demo-je-1', organization_id: 'demo-org', entry_date: '2026-01-01', booking_number: '2026-0001',
    description: 'Vorschreibung Jänner – Mozartstraße 15', property_id: 'demo-prop-1', unit_id: null, tenant_id: null,
    source_type: 'invoice', source_id: null, beleg_nummer: 'VS-2026-01-M15', beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-01-01', updated_at: '2026-01-01',
    properties: { name: 'Mozartstraße 15' }, tenants: null,
    journal_entry_lines: [
      makeLine('demo-je-1', 'acc-2000', 8425, 0, 'Mietforderungen brutto'),
      makeLine('demo-je-1', 'acc-4000', 0, 4680, 'Grundmiete Wohnungen netto'),
      makeLine('demo-je-1', 'acc-4300', 0, 2850, 'Grundmiete Geschäft netto'),
      makeLine('demo-je-1', 'acc-4100', 0, 685, 'BK-Vorschüsse netto'),
      makeLine('demo-je-1', 'acc-4200', 0, 455, 'HK-Vorschüsse netto'),
      makeLine('demo-je-1', 'acc-3540', 0, -245, 'USt 10% + 20%'),
    ],
  },
  // Mieteingang Erika Mustermann
  {
    id: 'demo-je-2', organization_id: 'demo-org', entry_date: '2026-01-05', booking_number: '2026-0002',
    description: 'Mieteingang Erika Mustermann – Top 2', property_id: 'demo-prop-1', unit_id: 'demo-unit-2', tenant_id: 'demo-tenant-2',
    source_type: 'payment', source_id: null, beleg_nummer: null, beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-01-05', updated_at: '2026-01-05',
    properties: { name: 'Mozartstraße 15' }, tenants: { first_name: 'Erika', last_name: 'Mustermann' },
    journal_entry_lines: [
      makeLine('demo-je-2', 'acc-2700', 1020, 0, 'Bankeingang'),
      makeLine('demo-je-2', 'acc-2000', 0, 1020, 'Forderung ausgeglichen'),
    ],
  },
  // Mieteingang Gastro GmbH
  {
    id: 'demo-je-3', organization_id: 'demo-org', entry_date: '2026-01-05', booking_number: '2026-0003',
    description: 'Mieteingang Muster Gastro GmbH – Top 1', property_id: 'demo-prop-1', unit_id: 'demo-unit-1', tenant_id: 'demo-tenant-1',
    source_type: 'payment', source_id: null, beleg_nummer: null, beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-01-05', updated_at: '2026-01-05',
    properties: { name: 'Mozartstraße 15' }, tenants: { first_name: 'Muster', last_name: 'Gastro GmbH' },
    journal_entry_lines: [
      makeLine('demo-je-3', 'acc-2700', 3550, 0, 'Bankeingang'),
      makeLine('demo-je-3', 'acc-2000', 0, 3550, 'Forderung ausgeglichen'),
    ],
  },
  // Betriebskostenausgabe – Versicherung
  {
    id: 'demo-je-4', organization_id: 'demo-org', entry_date: '2026-01-10', booking_number: '2026-0004',
    description: 'Gebäudeversicherung Q1/2026', property_id: 'demo-prop-1', unit_id: null, tenant_id: null,
    source_type: 'expense', source_id: null, beleg_nummer: 'RE-2026-V001', beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-01-10', updated_at: '2026-01-10',
    properties: { name: 'Mozartstraße 15' }, tenants: null,
    journal_entry_lines: [
      makeLine('demo-je-4', 'acc-5200', 1850, 0, 'Versicherung netto'),
      makeLine('demo-je-4', 'acc-2500', 370, 0, 'Vorsteuer 20%'),
      makeLine('demo-je-4', 'acc-2700', 0, 2220, 'Bankausgang'),
    ],
  },
  // Heizungsabrechnung
  {
    id: 'demo-je-5', organization_id: 'demo-org', entry_date: '2026-01-15', booking_number: '2026-0005',
    description: 'Fernwärme Wien Jänner 2026', property_id: 'demo-prop-1', unit_id: null, tenant_id: null,
    source_type: 'expense', source_id: null, beleg_nummer: 'FW-2026-01', beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-01-15', updated_at: '2026-01-15',
    properties: { name: 'Mozartstraße 15' }, tenants: null,
    journal_entry_lines: [
      makeLine('demo-je-5', 'acc-5100', 2180, 0, 'Heizkosten netto'),
      makeLine('demo-je-5', 'acc-2500', 436, 0, 'Vorsteuer 20%'),
      makeLine('demo-je-5', 'acc-2700', 0, 2616, 'Bankausgang'),
    ],
  },
  // Hausbetreuung
  {
    id: 'demo-je-6', organization_id: 'demo-org', entry_date: '2026-01-20', booking_number: '2026-0006',
    description: 'Hausbetreuung Reinigung & Winterdienst Jänner', property_id: 'demo-prop-1', unit_id: null, tenant_id: null,
    source_type: 'expense', source_id: null, beleg_nummer: 'HB-2026-01', beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-01-20', updated_at: '2026-01-20',
    properties: { name: 'Mozartstraße 15' }, tenants: null,
    journal_entry_lines: [
      makeLine('demo-je-6', 'acc-6100', 580, 0, 'Hausbetreuung netto'),
      makeLine('demo-je-6', 'acc-2500', 116, 0, 'Vorsteuer 20%'),
      makeLine('demo-je-6', 'acc-2700', 0, 696, 'Bankausgang'),
    ],
  },
  // Vorschreibung Hauptplatz 8 Graz
  {
    id: 'demo-je-7', organization_id: 'demo-org', entry_date: '2026-01-01', booking_number: '2026-0007',
    description: 'Vorschreibung Jänner – Hauptplatz 8', property_id: 'demo-prop-2', unit_id: null, tenant_id: null,
    source_type: 'invoice', source_id: null, beleg_nummer: 'VS-2026-01-H8', beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-01-01', updated_at: '2026-01-01',
    properties: { name: 'Hauptplatz 8' }, tenants: null,
    journal_entry_lines: [
      makeLine('demo-je-7', 'acc-2000', 12850, 0, 'Mietforderungen brutto'),
      makeLine('demo-je-7', 'acc-4000', 0, 5420, 'Grundmiete Wohnungen netto'),
      makeLine('demo-je-7', 'acc-4300', 0, 4950, 'Grundmiete Geschäft netto'),
      makeLine('demo-je-7', 'acc-4100', 0, 980, 'BK-Vorschüsse netto'),
      makeLine('demo-je-7', 'acc-4200', 0, 720, 'HK-Vorschüsse netto'),
      makeLine('demo-je-7', 'acc-4400', 0, 380, 'Garagen netto'),
      makeLine('demo-je-7', 'acc-3540', 0, 400, 'USt 10% + 20%'),
    ],
  },
  // Instandhaltung – Dacharbeiten
  {
    id: 'demo-je-8', organization_id: 'demo-org', entry_date: '2026-01-22', booking_number: '2026-0008',
    description: 'Dachreparatur nach Sturmschaden', property_id: 'demo-prop-2', unit_id: null, tenant_id: null,
    source_type: 'expense', source_id: null, beleg_nummer: 'RE-2026-D001', beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-01-22', updated_at: '2026-01-22',
    properties: { name: 'Hauptplatz 8' }, tenants: null,
    journal_entry_lines: [
      makeLine('demo-je-8', 'acc-6000', 4500, 0, 'Instandhaltung netto'),
      makeLine('demo-je-8', 'acc-2500', 900, 0, 'Vorsteuer 20%'),
      makeLine('demo-je-8', 'acc-2700', 0, 5400, 'Bankausgang'),
    ],
  },
  // Februar: Vorschreibung Mozartstraße
  {
    id: 'demo-je-9', organization_id: 'demo-org', entry_date: '2026-02-01', booking_number: '2026-0009',
    description: 'Vorschreibung Februar – Mozartstraße 15', property_id: 'demo-prop-1', unit_id: null, tenant_id: null,
    source_type: 'invoice', source_id: null, beleg_nummer: 'VS-2026-02-M15', beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-02-01', updated_at: '2026-02-01',
    properties: { name: 'Mozartstraße 15' }, tenants: null,
    journal_entry_lines: [
      makeLine('demo-je-9', 'acc-2000', 8425, 0, 'Mietforderungen brutto'),
      makeLine('demo-je-9', 'acc-4000', 0, 4680, 'Grundmiete Wohnungen netto'),
      makeLine('demo-je-9', 'acc-4300', 0, 2850, 'Grundmiete Geschäft netto'),
      makeLine('demo-je-9', 'acc-4100', 0, 685, 'BK-Vorschüsse netto'),
      makeLine('demo-je-9', 'acc-4200', 0, 455, 'HK-Vorschüsse netto'),
      makeLine('demo-je-9', 'acc-3540', 0, -245, 'USt 10% + 20%'),
    ],
  },
  // Verwaltungshonorar
  {
    id: 'demo-je-10', organization_id: 'demo-org', entry_date: '2026-02-01', booking_number: '2026-0010',
    description: 'Verwaltungshonorar Jänner 2026', property_id: null, unit_id: null, tenant_id: null,
    source_type: 'expense', source_id: null, beleg_nummer: 'VH-2026-01', beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-02-01', updated_at: '2026-02-01',
    properties: null, tenants: null,
    journal_entry_lines: [
      makeLine('demo-je-10', 'acc-7000', 1200, 0, 'Verwaltung netto'),
      makeLine('demo-je-10', 'acc-2500', 240, 0, 'Vorsteuer 20%'),
      makeLine('demo-je-10', 'acc-2700', 0, 1440, 'Bankausgang'),
    ],
  },
  // AfA-Buchung
  {
    id: 'demo-je-11', organization_id: 'demo-org', entry_date: '2026-01-31', booking_number: '2026-0011',
    description: 'AfA Gebäude Mozartstraße 15 – Jänner 2026', property_id: 'demo-prop-1', unit_id: null, tenant_id: null,
    source_type: 'manual', source_id: null, beleg_nummer: 'AFA-2026-01', beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-01-31', updated_at: '2026-01-31',
    properties: { name: 'Mozartstraße 15' }, tenants: null,
    journal_entry_lines: [
      makeLine('demo-je-11', 'acc-7100', 2375, 0, 'AfA Gebäude linear'),
      makeLine('demo-je-11', 'acc-0700', 0, 2375, 'Wertberichtigung'),
    ],
  },
  // Grundsteuer
  {
    id: 'demo-je-12', organization_id: 'demo-org', entry_date: '2026-02-05', booking_number: '2026-0012',
    description: 'Grundsteuer Q1/2026 – alle Liegenschaften', property_id: null, unit_id: null, tenant_id: null,
    source_type: 'expense', source_id: null, beleg_nummer: 'GS-2026-Q1', beleg_url: null,
    is_storno: false, storno_of: null, created_by: null, created_at: '2026-02-05', updated_at: '2026-02-05',
    properties: null, tenants: null,
    journal_entry_lines: [
      makeLine('demo-je-12', 'acc-5300', 1420, 0, 'Grundsteuer'),
      makeLine('demo-je-12', 'acc-2700', 0, 1420, 'Bankausgang'),
    ],
  },
];

// ============ Calculate Account Balances from Mock Journal Entries ============
export function calculateMockAccountBalances(startDate?: string, endDate?: string): AccountBalance[] {
  const map = new Map<string, AccountBalance>();

  for (const entry of mockJournalEntries) {
    if (startDate && entry.entry_date < startDate) continue;
    if (endDate && entry.entry_date > endDate) continue;

    for (const line of entry.journal_entry_lines || []) {
      const acc = line.account;
      if (!acc) continue;

      const existing = map.get(line.account_id);
      if (existing) {
        existing.total_debit += Number(line.debit);
        existing.total_credit += Number(line.credit);
        existing.balance = existing.total_debit - existing.total_credit;
      } else {
        map.set(line.account_id, {
          account_id: line.account_id,
          account_number: acc.account_number,
          account_name: acc.name,
          account_type: acc.account_type,
          total_debit: Number(line.debit),
          total_credit: Number(line.credit),
          balance: Number(line.debit) - Number(line.credit),
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.account_number.localeCompare(b.account_number));
}

// ============ Mock Fixed Assets ============
export interface DemoFixedAsset {
  id: string;
  name: string;
  description: string | null;
  asset_type: string;
  acquisition_date: string;
  acquisition_cost: number;
  residual_value: number;
  useful_life_years: number;
  depreciation_method: string;
  annual_depreciation: number | null;
  monthly_depreciation: number | null;
  is_active: boolean;
  sold_at: string | null;
  sold_amount: number | null;
  organization_id: string;
  property_id: string | null;
  notes: string | null;
  created_at: string;
}

export const mockFixedAssets: DemoFixedAsset[] = [
  {
    id: 'demo-fa-1', name: 'Gebäude Mozartstraße 15', description: 'Zinshaus Baujahr 1965, 12 Einheiten',
    asset_type: 'building', acquisition_date: '2015-06-01', acquisition_cost: 2850000, residual_value: 0,
    useful_life_years: 66.67, depreciation_method: 'linear',
    annual_depreciation: 42750, monthly_depreciation: 3562.5,
    is_active: true, sold_at: null, sold_amount: null,
    organization_id: 'demo-org', property_id: 'demo-prop-1',
    notes: 'AfA-Satz 1,5% gem. §16 EStG (Gebäude Wohnzwecke)', created_at: '2015-06-01',
  },
  {
    id: 'demo-fa-2', name: 'Gebäude Hauptplatz 8', description: 'Gemischt genutztes Gebäude, Baujahr 1988',
    asset_type: 'building', acquisition_date: '2018-03-15', acquisition_cost: 4200000, residual_value: 0,
    useful_life_years: 66.67, depreciation_method: 'linear',
    annual_depreciation: 63000, monthly_depreciation: 5250,
    is_active: true, sold_at: null, sold_amount: null,
    organization_id: 'demo-org', property_id: 'demo-prop-2',
    notes: 'AfA-Satz 1,5% gem. §16 EStG', created_at: '2018-03-15',
  },
  {
    id: 'demo-fa-3', name: 'Gebäude Linzer Gasse 42', description: 'Altbau Baujahr 1920, Vollanwendung MRG',
    asset_type: 'building', acquisition_date: '2020-01-10', acquisition_cost: 1950000, residual_value: 0,
    useful_life_years: 66.67, depreciation_method: 'linear',
    annual_depreciation: 29250, monthly_depreciation: 2437.5,
    is_active: true, sold_at: null, sold_amount: null,
    organization_id: 'demo-org', property_id: 'demo-prop-3',
    notes: 'AfA-Satz 1,5% gem. §16 EStG', created_at: '2020-01-10',
  },
  {
    id: 'demo-fa-4', name: 'Aufzugsanlage Mozartstraße', description: 'Modernisierung Personenaufzug',
    asset_type: 'equipment', acquisition_date: '2023-09-01', acquisition_cost: 85000, residual_value: 5000,
    useful_life_years: 15, depreciation_method: 'linear',
    annual_depreciation: 5333.33, monthly_depreciation: 444.44,
    is_active: true, sold_at: null, sold_amount: null,
    organization_id: 'demo-org', property_id: 'demo-prop-1',
    notes: 'Nutzungsdauer 15 Jahre gem. AfA-Tabelle', created_at: '2023-09-01',
  },
  {
    id: 'demo-fa-5', name: 'Firmenwagen (Hausbetreuung)', description: 'VW Caddy für Wartungsarbeiten',
    asset_type: 'vehicle', acquisition_date: '2024-01-15', acquisition_cost: 32000, residual_value: 5000,
    useful_life_years: 8, depreciation_method: 'linear',
    annual_depreciation: 3375, monthly_depreciation: 281.25,
    is_active: true, sold_at: null, sold_amount: null,
    organization_id: 'demo-org', property_id: null,
    notes: 'Nutzungsdauer 8 Jahre', created_at: '2024-01-15',
  },
  {
    id: 'demo-fa-6', name: 'Büroausstattung (veräußert)', description: 'Alte Büromöbel',
    asset_type: 'furniture', acquisition_date: '2019-03-01', acquisition_cost: 8500, residual_value: 500,
    useful_life_years: 10, depreciation_method: 'linear',
    annual_depreciation: 800, monthly_depreciation: 66.67,
    is_active: false, sold_at: '2025-06-30', sold_amount: 1200,
    organization_id: 'demo-org', property_id: null,
    notes: 'Veräußert am 30.06.2025', created_at: '2019-03-01',
  },
];
