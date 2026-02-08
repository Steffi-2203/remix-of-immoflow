/**
 * Configurable VAT rates and billing rules.
 * Previously hardcoded in InvoiceGenerator and InvoiceService.
 * 
 * Austrian MRG/WGG defaults:
 * - Wohnung: 10% Miete/BK, 20% HK
 * - Geschäft/Garage/Stellplatz/Lager: 20% auf alles
 */

export interface VatProfile {
  ustSatzMiete: number;
  ustSatzBk: number;
  ustSatzHeizung: number;
}

export interface BillingRules {
  /** Monthly due day (default: 5th) */
  dueDay: number;
  /** Safety reserve multiplier for advance adjustments (MRG-konform: 1.03 = 3%) */
  advanceReserveMultiplier: number;
  /** Line types that trigger invoice lines */
  lineTypes: LineTypeConfig[];
}

export interface LineTypeConfig {
  key: string;
  label: string;
  /** Field on tenant to read the amount from */
  tenantField: string;
  /** Which VAT rate key to use from VatProfile */
  vatKey: keyof VatProfile;
  /** MRG/legal reference */
  reference: string;
  /** Description template. Placeholders: {monthName}, {year} */
  descriptionTemplate: string;
}

/** Commercial unit types that get 20% on everything */
const COMMERCIAL_TYPES = ['geschaeft', 'garage', 'stellplatz', 'lager', 'gewerbe', 'buero'];

/**
 * Resolve VAT profile for a unit type.
 * Can be extended with per-organization overrides.
 */
export function resolveVatProfile(unitType: string, _organizationOverrides?: Partial<VatProfile>): VatProfile {
  const normalized = (unitType || 'wohnung').toLowerCase();
  const isCommercial = COMMERCIAL_TYPES.some(t => normalized.includes(t));

  const base: VatProfile = {
    ustSatzMiete: isCommercial ? 20 : 10,
    ustSatzBk: isCommercial ? 20 : 10,
    ustSatzHeizung: 20,
  };

  if (_organizationOverrides) {
    return { ...base, ..._organizationOverrides };
  }

  return base;
}

/** Default billing rules (Austrian market) */
export const DEFAULT_BILLING_RULES: BillingRules = {
  dueDay: 5,
  advanceReserveMultiplier: 1.03,
  lineTypes: [
    {
      key: 'grundmiete',
      label: 'Nettomiete',
      tenantField: 'grundmiete',
      vatKey: 'ustSatzMiete',
      reference: 'MRG §15',
      descriptionTemplate: 'Nettomiete {monthName} {year}',
    },
    {
      key: 'betriebskosten',
      label: 'BK-Vorschuss',
      tenantField: 'betriebskostenVorschuss',
      vatKey: 'ustSatzBk',
      reference: 'MRG §21',
      descriptionTemplate: 'BK-Vorschuss {monthName} {year}',
    },
    {
      key: 'heizkosten',
      label: 'HK-Vorschuss',
      tenantField: 'heizkostenVorschuss',
      vatKey: 'ustSatzHeizung',
      reference: 'HeizKG',
      descriptionTemplate: 'HK-Vorschuss {monthName} {year}',
    },
    {
      key: 'wasserkosten',
      label: 'Wasserkosten-Vorschuss',
      tenantField: 'wasserkostenVorschuss',
      vatKey: 'ustSatzBk',
      reference: 'MRG §21',
      descriptionTemplate: 'Wasserkosten-Vorschuss {monthName} {year}',
    },
  ],
};

const MONTH_NAMES = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

/**
 * Render a description template with month/year placeholders.
 */
export function renderDescription(template: string, month: number, year: number): string {
  return template
    .replace('{monthName}', MONTH_NAMES[month - 1] || '')
    .replace('{year}', String(year));
}

/**
 * Check if a unit type is commercial.
 */
export function isCommercialUnit(unitType: string): boolean {
  const normalized = (unitType || '').toLowerCase();
  return COMMERCIAL_TYPES.some(t => normalized.includes(t));
}
