import { Router, Request, Response } from "express";
import { db } from "../db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { apiKeyAuth } from "../middleware/apiKey";

const router = Router();

router.use(apiKeyAuth);

function parsePagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Extracts and validates organization_id from query params.
 * ALL readonly endpoints MUST be scoped to an organization.
 */
function requireOrgId(req: Request, res: Response): string | null {
  const orgId = req.query.organization_id as string;
  if (!orgId) {
    res.status(400).json({ error: "organization_id query parameter is required" });
    return null;
  }
  return orgId;
}

router.get("/properties", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { limit, offset, page } = parsePagination(req);

    const whereClause = and(
      eq(schema.properties.organizationId, orgId),
      isNull(schema.properties.deletedAt)
    );

    const properties = await db.select().from(schema.properties)
      .where(whereClause)
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.properties).where(whereClause);
    
    res.json({
      data: properties,
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly properties error:", error);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

router.get("/properties/:id", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const property = await db.select().from(schema.properties)
      .where(and(
        eq(schema.properties.id, req.params.id),
        eq(schema.properties.organizationId, orgId),
        isNull(schema.properties.deletedAt)
      ))
      .limit(1);
    
    if (!property.length) {
      return res.status(404).json({ error: "Property not found" });
    }
    res.json({ data: property[0] });
  } catch (error) {
    console.error("Readonly property error:", error);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

router.get("/units", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { limit, offset, page } = parsePagination(req);
    const propertyId = req.query.property_id as string;

    // Join to properties to enforce org scope
    const conditions = [
      eq(schema.properties.organizationId, orgId),
      isNull(schema.units.deletedAt),
    ];
    if (propertyId) {
      conditions.push(eq(schema.units.propertyId, propertyId));
    }

    const unitsData = await db.select({ unit: schema.units })
      .from(schema.units)
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(...conditions))
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.units)
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(...conditions));
    
    res.json({
      data: unitsData.map(r => r.unit),
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly units error:", error);
    res.status(500).json({ error: "Failed to fetch units" });
  }
});

router.get("/units/:id", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const result = await db.select({ unit: schema.units })
      .from(schema.units)
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(
        eq(schema.units.id, req.params.id),
        eq(schema.properties.organizationId, orgId),
        isNull(schema.units.deletedAt)
      ))
      .limit(1);
    
    if (!result.length) {
      return res.status(404).json({ error: "Unit not found" });
    }
    res.json({ data: result[0].unit });
  } catch (error) {
    console.error("Readonly unit error:", error);
    res.status(500).json({ error: "Failed to fetch unit" });
  }
});

router.get("/tenants", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { limit, offset, page } = parsePagination(req);
    const unitId = req.query.unit_id as string;

    const conditions = [
      eq(schema.properties.organizationId, orgId),
      isNull(schema.tenants.deletedAt),
    ];
    if (unitId) {
      conditions.push(eq(schema.tenants.unitId, unitId));
    }

    const tenantsData = await db.select({ tenant: schema.tenants })
      .from(schema.tenants)
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(...conditions))
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.tenants)
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(...conditions));
    
    res.json({
      data: tenantsData.map(r => r.tenant),
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly tenants error:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

router.get("/tenants/:id", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const result = await db.select({ tenant: schema.tenants })
      .from(schema.tenants)
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(
        eq(schema.tenants.id, req.params.id),
        eq(schema.properties.organizationId, orgId),
        isNull(schema.tenants.deletedAt)
      ))
      .limit(1);
    
    if (!result.length) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json({ data: result[0].tenant });
  } catch (error) {
    console.error("Readonly tenant error:", error);
    res.status(500).json({ error: "Failed to fetch tenant" });
  }
});

router.get("/invoices", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { limit, offset, page } = parsePagination(req);
    const tenantId = req.query.tenant_id as string;
    const year = req.query.year as string;
    const month = req.query.month as string;

    const conditions = [
      eq(schema.properties.organizationId, orgId),
    ];
    if (tenantId) conditions.push(eq(schema.monthlyInvoices.tenantId, tenantId));
    if (year) conditions.push(eq(schema.monthlyInvoices.year, parseInt(year)));
    if (month) conditions.push(eq(schema.monthlyInvoices.month, parseInt(month)));

    const invoicesData = await db.select({ invoice: schema.monthlyInvoices })
      .from(schema.monthlyInvoices)
      .innerJoin(schema.tenants, eq(schema.monthlyInvoices.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(...conditions))
      .orderBy(desc(schema.monthlyInvoices.year), desc(schema.monthlyInvoices.month))
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.monthlyInvoices)
      .innerJoin(schema.tenants, eq(schema.monthlyInvoices.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(...conditions));
    
    res.json({
      data: invoicesData.map(r => r.invoice),
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly invoices error:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.get("/invoices/:id", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const result = await db.select({ invoice: schema.monthlyInvoices })
      .from(schema.monthlyInvoices)
      .innerJoin(schema.tenants, eq(schema.monthlyInvoices.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(
        eq(schema.monthlyInvoices.id, req.params.id),
        eq(schema.properties.organizationId, orgId)
      ))
      .limit(1);
    
    if (!result.length) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const lines = await db.select().from(schema.invoiceLines)
      .where(eq(schema.invoiceLines.invoiceId, req.params.id));

    res.json({ data: { ...result[0].invoice, lines } });
  } catch (error) {
    console.error("Readonly invoice error:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

router.get("/payments", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { limit, offset, page } = parsePagination(req);
    const tenantId = req.query.tenant_id as string;

    const conditions = [
      eq(schema.properties.organizationId, orgId),
    ];
    if (tenantId) conditions.push(eq(schema.payments.tenantId, tenantId));

    const paymentsData = await db.select({ payment: schema.payments })
      .from(schema.payments)
      .innerJoin(schema.tenants, eq(schema.payments.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(...conditions))
      .orderBy(desc(schema.payments.buchungsDatum))
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.payments)
      .innerJoin(schema.tenants, eq(schema.payments.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(...conditions));
    
    res.json({
      data: paymentsData.map(r => r.payment),
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly payments error:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.get("/expenses", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { limit, offset, page } = parsePagination(req);
    const propertyId = req.query.property_id as string;

    const conditions = [
      eq(schema.properties.organizationId, orgId),
    ];
    if (propertyId) conditions.push(eq(schema.expenses.propertyId, propertyId));

    const expensesData = await db.select({ expense: schema.expenses })
      .from(schema.expenses)
      .innerJoin(schema.properties, eq(schema.expenses.propertyId, schema.properties.id))
      .where(and(...conditions))
      .orderBy(desc(schema.expenses.datum))
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.expenses)
      .innerJoin(schema.properties, eq(schema.expenses.propertyId, schema.properties.id))
      .where(and(...conditions));
    
    res.json({
      data: expensesData.map(r => r.expense),
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly expenses error:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.get("/bank-accounts", async (req: Request, res: Response) => {
  try {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;

    const { limit, offset, page } = parsePagination(req);

    const whereClause = eq(schema.bankAccounts.organizationId, orgId);

    const accounts = await db.select().from(schema.bankAccounts)
      .where(whereClause)
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(schema.bankAccounts).where(whereClause);
    
    res.json({
      data: accounts,
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly bank-accounts error:", error);
    res.status(500).json({ error: "Failed to fetch bank accounts" });
  }
});

export default router;