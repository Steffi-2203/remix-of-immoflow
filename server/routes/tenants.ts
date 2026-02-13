import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import { isAuthenticated, snakeToCamel, maskPersonalData, getUserRoles, getProfileFromSession, isTester } from "./helpers";
import { assertOwnership } from "../middleware/assertOrgOwnership";
import { parsePagination, paginateArray } from "../lib/pagination";
import { insertTenantSchema, insertRentHistorySchema } from "@shared/schema";

export function registerTenantRoutes(app: Express) {
  app.get("/api/tenants", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const tenants = await storage.getTenantsByOrganization(profile?.organizationId);
      const roles = await getUserRoles(req);
      const masked = isTester(roles) ? maskPersonalData(tenants) : tenants;
      const pagination = parsePagination(req);
      res.json(paginateArray(masked, pagination));
    } catch (error) { res.status(500).json({ error: "Failed to fetch tenants" }); }
  });

  app.get("/api/tenants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await assertOwnership(req, res, req.params.id, "tenants");
      if (!tenant) return;
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(tenant) : tenant);
    } catch (error) { res.status(500).json({ error: "Failed to fetch tenant" }); }
  });

  app.post("/api/tenants", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const body = snakeToCamel(req.body);
      const unit = await assertOwnership(req, res, body.unitId, "units");
      if (!unit) return;
      const tenantData = {
        unitId: body.unitId, firstName: body.firstName || 'Unbekannt', lastName: body.lastName || 'Unbekannt',
        email: body.email || null, phone: body.phone || null, mobilePhone: body.mobilePhone || null,
        status: body.status || 'aktiv', mietbeginn: body.mietbeginn || null, mietende: body.mietende || null,
        grundmiete: body.grundmiete?.toString() || '0', betriebskostenVorschuss: body.betriebskostenVorschuss?.toString() || '0',
        heizkostenVorschuss: body.heizkostenVorschuss?.toString() || '0', wasserkostenVorschuss: body.wasserkostenVorschuss?.toString() || '0',
        warmwasserkostenVorschuss: body.warmwasserkostenVorschuss?.toString() || '0',
        sonstigeKosten: body.sonstigeKosten && typeof body.sonstigeKosten === 'object' ? body.sonstigeKosten : null,
        kaution: body.kaution?.toString() || null, kautionBezahlt: body.kautionBezahlt || false,
        iban: body.iban || null, bic: body.bic || null,
        sepaMandat: body.sepaMandat || false, sepaMandatDatum: body.sepaMandatDatum || null, notes: body.notes || null,
      };
      const validationResult = insertTenantSchema.safeParse(tenantData);
      if (!validationResult.success) return res.status(400).json({ error: "Validierung fehlgeschlagen", details: validationResult.error.flatten() });
      const [tenant] = await db.insert(schema.tenants).values(validationResult.data).returning();
      res.json(tenant);
    } catch (error) { res.status(500).json({ error: "Mieter konnte nicht erstellt werden" }); }
  });

  app.delete("/api/tenants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await assertOwnership(req, res, req.params.id, "tenants");
      if (!tenant) return;
      await storage.softDeleteTenant(req.params.id);
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to delete tenant" }); }
  });

  // Rent history
  app.get("/api/tenants/:tenantId/rent-history", isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await assertOwnership(req, res, req.params.tenantId, "tenants");
      if (!tenant) return;
      const history = await storage.getRentHistoryByTenant(req.params.tenantId);
      res.json(history);
    } catch (error) { res.status(500).json({ error: "Failed to fetch rent history" }); }
  });

  app.post("/api/tenants/:tenantId/rent-history", isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await assertOwnership(req, res, req.params.tenantId, "tenants");
      if (!tenant) return;
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertRentHistorySchema.safeParse({ ...normalizedBody, tenantId: req.params.tenantId });
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      const rentHistory = await storage.createRentHistory(validationResult.data);
      res.json(rentHistory);
    } catch (error) { res.status(500).json({ error: "Failed to create rent history" }); }
  });

  // Tenant leases
  app.get("/api/tenants/:tenantId/leases", isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await assertOwnership(req, res, req.params.tenantId, "tenants");
      if (!tenant) return;
      const leases = await storage.getLeasesByTenant(req.params.tenantId);
      res.json(leases);
    } catch (error) { res.status(500).json({ error: "Failed to fetch leases" }); }
  });

  // Tenant invoices & payments
  app.get("/api/tenants/:tenantId/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await assertOwnership(req, res, req.params.tenantId, "tenants");
      if (!tenant) return;
      const invoices = await storage.getInvoicesByTenant(req.params.tenantId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(invoices) : invoices);
    } catch (error) { res.status(500).json({ error: "Failed to fetch tenant invoices" }); }
  });

  app.get("/api/tenants/:tenantId/payments", isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await assertOwnership(req, res, req.params.tenantId, "tenants");
      if (!tenant) return;
      const payments = await storage.getPaymentsByTenant(req.params.tenantId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(payments) : payments);
    } catch (error) { res.status(500).json({ error: "Failed to fetch tenant payments" }); }
  });

  // Tenant documents
  app.get("/api/tenant-documents", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.session.organizationId;
      const documents = await db.select().from(schema.tenantDocuments).where(eq(schema.tenantDocuments.organizationId, orgId));
      res.json(documents.map(d => ({
        ...d, tenant_id: d.tenantId, organization_id: d.organizationId, file_url: d.fileUrl,
        file_size: d.fileSize, mime_type: d.mimeType, created_at: d.createdAt, updated_at: d.updatedAt,
      })));
    } catch (error) { res.status(500).json({ error: "Failed to fetch tenant documents" }); }
  });

  app.get("/api/tenants/:tenantId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const documents = await db.select().from(schema.tenantDocuments).where(eq(schema.tenantDocuments.tenantId, tenantId));
      res.json(documents.map(d => ({
        ...d, tenant_id: d.tenantId, organization_id: d.organizationId, file_url: d.fileUrl,
        file_size: d.fileSize, mime_type: d.mimeType, created_at: d.createdAt, updated_at: d.updatedAt,
      })));
    } catch (error) { res.status(500).json({ error: "Failed to fetch documents" }); }
  });

  app.post("/api/tenants/:tenantId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const orgId = req.session.organizationId;
      const body = snakeToCamel(req.body);
      const tenantResult = await db.select({
        tenantId: schema.tenants.id, unitId: schema.tenants.unitId,
        propertyId: schema.units.propertyId, organizationId: schema.properties.organizationId,
      }).from(schema.tenants)
        .leftJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
        .leftJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
        .where(eq(schema.tenants.id, tenantId));
      if (tenantResult.length === 0 || tenantResult[0].organizationId !== orgId) return res.status(403).json({ error: "Tenant not found or access denied" });
      const result = await db.insert(schema.tenantDocuments).values({
        tenantId, organizationId: orgId, name: body.name, category: body.category || 'sonstiges',
        fileUrl: body.fileUrl || body.file_url, fileSize: body.fileSize || body.file_size,
        mimeType: body.mimeType || body.mime_type, notes: body.notes,
      }).returning();
      res.json(result[0]);
    } catch (error) { res.status(500).json({ error: "Failed to create document" }); }
  });

  app.delete("/api/tenant-documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const orgId = req.session.organizationId;
      await db.delete(schema.tenantDocuments).where(and(eq(schema.tenantDocuments.id, id), eq(schema.tenantDocuments.organizationId, orgId)));
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to delete document" }); }
  });
}
