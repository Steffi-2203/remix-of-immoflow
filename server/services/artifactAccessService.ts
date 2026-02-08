import { db } from "../db";
import { sql } from "drizzle-orm";
import { hasPermission } from "../middleware/rbac";
import { decryptArtifact, isEncryptionEnabled, type EncryptedPayload } from "../lib/artifactEncryption";
import { getClientInfo } from "../lib/auditLog";
import type { Request } from "express";

/**
 * P2-8c: Artifact access service with RBAC enforcement and CloudTrail-style logging.
 *
 * Only users with roles admin, auditor, or ops may download artifacts.
 * Every access attempt (success or denied) is logged to artifact_access_log.
 */

const ALLOWED_ROLES = ['admin', 'auditor', 'ops'] as const;

export interface ArtifactDownloadResult {
  allowed: boolean;
  reason?: string;
  data?: Buffer;
  filePath?: string;
  contentType?: string;
}

/**
 * Check if user has one of the artifact-privileged roles.
 */
async function hasArtifactRole(userId: string): Promise<{ allowed: boolean; role?: string }> {
  const result = await db.execute(sql`
    SELECT role FROM user_roles
    WHERE user_id = ${userId}::uuid
      AND role = ANY(ARRAY['admin','auditor','ops']::app_role[])
    LIMIT 1
  `);
  if (result.rows && result.rows.length > 0) {
    return { allowed: true, role: result.rows[0].role as string };
  }
  return { allowed: false };
}

/**
 * Log an artifact access attempt to the CloudTrail-style audit table.
 */
async function logAccess(params: {
  userId: string;
  artifactId?: string;
  runId?: string;
  action: string;
  filePath?: string;
  reason?: string;
  req: Request;
}): Promise<void> {
  const { ipAddress, userAgent } = getClientInfo(params.req);
  try {
    await db.execute(sql`
      INSERT INTO artifact_access_log (user_id, artifact_id, run_id, action, file_path, ip_address, user_agent, reason)
      VALUES (
        ${params.userId}::uuid,
        ${params.artifactId ? params.artifactId : null}::uuid,
        ${params.runId || null},
        ${params.action},
        ${params.filePath || null},
        ${ipAddress}::inet,
        ${userAgent},
        ${params.reason || null}
      )
    `);
  } catch (err) {
    console.error('[artifact-access-log] Failed to write:', err);
  }
}

/**
 * Attempt to download an artifact. Enforces RBAC and logs access.
 */
export async function downloadArtifact(
  userId: string,
  artifactId: string,
  req: Request
): Promise<ArtifactDownloadResult> {
  // 1. RBAC check
  const { allowed, role } = await hasArtifactRole(userId);

  if (!allowed) {
    await logAccess({
      userId,
      artifactId,
      action: 'download_denied',
      reason: 'Insufficient role – requires admin, auditor, or ops',
      req,
    });
    return { allowed: false, reason: 'Insufficient permissions. Only auditors, ops, and admins may download artifacts.' };
  }

  // 2. Fetch artifact metadata
  const metaResult = await db.execute(sql`
    SELECT id, file_path, run_id, encryption_key_id, organization_id
    FROM artifact_metadata
    WHERE id = ${artifactId}::uuid
  `);

  if (!metaResult.rows || metaResult.rows.length === 0) {
    await logAccess({
      userId,
      artifactId,
      action: 'download_denied',
      reason: 'Artifact not found',
      req,
    });
    return { allowed: false, reason: 'Artifact not found' };
  }

  const meta = metaResult.rows[0] as any;

  // 3. Log successful access
  await logAccess({
    userId,
    artifactId,
    runId: meta.run_id,
    action: 'download',
    filePath: meta.file_path,
    reason: `Downloaded by ${role}`,
    req,
  });

  return {
    allowed: true,
    filePath: meta.file_path,
    contentType: 'application/octet-stream',
  };
}

/**
 * List artifacts with RBAC check. Logs list access.
 */
export async function listArtifacts(
  userId: string,
  runId: string | undefined,
  req: Request
): Promise<{ allowed: boolean; reason?: string; artifacts?: any[] }> {
  const { allowed } = await hasArtifactRole(userId);

  if (!allowed) {
    await logAccess({
      userId,
      action: 'list_denied',
      runId,
      reason: 'Insufficient role',
      req,
    });
    return { allowed: false, reason: 'Insufficient permissions' };
  }

  let query;
  if (runId) {
    query = await db.execute(sql`
      SELECT id, file_path, run_id, encryption_key_id, retention_days, expires_at, created_at
      FROM artifact_metadata
      WHERE run_id = ${runId}
      ORDER BY created_at DESC
    `);
  } else {
    query = await db.execute(sql`
      SELECT id, file_path, run_id, encryption_key_id, retention_days, expires_at, created_at
      FROM artifact_metadata
      ORDER BY created_at DESC
      LIMIT 200
    `);
  }

  await logAccess({
    userId,
    action: 'list',
    runId,
    reason: `Listed ${query.rows?.length || 0} artifacts`,
    req,
  });

  return { allowed: true, artifacts: query.rows || [] };
}

/**
 * Get artifact access log entries (for audit dashboard).
 */
export async function getAccessLog(
  userId: string,
  limit: number = 100,
  req: Request
): Promise<{ allowed: boolean; reason?: string; logs?: any[] }> {
  const { allowed } = await hasArtifactRole(userId);
  if (!allowed) {
    return { allowed: false, reason: 'Insufficient permissions' };
  }

  const result = await db.execute(sql`
    SELECT
      aal.id, aal.user_id, aal.artifact_id, aal.run_id,
      aal.action, aal.file_path, aal.ip_address::text, aal.user_agent,
      aal.reason, aal.created_at
    FROM artifact_access_log aal
    ORDER BY aal.created_at DESC
    LIMIT ${limit}
  `);

  return { allowed: true, logs: result.rows || [] };
}
