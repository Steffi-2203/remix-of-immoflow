import { db } from "../db";
import { auditLogs } from "@shared/schema";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import * as schema from "@shared/schema";

export type AuditAction = 'create' | 'update' | 'delete' | 'soft_delete' | 'restore';

type TransactionType = PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

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

export async function createAuditLog(params: AuditLogParams, tx?: TransactionType): Promise<void> {
  try {
    const executor = tx || db;
    await executor.insert(auditLogs).values({
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

export async function writeAudit(
  tx: TransactionType,
  userId: string | undefined,
  tableName: string,
  recordId: string,
  action: AuditAction,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): Promise<void> {
  return createAuditLog({
    userId,
    tableName,
    recordId,
    action,
    oldData: oldData ? sanitizeForAudit(oldData) : null,
    newData: newData ? sanitizeForAudit(newData) : null,
  }, tx);
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
