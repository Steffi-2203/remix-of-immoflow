import { securityLogger } from "./logger";

/**
 * Typed security event emitter.
 * All security-relevant events are logged via Pino with category: 'security'.
 */

export type SecurityEventType =
  | "ownership_violation"
  | "period_lock_violation"
  | "auth_failure"
  | "csrf_rejection"
  | "rate_limit_hit";

interface SecurityEvent {
  eventType: SecurityEventType;
  severity: "warn" | "error";
  ip: string;
  userId?: string;
  resourceId?: string;
  resourceType?: string;
  details: Record<string, unknown>;
}

/**
 * Emit a structured security event.
 * Logged at 'warn' level by default, 'error' for critical violations.
 */
export function emitSecurityEvent(event: SecurityEvent): void {
  const logData = {
    category: "security" as const,
    eventType: event.eventType,
    ip: event.ip,
    userId: event.userId,
    resourceId: event.resourceId,
    resourceType: event.resourceType,
    ...event.details,
  };

  if (event.severity === "error") {
    securityLogger.error(logData, `security:${event.eventType}`);
  } else {
    securityLogger.warn(logData, `security:${event.eventType}`);
  }
}

// ── Convenience helpers ──────────────────────────────────────────

export function logOwnershipViolation(params: {
  ip: string;
  userId?: string;
  resourceId: string;
  resourceType: string;
  organizationId?: string;
}): void {
  emitSecurityEvent({
    eventType: "ownership_violation",
    severity: "warn",
    ip: params.ip,
    userId: params.userId,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    details: { organizationId: params.organizationId },
  });
}

export function logPeriodLockViolation(params: {
  ip: string;
  userId?: string;
  year: number;
  month: number;
  organizationId: string;
}): void {
  emitSecurityEvent({
    eventType: "period_lock_violation",
    severity: "warn",
    ip: params.ip,
    userId: params.userId,
    details: {
      year: params.year,
      month: params.month,
      organizationId: params.organizationId,
    },
  });
}

export function logCsrfRejection(params: {
  ip: string;
  userId?: string;
  path: string;
  method: string;
}): void {
  emitSecurityEvent({
    eventType: "csrf_rejection",
    severity: "warn",
    ip: params.ip,
    userId: params.userId,
    details: { path: params.path, method: params.method },
  });
}

export function logAuthFailure(params: {
  ip: string;
  email?: string;
  reason: string;
}): void {
  emitSecurityEvent({
    eventType: "auth_failure",
    severity: "warn",
    ip: params.ip,
    details: { email: params.email, reason: params.reason },
  });
}

export function logRateLimitHit(params: {
  ip: string;
  path: string;
  method: string;
}): void {
  emitSecurityEvent({
    eventType: "rate_limit_hit",
    severity: "warn",
    ip: params.ip,
    details: { path: params.path, method: params.method },
  });
}
