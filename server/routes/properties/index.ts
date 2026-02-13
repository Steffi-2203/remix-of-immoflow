import type { Express, Request, Response } from "express";
import { storage } from "../../storage";
import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import { isAuthenticated, snakeToCamel, maskPersonalData, getUserRoles, getProfileFromSession, isTester } from "../helpers";
import { assertOwnership } from "../../middleware/assertOrgOwnership";
import { requirePermission } from "../../middleware/rbac";
import { insertPropertySchema } from "@shared/schema";
import crypto from "crypto";
import { registerPropertyReportRoutes } from "./reports";

export function registerPropertyRoutes(app: Express) {
  app.get("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const roles = await getUserRoles(req);
      let props = await storage.getPropertiesByOrganization(profile?.organizationId);
      if (isTester(roles)) props = maskPersonalData(props);
      const allUnits = await storage.getUnitsByOrganization(profile?.organizationId);
      const allTenants = await storage.getTenantsByOrganization(profile?.organizationId);
      const enrichedProps = props.map(prop => {
        const propertyUnits = allUnits.filter(u => u.propertyId === prop.id);
        const totalQm = propertyUnits.reduce((sum, u) => sum + (Number(u.flaeche || u.qm) || 0), 0);
        const rentedUnits = propertyUnits.filter(unit => allTenants.some(t => t.unitId === unit.id && t.status === 'aktiv')).length;
        return { ...prop, total_units: propertyUnits.length, rented_units: rentedUnits, total_qm: totalQm };
      });
      res.json(enrichedProps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const property = await assertOwnership(req, res, req.params.id, "properties");
      if (!property) return;
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  app.get("/api/properties/:propertyId/units", isAuthenticated, async (req: any, res) => {
    try {
      const property = await assertOwnership(req, res, req.params.propertyId, "properties");
      if (!property) return;
      const profile = await getProfileFromSession(req);
      const units = await storage.getUnitsByProperty(req.params.propertyId);
      const unitsWithMea = units.map(unit => ({ ...unit, mea: unit.nutzwert, qm: unit.flaeche, vs_personen: unit.vsPersonen }));
      if (req.query.includeTenants === 'true') {
        const allTenants = await storage.getTenantsByOrganization(profile?.organizationId);
        const enrichedUnits = unitsWithMea.map(unit => ({ ...unit, tenants: allTenants.filter(t => t.unitId === unit.id) }));
        return res.json(enrichedUnits);
      }
      res.json(unitsWithMea);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      if (!profile) return res.status(403).json({ error: "Profile not found" });
      const normalizedBody = snakeToCamel(req.body);
      const rawUnits = normalizedBody.einheitenAnzahl ?? normalizedBody.numberOfUnits ?? 0;
      const numberOfUnits = typeof rawUnits === 'number' ? rawUnits : parseInt(rawUnits, 10);
      if (rawUnits !== 0 && isNaN(numberOfUnits)) return res.status(400).json({ error: "Ungültige Anzahl Einheiten" });
      const validUnits = numberOfUnits > 0 ? Math.min(numberOfUnits, 100) : 0;
      const validationResult = insertPropertySchema.safeParse({ ...normalizedBody, organizationId: profile.organizationId });
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      const propertyId = normalizedBody.id || crypto.randomUUID();
      const property = await storage.createProperty({ id: propertyId, ...validationResult.data });
      await storage.createPropertyManager({ userId: profile.id, propertyId: property.id });
      if (validUnits > 0) {
        const unitData = [];
        for (let i = 1; i <= validUnits; i++) {
          unitData.push({ propertyId: property.id, topNummer: `Top ${i}`, type: 'wohnung' as const, status: 'leerstand' as const, flaeche: '0', stockwerk: i });
        }
        await db.insert(schema.units).values(unitData);
      }
      res.json(property);
    } catch (error) {
      console.error("Create property error:", error);
      res.status(500).json({ error: "Failed to create property" });
    }
  });

  app.patch("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingProperty = await assertOwnership(req, res, req.params.id, "properties");
      if (!existingProperty) return;
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertPropertySchema.partial().safeParse(normalizedBody);
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      const property = await storage.updateProperty(req.params.id, validationResult.data);
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, requirePermission('properties', 'delete'), async (req: any, res) => {
    try {
      const property = await assertOwnership(req, res, req.params.id, "properties");
      if (!property) return;
      await storage.deleteProperty(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  app.post("/api/property-managers", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      if (!profile) return res.status(403).json({ error: "Profile not found" });
      const normalizedBody = snakeToCamel(req.body);
      const result = await storage.createPropertyManager({ userId: profile.id, propertyId: normalizedBody.propertyId });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign property" });
    }
  });

  app.delete("/api/property-managers/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      if (!profile) return res.status(403).json({ error: "Profile not found" });
      await storage.deletePropertyManager(profile.id, req.params.propertyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unassign property" });
    }
  });

  // Property expenses
  app.get("/api/properties/:propertyId/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const property = await assertOwnership(req, res, req.params.propertyId, "properties");
      if (!property) return;
      const { year } = req.query;
      const expenses = await storage.getExpensesByProperty(req.params.propertyId, year ? parseInt(year as string) : undefined);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // Property settlements
  app.get("/api/properties/:propertyId/settlements", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (property && property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      const settlements = await storage.getSettlementsByProperty(req.params.propertyId);
      res.json(settlements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settlements" });
    }
  });

  // Property maintenance contracts
  app.get("/api/properties/:propertyId/maintenance-contracts", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (property && property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      const contracts = await storage.getMaintenanceContractsByProperty(req.params.propertyId);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance contracts" });
    }
  });

  // Property documents
  app.get("/api/properties/:propertyId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId } = req.params;
      const orgId = req.session.organizationId;
      const documents = await db.select().from(schema.propertyDocuments)
        .where(and(eq(schema.propertyDocuments.propertyId, propertyId), eq(schema.propertyDocuments.organizationId, orgId)));
      res.json(documents.map(d => ({
        ...d, property_id: d.propertyId, organization_id: d.organizationId, file_url: d.fileUrl,
        file_size: d.fileSize, mime_type: d.mimeType, created_at: d.createdAt, updated_at: d.updatedAt,
      })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/properties/:propertyId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId } = req.params;
      const orgId = req.session.organizationId;
      const body = snakeToCamel(req.body);
      const property = await db.select().from(schema.properties)
        .where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, orgId)));
      if (property.length === 0) return res.status(403).json({ error: "Property not found or access denied" });
      const result = await db.insert(schema.propertyDocuments).values({
        propertyId, organizationId: orgId, name: body.name, category: body.category || 'sonstiges',
        fileUrl: body.fileUrl || body.file_url, fileSize: body.fileSize || body.file_size,
        mimeType: body.mimeType || body.mime_type, notes: body.notes,
      }).returning();
      res.json(result[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.delete("/api/properties/:propertyId/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const orgId = req.session.organizationId;
      await db.delete(schema.propertyDocuments).where(and(eq(schema.propertyDocuments.id, id), eq(schema.propertyDocuments.organizationId, orgId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Property distribution keys
  app.get("/api/properties/:propertyId/distribution-keys", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      const keys = await storage.getDistributionKeysByProperty(req.params.propertyId);
      res.json(keys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch distribution keys" });
    }
  });

  app.post("/api/properties/:propertyId/distribution-keys", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      const normalizedBody = snakeToCamel(req.body);
      const { keyCode, name, description, formula, unit, inputType } = normalizedBody;
      if (!keyCode || !name) return res.status(400).json({ error: "keyCode and name required" });
      const newKey = await storage.createDistributionKey({
        organizationId: profile.organizationId, propertyId: req.params.propertyId,
        keyCode, name, description, formula: formula || 'flaeche', unit: unit || 'm²',
        inputType: inputType || 'flaeche', isSystem: false, isActive: true,
      });
      res.status(201).json(newKey);
    } catch (error) {
      res.status(500).json({ error: "Failed to create distribution key" });
    }
  });

  // Property distribution values
  app.get("/api/properties/:propertyId/distribution-values", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      const values = await storage.getUnitDistributionValuesByProperty(req.params.propertyId);
      res.json(values);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property distribution values" });
    }
  });

  // Register report routes (vacancy, yield, operations, reserve-compliance)
  registerPropertyReportRoutes(app);
}
