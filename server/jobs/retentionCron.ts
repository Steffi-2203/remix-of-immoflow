/**
 * Retention Cron Job.
 * Runs daily to:
 * 1. Check documents against BAO (7y) and GoBD (10y) retention periods.
 * 2. Mark expired documents as "archivable".
 * 3. Auto-create retention_locks for new financial documents.
 *
 * Designed to be called by the job queue worker.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { securityLogger } from "../lib/logger";

const logger = securityLogger.child({ module: "retention-cron" });

const BAO_YEARS = 7;
const GOBD_YEARS = 10;

interface RetentionCronResult {
  newLocksCreated: number;
  documentsMarkedArchivable: number;
  errors: string[];
}

/**
 * Create retention locks for financial documents that don't have one yet.
 * This ensures all financial records are explicitly protected.
 */
async function createMissingRetentionLocks(): Promise<number> {
  // Lock monthly_invoices (BAO 7 years)
  const invoiceLocks = await db.execute(sql`
    INSERT INTO retention_locks (entity_type, entity_id, locked_until, reason, standard, created_by)
    SELECT 
      'monthly_invoices',
      mi.id,
      mi.created_at + INTERVAL '7 years',
      'BAO §132: 7-jährige Aufbewahrungspflicht für Buchhaltungsunterlagen',
      'bao',
      'system'
    FROM monthly_invoices mi
    WHERE NOT EXISTS (
      SELECT 1 FROM retention_locks rl
      WHERE rl.entity_type = 'monthly_invoices'
        AND rl.entity_id = mi.id
    )
    AND mi.status NOT IN ('entwurf')
    ON CONFLICT (entity_type, entity_id) DO NOTHING
  `);

  // Lock settlements (GoBD 10 years)
  const settlementLocks = await db.execute(sql`
    INSERT INTO retention_locks (entity_type, entity_id, locked_until, reason, standard, created_by)
    SELECT 
      'settlements',
      s.id,
      s.created_at + INTERVAL '10 years',
      'GoBD: 10-jährige Aufbewahrungspflicht für steuerrelevante BK-Abrechnungen',
      'gobd',
      'system'
    FROM settlements s
    WHERE NOT EXISTS (
      SELECT 1 FROM retention_locks rl
      WHERE rl.entity_type = 'settlements'
        AND rl.entity_id = s.id
    )
    AND s.status = 'abgeschlossen'
    ON CONFLICT (entity_type, entity_id) DO NOTHING
  `);

  // Lock payments (BAO 7 years)
  const paymentLocks = await db.execute(sql`
    INSERT INTO retention_locks (entity_type, entity_id, locked_until, reason, standard, created_by)
    SELECT 
      'payments',
      p.id,
      p.created_at + INTERVAL '7 years',
      'BAO §132: 7-jährige Aufbewahrungspflicht für Zahlungsbelege',
      'bao',
      'system'
    FROM payments p
    WHERE NOT EXISTS (
      SELECT 1 FROM retention_locks rl
      WHERE rl.entity_type = 'payments'
        AND rl.entity_id = p.id
    )
    ON CONFLICT (entity_type, entity_id) DO NOTHING
  `);

  const total = (invoiceLocks.rowCount || 0) + (settlementLocks.rowCount || 0) + (paymentLocks.rowCount || 0);
  return total;
}

/**
 * Mark documents as archivable once their retention period has expired.
 */
async function markExpiredAsArchivable(): Promise<number> {
  const result = await db.execute(sql`
    UPDATE retention_locks
    SET reason = reason || ' [ARCHIVIERBAR]'
    WHERE locked_until < NOW()
      AND reason NOT LIKE '%ARCHIVIERBAR%'
    RETURNING id
  `);

  return result.rows?.length || 0;
}

/**
 * Main cron job entry point.
 * Should be called daily by the job queue worker.
 */
export async function runRetentionCron(): Promise<RetentionCronResult> {
  const errors: string[] = [];
  let newLocksCreated = 0;
  let documentsMarkedArchivable = 0;

  logger.info("Starting daily retention check");

  try {
    newLocksCreated = await createMissingRetentionLocks();
    logger.info({ newLocksCreated }, "Created missing retention locks");
  } catch (err: any) {
    errors.push(`Lock creation failed: ${err.message}`);
    logger.error({ err }, "Failed to create retention locks");
  }

  try {
    documentsMarkedArchivable = await markExpiredAsArchivable();
    logger.info({ documentsMarkedArchivable }, "Marked expired documents as archivable");
  } catch (err: any) {
    errors.push(`Archive marking failed: ${err.message}`);
    logger.error({ err }, "Failed to mark expired documents");
  }

  const result: RetentionCronResult = {
    newLocksCreated,
    documentsMarkedArchivable,
    errors,
  };

  logger.info(result, "Retention cron completed");
  return result;
}
