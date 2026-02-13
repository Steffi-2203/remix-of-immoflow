import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { isAuthenticated, snakeToCamel, getProfileFromSession } from "./helpers";
import { assertOwnership } from "../middleware/assertOrgOwnership";

export function registerUnitRoutes(app: Express) {
  app.get("/api/units", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const { parsePagination, paginateArray } = await import("../lib/pagination");
      const units = await storage.getUnitsByOrganization(profile?.organizationId);
      const unitsWithAliases = units.map(unit => ({ ...unit, mea: unit.nutzwert, qm: unit.flaeche, vs_personen: unit.vsPersonen }));
      const pagination = parsePagination(req);
      res.json(paginateArray(unitsWithAliases, pagination));
    } catch (error) { res.status(500).json({ error: "Failed to fetch units" }); }
  });

  app.get("/api/units/:id", isAuthenticated, async (req: any, res) => {
    try {
      const unit = await assertOwnership(req, res, req.params.id, "units");
      if (!unit) return;
      res.json({ ...unit, mea: unit.nutzwert, qm: unit.flaeche, vs_personen: unit.vsPersonen });
    } catch (error) { res.status(500).json({ error: "Failed to fetch unit" }); }
  });

  app.post("/api/units", isAuthenticated, async (req: any, res) => {
    try {
      const body = snakeToCamel(req.body);
      const property = await assertOwnership(req, res, body.propertyId, "properties");
      if (!property) return;
      const unitData = {
        propertyId: body.propertyId, topNummer: body.topNummer, type: body.type || 'wohnung',
        flaeche: body.flaeche || body.qm || '0', nutzwert: body.nutzwert || body.mea || null,
        status: body.status === 'vermietet' ? 'aktiv' : (body.status || 'leerstand'),
        vsPersonen: body.vsPersonen || null, stockwerk: body.stockwerk || body.floor || null,
        leerstandBk: body.leerstandBk || '0', leerstandHk: body.leerstandHk || '0',
      };
      const unit = await storage.createUnit(unitData);
      res.json(unit);
    } catch (error: any) { res.status(500).json({ error: error.message || "Failed to create unit" }); }
  });

  app.patch("/api/units/:id", isAuthenticated, async (req: any, res) => {
    try {
      const unit = await assertOwnership(req, res, req.params.id, "units");
      if (!unit) return;
      const body = snakeToCamel(req.body);
      const updateData: any = {};
      if (body.topNummer !== undefined) updateData.topNummer = body.topNummer;
      if (body.type !== undefined) updateData.type = body.type;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.flaeche !== undefined) updateData.flaeche = String(body.flaeche);
      if (body.qm !== undefined) updateData.flaeche = String(body.qm);
      if (body.nutzwert !== undefined) updateData.nutzwert = String(body.nutzwert);
      if (body.mea !== undefined) updateData.nutzwert = String(body.mea);
      if (body.stockwerk !== undefined) updateData.stockwerk = body.stockwerk;
      if (body.floor !== undefined) updateData.stockwerk = body.floor;
      if (body.vsPersonen !== undefined) updateData.vsPersonen = body.vsPersonen;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.leerstandBk !== undefined) updateData.leerstandBk = String(body.leerstandBk);
      if (body.leerstandHk !== undefined) updateData.leerstandHk = String(body.leerstandHk);
      const updated = await storage.updateUnit(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) { res.status(500).json({ error: error.message || "Failed to update unit" }); }
  });

  app.delete("/api/units/:id", isAuthenticated, async (req: any, res) => {
    try {
      const unit = await assertOwnership(req, res, req.params.id, "units");
      if (!unit) return;
      await storage.softDeleteUnit(req.params.id);
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to delete unit" }); }
  });

  // Unit tenants
  app.get("/api/units/:unitId/tenants", isAuthenticated, async (req: any, res) => {
    try {
      const { getUserRoles, isTester, maskPersonalData } = await import("./helpers");
      const unit = await assertOwnership(req, res, req.params.unitId, "units");
      if (!unit) return;
      const tenants = await storage.getTenantsByUnit(req.params.unitId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(tenants) : tenants);
    } catch (error) { res.status(500).json({ error: "Failed to fetch tenants" }); }
  });

  // Unit leases
  app.get("/api/units/:unitId/leases", isAuthenticated, async (req: any, res) => {
    try {
      const unit = await assertOwnership(req, res, req.params.unitId, "units");
      if (!unit) return;
      const leases = await storage.getLeasesByUnit(req.params.unitId);
      res.json(leases);
    } catch (error) { res.status(500).json({ error: "Failed to fetch leases" }); }
  });

  // Unit distribution values
  app.get("/api/units/:unitId/distribution-values", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const unit = await storage.getUnit(req.params.unitId);
      if (!unit) return res.status(404).json({ error: "Unit not found" });
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      const values = await storage.getUnitDistributionValues(req.params.unitId);
      res.json(values);
    } catch (error) { res.status(500).json({ error: "Failed to fetch unit distribution values" }); }
  });

  app.post("/api/units/:unitId/distribution-values", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const unit = await storage.getUnit(req.params.unitId);
      if (!unit) return res.status(404).json({ error: "Unit not found" });
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      const normalizedBody = snakeToCamel(req.body);
      const { keyId, value } = normalizedBody;
      if (!keyId) return res.status(400).json({ error: "keyId is required" });
      const key = await storage.getDistributionKey(keyId);
      if (!key) return res.status(400).json({ error: "Invalid distribution key" });
      if (!key.isSystem && key.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Distribution key access denied" });
      const result = await storage.upsertUnitDistributionValue({ unitId: req.params.unitId, keyId, value: value?.toString() || '0' });
      res.json(result);
    } catch (error) { res.status(500).json({ error: "Failed to save unit distribution value" }); }
  });

  app.delete("/api/units/:unitId/distribution-values/:keyId", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const unit = await storage.getUnit(req.params.unitId);
      if (!unit) return res.status(404).json({ error: "Unit not found" });
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      await storage.deleteUnitDistributionValue(req.params.unitId, req.params.keyId);
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to delete unit distribution value" }); }
  });
}
