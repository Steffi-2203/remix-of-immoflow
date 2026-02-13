import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { isAuthenticated, snakeToCamel, maskPersonalData, getUserRoles, getProfileFromSession, isTester } from "./helpers";
import { assertOwnership } from "../middleware/assertOrgOwnership";
import { requirePermission } from "../middleware/rbac";
import { parsePagination, paginateArray } from "../lib/pagination";
import { insertPropertySchema } from "@shared/schema";
import crypto from "crypto";

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

  // Vacancy report
  app.get("/api/properties/:propertyId/vacancy-report", isAuthenticated, async (req: any, res) => {
    try {
      const property = await assertOwnership(req, res, req.params.propertyId, "properties");
      if (!property) return;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || null;
      const units = await storage.getUnitsByProperty(req.params.propertyId);
      const tenants = await storage.getTenantsByProperty(req.params.propertyId);
      const vacantUnits: any[] = [];
      let totalVacancyCostBk = 0;
      let totalVacancyCostHk = 0;
      for (const unit of units) {
        const isVacant = unit.status === 'leerstand';
        const activeTenant = tenants.find(t => {
          if (t.deletedAt || t.unitId !== unit.id) return false;
          const contractStart = t.mietvertragBeginn ? new Date(t.mietvertragBeginn) : null;
          const contractEnd = t.mietvertragEnde ? new Date(t.mietvertragEnde) : null;
          const checkDate = month ? new Date(year, month - 1, 15) : new Date(year, 5, 15);
          if (contractStart && checkDate < contractStart) return false;
          if (contractEnd && checkDate > contractEnd) return false;
          return true;
        });
        if (isVacant || !activeTenant) {
          const lastTenant = tenants.filter(t => t.unitId === unit.id).sort((a, b) => {
            const dateA = a.mietvertragEnde ? new Date(a.mietvertragEnde).getTime() : 0;
            const dateB = b.mietvertragEnde ? new Date(b.mietvertragEnde).getTime() : 0;
            return dateB - dateA;
          })[0];
          const monthlyBkSoll = lastTenant ? (Number(lastTenant.betriebskostenVorschuss) || 0) : 0;
          const monthlyHkSoll = lastTenant ? (Number(lastTenant.heizkostenVorschuss) || 0) : 0;
          const hasEstimatedData = !lastTenant;
          let vacancyMonths = 0;
          if (month) { vacancyMonths = 1; } else {
            for (let m = 1; m <= 12; m++) {
              const checkDate = new Date(year, m - 1, 15);
              const hasActiveInMonth = tenants.some(t => {
                if (t.deletedAt || t.unitId !== unit.id) return false;
                const cs = t.mietvertragBeginn ? new Date(t.mietvertragBeginn) : null;
                const ce = t.mietvertragEnde ? new Date(t.mietvertragEnde) : null;
                if (cs && checkDate < cs) return false;
                if (ce && checkDate > ce) return false;
                return true;
              });
              if (!hasActiveInMonth) vacancyMonths++;
            }
          }
          const vacancyCostBk = monthlyBkSoll * vacancyMonths;
          const vacancyCostHk = monthlyHkSoll * vacancyMonths;
          totalVacancyCostBk += vacancyCostBk;
          totalVacancyCostHk += vacancyCostHk;
          vacantUnits.push({
            unitId: unit.id, topNummer: unit.topNummer, type: unit.type, flaeche: Number(unit.flaeche) || 0,
            status: unit.status, vacancyMonths, monthlyBkSoll, monthlyHkSoll, vacancyCostBk, vacancyCostHk,
            totalVacancyCost: vacancyCostBk + vacancyCostHk, lastTenantName: lastTenant?.name || null,
            lastContractEnd: lastTenant?.mietvertragEnde || null, requiresConfiguration: hasEstimatedData,
          });
        }
      }
      const vacancyRate = units.length > 0 ? (vacantUnits.length / units.length) * 100 : 0;
      const vacantArea = vacantUnits.reduce((sum, u) => sum + u.flaeche, 0);
      const totalArea = units.reduce((sum, u) => sum + (Number(u.flaeche) || 0), 0);
      const areaVacancyRate = totalArea > 0 ? (vacantArea / totalArea) * 100 : 0;
      res.json({
        year, month: month || null, propertyId: property.id, propertyName: property.name,
        totalUnits: units.length, vacantUnits: vacantUnits.length, vacancyRate, vacantArea, totalArea,
        areaVacancyRate, totalVacancyCostBk, totalVacancyCostHk,
        totalVacancyCost: totalVacancyCostBk + totalVacancyCostHk,
        ownerResponsibility: `Leerstandskosten werden dem Eigentümer zugewiesen: BK ${totalVacancyCostBk.toFixed(2)} € + HK ${totalVacancyCostHk.toFixed(2)} € = ${(totalVacancyCostBk + totalVacancyCostHk).toFixed(2)} €`,
        units: vacantUnits,
      });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Erstellen des Leerstandsberichts" });
    }
  });

  // Yield report
  app.get("/api/properties/:propertyId/yield-report", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (!property) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });
      if (property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Zugriff verweigert" });
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const units = await storage.getUnitsByProperty(req.params.propertyId);
      const expenses = await storage.getExpensesByProperty(req.params.propertyId, year);
      const tenants = await storage.getTenantsByProperty(req.params.propertyId);
      let annualRentGross = 0, annualBetriebskostenGross = 0;
      for (const tenant of tenants) {
        if (tenant.deletedAt) continue;
        const monthlyRent = Number(tenant.hauptmietzins) || 0;
        const monthlyBk = Number(tenant.betriebskostenVorschuss) || 0;
        const contractStart = tenant.mietvertragBeginn ? new Date(tenant.mietvertragBeginn) : null;
        const contractEnd = tenant.mietvertragEnde ? new Date(tenant.mietvertragEnde) : null;
        let monthsActive = 12;
        if (contractStart) { const sy = contractStart.getFullYear(); const sm = contractStart.getMonth(); if (sy === year) monthsActive = 12 - sm; else if (sy > year) monthsActive = 0; }
        if (contractEnd) { const ey = contractEnd.getFullYear(); const em = contractEnd.getMonth(); if (ey === year) monthsActive = Math.min(monthsActive, em + 1); else if (ey < year) monthsActive = 0; }
        annualRentGross += monthlyRent * monthsActive;
        annualBetriebskostenGross += monthlyBk * monthsActive;
      }
      let instandhaltungGross = 0, betriebskostenExpenseGross = 0;
      for (const expense of expenses) {
        const amount = Number(expense.betrag) || 0;
        if (expense.category === 'instandhaltung') instandhaltungGross += amount;
        else if (expense.category === 'betriebskosten_umlagefaehig') betriebskostenExpenseGross += amount;
      }
      const annualRentNet = annualRentGross;
      const instandhaltungNet = instandhaltungGross / 1.20;
      const netYield = annualRentNet - instandhaltungNet;
      const purchasePrice = Number(property.purchasePrice) || 0;
      const yieldPercentage = purchasePrice > 0 ? (netYield / purchasePrice) * 100 : null;
      res.json({
        year, propertyId: property.id, propertyName: property.name, unitCount: units.length,
        tenantCount: tenants.filter(t => !t.deletedAt).length, annualRentGross, annualRentNet,
        annualBetriebskostenGross, instandhaltungGross, instandhaltungNet, betriebskostenExpenseGross,
        netYield, yieldPercentage, purchasePrice: purchasePrice || null,
        formula: `Miete netto (${annualRentNet.toFixed(2)} €) - Instandhaltungen netto (${instandhaltungNet.toFixed(2)} €) = Nettorendite (${netYield.toFixed(2)} €)`,
      });
    } catch (error) {
      res.status(500).json({ error: "Fehler beim Erstellen des Renditeberichts" });
    }
  });

  // Reserve compliance
  app.get("/api/properties/:propertyId/reserve-compliance", isAuthenticated, async (req: any, res) => {
    try {
      const property = await assertOwnership(req, res, req.params.propertyId, "properties");
      if (!property) return;
      const { checkReserveCompliance } = await import("../services/wegComplianceService");
      const currentReserve = Number(req.query.currentReserve || 0);
      const result = await checkReserveCompliance(req.params.propertyId, currentReserve);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to check reserve compliance" });
    }
  });

  // ── Combined Operations & Yield Report per Property ─────────────────────
  app.get("/api/properties/:propertyId/operations-report", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (!property) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });
      if (property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Zugriff verweigert" });

      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const propertyId = req.params.propertyId;

      // Parallel data fetch
      const [units, tenants, expenses, payments] = await Promise.all([
        storage.getUnitsByProperty(propertyId),
        storage.getTenantsByProperty(propertyId),
        storage.getExpensesByProperty(propertyId, year),
        // Get all payments for tenants of this property
        (async () => {
          const propTenants = await storage.getTenantsByProperty(propertyId);
          const tenantIds = propTenants.filter(t => !t.deletedAt).map(t => t.id);
          if (tenantIds.length === 0) return [];
          return db.select().from(schema.payments)
            .where(and(
              inArray(schema.payments.tenantId, tenantIds),
              gte(schema.payments.buchungsDatum, `${year}-01-01`),
              lte(schema.payments.buchungsDatum, `${year}-12-31`)
            ));
        })(),
      ]);

      const activeTenants = tenants.filter(t => !t.deletedAt && t.status === 'aktiv');
      const occupiedUnits = units.filter(u => u.status === 'aktiv').length;
      const totalArea = units.reduce((sum, u) => sum + (Number(u.flaeche) || 0), 0);

      // ── Mietverteilung pro Einheit ─────────────────────────────────────
      const rentDistribution = units.map(unit => {
        const unitTenants = activeTenants.filter(t => t.unitId === unit.id);
        const tenant = unitTenants[0]; // Primary tenant

        // Calculate months active in year
        let monthsActive = 0;
        if (tenant) {
          const contractStart = tenant.mietvertragBeginn ? new Date(tenant.mietvertragBeginn) : null;
          const contractEnd = tenant.mietvertragEnde ? new Date(tenant.mietvertragEnde) : null;
          monthsActive = 12;
          if (contractStart) {
            const sy = contractStart.getFullYear(), sm = contractStart.getMonth();
            if (sy === year) monthsActive = 12 - sm;
            else if (sy > year) monthsActive = 0;
          }
          if (contractEnd) {
            const ey = contractEnd.getFullYear(), em = contractEnd.getMonth();
            if (ey === year) monthsActive = Math.min(monthsActive, em + 1);
            else if (ey < year) monthsActive = 0;
          }
        }

        const sollMiete = tenant ? (Number(tenant.grundmiete) || 0) * monthsActive : 0;
        const sollBk = tenant ? (Number(tenant.betriebskostenVorschuss) || 0) * monthsActive : 0;
        const sollHk = tenant ? (Number(tenant.heizkostenVorschuss) || 0) * monthsActive : 0;
        const sollGesamt = sollMiete + sollBk + sollHk;

        // IST: actual payments for this tenant
        const tenantPayments = tenant
          ? payments.filter(p => p.tenantId === tenant.id)
          : [];
        const istGesamt = tenantPayments.reduce((sum, p) => sum + (Number(p.betrag) || 0), 0);

        return {
          unitId: unit.id,
          unitName: unit.name || unit.unitNumber || `Einheit ${unit.id.slice(0, 6)}`,
          unitType: unit.unitType,
          flaeche: Number(unit.flaeche) || 0,
          status: unit.status,
          tenantId: tenant?.id || null,
          tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : null,
          contractStart: tenant?.mietvertragBeginn || null,
          contractEnd: tenant?.mietvertragEnde || null,
          monthsActive,
          spiegel: {
            grundmiete: sollMiete,
            betriebskosten: sollBk,
            heizkosten: sollHk,
            gesamt: sollGesamt,
          },
          ist: istGesamt,
          differenz: istGesamt - sollGesamt,
          mietpreis_m2: (Number(unit.flaeche) || 0) > 0 && tenant
            ? (Number(tenant.grundmiete) || 0) / (Number(unit.flaeche) || 1)
            : 0,
        };
      });

      // ── Ausgaben nach Kategorie ────────────────────────────────────────
      const expensesByCategory: Record<string, { amount: number; count: number; umlagefaehig: boolean }> = {};
      let totalInstandhaltung = 0;
      let totalBetriebskosten = 0;

      for (const exp of expenses) {
        const cat = exp.category || 'sonstiges';
        const amount = Number(exp.betrag) || 0;
        if (!expensesByCategory[cat]) {
          expensesByCategory[cat] = { amount: 0, count: 0, umlagefaehig: exp.istUmlagefaehig !== false };
        }
        expensesByCategory[cat].amount += amount;
        expensesByCategory[cat].count++;

        if (cat === 'instandhaltung' || cat === 'reparatur') {
          totalInstandhaltung += amount;
        } else {
          totalBetriebskosten += amount;
        }
      }

      // ── Rendite-Kennzahlen ─────────────────────────────────────────────
      const totalSollMiete = rentDistribution.reduce((s, r) => s + r.spiegel.grundmiete, 0);
      const totalSollGesamt = rentDistribution.reduce((s, r) => s + r.spiegel.gesamt, 0);
      const totalIst = rentDistribution.reduce((s, r) => s + r.ist, 0);
      const totalExpenses = expenses.reduce((s, e) => s + (Number(e.betrag) || 0), 0);

      const nettoertrag = totalSollMiete - totalInstandhaltung;
      const purchasePrice = Number(property.purchasePrice) || 0;
      const renditePercent = purchasePrice > 0 ? (nettoertrag / purchasePrice) * 100 : null;
      const renditePerM2 = totalArea > 0 ? nettoertrag / totalArea : 0;

      const collectionRate = totalSollGesamt > 0 ? (totalIst / totalSollGesamt) * 100 : 100;
      const occupancyRate = units.length > 0 ? (occupiedUnits / units.length) * 100 : 0;

      res.json({
        meta: {
          propertyId: property.id,
          propertyName: property.name,
          address: property.address,
          year,
          generatedAt: new Date().toISOString(),
        },
        kpis: {
          totalUnits: units.length,
          occupiedUnits,
          occupancyRate: Math.round(occupancyRate * 10) / 10,
          collectionRate: Math.round(collectionRate * 10) / 10,
          totalArea,
          sollMieteJahr: totalSollMiete,
          sollGesamtJahr: totalSollGesamt,
          istGesamtJahr: totalIst,
          differenz: totalIst - totalSollGesamt,
          totalExpenses,
          nettoertrag,
          renditePercent: renditePercent !== null ? Math.round(renditePercent * 100) / 100 : null,
          renditePerM2: Math.round(renditePerM2 * 100) / 100,
          purchasePrice: purchasePrice || null,
        },
        rentDistribution,
        expenseBreakdown: Object.entries(expensesByCategory).map(([category, data]) => ({
          category,
          ...data,
        })).sort((a, b) => b.amount - a.amount),
      });
    } catch (error) {
      console.error('Operations report error:', error);
      res.status(500).json({ error: "Fehler beim Erstellen des Betriebs- und Renditeberichts" });
    }
  });
}
