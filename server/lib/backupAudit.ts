/**
 * Backup & Archive Audit Events
 * 
 * Logs all backup, restore, archive, and WORM-related actions
 * to audit_events for full traceability (GoBD/BAO compliance).
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { billingLogger } from "./logger";

const logger = billingLogger.child({ module: "backup-audit" });

export type BackupEventType =
  | "backup_created"
  | "backup_verified"
  | "backup_failed"
  | "restore_started"
  | "restore_completed"
  | "restore_failed"
  | "archive_export_created"
  | "archive_export_uploaded"
  | "archive_worm_locked"
  | "archive_worm_verified"
  | "archive_purge_executed"
  | "retention_lock_created"
  | "retention_lock_expired"
  | "dr_test_passed"
  | "dr_test_failed";

interface BackupAuditEntry {
  eventType: BackupEventType;
  actor: string;                 // userId or 'system'
  entityType: string;            // 'backup', 'archive_package', 'retention_lock'
  entityId?: string;             // runId, backupId, etc.
  details: Record<string, unknown>;
}

/**
 * Log a backup/archive event to audit_events table.
 */
export async function logBackupEvent(entry: BackupAuditEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO audit_events (
        event_type, actor, entity, entity_id, operation, new_data
      ) VALUES (
        ${entry.eventType},
        ${entry.actor},
        ${entry.entityType},
        ${entry.entityId || null},
        ${'backup_operation'},
        ${JSON.stringify(entry.details)}::jsonb
      )
    `);

    logger.info(
      { eventType: entry.eventType, entityId: entry.entityId, actor: entry.actor },
      `Backup audit: ${entry.eventType}`
    );
  } catch (error) {
    // Never let audit logging break the main flow
    logger.error({ error, entry }, "Failed to log backup audit event");
  }
}

/**
 * Query recent backup events for compliance dashboard.
 */
export async function getBackupEvents(options: {
  limit?: number;
  eventTypes?: BackupEventType[];
  since?: string;
}): Promise<any[]> {
  const limit = options.limit || 50;
  
  let query = sql`
    SELECT id, event_type, actor, entity, entity_id, operation, new_data, created_at
    FROM audit_events
    WHERE operation = 'backup_operation'
  `;

  if (options.eventTypes?.length) {
    query = sql`${query} AND event_type = ANY(${options.eventTypes}::text[])`;
  }
  if (options.since) {
    query = sql`${query} AND created_at >= ${options.since}::timestamptz`;
  }

  query = sql`${query} ORDER BY created_at DESC LIMIT ${limit}`;

  const result = await db.execute(query);
  return result.rows || [];
}

/**
 * Get WORM compliance status — summary of locked vs unlocked exports.
 */
export async function getWormComplianceStatus(): Promise<{
  totalExports: number;
  wormLocked: number;
  pendingLock: number;
  lastVerified: string | null;
}> {
  const result = await db.execute(sql`
    SELECT 
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE event_type = 'archive_worm_locked')::int AS locked,
      COUNT(*) FILTER (WHERE event_type = 'archive_export_created')::int AS created
    FROM audit_events
    WHERE operation = 'backup_operation'
      AND event_type IN ('archive_worm_locked', 'archive_export_created')
  `);

  const lastVerified = await db.execute(sql`
    SELECT created_at::text 
    FROM audit_events 
    WHERE event_type = 'archive_worm_verified' 
    ORDER BY created_at DESC LIMIT 1
  `);

  const row = result.rows?.[0] as any;
  return {
    totalExports: row?.total || 0,
    wormLocked: row?.locked || 0,
    pendingLock: Math.max(0, (row?.created || 0) - (row?.locked || 0)),
    lastVerified: (lastVerified.rows?.[0] as any)?.created_at || null,
  };
}
