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

router.get("/properties", async (req: Request, res: Response) => {
  try {
    const { limit, offset, page } = parsePagination(req);
    const orgId = req.query.organization_id as string;

    let query = db.select().from(schema.properties).where(isNull(schema.properties.deletedAt));
    
    if (orgId) {
      query = db.select().from(schema.properties).where(
        and(eq(schema.properties.organizationId, orgId), isNull(schema.properties.deletedAt))
      );
    }

    const properties = await query.limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.properties).where(isNull(schema.properties.deletedAt));
    
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
    const property = await db.select().from(schema.properties)
      .where(and(eq(schema.properties.id, req.params.id), isNull(schema.properties.deletedAt)))
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
    const { limit, offset, page } = parsePagination(req);
    const propertyId = req.query.property_id as string;

    let whereClause = isNull(schema.units.deletedAt);
    if (propertyId) {
      whereClause = and(eq(schema.units.propertyId, propertyId), isNull(schema.units.deletedAt))!;
    }

    const units = await db.select().from(schema.units).where(whereClause).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.units).where(whereClause);
    
    res.json({
      data: units,
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly units error:", error);
    res.status(500).json({ error: "Failed to fetch units" });
  }
});

router.get("/units/:id", async (req: Request, res: Response) => {
  try {
    const unit = await db.select().from(schema.units)
      .where(and(eq(schema.units.id, req.params.id), isNull(schema.units.deletedAt)))
      .limit(1);
    
    if (!unit.length) {
      return res.status(404).json({ error: "Unit not found" });
    }
    res.json({ data: unit[0] });
  } catch (error) {
    console.error("Readonly unit error:", error);
    res.status(500).json({ error: "Failed to fetch unit" });
  }
});

router.get("/tenants", async (req: Request, res: Response) => {
  try {
    const { limit, offset, page } = parsePagination(req);
    const unitId = req.query.unit_id as string;
    const propertyId = req.query.property_id as string;

    let whereClause = isNull(schema.tenants.deletedAt);
    if (unitId) {
      whereClause = and(eq(schema.tenants.unitId, unitId), isNull(schema.tenants.deletedAt))!;
    }

    const tenants = await db.select().from(schema.tenants).where(whereClause).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.tenants).where(whereClause);
    
    res.json({
      data: tenants,
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly tenants error:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

router.get("/tenants/:id", async (req: Request, res: Response) => {
  try {
    const tenant = await db.select().from(schema.tenants)
      .where(and(eq(schema.tenants.id, req.params.id), isNull(schema.tenants.deletedAt)))
      .limit(1);
    
    if (!tenant.length) {
      return res.status(404).json({ error: "Tenant not found" });
    }
    res.json({ data: tenant[0] });
  } catch (error) {
    console.error("Readonly tenant error:", error);
    res.status(500).json({ error: "Failed to fetch tenant" });
  }
});

router.get("/invoices", async (req: Request, res: Response) => {
  try {
    const { limit, offset, page } = parsePagination(req);
    const tenantId = req.query.tenant_id as string;
    const year = req.query.year as string;
    const month = req.query.month as string;

    let whereClause = sql`1=1`;
    const conditions = [];
    
    if (tenantId) conditions.push(eq(schema.monthlyInvoices.tenantId, tenantId));
    if (year) conditions.push(eq(schema.monthlyInvoices.year, parseInt(year)));
    if (month) conditions.push(eq(schema.monthlyInvoices.month, parseInt(month)));

    const invoices = await db.select().from(schema.monthlyInvoices)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.monthlyInvoices.year), desc(schema.monthlyInvoices.month))
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.monthlyInvoices)
      .where(conditions.length ? and(...conditions) : undefined);
    
    res.json({
      data: invoices,
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly invoices error:", error);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

router.get("/invoices/:id", async (req: Request, res: Response) => {
  try {
    const invoice = await db.select().from(schema.monthlyInvoices)
      .where(eq(schema.monthlyInvoices.id, req.params.id))
      .limit(1);
    
    if (!invoice.length) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const lines = await db.select().from(schema.invoiceLines)
      .where(eq(schema.invoiceLines.invoiceId, req.params.id));

    res.json({ data: { ...invoice[0], lines } });
  } catch (error) {
    console.error("Readonly invoice error:", error);
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});

router.get("/payments", async (req: Request, res: Response) => {
  try {
    const { limit, offset, page } = parsePagination(req);
    const tenantId = req.query.tenant_id as string;

    let whereClause = tenantId ? eq(schema.payments.tenantId, tenantId) : undefined;

    const payments = await db.select().from(schema.payments)
      .where(whereClause)
      .orderBy(desc(schema.payments.buchungsDatum))
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.payments).where(whereClause);
    
    res.json({
      data: payments,
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly payments error:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

router.get("/expenses", async (req: Request, res: Response) => {
  try {
    const { limit, offset, page } = parsePagination(req);
    const propertyId = req.query.property_id as string;

    const conditions = [];
    if (propertyId) conditions.push(eq(schema.expenses.propertyId, propertyId));

    const expenses = await db.select().from(schema.expenses)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.expenses.datum))
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.expenses)
      .where(conditions.length ? and(...conditions) : undefined);
    
    res.json({
      data: expenses,
      pagination: { page, limit, total: Number(countResult[0]?.count || 0) }
    });
  } catch (error) {
    console.error("Readonly expenses error:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.get("/bank-accounts", async (req: Request, res: Response) => {
  try {
    const { limit, offset, page } = parsePagination(req);
    const propertyId = req.query.property_id as string;

    let whereClause = propertyId ? eq(schema.bankAccounts.propertyId, propertyId) : undefined;

    const accounts = await db.select().from(schema.bankAccounts)
      .where(whereClause)
      .limit(limit).offset(offset);

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.bankAccounts).where(whereClause);
    
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
