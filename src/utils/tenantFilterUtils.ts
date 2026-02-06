/**
 * Zentrale Utility-Funktionen für die Mieter-Filterung
 * Stellt sicher, dass SOLL-Berechnungen in allen Reports konsistent sind
 */

export interface TenantForFilter {
  id: string;
  unit_id: string;
  status: string;
  mietbeginn: string | null;
  mietende?: string | null;
  grundmiete?: number;
  betriebskosten_vorschuss?: number;
  heizungskosten_vorschuss?: number;
  first_name?: string;
  last_name?: string;
}

interface UnitForFilter {
  id: string;
  property_id: string;
}

/**
 * Prüft ob ein Mieter im gegebenen Zeitraum für SOLL-Berechnungen relevant ist
 * 
 * Regeln:
 * - Mieter muss Status 'aktiv' ODER 'beendet' haben (nicht 'leerstand')
 * - Mietbeginn muss VOR oder IM Zeitraum liegen (Mieter mit späterem Mietbeginn werden ausgeschlossen)
 * - Bei 'beendet' Mietern: Mietende muss im oder nach dem Zeitraum liegen
 *   (damit ehemalige Mieter für historische Perioden berücksichtigt werden)
 */
export function isTenantActiveInPeriod(
  tenant: TenantForFilter,
  periodYear: number,
  periodMonth?: number // undefined = yearly
): boolean {
  // Leerstand ist nie relevant
  if (tenant.status === 'leerstand') return false;
  
  // Mietbeginn prüfen - Mieter ist nur relevant wenn Mietbeginn <= Ende des Zeitraums
  if (tenant.mietbeginn) {
    const mietbeginn = new Date(tenant.mietbeginn);
    const mietbeginnYear = mietbeginn.getFullYear();
    const mietbeginnMonth = mietbeginn.getMonth() + 1;
    
    if (periodMonth === undefined) {
      // Yearly: Mietbeginn muss im Jahr oder früher sein
      if (mietbeginnYear > periodYear) return false;
    } else {
      // Monthly: Mietbeginn muss im Monat oder früher sein
      if (mietbeginnYear > periodYear) return false;
      if (mietbeginnYear === periodYear && mietbeginnMonth > periodMonth) return false;
    }
  }
  
  // Aktive Mieter (mit gültigem Mietbeginn) sind relevant
  if (tenant.status === 'aktiv') return true;
  
  // Beendete Mieter: Mietende muss im oder nach dem Zeitraum liegen
  if (tenant.status === 'beendet' && tenant.mietende) {
    const mietende = new Date(tenant.mietende);
    const mietendeYear = mietende.getFullYear();
    const mietendeMonth = mietende.getMonth() + 1;
    
    if (periodMonth === undefined) {
      // Yearly: Mietende muss im Jahr oder später sein
      return mietendeYear >= periodYear;
    } else {
      // Monthly: Mietende muss im Monat oder später sein
      if (mietendeYear > periodYear) return true;
      if (mietendeYear === periodYear && mietendeMonth >= periodMonth) return true;
      return false;
    }
  }
  
  return false;
}

/**
 * Gibt alle relevanten Mieter pro Unit zurück, gefiltert nach Periode
 * 
 * Wichtig:
 * - Pro Unit kann nur EIN Mieter im Zeitraum aktiv gewesen sein
 * - Aktive UND beendete Mieter werden berücksichtigt (für historische Perioden)
 * - Mietbeginn muss VOR oder IM Zeitraum liegen (Mieter mit späterem Mietbeginn ausgeschlossen)
 * - Bei beendeten Mietern: Mietende muss im oder nach dem Zeitraum liegen
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
  
  const relevantTenants: T[] = [];
  
  // Für jede Unit: Finde Mieter die im Zeitraum aktiv waren
  relevantUnits.forEach(unit => {
    // Alle Mieter dieser Unit die im Zeitraum aktiv waren
    const unitTenants = tenants.filter(t => 
      t.unit_id === unit.id && isTenantActiveInPeriod(t, periodYear, periodMonth)
    );
    
    // Normalerweise sollte nur ein Mieter pro Unit im Zeitraum aktiv sein
    // Bei Überschneidungen (sollte nicht passieren) nehmen wir den aktiven zuerst
    unitTenants.sort((a, b) => {
      if (a.status === 'aktiv' && b.status !== 'aktiv') return -1;
      if (a.status !== 'aktiv' && b.status === 'aktiv') return 1;
      return 0;
    });
    
    if (unitTenants.length > 0) {
      relevantTenants.push(unitTenants[0]);
    }
  });
  
  return relevantTenants;
}

/**
 * Berechnet die monatliche Gesamtmiete eines Mieters
 */
export function calculateMonthlyRent(tenant: TenantForFilter): number {
  return Number(tenant.grundmiete || 0) + 
         Number(tenant.betriebskosten_vorschuss || 0) + 
         Number(tenant.heizungskosten_vorschuss || 0);
}
