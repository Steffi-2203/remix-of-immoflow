import { db } from "../db";
import { sql } from "drizzle-orm";
import { securityLogger } from "../lib/logger";

/**
 * Retention-Freeze Guard.
 * Prevents deletion of entities that are within their legal retention period.
 *
 * Rules:
 * - BAO §132: 7 years for standard accounting documents
 * - GoBD: 10 years for tax-relevant documents (BK-Abrechnungen, Steuerbelege)
 *
 * Entity types with 10-year retention (GoBD):
 * - settlements (BK-Abrechnungen)
 * - expenses (Betriebskosten-Belege)
 *
 * Entity types with 7-year retention (BAO):
 * - monthly_invoices
 * - payments
 * - audit_logs
 */

const logger = securityLogger.child({ module: "retention" });

type RetentionEntity =
  | "monthly_invoices"
  | "settlements"
  | "payments"
  | "expenses"
  | "audit_logs";

const GOBD_ENTITIES: RetentionEntity[] = ["settlements", "expenses"];
const BAO_YEARS = 7;
const GOBD_YEARS = 10;

function getRetentionYears(entityType: RetentionEntity): number {
  return GOBD_ENTITIES.includes(entityType) ? GOBD_YEARS : BAO_YEARS;
}

export interface RetentionCheckResult {
  allowed: boolean;
  retentionUntil?: string;
  standard: "bao" | "gobd";
  reason?: string;
}

/**
 * Check if an entity is allowed to be deleted.
 * Returns { allowed: false } if entity is within retention period.
 */
export async function assertRetentionAllowed(
  entityType: RetentionEntity,
  entityId: string
): Promise<RetentionCheckResult> {
  const years = getRetentionYears(entityType);
  const standard = GOBD_ENTITIES.includes(entityType) ? "gobd" : "bao";

  // 1. Check retention_locks table first (explicit locks)
  const lockResult = await db.execute(sql`
    SELECT locked_until, reason FROM retention_locks
    WHERE entity_type = ${entityType}
      AND entity_id = ${entityId}::uuid
      AND locked_until > NOW()
    LIMIT 1
  `);

  if (lockResult.rows?.length) {
    const lock = lockResult.rows[0] as any;
    logger.warn(
      { entityType, entityId, lockedUntil: lock.locked_until },
      "Deletion blocked by explicit retention lock"
    );
    return {
      allowed: false,
      retentionUntil: lock.locked_until,
      standard,
      reason: lock.reason || `Gesetzliche Aufbewahrungspflicht (${standard.toUpperCase()}, ${years} Jahre)`,
    };
  }

  // 2. Check created_at on the entity itself
  let createdAt: Date | null = null;

  try {
    const result = await db.execute(sql`
      SELECT created_at FROM ${sql.raw(entityType)}
      WHERE id = ${entityId}::uuid
      LIMIT 1
    `);
    if (result.rows?.[0]) {
      createdAt = new Date((result.rows[0] as any).created_at);
    }
  } catch {
    // Table might not exist or entity not found — allow deletion
    return { allowed: true, standard };
  }

  if (!createdAt) {
    return { allowed: true, standard };
  }

  const retentionEnd = new Date(createdAt);
  retentionEnd.setFullYear(retentionEnd.getFullYear() + years);

  if (new Date() < retentionEnd) {
    const retentionUntil = retentionEnd.toISOString().split("T")[0];
    logger.warn(
      { entityType, entityId, createdAt: createdAt.toISOString(), retentionUntil },
      "Deletion blocked by retention period"
    );
    return {
      allowed: false,
      retentionUntil,
      standard,
      reason: `Dokument unterliegt der ${years}-jährigen Aufbewahrungspflicht (${standard.toUpperCase()}) bis ${retentionUntil}`,
    };
  }

  return { allowed: true, standard };
}

/**
 * Express middleware factory for retention enforcement on DELETE routes.
 * Usage: app.delete("/api/invoices/:id", assertRetentionGuard("monthly_invoices"), handler)
 */
export function assertRetentionGuard(entityType: RetentionEntity) {
  return async (req: any, res: any, next: any) => {
    const entityId = req.params.id;
    if (!entityId) return next();

    const result = await assertRetentionAllowed(entityType, entityId);
    if (!result.allowed) {
      return res.status(403).json({
        error: result.reason || "Dokument unterliegt der gesetzlichen Aufbewahrungspflicht",
        retentionUntil: result.retentionUntil,
        standard: result.standard,
      });
    }

    next();
  };
}
