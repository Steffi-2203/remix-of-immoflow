import { db } from './db';
import { 
  properties, units, tenants, monthlyInvoices, expenses, 
  settlements, settlementDetails, owners, propertyOwners 
} from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface TenantShare {
  tenantId: string;
  tenantName: string;
  unitId: string;
  topNummer: string;
  nutzwert: number;
  monate: number;
  anteil: number;
  ausgabenAnteil: number;
  vorschuss: number;
  differenz: number;
}

interface SettlementResult {
  settlementId: string;
  year: number;
  propertyName: string;
  gesamtausgaben: number;
  gesamtvorschuss: number;
  differenz: number;
  leerstandskosten: number;
  eigentuemer: string;
  tenantShares: TenantShare[];
}

interface UstResult {
  year: number;
  eingangsUst: number;
  ausgangsUst: number;
  zahllast: number;
  details: {
    mieteUst: number;
    bkUst: number;
    hkUst: number;
    vorsteuerBk: number;
    vorsteuerInstandhaltung: number;
  };
}

export async function createSettlement2025(): Promise<SettlementResult> {
  console.log('📊 Berechne Betriebskostenabrechnung 2025...');

  const [property] = await db.select().from(properties)
    .where(eq(properties.name, 'Musterhaus Simulation 2025'));
  
  if (!property) {
    throw new Error('Liegenschaft nicht gefunden');
  }

  const propertyUnits = await db.select().from(units)
    .where(eq(units.propertyId, property.id));

  const allTenants = await db.select().from(tenants)
    .where(sql`${tenants.unitId} IN (${sql.join(propertyUnits.map(u => sql`${u.id}`), sql`, `)})`);

  const bkExpenses = await db.select().from(expenses)
    .where(and(
      eq(expenses.propertyId, property.id),
      eq(expenses.category, 'betriebskosten_umlagefaehig'),
      eq(expenses.year, 2025)
    ));

  const totalBK = bkExpenses.reduce((sum, e) => sum + parseFloat(e.betrag || '0'), 0);
  console.log(`   Gesamte Betriebskosten: €${totalBK.toFixed(2)}`);

  const invoices2025 = await db.select().from(monthlyInvoices)
    .where(and(
      eq(monthlyInvoices.year, 2025),
      sql`${monthlyInvoices.unitId} IN (${sql.join(propertyUnits.map(u => sql`${u.id}`), sql`, `)})`
    ));

  const totalVorschuss = invoices2025.reduce((sum, i) => sum + parseFloat(i.betriebskosten || '0'), 0);
  console.log(`   Gesamte Vorschüsse: €${totalVorschuss.toFixed(2)}`);

  const totalNutzwert = propertyUnits.reduce((sum, u) => sum + parseFloat(u.nutzwert || '0'), 0);
  console.log(`   Gesamter Nutzwert: ${(totalNutzwert * 100).toFixed(2)}%`);

  const tenantShares: TenantShare[] = [];
  let totalTenantShare = 0;

  for (const unit of propertyUnits) {
    const unitTenants = allTenants.filter(t => t.unitId === unit.id);
    const unitNutzwert = parseFloat(unit.nutzwert || '0');
    const unitShare = unitNutzwert / totalNutzwert;

    for (const tenant of unitTenants) {
      const mietbeginn = tenant.mietbeginn ? new Date(tenant.mietbeginn) : new Date('2025-01-01');
      const mietende = tenant.mietende ? new Date(tenant.mietende) : new Date('2025-12-31');
      
      const startMonth = mietbeginn.getFullYear() < 2025 ? 1 : mietbeginn.getMonth() + 1;
      const endMonth = mietende.getFullYear() > 2025 ? 12 : mietende.getMonth() + 1;
      
      const monate = Math.max(0, endMonth - startMonth + 1);
      const zeitAnteil = monate / 12;
      const anteil = unitShare * zeitAnteil;
      
      const tenantInvoices = invoices2025.filter(i => i.tenantId === tenant.id);
      const vorschuss = tenantInvoices.reduce((sum, i) => sum + parseFloat(i.betriebskosten || '0'), 0);
      
      const ausgabenAnteil = totalBK * anteil;
      const differenz = vorschuss - ausgabenAnteil;

      totalTenantShare += anteil;

      tenantShares.push({
        tenantId: tenant.id,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        unitId: unit.id,
        topNummer: unit.topNummer,
        nutzwert: unitNutzwert,
        monate,
        anteil: anteil * 100,
        ausgabenAnteil,
        vorschuss,
        differenz,
      });
    }
  }

  const leerstandsAnteil = 1 - totalTenantShare;
  const leerstandskosten = totalBK * leerstandsAnteil;
  
  console.log(`\n   Leerstandskosten (Eigentümer): €${leerstandskosten.toFixed(2)} (${(leerstandsAnteil * 100).toFixed(2)}%)`);

  const [ownerLink] = await db.select().from(propertyOwners)
    .where(eq(propertyOwners.propertyId, property.id));
  
  let ownerName = 'Unbekannt';
  if (ownerLink) {
    const [owner] = await db.select().from(owners)
      .where(eq(owners.id, ownerLink.ownerId));
    if (owner) {
      ownerName = `${owner.firstName} ${owner.lastName}`;
    }
  }

  const [settlement] = await db.insert(settlements).values({
    propertyId: property.id,
    year: 2025,
    status: 'berechnet',
    gesamtausgaben: totalBK.toFixed(2),
    gesamtvorschuss: totalVorschuss.toFixed(2),
    differenz: (totalVorschuss - totalBK).toFixed(2),
    berechnungsDatum: new Date(),
    notes: `Leerstandskosten: €${leerstandskosten.toFixed(2)} gehen auf Eigentümer ${ownerName}`,
  }).returning();

  console.log(`\n✅ Settlement erstellt: ${settlement.id}`);

  for (const share of tenantShares) {
    await db.insert(settlementDetails).values({
      settlementId: settlement.id,
      tenantId: share.tenantId,
      unitId: share.unitId,
      anteil: (share.anteil / 100).toFixed(4),
      ausgabenAnteil: share.ausgabenAnteil.toFixed(2),
      vorschuss: share.vorschuss.toFixed(2),
      differenz: share.differenz.toFixed(2),
    });
  }

  console.log(`✅ ${tenantShares.length} Mieter-Details erstellt`);

  return {
    settlementId: settlement.id,
    year: 2025,
    propertyName: property.name,
    gesamtausgaben: totalBK,
    gesamtvorschuss: totalVorschuss,
    differenz: totalVorschuss - totalBK,
    leerstandskosten,
    eigentuemer: ownerName,
    tenantShares,
  };
}

export async function calculateUST2025(): Promise<UstResult> {
  console.log('\n📊 Berechne UST-Voranmeldung 2025...');

  const [property] = await db.select().from(properties)
    .where(eq(properties.name, 'Musterhaus Simulation 2025'));
  
  if (!property) {
    throw new Error('Liegenschaft nicht gefunden');
  }

  const propertyUnits = await db.select().from(units)
    .where(eq(units.propertyId, property.id));

  const invoices2025 = await db.select().from(monthlyInvoices)
    .where(and(
      eq(monthlyInvoices.year, 2025),
      sql`${monthlyInvoices.unitId} IN (${sql.join(propertyUnits.map(u => sql`${u.id}`), sql`, `)})`
    ));

  let mieteNetto = 0;
  let bkNetto = 0;
  let hkNetto = 0;
  let mieteUst = 0;
  let bkUst = 0;
  let hkUst = 0;

  for (const invoice of invoices2025) {
    const grundmiete = parseFloat(invoice.grundmiete || '0');
    const betriebskosten = parseFloat(invoice.betriebskosten || '0');
    const heizungskosten = parseFloat(invoice.heizungskosten || '0');
    
    const ustSatzMiete = (invoice.ustSatzMiete || 10) / 100;
    const ustSatzBk = (invoice.ustSatzBk || 10) / 100;
    const ustSatzHeizung = (invoice.ustSatzHeizung || 20) / 100;
    
    mieteNetto += grundmiete;
    bkNetto += betriebskosten;
    hkNetto += heizungskosten;
    
    mieteUst += grundmiete * ustSatzMiete;
    bkUst += betriebskosten * ustSatzBk;
    hkUst += heizungskosten * ustSatzHeizung;
  }

  const ausgangsUst = mieteUst + bkUst + hkUst;

  const allExpenses = await db.select().from(expenses)
    .where(and(
      eq(expenses.propertyId, property.id),
      eq(expenses.year, 2025)
    ));

  let vorsteuerBk = 0;
  let vorsteuerInstandhaltung = 0;

  for (const expense of allExpenses) {
    const betrag = parseFloat(expense.betrag || '0');
    const ustSatz = expense.category === 'instandhaltung' ? 0.20 : 0.20;
    const vorsteuer = betrag * ustSatz / (1 + ustSatz);
    
    if (expense.category === 'instandhaltung') {
      vorsteuerInstandhaltung += vorsteuer;
    } else {
      vorsteuerBk += vorsteuer;
    }
  }

  const eingangsUst = vorsteuerBk + vorsteuerInstandhaltung;
  const zahllast = ausgangsUst - eingangsUst;

  console.log(`\n   === AUSGANGS-UST (Mieteinnahmen) ===`);
  console.log(`   Miete netto: €${mieteNetto.toFixed(2)} → UST 10%: €${mieteUst.toFixed(2)}`);
  console.log(`   BK netto: €${bkNetto.toFixed(2)} → UST 10%: €${bkUst.toFixed(2)}`);
  console.log(`   HK netto: €${hkNetto.toFixed(2)} → UST 20%: €${hkUst.toFixed(2)}`);
  console.log(`   SUMME Ausgangs-UST: €${ausgangsUst.toFixed(2)}`);
  
  console.log(`\n   === EINGANGS-UST (Vorsteuer) ===`);
  console.log(`   Vorsteuer aus Betriebskosten: €${vorsteuerBk.toFixed(2)}`);
  console.log(`   Vorsteuer aus Instandhaltung: €${vorsteuerInstandhaltung.toFixed(2)}`);
  console.log(`   SUMME Eingangs-UST: €${eingangsUst.toFixed(2)}`);
  
  console.log(`\n   === ZAHLLAST ===`);
  console.log(`   ${zahllast >= 0 ? 'Zahllast' : 'Guthaben'}: €${Math.abs(zahllast).toFixed(2)}`);

  return {
    year: 2025,
    eingangsUst,
    ausgangsUst,
    zahllast,
    details: {
      mieteUst,
      bkUst,
      hkUst,
      vorsteuerBk,
      vorsteuerInstandhaltung,
    },
  };
}

export async function runFullSettlement() {
  const settlement = await createSettlement2025();
  const ust = await calculateUST2025();
  
  console.log('\n' + '='.repeat(60));
  console.log('BETRIEBSKOSTENABRECHNUNG 2025');
  console.log('='.repeat(60));
  console.log(`Liegenschaft: ${settlement.propertyName}`);
  console.log(`Gesamtausgaben BK: €${settlement.gesamtausgaben.toFixed(2)}`);
  console.log(`Gesamte Vorschüsse: €${settlement.gesamtvorschuss.toFixed(2)}`);
  console.log(`Differenz: €${settlement.differenz.toFixed(2)}`);
  console.log(`Leerstandskosten → ${settlement.eigentuemer}: €${settlement.leerstandskosten.toFixed(2)}`);
  
  console.log('\n--- MIETER-ABRECHNUNG ---');
  for (const share of settlement.tenantShares) {
    const status = share.differenz >= 0 ? 'GUTHABEN' : 'NACHZAHLUNG';
    console.log(`${share.topNummer} - ${share.tenantName}:`);
    console.log(`   ${share.monate} Monate, Anteil: ${share.anteil.toFixed(2)}%`);
    console.log(`   Kosten: €${share.ausgabenAnteil.toFixed(2)}, Vorschuss: €${share.vorschuss.toFixed(2)}`);
    console.log(`   ${status}: €${Math.abs(share.differenz).toFixed(2)}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('UST-VORANMELDUNG 2025');
  console.log('='.repeat(60));
  console.log(`Ausgangs-UST (Mieteinnahmen): €${ust.ausgangsUst.toFixed(2)}`);
  console.log(`   - davon Miete (10%): €${ust.details.mieteUst.toFixed(2)}`);
  console.log(`   - davon BK (10%): €${ust.details.bkUst.toFixed(2)}`);
  console.log(`   - davon HK (20%): €${ust.details.hkUst.toFixed(2)}`);
  console.log(`Eingangs-UST (Vorsteuer): €${ust.eingangsUst.toFixed(2)}`);
  console.log(`   - aus Betriebskosten: €${ust.details.vorsteuerBk.toFixed(2)}`);
  console.log(`   - aus Instandhaltung: €${ust.details.vorsteuerInstandhaltung.toFixed(2)}`);
  console.log(`\n${ust.zahllast >= 0 ? 'ZAHLLAST' : 'GUTHABEN'}: €${Math.abs(ust.zahllast).toFixed(2)}`);
  
  return { settlement, ust };
}
