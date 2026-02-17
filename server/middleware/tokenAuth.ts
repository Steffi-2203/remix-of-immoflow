import { Request, Response, NextFunction } from "express";
import { pool } from "../db";

const LOG_PREFIX = "[TokenAuth]";

/**
 * Verifies a Bearer token against the auth_tokens table and returns the
 * associated user_id if the token is valid and not expired.
 * Returns null for invalid, expired, or missing tokens.
 */
async function verifyTokenAndGetPayload(
  token: string
): Promise<{ userId: string } | null> {
  const result = await pool.query(
    "SELECT user_id FROM auth_tokens WHERE token = $1 AND expires_at > NOW() LIMIT 1",
    [token]
  );
  if (result.rows.length === 0) return null;
  return { userId: result.rows[0].user_id };
}

/**
 * Express middleware that authenticates requests via Bearer tokens.
 *
 * Flow:
 * 1. Skip if session already authenticated (short-circuit for cookie-based sessions)
 * 2. Extract Bearer token from Authorization header
 * 3. Verify token via verifyTokenAndGetPayload (DB lookup)
 * 4. On valid token: populate session with userId, email, organizationId
 * 5. Persist session via session.save()
 * 6. Fire-and-forget token expiry extension (24h sliding window)
 *
 * Design: never blocks the request pipeline — all errors are logged and
 * execution continues to next() so downstream middleware/routes can decide
 * whether authentication is required.
 */
export async function tokenAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if ((req.session as any)?.userId) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();

  const token = authHeader.slice(7);
  if (!token) {
    console.warn(`${LOG_PREFIX} Empty Bearer token received`, {
      path: req.path,
    });
    return next();
  }

  try {
    const payload = await verifyTokenAndGetPayload(token);

    if (payload) {
      const { userId } = payload;

      // Set tokenUserId so route handlers can distinguish token-based auth
      // from cookie-based session auth when needed (e.g. for audit logs).
      (req as any).tokenUserId = userId;
      (req.session as any).userId = userId;

      const profileResult = await pool.query(
        "SELECT email, organization_id FROM profiles WHERE id = $1 LIMIT 1",
        [userId]
      );

      if (profileResult.rows.length > 0) {
        (req.session as any).email = profileResult.rows[0].email;
        if (profileResult.rows[0].organization_id) {
          (req.session as any).organizationId =
            profileResult.rows[0].organization_id;
        }
      } else {
        console.warn(`${LOG_PREFIX} No profile found for userId=${userId}`);
      }

      // session.save() is necessary because we mutated the session object
      // after Express already loaded it. Without an explicit save(), the
      // session store (connect-pg-simple) will not persist our changes until
      // the response is sent — which means downstream middleware that reads
      // req.session.userId would see the value in memory but the session
      // cookie/store would be stale if the response short-circuits.
      // We wrap it in a Promise to await completion before calling next(),
      // but we resolve even on error so the request pipeline is never blocked.
      await new Promise<void>((resolve) => {
        req.session.save((err) => {
          if (err) {
            console.error(`${LOG_PREFIX} Session save error:`, err);
          }
          resolve();
        });
      });

      // Sliding window: extend token expiry by 24 hours on every valid use.
      // Fire-and-forget — failure to extend does not affect the current request.
      pool
        .query(
          "UPDATE auth_tokens SET expires_at = NOW() + INTERVAL '24 hours' WHERE token = $1",
          [token]
        )
        .catch((err) => {
          console.warn(`${LOG_PREFIX} Token refresh failed:`, err.message);
        });
    } else {
      console.warn(`${LOG_PREFIX} Invalid or expired token used`, {
        path: req.path,
      });
    }
  } catch (e) {
    // Catch-all: DB outage, network error, etc. — log and continue.
    // The request proceeds unauthenticated; downstream route guards
    // will return 401/403 as appropriate.
    console.error(`${LOG_PREFIX} Error resolving token:`, e);
  }

  next();
}

// Re-export for direct testing / reuse
export { verifyTokenAndGetPayload };
