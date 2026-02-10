/**
 * Standardized API error response utility.
 * Ensures consistent error shape across all endpoints.
 *
 * Response shape:
 * {
 *   error: { code: string, message: string, details?: unknown }
 * }
 */

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toJSON(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined && { details: this.details }),
      },
    };
  }
}

// ── Common factory helpers ──────────────────────────────────────

export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new ApiError(400, "BAD_REQUEST", message, details),

  unauthorized: (message = "Nicht autorisiert") =>
    new ApiError(401, "UNAUTHORIZED", message),

  forbidden: (message = "Zugriff verweigert") =>
    new ApiError(403, "FORBIDDEN", message),

  notFound: (resource = "Ressource") =>
    new ApiError(404, "NOT_FOUND", `${resource} nicht gefunden`),

  conflict: (message: string, details?: unknown) =>
    new ApiError(409, "CONFLICT", message, details),

  retentionLocked: (retentionUntil: string, standard: string) =>
    new ApiError(403, "RETENTION_LOCKED", 
      `Dokument unterliegt der gesetzlichen Aufbewahrungspflicht (${standard.toUpperCase()})`,
      { retentionUntil, standard }),

  periodLocked: (year: number, month: number) =>
    new ApiError(409, "PERIOD_LOCKED",
      `Buchungsperiode ${month}/${year} ist gesperrt`),

  validationFailed: (details: unknown) =>
    new ApiError(400, "VALIDATION_FAILED", "Validierung fehlgeschlagen", details),

  internal: (message = "Interner Serverfehler") =>
    new ApiError(500, "INTERNAL_ERROR", message),
} as const;
