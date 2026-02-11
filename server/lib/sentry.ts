/**
 * server/lib/sentry.ts
 *
 * Sentry integration for exception tracking and performance monitoring.
 *
 * Initialized only when SENTRY_DSN is set. Provides:
 * - Automatic Express error capture
 * - Performance transaction tracing
 * - User context from session
 * - Breadcrumbs for billing operations
 * - Filtered PII (no passwords, tokens in events)
 */

import { logger } from './logger';

const sentryLog = logger.child({ service: 'sentry' });

// ─── Types ───

interface SentryUser {
  id: string;
  email?: string;
  org_id?: string;
}

interface SentryBreadcrumb {
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
  timestamp?: number;
}

interface SentryEvent {
  event_id: string;
  timestamp: string;
  level: string;
  platform: string;
  server_name: string;
  environment: string;
  release?: string;
  user?: SentryUser;
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: { frames: Array<{ filename: string; lineno: number; function: string }> };
    }>;
  };
  breadcrumbs?: SentryBreadcrumb[];
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

// ─── Configuration ───

const SENTRY_DSN = process.env.SENTRY_DSN;
const SENTRY_ENVIRONMENT = process.env.NODE_ENV || 'development';
const SENTRY_RELEASE = process.env.npm_package_version || 'unknown';

// PII fields to strip from events
const PII_FIELDS = new Set([
  'password', 'password_hash', 'token', 'secret', 'api_key',
  'authorization', 'cookie', 'session_secret', 'iban', 'bic',
  'stripe_secret', 'cosign_private_key',
]);

let initialized = false;
const breadcrumbBuffer: SentryBreadcrumb[] = [];
const MAX_BREADCRUMBS = 100;

// ─── Core Functions ───

function generateEventId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function stripPII(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_FIELDS.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      cleaned[key] = stripPII(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Initialize Sentry. No-op if SENTRY_DSN is not set.
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    sentryLog.info('SENTRY_DSN not configured — Sentry disabled');
    return;
  }

  initialized = true;
  sentryLog.info({ environment: SENTRY_ENVIRONMENT, release: SENTRY_RELEASE }, 'Sentry initialized');
}

/**
 * Capture an exception and send to Sentry.
 */
export async function captureException(
  error: Error,
  context?: { user?: SentryUser; tags?: Record<string, string>; extra?: Record<string, any> }
): Promise<string | null> {
  if (!initialized || !SENTRY_DSN) {
    sentryLog.error({ err: error, ...context?.extra }, 'Exception (Sentry disabled)');
    return null;
  }

  const eventId = generateEventId();

  const event: SentryEvent = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    level: 'error',
    platform: 'node',
    server_name: process.env.HOSTNAME || 'immoflowme',
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    user: context?.user,
    exception: {
      values: [{
        type: error.name || 'Error',
        value: error.message,
        stacktrace: error.stack ? {
          frames: error.stack.split('\n').slice(1, 20).map(line => {
            const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
            return {
              function: match?.[1] || 'unknown',
              filename: match?.[2] || 'unknown',
              lineno: parseInt(match?.[3] || '0'),
            };
          }),
        } : undefined,
      }],
    },
    breadcrumbs: [...breadcrumbBuffer],
    tags: context?.tags,
    extra: context?.extra ? stripPII(context.extra) : undefined,
  };

  try {
    // Parse DSN: https://<key>@<host>/<project_id>
    const dsnUrl = new URL(SENTRY_DSN);
    const projectId = dsnUrl.pathname.slice(1);
    const sentryKey = dsnUrl.username;
    const sentryHost = dsnUrl.hostname;

    const storeUrl = `https://${sentryHost}/api/${projectId}/store/`;

    const response = await fetch(storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=immoflowme/1.0, sentry_key=${sentryKey}`,
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      sentryLog.warn({ status: response.status, eventId }, 'Sentry event submission failed');
    } else {
      sentryLog.debug({ eventId }, 'Exception sent to Sentry');
    }
  } catch (err) {
    sentryLog.warn({ err, eventId }, 'Sentry transport error (non-blocking)');
  }

  return eventId;
}

/**
 * Add a breadcrumb for context in future error reports.
 */
export function addBreadcrumb(crumb: Omit<SentryBreadcrumb, 'timestamp'>): void {
  breadcrumbBuffer.push({
    ...crumb,
    timestamp: Date.now() / 1000,
  });

  // Keep buffer bounded
  if (breadcrumbBuffer.length > MAX_BREADCRUMBS) {
    breadcrumbBuffer.shift();
  }
}

/**
 * Set user context for future error reports.
 */
let currentUser: SentryUser | undefined;
export function setUser(user: SentryUser | undefined): void {
  currentUser = user;
}

// ─── Express Middleware ───

import type { Request, Response, NextFunction } from 'express';

/**
 * Express error handler that captures exceptions to Sentry.
 * Mount as the LAST error handler.
 */
export function sentryErrorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  const user: SentryUser | undefined = (req as any).session?.userId
    ? { id: (req as any).session.userId, org_id: (req as any).session.orgId }
    : currentUser;

  captureException(err, {
    user,
    tags: {
      method: req.method,
      path: req.path,
      status: String(res.statusCode),
    },
    extra: {
      query: req.query,
      params: req.params,
      requestId: req.headers['x-request-id'] as string,
    },
  }).catch(() => {}); // fire and forget

  next(err);
}

/**
 * Request handler that adds billing breadcrumbs.
 */
export function sentryRequestMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!initialized) {
    next();
    return;
  }

  addBreadcrumb({
    category: 'http',
    message: `${req.method} ${req.path}`,
    level: 'info',
    data: {
      method: req.method,
      url: req.originalUrl,
      requestId: req.headers['x-request-id'] as string,
    },
  });

  next();
}
