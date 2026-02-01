import { db } from "../db";
import { auditLogs } from "@shared/schema";

export type AuditAction = 'create' | 'update' | 'delete' | 'soft_delete' | 'restore';

interface AuditLogParams {
  userId?: string;
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId || null,
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      oldData: params.oldData || null,
      newData: params.newData || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

export function getClientInfo(req: any): { ipAddress: string; userAgent: string } {
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || 
                    req.connection?.remoteAddress || 
                    req.ip || 
                    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return { ipAddress, userAgent };
}

export function sanitizeForAudit(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['passwordHash', 'password', 'token', 'secret', 'apiKey'];
  const sanitized = { ...data };
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}
