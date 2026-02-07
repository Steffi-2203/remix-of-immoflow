import { createAuditLog, type AuditAction } from './auditLog';

/**
 * Centralized error handler for financial services.
 * Wraps service calls with structured error handling and audit logging.
 */

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  service: string;
  operation: string;
}

export class FinancialServiceError extends Error {
  public readonly code: string;
  public readonly service: string;
  public readonly operation: string;
  public readonly details: Record<string, unknown>;

  constructor(opts: {
    code: string;
    message: string;
    service: string;
    operation: string;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(opts.message);
    this.name = 'FinancialServiceError';
    this.code = opts.code;
    this.service = opts.service;
    this.operation = opts.operation;
    this.details = opts.details || {};
    if (opts.cause) this.cause = opts.cause;
  }

  toJSON(): ServiceError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
      service: this.service,
      operation: this.operation,
    };
  }
}

/**
 * Wraps a service method call with error handling and audit logging.
 * On failure, logs the error to audit_logs and re-throws a FinancialServiceError.
 */
export async function withAuditedErrorHandling<T>(opts: {
  service: string;
  operation: string;
  userId?: string;
  context?: Record<string, unknown>;
  fn: () => Promise<T>;
}): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await opts.fn();

    // Log successful financial operations
    await createAuditLog({
      userId: opts.userId,
      tableName: `service_${opts.service}`,
      recordId: opts.operation,
      action: 'create' as AuditAction,
      newData: {
        status: 'success',
        service: opts.service,
        operation: opts.operation,
        durationMs: Date.now() - startTime,
        ...opts.context,
      },
    }).catch(() => { /* non-critical */ });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Always log failures to audit
    await createAuditLog({
      userId: opts.userId,
      tableName: `service_${opts.service}`,
      recordId: opts.operation,
      action: 'create' as AuditAction,
      newData: {
        status: 'error',
        service: opts.service,
        operation: opts.operation,
        error: errorMessage,
        errorStack,
        durationMs: Date.now() - startTime,
        ...opts.context,
      },
    }).catch(() => { /* non-critical */ });

    if (error instanceof FinancialServiceError) {
      throw error;
    }

    throw new FinancialServiceError({
      code: 'SERVICE_ERROR',
      message: `${opts.service}.${opts.operation} failed: ${errorMessage}`,
      service: opts.service,
      operation: opts.operation,
      details: { ...opts.context, originalError: errorMessage },
      cause: error instanceof Error ? error : undefined,
    });
  }
}

/**
 * Express middleware error handler for financial service errors.
 */
export function handleFinancialError(error: unknown, serviceName: string) {
  if (error instanceof FinancialServiceError) {
    return {
      status: 500,
      body: {
        error: error.message,
        code: error.code,
        service: error.service,
        operation: error.operation,
        timestamp: new Date().toISOString(),
      },
    };
  }

  const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
  return {
    status: 500,
    body: {
      error: message,
      code: 'UNKNOWN_ERROR',
      service: serviceName,
      timestamp: new Date().toISOString(),
    },
  };
}
