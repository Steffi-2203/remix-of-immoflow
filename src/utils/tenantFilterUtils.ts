/**
 * Zentrale Utility-Funktionen für die Mieter-Filterung
 * Stellt sicher, dass SOLL-Berechnungen in allen Reports konsistent sind
 */

interface TenantForFilter {
  id: string;
  unit_id: string;
  status: string;
  mietbeginn: string | null;
  mietende?: string | null;
  grundmiete?: number;
  betriebskosten_vorschuss?: number;
  heizungskosten_vorschuss?: number;
}

interface UnitForFilter {
  id: string;
  property_id: string;
}

/**
 * Prüft ob ein Mieter im gegebenen Zeitraum für SOLL-Berechnungen relevant ist
 * 
 * Regeln:
 * - Mieter muss Status 'aktiv' haben
 * - Mietbeginn muss vorhanden sein
 * - Mietbeginn muss im ausgewählten Zeitraum oder davor liegen
 * - Mietende wird NICHT geprüft (beendete Mieter bekommen anderen Status)
 */
export function isTenantActiveInPeriod(
  tenant: TenantForFilter,
  periodYear: number,
  periodMonth?: number // undefined = yearly
): boolean {
  if (tenant.status !== 'aktiv') return false;
  if (!tenant.mietbeginn) return false;
  
  const mietbeginn = new Date(tenant.mietbeginn);
  const mietbeginnYear = mietbeginn.getFullYear();
  const mietbeginnMonth = mietbeginn.getMonth() + 1;
  
  if (periodMonth === undefined) {
    // Yearly: Mietbeginn muss im Jahr oder davor sein
    return mietbeginnYear <= periodYear;
  } else {
    // Monthly: Mietbeginn muss im Monat oder davor sein
    if (mietbeginnYear < periodYear) return true;
    if (mietbeginnYear === periodYear && mietbeginnMonth <= periodMonth) return true;
    return false;
  }
}

/**
 * Gibt genau EINEN aktiven Mieter pro Unit zurück, gefiltert nach Periode
 * 
 * Wichtig:
 * - Pro Unit kann nur EIN Mieter aktiv sein (keine Duplikate)
 * - Nur Mieter mit Mietbeginn im oder vor dem Zeitraum werden einbezogen
 * - Ein Mieter kann mehrere Units haben (z.B. Geschäft + Garage)
 */
export function getActiveTenantsForPeriod<T extends TenantForFilter>(
  units: UnitForFilter[],
  tenants: T[],
  propertyId: string | 'all',
  periodYear: number,
  periodMonth?: number
): T[] {
  // Filter Units nach Property
  const relevantUnits = propertyId === 'all' 
    ? units 
    : units.filter(u => u.property_id === propertyId);
  
  // Für jede Unit: Finde den aktiven Mieter und prüfe Mietbeginn
  return relevantUnits
    .map(unit => tenants.find(t => t.unit_id === unit.id && t.status === 'aktiv'))
    .filter((t): t is T => t !== null && t !== undefined)
    .filter(t => isTenantActiveInPeriod(t, periodYear, periodMonth));
}

/**
 * Berechnet die monatliche Gesamtmiete eines Mieters
 */
export function calculateMonthlyRent(tenant: TenantForFilter): number {
  return Number(tenant.grundmiete || 0) + 
         Number(tenant.betriebskosten_vorschuss || 0) + 
         Number(tenant.heizungskosten_vorschuss || 0);
}
