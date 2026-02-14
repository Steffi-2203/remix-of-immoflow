import { db } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { roundMoney } from "@shared/utils";

export async function createKaution(data: {
  organizationId: string;
  tenantId: string;
  unitId: string;
  leaseId?: string;
  betrag: string;
  eingangsdatum?: string;
  treuhandkontoIban?: string;
  treuhandkontoBank?: string;
  zinssatz?: string;
  notes?: string;
}) {
  const betrag = parseFloat(data.betrag);
  if (!betrag || betrag <= 0) {
    throw new Error("Kautionsbetrag muss größer als 0 sein");
  }

  const [kaution] = await db.insert(schema.kautionen).values({
    organizationId: data.organizationId,
    tenantId: data.tenantId,
    unitId: data.unitId,
    leaseId: data.leaseId || null,
    betrag: String(roundMoney(betrag)),
    eingangsdatum: data.eingangsdatum || null,
    treuhandkontoIban: data.treuhandkontoIban || null,
    treuhandkontoBank: data.treuhandkontoBank || null,
    zinssatz: data.zinssatz || '0',
    notes: data.notes || null,
    status: 'aktiv',
  }).returning();

  if (data.eingangsdatum) {
    await db.insert(schema.kautionsBewegungen).values({
      kautionId: kaution.id,
      datum: data.eingangsdatum,
      betrag: String(roundMoney(betrag)),
      typ: 'eingang',
      beschreibung: `Kautionseingang: € ${roundMoney(betrag).toFixed(2)}`,
    });

    await db.update(schema.tenants)
      .set({ kautionBezahlt: true, updatedAt: new Date() })
      .where(eq(schema.tenants.id, data.tenantId));
  }

  return kaution;
}

export async function calculateInterest(kautionId: string): Promise<number> {
  const [kaution] = await db.select().from(schema.kautionen)
    .where(eq(schema.kautionen.id, kautionId));

  if (!kaution) throw new Error("Kaution nicht gefunden");

  const zinssatz = parseFloat(String(kaution.zinssatz || '0'));
  if (zinssatz <= 0) return 0;

  const startDate = kaution.letzteZinsberechnung || kaution.eingangsdatum;
  if (!startDate) return 0;

  const today = new Date().toISOString().split('T')[0];
  const start = new Date(startDate);
  const end = new Date(today);
  const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 0;

  const betrag = parseFloat(String(kaution.betrag));
  const interest = roundMoney(betrag * (zinssatz / 100) * (days / 365));
  if (interest <= 0) return 0;

  const currentZinsen = parseFloat(String(kaution.aufgelaufeneZinsen || '0'));
  const newZinsen = roundMoney(currentZinsen + interest);

  await db.update(schema.kautionen)
    .set({
      aufgelaufeneZinsen: String(newZinsen),
      letzteZinsberechnung: today,
      updatedAt: new Date(),
    })
    .where(eq(schema.kautionen.id, kautionId));

  await db.insert(schema.kautionsBewegungen).values({
    kautionId,
    datum: today,
    betrag: String(interest),
    typ: 'zinsen',
    beschreibung: `Zinsberechnung: ${days} Tage à ${zinssatz}% = € ${interest.toFixed(2)}`,
  });

  return interest;
}

export async function calculateAllInterest(orgId: string) {
  const activeKautionen = await db.select().from(schema.kautionen)
    .where(and(
      eq(schema.kautionen.organizationId, orgId),
      eq(schema.kautionen.status, 'aktiv'),
      sql`CAST(${schema.kautionen.zinssatz} AS NUMERIC) > 0`
    ));

  let totalInterest = 0;
  let processed = 0;

  for (const k of activeKautionen) {
    try {
      const interest = await calculateInterest(k.id);
      totalInterest = roundMoney(totalInterest + interest);
      processed++;
    } catch (err) {
      console.error(`Zinsberechnung fehlgeschlagen für Kaution ${k.id}:`, err);
    }
  }

  return { processed, totalInterest };
}

export async function initiateReturn(kautionId: string, params: {
  rueckzahlungsdatum: string;
  einbehaltenBetrag?: number;
  einbehaltenGrund?: string;
}) {
  const [kaution] = await db.select().from(schema.kautionen)
    .where(eq(schema.kautionen.id, kautionId));

  if (!kaution) throw new Error("Kaution nicht gefunden");
  if (kaution.status === 'zurueckgezahlt') throw new Error("Kaution wurde bereits zurückgezahlt");

  const zinsen = await calculateInterest(kautionId);

  const [updatedKaution] = await db.select().from(schema.kautionen)
    .where(eq(schema.kautionen.id, kautionId));

  const betrag = parseFloat(String(updatedKaution.betrag));
  const aufgelaufeneZinsen = parseFloat(String(updatedKaution.aufgelaufeneZinsen || '0'));
  const einbehalten = roundMoney(params.einbehaltenBetrag || 0);
  const rueckzahlungsbetrag = roundMoney(betrag + aufgelaufeneZinsen - einbehalten);

  await db.update(schema.kautionen)
    .set({
      status: 'rueckzahlung_angefordert',
      rueckzahlungsdatum: params.rueckzahlungsdatum,
      rueckzahlungsbetrag: String(rueckzahlungsbetrag),
      einbehaltenBetrag: String(einbehalten),
      einbehaltenGrund: params.einbehaltenGrund || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.kautionen.id, kautionId));

  await db.insert(schema.kautionsBewegungen).values({
    kautionId,
    datum: params.rueckzahlungsdatum,
    betrag: String(-rueckzahlungsbetrag),
    typ: 'rueckzahlung',
    beschreibung: `Rückzahlung angefordert: € ${rueckzahlungsbetrag.toFixed(2)}`,
  });

  if (einbehalten > 0) {
    await db.insert(schema.kautionsBewegungen).values({
      kautionId,
      datum: params.rueckzahlungsdatum,
      betrag: String(-einbehalten),
      typ: 'einbehalt',
      beschreibung: `Einbehalt: € ${einbehalten.toFixed(2)} - ${params.einbehaltenGrund || 'Ohne Angabe'}`,
    });
  }

  const [finalKaution] = await db.select().from(schema.kautionen)
    .where(eq(schema.kautionen.id, kautionId));

  return {
    kaution: finalKaution,
    rueckzahlungsbetrag,
    zinsen,
    einbehalten,
  };
}

export async function completeReturn(kautionId: string) {
  const [kaution] = await db.select().from(schema.kautionen)
    .where(eq(schema.kautionen.id, kautionId));

  if (!kaution) throw new Error("Kaution nicht gefunden");

  const today = new Date().toISOString().split('T')[0];
  const rueckzahlungsdatum = kaution.rueckzahlungsdatum || today;

  await db.update(schema.kautionen)
    .set({
      status: 'zurueckgezahlt',
      rueckzahlungsdatum,
      updatedAt: new Date(),
    })
    .where(eq(schema.kautionen.id, kautionId));

  await db.insert(schema.kautionsBewegungen).values({
    kautionId,
    datum: today,
    betrag: '0',
    typ: 'abschluss',
    beschreibung: 'Kautionsrückzahlung abgeschlossen',
  });

  const [finalKaution] = await db.select().from(schema.kautionen)
    .where(eq(schema.kautionen.id, kautionId));

  return finalKaution;
}

export async function getKautionOverview(orgId: string) {
  const allKautionen = await db.select().from(schema.kautionen)
    .where(eq(schema.kautionen.organizationId, orgId));

  const active = allKautionen.filter(k => k.status === 'aktiv');
  const pendingReturn = allKautionen.filter(k => k.status === 'rueckzahlung_angefordert');

  const totalActiveAmount = roundMoney(
    active.reduce((sum, k) => sum + parseFloat(String(k.betrag || '0')), 0)
  );
  const totalAccruedInterest = roundMoney(
    active.reduce((sum, k) => sum + parseFloat(String(k.aufgelaufeneZinsen || '0')), 0)
  );
  const totalPendingReturn = roundMoney(
    pendingReturn.reduce((sum, k) => sum + parseFloat(String(k.rueckzahlungsbetrag || '0')), 0)
  );

  return {
    totalActive: active.length,
    totalActiveAmount,
    totalAccruedInterest,
    totalAmountHeld: roundMoney(totalActiveAmount + totalAccruedInterest),
    pendingReturnCount: pendingReturn.length,
    totalPendingReturn,
    totalReturned: allKautionen.filter(k => k.status === 'zurueckgezahlt').length,
  };
}

export async function getKautionHistory(kautionId: string) {
  return db.select().from(schema.kautionsBewegungen)
    .where(eq(schema.kautionsBewegungen.kautionId, kautionId))
    .orderBy(desc(schema.kautionsBewegungen.datum), desc(schema.kautionsBewegungen.createdAt));
}
