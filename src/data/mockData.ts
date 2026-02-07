import { Property, Unit, Tenant, DistributionKey, DashboardStats } from '@/types';

// ============ Demo Data Types ============
export interface DemoProperty {
  id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  building_year: number | null;
  total_units: number;
  total_qm: number;
  total_mea: number;
  bk_anteil_wohnung: number;
  bk_anteil_geschaeft: number;
  bk_anteil_garage: number;
  heizung_anteil_wohnung: number;
  heizung_anteil_geschaeft: number;
  betriebskosten_gesamt: number;
  heizungskosten_gesamt: number;
  baubewilligung_nach_1945: boolean | null;
  baubewilligung_nach_1953: boolean | null;
  baujahr_mrg: number | null;
  foerderung_erhalten: boolean | null;
  richtwert_bundesland: string | null;
  stichtag_mrg: string | null;
  marktwert: number | null;
  management_type: 'mrg' | 'weg' | 'gemischt';
  created_at: string;
  updated_at: string;
}

export interface DemoUnit {
  id: string;
  property_id: string;
  top_nummer: string;
  type: 'wohnung' | 'geschaeft' | 'garage' | 'lager' | 'sonstige';
  floor: number | null;
  qm: number;
  mea: number;
  status: 'aktiv' | 'leerstand' | 'eigennutzung';
  ausstattungskategorie?: string | null;
  mrg_scope?: string | null;
  nutzflaeche_mrg?: number | null;
  richtwertmiete_basis?: number | null;
  [key: string]: any;
  created_at: string;
  updated_at: string;
  properties?: { name: string };
  tenants?: DemoTenant[];
}

export interface DemoTenant {
  id: string;
  unit_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mietbeginn: string;
  mietende: string | null;
  kaution: number | null;
  kaution_bezahlt: boolean;
  grundmiete: number;
  betriebskosten_vorschuss: number;
  heizungskosten_vorschuss: number;
  vorschuss_gueltig_ab: string | null;
  sepa_mandat: boolean;
  iban: string | null;
  bic: string | null;
  mandat_reference: string | null;
  status: 'aktiv' | 'beendet' | 'gekuendigt' | 'leerstand';
  created_at: string;
  updated_at: string;
  units?: DemoUnit & { properties?: { name: string } };
}

export interface DemoTransaction {
  id: string;
  bank_account_id: string | null;
  transaction_date: string;
  valuta_date: string | null;
  amount: number;
  currency: string;
  description: string;
  counterparty_name: string | null;
  counterparty_iban: string | null;
  reference: string | null;
  status: 'unmatched' | 'matched' | 'ignored';
  property_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  category_id: string | null;
  matched_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoExpense {
  id: string;
  property_id: string;
  category: 'betriebskosten_umlagefaehig' | 'instandhaltung' | 'sonstige_kosten';
  expense_type: string;
  bezeichnung: string;
  betrag: number;
  datum: string;
  beleg_nummer: string | null;
  beleg_url: string | null;
  notizen: string | null;
  year: number;
  month: number;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
  properties?: { name: string };
}

export interface DemoPayment {
  id: string;
  tenant_id: string;
  invoice_id: string | null;
  betrag: number;
  eingangs_datum: string;
  buchungs_datum: string;
  zahlungsart: 'ueberweisung' | 'lastschrift' | 'bar' | 'sonstige';
  referenz: string | null;
  created_at: string;
  tenants?: { first_name: string; last_name: string; unit_id: string; units?: { top_nummer: string; property_id: string; properties?: { name: string } } };
}

export interface DemoBankAccount {
  id: string;
  account_name: string;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  opening_balance: number | null;
  opening_balance_date: string | null;
  current_balance: number | null;
  property_id: string | null;
  organization_id: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemoMaintenanceTask {
  id: string;
  organization_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  title: string;
  description: string | null;
  category: 'repair' | 'maintenance' | 'inspection' | 'emergency' | 'other' | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'pending_approval' | 'completed' | 'cancelled';
  assigned_to: string | null;
  contractor_name: string | null;
  contractor_contact: string | null;
  due_date: string | null;
  completed_at: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  properties?: { name: string } | null;
  units?: { top_nummer: string } | null;
}

// ============ Verteilerschlüssel ============
export const distributionKeys: DistributionKey[] = [
  { id: 'qm', name: 'Quadratmeter', unit: 'm²', description: 'Nutzfläche in Quadratmeter' },
  { id: 'mea', name: 'Miteigentumsanteile', unit: '‰', description: 'Anteile in Promille' },
  { id: 'personen', name: 'Personenanzahl', unit: 'Pers.', description: 'Anzahl der Bewohner' },
  { id: 'heizung_verbrauch', name: 'Heizungsverbrauch', unit: 'kWh', description: 'Tatsächlicher Heizverbrauch' },
  { id: 'wasser_verbrauch', name: 'Wasserverbrauch', unit: 'm³', description: 'Tatsächlicher Wasserverbrauch' },
  { id: 'lift_wohnung', name: 'Lift Wohnung', unit: 'Anteil', description: 'Liftkosten für Wohnungen' },
  { id: 'lift_geschaeft', name: 'Lift Geschäft', unit: 'Anteil', description: 'Liftkosten für Geschäfte' },
  { id: 'muell', name: 'Müllentsorgung', unit: 'Anteil', description: 'Müllgebühren-Anteil' },
  { id: 'strom_allgemein', name: 'Allgemeinstrom', unit: 'Anteil', description: 'Stromkosten Allgemeinbereich' },
  { id: 'versicherung', name: 'Versicherung', unit: 'Anteil', description: 'Gebäudeversicherung' },
  { id: 'hausbetreuung', name: 'Hausbetreuung', unit: 'Anteil', description: 'Hausbetreuungskosten' },
  { id: 'garten', name: 'Gartenpflege', unit: 'Anteil', description: 'Gartenpflegekosten' },
  { id: 'schneeraeumung', name: 'Schneeräumung', unit: 'Anteil', description: 'Winterdienstkosten' },
  { id: 'kanal', name: 'Kanalgebühren', unit: 'Anteil', description: 'Kanalgebühren' },
  { id: 'grundsteuer', name: 'Grundsteuer', unit: 'Anteil', description: 'Grundsteuer-Anteil' },
  { id: 'verwaltung', name: 'Verwaltungskosten', unit: 'Anteil', description: 'Verwalterhonorare' },
  { id: 'ruecklage', name: 'Rücklage', unit: 'Anteil', description: 'Instandhaltungsrücklage' },
  { id: 'sonstiges_1', name: 'Sonstiges 1', unit: 'Anteil', description: 'Frei definierbar' },
  { id: 'sonstiges_2', name: 'Sonstiges 2', unit: 'Anteil', description: 'Frei definierbar' },
  { id: 'sonstiges_3', name: 'Sonstiges 3', unit: 'Anteil', description: 'Frei definierbar' },
];

// ============ Mock Properties ============
export const mockProperties: DemoProperty[] = [
  {
    id: 'demo-prop-1',
    name: 'Mozartstraße 15',
    address: 'Mozartstraße 15',
    city: 'Wien',
    postal_code: '1040',
    country: 'Österreich',
    building_year: 1965,
    total_units: 12,
    total_qm: 985.5,
    total_mea: 1000,
    bk_anteil_wohnung: 10,
    bk_anteil_geschaeft: 20,
    bk_anteil_garage: 20,
    heizung_anteil_wohnung: 20,
    heizung_anteil_geschaeft: 20,
    betriebskosten_gesamt: 24500,
    heizungskosten_gesamt: 18200,
    baubewilligung_nach_1945: true,
    baubewilligung_nach_1953: true,
    baujahr_mrg: 1965,
    foerderung_erhalten: false,
    richtwert_bundesland: 'Wien',
    stichtag_mrg: null,
    marktwert: 2850000,
    management_type: 'mrg',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
  },
  {
    id: 'demo-prop-2',
    name: 'Hauptplatz 8',
    address: 'Hauptplatz 8',
    city: 'Graz',
    postal_code: '8010',
    country: 'Österreich',
    building_year: 1988,
    total_units: 18,
    total_qm: 1450.0,
    total_mea: 1000,
    bk_anteil_wohnung: 10,
    bk_anteil_geschaeft: 20,
    bk_anteil_garage: 20,
    heizung_anteil_wohnung: 20,
    heizung_anteil_geschaeft: 20,
    betriebskosten_gesamt: 38200,
    heizungskosten_gesamt: 28500,
    baubewilligung_nach_1945: true,
    baubewilligung_nach_1953: true,
    baujahr_mrg: 1988,
    foerderung_erhalten: false,
    richtwert_bundesland: 'Steiermark',
    stichtag_mrg: null,
    marktwert: 4200000,
    management_type: 'weg',
    created_at: '2022-06-10T09:00:00Z',
    updated_at: '2024-12-01T11:00:00Z',
  },
  {
    id: 'demo-prop-3',
    name: 'Linzer Gasse 42',
    address: 'Linzer Gasse 42',
    city: 'Salzburg',
    postal_code: '5020',
    country: 'Österreich',
    building_year: 1920,
    total_units: 8,
    total_qm: 620.0,
    total_mea: 1000,
    bk_anteil_wohnung: 10,
    bk_anteil_geschaeft: 20,
    bk_anteil_garage: 20,
    heizung_anteil_wohnung: 20,
    heizung_anteil_geschaeft: 20,
    betriebskosten_gesamt: 15800,
    heizungskosten_gesamt: 12400,
    baubewilligung_nach_1945: false,
    baubewilligung_nach_1953: false,
    baujahr_mrg: 1920,
    foerderung_erhalten: false,
    richtwert_bundesland: 'Salzburg',
    stichtag_mrg: null,
    marktwert: 1950000,
    management_type: 'mrg',
    created_at: '2021-03-22T08:00:00Z',
    updated_at: '2024-10-15T16:00:00Z',
  },
];

// ============ Mock Units ============
// Prop 1 (Wien): 8 Einheiten – 1 Geschäft, 5 Wohnungen, 2 Garagen
// Prop 2 (Graz): 8 Einheiten – 2 Geschäfte, 4 Wohnungen, 1 Lager, 1 Garage
// Prop 3 (Salzburg): 6 Einheiten – 1 Geschäft, 4 Wohnungen, 1 Garage
export const mockUnits: DemoUnit[] = [
  // === Mozartstraße 15 (Wien) ===
  {
    id: 'demo-unit-1', property_id: 'demo-prop-1', top_nummer: 'Top 1', type: 'geschaeft',
    floor: 0, qm: 120.5, mea: 122, status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z', updated_at: '2024-11-20T14:30:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-2', property_id: 'demo-prop-1', top_nummer: 'Top 2', type: 'wohnung',
    floor: 1, qm: 78.0, mea: 79, status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z', updated_at: '2024-11-20T14:30:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-3', property_id: 'demo-prop-1', top_nummer: 'Top 3', type: 'wohnung',
    floor: 1, qm: 65.5, mea: 66, status: 'leerstand',
    created_at: '2023-01-15T10:00:00Z', updated_at: '2024-12-20T09:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-4', property_id: 'demo-prop-1', top_nummer: 'Top 4', type: 'wohnung',
    floor: 2, qm: 92.0, mea: 93, status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z', updated_at: '2024-11-20T14:30:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-5', property_id: 'demo-prop-1', top_nummer: 'Garage 1', type: 'garage',
    floor: -1, qm: 15.0, mea: 15, status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z', updated_at: '2024-11-20T14:30:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-6', property_id: 'demo-prop-1', top_nummer: 'Top 5', type: 'wohnung',
    floor: 2, qm: 55.0, mea: 56, status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z', updated_at: '2024-11-20T14:30:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-7', property_id: 'demo-prop-1', top_nummer: 'Top 6', type: 'wohnung',
    floor: 3, qm: 105.0, mea: 107, status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z', updated_at: '2025-01-10T09:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-8', property_id: 'demo-prop-1', top_nummer: 'Garage 2', type: 'garage',
    floor: -1, qm: 15.0, mea: 15, status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z', updated_at: '2024-11-20T14:30:00Z',
    properties: { name: 'Mozartstraße 15' },
  },

  // === Hauptplatz 8 (Graz) ===
  {
    id: 'demo-unit-g1', property_id: 'demo-prop-2', top_nummer: 'Top 1', type: 'geschaeft',
    floor: 0, qm: 185.0, mea: 128, status: 'aktiv',
    created_at: '2022-06-10T09:00:00Z', updated_at: '2024-12-01T11:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-unit-g2', property_id: 'demo-prop-2', top_nummer: 'Top 2', type: 'geschaeft',
    floor: 0, qm: 95.0, mea: 65, status: 'aktiv',
    created_at: '2022-06-10T09:00:00Z', updated_at: '2024-12-01T11:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-unit-g3', property_id: 'demo-prop-2', top_nummer: 'Top 3', type: 'wohnung',
    floor: 1, qm: 88.0, mea: 61, status: 'aktiv',
    created_at: '2022-06-10T09:00:00Z', updated_at: '2024-12-01T11:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-unit-g4', property_id: 'demo-prop-2', top_nummer: 'Top 4', type: 'wohnung',
    floor: 1, qm: 72.5, mea: 50, status: 'aktiv',
    created_at: '2022-06-10T09:00:00Z', updated_at: '2024-12-01T11:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-unit-g5', property_id: 'demo-prop-2', top_nummer: 'Top 5', type: 'wohnung',
    floor: 2, qm: 110.0, mea: 76, status: 'aktiv',
    created_at: '2022-06-10T09:00:00Z', updated_at: '2024-12-01T11:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-unit-g6', property_id: 'demo-prop-2', top_nummer: 'Top 6', type: 'wohnung',
    floor: 2, qm: 62.0, mea: 43, status: 'leerstand',
    created_at: '2022-06-10T09:00:00Z', updated_at: '2025-01-05T10:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-unit-g7', property_id: 'demo-prop-2', top_nummer: 'Lager UG', type: 'lager',
    floor: -1, qm: 45.0, mea: 31, status: 'aktiv',
    created_at: '2022-06-10T09:00:00Z', updated_at: '2024-12-01T11:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-unit-g8', property_id: 'demo-prop-2', top_nummer: 'Garage 1', type: 'garage',
    floor: -1, qm: 18.0, mea: 12, status: 'aktiv',
    created_at: '2022-06-10T09:00:00Z', updated_at: '2024-12-01T11:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },

  // === Linzer Gasse 42 (Salzburg) ===
  {
    id: 'demo-unit-s1', property_id: 'demo-prop-3', top_nummer: 'Top 1', type: 'geschaeft',
    floor: 0, qm: 110.0, mea: 177, status: 'aktiv',
    created_at: '2021-03-22T08:00:00Z', updated_at: '2024-10-15T16:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
  {
    id: 'demo-unit-s2', property_id: 'demo-prop-3', top_nummer: 'Top 2', type: 'wohnung',
    floor: 1, qm: 58.0, mea: 94, status: 'aktiv',
    created_at: '2021-03-22T08:00:00Z', updated_at: '2024-10-15T16:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
  {
    id: 'demo-unit-s3', property_id: 'demo-prop-3', top_nummer: 'Top 3', type: 'wohnung',
    floor: 1, qm: 62.0, mea: 100, status: 'aktiv',
    created_at: '2021-03-22T08:00:00Z', updated_at: '2024-10-15T16:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
  {
    id: 'demo-unit-s4', property_id: 'demo-prop-3', top_nummer: 'Top 4', type: 'wohnung',
    floor: 2, qm: 75.0, mea: 121, status: 'aktiv',
    created_at: '2021-03-22T08:00:00Z', updated_at: '2024-10-15T16:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
  {
    id: 'demo-unit-s5', property_id: 'demo-prop-3', top_nummer: 'Top 5', type: 'wohnung',
    floor: 2, qm: 48.0, mea: 77, status: 'aktiv',
    created_at: '2021-03-22T08:00:00Z', updated_at: '2024-10-15T16:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
  {
    id: 'demo-unit-s6', property_id: 'demo-prop-3', top_nummer: 'Garage 1', type: 'garage',
    floor: -1, qm: 14.0, mea: 23, status: 'aktiv',
    created_at: '2021-03-22T08:00:00Z', updated_at: '2024-10-15T16:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
];

// ============ Mock Tenants ============
export const mockTenants: DemoTenant[] = [
  // === Mozartstraße 15 (Wien) ===
  {
    id: 'demo-tenant-1', unit_id: 'demo-unit-1',
    first_name: 'Muster', last_name: 'Gastro GmbH',
    email: 'demo-gastro@beispiel.at', phone: '+43 1 000 0001',
    mietbeginn: '2020-03-01', mietende: null,
    kaution: 7500, kaution_bezahlt: true,
    grundmiete: 2850, betriebskosten_vorschuss: 420, heizungskosten_vorschuss: 280,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0001', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-001',
    status: 'aktiv',
    created_at: '2020-02-15T10:00:00Z', updated_at: '2024-11-20T14:30:00Z',
  },
  {
    id: 'demo-tenant-2', unit_id: 'demo-unit-2',
    first_name: 'Erika', last_name: 'Mustermann',
    email: 'erika.mustermann@beispiel.at', phone: '+43 664 000 0002',
    mietbeginn: '2021-07-01', mietende: null,
    kaution: 2340, kaution_bezahlt: true,
    grundmiete: 780, betriebskosten_vorschuss: 145, heizungskosten_vorschuss: 95,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0002', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-002',
    status: 'aktiv',
    created_at: '2021-06-15T09:00:00Z', updated_at: '2024-11-20T14:30:00Z',
  },
  // Beendeter Mieter – Top 3 (Leerstand nach Mieterwechsel)
  {
    id: 'demo-tenant-ex1', unit_id: 'demo-unit-3',
    first_name: 'Johann', last_name: 'Altmieter',
    email: 'j.altmieter@beispiel.at', phone: '+43 676 000 0099',
    mietbeginn: '2018-05-01', mietende: '2024-11-30',
    kaution: 1960, kaution_bezahlt: true,
    grundmiete: 650, betriebskosten_vorschuss: 120, heizungskosten_vorschuss: 80,
    vorschuss_gueltig_ab: null, sepa_mandat: false,
    iban: null, bic: null, mandat_reference: null,
    status: 'beendet',
    created_at: '2018-04-20T08:00:00Z', updated_at: '2024-12-01T10:00:00Z',
  },
  {
    id: 'demo-tenant-3', unit_id: 'demo-unit-4',
    first_name: 'Familie', last_name: 'Mustermann',
    email: 'familie.mustermann@beispiel.at', phone: '+43 699 000 0003',
    mietbeginn: '2019-01-01', mietende: null,
    kaution: 2760, kaution_bezahlt: true,
    grundmiete: 920, betriebskosten_vorschuss: 185, heizungskosten_vorschuss: 125,
    vorschuss_gueltig_ab: null, sepa_mandat: false,
    iban: null, bic: null, mandat_reference: null,
    status: 'aktiv',
    created_at: '2018-12-10T08:00:00Z', updated_at: '2024-11-20T14:30:00Z',
  },
  {
    id: 'demo-tenant-4', unit_id: 'demo-unit-5',
    first_name: 'Max', last_name: 'Mustermann',
    email: 'max.mustermann@beispiel.at', phone: null,
    mietbeginn: '2022-04-01', mietende: null,
    kaution: 450, kaution_bezahlt: true,
    grundmiete: 150, betriebskosten_vorschuss: 25, heizungskosten_vorschuss: 0,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0004', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-004',
    status: 'aktiv',
    created_at: '2022-03-20T11:00:00Z', updated_at: '2024-11-20T14:30:00Z',
  },
  {
    id: 'demo-tenant-5', unit_id: 'demo-unit-6',
    first_name: 'Sabine', last_name: 'Berger',
    email: 'sabine.berger@beispiel.at', phone: '+43 660 000 0005',
    mietbeginn: '2023-03-01', mietende: null,
    kaution: 1650, kaution_bezahlt: true,
    grundmiete: 550, betriebskosten_vorschuss: 105, heizungskosten_vorschuss: 70,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0005', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-005',
    status: 'aktiv',
    created_at: '2023-02-15T09:00:00Z', updated_at: '2024-11-20T14:30:00Z',
  },
  // Gekündigter Mieter – Top 6 (letzter Monat)
  {
    id: 'demo-tenant-6', unit_id: 'demo-unit-7',
    first_name: 'Andreas', last_name: 'Winkler',
    email: 'a.winkler@beispiel.at', phone: '+43 680 000 0006',
    mietbeginn: '2022-09-01', mietende: '2025-03-31',
    kaution: 3150, kaution_bezahlt: true,
    grundmiete: 1050, betriebskosten_vorschuss: 195, heizungskosten_vorschuss: 130,
    vorschuss_gueltig_ab: null, sepa_mandat: false,
    iban: null, bic: null, mandat_reference: null,
    status: 'gekuendigt',
    created_at: '2022-08-15T10:00:00Z', updated_at: '2025-01-10T09:00:00Z',
  },
  {
    id: 'demo-tenant-7', unit_id: 'demo-unit-8',
    first_name: 'Firma', last_name: 'Beispiel KG',
    email: 'office@beispiel-kg.at', phone: '+43 1 000 0007',
    mietbeginn: '2023-06-01', mietende: null,
    kaution: 540, kaution_bezahlt: true,
    grundmiete: 180, betriebskosten_vorschuss: 30, heizungskosten_vorschuss: 0,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0007', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-007',
    status: 'aktiv',
    created_at: '2023-05-20T11:00:00Z', updated_at: '2024-11-20T14:30:00Z',
  },

  // === Hauptplatz 8 (Graz) ===
  {
    id: 'demo-tenant-g1', unit_id: 'demo-unit-g1',
    first_name: 'Demo', last_name: 'Apotheke OG',
    email: 'apotheke@beispiel.at', phone: '+43 316 000 0010',
    mietbeginn: '2019-04-01', mietende: null,
    kaution: 12000, kaution_bezahlt: true,
    grundmiete: 3800, betriebskosten_vorschuss: 650, heizungskosten_vorschuss: 380,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0010', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-010',
    status: 'aktiv',
    created_at: '2019-03-15T09:00:00Z', updated_at: '2024-12-01T11:00:00Z',
  },
  {
    id: 'demo-tenant-g2', unit_id: 'demo-unit-g2',
    first_name: 'Muster', last_name: 'Friseur GmbH',
    email: 'friseur@beispiel.at', phone: '+43 316 000 0011',
    mietbeginn: '2021-01-01', mietende: null,
    kaution: 4750, kaution_bezahlt: true,
    grundmiete: 1580, betriebskosten_vorschuss: 285, heizungskosten_vorschuss: 190,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0011', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-011',
    status: 'aktiv',
    created_at: '2020-12-10T10:00:00Z', updated_at: '2024-12-01T11:00:00Z',
  },
  {
    id: 'demo-tenant-g3', unit_id: 'demo-unit-g3',
    first_name: 'Maria', last_name: 'Steiner',
    email: 'maria.steiner@beispiel.at', phone: '+43 664 000 0012',
    mietbeginn: '2020-09-01', mietende: null,
    kaution: 2640, kaution_bezahlt: true,
    grundmiete: 880, betriebskosten_vorschuss: 165, heizungskosten_vorschuss: 110,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0012', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-012',
    status: 'aktiv',
    created_at: '2020-08-15T09:00:00Z', updated_at: '2024-12-01T11:00:00Z',
  },
  {
    id: 'demo-tenant-g4', unit_id: 'demo-unit-g4',
    first_name: 'Thomas', last_name: 'Hofer',
    email: null, phone: '+43 699 000 0013',
    mietbeginn: '2022-05-01', mietende: null,
    kaution: 2175, kaution_bezahlt: true,
    grundmiete: 725, betriebskosten_vorschuss: 135, heizungskosten_vorschuss: 90,
    vorschuss_gueltig_ab: null, sepa_mandat: false,
    iban: null, bic: null, mandat_reference: null,
    status: 'aktiv',
    created_at: '2022-04-10T08:00:00Z', updated_at: '2024-12-01T11:00:00Z',
  },
  {
    id: 'demo-tenant-g5', unit_id: 'demo-unit-g5',
    first_name: 'Dr. Peter', last_name: 'Maier',
    email: 'p.maier@beispiel.at', phone: '+43 664 000 0014',
    mietbeginn: '2018-11-01', mietende: null,
    kaution: 3300, kaution_bezahlt: true,
    grundmiete: 1100, betriebskosten_vorschuss: 210, heizungskosten_vorschuss: 140,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0014', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-014',
    status: 'aktiv',
    created_at: '2018-10-15T10:00:00Z', updated_at: '2024-12-01T11:00:00Z',
  },
  // Beendeter Mieter in Graz – Top 6 (nun Leerstand)
  {
    id: 'demo-tenant-gx1', unit_id: 'demo-unit-g6',
    first_name: 'Lisa', last_name: 'Bauer',
    email: 'lisa.bauer@beispiel.at', phone: '+43 660 000 0015',
    mietbeginn: '2021-03-01', mietende: '2024-12-31',
    kaution: 1860, kaution_bezahlt: true,
    grundmiete: 620, betriebskosten_vorschuss: 115, heizungskosten_vorschuss: 75,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0015', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-015',
    status: 'beendet',
    created_at: '2021-02-10T09:00:00Z', updated_at: '2025-01-02T10:00:00Z',
  },
  {
    id: 'demo-tenant-g6', unit_id: 'demo-unit-g7',
    first_name: 'Muster', last_name: 'Lager GmbH',
    email: 'lager@beispiel.at', phone: '+43 316 000 0016',
    mietbeginn: '2023-01-01', mietende: null,
    kaution: 1200, kaution_bezahlt: true,
    grundmiete: 400, betriebskosten_vorschuss: 65, heizungskosten_vorschuss: 0,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0016', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-016',
    status: 'aktiv',
    created_at: '2022-12-15T10:00:00Z', updated_at: '2024-12-01T11:00:00Z',
  },
  {
    id: 'demo-tenant-g7', unit_id: 'demo-unit-g8',
    first_name: 'Karl', last_name: 'Gruber',
    email: 'karl.gruber@beispiel.at', phone: null,
    mietbeginn: '2022-07-01', mietende: null,
    kaution: 480, kaution_bezahlt: true,
    grundmiete: 160, betriebskosten_vorschuss: 25, heizungskosten_vorschuss: 0,
    vorschuss_gueltig_ab: null, sepa_mandat: false,
    iban: null, bic: null, mandat_reference: null,
    status: 'aktiv',
    created_at: '2022-06-15T08:00:00Z', updated_at: '2024-12-01T11:00:00Z',
  },

  // === Linzer Gasse 42 (Salzburg) ===
  {
    id: 'demo-tenant-s1', unit_id: 'demo-unit-s1',
    first_name: 'Muster', last_name: 'Trafik',
    email: 'trafik@beispiel.at', phone: '+43 662 000 0020',
    mietbeginn: '2017-06-01', mietende: null,
    kaution: 6600, kaution_bezahlt: true,
    grundmiete: 2200, betriebskosten_vorschuss: 350, heizungskosten_vorschuss: 220,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0020', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-020',
    status: 'aktiv',
    created_at: '2017-05-15T08:00:00Z', updated_at: '2024-10-15T16:00:00Z',
  },
  {
    id: 'demo-tenant-s2', unit_id: 'demo-unit-s2',
    first_name: 'Anna', last_name: 'Pichler',
    email: 'anna.pichler@beispiel.at', phone: '+43 664 000 0021',
    mietbeginn: '2020-02-01', mietende: null,
    kaution: 1740, kaution_bezahlt: true,
    grundmiete: 580, betriebskosten_vorschuss: 105, heizungskosten_vorschuss: 70,
    vorschuss_gueltig_ab: null, sepa_mandat: false,
    iban: null, bic: null, mandat_reference: null,
    status: 'aktiv',
    created_at: '2020-01-10T09:00:00Z', updated_at: '2024-10-15T16:00:00Z',
  },
  {
    id: 'demo-tenant-s3', unit_id: 'demo-unit-s3',
    first_name: 'Wolfgang', last_name: 'Eder',
    email: 'w.eder@beispiel.at', phone: '+43 680 000 0022',
    mietbeginn: '2019-08-01', mietende: null,
    kaution: 1860, kaution_bezahlt: true,
    grundmiete: 620, betriebskosten_vorschuss: 115, heizungskosten_vorschuss: 78,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0022', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-022',
    status: 'aktiv',
    created_at: '2019-07-15T08:00:00Z', updated_at: '2024-10-15T16:00:00Z',
  },
  {
    id: 'demo-tenant-s4', unit_id: 'demo-unit-s4',
    first_name: 'Claudia', last_name: 'Wimmer',
    email: 'c.wimmer@beispiel.at', phone: '+43 699 000 0023',
    mietbeginn: '2021-11-01', mietende: null,
    kaution: 2250, kaution_bezahlt: true,
    grundmiete: 750, betriebskosten_vorschuss: 140, heizungskosten_vorschuss: 95,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0023', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-023',
    status: 'aktiv',
    created_at: '2021-10-10T10:00:00Z', updated_at: '2024-10-15T16:00:00Z',
  },
  {
    id: 'demo-tenant-s5', unit_id: 'demo-unit-s5',
    first_name: 'Stefan', last_name: 'Huber',
    email: null, phone: '+43 660 000 0024',
    mietbeginn: '2023-04-01', mietende: null,
    kaution: 1440, kaution_bezahlt: false,
    grundmiete: 480, betriebskosten_vorschuss: 88, heizungskosten_vorschuss: 60,
    vorschuss_gueltig_ab: null, sepa_mandat: false,
    iban: null, bic: null, mandat_reference: null,
    status: 'aktiv',
    created_at: '2023-03-15T09:00:00Z', updated_at: '2024-10-15T16:00:00Z',
  },
  {
    id: 'demo-tenant-s6', unit_id: 'demo-unit-s6',
    first_name: 'Claudia', last_name: 'Wimmer',
    email: 'c.wimmer@beispiel.at', phone: '+43 699 000 0023',
    mietbeginn: '2021-11-01', mietende: null,
    kaution: 420, kaution_bezahlt: true,
    grundmiete: 140, betriebskosten_vorschuss: 20, heizungskosten_vorschuss: 0,
    vorschuss_gueltig_ab: null, sepa_mandat: true,
    iban: 'AT00 0000 0000 0000 0023', bic: 'DEMO0000', mandat_reference: 'SEPA-DEMO-023B',
    status: 'aktiv',
    created_at: '2021-10-10T10:00:00Z', updated_at: '2024-10-15T16:00:00Z',
  },
];

// ============ Mock Transactions ============
export const mockTransactions: DemoTransaction[] = [
  // === Jänner 2025 – Wien ===
  {
    id: 'demo-tx-1', bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-15', valuta_date: '2025-01-15',
    amount: 3550, currency: 'EUR',
    description: 'Miete Jänner 2025 - Muster Gastro',
    counterparty_name: 'Muster Gastro GmbH', counterparty_iban: 'AT00 0000 0000 0000 0001',
    reference: 'Miete Top 1 01/2025',
    status: 'matched', property_id: 'demo-prop-1', unit_id: 'demo-unit-1', tenant_id: 'demo-tenant-1',
    category_id: null, matched_at: '2025-01-15T10:00:00Z',
    created_at: '2025-01-15T08:00:00Z', updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'demo-tx-2', bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-14', valuta_date: '2025-01-14',
    amount: 1020, currency: 'EUR',
    description: 'Miete Jänner - Mustermann Erika',
    counterparty_name: 'Erika Mustermann', counterparty_iban: 'AT00 0000 0000 0000 0002',
    reference: 'Miete 01/2025',
    status: 'matched', property_id: 'demo-prop-1', unit_id: 'demo-unit-2', tenant_id: 'demo-tenant-2',
    category_id: null, matched_at: '2025-01-14T12:00:00Z',
    created_at: '2025-01-14T09:00:00Z', updated_at: '2025-01-14T12:00:00Z',
  },
  {
    id: 'demo-tx-3', bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-10', valuta_date: '2025-01-10',
    amount: -1250.50, currency: 'EUR',
    description: 'Wien Energie - Strom Allgemein',
    counterparty_name: 'Wien Energie GmbH', counterparty_iban: 'AT123456789012345678',
    reference: 'Rechnung 2025-001234',
    status: 'matched', property_id: 'demo-prop-1', unit_id: null, tenant_id: null,
    category_id: null, matched_at: '2025-01-10T14:00:00Z',
    created_at: '2025-01-10T08:00:00Z', updated_at: '2025-01-10T14:00:00Z',
  },
  {
    id: 'demo-tx-4', bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-08', valuta_date: '2025-01-08',
    amount: 1230, currency: 'EUR',
    description: 'Miete Familie Mustermann',
    counterparty_name: 'Familie Mustermann', counterparty_iban: 'AT00 0000 0000 0000 0003',
    reference: 'Jänner Miete',
    status: 'matched', property_id: 'demo-prop-1', unit_id: 'demo-unit-4', tenant_id: 'demo-tenant-3',
    category_id: null, matched_at: '2025-01-08T16:00:00Z',
    created_at: '2025-01-08T09:00:00Z', updated_at: '2025-01-08T16:00:00Z',
  },
  {
    id: 'demo-tx-5', bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-05', valuta_date: '2025-01-05',
    amount: -890, currency: 'EUR',
    description: 'Hausbetreuung Meier',
    counterparty_name: 'Hausbetreuung Meier GmbH', counterparty_iban: 'AT555555555555555555',
    reference: 'Reinigung 01/2025',
    status: 'unmatched', property_id: null, unit_id: null, tenant_id: null,
    category_id: null, matched_at: null,
    created_at: '2025-01-05T07:00:00Z', updated_at: '2025-01-05T07:00:00Z',
  },
  {
    id: 'demo-tx-6', bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-03', valuta_date: '2025-01-03',
    amount: 725, currency: 'EUR',
    description: 'Miete Berger Sabine Jan 2025',
    counterparty_name: 'Sabine Berger', counterparty_iban: 'AT00 0000 0000 0000 0005',
    reference: 'Miete Top 5',
    status: 'matched', property_id: 'demo-prop-1', unit_id: 'demo-unit-6', tenant_id: 'demo-tenant-5',
    category_id: null, matched_at: '2025-01-03T11:00:00Z',
    created_at: '2025-01-03T08:00:00Z', updated_at: '2025-01-03T11:00:00Z',
  },
  {
    id: 'demo-tx-7', bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-02', valuta_date: '2025-01-02',
    amount: 1375, currency: 'EUR',
    description: 'Winkler Andreas Miete Jänner',
    counterparty_name: 'Andreas Winkler', counterparty_iban: null,
    reference: 'Miete Top 6 01/25',
    status: 'matched', property_id: 'demo-prop-1', unit_id: 'demo-unit-7', tenant_id: 'demo-tenant-6',
    category_id: null, matched_at: '2025-01-02T15:00:00Z',
    created_at: '2025-01-02T09:00:00Z', updated_at: '2025-01-02T15:00:00Z',
  },
  // Unmatched – potentieller neuer Mieter?
  {
    id: 'demo-tx-8', bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-20', valuta_date: '2025-01-20',
    amount: 850, currency: 'EUR',
    description: 'ZAHLUNG MUELLER',
    counterparty_name: 'Müller Christine', counterparty_iban: 'AT99 8888 7777 6666 5555',
    reference: null,
    status: 'unmatched', property_id: null, unit_id: null, tenant_id: null,
    category_id: null, matched_at: null,
    created_at: '2025-01-20T10:00:00Z', updated_at: '2025-01-20T10:00:00Z',
  },

  // === Jänner 2025 – Graz ===
  {
    id: 'demo-tx-g1', bank_account_id: 'demo-bank-3',
    transaction_date: '2025-01-05', valuta_date: '2025-01-05',
    amount: 4830, currency: 'EUR',
    description: 'Demo Apotheke Miete 01/2025',
    counterparty_name: 'Demo Apotheke OG', counterparty_iban: 'AT00 0000 0000 0000 0010',
    reference: 'Miete HP8 01/2025',
    status: 'matched', property_id: 'demo-prop-2', unit_id: 'demo-unit-g1', tenant_id: 'demo-tenant-g1',
    category_id: null, matched_at: '2025-01-05T12:00:00Z',
    created_at: '2025-01-05T09:00:00Z', updated_at: '2025-01-05T12:00:00Z',
  },
  {
    id: 'demo-tx-g2', bank_account_id: 'demo-bank-3',
    transaction_date: '2025-01-04', valuta_date: '2025-01-04',
    amount: 2055, currency: 'EUR',
    description: 'Muster Friseur Miete Jänner',
    counterparty_name: 'Muster Friseur GmbH', counterparty_iban: 'AT00 0000 0000 0000 0011',
    reference: null,
    status: 'matched', property_id: 'demo-prop-2', unit_id: 'demo-unit-g2', tenant_id: 'demo-tenant-g2',
    category_id: null, matched_at: '2025-01-04T14:00:00Z',
    created_at: '2025-01-04T08:00:00Z', updated_at: '2025-01-04T14:00:00Z',
  },
  {
    id: 'demo-tx-g3', bank_account_id: 'demo-bank-3',
    transaction_date: '2025-01-03', valuta_date: '2025-01-03',
    amount: -2180, currency: 'EUR',
    description: 'Energie Steiermark Fernwärme',
    counterparty_name: 'Energie Steiermark', counterparty_iban: 'AT333333333333333333',
    reference: 'FW-2025-00456',
    status: 'matched', property_id: 'demo-prop-2', unit_id: null, tenant_id: null,
    category_id: null, matched_at: '2025-01-03T10:00:00Z',
    created_at: '2025-01-03T07:00:00Z', updated_at: '2025-01-03T10:00:00Z',
  },
  // Verspätete Zahlung Hofer – noch nicht gematcht
  {
    id: 'demo-tx-g4', bank_account_id: 'demo-bank-3',
    transaction_date: '2025-01-22', valuta_date: '2025-01-22',
    amount: 950, currency: 'EUR',
    description: 'Hofer Thomas Miete',
    counterparty_name: 'Thomas Hofer', counterparty_iban: null,
    reference: 'Miete Jan',
    status: 'unmatched', property_id: null, unit_id: null, tenant_id: null,
    category_id: null, matched_at: null,
    created_at: '2025-01-22T11:00:00Z', updated_at: '2025-01-22T11:00:00Z',
  },

  // === Salzburg ===
  {
    id: 'demo-tx-s1', bank_account_id: 'demo-bank-4',
    transaction_date: '2025-01-03', valuta_date: '2025-01-03',
    amount: 2770, currency: 'EUR',
    description: 'Muster Trafik Miete 01/2025',
    counterparty_name: 'Muster Trafik', counterparty_iban: 'AT00 0000 0000 0000 0020',
    reference: 'LG42 Miete',
    status: 'matched', property_id: 'demo-prop-3', unit_id: 'demo-unit-s1', tenant_id: 'demo-tenant-s1',
    category_id: null, matched_at: '2025-01-03T12:00:00Z',
    created_at: '2025-01-03T08:00:00Z', updated_at: '2025-01-03T12:00:00Z',
  },
  {
    id: 'demo-tx-s2', bank_account_id: 'demo-bank-4',
    transaction_date: '2025-01-06', valuta_date: '2025-01-06',
    amount: -420, currency: 'EUR',
    description: 'Rauchfangkehrer Salzburg',
    counterparty_name: 'Rauchfangkehrer Meister Huber', counterparty_iban: null,
    reference: 'Kehrung Q1/2025',
    status: 'unmatched', property_id: null, unit_id: null, tenant_id: null,
    category_id: null, matched_at: null,
    created_at: '2025-01-06T08:00:00Z', updated_at: '2025-01-06T08:00:00Z',
  },
];

// ============ Mock Expenses ============
export const mockExpenses: DemoExpense[] = [
  // === Wien – BK-relevante Ausgaben ===
  {
    id: 'demo-exp-1', property_id: 'demo-prop-1',
    category: 'betriebskosten_umlagefaehig', expense_type: 'strom_allgemein',
    bezeichnung: 'Strom Allgemeinbereich Q4/2024', betrag: 1250.50,
    datum: '2025-01-10', beleg_nummer: 'WE-2025-001234', beleg_url: null,
    notizen: 'Quartalsabrechnung Wien Energie', year: 2025, month: 1,
    transaction_id: 'demo-tx-3',
    created_at: '2025-01-10T14:00:00Z', updated_at: '2025-01-10T14:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-exp-2', property_id: 'demo-prop-1',
    category: 'betriebskosten_umlagefaehig', expense_type: 'hausbetreuung',
    bezeichnung: 'Hausbetreuung Jänner 2025', betrag: 890,
    datum: '2025-01-05', beleg_nummer: 'HB-2025-001', beleg_url: null,
    notizen: null, year: 2025, month: 1, transaction_id: null,
    created_at: '2025-01-05T10:00:00Z', updated_at: '2025-01-05T10:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-exp-3', property_id: 'demo-prop-1',
    category: 'instandhaltung', expense_type: 'reparatur',
    bezeichnung: 'Reparatur Aufzug – Steuerungselektronik', betrag: 2350,
    datum: '2024-12-15', beleg_nummer: 'REP-2024-089', beleg_url: null,
    notizen: 'Austausch Steuerungselektronik', year: 2024, month: 12, transaction_id: null,
    created_at: '2024-12-15T11:00:00Z', updated_at: '2024-12-15T11:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-exp-5', property_id: 'demo-prop-1',
    category: 'betriebskosten_umlagefaehig', expense_type: 'versicherung',
    bezeichnung: 'Gebäudeversicherung 2025 – Mozartstraße', betrag: 3420,
    datum: '2025-01-02', beleg_nummer: 'VERS-2025-MZ15', beleg_url: null,
    notizen: 'Jahresprämie Wiener Städtische', year: 2025, month: 1, transaction_id: null,
    created_at: '2025-01-02T08:00:00Z', updated_at: '2025-01-02T08:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-exp-6', property_id: 'demo-prop-1',
    category: 'betriebskosten_umlagefaehig', expense_type: 'wasser',
    bezeichnung: 'Wasser/Kanal Q4/2024', betrag: 680,
    datum: '2024-12-28', beleg_nummer: 'WK-2024-Q4', beleg_url: null,
    notizen: 'Quartalsabrechnung Wiener Wasser', year: 2024, month: 12, transaction_id: null,
    created_at: '2024-12-28T09:00:00Z', updated_at: '2024-12-28T09:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-exp-7', property_id: 'demo-prop-1',
    category: 'betriebskosten_umlagefaehig', expense_type: 'muell',
    bezeichnung: 'Müllabfuhr Q1/2025', betrag: 520,
    datum: '2025-01-15', beleg_nummer: 'MA48-2025-Q1', beleg_url: null,
    notizen: null, year: 2025, month: 1, transaction_id: null,
    created_at: '2025-01-15T09:00:00Z', updated_at: '2025-01-15T09:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-exp-8', property_id: 'demo-prop-1',
    category: 'betriebskosten_umlagefaehig', expense_type: 'grundsteuer',
    bezeichnung: 'Grundsteuer 2025', betrag: 1890,
    datum: '2025-01-20', beleg_nummer: 'GST-2025-001', beleg_url: null,
    notizen: 'Jährliche Vorschreibung Magistrat', year: 2025, month: 1, transaction_id: null,
    created_at: '2025-01-20T10:00:00Z', updated_at: '2025-01-20T10:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-exp-9', property_id: 'demo-prop-1',
    category: 'betriebskosten_umlagefaehig', expense_type: 'schneeraeumung',
    bezeichnung: 'Schneeräumung Dezember 2024', betrag: 380,
    datum: '2024-12-31', beleg_nummer: 'SR-2024-012', beleg_url: null,
    notizen: '3 Einsätze im Dezember', year: 2024, month: 12, transaction_id: null,
    created_at: '2024-12-31T10:00:00Z', updated_at: '2024-12-31T10:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },

  // === Graz – Ausgaben ===
  {
    id: 'demo-exp-4', property_id: 'demo-prop-2',
    category: 'betriebskosten_umlagefaehig', expense_type: 'versicherung',
    bezeichnung: 'Gebäudeversicherung 2025 – Hauptplatz', betrag: 4850,
    datum: '2025-01-02', beleg_nummer: 'VERS-2025-HP8', beleg_url: null,
    notizen: 'Jahresprämie Generali', year: 2025, month: 1, transaction_id: null,
    created_at: '2025-01-02T09:00:00Z', updated_at: '2025-01-02T09:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-exp-g1', property_id: 'demo-prop-2',
    category: 'betriebskosten_umlagefaehig', expense_type: 'heizung',
    bezeichnung: 'Fernwärme Jänner 2025', betrag: 2180,
    datum: '2025-01-03', beleg_nummer: 'FW-2025-00456', beleg_url: null,
    notizen: 'Monatsabrechnung Energie Steiermark', year: 2025, month: 1, transaction_id: 'demo-tx-g3',
    created_at: '2025-01-03T10:00:00Z', updated_at: '2025-01-03T10:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-exp-g2', property_id: 'demo-prop-2',
    category: 'betriebskosten_umlagefaehig', expense_type: 'hausbetreuung',
    bezeichnung: 'Hausbetreuung & Reinigung Jänner', betrag: 1250,
    datum: '2025-01-08', beleg_nummer: 'HB-G-2025-001', beleg_url: null,
    notizen: null, year: 2025, month: 1, transaction_id: null,
    created_at: '2025-01-08T09:00:00Z', updated_at: '2025-01-08T09:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-exp-g3', property_id: 'demo-prop-2',
    category: 'instandhaltung', expense_type: 'reparatur',
    bezeichnung: 'Wasserschaden Top 6 – Behebung', betrag: 1850,
    datum: '2024-11-20', beleg_nummer: 'REP-2024-G045', beleg_url: null,
    notizen: 'Ursache: gebrochene Leitung im Bad', year: 2024, month: 11, transaction_id: null,
    created_at: '2024-11-20T14:00:00Z', updated_at: '2024-11-20T14:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },

  // === Salzburg – Ausgaben ===
  {
    id: 'demo-exp-s1', property_id: 'demo-prop-3',
    category: 'betriebskosten_umlagefaehig', expense_type: 'heizung',
    bezeichnung: 'Heizöl-Lieferung 3.000l', betrag: 3450,
    datum: '2024-11-15', beleg_nummer: 'HEIZ-2024-S01', beleg_url: null,
    notizen: 'Winterfüllung Ölheizung', year: 2024, month: 11, transaction_id: null,
    created_at: '2024-11-15T10:00:00Z', updated_at: '2024-11-15T10:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
  {
    id: 'demo-exp-s2', property_id: 'demo-prop-3',
    category: 'betriebskosten_umlagefaehig', expense_type: 'strom_allgemein',
    bezeichnung: 'Strom Allgemein Q4/2024', betrag: 580,
    datum: '2024-12-20', beleg_nummer: 'SE-2024-Q4', beleg_url: null,
    notizen: 'Salzburg AG', year: 2024, month: 12, transaction_id: null,
    created_at: '2024-12-20T09:00:00Z', updated_at: '2024-12-20T09:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
  {
    id: 'demo-exp-s3', property_id: 'demo-prop-3',
    category: 'betriebskosten_umlagefaehig', expense_type: 'rauchfangkehrer',
    bezeichnung: 'Rauchfangkehrer Q1/2025', betrag: 420,
    datum: '2025-01-06', beleg_nummer: 'RFK-2025-Q1', beleg_url: null,
    notizen: 'Kehrung und Befund', year: 2025, month: 1, transaction_id: null,
    created_at: '2025-01-06T08:00:00Z', updated_at: '2025-01-06T08:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
  {
    id: 'demo-exp-s4', property_id: 'demo-prop-3',
    category: 'instandhaltung', expense_type: 'reparatur',
    bezeichnung: 'Fensterreparatur Top 2', betrag: 890,
    datum: '2024-10-08', beleg_nummer: 'REP-2024-S012', beleg_url: null,
    notizen: 'Undichtes Kastenfenster – Altbau', year: 2024, month: 10, transaction_id: null,
    created_at: '2024-10-08T11:00:00Z', updated_at: '2024-10-08T11:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
];

// ============ Mock Payments ============
export const mockPayments: DemoPayment[] = [
  // === Wien Jänner 2025 ===
  {
    id: 'demo-pay-1', tenant_id: 'demo-tenant-1', invoice_id: null,
    betrag: 3550, eingangs_datum: '2025-01-15', buchungs_datum: '2025-01-15',
    zahlungsart: 'ueberweisung', referenz: 'Miete Top 1 01/2025',
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'demo-pay-2', tenant_id: 'demo-tenant-2', invoice_id: null,
    betrag: 1020, eingangs_datum: '2025-01-14', buchungs_datum: '2025-01-14',
    zahlungsart: 'lastschrift', referenz: 'SEPA-2021-015 01/2025',
    created_at: '2025-01-14T09:00:00Z',
  },
  {
    id: 'demo-pay-3', tenant_id: 'demo-tenant-3', invoice_id: null,
    betrag: 1230, eingangs_datum: '2025-01-08', buchungs_datum: '2025-01-08',
    zahlungsart: 'ueberweisung', referenz: 'Jänner Miete',
    created_at: '2025-01-08T09:00:00Z',
  },
  {
    id: 'demo-pay-4', tenant_id: 'demo-tenant-4', invoice_id: null,
    betrag: 175, eingangs_datum: '2025-01-03', buchungs_datum: '2025-01-03',
    zahlungsart: 'lastschrift', referenz: 'SEPA-2022-008 01/2025',
    created_at: '2025-01-03T08:00:00Z',
  },
  {
    id: 'demo-pay-5', tenant_id: 'demo-tenant-5', invoice_id: null,
    betrag: 725, eingangs_datum: '2025-01-03', buchungs_datum: '2025-01-03',
    zahlungsart: 'lastschrift', referenz: 'SEPA-DEMO-005 01/2025',
    created_at: '2025-01-03T08:30:00Z',
  },
  {
    id: 'demo-pay-6', tenant_id: 'demo-tenant-6', invoice_id: null,
    betrag: 1375, eingangs_datum: '2025-01-02', buchungs_datum: '2025-01-02',
    zahlungsart: 'ueberweisung', referenz: 'Miete Top 6 01/25',
    created_at: '2025-01-02T09:00:00Z',
  },
  {
    id: 'demo-pay-7', tenant_id: 'demo-tenant-7', invoice_id: null,
    betrag: 210, eingangs_datum: '2025-01-02', buchungs_datum: '2025-01-02',
    zahlungsart: 'lastschrift', referenz: 'SEPA-DEMO-007 01/2025',
    created_at: '2025-01-02T08:00:00Z',
  },

  // === Graz Jänner 2025 ===
  {
    id: 'demo-pay-g1', tenant_id: 'demo-tenant-g1', invoice_id: null,
    betrag: 4830, eingangs_datum: '2025-01-05', buchungs_datum: '2025-01-05',
    zahlungsart: 'lastschrift', referenz: 'SEPA-DEMO-010 01/2025',
    created_at: '2025-01-05T09:00:00Z',
  },
  {
    id: 'demo-pay-g2', tenant_id: 'demo-tenant-g2', invoice_id: null,
    betrag: 2055, eingangs_datum: '2025-01-04', buchungs_datum: '2025-01-04',
    zahlungsart: 'lastschrift', referenz: 'SEPA-DEMO-011 01/2025',
    created_at: '2025-01-04T08:00:00Z',
  },
  {
    id: 'demo-pay-g3', tenant_id: 'demo-tenant-g3', invoice_id: null,
    betrag: 1155, eingangs_datum: '2025-01-05', buchungs_datum: '2025-01-05',
    zahlungsart: 'lastschrift', referenz: 'SEPA-DEMO-012 01/2025',
    created_at: '2025-01-05T08:00:00Z',
  },
  // Hofer zahlt verspätet und zu wenig
  {
    id: 'demo-pay-g4', tenant_id: 'demo-tenant-g4', invoice_id: null,
    betrag: 950, eingangs_datum: '2025-01-22', buchungs_datum: '2025-01-22',
    zahlungsart: 'ueberweisung', referenz: 'Miete Jan',
    created_at: '2025-01-22T11:00:00Z',
  },
  {
    id: 'demo-pay-g5', tenant_id: 'demo-tenant-g5', invoice_id: null,
    betrag: 1450, eingangs_datum: '2025-01-03', buchungs_datum: '2025-01-03',
    zahlungsart: 'lastschrift', referenz: 'SEPA-DEMO-014 01/2025',
    created_at: '2025-01-03T08:00:00Z',
  },
  {
    id: 'demo-pay-g6', tenant_id: 'demo-tenant-g6', invoice_id: null,
    betrag: 465, eingangs_datum: '2025-01-03', buchungs_datum: '2025-01-03',
    zahlungsart: 'lastschrift', referenz: 'SEPA-DEMO-016 01/2025',
    created_at: '2025-01-03T08:00:00Z',
  },

  // === Salzburg Jänner 2025 ===
  {
    id: 'demo-pay-s1', tenant_id: 'demo-tenant-s1', invoice_id: null,
    betrag: 2770, eingangs_datum: '2025-01-03', buchungs_datum: '2025-01-03',
    zahlungsart: 'lastschrift', referenz: 'SEPA-DEMO-020 01/2025',
    created_at: '2025-01-03T08:00:00Z',
  },
  {
    id: 'demo-pay-s2', tenant_id: 'demo-tenant-s2', invoice_id: null,
    betrag: 755, eingangs_datum: '2025-01-05', buchungs_datum: '2025-01-05',
    zahlungsart: 'ueberweisung', referenz: 'Miete LG42 Top 2',
    created_at: '2025-01-05T09:00:00Z',
  },
  {
    id: 'demo-pay-s3', tenant_id: 'demo-tenant-s3', invoice_id: null,
    betrag: 813, eingangs_datum: '2025-01-04', buchungs_datum: '2025-01-04',
    zahlungsart: 'lastschrift', referenz: 'SEPA-DEMO-022 01/2025',
    created_at: '2025-01-04T08:00:00Z',
  },
  {
    id: 'demo-pay-s4', tenant_id: 'demo-tenant-s4', invoice_id: null,
    betrag: 985, eingangs_datum: '2025-01-03', buchungs_datum: '2025-01-03',
    zahlungsart: 'lastschrift', referenz: 'SEPA-DEMO-023 01/2025',
    created_at: '2025-01-03T08:00:00Z',
  },
  // Huber – keine Zahlung eingegangen (offene Forderung!)
];

// ============ Mock Bank Accounts ============
export const mockBankAccounts: DemoBankAccount[] = [
  {
    id: 'demo-bank-1',
    account_name: 'Hausverwaltung Hauptkonto',
    bank_name: 'Erste Bank',
    iban: 'AT00 0000 0000 0000 0010',
    bic: 'DEMO0000',
    opening_balance: 15000,
    opening_balance_date: '2024-01-01',
    current_balance: 42850.50,
    property_id: null,
    organization_id: null,
    last_synced_at: '2025-01-25T10:00:00Z',
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2025-01-25T10:00:00Z',
  },
  {
    id: 'demo-bank-2',
    account_name: 'Rücklagenkonto Mozartstraße',
    bank_name: 'Raiffeisen',
    iban: 'AT00 0000 0000 0000 0020',
    bic: 'DEMO0000',
    opening_balance: 50000,
    opening_balance_date: '2023-01-01',
    current_balance: 72350,
    property_id: 'demo-prop-1',
    organization_id: null,
    last_synced_at: '2025-01-15T14:00:00Z',
    created_at: '2023-01-01T08:00:00Z',
    updated_at: '2025-01-15T14:00:00Z',
  },
  {
    id: 'demo-bank-3',
    account_name: 'Mietkonto Hauptplatz 8',
    bank_name: 'Steiermärkische Sparkasse',
    iban: 'AT00 0000 0000 0000 0030',
    bic: 'DEMO0000',
    opening_balance: 8500,
    opening_balance_date: '2024-01-01',
    current_balance: 28420,
    property_id: 'demo-prop-2',
    organization_id: null,
    last_synced_at: '2025-01-25T10:00:00Z',
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2025-01-25T10:00:00Z',
  },
  {
    id: 'demo-bank-4',
    account_name: 'Mietkonto Linzer Gasse',
    bank_name: 'Salzburger Sparkasse',
    iban: 'AT00 0000 0000 0000 0040',
    bic: 'DEMO0000',
    opening_balance: 5200,
    opening_balance_date: '2024-01-01',
    current_balance: 15680,
    property_id: 'demo-prop-3',
    organization_id: null,
    last_synced_at: '2025-01-20T14:00:00Z',
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2025-01-20T14:00:00Z',
  },
];

// ============ Mock Maintenance Tasks ============
export const mockMaintenanceTasks: DemoMaintenanceTask[] = [
  // === Wien ===
  {
    id: 'demo-task-1', organization_id: null, property_id: 'demo-prop-1', unit_id: null,
    title: 'Aufzugswartung Q1/2025',
    description: 'Reguläre Quartalswartung des Personenaufzugs gemäß Wartungsvertrag',
    category: 'maintenance', priority: 'medium', status: 'open',
    assigned_to: null, contractor_name: 'Schindler Aufzüge GmbH', contractor_contact: '+43 1 89012345',
    due_date: '2025-02-15', completed_at: null,
    estimated_cost: 450, actual_cost: null, created_by: null,
    created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-10T09:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-task-2', organization_id: null, property_id: 'demo-prop-1', unit_id: 'demo-unit-3',
    title: 'Renovierung für Neuvermietung Top 3',
    description: 'Ausmalen, neuer Boden und Sanitär-Check nach Auszug Hr. Altmieter',
    category: 'repair', priority: 'high', status: 'in_progress',
    assigned_to: null, contractor_name: 'Maler Huber', contractor_contact: 'office@malerhuber.at',
    due_date: '2025-02-28', completed_at: null,
    estimated_cost: 3500, actual_cost: null, created_by: null,
    created_at: '2025-01-05T11:00:00Z', updated_at: '2025-01-18T14:00:00Z',
    properties: { name: 'Mozartstraße 15' }, units: { top_nummer: 'Top 3' },
  },
  {
    id: 'demo-task-5', organization_id: null, property_id: 'demo-prop-1', unit_id: null,
    title: 'Thermenservice Zentralheizung',
    description: 'Jährliches Service der Gas-Zentralheizung vor Heizperiode',
    category: 'maintenance', priority: 'medium', status: 'completed',
    assigned_to: null, contractor_name: 'Installateur Novak', contractor_contact: '+43 1 5558888',
    due_date: '2024-09-30', completed_at: '2024-09-25T14:00:00Z',
    estimated_cost: 380, actual_cost: 340, created_by: null,
    created_at: '2024-08-15T09:00:00Z', updated_at: '2024-09-25T14:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-task-6', organization_id: null, property_id: 'demo-prop-1', unit_id: 'demo-unit-7',
    title: 'Schlüsselrückgabe Winkler (gekündigt)',
    description: 'Wohnungsübergabe und Schlüsselrückgabe koordinieren – Mietende 31.03.2025',
    category: 'other', priority: 'high', status: 'open',
    assigned_to: null, contractor_name: null, contractor_contact: null,
    due_date: '2025-03-31', completed_at: null,
    estimated_cost: null, actual_cost: null, created_by: null,
    created_at: '2025-01-12T10:00:00Z', updated_at: '2025-01-12T10:00:00Z',
    properties: { name: 'Mozartstraße 15' }, units: { top_nummer: 'Top 6' },
  },

  // === Graz ===
  {
    id: 'demo-task-3', organization_id: null, property_id: 'demo-prop-2', unit_id: null,
    title: 'Brandschutzüberprüfung 2025',
    description: 'Jährliche Überprüfung der Brandschutzeinrichtungen inkl. Feuerlöscher und Brandmelder',
    category: 'inspection', priority: 'urgent', status: 'pending_approval',
    assigned_to: null, contractor_name: 'Brandschutz Austria', contractor_contact: '+43 316 123456',
    due_date: '2025-01-25', completed_at: null,
    estimated_cost: 680, actual_cost: 720, created_by: null,
    created_at: '2024-12-20T10:00:00Z', updated_at: '2025-01-20T09:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-task-7', organization_id: null, property_id: 'demo-prop-2', unit_id: 'demo-unit-g6',
    title: 'Besichtigung Top 6 für Neuvermietung',
    description: 'Wohnung nach Auszug Bauer besichtigen, Zustand dokumentieren, Inserate schalten',
    category: 'other', priority: 'medium', status: 'open',
    assigned_to: null, contractor_name: null, contractor_contact: null,
    due_date: '2025-02-10', completed_at: null,
    estimated_cost: null, actual_cost: null, created_by: null,
    created_at: '2025-01-05T10:00:00Z', updated_at: '2025-01-05T10:00:00Z',
    properties: { name: 'Hauptplatz 8' }, units: { top_nummer: 'Top 6' },
  },
  {
    id: 'demo-task-8', organization_id: null, property_id: 'demo-prop-2', unit_id: null,
    title: 'Dachrinnenreinigung Frühjahr',
    description: 'Reinigung aller Dachrinnen und Fallrohre nach dem Winter',
    category: 'maintenance', priority: 'low', status: 'open',
    assigned_to: null, contractor_name: 'Dachdecker Fischer', contractor_contact: '+43 316 555777',
    due_date: '2025-04-15', completed_at: null,
    estimated_cost: 520, actual_cost: null, created_by: null,
    created_at: '2025-01-15T08:00:00Z', updated_at: '2025-01-15T08:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },

  // === Salzburg ===
  {
    id: 'demo-task-4', organization_id: null, property_id: 'demo-prop-3', unit_id: null,
    title: 'Heizungsservice Dezember',
    description: 'Jährliches Service der Ölheizung inkl. Filterreinigung',
    category: 'maintenance', priority: 'medium', status: 'completed',
    assigned_to: null, contractor_name: 'Installateur Berger', contractor_contact: '+43 662 987654',
    due_date: '2024-12-15', completed_at: '2024-12-12T15:00:00Z',
    estimated_cost: 320, actual_cost: 295, created_by: null,
    created_at: '2024-11-20T08:00:00Z', updated_at: '2024-12-12T15:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
  {
    id: 'demo-task-9', organization_id: null, property_id: 'demo-prop-3', unit_id: 'demo-unit-s2',
    title: 'Kastenfenster Top 2 nachstellen',
    description: 'Fenster im Schlafzimmer klemmt – Altbaufenster nachstellen lassen',
    category: 'repair', priority: 'low', status: 'open',
    assigned_to: null, contractor_name: 'Tischlerei Hofer', contractor_contact: '+43 662 444555',
    due_date: '2025-03-15', completed_at: null,
    estimated_cost: 250, actual_cost: null, created_by: null,
    created_at: '2025-01-18T11:00:00Z', updated_at: '2025-01-18T11:00:00Z',
    properties: { name: 'Linzer Gasse 42' }, units: { top_nummer: 'Top 2' },
  },
  {
    id: 'demo-task-10', organization_id: null, property_id: 'demo-prop-3', unit_id: null,
    title: 'Rauchfangkehrer-Befund erneuern',
    description: 'Befund läuft im März 2025 ab – Neuausstellung beauftragen',
    category: 'inspection', priority: 'medium', status: 'open',
    assigned_to: null, contractor_name: 'Rauchfangkehrer Meister Huber', contractor_contact: '+43 662 111222',
    due_date: '2025-03-01', completed_at: null,
    estimated_cost: 180, actual_cost: null, created_by: null,
    created_at: '2025-01-20T09:00:00Z', updated_at: '2025-01-20T09:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
];

// ============ Dashboard Statistics ============
export const mockDashboardStats: DashboardStats = {
  totalProperties: 3,
  totalUnits: 22,
  occupiedUnits: 20,
  vacantUnits: 2,
  totalTenants: 21,
  monthlyRevenue: 24648,
  monthlyBetriebskosten: 5940.50,
  openInvoices: 1,
  overdueAmount: 628,
};

// ============ Demo Contractors ============
export interface DemoContractor {
  id: string;
  organization_id: string | null;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  specializations: string[];
  rating: number | null;
  notes: string | null;
  is_active: boolean;
  iban: string | null;
  bic: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const mockContractors: DemoContractor[] = [
  {
    id: 'demo-contractor-1', organization_id: null,
    company_name: 'Schindler Aufzüge GmbH', contact_person: 'Ing. Robert Schmidt',
    email: 'service@schindler.at', phone: '+43 1 89012345', mobile: null,
    address: 'Industriestraße 10', postal_code: '1230', city: 'Wien',
    specializations: ['aufzug'], rating: 5,
    notes: 'Wartungsvertrag bis 2026', is_active: true,
    iban: 'AT00 0000 0000 0000 0101', bic: 'DEMO0000',
    created_by: null, created_at: '2023-01-15T10:00:00Z', updated_at: '2024-11-20T14:30:00Z',
  },
  {
    id: 'demo-contractor-2', organization_id: null,
    company_name: 'Maler Huber', contact_person: 'Franz Huber',
    email: 'office@malerhuber.at', phone: '+43 1 5551234', mobile: '+43 664 1234567',
    address: 'Handwerkergasse 5', postal_code: '1050', city: 'Wien',
    specializations: ['maler', 'fassade'], rating: 4,
    notes: 'Schnell verfügbar, faire Preise', is_active: true,
    iban: 'AT00 0000 0000 0000 0102', bic: 'DEMO0000',
    created_by: null, created_at: '2023-06-10T09:00:00Z', updated_at: '2025-01-18T14:00:00Z',
  },
  {
    id: 'demo-contractor-3', organization_id: null,
    company_name: 'Installateur Berger', contact_person: 'Martin Berger',
    email: 'berger@installateur.at', phone: '+43 662 987654', mobile: null,
    address: 'Gewerbepark 12', postal_code: '5020', city: 'Salzburg',
    specializations: ['sanitaer', 'heizung'], rating: 4,
    notes: 'Spezialist für Altbau-Heizungen', is_active: true,
    iban: null, bic: null,
    created_by: null, created_at: '2022-03-20T11:00:00Z', updated_at: '2024-12-12T15:00:00Z',
  },
  {
    id: 'demo-contractor-4', organization_id: null,
    company_name: 'Brandschutz Austria', contact_person: 'Ing. Karin Walser',
    email: 'info@brandschutz-austria.at', phone: '+43 316 123456', mobile: null,
    address: 'Sicherheitsweg 3', postal_code: '8010', city: 'Graz',
    specializations: ['brandschutz'], rating: 3,
    notes: 'Zertifizierter Brandschutzbeauftragter', is_active: true,
    iban: 'AT00 0000 0000 0000 0104', bic: 'DEMO0000',
    created_by: null, created_at: '2024-01-10T08:00:00Z', updated_at: '2025-01-20T09:00:00Z',
  },
  {
    id: 'demo-contractor-5', organization_id: null,
    company_name: 'Hausbetreuung Meier GmbH', contact_person: 'Josef Meier',
    email: 'office@meier-hb.at', phone: '+43 1 6667890', mobile: '+43 660 9876543',
    address: 'Reinigungsgasse 8', postal_code: '1030', city: 'Wien',
    specializations: ['hausmeister', 'reinigung', 'garten', 'winterdienst'], rating: 4,
    notes: 'Zuständig für Mozartstraße 15, sehr zuverlässig', is_active: true,
    iban: 'AT00 0000 0000 0000 0105', bic: 'DEMO0000',
    created_by: null, created_at: '2023-03-01T08:00:00Z', updated_at: '2025-01-05T07:00:00Z',
  },
  {
    id: 'demo-contractor-6', organization_id: null,
    company_name: 'Dachdecker Fischer', contact_person: 'Klaus Fischer',
    email: 'fischer@dach.at', phone: '+43 316 555777', mobile: '+43 664 8889999',
    address: 'Dachweg 1', postal_code: '8010', city: 'Graz',
    specializations: ['dach', 'spengler'], rating: 4,
    notes: null, is_active: true,
    iban: null, bic: null,
    created_by: null, created_at: '2024-03-15T09:00:00Z', updated_at: '2025-01-15T08:00:00Z',
  },
  {
    id: 'demo-contractor-7', organization_id: null,
    company_name: 'Tischlerei Hofer', contact_person: 'Georg Hofer',
    email: 'tischlerei@hofer-sbg.at', phone: '+43 662 444555', mobile: null,
    address: 'Holzgasse 15', postal_code: '5020', city: 'Salzburg',
    specializations: ['tischler', 'fenster'], rating: 5,
    notes: 'Altbau-Spezialist für Kastenfenster', is_active: true,
    iban: 'AT00 0000 0000 0000 0107', bic: 'DEMO0000',
    created_by: null, created_at: '2023-09-01T10:00:00Z', updated_at: '2025-01-18T11:00:00Z',
  },
];

// ============ Demo Documents ============
export interface DemoDocument {
  id: string;
  property_id: string;
  name: string;
  type: string;
  file_url: string;
  uploaded_at: string;
}

export const mockDocuments: DemoDocument[] = [
  { id: 'demo-doc-1', property_id: 'demo-prop-1', name: 'Grundbuchauszug Mozartstraße 15', type: 'grundbuch', file_url: '#demo', uploaded_at: '2023-01-15T10:00:00Z' },
  { id: 'demo-doc-2', property_id: 'demo-prop-1', name: 'Energieausweis 2024', type: 'energieausweis', file_url: '#demo', uploaded_at: '2024-03-10T09:00:00Z' },
  { id: 'demo-doc-3', property_id: 'demo-prop-1', name: 'Versicherungspolizze Gebäude', type: 'versicherung', file_url: '#demo', uploaded_at: '2025-01-02T08:00:00Z' },
  { id: 'demo-doc-4', property_id: 'demo-prop-1', name: 'Aufzugsgenehmigung TÜV', type: 'genehmigung', file_url: '#demo', uploaded_at: '2024-06-15T11:00:00Z' },
  { id: 'demo-doc-5', property_id: 'demo-prop-2', name: 'Grundbuchauszug Hauptplatz 8', type: 'grundbuch', file_url: '#demo', uploaded_at: '2022-06-10T09:00:00Z' },
  { id: 'demo-doc-6', property_id: 'demo-prop-2', name: 'Wartungsvertrag Aufzug', type: 'vertrag', file_url: '#demo', uploaded_at: '2024-06-01T11:00:00Z' },
  { id: 'demo-doc-7', property_id: 'demo-prop-2', name: 'Brandschutzprotokoll 2024', type: 'protokoll', file_url: '#demo', uploaded_at: '2024-12-20T10:00:00Z' },
  { id: 'demo-doc-8', property_id: 'demo-prop-3', name: 'Grundbuchauszug Linzer Gasse 42', type: 'grundbuch', file_url: '#demo', uploaded_at: '2021-03-22T08:00:00Z' },
  { id: 'demo-doc-9', property_id: 'demo-prop-3', name: 'Energieausweis 2023', type: 'energieausweis', file_url: '#demo', uploaded_at: '2023-05-10T09:00:00Z' },
  { id: 'demo-doc-10', property_id: 'demo-prop-3', name: 'Rauchfangkehrer-Befund 2024', type: 'befund', file_url: '#demo', uploaded_at: '2024-03-15T08:00:00Z' },
];

// ============ Demo Messages ============
export interface DemoMessage {
  id: string;
  organization_id: string | null;
  tenant_id: string | null;
  unit_id: string | null;
  maintenance_task_id: string | null;
  recipient_type: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  subject: string | null;
  message_body: string;
  message_type: string | null;
  status: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
}

export const mockMessages: DemoMessage[] = [
  {
    id: 'demo-msg-1', organization_id: null, tenant_id: 'demo-tenant-3', unit_id: 'demo-unit-4',
    maintenance_task_id: null, recipient_type: 'tenant',
    recipient_name: 'Familie Mustermann', recipient_email: 'familie.mustermann@beispiel.at', recipient_phone: null,
    subject: 'Betriebskostenabrechnung 2024',
    message_body: 'Sehr geehrte Familie Mustermann, anbei übermitteln wir Ihnen die Betriebskostenabrechnung für das Jahr 2024.',
    message_type: 'email', status: 'sent', sent_at: '2025-01-20T10:00:00Z', created_by: null, created_at: '2025-01-20T10:00:00Z',
  },
  {
    id: 'demo-msg-2', organization_id: null, tenant_id: 'demo-tenant-1', unit_id: 'demo-unit-1',
    maintenance_task_id: null, recipient_type: 'tenant',
    recipient_name: 'Muster Gastro GmbH', recipient_email: 'demo-gastro@beispiel.at', recipient_phone: null,
    subject: 'Information: Aufzugswartung am 15.02.2025',
    message_body: 'Sehr geehrte Damen und Herren, wir möchten Sie informieren, dass am 15.02.2025 eine Aufzugswartung durchgeführt wird. Der Aufzug ist voraussichtlich von 9:00 bis 12:00 Uhr nicht nutzbar.',
    message_type: 'email', status: 'sent', sent_at: '2025-01-18T14:00:00Z', created_by: null, created_at: '2025-01-18T14:00:00Z',
  },
  {
    id: 'demo-msg-3', organization_id: null, tenant_id: null, unit_id: null,
    maintenance_task_id: 'demo-task-2', recipient_type: 'contractor',
    recipient_name: 'Maler Huber', recipient_email: 'office@malerhuber.at', recipient_phone: null,
    subject: 'Beauftragung Renovierung Top 3',
    message_body: 'Sehr geehrter Herr Huber, wir beauftragen Sie hiermit mit der Renovierung der Wohnung Top 3 in der Mozartstraße 15. Umfang: Ausmalen aller Räume, Bodenschleifen und Versiegelung.',
    message_type: 'email', status: 'sent', sent_at: '2025-01-06T09:00:00Z', created_by: null, created_at: '2025-01-06T09:00:00Z',
  },
  {
    id: 'demo-msg-4', organization_id: null, tenant_id: 'demo-tenant-2', unit_id: 'demo-unit-2',
    maintenance_task_id: null, recipient_type: 'tenant',
    recipient_name: 'Erika Mustermann', recipient_email: 'erika.mustermann@beispiel.at', recipient_phone: null,
    subject: 'Mietanpassung ab 01.04.2025',
    message_body: 'Sehr geehrte Frau Mustermann, wir informieren Sie über die Anpassung Ihres Mietzinses gemäß Richtwertgesetz ab 01.04.2025. Die neue Grundmiete beträgt € 812,40 (bisher € 780,00).',
    message_type: 'email', status: 'draft', sent_at: null, created_by: null, created_at: '2025-01-22T11:00:00Z',
  },
  {
    id: 'demo-msg-5', organization_id: null, tenant_id: 'demo-tenant-g4', unit_id: 'demo-unit-g4',
    maintenance_task_id: null, recipient_type: 'tenant',
    recipient_name: 'Thomas Hofer', recipient_email: null, recipient_phone: '+43 699 000 0013',
    subject: 'Zahlungserinnerung Miete Jänner 2025',
    message_body: 'Sehr geehrter Herr Hofer, wir erlauben uns darauf hinzuweisen, dass Ihre Miete für Jänner 2025 in Höhe von € 950,00 noch nicht vollständig eingegangen ist. Der offene Betrag beträgt € 0,00. Bitte überweisen Sie den Differenzbetrag umgehend.',
    message_type: 'letter', status: 'sent', sent_at: '2025-01-25T09:00:00Z', created_by: null, created_at: '2025-01-25T09:00:00Z',
  },
  {
    id: 'demo-msg-6', organization_id: null, tenant_id: 'demo-tenant-6', unit_id: 'demo-unit-7',
    maintenance_task_id: null, recipient_type: 'tenant',
    recipient_name: 'Andreas Winkler', recipient_email: 'a.winkler@beispiel.at', recipient_phone: null,
    subject: 'Bestätigung Kündigung – Wohnungsübergabe',
    message_body: 'Sehr geehrter Herr Winkler, wir bestätigen den Eingang Ihrer Kündigung zum 31.03.2025. Bitte vereinbaren Sie rechtzeitig einen Übergabetermin.',
    message_type: 'email', status: 'sent', sent_at: '2025-01-12T10:00:00Z', created_by: null, created_at: '2025-01-12T10:00:00Z',
  },
];

// ============ Demo Budgets ============
export interface DemoBudget {
  id: string;
  property_id: string;
  organization_id: string | null;
  year: number;
  status: string | null;
  notes: string | null;
  position_1_name: string | null;
  position_1_amount: number | null;
  position_2_name: string | null;
  position_2_amount: number | null;
  position_3_name: string | null;
  position_3_amount: number | null;
  position_4_name: string | null;
  position_4_amount: number | null;
  position_5_name: string | null;
  position_5_amount: number | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export const mockBudgets: DemoBudget[] = [
  {
    id: 'demo-budget-1', property_id: 'demo-prop-1', organization_id: null,
    year: 2025, status: 'genehmigt',
    notes: 'Jahresbudget genehmigt in EV am 15.12.2024',
    position_1_name: 'Instandhaltung allgemein', position_1_amount: 15000,
    position_2_name: 'Aufzugswartung & Reparatur', position_2_amount: 5000,
    position_3_name: 'Fassade / Fenster', position_3_amount: 8000,
    position_4_name: 'Gartenanlage', position_4_amount: 2500,
    position_5_name: 'Sonstiges / Reserve', position_5_amount: 4500,
    approved_at: '2024-12-15T18:00:00Z', approved_by: null,
    created_at: '2024-11-01T10:00:00Z', updated_at: '2024-12-15T18:00:00Z',
  },
  {
    id: 'demo-budget-2', property_id: 'demo-prop-2', organization_id: null,
    year: 2025, status: 'entwurf',
    notes: 'Entwurf für EV am 20.02.2025',
    position_1_name: 'Allgemeine Instandhaltung', position_1_amount: 22000,
    position_2_name: 'Heizungsanlage', position_2_amount: 8000,
    position_3_name: 'Brandschutz', position_3_amount: 3000,
    position_4_name: 'Dachsanierung (Anteil)', position_4_amount: 15000,
    position_5_name: null, position_5_amount: null,
    approved_at: null, approved_by: null,
    created_at: '2025-01-10T09:00:00Z', updated_at: '2025-01-20T14:00:00Z',
  },
  {
    id: 'demo-budget-3', property_id: 'demo-prop-3', organization_id: null,
    year: 2025, status: 'genehmigt',
    notes: 'Genehmigt am 10.12.2024',
    position_1_name: 'Instandhaltung Altbau', position_1_amount: 12000,
    position_2_name: 'Heizung / Öltank', position_2_amount: 5000,
    position_3_name: 'Fenster-Sanierung', position_3_amount: 6000,
    position_4_name: 'Fassade (Anteil)', position_4_amount: 4000,
    position_5_name: 'Reserve', position_5_amount: 3000,
    approved_at: '2024-12-10T16:00:00Z', approved_by: null,
    created_at: '2024-11-15T09:00:00Z', updated_at: '2024-12-10T16:00:00Z',
  },
];

// ============ Legacy Format Exports (for backwards compatibility) ============
export const mockPropertiesLegacy: Property[] = [
  {
    id: 'prop-1', name: 'Mozartstraße 15', address: 'Mozartstraße 15', city: 'Wien',
    postalCode: '1040', country: 'Österreich', buildingYear: 1965,
    totalUnits: 12, totalQm: 985.5, totalMea: 1000,
    bkAnteilWohnung: 10, bkAnteilGeschaeft: 20, bkAnteilGarage: 20,
    heizungAnteilWohnung: 20, heizungAnteilGeschaeft: 20,
    betriebskostenGesamt: 24500, heizungskostenGesamt: 18200,
    createdAt: new Date('2023-01-15'), updatedAt: new Date('2024-11-20'),
  },
  {
    id: 'prop-2', name: 'Hauptplatz 8', address: 'Hauptplatz 8', city: 'Graz',
    postalCode: '8010', country: 'Österreich', buildingYear: 1988,
    totalUnits: 18, totalQm: 1450.0, totalMea: 1000,
    bkAnteilWohnung: 10, bkAnteilGeschaeft: 20, bkAnteilGarage: 20,
    heizungAnteilWohnung: 20, heizungAnteilGeschaeft: 20,
    betriebskostenGesamt: 38200, heizungskostenGesamt: 28500,
    createdAt: new Date('2022-06-10'), updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'prop-3', name: 'Linzer Gasse 42', address: 'Linzer Gasse 42', city: 'Salzburg',
    postalCode: '5020', country: 'Österreich', buildingYear: 1920,
    totalUnits: 8, totalQm: 620.0, totalMea: 1000,
    bkAnteilWohnung: 10, bkAnteilGeschaeft: 20, bkAnteilGarage: 20,
    heizungAnteilWohnung: 20, heizungAnteilGeschaeft: 20,
    betriebskostenGesamt: 15800, heizungskostenGesamt: 12400,
    createdAt: new Date('2021-03-22'), updatedAt: new Date('2024-10-15'),
  },
];
