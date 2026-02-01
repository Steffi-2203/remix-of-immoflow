import { db } from "../db";
import { leases } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { createAuditLog } from "../lib/auditLog";

export interface CreateLeaseData {
  tenantId: string;
  unitId: string;
  startDate: string;
  endDate?: string;
  grundmiete: string;
  betriebskostenVorschuss?: string;
  heizkostenVorschuss?: string;
  wasserkostenVorschuss?: string;
  kaution?: string;
  kautionBezahlt?: boolean;
  status?: 'aktiv' | 'beendet' | 'gekuendigt';
  notes?: string;
}

export async function createLease(data: CreateLeaseData, userId?: string) {
  const [lease] = await db.insert(leases).values({
    tenantId: data.tenantId,
    unitId: data.unitId,
    startDate: data.startDate,
    endDate: data.endDate || null,
    grundmiete: data.grundmiete,
    betriebskostenVorschuss: data.betriebskostenVorschuss || '0',
    heizkostenVorschuss: data.heizkostenVorschuss || '0',
    wasserkostenVorschuss: data.wasserkostenVorschuss || '0',
    kaution: data.kaution || null,
    kautionBezahlt: data.kautionBezahlt || false,
    status: data.status || 'aktiv',
    notes: data.notes || null,
  }).returning();

  await createAuditLog({
    userId: userId || 'system',
    tableName: 'leases',
    recordId: lease.id,
    action: 'create',
    newData: {
      tenantId: data.tenantId,
      unitId: data.unitId,
      startDate: data.startDate,
      grundmiete: data.grundmiete
    }
  });

  return lease;
}

export async function updateLease(
  id: string, 
  data: Partial<CreateLeaseData>,
  userId?: string
) {
  const [updated] = await db.update(leases)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(leases.id, id))
    .returning();

  if (updated) {
    await createAuditLog({
      userId: userId || 'system',
      tableName: 'leases',
      recordId: id,
      action: 'update',
      newData: data as Record<string, unknown>
    });
  }

  return updated;
}

export async function terminateLease(
  id: string,
  endDate: string,
  userId?: string
) {
  const [terminated] = await db.update(leases)
    .set({
      endDate,
      status: 'beendet',
      updatedAt: new Date()
    })
    .where(eq(leases.id, id))
    .returning();

  if (terminated) {
    await createAuditLog({
      userId: userId || 'system',
      tableName: 'leases',
      recordId: id,
      action: 'update',
      newData: { endDate, status: 'beendet' }
    });
  }

  return terminated;
}

export async function getLease(id: string) {
  const [lease] = await db.select().from(leases).where(eq(leases.id, id));
  return lease;
}

export async function getLeasesByTenant(tenantId: string) {
  return db.select().from(leases).where(eq(leases.tenantId, tenantId));
}

export async function getLeasesByUnit(unitId: string) {
  return db.select().from(leases).where(eq(leases.unitId, unitId));
}
