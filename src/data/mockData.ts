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
  // Additional fields from Supabase schema
  baubewilligung_nach_1945: boolean | null;
  baubewilligung_nach_1953: boolean | null;
  baujahr_mrg: number | null;
  foerderung_erhalten: boolean | null;
  richtwert_bundesland: string | null;
  stichtag_mrg: string | null;
  marktwert: number | null;
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
  [key: string]: any; // Allow additional vs_* fields
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

// ============ Mock Properties (Demo-Format) ============
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
    marktwert: null,
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
    marktwert: null,
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
    marktwert: null,
    created_at: '2021-03-22T08:00:00Z',
    updated_at: '2024-10-15T16:00:00Z',
  },
];

// ============ Mock Units ============
export const mockUnits: DemoUnit[] = [
  {
    id: 'demo-unit-1',
    property_id: 'demo-prop-1',
    top_nummer: 'Top 1',
    type: 'geschaeft',
    floor: 0,
    qm: 120.5,
    mea: 122,
    status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-2',
    property_id: 'demo-prop-1',
    top_nummer: 'Top 2',
    type: 'wohnung',
    floor: 1,
    qm: 78.0,
    mea: 79,
    status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-3',
    property_id: 'demo-prop-1',
    top_nummer: 'Top 3',
    type: 'wohnung',
    floor: 1,
    qm: 65.5,
    mea: 66,
    status: 'leerstand',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-12-20T09:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-4',
    property_id: 'demo-prop-1',
    top_nummer: 'Top 4',
    type: 'wohnung',
    floor: 2,
    qm: 92.0,
    mea: 93,
    status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-unit-5',
    property_id: 'demo-prop-1',
    top_nummer: 'Garage 1',
    type: 'garage',
    floor: -1,
    qm: 15.0,
    mea: 15,
    status: 'aktiv',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
];

// ============ Mock Tenants ============
export const mockTenants: DemoTenant[] = [
  {
    id: 'demo-tenant-1',
    unit_id: 'demo-unit-1',
    first_name: 'Café',
    last_name: 'Amadeus GmbH',
    email: 'office@cafe-amadeus.at',
    phone: '+43 1 234 5678',
    mietbeginn: '2020-03-01',
    mietende: null,
    kaution: 7500,
    kaution_bezahlt: true,
    grundmiete: 2850,
    betriebskosten_vorschuss: 420,
    heizungskosten_vorschuss: 280,
    vorschuss_gueltig_ab: null,
    sepa_mandat: true,
    iban: 'AT611904300234573201',
    bic: 'BKAUATWW',
    mandat_reference: 'SEPA-2020-001',
    status: 'aktiv',
    created_at: '2020-02-15T10:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
  },
  {
    id: 'demo-tenant-2',
    unit_id: 'demo-unit-2',
    first_name: 'Maria',
    last_name: 'Huber',
    email: 'maria.huber@email.at',
    phone: '+43 664 123 4567',
    mietbeginn: '2021-07-01',
    mietende: null,
    kaution: 2340,
    kaution_bezahlt: true,
    grundmiete: 780,
    betriebskosten_vorschuss: 145,
    heizungskosten_vorschuss: 95,
    vorschuss_gueltig_ab: null,
    sepa_mandat: true,
    iban: 'AT483200000012345678',
    bic: 'RLNWATWW',
    mandat_reference: 'SEPA-2021-015',
    status: 'aktiv',
    created_at: '2021-06-15T09:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
  },
  {
    id: 'demo-tenant-3',
    unit_id: 'demo-unit-4',
    first_name: 'Familie',
    last_name: 'Müller',
    email: 'mueller.familie@gmx.at',
    phone: '+43 699 987 6543',
    mietbeginn: '2019-01-01',
    mietende: null,
    kaution: 2760,
    kaution_bezahlt: true,
    grundmiete: 920,
    betriebskosten_vorschuss: 185,
    heizungskosten_vorschuss: 125,
    vorschuss_gueltig_ab: null,
    sepa_mandat: false,
    iban: null,
    bic: null,
    mandat_reference: null,
    status: 'aktiv',
    created_at: '2018-12-10T08:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
  },
  {
    id: 'demo-tenant-4',
    unit_id: 'demo-unit-5',
    first_name: 'Thomas',
    last_name: 'Wagner',
    email: 'thomas.wagner@outlook.at',
    phone: null,
    mietbeginn: '2022-04-01',
    mietende: null,
    kaution: 450,
    kaution_bezahlt: true,
    grundmiete: 150,
    betriebskosten_vorschuss: 25,
    heizungskosten_vorschuss: 0,
    vorschuss_gueltig_ab: null,
    sepa_mandat: true,
    iban: 'AT891400027011111111',
    bic: 'BAWAATWW',
    mandat_reference: 'SEPA-2022-008',
    status: 'aktiv',
    created_at: '2022-03-20T11:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
  },
];

// ============ Mock Transactions ============
export const mockTransactions: DemoTransaction[] = [
  {
    id: 'demo-tx-1',
    bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-15',
    valuta_date: '2025-01-15',
    amount: 3550,
    currency: 'EUR',
    description: 'Miete Jänner 2025 - Café Amadeus',
    counterparty_name: 'Café Amadeus GmbH',
    counterparty_iban: 'AT611904300234573201',
    reference: 'Miete Top 1 01/2025',
    status: 'matched',
    property_id: 'demo-prop-1',
    unit_id: 'demo-unit-1',
    tenant_id: 'demo-tenant-1',
    category_id: null,
    matched_at: '2025-01-15T10:00:00Z',
    created_at: '2025-01-15T08:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'demo-tx-2',
    bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-14',
    valuta_date: '2025-01-14',
    amount: 1020,
    currency: 'EUR',
    description: 'Miete Jänner - Huber Maria',
    counterparty_name: 'Maria Huber',
    counterparty_iban: 'AT483200000012345678',
    reference: 'Miete 01/2025',
    status: 'matched',
    property_id: 'demo-prop-1',
    unit_id: 'demo-unit-2',
    tenant_id: 'demo-tenant-2',
    category_id: null,
    matched_at: '2025-01-14T12:00:00Z',
    created_at: '2025-01-14T09:00:00Z',
    updated_at: '2025-01-14T12:00:00Z',
  },
  {
    id: 'demo-tx-3',
    bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-10',
    valuta_date: '2025-01-10',
    amount: -1250.50,
    currency: 'EUR',
    description: 'Wien Energie - Strom Allgemein',
    counterparty_name: 'Wien Energie GmbH',
    counterparty_iban: 'AT123456789012345678',
    reference: 'Rechnung 2025-001234',
    status: 'matched',
    property_id: 'demo-prop-1',
    unit_id: null,
    tenant_id: null,
    category_id: null,
    matched_at: '2025-01-10T14:00:00Z',
    created_at: '2025-01-10T08:00:00Z',
    updated_at: '2025-01-10T14:00:00Z',
  },
  {
    id: 'demo-tx-4',
    bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-08',
    valuta_date: '2025-01-08',
    amount: 1230,
    currency: 'EUR',
    description: 'Miete Familie Müller',
    counterparty_name: 'Max Müller',
    counterparty_iban: 'AT999999999999999999',
    reference: 'Jänner Miete',
    status: 'matched',
    property_id: 'demo-prop-1',
    unit_id: 'demo-unit-4',
    tenant_id: 'demo-tenant-3',
    category_id: null,
    matched_at: '2025-01-08T16:00:00Z',
    created_at: '2025-01-08T09:00:00Z',
    updated_at: '2025-01-08T16:00:00Z',
  },
  {
    id: 'demo-tx-5',
    bank_account_id: 'demo-bank-1',
    transaction_date: '2025-01-05',
    valuta_date: '2025-01-05',
    amount: -890,
    currency: 'EUR',
    description: 'Hausbetreuung Meier',
    counterparty_name: 'Hausbetreuung Meier GmbH',
    counterparty_iban: 'AT555555555555555555',
    reference: 'Reinigung 01/2025',
    status: 'unmatched',
    property_id: null,
    unit_id: null,
    tenant_id: null,
    category_id: null,
    matched_at: null,
    created_at: '2025-01-05T07:00:00Z',
    updated_at: '2025-01-05T07:00:00Z',
  },
];

// ============ Mock Expenses ============
export const mockExpenses: DemoExpense[] = [
  {
    id: 'demo-exp-1',
    property_id: 'demo-prop-1',
    category: 'betriebskosten_umlagefaehig',
    expense_type: 'strom_allgemein',
    bezeichnung: 'Strom Allgemeinbereich Q4/2024',
    betrag: 1250.50,
    datum: '2025-01-10',
    beleg_nummer: 'WE-2025-001234',
    beleg_url: null,
    notizen: 'Quartalsabrechnung Wien Energie',
    year: 2025,
    month: 1,
    transaction_id: 'demo-tx-3',
    created_at: '2025-01-10T14:00:00Z',
    updated_at: '2025-01-10T14:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-exp-2',
    property_id: 'demo-prop-1',
    category: 'betriebskosten_umlagefaehig',
    expense_type: 'hausbetreuung',
    bezeichnung: 'Hausbetreuung Jänner 2025',
    betrag: 890,
    datum: '2025-01-05',
    beleg_nummer: 'HB-2025-001',
    beleg_url: null,
    notizen: null,
    year: 2025,
    month: 1,
    transaction_id: null,
    created_at: '2025-01-05T10:00:00Z',
    updated_at: '2025-01-05T10:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-exp-3',
    property_id: 'demo-prop-1',
    category: 'instandhaltung',
    expense_type: 'reparatur',
    bezeichnung: 'Reparatur Aufzug',
    betrag: 2350,
    datum: '2024-12-15',
    beleg_nummer: 'REP-2024-089',
    beleg_url: null,
    notizen: 'Austausch Steuerungselektronik',
    year: 2024,
    month: 12,
    transaction_id: null,
    created_at: '2024-12-15T11:00:00Z',
    updated_at: '2024-12-15T11:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-exp-4',
    property_id: 'demo-prop-2',
    category: 'betriebskosten_umlagefaehig',
    expense_type: 'versicherung',
    bezeichnung: 'Gebäudeversicherung 2025',
    betrag: 4850,
    datum: '2025-01-02',
    beleg_nummer: 'VERS-2025-001',
    beleg_url: null,
    notizen: 'Jahresprämie',
    year: 2025,
    month: 1,
    transaction_id: null,
    created_at: '2025-01-02T09:00:00Z',
    updated_at: '2025-01-02T09:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
];

// ============ Mock Payments ============
export const mockPayments: DemoPayment[] = [
  {
    id: 'demo-pay-1',
    tenant_id: 'demo-tenant-1',
    invoice_id: null,
    betrag: 3550,
    eingangs_datum: '2025-01-15',
    buchungs_datum: '2025-01-15',
    zahlungsart: 'ueberweisung',
    referenz: 'Miete Top 1 01/2025',
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'demo-pay-2',
    tenant_id: 'demo-tenant-2',
    invoice_id: null,
    betrag: 1020,
    eingangs_datum: '2025-01-14',
    buchungs_datum: '2025-01-14',
    zahlungsart: 'lastschrift',
    referenz: 'SEPA-2021-015 01/2025',
    created_at: '2025-01-14T09:00:00Z',
  },
  {
    id: 'demo-pay-3',
    tenant_id: 'demo-tenant-3',
    invoice_id: null,
    betrag: 1230,
    eingangs_datum: '2025-01-08',
    buchungs_datum: '2025-01-08',
    zahlungsart: 'ueberweisung',
    referenz: 'Jänner Miete',
    created_at: '2025-01-08T09:00:00Z',
  },
  {
    id: 'demo-pay-4',
    tenant_id: 'demo-tenant-4',
    invoice_id: null,
    betrag: 175,
    eingangs_datum: '2025-01-03',
    buchungs_datum: '2025-01-03',
    zahlungsart: 'lastschrift',
    referenz: 'SEPA-2022-008 01/2025',
    created_at: '2025-01-03T08:00:00Z',
  },
];

// ============ Mock Bank Accounts ============
export const mockBankAccounts: DemoBankAccount[] = [
  {
    id: 'demo-bank-1',
    account_name: 'Hausverwaltung Hauptkonto',
    bank_name: 'Erste Bank',
    iban: 'AT611904300234573201',
    bic: 'GIBAATWWXXX',
    opening_balance: 15000,
    opening_balance_date: '2024-01-01',
    current_balance: 28450.50,
    property_id: null,
    organization_id: null,
    last_synced_at: '2025-01-20T10:00:00Z',
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2025-01-20T10:00:00Z',
  },
  {
    id: 'demo-bank-2',
    account_name: 'Rücklagenkonto Mozartstraße',
    bank_name: 'Raiffeisen',
    iban: 'AT483200000012345678',
    bic: 'RLNWATWWXXX',
    opening_balance: 50000,
    opening_balance_date: '2023-01-01',
    current_balance: 72350,
    property_id: 'demo-prop-1',
    organization_id: null,
    last_synced_at: '2025-01-15T14:00:00Z',
    created_at: '2023-01-01T08:00:00Z',
    updated_at: '2025-01-15T14:00:00Z',
  },
];

// ============ Mock Maintenance Tasks ============
export const mockMaintenanceTasks: DemoMaintenanceTask[] = [
  {
    id: 'demo-task-1',
    organization_id: null,
    property_id: 'demo-prop-1',
    unit_id: null,
    title: 'Aufzugswartung Q1/2025',
    description: 'Reguläre Quartalswartung des Personenaufzugs',
    category: 'maintenance',
    priority: 'medium',
    status: 'open',
    assigned_to: null,
    contractor_name: 'Schindler Aufzüge GmbH',
    contractor_contact: '+43 1 89012345',
    due_date: '2025-02-15',
    completed_at: null,
    estimated_cost: 450,
    actual_cost: null,
    created_by: null,
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-10T09:00:00Z',
    properties: { name: 'Mozartstraße 15' },
  },
  {
    id: 'demo-task-2',
    organization_id: null,
    property_id: 'demo-prop-1',
    unit_id: 'demo-unit-3',
    title: 'Renovierung für Neuvermietung',
    description: 'Ausmalen und neuer Boden für Top 3 nach Mieterwechsel',
    category: 'repair',
    priority: 'high',
    status: 'in_progress',
    assigned_to: null,
    contractor_name: 'Maler Huber',
    contractor_contact: 'office@malerhuber.at',
    due_date: '2025-01-31',
    completed_at: null,
    estimated_cost: 3500,
    actual_cost: null,
    created_by: null,
    created_at: '2025-01-05T11:00:00Z',
    updated_at: '2025-01-18T14:00:00Z',
    properties: { name: 'Mozartstraße 15' },
    units: { top_nummer: 'Top 3' },
  },
  {
    id: 'demo-task-3',
    organization_id: null,
    property_id: 'demo-prop-2',
    unit_id: null,
    title: 'Brandschutzüberprüfung',
    description: 'Jährliche Überprüfung der Brandschutzeinrichtungen',
    category: 'inspection',
    priority: 'urgent',
    status: 'pending_approval',
    assigned_to: null,
    contractor_name: 'Brandschutz Austria',
    contractor_contact: '+43 316 123456',
    due_date: '2025-01-25',
    completed_at: null,
    estimated_cost: 680,
    actual_cost: 720,
    created_by: null,
    created_at: '2024-12-20T10:00:00Z',
    updated_at: '2025-01-20T09:00:00Z',
    properties: { name: 'Hauptplatz 8' },
  },
  {
    id: 'demo-task-4',
    organization_id: null,
    property_id: 'demo-prop-3',
    unit_id: null,
    title: 'Heizungsservice Dezember',
    description: 'Jährliches Service der Zentralheizung',
    category: 'maintenance',
    priority: 'medium',
    status: 'completed',
    assigned_to: null,
    contractor_name: 'Installateur Berger',
    contractor_contact: '+43 662 987654',
    due_date: '2024-12-15',
    completed_at: '2024-12-12T15:00:00Z',
    estimated_cost: 320,
    actual_cost: 295,
    created_by: null,
    created_at: '2024-11-20T08:00:00Z',
    updated_at: '2024-12-12T15:00:00Z',
    properties: { name: 'Linzer Gasse 42' },
  },
];

// ============ Dashboard Statistics ============
export const mockDashboardStats: DashboardStats = {
  totalProperties: 3,
  totalUnits: 38,
  occupiedUnits: 34,
  vacantUnits: 4,
  totalTenants: 34,
  monthlyRevenue: 45680,
  monthlyBetriebskosten: 6540,
  openInvoices: 5,
  overdueAmount: 2340,
};

// ============ Legacy Format Exports (for backwards compatibility) ============
export const mockPropertiesLegacy: Property[] = [
  {
    id: 'prop-1',
    name: 'Mozartstraße 15',
    address: 'Mozartstraße 15',
    city: 'Wien',
    postalCode: '1040',
    country: 'Österreich',
    buildingYear: 1965,
    totalUnits: 12,
    totalQm: 985.5,
    totalMea: 1000,
    bkAnteilWohnung: 10,
    bkAnteilGeschaeft: 20,
    bkAnteilGarage: 20,
    heizungAnteilWohnung: 20,
    heizungAnteilGeschaeft: 20,
    betriebskostenGesamt: 24500,
    heizungskostenGesamt: 18200,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-11-20'),
  },
  {
    id: 'prop-2',
    name: 'Hauptplatz 8',
    address: 'Hauptplatz 8',
    city: 'Graz',
    postalCode: '8010',
    country: 'Österreich',
    buildingYear: 1988,
    totalUnits: 18,
    totalQm: 1450.0,
    totalMea: 1000,
    bkAnteilWohnung: 10,
    bkAnteilGeschaeft: 20,
    bkAnteilGarage: 20,
    heizungAnteilWohnung: 20,
    heizungAnteilGeschaeft: 20,
    betriebskostenGesamt: 38200,
    heizungskostenGesamt: 28500,
    createdAt: new Date('2022-06-10'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'prop-3',
    name: 'Linzer Gasse 42',
    address: 'Linzer Gasse 42',
    city: 'Salzburg',
    postalCode: '5020',
    country: 'Österreich',
    buildingYear: 1920,
    totalUnits: 8,
    totalQm: 620.0,
    totalMea: 1000,
    bkAnteilWohnung: 10,
    bkAnteilGeschaeft: 20,
    bkAnteilGarage: 20,
    heizungAnteilWohnung: 20,
    heizungAnteilGeschaeft: 20,
    betriebskostenGesamt: 15800,
    heizungskostenGesamt: 12400,
    createdAt: new Date('2021-03-22'),
    updatedAt: new Date('2024-10-15'),
  },
];
