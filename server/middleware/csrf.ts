import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { logCsrfRejection } from "../lib/securityEvents";

const CSRF_SECRET_KEY = "_csrfSecret";
const CSRF_HEADER = "x-csrf-token";

/**
 * Generate a per-session secret (created once, stored in session).
 */
function getOrCreateSecret(req: Request): string {
  const session = req.session as any;
  if (!session[CSRF_SECRET_KEY]) {
    session[CSRF_SECRET_KEY] = crypto.randomBytes(32).toString("hex");
  }
  return session[CSRF_SECRET_KEY];
}

/**
 * Create an HMAC token scoped to the session + route.
 */
export function generateCsrfToken(req: Request, route: string): string {
  const secret = getOrCreateSecret(req);
  return crypto.createHmac("sha256", secret).update(route).digest("hex");
}

/**
 * Express endpoint to issue a CSRF token for the client.
 * GET /api/auth/csrf-token
 */
export function csrfTokenEndpoint(req: Request, res: Response) {
  // Use a wildcard route so the token works for any mutating request
  const token = generateCsrfToken(req, "*");
  res.json({ token });
}

/**
 * Middleware: verify CSRF token on all POST/PUT/PATCH/DELETE requests.
 * Skips:
 *  - GET, HEAD, OPTIONS
 *  - Stripe webhook (uses its own signature verification)
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction) {
  // Safe methods don't need CSRF
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Stripe webhook has its own signature – skip CSRF
  if (req.path === "/api/stripe/webhook") {
    return next();
  }

  const session = req.session as any;
  const secret = session?.[CSRF_SECRET_KEY];

  // If there's no session secret yet, the user hasn't fetched a token
  if (!secret) {
    logCsrfRejection({ ip: req.ip || "unknown", userId: (req.session as any)?.userId, path: req.path, method: req.method });
    return res.status(403).json({ error: "CSRF-Token fehlt. Bitte Seite neu laden." });
  }

  const clientToken = req.headers[CSRF_HEADER] as string | undefined;
  if (!clientToken) {
    logCsrfRejection({ ip: req.ip || "unknown", userId: (req.session as any)?.userId, path: req.path, method: req.method });
    return res.status(403).json({ error: "CSRF-Token fehlt." });
  }

  // Verify against the wildcard route token
  const expected = crypto.createHmac("sha256", secret).update("*").digest("hex");

  if (!crypto.timingSafeEqual(Buffer.from(clientToken), Buffer.from(expected))) {
    logCsrfRejection({ ip: req.ip || "unknown", userId: (req.session as any)?.userId, path: req.path, method: req.method });
    return res.status(403).json({ error: "Ungültiger CSRF-Token." });
  }

  next();
}
