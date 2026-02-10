import { db } from "../db";
import { eq, and, sql, type InferSelectModel } from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import * as schema from "@shared/schema";
import { storage } from "../storage";
import { logOwnershipViolation } from "../lib/securityEvents";

/**
 * OrgOwnershipError – thrown when a resource does not belong
 * to the caller's organization or does not exist.
 */
export class OrgOwnershipError extends Error {
  public readonly status: number;

  constructor(message: string, status: 404 | 403 = 404) {
    super(message);
    this.name = "OrgOwnershipError";
    this.status = status;
  }
}

/**
 * Resolves the organizationId for a given resource.
 *
 * Direct tables: properties, bank_accounts, expenses, organizations, contractors,
 *   maintenance_contracts, maintenance_tasks, distribution_keys, account_categories,
 *   settlements, deadlines, insurance_policies, letter_templates, fixed_assets
 *
 * Indirect (via property): units → property.organizationId
 * Indirect (via unit → property): tenants, leases → unit → property
 * Indirect (via tenant → unit → property): payments, monthly_invoices
 */

type ResourceTable =
  | "properties"
  | "units"
  | "tenants"
  | "payments"
  | "monthly_invoices"
  | "invoices" // alias for monthly_invoices
  | "expenses"
  | "bank_accounts"
  | "organizations"
  | "contractors"
  | "maintenance_contracts"
  | "maintenance_tasks"
  | "distribution_keys"
  | "account_categories"
  | "settlements"
  | "leases"
  | "payment_allocations"
  | "transactions";

/**
 * Generic ownership check for tables with a direct `organizationId` column.
 * Performs a single SQL query: WHERE id = $1 AND organization_id = $2.
 */
export async function assertOrgOwnershipDirect<T extends PgTable>({
  table,
  id,
  organizationId,
  idColumn = (table as any).id,
  orgColumn = (table as any).organizationId,
}: {
  table: T;
  id: string;
  organizationId: string;
  idColumn?: PgColumn;
  orgColumn?: PgColumn;
}): Promise<InferSelectModel<T>> {
  if (!organizationId) {
    throw new OrgOwnershipError("organizationId is required", 403);
  }
  if (!id) {
    throw new OrgOwnershipError("resourceId is required", 404);
  }
  const rows = await db
    .select()
    .from(table)
    .where(and(eq(idColumn, id), eq(orgColumn, organizationId)))
    .limit(1);
  if (!rows[0]) throw new OrgOwnershipError("Not found");
  return rows[0] as InferSelectModel<T>;
}

/**
 * Assert that a resource with `resourceId` in `table` belongs to `organizationId`.
 *
 * @throws OrgOwnershipError if the resource is not found (404) or belongs to
 *         a different organization (404 — intentionally not 403 to avoid
 *         leaking existence).
 *
 * @returns The loaded resource row (useful to avoid a second query).
 */
export async function assertOrgOwnership<T = any>(opts: {
  organizationId: string;
  resourceId: string;
  table: ResourceTable;
}): Promise<T> {
  const { organizationId, resourceId, table } = opts;

  if (!organizationId) {
    throw new OrgOwnershipError("organizationId is required", 403);
  }
  if (!resourceId) {
    throw new OrgOwnershipError("resourceId is required", 404);
  }

  switch (table) {
    // ── Direct org column ──────────────────────────────────────────
    case "properties": {
      const row = await storage.getProperty(resourceId);
      if (!row) throw new OrgOwnershipError("Property not found");
      if (row.organizationId !== organizationId)
        throw new OrgOwnershipError("Property not found");
      return row as T;
    }

    case "expenses": {
      const row = await storage.getExpense(resourceId);
      if (!row) throw new OrgOwnershipError("Expense not found");
      // expenses link to a property
      const prop = await storage.getProperty(row.propertyId);
      if (!prop || prop.organizationId !== organizationId)
        throw new OrgOwnershipError("Expense not found");
      return row as T;
    }

    case "bank_accounts": {
      const row = await storage.getBankAccount(resourceId);
      if (!row) throw new OrgOwnershipError("Bank account not found");
      if (row.organizationId !== organizationId)
        throw new OrgOwnershipError("Bank account not found");
      return row as T;
    }

    case "organizations": {
      const row = await storage.getOrganization(resourceId);
      if (!row) throw new OrgOwnershipError("Organization not found");
      if (row.id !== organizationId)
        throw new OrgOwnershipError("Organization not found");
      return row as T;
    }

    case "contractors":
      return assertOrgOwnershipDirect({
        table: schema.contractors,
        id: resourceId,
        organizationId,
      }) as Promise<T>;

    case "maintenance_contracts":
      return assertOrgOwnershipDirect({
        table: schema.maintenanceContracts,
        id: resourceId,
        organizationId,
      }) as Promise<T>;

    case "maintenance_tasks":
      return assertOrgOwnershipDirect({
        table: schema.maintenanceTasks,
        id: resourceId,
        organizationId,
      }) as Promise<T>;

    case "distribution_keys": {
      const row = await storage.getDistributionKey(resourceId);
      if (!row) throw new OrgOwnershipError("Distribution key not found");
      // system keys are accessible to everyone
      if (row.isSystem) return row as T;
      if (row.organizationId !== organizationId)
        throw new OrgOwnershipError("Distribution key not found");
      return row as T;
    }

    case "account_categories": {
      // First try org-scoped lookup
      const rows = await db
        .select()
        .from(schema.accountCategories)
        .where(
          and(
            eq(schema.accountCategories.id, resourceId),
            eq(schema.accountCategories.organizationId, organizationId)
          )
        )
        .limit(1);
      if (rows[0]) return rows[0] as T;
      // Check if it's a system category (no org)
      const systemRows = await db
        .select()
        .from(schema.accountCategories)
        .where(
          and(
            eq(schema.accountCategories.id, resourceId),
            eq(schema.accountCategories.isSystem, true)
          )
        )
        .limit(1);
      if (systemRows[0]) return systemRows[0] as T;
      throw new OrgOwnershipError("Account category not found");
    }

    case "settlements":
      return assertOrgOwnershipDirect({
        table: schema.settlements,
        id: resourceId,
        organizationId,
      }) as Promise<T>;

    // ── Indirect via property ──────────────────────────────────────
    case "units": {
      const unit = await storage.getUnit(resourceId);
      if (!unit) throw new OrgOwnershipError("Unit not found");
      const prop = await storage.getProperty(unit.propertyId);
      if (!prop || prop.organizationId !== organizationId)
        throw new OrgOwnershipError("Unit not found");
      return unit as T;
    }

    // ── Indirect via unit → property ───────────────────────────────
    case "tenants": {
      const tenant = await storage.getTenant(resourceId);
      if (!tenant) throw new OrgOwnershipError("Tenant not found");
      const unit = await storage.getUnit(tenant.unitId);
      if (!unit) throw new OrgOwnershipError("Tenant not found");
      const prop = await storage.getProperty(unit.propertyId);
      if (!prop || prop.organizationId !== organizationId)
        throw new OrgOwnershipError("Tenant not found");
      return tenant as T;
    }

    case "leases": {
      const lease = await storage.getLease(resourceId);
      if (!lease) throw new OrgOwnershipError("Lease not found");
      const unit = await storage.getUnit(lease.unitId);
      if (!unit) throw new OrgOwnershipError("Lease not found");
      const prop = await storage.getProperty(unit.propertyId);
      if (!prop || prop.organizationId !== organizationId)
        throw new OrgOwnershipError("Lease not found");
      return lease as T;
    }

    // ── Indirect via tenant → unit → property ──────────────────────
    case "payments": {
      const payment = await storage.getPayment(resourceId);
      if (!payment) throw new OrgOwnershipError("Payment not found");
      const tenant = await storage.getTenant(payment.tenantId);
      if (!tenant) throw new OrgOwnershipError("Payment not found");
      const unit = await storage.getUnit(tenant.unitId);
      if (!unit) throw new OrgOwnershipError("Payment not found");
      const prop = await storage.getProperty(unit.propertyId);
      if (!prop || prop.organizationId !== organizationId)
        throw new OrgOwnershipError("Payment not found");
      return payment as T;
    }

    case "invoices":
    case "monthly_invoices": {
      const invoice = await storage.getInvoice(resourceId);
      if (!invoice) throw new OrgOwnershipError("Invoice not found");
      // invoices have unitId directly  
      if (invoice.unitId) {
        const unit = await storage.getUnit(invoice.unitId);
        if (!unit) throw new OrgOwnershipError("Invoice not found");
        const prop = await storage.getProperty(unit.propertyId);
        if (!prop || prop.organizationId !== organizationId)
          throw new OrgOwnershipError("Invoice not found");
      } else if (invoice.tenantId) {
        const tenant = await storage.getTenant(invoice.tenantId);
        if (!tenant) throw new OrgOwnershipError("Invoice not found");
        const unit = await storage.getUnit(tenant.unitId);
        if (!unit) throw new OrgOwnershipError("Invoice not found");
        const prop = await storage.getProperty(unit.propertyId);
        if (!prop || prop.organizationId !== organizationId)
          throw new OrgOwnershipError("Invoice not found");
      }
      return invoice as T;
    }

    case "payment_allocations": {
      const rows = await db
        .select()
        .from(schema.paymentAllocations)
        .where(eq(schema.paymentAllocations.id, resourceId))
        .limit(1);
      const alloc = rows[0];
      if (!alloc) throw new OrgOwnershipError("Payment allocation not found");
      // Verify via payment → tenant → unit → property
      if (alloc.paymentId) {
        const payment = await storage.getPayment(alloc.paymentId);
        if (!payment) throw new OrgOwnershipError("Payment allocation not found");
        const tenant = await storage.getTenant(payment.tenantId);
        if (!tenant) throw new OrgOwnershipError("Payment allocation not found");
        const unit = await storage.getUnit(tenant.unitId);
        if (!unit) throw new OrgOwnershipError("Payment allocation not found");
        const prop = await storage.getProperty(unit.propertyId);
        if (!prop || prop.organizationId !== organizationId)
          throw new OrgOwnershipError("Payment allocation not found");
      }
      return alloc as T;
    }

    // ── Indirect via bank_account ──────────────────────────────────
    case "transactions": {
      const transaction = await storage.getTransaction(resourceId);
      if (!transaction) throw new OrgOwnershipError("Transaction not found");
      if (transaction.bankAccountId) {
        const bankAccount = await storage.getBankAccount(transaction.bankAccountId);
        if (!bankAccount || bankAccount.organizationId !== organizationId)
          throw new OrgOwnershipError("Transaction not found");
      } else {
        // Transaction without bank account – cannot verify ownership
        throw new OrgOwnershipError("Transaction not found");
      }
      return transaction as T;
    }

    default:
      throw new OrgOwnershipError(`Unknown resource table: ${table}`, 403);
  }
}

/**
 * Express-friendly wrapper: resolves the org from session profile,
 * runs assertOrgOwnership, and attaches the loaded resource to req.
 * On failure sends 404.
 *
 * Usage in route handler:
 *   const property = await assertOwnership(req, res, req.params.id, "properties");
 *   if (!property) return; // response already sent
 */
export async function assertOwnership<T = any>(
  req: any,
  res: any,
  resourceId: string,
  table: ResourceTable
): Promise<T | null> {
  try {
    const profile = req._cachedProfile || (await getProfileFromReq(req));
    if (!profile?.organizationId) {
      res.status(403).json({ error: "No organization context" });
      return null;
    }

    const resource = await assertOrgOwnership<T>({
      organizationId: profile.organizationId,
      resourceId,
      table,
    });
    return resource;
  } catch (err) {
    if (err instanceof OrgOwnershipError) {
      logOwnershipViolation({
        ip: req.ip || req.connection?.remoteAddress || "unknown",
        userId: req.session?.userId,
        resourceId,
        resourceType: table,
        organizationId: req._cachedProfile?.organizationId,
      });
      res.status(err.status).json({ error: err.message });
      return null;
    }
    throw err;
  }
}

// Small helper to get profile from session (avoids circular dependency with routes)
async function getProfileFromReq(req: any) {
  const userId = req.session?.userId;
  if (!userId) return null;
  const profile = await storage.getProfileById(userId);
  req._cachedProfile = profile;
  return profile;
}
