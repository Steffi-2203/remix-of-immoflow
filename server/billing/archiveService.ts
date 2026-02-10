import { db } from "../db";
import { sql } from "drizzle-orm";
import { writeAudit } from "../lib/auditLog";

/**
 * Austrian BAO §132: 7-year retention for accounting documents.
 * This service manages document lifecycle and archival.
 */

const RETENTION_YEARS = 7;

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
}

export class ArchiveService {
  /**
   * Get the cutoff date: documents older than this may be deleted.
   */
  getCutoffDate(): Date {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);
    return cutoff;
  }

  /**
   * Mark documents as archived (soft archive) once they pass the retention period.
   * Does NOT delete — just flags them for review.
   */
  async markExpiredForArchival(userId: string): Promise<ArchiveResult> {
    const cutoff = this.getCutoffDate();
    const cutoffStr = cutoff.toISOString().split('T')[0];

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

    const archivedCount = (invoiceResult.rows?.length || 0) + (auditResult.rows?.length || 0);

    await writeAudit(db, userId, 'system', 'archive', 'archive_run', null, {
      cutoffDate: cutoffStr,
      retentionYears: RETENTION_YEARS,
      archivedInvoices: invoiceResult.rows?.length || 0,
      archivedAuditLogs: auditResult.rows?.length || 0,
    });

    return {
      archivedCount,
      deletedCount: 0,
      retentionYears: RETENTION_YEARS,
      cutoffDate: cutoffStr,
    };
  }

  /**
   * Get archival status overview for the organization.
   */
  async getArchiveStatus(organizationId: string): Promise<ArchiveStatus> {
    const cutoff = this.getCutoffDate();
    const cutoffStr = cutoff.toISOString().split('T')[0];

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
    };
  }

  /**
   * Permanently delete documents beyond retention + grace period.
   * Only soft-deleted (storniert) documents older than retention are removed.
   * Active documents are NEVER deleted automatically.
   */
  async purgeExpired(userId: string): Promise<{ purgedCount: number }> {
    const cutoff = this.getCutoffDate();
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // Only purge cancelled/voided invoices beyond retention
    const result = await db.execute(sql`
      DELETE FROM monthly_invoices
      WHERE status = 'storniert'
        AND created_at < ${cutoffStr}::date
      RETURNING id
    `);

    const purgedCount = result.rows?.length || 0;

    if (purgedCount > 0) {
      await writeAudit(db, userId, 'system', 'archive', 'purge_expired', null, {
        cutoffDate: cutoffStr,
        purgedCount,
      });
    }

    return { purgedCount };
  }
}

export const archiveService = new ArchiveService();
