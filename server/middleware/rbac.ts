import { db } from "../db";
import { sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

/**
 * P2-8a: Fine-grained RBAC middleware.
 *
 * Checks whether the authenticated user's role has permission
 * for the given resource + action, considering org-level overrides.
 */

type PermissionCheck = {
  resource: string;
  action: string;
};

/**
 * Check if a user has permission for a resource/action.
 * Looks up the user's role, then checks the permissions table
 * with optional org-level overrides.
 */
export async function hasPermission(
  userId: string,
  resource: string,
  action: string,
  organizationId?: string
): Promise<boolean> {
  // Admin bypass – admins always have full access
  const roleResult = await db.execute(sql`
    SELECT role FROM user_roles WHERE user_id = ${userId}::uuid LIMIT 1
  `);
  const role = roleResult.rows?.[0]?.role as string | undefined;
  if (!role) return false;
  if (role === 'admin') return true;

  // Check org-level override first
  if (organizationId) {
    const override = await db.execute(sql`
      SELECT allowed FROM role_permissions_override
      WHERE organization_id = ${organizationId}::uuid
        AND role = ${role}::public.app_role
        AND resource = ${resource}
        AND action = ${action}
      LIMIT 1
    `);
    if (override.rows && override.rows.length > 0) {
      return override.rows[0].allowed === true;
    }
  }

  // Fall back to default permissions
  const perm = await db.execute(sql`
    SELECT id FROM permissions
    WHERE role = ${role}::public.app_role
      AND resource = ${resource}
      AND action = ${action}
    LIMIT 1
  `);
  return (perm.rows?.length || 0) > 0;
}

/**
 * Express middleware factory.
 * Usage: router.post('/invoices', requirePermission('invoices', 'write'), handler)
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId || (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const organizationId = (req as any).organizationId || req.headers['x-organization-id'] as string;

    const allowed = await hasPermission(userId, resource, action, organizationId);
    if (!allowed) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: { resource, action },
      });
    }

    next();
  };
}
