import { Request, Response, NextFunction } from "express";
import onFinished from "on-finished";
import crypto from "crypto";
import { logger } from "../lib/logger";

/**
 * Express middleware: structured request logging via Pino.
 * - Assigns a unique requestId (x-request-id) for correlation
 * - Logs method, path, status, duration on request finish
 * - Redacts sensitive fields from body/response
 */

const SENSITIVE_KEYS = [
  "password", "token", "access_token", "refresh_token",
  "session", "secret", "apiKey", "api_key", "authorization",
];

function redact(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const clone = structuredClone(obj) as Record<string, unknown>;
  for (const key of SENSITIVE_KEYS) {
    if (clone[key]) clone[key] = "***REDACTED***";
  }
  return clone;
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  // Correlation ID
  const requestId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("x-request-id", requestId);

  const start = Date.now();
  const path = req.path;

  // Only log API requests
  if (!path.startsWith("/api")) return next();

  const reqLogger = logger.child({ requestId });

  // Capture JSON response for logging
  let capturedJson: unknown;
  const originalJson = res.json;
  res.json = function (body, ...args) {
    capturedJson = body;
    return originalJson.apply(res, [body, ...args]);
  };

  onFinished(res, () => {
    const duration = Date.now() - start;
    const logData: Record<string, unknown> = {
      method: req.method,
      path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    };

    const isDev = process.env.NODE_ENV !== "production";
    if (isDev && req.body && Object.keys(req.body).length > 0) {
      logData.body = redact(req.body);
    }
    if (capturedJson) {
      logData.response = redact(capturedJson);
    }

    // Truncate large response/body for log
    const jsonStr = JSON.stringify(logData);
    if (jsonStr.length > 2000) {
      delete logData.response;
      delete logData.body;
    }

    if (res.statusCode >= 500) {
      reqLogger.error(logData, `${req.method} ${path} ${res.statusCode}`);
    } else if (res.statusCode >= 400) {
      reqLogger.warn(logData, `${req.method} ${path} ${res.statusCode}`);
    } else {
      reqLogger.info(logData, `${req.method} ${path} ${res.statusCode}`);
    }
  });

  next();
}
