import { Request, Response, NextFunction } from "express";
import { pool } from "../db";

const LOG_PREFIX = "[TokenAuth]";

export async function tokenAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  if ((req.session as any)?.userId) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.slice(7);
  if (!token) {
    console.warn(`${LOG_PREFIX} Empty Bearer token received`, { path: req.path });
    return next();
  }

  try {
    const result = await pool.query(
      'SELECT user_id FROM auth_tokens WHERE token = $1 AND expires_at > NOW() LIMIT 1',
      [token]
    );

    if (result.rows.length > 0) {
      const userId = result.rows[0].user_id;
      (req as any).tokenUserId = userId;
      (req.session as any).userId = userId;

      const profileResult = await pool.query(
        'SELECT email, organization_id FROM profiles WHERE id = $1 LIMIT 1',
        [userId]
      );

      if (profileResult.rows.length > 0) {
        (req.session as any).email = profileResult.rows[0].email;
        if (profileResult.rows[0].organization_id) {
          (req.session as any).organizationId = profileResult.rows[0].organization_id;
        }
      } else {
        console.warn(`${LOG_PREFIX} No profile found for userId=${userId}`);
      }

      await new Promise<void>((resolve) => {
        req.session.save((err) => {
          if (err) {
            console.error(`${LOG_PREFIX} Session save error:`, err);
          }
          resolve();
        });
      });

      pool.query(
        "UPDATE auth_tokens SET expires_at = NOW() + INTERVAL '24 hours' WHERE token = $1",
        [token]
      ).catch((err) => {
        console.warn(`${LOG_PREFIX} Token refresh failed:`, err.message);
      });
    } else {
      console.warn(`${LOG_PREFIX} Invalid or expired token used`, { path: req.path });
    }
  } catch (e) {
    console.error(`${LOG_PREFIX} Error resolving token:`, e);
  }

  next();
}
