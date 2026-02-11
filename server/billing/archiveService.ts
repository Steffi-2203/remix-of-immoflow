import { db } from "../db";
import { sql } from "drizzle-orm";
import { writeAudit } from "../lib/auditLog";
import { billingLogger } from "../lib/logger";
import { logBackupEvent } from "../lib/backupAudit";

/**
 * Austrian BAO §132: 7-year retention for accounting documents.
 * German GoBD: 10-year retention for tax-relevant documents.
 * This service manages document lifecycle, archival, and deletion-freeze.
 */

const RETENTION_YEARS_BAO = 7;
const RETENTION_YEARS_GOBD = 10;

type RetentionStandard = "bao" | "gobd";

interface RetentionConfig {
  standard: RetentionStandard;
  years: number;
}

const RETENTION_CONFIGS: Record<RetentionStandard, RetentionConfig> = {
  bao: { standard: "bao", years: RETENTION_YEARS_BAO },
  gobd: { standard: "gobd", years: RETENTION_YEARS_GOBD },
};

interface ArchiveResult {
  archivedCount: number;
  deletedCount: number;
  retentionYears: number;
  cutoffDate: string;
}

interface ArchiveStatus {
  totalDocuments: number;
  withinRetention: number;
  expiredRetention: number;
  oldestDocument: string | null;
  retentionStandard: RetentionStandard;
  retentionYears: number;
}

interface DeletionFreezeResult {
  frozen: boolean;
  retentionUntil: string | null;
  standard: RetentionStandard;
  reason?: string;
}

const logger = billingLogger.child({ module: "archive" });

export class ArchiveService {
  private retentionStandard: RetentionStandard;

  constructor(standard: RetentionStandard = "bao") {
    this.retentionStandard = standard;
  }

  get config(): RetentionConfig {
    return RETENTION_CONFIGS[this.retentionStandard];
  }

  /**
   * Get the cutoff date: documents older than this may be deleted.
   */
  getCutoffDate(standard?: RetentionStandard): Date {
    const years = RETENTION_CONFIGS[standard || this.retentionStandard].years;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    return cutoff;
  }

  /**
   * Check if a specific invoice is within its legal retention period.
   * Active (non-cancelled) invoices are ALWAYS frozen during retention.
   */
  async isDeletionFrozen(invoiceId: string): Promise<DeletionFreezeResult> {
    const result = await db.execute(sql`
      SELECT id, created_at, status
      FROM monthly_invoices
      WHERE id = ${invoiceId}::uuid
      LIMIT 1
    `);

    const row = result.rows?.[0] as any;
    if (!row) {
      return { frozen: false, retentionUntil: null, standard: this.retentionStandard };
    }

    const createdAt = new Date(row.created_at);
    const retentionEnd = new Date(createdAt);
    retentionEnd.setFullYear(retentionEnd.getFullYear() + this.config.years);
    const retentionUntil = retentionEnd.toISOString().split("T")[0];

    const now = new Date();

    // Active documents within retention: ALWAYS frozen
    if (row.status !== "storniert" && now < retentionEnd) {
      return {
        frozen: true,
        retentionUntil,
        standard: this.retentionStandard,
        reason: `Aktives Dokument innerhalb der ${this.config.years}-Jahres-Aufbewahrungsfrist (${this.retentionStandard.toUpperCase()})`,
      };
    }

    // Cancelled documents within retention: still frozen
    if (row.status === "storniert" && now < retentionEnd) {
      return {
        frozen: true,
        retentionUntil,
        standard: this.retentionStandard,
        reason: `Storniertes Dokument innerhalb der Aufbewahrungsfrist`,
      };
    }

    return { frozen: false, retentionUntil: null, standard: this.retentionStandard };
  }

  /**
   * Mark documents as archived (soft archive) once they pass the retention period.
   * Does NOT delete — just flags them for review.
   */
  async markExpiredForArchival(userId: string): Promise<ArchiveResult> {
    const cutoff = this.getCutoffDate();
    const cutoffStr = cutoff.toISOString().split("T")[0];

    logger.info({ cutoffDate: cutoffStr, standard: this.retentionStandard }, "Starting archive run");

    // Archive old invoices
    const invoiceResult = await db.execute(sql`
      UPDATE monthly_invoices 
      SET status = 'archiviert'
      WHERE created_at < ${cutoffStr}::date
        AND status NOT IN ('archiviert', 'storniert')
      RETURNING id
    `);

    // Archive old audit logs (mark with retention flag)
    const auditResult = await db.execute(sql`
      UPDATE audit_logs
      SET action = action || '_archived'
      WHERE created_at < ${cutoffStr}::date
        AND action NOT LIKE '%_archived'
      RETURNING id
    `);

    const archivedCount =
      (invoiceResult.rows?.length || 0) + (auditResult.rows?.length || 0);

    await writeAudit(db, userId, "system", "archive", "archive_run", null, {
      cutoffDate: cutoffStr,
      retentionYears: this.config.years,
      retentionStandard: this.retentionStandard,
      archivedInvoices: invoiceResult.rows?.length || 0,
      archivedAuditLogs: auditResult.rows?.length || 0,
    });

    // Log backup audit event for compliance trail
    await logBackupEvent({
      eventType: "archive_export_created",
      actor: userId,
      entityType: "archive_package",
      entityId: `archive-run-${cutoffStr}`,
      details: {
        cutoffDate: cutoffStr,
        retentionYears: this.config.years,
        retentionStandard: this.retentionStandard,
        archivedInvoices: invoiceResult.rows?.length || 0,
        archivedAuditLogs: auditResult.rows?.length || 0,
      },
    });

    logger.info(
      { archivedCount, cutoffDate: cutoffStr },
      "Archive run completed"
    );

    return {
      archivedCount,
      deletedCount: 0,
      retentionYears: this.config.years,
      cutoffDate: cutoffStr,
    };
  }

  /**
   * Get archival status overview for the organization.
   */
  async getArchiveStatus(organizationId: string): Promise<ArchiveStatus> {
    const cutoff = this.getCutoffDate();
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const stats = await db.execute(sql`
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= ${cutoffStr}::date)::int AS within_retention,
        COUNT(*) FILTER (WHERE created_at < ${cutoffStr}::date)::int AS expired,
        MIN(created_at)::text AS oldest
      FROM monthly_invoices
      WHERE tenant_id IN (
        SELECT t.id FROM tenants t
        JOIN units u ON t.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE p.organization_id = ${organizationId}::uuid
      )
    `);

    const row = stats.rows?.[0] as any;
    return {
      totalDocuments: row?.total || 0,
      withinRetention: row?.within_retention || 0,
      expiredRetention: row?.expired || 0,
      oldestDocument: row?.oldest || null,
      retentionStandard: this.retentionStandard,
      retentionYears: this.config.years,
    };
  }

  /**
   * Permanently delete documents beyond retention + grace period.
   * Only soft-deleted (storniert) documents older than retention are removed.
   * Active documents are NEVER deleted automatically.
   */
  async purgeExpired(userId: string): Promise<{ purgedCount: number }> {
    const cutoff = this.getCutoffDate();
    const cutoffStr = cutoff.toISOString().split("T")[0];

    // Only purge cancelled/voided invoices beyond retention
    const result = await db.execute(sql`
      DELETE FROM monthly_invoices
      WHERE status = 'storniert'
        AND created_at < ${cutoffStr}::date
      RETURNING id
    `);

    const purgedCount = result.rows?.length || 0;

    if (purgedCount > 0) {
      logger.info({ purgedCount, cutoffDate: cutoffStr }, "Purged expired documents");

      await writeAudit(db, userId, "system", "archive", "purge_expired", null, {
        cutoffDate: cutoffStr,
        purgedCount,
        retentionStandard: this.retentionStandard,
      });

      await logBackupEvent({
        eventType: "archive_purge_executed",
        actor: userId,
        entityType: "archive_package",
        entityId: `purge-${cutoffStr}`,
        details: {
          cutoffDate: cutoffStr,
          purgedCount,
          retentionStandard: this.retentionStandard,
        },
      });
    }

    return { purgedCount };
  }

  /**
   * Switch retention standard (e.g. from BAO to GoBD for German-regulated entities).
   */
  setRetentionStandard(standard: RetentionStandard): void {
    this.retentionStandard = standard;
    logger.info({ standard }, "Retention standard changed");
  }
}

// Default: Austrian BAO (7 years)
export const archiveService = new ArchiveService("bao");
