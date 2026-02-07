import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, sql, and, or, lt, inArray, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { registerFunctionRoutes } from "./functions";
import { registerStripeRoutes } from "./stripeRoutes";
import { runSimulation } from "./seed-2025-simulation";
import { sepaExportService } from "./services/sepaExportService";
import { demoService } from "./services/demoService";
import { settlementPdfService } from "./services/settlementPdfService";
import { automatedDunningService } from "./services/automatedDunningService";
import { vpiAutomationService } from "./services/vpiAutomationService";
import { maintenanceReminderService } from "./services/maintenanceReminderService";
import { ownerReportingService } from "./services/ownerReportingService";
import { bmdDatevExportService } from "./services/bmdDatevExportService";
import { finanzOnlineService } from "./services/finanzOnlineService";
import { paymentService } from "./services/paymentService";
import readonlyRoutes from "./routes/readonly";
import featureRoutes from "./routes/featureRoutes";
import crypto from "crypto";
import multer from "multer";
import OpenAI from "openai";
import { 
  insertRentHistorySchema,
  insertPropertySchema,
  insertPaymentSchema,
  insertTransactionSchema,
  insertExpenseSchema,
  insertMonthlyInvoiceSchema,
  insertTenantSchema
} from "@shared/schema";

// Convert snake_case keys to camelCase for database compatibility
function snakeToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (typeof obj !== 'object') return obj;
  
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = snakeToCamel(value);
  }
  return result;
}

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

function maskPersonalData(data: any): any {
  if (!data) return data;
  
  const sensitivePatterns = [
    'firstname', 'lastname', 'first_name', 'last_name', 'vorname', 'nachname',
    'fullname', 'full_name', 'tenant_name', 'tenantname', 'owner',
    'email', 'mail', 'contact',
    'phone', 'telefon', 'mobile', 'mobil', 'handy', 'fax',
    'iban', 'bic', 'bank_account', 'bankaccount', 'account_holder', 'accountholder', 'kontoinhaber',
    'birthdate', 'birth_date', 'geburtsdatum', 'birthday',
    'address', 'adresse', 'street', 'strasse', 'postal', 'plz', 'city', 'stadt', 'ort',
    'recipient', 'empfaenger', 'absender', 'sender',
  ];
  
  const shouldMask = (key: string): boolean => {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'name' && lowerKey.length === 4) return false;
    return sensitivePatterns.some(p => lowerKey.includes(p));
  };
  
  const maskValue = (key: string, value: any): any => {
    if (typeof value !== 'string' || !value) return value;
    
    const lowerKey = key.toLowerCase();
    
    if (lowerKey.includes('email') || lowerKey.includes('mail')) return 'mieter@beispiel.at';
    if (lowerKey.includes('phone') || lowerKey.includes('telefon') || lowerKey.includes('mobil') || lowerKey.includes('handy') || lowerKey.includes('fax')) return '+43 XXX XXXXXX';
    if (lowerKey.includes('iban')) return 'AT** **** **** **** ****';
    if (lowerKey.includes('bic')) return 'XXXXATXX';
    if (lowerKey.includes('account') || lowerKey.includes('konto')) return 'Max Mustermann';
    if (lowerKey.includes('first') || lowerKey === 'vorname') return 'Max';
    if (lowerKey.includes('last') || lowerKey === 'nachname') return 'Mustermann';
    if (lowerKey.includes('name') || lowerKey.includes('tenant') || lowerKey.includes('owner') || lowerKey.includes('recipient') || lowerKey.includes('contact')) {
      return 'Max Mustermann';
    }
    if (lowerKey.includes('address') || lowerKey.includes('adresse') || lowerKey.includes('street') || lowerKey.includes('strasse')) {
      return 'Musterstraße 1';
    }
    if (lowerKey.includes('city') || lowerKey.includes('stadt') || lowerKey.includes('ort')) return 'Wien';
    if (lowerKey.includes('postal') || lowerKey.includes('plz')) return '1010';
    if (lowerKey.includes('birth') || lowerKey.includes('geburt')) return '01.01.1980';
    
    return '***';
  };
  
  if (Array.isArray(data)) {
    return data.map(item => maskPersonalData(item));
  }
  
  if (typeof data === 'object') {
    const masked: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (shouldMask(key)) {
        masked[key] = maskValue(key, value);
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = maskPersonalData(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }
  
  return data;
}

async function getUserRoles(req: any): Promise<string[]> {
  try {
    const userId = req.session?.userId;
    if (!userId) return [];
    const roles = await storage.getUserRoles(userId);
    return roles.map((r: any) => r.role);
  } catch {
    return [];
  }
}

async function getProfileFromSession(req: any) {
  const userId = req.session?.userId;
  if (!userId) return null;
  return storage.getProfileById(userId);
}

function isTester(roles: string[]): boolean {
  return roles.includes('tester');
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.use("/api/readonly", readonlyRoutes);
  app.use(featureRoutes);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/organizations", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.json([]);
      }
      const org = await storage.getOrganization(profile.organizationId);
      res.json(org ? [org] : []);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  app.patch("/api/organizations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const profile = await getProfileFromSession(req);
      
      // Only allow updating own organization
      if (profile?.organizationId !== id) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Only admins can update organization
      const roles = await getUserRoles(req);
      if (!roles.some((r: any) => r.role === 'admin')) {
        return res.status(403).json({ error: "Admin required" });
      }
      
      const { name, iban, bic, sepa_creditor_id, brandName, logoUrl, primaryColor, supportEmail } = req.body;
      
      const updated = await db.update(schema.organizations)
        .set({
          ...(name !== undefined && { name }),
          ...(iban !== undefined && { iban }),
          ...(bic !== undefined && { bic }),
          ...(sepa_creditor_id !== undefined && { sepaCreditorId: sepa_creditor_id }),
          ...(brandName !== undefined && { brandName }),
          ...(logoUrl !== undefined && { logoUrl }),
          ...(primaryColor !== undefined && { primaryColor }),
          ...(supportEmail !== undefined && { supportEmail }),
          updatedAt: new Date(),
        })
        .where(eq(schema.organizations.id, id))
        .returning();
      
      res.json(updated[0]);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  app.get("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const roles = await getUserRoles(req);
      let props = await storage.getPropertiesByOrganization(profile?.organizationId);
      if (isTester(roles)) {
        props = maskPersonalData(props);
      }
      
      // Enrich properties with unit statistics
      const allUnits = await storage.getUnitsByOrganization(profile?.organizationId);
      const allTenants = await storage.getTenantsByOrganization(profile?.organizationId);
      
      const enrichedProps = props.map(prop => {
        const propertyUnits = allUnits.filter(u => u.propertyId === prop.id);
        const totalQm = propertyUnits.reduce((sum, u) => sum + (Number(u.flaeche || u.qm) || 0), 0);
        
        // Count units with active tenants
        const rentedUnits = propertyUnits.filter(unit => {
          return allTenants.some(t => 
            t.unitId === unit.id && 
            t.status === 'aktiv'
          );
        }).length;
        
        return {
          ...prop,
          total_units: propertyUnits.length,
          rented_units: rentedUnits,
          total_qm: totalQm,
        };
      });
      
      res.json(enrichedProps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      if (property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property" });
    }
  });

  app.get("/api/properties/:propertyId/units", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (property && property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const units = await storage.getUnitsByProperty(req.params.propertyId);
      
      // Add aliases for frontend compatibility
      const unitsWithMea = units.map(unit => ({
        ...unit,
        mea: unit.nutzwert,      // Alias for frontend compatibility
        qm: unit.flaeche,        // Alias for frontend compatibility
        vs_personen: unit.vsPersonen, // Alias for frontend compatibility
      }));
      
      if (req.query.includeTenants === 'true') {
        const allTenants = await storage.getTenantsByOrganization(profile?.organizationId);
        const enrichedUnits = unitsWithMea.map(unit => ({
          ...unit,
          tenants: allTenants.filter(t => t.unitId === unit.id)
        }));
        return res.json(enrichedUnits);
      }
      
      res.json(unitsWithMea);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.get("/api/settlements", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId, year } = req.query;
      if (!propertyId || !year) {
        return res.status(400).json({ error: "Missing propertyId or year" });
      }
      const settlement = await storage.getSettlementByPropertyAndYear(propertyId as string, parseInt(year as string));
      if (!settlement) return res.status(404).json({ error: "Settlement not found" });
      
      const items = await storage.getSettlementItems(settlement.id);
      res.json({ ...settlement, settlement_items: items });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settlement" });
    }
  });

  app.post("/api/settlements", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const normalizedBody = snakeToCamel(req.body);
      const { propertyId, year, items, ...data } = normalizedBody;
      
      // § 21 Abs 3 MRG: Fristprüfung - BK-Abrechnung muss bis 30.06. des Folgejahres erstellt werden
      const deadlineDate = new Date(year + 1, 5, 30); // 30. Juni des Folgejahres (Monat 5 = Juni, 0-indexed)
      const today = new Date();
      const isAfterDeadline = today > deadlineDate;
      const mrgDeadlineWarning = isAfterDeadline 
        ? `Achtung: Die Frist gemäß § 21 Abs 3 MRG für die BK-Abrechnung ${year} (30.06.${year + 1}) ist bereits abgelaufen. Eine verspätete Abrechnung kann zu Rechtsverlusten führen.`
        : null;
      
      // § 21 Abs 4 MRG: 3-Jahre-Verjährung - Nachforderungen verjähren 3 Jahre nach Ende des Abrechnungsjahres
      // Verjährungsfrist beginnt am 01.01. des Folgejahres und endet am 31.12. drei Jahre später
      const expirationDate = new Date(year + 4, 0, 1); // 01.01. des 4. Folgejahres = nach Ablauf von 3 Jahren ab Jahresende
      const isExpired = today >= expirationDate;
      const mrgExpirationWarning = isExpired
        ? `Achtung: Die Nachforderungen für ${year} sind gemäß § 21 Abs 4 MRG seit 01.01.${year + 4} verjährt. Nachforderungen können rechtlich nicht mehr durchgesetzt werden.`
        : null;
      
      const existing = await storage.getSettlementByPropertyAndYear(propertyId, year);
      let settlementId: string;
      
      if (existing) {
        await storage.updateSettlement(existing.id, {
          gesamtkosten: data.totalBk + data.totalHk,
          totalBk: data.totalBk,
          totalHk: data.totalHk,
          bkMieter: data.bkMieter,
          hkMieter: data.hkMieter,
          bkEigentuemer: data.bkEigentuemer,
          hkEigentuemer: data.hkEigentuemer,
          status: 'berechnet',
        });
        settlementId = existing.id;
        await storage.deleteSettlementItems(settlementId);
      } else {
        const settlement = await storage.createSettlement({
          propertyId,
          year,
          gesamtkosten: data.totalBk + data.totalHk,
          totalBk: data.totalBk,
          totalHk: data.totalHk,
          bkMieter: data.bkMieter,
          hkMieter: data.hkMieter,
          bkEigentuemer: data.bkEigentuemer,
          hkEigentuemer: data.hkEigentuemer,
          status: 'berechnet',
          organizationId: profile?.organizationId
        });
        settlementId = settlement.id;
      }
      
      for (const item of items) {
        await storage.createSettlementItem({
          settlementId,
          unitId: item.unitId,
          tenantId: item.tenantId,
          tenantName: item.tenantName,
          tenantEmail: item.tenantEmail,
          isLeerstandBk: item.isLeerstandBk ?? item.isLeerstandBK ?? false,
          isLeerstandHk: item.isLeerstandHk ?? item.isLeerstandHK ?? false,
          bkAnteil: item.bkAnteil,
          hkAnteil: item.hkAnteil,
          bkVorschuss: item.bkVorschuss,
          hkVorschuss: item.hkVorschuss,
          bkSaldo: item.bkSaldo,
          hkSaldo: item.hkSaldo,
          gesamtSaldo: item.gesamtSaldo,
        });
      }
      
      res.json({ 
        id: settlementId, 
        itemsCount: items.length,
        mrgDeadlineWarning, // § 21 Abs 3 MRG Frist-Warnung
        mrgExpirationWarning, // § 21 Abs 4 MRG 3-Jahre-Verjährung
      });
    } catch (error) {
      console.error('Save settlement error:', error);
      res.status(500).json({ error: "Failed to save settlement" });
    }
  });

  app.post("/api/settlements/:id/finalize", isAuthenticated, async (req: any, res) => {
    try {
      await storage.updateSettlement(req.params.id, {
        status: 'abgeschlossen',
        finalizedAt: new Date(),
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to finalize settlement" });
    }
  });

  // Update tenant advances after BK-Abrechnung (MRG-konform)
  // Formel: (BK gesamt + HK gesamt) / 12 × 1,03 = neue monatliche Vorschreibung
  app.post("/api/advances/update", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const { propertyId, totalBkKosten, totalHkKosten, units, totals } = req.body;

      if (!propertyId || !units || !totals) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Verify property ownership
      const property = await storage.getProperty(propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const SICHERHEITSRESERVE = 1.03; // 3% MRG-konforme Reserve
      let updatedCount = 0;

      for (const unit of units) {
        if (!unit.currentTenantId) continue;

        // BK: Nach MEA verteilt
        const bkAnteil = totals.mea > 0 ? (unit.mea / totals.mea) * totalBkKosten : 0;
        // HK: Nach qm verteilt
        const hkAnteil = totals.qm > 0 ? (unit.qm / totals.qm) * totalHkKosten : 0;

        // Neue monatliche Vorschreibung: (Jahreskosten / 12) × 1,03
        const neueBkVorschreibung = Math.round((bkAnteil / 12) * SICHERHEITSRESERVE * 100) / 100;
        const neueHkVorschreibung = Math.round((hkAnteil / 12) * SICHERHEITSRESERVE * 100) / 100;

        await storage.updateTenantAdvances(
          unit.currentTenantId,
          neueBkVorschreibung,
          neueHkVorschreibung
        );
        updatedCount++;
      }

      res.json({ success: true, updatedCount });
    } catch (error) {
      console.error("Update advances error:", error);
      res.status(500).json({ error: "Failed to update advances" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile) {
        return res.status(403).json({ error: "Profile not found" });
      }
      
      const normalizedBody = snakeToCamel(req.body);
      const rawUnits = normalizedBody.einheitenAnzahl ?? normalizedBody.numberOfUnits ?? 0;
      const numberOfUnits = typeof rawUnits === 'number' ? rawUnits : parseInt(rawUnits, 10);
      
      if (rawUnits !== 0 && isNaN(numberOfUnits)) {
        return res.status(400).json({ error: "Ungültige Anzahl Einheiten" });
      }
      const validUnits = numberOfUnits > 0 ? Math.min(numberOfUnits, 100) : 0;
      
      const validationResult = insertPropertySchema.safeParse({
        ...normalizedBody,
        organizationId: profile.organizationId,
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      
      const propertyId = normalizedBody.id || crypto.randomUUID();
      const property = await storage.createProperty({
        id: propertyId,
        ...validationResult.data,
      });
      
      await storage.createPropertyManager({
        userId: profile.id,
        propertyId: property.id,
      });
      
      if (validUnits > 0) {
        const unitData = [];
        for (let i = 1; i <= validUnits; i++) {
          unitData.push({
            propertyId: property.id,
            topNummer: `Top ${i}`,
            type: 'wohnung' as const,
            status: 'leerstand' as const,
            flaeche: '0',
            stockwerk: i,
          });
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
      const profile = await getProfileFromSession(req);
      const existingProperty = await storage.getProperty(req.params.id);
      if (!existingProperty) {
        return res.status(404).json({ error: "Property not found" });
      }
      if (existingProperty.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertPropertySchema.partial().safeParse(normalizedBody);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      const property = await storage.updateProperty(req.params.id, validationResult.data);
      res.json(property);
    } catch (error) {
      res.status(500).json({ error: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
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
      
      if (!profile) {
        return res.status(403).json({ error: "Profile not found" });
      }
      
      const normalizedBody = snakeToCamel(req.body);
      const result = await storage.createPropertyManager({
        userId: profile.id,
        propertyId: normalizedBody.propertyId,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to assign property" });
    }
  });

  app.delete("/api/property-managers/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile) {
        return res.status(403).json({ error: "Profile not found" });
      }
      
      await storage.deletePropertyManager(profile.id, req.params.propertyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to unassign property" });
    }
  });

  app.get("/api/payments", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const allPayments = await storage.getPaymentsByOrganization(profile?.organizationId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(allPayments) : allPayments);
    } catch (error) {
      console.error("Payments error:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertPaymentSchema.safeParse(normalizedBody);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      const tenant = await storage.getTenant(validationResult.data.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      const unit = await storage.getUnit(tenant.unitId);
      if (!unit) {
        return res.status(403).json({ error: "Access denied - unit not found" });
      }
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const payment = await storage.createPayment(validationResult.data);
      
      // Automatically allocate payment to open invoices and update their status
      try {
        await paymentService.allocatePayment(
          payment.id,
          Number(payment.betrag),
          payment.tenantId
        );
      } catch (allocError) {
        console.error("Payment allocation error (non-critical):", allocError);
        // Don't fail the payment creation if allocation fails
      }
      
      res.json(payment);
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  app.patch("/api/payments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const existingPayment = await storage.getPayment(req.params.id);
      if (!existingPayment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      const tenant = await storage.getTenant(existingPayment.tenantId);
      if (!tenant) {
        return res.status(403).json({ error: "Access denied - tenant not found" });
      }
      const unit = await storage.getUnit(tenant.unitId);
      if (!unit) {
        return res.status(403).json({ error: "Access denied - unit not found" });
      }
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertPaymentSchema.partial().safeParse(normalizedBody);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      const payment = await storage.updatePayment(req.params.id, validationResult.data);
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update payment" });
    }
  });

  app.delete("/api/payments/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePayment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  app.get("/api/payments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      const tenant = await storage.getTenant(payment.tenantId);
      if (tenant) {
        const unit = await storage.getUnit(tenant.unitId);
        if (unit) {
          const property = await storage.getProperty(unit.propertyId);
          if (property && property.organizationId !== profile?.organizationId) {
            return res.status(403).json({ error: "Access denied" });
          }
        }
      }
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(payment) : payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const transactions = await storage.getTransactionsByOrganization(profile?.organizationId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(transactions) : transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertTransactionSchema.safeParse(normalizedBody);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      if (validationResult.data.bankAccountId) {
        const bankAccount = await storage.getBankAccount(validationResult.data.bankAccountId);
        if (!bankAccount || bankAccount.organizationId !== profile?.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const transaction = await storage.createTransaction(validationResult.data);
      res.json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  app.get("/api/transactions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      if (transaction.bankAccountId) {
        const bankAccount = await storage.getBankAccount(transaction.bankAccountId);
        if (bankAccount && bankAccount.organizationId !== profile?.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(transaction) : transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.delete("/api/transactions/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTransactionSplits(req.params.id);
      await storage.deleteExpensesByTransactionId(req.params.id);
      await storage.deleteTransaction(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertExpenseSchema.safeParse(normalizedBody);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      if (validationResult.data.propertyId) {
        const property = await storage.getProperty(validationResult.data.propertyId);
        if (!property || property.organizationId !== profile?.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      if (validationResult.data.distributionKeyId) {
        const key = await storage.getDistributionKey(validationResult.data.distributionKeyId);
        if (!key) {
          return res.status(400).json({ error: "Invalid distribution key" });
        }
        if (!key.isSystem && key.organizationId !== profile?.organizationId) {
          return res.status(403).json({ error: "Distribution key access denied" });
        }
      }
      const expense = await storage.createExpense(validationResult.data);
      res.json(expense);
    } catch (error) {
      console.error("Create expense error:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  });

  app.get("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const expenses = await storage.getExpensesByOrganization(profile?.organizationId);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.patch("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const existingExpense = await storage.getExpense(req.params.id);
      if (!existingExpense) {
        return res.status(404).json({ error: "Expense not found" });
      }
      if (existingExpense.propertyId) {
        const property = await storage.getProperty(existingExpense.propertyId);
        if (!property || property.organizationId !== profile?.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertExpenseSchema.partial().safeParse(normalizedBody);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      if (validationResult.data.distributionKeyId) {
        const key = await storage.getDistributionKey(validationResult.data.distributionKeyId);
        if (!key) {
          return res.status(400).json({ error: "Invalid distribution key" });
        }
        if (!key.isSystem && key.organizationId !== profile?.organizationId) {
          return res.status(403).json({ error: "Distribution key access denied" });
        }
      }
      const expense = await storage.updateExpense(req.params.id, validationResult.data);
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteExpense(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  app.get("/api/account-categories", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile?.organizationId) {
        return res.json([]);
      }
      
      const categories = await storage.getAccountCategories(profile.organizationId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch account categories" });
    }
  });

  app.post("/api/account-categories", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      
      const normalizedBody = snakeToCamel(req.body);
      const { name, type, parentId, isSystem, defaultDistributionKeyId } = normalizedBody;
      
      const category = await storage.createAccountCategory({
        organizationId: profile.organizationId,
        name: name,
        type: type,
        parentId: parentId || null,
        isSystem: isSystem || false,
        defaultDistributionKeyId: defaultDistributionKeyId || null,
      });
      res.status(201).json(category);
    } catch (error) {
      console.error('Create account category error:', error);
      res.status(500).json({ error: "Failed to create account category" });
    }
  });

  app.patch("/api/account-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      
      const normalizedBody = snakeToCamel(req.body);
      const { name, type, defaultDistributionKeyId } = normalizedBody;
      
      const updated = await storage.updateAccountCategory(req.params.id, {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(defaultDistributionKeyId !== undefined && { defaultDistributionKeyId: defaultDistributionKeyId || null }),
      });
      
      if (!updated) return res.status(404).json({ error: "Category not found" });
      res.json(updated);
    } catch (error) {
      console.error('Update account category error:', error);
      res.status(500).json({ error: "Failed to update account category" });
    }
  });

  app.delete("/api/account-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteAccountCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete account category error:', error);
      res.status(500).json({ error: "Failed to delete account category" });
    }
  });

  app.get("/api/units", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const units = await storage.getUnitsByOrganization(profile?.organizationId);
      // Add mea/qm/vs_personen aliases for frontend compatibility
      const unitsWithAliases = units.map(unit => ({
        ...unit,
        mea: unit.nutzwert,
        qm: unit.flaeche,
        vs_personen: unit.vsPersonen,
      }));
      res.json(unitsWithAliases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.get("/api/units/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const unit = await storage.getUnit(req.params.id);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      const property = await storage.getProperty(unit.propertyId);
      if (property && property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      // Add mea/qm/vs_personen aliases for frontend compatibility
      const unitWithAliases = {
        ...unit,
        mea: unit.nutzwert,
        qm: unit.flaeche,
        vs_personen: unit.vsPersonen,
      };
      res.json(unitWithAliases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unit" });
    }
  });

  app.post("/api/units", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const body = snakeToCamel(req.body);
      
      // Validate property access
      const property = await storage.getProperty(body.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const unitData = {
        propertyId: body.propertyId,
        topNummer: body.topNummer,
        type: body.type || 'wohnung',
        flaeche: body.flaeche || body.qm || '0',
        nutzwert: body.nutzwert || body.mea || null,
        status: body.status === 'vermietet' ? 'aktiv' : (body.status || 'leerstand'),
        vsPersonen: body.vsPersonen || null,
        stockwerk: body.stockwerk || body.floor || null,
        leerstandBk: body.leerstandBk || '0',
        leerstandHk: body.leerstandHk || '0',
      };

      const unit = await storage.createUnit(unitData);
      res.json(unit);
    } catch (error: any) {
      console.error('Error creating unit:', error);
      res.status(500).json({ error: error.message || "Failed to create unit" });
    }
  });

  app.patch("/api/units/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const unit = await storage.getUnit(req.params.id);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const body = snakeToCamel(req.body);
      const updateData: any = {};

      // Basic fields
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

      // Leerstand fields
      if (body.leerstandBk !== undefined) updateData.leerstandBk = String(body.leerstandBk);
      if (body.leerstandHk !== undefined) updateData.leerstandHk = String(body.leerstandHk);

      const updated = await storage.updateUnit(req.params.id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating unit:', error);
      res.status(500).json({ error: error.message || "Failed to update unit" });
    }
  });

  app.get("/api/units/:unitId/tenants", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const unit = await storage.getUnit(req.params.unitId);
      if (unit) {
        const property = await storage.getProperty(unit.propertyId);
        if (property && property.organizationId !== profile?.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const tenants = await storage.getTenantsByUnit(req.params.unitId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(tenants) : tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.get("/api/tenants", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const tenants = await storage.getTenantsByOrganization(profile?.organizationId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(tenants) : tenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.get("/api/tenants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      const unit = await storage.getUnit(tenant.unitId);
      if (unit) {
        const property = await storage.getProperty(unit.propertyId);
        if (property && property.organizationId !== profile?.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(tenant) : tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  app.delete("/api/units/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const unit = await storage.getUnit(req.params.id);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      const property = await storage.getProperty(unit.propertyId);
      if (property && property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.softDeleteUnit(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete unit" });
    }
  });

  app.delete("/api/tenants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      const unit = await storage.getUnit(tenant.unitId);
      if (unit) {
        const property = await storage.getProperty(unit.propertyId);
        if (property && property.organizationId !== profile?.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      await storage.softDeleteTenant(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  });

  app.post("/api/tenants", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const body = snakeToCamel(req.body);
      
      const unit = await storage.getUnit(body.unitId);
      if (!unit) {
        return res.status(404).json({ error: "Einheit nicht gefunden" });
      }
      
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Zugriff verweigert" });
      }
      
      // Filter to only valid tenant fields (OCR data may include extra fields like topNummer, address)
      const tenantData = {
        unitId: body.unitId,
        firstName: body.firstName || 'Unbekannt',
        lastName: body.lastName || 'Unbekannt',
        email: body.email || null,
        phone: body.phone || null,
        mobilePhone: body.mobilePhone || null,
        status: body.status || 'aktiv',
        mietbeginn: body.mietbeginn || null,
        mietende: body.mietende || null,
        grundmiete: body.grundmiete?.toString() || '0',
        betriebskostenVorschuss: body.betriebskostenVorschuss?.toString() || '0',
        heizkostenVorschuss: body.heizkostenVorschuss?.toString() || '0',
        wasserkostenVorschuss: body.wasserkostenVorschuss?.toString() || '0',
        warmwasserkostenVorschuss: body.warmwasserkostenVorschuss?.toString() || '0',
        sonstigeKosten: body.sonstigeKosten && typeof body.sonstigeKosten === 'object' ? body.sonstigeKosten : null,
        kaution: body.kaution?.toString() || null,
        kautionBezahlt: body.kautionBezahlt || false,
        iban: body.iban || null,
        bic: body.bic || null,
        sepaMandat: body.sepaMandat || false,
        sepaMandatDatum: body.sepaMandatDatum || null,
        notes: body.notes || null,
      };
      
      const validationResult = insertTenantSchema.safeParse(tenantData);
      if (!validationResult.success) {
        console.error("Tenant validation error:", validationResult.error.flatten());
        return res.status(400).json({ 
          error: "Validierung fehlgeschlagen", 
          details: validationResult.error.flatten() 
        });
      }
      
      const [tenant] = await db.insert(schema.tenants).values(validationResult.data).returning();
      res.json(tenant);
    } catch (error) {
      console.error("Create tenant error:", error);
      res.status(500).json({ error: "Mieter konnte nicht erstellt werden" });
    }
  });

  app.get("/api/tenants/:tenantId/rent-history", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const tenant = await storage.getTenant(req.params.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      const unit = await storage.getUnit(tenant.unitId);
      if (!unit) {
        return res.status(403).json({ error: "Access denied - unit not found" });
      }
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const history = await storage.getRentHistoryByTenant(req.params.tenantId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rent history" });
    }
  });

  app.post("/api/tenants/:tenantId/rent-history", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const tenant = await storage.getTenant(req.params.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      const unit = await storage.getUnit(tenant.unitId);
      if (!unit) {
        return res.status(403).json({ error: "Access denied - unit not found" });
      }
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertRentHistorySchema.safeParse({
        ...normalizedBody,
        tenantId: req.params.tenantId
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      const rentHistory = await storage.createRentHistory(validationResult.data);
      res.json(rentHistory);
    } catch (error) {
      console.error("Create rent history error:", error);
      res.status(500).json({ error: "Failed to create rent history" });
    }
  });

  // ====== LEASES (Mietverträge) ======
  app.get("/api/tenants/:tenantId/leases", isAuthenticated, async (req: any, res) => {
    try {
      const leases = await storage.getLeasesByTenant(req.params.tenantId);
      res.json(leases);
    } catch (error) {
      console.error("Get leases by tenant error:", error);
      res.status(500).json({ error: "Failed to fetch leases" });
    }
  });

  app.get("/api/units/:unitId/leases", isAuthenticated, async (req: any, res) => {
    try {
      const leases = await storage.getLeasesByUnit(req.params.unitId);
      res.json(leases);
    } catch (error) {
      console.error("Get leases by unit error:", error);
      res.status(500).json({ error: "Failed to fetch leases" });
    }
  });

  app.get("/api/leases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const lease = await storage.getLease(req.params.id);
      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }
      res.json(lease);
    } catch (error) {
      console.error("Get lease error:", error);
      res.status(500).json({ error: "Failed to fetch lease" });
    }
  });

  app.post("/api/leases", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = schema.insertLeaseSchema.parse(req.body);
      const lease = await storage.createLease(validatedData);
      res.status(201).json(lease);
    } catch (error: any) {
      console.error("Create lease error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create lease" });
    }
  });

  app.patch("/api/leases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const lease = await storage.updateLease(req.params.id, req.body);
      if (!lease) {
        return res.status(404).json({ error: "Lease not found" });
      }
      res.json(lease);
    } catch (error) {
      console.error("Update lease error:", error);
      res.status(500).json({ error: "Failed to update lease" });
    }
  });

  // ====== PAYMENT ALLOCATIONS (Zahlungszuordnungen) ======
  app.get("/api/payments/:paymentId/allocations", isAuthenticated, async (req: any, res) => {
    try {
      const allocations = await storage.getPaymentAllocationsByPayment(req.params.paymentId);
      res.json(allocations);
    } catch (error) {
      console.error("Get payment allocations error:", error);
      res.status(500).json({ error: "Failed to fetch payment allocations" });
    }
  });

  app.get("/api/invoices/:invoiceId/allocations", isAuthenticated, async (req: any, res) => {
    try {
      const allocations = await storage.getPaymentAllocationsByInvoice(req.params.invoiceId);
      res.json(allocations);
    } catch (error) {
      console.error("Get invoice allocations error:", error);
      res.status(500).json({ error: "Failed to fetch invoice allocations" });
    }
  });

  app.post("/api/payment-allocations", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = schema.insertPaymentAllocationSchema.parse(req.body);
      const allocation = await storage.createPaymentAllocation(validatedData);
      res.status(201).json(allocation);
    } catch (error: any) {
      console.error("Create payment allocation error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create payment allocation" });
    }
  });

  app.delete("/api/payment-allocations/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deletePaymentAllocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete payment allocation error:", error);
      res.status(500).json({ error: "Failed to delete payment allocation" });
    }
  });

  app.get("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const { year, month } = req.query;
      const invoices = await storage.getMonthlyInvoicesByOrganization(
        profile?.organizationId,
        year ? parseInt(year as string) : undefined,
        month ? parseInt(month as string) : undefined
      );
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(invoices) : invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      const unit = await storage.getUnit(invoice.unitId);
      if (unit) {
        const property = await storage.getProperty(unit.propertyId);
        if (property && property.organizationId !== profile?.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      }
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(invoice) : invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertMonthlyInvoiceSchema.safeParse(normalizedBody);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      const tenant = await storage.getTenant(validationResult.data.tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      const unit = await storage.getUnit(tenant.unitId);
      if (!unit) {
        return res.status(403).json({ error: "Access denied - unit not found" });
      }
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const invoice = await storage.createInvoice(validationResult.data);
      res.json(invoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const existingInvoice = await storage.getInvoice(req.params.id);
      if (!existingInvoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      const tenant = await storage.getTenant(existingInvoice.tenantId);
      if (!tenant) {
        return res.status(403).json({ error: "Access denied - tenant not found" });
      }
      const unit = await storage.getUnit(tenant.unitId);
      if (!unit) {
        return res.status(403).json({ error: "Access denied - unit not found" });
      }
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertMonthlyInvoiceSchema.partial().safeParse(normalizedBody);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      const invoice = await storage.updateInvoice(req.params.id, validationResult.data);
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteInvoice(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Dry-run invoice generation (preview without persisting)
  app.post("/api/invoices/dry-run", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(403).json({ error: "Organization not found" });
      }

      const { period, units: unitIds } = req.body;
      if (!period || !/^\d{4}-\d{2}$/.test(period)) {
        return res.status(400).json({ error: "Invalid period format. Use YYYY-MM" });
      }

      const [yearStr, monthStr] = period.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      // Get tenants for organization, optionally filtered by units
      let tenants = await storage.getTenantsByOrganization(profile.organizationId);
      const activeTenants = tenants.filter(t => t.status === "aktiv");

      // Filter by unit IDs if provided
      const filteredTenants = unitIds && Array.isArray(unitIds) && unitIds.length > 0
        ? activeTenants.filter(t => t.unitId && unitIds.includes(t.unitId))
        : activeTenants;

      const preview = [];
      for (const tenant of filteredTenants) {
        if (!tenant.unitId) continue;

        const unit = await storage.getUnit(tenant.unitId);
        if (!unit) continue;

        const property = await storage.getProperty(unit.propertyId);
        if (!property) continue;

        // Calculate amounts
        const grundmiete = Number(tenant.grundmiete || 0);
        const bkVorschuss = Number(tenant.betriebskostenVorschuss || 0);
        const hkVorschuss = Number(tenant.heizkostenVorschuss || 0);

        // Determine VAT based on unit type
        const unitType = (unit.type || "wohnung").toLowerCase();
        const isCommercial = unitType.includes("geschäft") || unitType.includes("gewerbe") || unitType.includes("büro");
        const isParking = unitType.includes("stellplatz") || unitType.includes("garage") || unitType.includes("parkplatz");
        const mietUst = isCommercial || isParking ? 20 : 10;

        const mieteBrutto = grundmiete * (1 + mietUst / 100);
        const bkBrutto = bkVorschuss * 1.10; // 10% USt
        const hkBrutto = hkVorschuss * 1.20; // 20% USt
        const totalBrutto = mieteBrutto + bkBrutto + hkBrutto;

        preview.push({
          tenantId: tenant.id,
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          unitId: unit.id,
          unitNumber: unit.unitNumber,
          propertyId: property.id,
          propertyName: property.name,
          year,
          month,
          grundmieteNetto: grundmiete,
          grundmieteBrutto: mieteBrutto,
          mietUst,
          bkNetto: bkVorschuss,
          bkBrutto,
          hkNetto: hkVorschuss,
          hkBrutto,
          totalBrutto,
          dueDate: new Date(year, month - 1, 5).toISOString().split("T")[0]
        });
      }

      res.json({
        success: true,
        dryRun: true,
        period,
        count: preview.length,
        totalBrutto: preview.reduce((sum, p) => sum + p.totalBrutto, 0),
        preview
      });
    } catch (error) {
      console.error("Dry-run invoice error:", error);
      res.status(500).json({ error: "Failed to generate invoice preview" });
    }
  });

  // Generate monthly invoices (Vorschreibungen) for all active tenants
  app.post("/api/functions/generate-monthly-invoices", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(403).json({ error: "Organization not found" });
      }

      const { year, month } = req.body;
      const currentDate = new Date();
      const targetYear = year || currentDate.getFullYear();
      const targetMonth = month || (currentDate.getMonth() + 1);

      // Get all active tenants for the organization
      const tenants = await storage.getTenantsByOrganization(profile.organizationId);
      const activeTenants = tenants.filter(t => t.status === 'aktiv');

      const createdInvoices = [];
      const errors: string[] = [];

      for (const tenant of activeTenants) {
        try {
          // Check if invoice already exists for this month
          const existingInvoices = await storage.getInvoicesByTenant(tenant.id);
          const alreadyExists = existingInvoices.some(
            inv => inv.month === targetMonth && inv.year === targetYear
          );

          if (alreadyExists) {
            continue; // Skip if already exists
          }

          // Get unit for property info
          const unit = await storage.getUnit(tenant.unitId);
          if (!unit) continue;

          const property = await storage.getProperty(unit.propertyId);
          if (!property) continue;

          // Calculate amounts from tenant data
          const grundmiete = Number(tenant.grundmiete || 0);
          const grundmieteUstSatz = 10; // Default 10% for residential
          
          // Parse sonstigeKosten JSONB and categorize by type
          // Categories: betriebskosten (BK), heizungskosten (Heizung/Zentralheizung), wasserkosten (Wasser)
          let betriebskostenTotal = 0;
          let heizungskostenTotal = 0;
          let wasserkostenTotal = 0;
          let ust10Total = 0; // USt at 10%
          let ust20Total = 0; // USt at 20%
          let hasSonstigeKosten = false;
          
          if (tenant.sonstigeKosten && typeof tenant.sonstigeKosten === 'object') {
            const positions = tenant.sonstigeKosten as Record<string, { betrag?: number | string; ust?: number }>;
            const keys = Object.keys(positions);
            hasSonstigeKosten = keys.length > 0;
            
            console.log(`[INVOICE-GEN] Mieter ${tenant.firstName} ${tenant.lastName}: sonstigeKosten gefunden mit ${keys.length} Positionen:`, JSON.stringify(positions));
            
            // Expanded synonym lists for categorization
            const heizungKeywords = ['heiz', 'hk', 'zentralheizung', 'fernwärme', 'wärme', 'heizung', 'heizk'];
            const wasserKeywords = ['wasser', 'kaltwasser', 'warmwasser', 'ww', 'kw', 'abwasser', 'kanal'];
            
            for (const [key, item] of Object.entries(positions)) {
              if (item && item.betrag !== undefined) {
                const betrag = typeof item.betrag === 'string' ? parseFloat(item.betrag) : Number(item.betrag);
                if (!isNaN(betrag)) {
                  // Categorize by position name (case-insensitive)
                  const keyLower = key.toLowerCase();
                  const isHeizung = heizungKeywords.some(kw => keyLower.includes(kw));
                  const isWasser = wasserKeywords.some(kw => keyLower.includes(kw));
                  const isMahnkosten = keyLower.includes('mahn') || keyLower.includes('verzug');
                  
                  // USt: use explicit value if provided, otherwise infer from category
                  // Heizung = 20%, BK/Wasser = 10%, Mahnkosten = 0%
                  let ustSatz: number;
                  if (item.ust !== undefined) {
                    ustSatz = Number(item.ust);
                  } else if (isMahnkosten) {
                    ustSatz = 0;
                  } else if (isHeizung) {
                    ustSatz = 20;
                  } else {
                    ustSatz = 10; // BK, Wasser, etc.
                  }
                  
                  const ustBetrag = betrag * ustSatz / 100;
                  
                  if (isHeizung) {
                    heizungskostenTotal += betrag;
                  } else if (isWasser) {
                    wasserkostenTotal += betrag;
                  } else {
                    // Default to Betriebskosten (BK, Lift, Müll, Mahnkosten, etc.)
                    betriebskostenTotal += betrag;
                  }
                  
                  // Group USt by rate (0% = no tax, 10%, 20%)
                  if (ustSatz === 20) {
                    ust20Total += ustBetrag;
                  } else if (ustSatz === 10) {
                    ust10Total += ustBetrag;
                  }
                  // USt 0% (Mahnkosten) adds nothing
                }
              }
            }
          }
          
          // Add Grundmiete to 10% category
          const grundmieteUst = grundmiete * grundmieteUstSatz / 100;
          ust10Total += grundmieteUst;
          
          // Fall back to legacy fields if no sonstigeKosten JSONB data
          const betriebskosten = hasSonstigeKosten ? betriebskostenTotal : Number(tenant.betriebskostenVorschuss || 0);
          const heizungskosten = hasSonstigeKosten ? heizungskostenTotal : Number(tenant.heizkostenVorschuss || 0);
          const wasserkosten = hasSonstigeKosten ? wasserkostenTotal : Number(tenant.wasserkostenVorschuss || 0);
          
          console.log(`[INVOICE-GEN] Mieter ${tenant.firstName} ${tenant.lastName}: Kategorisiert -> BK=${betriebskosten}, HK=${heizungskosten}, Wasser=${wasserkosten}, USt10=${ust10Total.toFixed(2)}, USt20=${ust20Total.toFixed(2)}`);
          
          // Legacy USt calculation for fallback (when no sonstigeKosten)
          if (!hasSonstigeKosten) {
            ust10Total = (grundmiete + betriebskosten + wasserkosten) * 0.10;
            ust20Total = heizungskosten * 0.20;
          }
          
          const totalUst = ust10Total + ust20Total;
          const nettoGesamt = grundmiete + betriebskosten + heizungskosten + wasserkosten;
          const gesamtbetrag = nettoGesamt + totalUst;

          // Calculate due date (1st of month)
          const faelligAm = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;

          // Create invoice with schema-compliant field names
          const invoiceData = {
            tenantId: tenant.id,
            unitId: tenant.unitId,
            month: targetMonth,
            year: targetYear,
            grundmiete: String(grundmiete),
            betriebskosten: String(betriebskosten),
            heizungskosten: String(heizungskosten),
            wasserkosten: String(wasserkosten),
            ust: String(totalUst.toFixed(2)),
            gesamtbetrag: String(gesamtbetrag.toFixed(2)),
            faelligAm,
            status: 'offen' as const,
            vortragMiete: '0',
            vortragBk: '0',
            vortragHk: '0',
          };

          console.log(`[INVOICE-GEN] Erstelle Vorschreibung für ${tenant.firstName} ${tenant.lastName}: Miete=${grundmiete}, BK=${betriebskosten}, HK=${heizungskosten}, Wasser=${wasserkosten}, USt=${totalUst.toFixed(2)}, Gesamt=${gesamtbetrag.toFixed(2)}`);
          
          const newInvoice = await storage.createInvoice(invoiceData);
          createdInvoices.push(newInvoice);
        } catch (err) {
          errors.push(`Fehler bei Mieter ${tenant.firstName} ${tenant.lastName}: ${err}`);
        }
      }

      res.json({
        success: true,
        created: createdInvoices.length,
        skipped: activeTenants.length - createdInvoices.length - errors.length,
        errors: errors.length,
        errorDetails: errors,
      });
    } catch (error) {
      console.error('Generate invoices error:', error);
      res.status(500).json({ error: "Vorschreibungen konnten nicht erstellt werden" });
    }
  });

  app.get("/api/invoices/:invoiceId/payments", isAuthenticated, async (req: any, res) => {
    try {
      const payments = await storage.getPaymentsByInvoice(req.params.invoiceId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(payments) : payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice payments" });
    }
  });

  app.get("/api/tenants/:tenantId/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const invoices = await storage.getInvoicesByTenant(req.params.tenantId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(invoices) : invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant invoices" });
    }
  });

  app.get("/api/tenants/:tenantId/payments", isAuthenticated, async (req: any, res) => {
    try {
      const payments = await storage.getPaymentsByTenant(req.params.tenantId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(payments) : payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant payments" });
    }
  });

  app.get("/api/properties/:propertyId/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (property && property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { year } = req.query;
      const expenses = await storage.getExpensesByProperty(
        req.params.propertyId,
        year ? parseInt(year as string) : undefined
      );
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  // Leerstand-Report: Identifiziert leere Einheiten und berechnet SOLL-Vorschreibung für Eigentümer
  app.get("/api/properties/:propertyId/vacancy-report", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      
      if (!property) {
        return res.status(404).json({ error: "Liegenschaft nicht gefunden" });
      }
      if (property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Zugriff verweigert" });
      }
      
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || null;
      
      // Get all units for this property
      const units = await storage.getUnitsByProperty(req.params.propertyId);
      
      // Get all tenants for this property
      const tenants = await storage.getTenantsByProperty(req.params.propertyId);
      
      // Identify vacant units (units with status 'leerstand' or no active tenant)
      const vacantUnits: any[] = [];
      let totalVacancyCostBk = 0;
      let totalVacancyCostHk = 0;
      
      for (const unit of units) {
        // Check if unit has status 'leerstand'
        const isVacant = unit.status === 'leerstand';
        
        // Also check if there's no active tenant for this unit
        const activeTenant = tenants.find(t => {
          if (t.deletedAt || t.unitId !== unit.id) return false;
          const contractStart = t.mietvertragBeginn ? new Date(t.mietvertragBeginn) : null;
          const contractEnd = t.mietvertragEnde ? new Date(t.mietvertragEnde) : null;
          const checkDate = month 
            ? new Date(year, month - 1, 15) 
            : new Date(year, 5, 15); // Mid-year check if no month specified
          
          if (contractStart && checkDate < contractStart) return false;
          if (contractEnd && checkDate > contractEnd) return false;
          return true;
        });
        
        if (isVacant || !activeTenant) {
          // Calculate SOLL-Vorschreibung based on last tenant's actual advances
          // Per MRG §21: Owner bears vacancy costs - use actual configured rates
          const lastTenant = tenants
            .filter(t => t.unitId === unit.id)
            .sort((a, b) => {
              const dateA = a.mietvertragEnde ? new Date(a.mietvertragEnde).getTime() : 0;
              const dateB = b.mietvertragEnde ? new Date(b.mietvertragEnde).getTime() : 0;
              return dateB - dateA;
            })[0];
          
          // Monthly SOLL based on last tenant's actual configured advances
          // If no last tenant exists, we cannot estimate - flag as "requires configuration"
          const monthlyBkSoll = lastTenant 
            ? (Number(lastTenant.betriebskostenVorschuss) || 0)
            : 0; // Cannot estimate without data
          
          const monthlyHkSoll = lastTenant
            ? (Number(lastTenant.heizkostenVorschuss) || 0)
            : 0; // Cannot estimate without data
          
          const hasEstimatedData = !lastTenant;
          
          // Calculate actual vacancy months for this unit in the period
          let vacancyMonths = 0;
          if (month) {
            // Single month mode - check if vacant in that specific month
            vacancyMonths = 1;
          } else {
            // Full year mode - calculate actual vacancy months
            for (let m = 1; m <= 12; m++) {
              const checkDate = new Date(year, m - 1, 15);
              const hasActiveInMonth = tenants.some(t => {
                if (t.deletedAt || t.unitId !== unit.id) return false;
                const contractStart = t.mietvertragBeginn ? new Date(t.mietvertragBeginn) : null;
                const contractEnd = t.mietvertragEnde ? new Date(t.mietvertragEnde) : null;
                if (contractStart && checkDate < contractStart) return false;
                if (contractEnd && checkDate > contractEnd) return false;
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
            unitId: unit.id,
            topNummer: unit.topNummer,
            type: unit.type,
            flaeche: Number(unit.flaeche) || 0,
            status: unit.status,
            vacancyMonths,
            monthlyBkSoll,
            monthlyHkSoll,
            vacancyCostBk,
            vacancyCostHk,
            totalVacancyCost: vacancyCostBk + vacancyCostHk,
            lastTenantName: lastTenant?.name || null,
            lastContractEnd: lastTenant?.mietvertragEnde || null,
            requiresConfiguration: hasEstimatedData,
          });
        }
      }
      
      // Calculate vacancy rate
      const vacancyRate = units.length > 0 
        ? (vacantUnits.length / units.length) * 100 
        : 0;
      
      const vacantArea = vacantUnits.reduce((sum, u) => sum + u.flaeche, 0);
      const totalArea = units.reduce((sum, u) => sum + (Number(u.flaeche) || 0), 0);
      const areaVacancyRate = totalArea > 0 
        ? (vacantArea / totalArea) * 100 
        : 0;
      
      res.json({
        year,
        month: month || null,
        propertyId: property.id,
        propertyName: property.name,
        totalUnits: units.length,
        vacantUnits: vacantUnits.length,
        vacancyRate,
        vacantArea,
        totalArea,
        areaVacancyRate,
        totalVacancyCostBk,
        totalVacancyCostHk,
        totalVacancyCost: totalVacancyCostBk + totalVacancyCostHk,
        ownerResponsibility: `Leerstandskosten werden dem Eigentümer zugewiesen: BK ${totalVacancyCostBk.toFixed(2)} € + HK ${totalVacancyCostHk.toFixed(2)} € = ${(totalVacancyCostBk + totalVacancyCostHk).toFixed(2)} €`,
        units: vacantUnits,
      });
    } catch (error) {
      console.error('Vacancy report error:', error);
      res.status(500).json({ error: "Fehler beim Erstellen des Leerstandsberichts" });
    }
  });

  // Rendite-Berechnung: Miete netto - Instandhaltungen netto = Nettorendite
  app.get("/api/properties/:propertyId/yield-report", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      
      if (!property) {
        return res.status(404).json({ error: "Liegenschaft nicht gefunden" });
      }
      if (property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Zugriff verweigert" });
      }
      
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      
      // Get units for this property
      const units = await storage.getUnitsByProperty(req.params.propertyId);
      
      // Get expenses for this property in the year
      const expenses = await storage.getExpensesByProperty(req.params.propertyId, year);
      
      // Get tenants for rent calculation
      const tenants = await storage.getTenantsByProperty(req.params.propertyId);
      
      // Calculate annual rent income (SOLL)
      let annualRentGross = 0;
      let annualBetriebskostenGross = 0;
      
      for (const tenant of tenants) {
        if (tenant.deletedAt) continue;
        
        const monthlyRent = Number(tenant.hauptmietzins) || 0;
        const monthlyBk = Number(tenant.betriebskostenVorschuss) || 0;
        
        // Calculate how many months this tenant was active in the year
        const contractStart = tenant.mietvertragBeginn ? new Date(tenant.mietvertragBeginn) : null;
        const contractEnd = tenant.mietvertragEnde ? new Date(tenant.mietvertragEnde) : null;
        
        let monthsActive = 12;
        if (contractStart) {
          const startYear = contractStart.getFullYear();
          const startMonth = contractStart.getMonth();
          if (startYear === year) {
            monthsActive = 12 - startMonth;
          } else if (startYear > year) {
            monthsActive = 0;
          }
        }
        if (contractEnd) {
          const endYear = contractEnd.getFullYear();
          const endMonth = contractEnd.getMonth();
          if (endYear === year) {
            monthsActive = Math.min(monthsActive, endMonth + 1);
          } else if (endYear < year) {
            monthsActive = 0;
          }
        }
        
        annualRentGross += monthlyRent * monthsActive;
        annualBetriebskostenGross += monthlyBk * monthsActive;
      }
      
      // Calculate maintenance costs (reduce yield)
      let instandhaltungGross = 0;
      let betriebskostenExpenseGross = 0;
      
      for (const expense of expenses) {
        const amount = Number(expense.betrag) || 0;
        if (expense.category === 'instandhaltung') {
          instandhaltungGross += amount;
        } else if (expense.category === 'betriebskosten_umlagefaehig') {
          betriebskostenExpenseGross += amount;
        }
      }
      
      // Calculate net values - Austrian MRG: residential rent is VAT-exempt (0%), 
      // maintenance/repairs 20% VAT, BK pass-through 10% VAT
      // Residential rent: Gross = Net (no VAT on residential rent in Austria unless opted in)
      const annualRentNet = annualRentGross; // No VAT on residential rent (MRG §16)
      const maintenanceVatRate = 0.20; // 20% VAT for maintenance
      const instandhaltungNet = instandhaltungGross / (1 + maintenanceVatRate);
      
      // Nettorendite = Miete netto - Instandhaltungen netto
      const netYield = annualRentNet - instandhaltungNet;
      
      // Calculate yield percentage if property has a purchase price
      const purchasePrice = Number(property.purchasePrice) || 0;
      const yieldPercentage = purchasePrice > 0 ? (netYield / purchasePrice) * 100 : null;
      
      res.json({
        year,
        propertyId: property.id,
        propertyName: property.name,
        unitCount: units.length,
        tenantCount: tenants.filter(t => !t.deletedAt).length,
        annualRentGross,
        annualRentNet,
        annualBetriebskostenGross,
        instandhaltungGross,
        instandhaltungNet,
        betriebskostenExpenseGross,
        netYield,
        yieldPercentage,
        purchasePrice: purchasePrice || null,
        formula: `Miete netto (${annualRentNet.toFixed(2)} €) - Instandhaltungen netto (${instandhaltungNet.toFixed(2)} €) = Nettorendite (${netYield.toFixed(2)} €)`,
      });
    } catch (error) {
      console.error('Yield report error:', error);
      res.status(500).json({ error: "Fehler beim Erstellen des Renditeberichts" });
    }
  });

  app.get("/api/bank-accounts", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const accounts = await storage.getBankAccountsByOrganization(profile?.organizationId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(accounts) : accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bank accounts" });
    }
  });

  app.get("/api/bank-accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const account = await storage.getBankAccount(req.params.id);
      if (!account) return res.status(404).json({ error: "Bank account not found" });
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bank account" });
    }
  });

  app.post("/api/bank-accounts", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      
      const { account_name, bank_name, opening_balance, opening_balance_date, property_id, iban, bic } = req.body;
      
      const account = await storage.createBankAccount({
        organizationId: profile.organizationId,
        accountName: account_name,
        bankName: bank_name || null,
        openingBalance: opening_balance?.toString() || '0',
        openingBalanceDate: opening_balance_date || null,
        propertyId: property_id || null,
        iban: iban || null,
        bic: bic || null,
      });
      res.status(201).json(account);
    } catch (error) {
      console.error('Create bank account error:', error);
      res.status(500).json({ error: "Failed to create bank account" });
    }
  });

  app.patch("/api/bank-accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const account = await storage.getBankAccount(req.params.id);
      if (!account) return res.status(404).json({ error: "Bank account not found" });
      if (account.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { account_name, bank_name, opening_balance, opening_balance_date, property_id, iban, bic } = req.body;
      
      const updateData: any = {};
      if (account_name !== undefined) updateData.accountName = account_name;
      if (bank_name !== undefined) updateData.bankName = bank_name;
      if (opening_balance !== undefined) updateData.openingBalance = opening_balance?.toString();
      if (opening_balance_date !== undefined) updateData.openingBalanceDate = opening_balance_date;
      if (property_id !== undefined) updateData.propertyId = property_id;
      if (iban !== undefined) updateData.iban = iban;
      if (bic !== undefined) updateData.bic = bic;
      
      const updated = await storage.updateBankAccount(req.params.id, updateData);
      res.json(updated);
    } catch (error) {
      console.error('Update bank account error:', error);
      res.status(500).json({ error: "Failed to update bank account" });
    }
  });

  app.delete("/api/bank-accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const account = await storage.getBankAccount(req.params.id);
      if (!account) return res.status(404).json({ error: "Bank account not found" });
      if (account.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteBankAccount(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete bank account error:', error);
      res.status(500).json({ error: "Failed to delete bank account" });
    }
  });

  app.get("/api/bank-accounts/:id/balance", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const account = await storage.getBankAccount(req.params.id);
      if (!account) return res.status(404).json({ error: "Bank account not found" });
      if (account.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const asOfDate = req.query.as_of_date as string | undefined;
      const balance = await storage.getBankAccountBalance(req.params.id, asOfDate);
      res.json({ balance });
    } catch (error) {
      console.error('Get bank balance error:', error);
      res.status(500).json({ error: "Failed to calculate bank balance" });
    }
  });

  app.get("/api/bank-accounts/:id/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const transactions = await storage.getTransactionsByBankAccount(req.params.id);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(transactions) : transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Plausibilitätsbericht: Anfangsbestand + Einnahmen - Ausgaben = Endbestand
  app.get("/api/bank-accounts/:id/plausibility-report", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const account = await storage.getBankAccount(req.params.id);
      
      if (!account) {
        return res.status(404).json({ error: "Bankkonto nicht gefunden" });
      }
      if (account.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Zugriff verweigert" });
      }
      
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      // Get all transactions for this bank account in the year
      const allTransactions = await storage.getTransactionsByBankAccount(req.params.id);
      const yearTransactions = allTransactions.filter(tx => {
        const txDate = tx.transactionDate;
        if (!txDate) return false;
        const txDateParsed = new Date(txDate);
        const startDateParsed = new Date(startDate);
        const endDateParsed = new Date(endDate);
        return txDateParsed >= startDateParsed && txDateParsed <= endDateParsed;
      });
      
      // Calculate income (positive amounts) and expenses (negative amounts)
      let totalIncome = 0;
      let totalExpenses = 0;
      
      for (const tx of yearTransactions) {
        const amount = Number(tx.amount) || 0;
        if (amount > 0) {
          totalIncome += amount;
        } else {
          totalExpenses += Math.abs(amount);
        }
      }
      
      // Get opening balance as of 01.01.
      const openingBalanceDate = account.openingBalanceDate;
      let openingBalance = 0;
      
      // If opening balance date matches start of year, use it directly
      if (openingBalanceDate === startDate) {
        openingBalance = Number(account.openingBalance) || 0;
      } else {
        // Calculate balance as of 31.12. of previous year
        const previousYearEnd = `${year - 1}-12-31`;
        openingBalance = await storage.getBankAccountBalance(req.params.id, previousYearEnd);
      }
      
      // Get closing balance as of 31.12.
      const closingBalance = await storage.getBankAccountBalance(req.params.id, endDate);
      
      // Calculate expected closing balance
      const expectedClosingBalance = openingBalance + totalIncome - totalExpenses;
      
      // Difference (should be 0 if everything matches)
      const difference = Math.abs(closingBalance - expectedClosingBalance);
      const isPlausible = difference < 0.01; // Allow for rounding errors
      
      res.json({
        year,
        accountName: account.accountName,
        iban: account.iban,
        openingBalance,
        totalIncome,
        totalExpenses,
        expectedClosingBalance,
        actualClosingBalance: closingBalance,
        difference,
        isPlausible,
        transactionCount: yearTransactions.length,
        formula: `Anfangsbestand (${openingBalance.toFixed(2)} €) + Einnahmen (${totalIncome.toFixed(2)} €) - Ausgaben (${totalExpenses.toFixed(2)} €) = ${expectedClosingBalance.toFixed(2)} €`,
      });
    } catch (error) {
      console.error('Plausibility report error:', error);
      res.status(500).json({ error: "Fehler beim Erstellen des Plausibilitätsberichts" });
    }
  });

  // Jahresübertrag: Endbestand 31.12. wird Anfangsbestand 01.01. des Folgejahres
  app.post("/api/bank-accounts/:id/carry-over", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const account = await storage.getBankAccount(req.params.id);
      
      if (!account) {
        return res.status(404).json({ error: "Bankkonto nicht gefunden" });
      }
      if (account.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Zugriff verweigert" });
      }
      
      const { year, force } = req.body;
      if (!year || typeof year !== 'number') {
        return res.status(400).json({ error: "Jahr ist erforderlich" });
      }
      
      // Prüfe ob bereits ein Anfangsbestand für das Folgejahr existiert
      const newOpeningBalanceDate = `${year + 1}-01-01`;
      const existingDate = account.openingBalanceDate;
      const existingBalance = Number(account.openingBalance) || 0;
      
      if (existingDate && existingDate === newOpeningBalanceDate && !force) {
        return res.status(409).json({ 
          error: "Anfangsbestand existiert bereits",
          warning: `Es existiert bereits ein Anfangsbestand für 01.01.${year + 1} (${existingBalance.toFixed(2)} €). Senden Sie { force: true } um zu überschreiben.`,
          existingBalance,
          existingDate,
        });
      }
      
      // Berechne Endbestand zum 31.12. des angegebenen Jahres
      const endDate = `${year}-12-31`;
      const closingBalance = await storage.getBankAccountBalance(req.params.id, endDate);
      
      const updated = await storage.updateBankAccount(req.params.id, {
        openingBalance: closingBalance.toString(),
        openingBalanceDate: newOpeningBalanceDate,
      });
      
      res.json({
        success: true,
        message: `Endbestand vom 31.12.${year} (${closingBalance.toFixed(2)} €) wurde als Anfangsbestand für 01.01.${year + 1} übertragen.`,
        previousBalance: closingBalance,
        newOpeningBalanceDate,
        account: updated,
        wasOverwritten: existingDate === newOpeningBalanceDate,
      });
    } catch (error) {
      console.error('Bank account carry-over error:', error);
      res.status(500).json({ error: "Fehler beim Jahresübertrag" });
    }
  });

  app.get("/api/properties/:propertyId/settlements", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (property && property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const settlements = await storage.getSettlementsByProperty(req.params.propertyId);
      res.json(settlements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settlements" });
    }
  });

  app.get("/api/properties/:propertyId/maintenance-contracts", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (property && property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const contracts = await storage.getMaintenanceContractsByProperty(req.params.propertyId);
      res.json(contracts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance contracts" });
    }
  });

  app.get("/api/maintenance-tasks", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const { status } = req.query;
      const tasks = await storage.getMaintenanceTasksByOrganization(profile?.organizationId, status as string | undefined);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch maintenance tasks" });
    }
  });

  app.get("/api/contractors", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const contractors = await storage.getContractorsByOrganization(profile?.organizationId);
      res.json(contractors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contractors" });
    }
  });

  app.get("/api/distribution-keys", isAuthenticated, async (req: any, res) => {
    try {
      const keys = await storage.getDistributionKeys();
      res.json(keys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch distribution keys" });
    }
  });

  app.post("/api/distribution-keys", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const org = await storage.getUserOrganization(userId);
      if (!org) return res.status(403).json({ error: "No organization" });

      const normalizedBody = snakeToCamel(req.body);
      const { keyCode, name, description, unit, inputType } = normalizedBody;
      if (!keyCode || !name) {
        return res.status(400).json({ error: "keyCode and name required" });
      }

      const newKey = await storage.createDistributionKey({
        organizationId: org.id,
        keyCode,
        name,
        description,
        unit: unit || "Anteil",
        inputType: inputType || "custom",
        isSystem: false,
        isActive: true,
        mrgKonform: true,
      });
      res.status(201).json(newKey);
    } catch (error) {
      res.status(500).json({ error: "Failed to create distribution key" });
    }
  });

  app.patch("/api/distribution-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { id } = req.params;
      const normalizedBody = snakeToCamel(req.body);

      const updated = await storage.updateDistributionKey(id, normalizedBody);
      if (!updated) return res.status(404).json({ error: "Key not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update distribution key" });
    }
  });

  app.delete("/api/distribution-keys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });

      const { id } = req.params;
      
      // Verify ownership before delete
      const key = await storage.getDistributionKey(id);
      if (!key) return res.status(404).json({ error: "Key not found" });
      
      // Check if key belongs to org (either via organizationId or via property)
      if (key.propertyId) {
        const property = await storage.getProperty(key.propertyId);
        if (!property || property.organizationId !== profile.organizationId) {
          return res.status(403).json({ error: "Access denied" });
        }
      } else if (key.organizationId && key.organizationId !== profile.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteDistributionKey(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete distribution key" });
    }
  });

  // Property-specific distribution keys
  app.get("/api/properties/:propertyId/distribution-keys", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
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
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const normalizedBody = snakeToCamel(req.body);
      const { keyCode, name, description, formula, unit, inputType } = normalizedBody;
      if (!keyCode || !name) {
        return res.status(400).json({ error: "keyCode and name required" });
      }

      const newKey = await storage.createDistributionKey({
        organizationId: profile.organizationId,
        propertyId: req.params.propertyId,
        keyCode,
        name,
        description,
        formula: formula || 'flaeche',
        unit: unit || 'm²',
        inputType: inputType || 'flaeche',
        isSystem: false,
        isActive: true,
      });
      res.status(201).json(newKey);
    } catch (error) {
      console.error("Create distribution key error:", error);
      res.status(500).json({ error: "Failed to create distribution key" });
    }
  });

  app.get("/api/units/:unitId/distribution-values", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const unit = await storage.getUnit(req.params.unitId);
      if (!unit) return res.status(404).json({ error: "Unit not found" });
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const values = await storage.getUnitDistributionValues(req.params.unitId);
      res.json(values);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unit distribution values" });
    }
  });

  app.get("/api/properties/:propertyId/distribution-values", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const values = await storage.getUnitDistributionValuesByProperty(req.params.propertyId);
      res.json(values);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch property distribution values" });
    }
  });

  app.post("/api/units/:unitId/distribution-values", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const unit = await storage.getUnit(req.params.unitId);
      if (!unit) return res.status(404).json({ error: "Unit not found" });
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const normalizedBody = snakeToCamel(req.body);
      const { keyId, value } = normalizedBody;
      if (!keyId) return res.status(400).json({ error: "keyId is required" });
      const key = await storage.getDistributionKey(keyId);
      if (!key) return res.status(400).json({ error: "Invalid distribution key" });
      if (!key.isSystem && key.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Distribution key access denied" });
      }
      const result = await storage.upsertUnitDistributionValue({
        unitId: req.params.unitId,
        keyId,
        value: value?.toString() || '0'
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to save unit distribution value" });
    }
  });

  app.delete("/api/units/:unitId/distribution-values/:keyId", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const unit = await storage.getUnit(req.params.unitId);
      if (!unit) return res.status(404).json({ error: "Unit not found" });
      const property = await storage.getProperty(unit.propertyId);
      if (!property || property.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteUnitDistributionValue(req.params.unitId, req.params.keyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete unit distribution value" });
    }
  });

  const ADMIN_EMAIL = "stephania.pfeffer@outlook.de";
  
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const profile = await storage.getProfileById(userId);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      const roles = await storage.getUserRoles(profile.id);
      res.json({ ...profile, roles: roles.map(r => r.role) });
    } catch (error) {
      console.error("Profile error:", error);
      res.status(500).json({ error: "Failed to get profile" });
    }
  });

  app.get("/api/user/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const profile = await storage.getProfileById(userId);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      const tier = (profile as any).subscriptionTier || 'trial';
      const trialEndsAt = (profile as any).trialEndsAt;
      const subscriptionEndsAt = (profile as any).subscriptionEndsAt;
      
      const now = new Date();
      const trialDaysRemaining = trialEndsAt 
        ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;
      
      const isTrialExpired = tier === 'trial' && trialEndsAt ? new Date(trialEndsAt) < now : false;
      const isSubscriptionExpired = subscriptionEndsAt ? new Date(subscriptionEndsAt) < now : false;
      
      res.json({
        tier,
        trialEndsAt,
        subscriptionEndsAt,
        trialDaysRemaining,
        isTrialExpired,
        isSubscriptionExpired,
      });
    } catch (error) {
      console.error("Subscription error:", error);
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  app.get("/api/profile/organization", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const profile = await storage.getProfileById(userId);
      
      if (!profile?.organizationId) {
        return res.json(null);
      }
      
      const org = await storage.getOrganization(profile.organizationId);
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to get organization" });
    }
  });

  app.post("/api/invites", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization found" });
      }
      
      const roles = await storage.getUserRoles(profile.id);
      if (!roles.some(r => r.role === 'admin')) {
        return res.status(403).json({ error: "Only admins can send invites" });
      }
      
      const normalizedBody = snakeToCamel(req.body);
      const { email, role } = normalizedBody;
      
      if (!email || !role) {
        return res.status(400).json({ error: "Email and role are required" });
      }
      
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const invite = await storage.createInvite({
        organizationId: profile.organizationId,
        email,
        role: role as any,
        token,
        expiresAt,
        invitedBy: profile.id,
      });
      
      const org = await storage.getOrganization(profile.organizationId);
      const inviteUrl = `${req.protocol}://${req.get('host')}/register?invite=${token}`;
      
      try {
        const { sendInviteEmail } = await import("./lib/resend");
        const emailResult = await sendInviteEmail({
          to: email,
          inviterName: profile.fullName || profile.email,
          organizationName: org?.name || 'ImmoflowMe',
          role,
          inviteUrl,
        });
        console.log("Invite email sent successfully:", { to: email, inviteUrl, result: emailResult });
      } catch (emailError: any) {
        console.error("Email send error:", emailError?.message || emailError);
        console.error("Email error details:", JSON.stringify(emailError, null, 2));
      }
      
      res.json(invite);
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  app.get("/api/invites", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile?.organizationId) {
        return res.json([]);
      }
      
      const invites = await storage.getInvitesByOrganization(profile.organizationId);
      res.json(invites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invites" });
    }
  });

  app.get("/api/invites/:token", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      
      if (invite.status !== 'pending') {
        return res.status(400).json({ error: "Invite is no longer valid" });
      }
      
      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invite has expired" });
      }
      
      const org = await storage.getOrganization(invite.organizationId);
      res.json({ ...invite, organizationName: org?.name });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invite" });
    }
  });

  app.post("/api/invites/:token/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const invite = await storage.getInviteByToken(req.params.token);
      
      if (!invite || invite.status !== 'pending' || new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }
      
      if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
        return res.status(403).json({ error: "This invite is for a different email address" });
      }
      
      let profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile) {
        const fullName = []
          .filter(Boolean).join(' ') || userEmail;
        profile = await storage.createProfile({
          email: userEmail,
          fullName,
          organizationId: invite.organizationId,
        });
      } else {
        await storage.updateProfile(profile.id, {
          organizationId: invite.organizationId,
        });
        profile = await storage.getProfileById(profile.id);
      }
      
      await storage.addUserRole(profile!.id, invite.role);
      
      await storage.updateInvite(invite.id, {
        status: 'accepted' as any,
        acceptedAt: new Date(),
      });
      
      res.json({ success: true, profile });
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  app.delete("/api/invites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile?.organizationId) {
        return res.status(403).json({ error: "No organization found" });
      }
      
      const roles = await storage.getUserRoles(profile.id);
      if (!roles.some(r => r.role === 'admin')) {
        return res.status(403).json({ error: "Only admins can delete invites" });
      }
      
      await storage.deleteInvite(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete invite error:", error);
      res.status(500).json({ error: "Failed to delete invite" });
    }
  });

  app.get("/api/invites/token/:token", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      
      if (invite.status !== 'pending') {
        return res.status(400).json({ error: "Invite is no longer valid" });
      }
      
      if (new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invite has expired" });
      }
      
      const org = await storage.getOrganization(invite.organizationId);
      res.json({ ...invite, organizationName: org?.name });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invite" });
    }
  });

  app.get("/api/organization/members", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile?.organizationId) {
        return res.json([]);
      }
      
      const members = await storage.getProfilesByOrganization(profile.organizationId);
      
      const membersWithRoles = await Promise.all(
        members.map(async (member) => {
          const memberRoles = await storage.getUserRoles(member.id);
          return { ...member, roles: memberRoles.map(r => r.role) };
        })
      );
      
      const userRoles = await getUserRoles(req);
      res.json(isTester(userRoles) ? maskPersonalData(membersWithRoles) : membersWithRoles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch members" });
    }
  });

  app.post("/api/organization/members/:memberId/roles", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      const roles = await storage.getUserRoles(profile!.id);
      if (!roles.some(r => r.role === 'admin')) {
        return res.status(403).json({ error: "Only admins can manage roles" });
      }
      
      const normalizedBody = snakeToCamel(req.body);
      const { role, action } = normalizedBody;
      const memberId = req.params.memberId;
      
      if (action === 'add') {
        await storage.addUserRole(memberId, role);
      } else if (action === 'remove') {
        await storage.removeUserRole(memberId, role);
      }
      
      const updatedRoles = await storage.getUserRoles(memberId);
      res.json({ roles: updatedRoles.map(r => r.role) });
    } catch (error) {
      res.status(500).json({ error: "Failed to update roles" });
    }
  });

  app.post("/api/admin/run-simulation", isAuthenticated, async (req, res) => {
    try {
      const result = await runSimulation();
      res.json({ 
        success: true, 
        message: 'Simulation 2025 erfolgreich erstellt',
        data: result 
      });
    } catch (error) {
      console.error('Simulation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Simulation fehlgeschlagen' 
      });
    }
  });

  // ===== SEPA Export Routes =====
  app.post("/api/sepa/direct-debit", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const normalizedBody = snakeToCamel(req.body);
      const { creditorName, creditorIban, creditorBic, creditorId, invoiceIds } = normalizedBody;
      const xml = await sepaExportService.generateDirectDebitXml(
        profile.organizationId,
        creditorName,
        creditorIban,
        creditorBic,
        creditorId,
        invoiceIds
      );
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename=sepa-lastschrift.xml');
      res.send(xml);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "SEPA export failed" });
    }
  });

  app.post("/api/sepa/credit-transfer", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const normalizedBody = snakeToCamel(req.body);
      const { debtorName, debtorIban, debtorBic, transfers } = normalizedBody;
      const xml = await sepaExportService.generateCreditTransferXml(
        profile.organizationId,
        debtorName,
        debtorIban,
        debtorBic,
        transfers
      );
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename=sepa-ueberweisung.xml');
      res.send(xml);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "SEPA export failed" });
    }
  });

  // ===== Settlement PDF Routes =====
  app.get("/api/settlements/:id/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const data = await settlementPdfService.getSettlementData(req.params.id);
      if (!data) {
        return res.status(404).json({ error: "Settlement not found" });
      }
      const html = settlementPdfService.generateHtml(data);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate settlement PDF" });
    }
  });

  // ===== Dunning Overview (for Mahnwesen page) =====
  app.get("/api/dunning-overview", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }

      const overdueInvoices = await db.select({
        invoice: schema.monthlyInvoices,
        tenant: schema.tenants,
        unit: schema.units,
        property: schema.properties,
      })
        .from(schema.monthlyInvoices)
        .innerJoin(schema.tenants, eq(schema.monthlyInvoices.tenantId, schema.tenants.id))
        .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
        .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
        .where(and(
          eq(schema.properties.organizationId, profile.organizationId),
          or(
            eq(schema.monthlyInvoices.status, 'offen'),
            eq(schema.monthlyInvoices.status, 'teilbezahlt'),
            eq(schema.monthlyInvoices.status, 'ueberfaellig')
          ),
          lt(schema.monthlyInvoices.faelligAm, new Date().toISOString().split('T')[0])
        ));

      const tenantMap = new Map<string, any>();

      for (const row of overdueInvoices) {
        const tid = row.tenant.id;
        if (!tenantMap.has(tid)) {
          tenantMap.set(tid, {
            tenantId: tid,
            tenantName: `${row.tenant.firstName || ''} ${row.tenant.lastName || ''}`.trim(),
            email: row.tenant.email || null,
            phone: row.tenant.phone || null,
            propertyId: row.property.id,
            propertyName: row.property.name || '',
            unitId: row.unit.id,
            unitNumber: row.unit.topNummer || '',
            invoices: [],
            totalAmount: 0,
            highestMahnstufe: 0,
            oldestOverdue: row.invoice.faelligAm,
          });
        }
        const entry = tenantMap.get(tid)!;
        const invAmount = Number(row.invoice.gesamtbetrag || 0) - Number(row.invoice.paidAmount || 0);
        entry.invoices.push({
          id: row.invoice.id,
          month: row.invoice.month,
          year: row.invoice.year,
          gesamtbetrag: Number(row.invoice.gesamtbetrag || 0),
          faellig_am: row.invoice.faelligAm,
          mahnstufe: row.invoice.mahnstufe || 0,
          zahlungserinnerung_am: (row.invoice as any).zahlungserinnerungAm || null,
          mahnung_am: (row.invoice as any).mahnungAm || null,
        });
        entry.totalAmount += invAmount;
        if ((row.invoice.mahnstufe || 0) > entry.highestMahnstufe) {
          entry.highestMahnstufe = row.invoice.mahnstufe || 0;
        }
        if (row.invoice.faelligAm && (!entry.oldestOverdue || row.invoice.faelligAm < entry.oldestOverdue)) {
          entry.oldestOverdue = row.invoice.faelligAm;
        }
      }

      const cases = Array.from(tenantMap.values());
      const stats = {
        totalCases: cases.length,
        totalOpen: cases.filter(c => c.highestMahnstufe === 0).length,
        totalReminded: cases.filter(c => c.highestMahnstufe === 1).length,
        totalDunned: cases.filter(c => c.highestMahnstufe >= 2).length,
        totalAmount: Math.round(cases.reduce((s, c) => s + c.totalAmount, 0) * 100) / 100,
      };

      res.json({ cases, stats });
    } catch (error) {
      console.error("Error fetching dunning overview:", error);
      res.status(500).json({ error: "Fehler beim Laden der Mahnübersicht" });
    }
  });

  // ===== Send Dunning Email =====
  app.post("/api/dunning/send", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const body = snakeToCamel(req.body);
      const { invoiceId, dunningLevel, tenantEmail, tenantName, propertyName, unitNumber, amount, dueDate } = body;

      if (!invoiceId || !tenantEmail) {
        return res.status(400).json({ error: "invoiceId und tenantEmail sind erforderlich" });
      }

      const invoiceWithOrg = await db.select({
        invoice: schema.monthlyInvoices,
        orgId: schema.properties.organizationId,
      })
        .from(schema.monthlyInvoices)
        .innerJoin(schema.tenants, eq(schema.monthlyInvoices.tenantId, schema.tenants.id))
        .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
        .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
        .where(and(
          eq(schema.monthlyInvoices.id, invoiceId),
          eq(schema.properties.organizationId, profile.organizationId)
        ))
        .limit(1);
      if (!invoiceWithOrg.length) return res.status(404).json({ error: "Rechnung nicht gefunden" });

      const invoice = [invoiceWithOrg[0].invoice];
      const newLevel = dunningLevel || ((invoice[0].mahnstufe || 0) + 1);

      const levelLabels: Record<number, string> = { 1: 'Zahlungserinnerung', 2: '1. Mahnung', 3: '2. Mahnung' };
      const levelLabel = levelLabels[newLevel] || 'Zahlungserinnerung';
      const subject = `${levelLabel} - Offener Betrag für ${propertyName || 'Ihre Wohnung'}`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif;">
          <h2>${levelLabel}</h2>
          <p>Sehr geehrte(r) ${tenantName || 'Mieter/in'},</p>
          <p>für Ihre Wohnung in der ${propertyName || ''} (${unitNumber || ''}) besteht noch ein offener Betrag:</p>
          <p><strong>Offener Betrag: ${new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(amount || 0)}</strong></p>
          ${newLevel >= 2 ? `<p>Gemäß § 1333 ABGB sind wir berechtigt, Verzugszinsen in Höhe von 4% p.a. zu berechnen.</p>` : ''}
          ${newLevel >= 3 ? `<p><strong style="color: red;">Dies ist die letzte Mahnung vor Einleitung rechtlicher Schritte.</strong></p>` : ''}
          <p>Mit freundlichen Grüßen,<br>Ihre Hausverwaltung</p>
        </div>
      `;

      const { sendEmail } = await import("./lib/resend");
      await sendEmail({ to: tenantEmail, subject, html: htmlBody });

      await db.update(schema.monthlyInvoices).set({
        mahnstufe: newLevel,
        status: 'ueberfaellig',
      }).where(eq(schema.monthlyInvoices.id, invoiceId));

      res.json({ success: true, message: `${levelLabel} an ${tenantEmail} gesendet` });
    } catch (error) {
      console.error("Error sending dunning:", error);
      res.status(500).json({ error: "Fehler beim Versenden der Mahnung" });
    }
  });

  // ===== Automated Dunning Routes =====
  app.get("/api/dunning/check", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const actions = await automatedDunningService.checkOverdueInvoices(profile.organizationId);
      res.json({ actions });
    } catch (error) {
      res.status(500).json({ error: "Failed to check dunning" });
    }
  });

  app.post("/api/dunning/process", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const normalizedBody = snakeToCamel(req.body);
      const { sendEmails } = normalizedBody;
      const result = await automatedDunningService.processAutomatedDunning(
        profile.organizationId,
        sendEmails === true
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to process dunning" });
    }
  });

  // ===== VPI Automation Routes =====
  app.get("/api/vpi/check-adjustments", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const adjustments = await vpiAutomationService.checkVpiAdjustments(profile.organizationId);
      res.json({ adjustments });
    } catch (error) {
      res.status(500).json({ error: "Failed to check VPI adjustments" });
    }
  });

  app.post("/api/vpi/apply", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const normalizedBody = snakeToCamel(req.body);
      const { tenantId, newRent, currentVpiValue, effectiveDate } = normalizedBody;
      const result = await vpiAutomationService.applyVpiAdjustment(
        profile.organizationId,
        tenantId,
        newRent,
        currentVpiValue,
        effectiveDate
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to apply VPI adjustment" });
    }
  });

  // ===== Maintenance Reminder Routes =====
  app.get("/api/maintenance/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const reminders = await maintenanceReminderService.checkMaintenanceReminders(profile.organizationId);
      res.json({ reminders });
    } catch (error) {
      res.status(500).json({ error: "Failed to check maintenance reminders" });
    }
  });

  app.post("/api/maintenance/send-reminders", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const normalizedBody = snakeToCamel(req.body);
      const { managerEmail } = normalizedBody;
      const result = await maintenanceReminderService.sendMaintenanceReminders(
        profile.organizationId,
        managerEmail
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to send maintenance reminders" });
    }
  });

  // ===== Owner Reporting Routes =====
  app.get("/api/owners/:ownerId/report", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const { period, date } = req.query;
      const report = await ownerReportingService.generateOwnerReport(
        profile.organizationId,
        req.params.ownerId,
        period as any || 'month',
        date ? new Date(date as string) : new Date()
      );
      if (!report) {
        return res.status(404).json({ error: "Owner not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate owner report" });
    }
  });

  app.get("/api/owners/:ownerId/report/html", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const { period, date } = req.query;
      const report = await ownerReportingService.generateOwnerReport(
        profile.organizationId,
        req.params.ownerId,
        period as any || 'month',
        date ? new Date(date as string) : new Date()
      );
      if (!report) {
        return res.status(404).json({ error: "Owner not found" });
      }
      const html = ownerReportingService.generateReportHtml(report, period as string || 'Monat');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate owner report" });
    }
  });

  // ===== BMD/DATEV Export Routes =====
  app.get("/api/export/datev", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const { startDate, endDate } = req.query;
      const csv = await bmdDatevExportService.generateDatevExport(
        profile.organizationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=datev-export.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate DATEV export" });
    }
  });

  app.get("/api/export/bmd", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const { startDate, endDate } = req.query;
      const csv = await bmdDatevExportService.generateBmdExport(
        profile.organizationId,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=bmd-export.csv');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate BMD export" });
    }
  });

  // ===== FinanzOnline Routes =====
  app.get("/api/finanzonline/ust-summary", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const { year, period } = req.query;
      const voranmeldung = await finanzOnlineService.generateUstVoranmeldung(
        profile.organizationId,
        parseInt(year as string) || new Date().getFullYear(),
        period as any || 'Q1'
      );
      res.json(voranmeldung);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate USt summary" });
    }
  });

  app.get("/api/finanzonline/ust-xml", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      const { year, period } = req.query;
      const voranmeldung = await finanzOnlineService.generateUstVoranmeldung(
        profile.organizationId,
        parseInt(year as string) || new Date().getFullYear(),
        period as any || 'Q1'
      );
      const xml = finanzOnlineService.generateXml(voranmeldung);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename=ust-voranmeldung.xml');
      res.send(xml);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate USt XML" });
    }
  });

  app.get("/api/finanzonline/periods", isAuthenticated, async (req: any, res) => {
    const { year } = req.query;
    const periods = finanzOnlineService.getAvailablePeriods(parseInt(year as string) || new Date().getFullYear());
    res.json({ periods });
  });

  // ===== Accountant Dashboard KPIs =====
  app.get("/api/accountant/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "No organization" });
      }
      
      const [dunningActions, maintenanceReminders, vpiAdjustments] = await Promise.all([
        automatedDunningService.checkOverdueInvoices(profile.organizationId),
        maintenanceReminderService.checkMaintenanceReminders(profile.organizationId),
        vpiAutomationService.checkVpiAdjustments(profile.organizationId),
      ]);

      const overdueAmount = dunningActions.reduce((sum, a) => sum + a.amount, 0);
      const overdueCount = dunningActions.length;
      const maintenanceOverdue = maintenanceReminders.filter(r => r.reminderType === 'overdue').length;
      const maintenanceDue = maintenanceReminders.filter(r => r.reminderType === 'due').length;
      const pendingVpiAdjustments = vpiAdjustments.length;

      res.json({
        dunning: {
          overdueAmount,
          overdueCount,
          byLevel: {
            level1: dunningActions.filter(a => a.newLevel === 1).length,
            level2: dunningActions.filter(a => a.newLevel === 2).length,
            level3: dunningActions.filter(a => a.newLevel === 3).length,
          }
        },
        maintenance: {
          overdueCount: maintenanceOverdue,
          dueThisWeek: maintenanceDue,
          upcomingCount: maintenanceReminders.filter(r => r.reminderType === 'upcoming').length,
        },
        vpiAdjustments: {
          pendingCount: pendingVpiAdjustments,
          totalIncrease: vpiAdjustments.reduce((sum, a) => sum + (a.newRent - a.currentRent), 0),
        },
        actions: {
          dunning: dunningActions.slice(0, 5),
          maintenance: maintenanceReminders.slice(0, 5),
          vpi: vpiAdjustments.slice(0, 5),
        }
      });
    } catch (error) {
      console.error('Accountant dashboard error:', error);
      res.status(500).json({ error: "Failed to load accountant dashboard" });
    }
  });

  // ===== Storage Endpoints =====
  app.post("/api/storage/signed-url", isAuthenticated, async (req: any, res) => {
    try {
      const normalizedBody = snakeToCamel(req.body);
      const { bucket, filePath, expiresIn } = normalizedBody;
      // For now, return the direct path since we're not using external storage
      // In production, this would generate a signed URL from the storage provider
      const signedUrl = `/api/storage/files/${bucket}/${filePath}`;
      res.json({ signedUrl });
    } catch (error) {
      console.error('Signed URL error:', error);
      res.status(500).json({ error: "Failed to generate signed URL" });
    }
  });

  app.post("/api/storage/upload", isAuthenticated, async (req: any, res) => {
    try {
      // Placeholder for file upload - would integrate with Object Storage in production
      res.json({ 
        success: true, 
        path: `/uploads/${Date.now()}-file`,
        message: "File upload endpoint placeholder" 
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // ===== KEY INVENTORY ENDPOINTS =====
  app.get("/api/key-inventory", isAuthenticated, async (req: any, res) => {
    try {
      const organizationId = req.session?.organizationId;
      const propertyId = req.query.property_id;
      
      let query = db.select({
        key: schema.keyInventory,
        property: schema.properties,
        unit: schema.units,
      })
      .from(schema.keyInventory)
      .leftJoin(schema.properties, eq(schema.keyInventory.propertyId, schema.properties.id))
      .leftJoin(schema.units, eq(schema.keyInventory.unitId, schema.units.id));
      
      if (organizationId) {
        query = query.where(eq(schema.properties.organizationId, organizationId));
      }
      
      const results = await query;
      
      const keys = results
        .filter(r => !propertyId || r.key.propertyId === propertyId)
        .map(r => ({
          ...r.key,
          property_id: r.key.propertyId,
          unit_id: r.key.unitId,
          key_type: r.key.keyType,
          key_number: r.key.keyNumber,
          total_count: r.key.totalCount,
          available_count: r.key.availableCount,
          created_at: r.key.createdAt,
          updated_at: r.key.updatedAt,
          properties: r.property ? { id: r.property.id, name: r.property.name } : null,
          units: r.unit ? { id: r.unit.id, top_nummer: r.unit.topNummer } : null,
        }));
      
      res.json(keys);
    } catch (error) {
      console.error('Key inventory fetch error:', error);
      res.status(500).json({ error: "Failed to fetch key inventory" });
    }
  });

  app.get("/api/key-inventory/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const result = await db.select({
        key: schema.keyInventory,
        property: schema.properties,
        unit: schema.units,
      })
      .from(schema.keyInventory)
      .leftJoin(schema.properties, eq(schema.keyInventory.propertyId, schema.properties.id))
      .leftJoin(schema.units, eq(schema.keyInventory.unitId, schema.units.id))
      .where(eq(schema.keyInventory.id, id))
      .limit(1);
      
      if (!result.length) {
        return res.status(404).json({ error: "Key not found" });
      }
      
      const r = result[0];
      const key = {
        ...r.key,
        property_id: r.key.propertyId,
        unit_id: r.key.unitId,
        key_type: r.key.keyType,
        key_number: r.key.keyNumber,
        total_count: r.key.totalCount,
        available_count: r.key.availableCount,
        created_at: r.key.createdAt,
        updated_at: r.key.updatedAt,
        properties: r.property ? { id: r.property.id, name: r.property.name } : null,
        units: r.unit ? { id: r.unit.id, top_nummer: r.unit.topNummer } : null,
      };
      
      res.json(key);
    } catch (error) {
      console.error('Key inventory fetch error:', error);
      res.status(500).json({ error: "Failed to fetch key" });
    }
  });

  app.post("/api/key-inventory", isAuthenticated, async (req: any, res) => {
    try {
      const body = snakeToCamel(req.body);
      const result = await db.insert(schema.keyInventory).values({
        propertyId: body.propertyId,
        unitId: body.unitId || null,
        keyType: body.keyType,
        keyNumber: body.keyNumber || null,
        description: body.description || null,
        totalCount: body.totalCount || 1,
        availableCount: body.availableCount || 1,
        notes: body.notes || null,
      }).returning();
      
      const key = result[0];
      res.json({
        ...key,
        property_id: key.propertyId,
        unit_id: key.unitId,
        key_type: key.keyType,
        key_number: key.keyNumber,
        total_count: key.totalCount,
        available_count: key.availableCount,
        created_at: key.createdAt,
        updated_at: key.updatedAt,
      });
    } catch (error) {
      console.error('Key inventory create error:', error);
      res.status(500).json({ error: "Failed to create key" });
    }
  });

  app.patch("/api/key-inventory/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const body = snakeToCamel(req.body);
      
      const updates: any = { updatedAt: new Date() };
      if (body.propertyId !== undefined) updates.propertyId = body.propertyId;
      if (body.unitId !== undefined) updates.unitId = body.unitId || null;
      if (body.keyType !== undefined) updates.keyType = body.keyType;
      if (body.keyNumber !== undefined) updates.keyNumber = body.keyNumber || null;
      if (body.description !== undefined) updates.description = body.description || null;
      if (body.totalCount !== undefined) updates.totalCount = body.totalCount;
      if (body.availableCount !== undefined) updates.availableCount = body.availableCount;
      if (body.notes !== undefined) updates.notes = body.notes || null;
      
      const result = await db.update(schema.keyInventory)
        .set(updates)
        .where(eq(schema.keyInventory.id, id))
        .returning();
      
      if (!result.length) {
        return res.status(404).json({ error: "Key not found" });
      }
      
      const key = result[0];
      res.json({
        ...key,
        property_id: key.propertyId,
        unit_id: key.unitId,
        key_type: key.keyType,
        key_number: key.keyNumber,
        total_count: key.totalCount,
        available_count: key.availableCount,
        created_at: key.createdAt,
        updated_at: key.updatedAt,
      });
    } catch (error) {
      console.error('Key inventory update error:', error);
      res.status(500).json({ error: "Failed to update key" });
    }
  });

  app.delete("/api/key-inventory/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await db.delete(schema.keyInventory).where(eq(schema.keyInventory.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error('Key inventory delete error:', error);
      res.status(500).json({ error: "Failed to delete key" });
    }
  });

  // Key Handovers
  app.get("/api/key-inventory/:keyInventoryId/handovers", isAuthenticated, async (req: any, res) => {
    try {
      const { keyInventoryId } = req.params;
      const results = await db.select({
        handover: schema.keyHandovers,
        tenant: schema.tenants,
      })
      .from(schema.keyHandovers)
      .leftJoin(schema.tenants, eq(schema.keyHandovers.tenantId, schema.tenants.id))
      .where(eq(schema.keyHandovers.keyInventoryId, keyInventoryId));
      
      const handovers = results.map(r => ({
        ...r.handover,
        key_inventory_id: r.handover.keyInventoryId,
        tenant_id: r.handover.tenantId,
        recipient_name: r.handover.recipientName,
        handover_date: r.handover.handoverDate,
        return_date: r.handover.returnDate,
        handover_protocol: r.handover.handoverProtocol,
        created_at: r.handover.createdAt,
        tenants: r.tenant ? {
          id: r.tenant.id,
          first_name: r.tenant.firstName,
          last_name: r.tenant.lastName,
        } : null,
      }));
      
      res.json(handovers);
    } catch (error) {
      console.error('Key handovers fetch error:', error);
      res.status(500).json({ error: "Failed to fetch key handovers" });
    }
  });

  app.post("/api/key-inventory/:keyInventoryId/handovers", isAuthenticated, async (req: any, res) => {
    try {
      const { keyInventoryId } = req.params;
      const body = snakeToCamel(req.body);
      
      const result = await db.insert(schema.keyHandovers).values({
        keyInventoryId,
        tenantId: body.tenantId || null,
        recipientName: body.recipientName || null,
        handoverDate: body.handoverDate,
        returnDate: body.returnDate || null,
        quantity: body.quantity || 1,
        status: body.status || 'ausgegeben',
        handoverProtocol: body.handoverProtocol || null,
        notes: body.notes || null,
      }).returning();
      
      // Update available count
      if (!body.returnDate) {
        await db.update(schema.keyInventory)
          .set({ 
            availableCount: sql`GREATEST(0, ${schema.keyInventory.availableCount} - ${body.quantity || 1})`,
            updatedAt: new Date()
          })
          .where(eq(schema.keyInventory.id, keyInventoryId));
      }
      
      const handover = result[0];
      res.json({
        ...handover,
        key_inventory_id: handover.keyInventoryId,
        tenant_id: handover.tenantId,
        recipient_name: handover.recipientName,
        handover_date: handover.handoverDate,
        return_date: handover.returnDate,
        handover_protocol: handover.handoverProtocol,
        created_at: handover.createdAt,
      });
    } catch (error) {
      console.error('Key handover create error:', error);
      res.status(500).json({ error: "Failed to create key handover" });
    }
  });

  // ===== MieWeG Indexation Calculator =====
  app.post("/api/mieweg-calculate", isAuthenticated, async (req: any, res) => {
    try {
      const body = snakeToCamel(req.body);
      const { miewegIndexationService } = await import('./services/miewegIndexationService');
      
      const result = miewegIndexationService.calculateAllowedIncrease({
        currentRent: Number(body.currentRent),
        inflationRate: Number(body.inflationRate),
        rentType: body.rentType || 'freier_markt',
        indexationYear: Number(body.indexationYear) || new Date().getFullYear(),
        lastIndexationDate: new Date(body.lastIndexationDate || new Date()),
        isEinZweifamilienhaus: body.isEinZweifamilienhaus || false,
      });
      
      res.json(result);
    } catch (error) {
      console.error('MieWeG calculation error:', error);
      res.status(500).json({ error: "Failed to calculate MieWeG indexation" });
    }
  });

  // ===== Property Budgets =====
  app.get("/api/budgets", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.session.organizationId;
      const { property_id, year } = req.query;
      
      let query = db.select({
        budget: schema.propertyBudgets,
        property: {
          name: schema.properties.name,
          address: schema.properties.address,
        }
      })
        .from(schema.propertyBudgets)
        .leftJoin(schema.properties, eq(schema.propertyBudgets.propertyId, schema.properties.id))
        .where(eq(schema.propertyBudgets.organizationId, orgId));
      
      const budgets = await query;
      
      // Filter by property_id and year if provided
      let filtered = budgets;
      if (property_id) {
        filtered = filtered.filter(b => b.budget.propertyId === property_id);
      }
      if (year) {
        filtered = filtered.filter(b => b.budget.year === parseInt(year as string));
      }
      
      res.json(filtered.map(b => ({
        ...b.budget,
        id: b.budget.id,
        property_id: b.budget.propertyId,
        organization_id: b.budget.organizationId,
        position_1_name: b.budget.position1Name,
        position_1_amount: parseFloat(b.budget.position1Amount || '0'),
        position_2_name: b.budget.position2Name,
        position_2_amount: parseFloat(b.budget.position2Amount || '0'),
        position_3_name: b.budget.position3Name,
        position_3_amount: parseFloat(b.budget.position3Amount || '0'),
        position_4_name: b.budget.position4Name,
        position_4_amount: parseFloat(b.budget.position4Amount || '0'),
        position_5_name: b.budget.position5Name,
        position_5_amount: parseFloat(b.budget.position5Amount || '0'),
        approved_by: b.budget.approvedBy,
        approved_at: b.budget.approvedAt,
        created_at: b.budget.createdAt,
        updated_at: b.budget.updatedAt,
        properties: b.property,
      })));
    } catch (error) {
      console.error('Budgets fetch error:', error);
      res.status(500).json({ error: "Failed to fetch budgets" });
    }
  });

  app.get("/api/budgets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const orgId = req.session.organizationId;
      const result = await db.select()
        .from(schema.propertyBudgets)
        .where(and(eq(schema.propertyBudgets.id, id), eq(schema.propertyBudgets.organizationId, orgId)));
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Budget not found" });
      }
      
      const b = result[0];
      res.json({
        ...b,
        property_id: b.propertyId,
        organization_id: b.organizationId,
        position_1_name: b.position1Name,
        position_1_amount: parseFloat(b.position1Amount || '0'),
        position_2_name: b.position2Name,
        position_2_amount: parseFloat(b.position2Amount || '0'),
        position_3_name: b.position3Name,
        position_3_amount: parseFloat(b.position3Amount || '0'),
        position_4_name: b.position4Name,
        position_4_amount: parseFloat(b.position4Amount || '0'),
        position_5_name: b.position5Name,
        position_5_amount: parseFloat(b.position5Amount || '0'),
        approved_by: b.approvedBy,
        approved_at: b.approvedAt,
        created_at: b.createdAt,
        updated_at: b.updatedAt,
      });
    } catch (error) {
      console.error('Budget fetch error:', error);
      res.status(500).json({ error: "Failed to fetch budget" });
    }
  });

  app.post("/api/budgets", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.session.organizationId;
      const body = snakeToCamel(req.body);
      
      // Validate property ownership
      const propertyId = body.propertyId || body.property_id;
      const property = await db.select().from(schema.properties)
        .where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, orgId)));
      if (property.length === 0) {
        return res.status(403).json({ error: "Property not found or access denied" });
      }
      
      const result = await db.insert(schema.propertyBudgets).values({
        propertyId: body.propertyId || body.property_id,
        organizationId: orgId,
        year: body.year,
        position1Name: body.position1Name || body.position_1_name,
        position1Amount: String(body.position1Amount || body.position_1_amount || 0),
        position2Name: body.position2Name || body.position_2_name,
        position2Amount: String(body.position2Amount || body.position_2_amount || 0),
        position3Name: body.position3Name || body.position_3_name,
        position3Amount: String(body.position3Amount || body.position_3_amount || 0),
        position4Name: body.position4Name || body.position_4_name,
        position4Amount: String(body.position4Amount || body.position_4_amount || 0),
        position5Name: body.position5Name || body.position_5_name,
        position5Amount: String(body.position5Amount || body.position_5_amount || 0),
        notes: body.notes,
        status: 'entwurf',
      }).returning();
      
      res.json(result[0]);
    } catch (error: any) {
      console.error('Budget create error:', error);
      if (error.message?.includes('unique')) {
        res.status(400).json({ error: "Budget for this property and year already exists" });
      } else {
        res.status(500).json({ error: "Failed to create budget" });
      }
    }
  });

  app.patch("/api/budgets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const body = snakeToCamel(req.body);
      
      const updateData: any = { updatedAt: new Date() };
      
      if (body.position1Name !== undefined || body.position_1_name !== undefined) updateData.position1Name = body.position1Name || body.position_1_name;
      if (body.position1Amount !== undefined || body.position_1_amount !== undefined) updateData.position1Amount = String(body.position1Amount ?? body.position_1_amount ?? 0);
      if (body.position2Name !== undefined || body.position_2_name !== undefined) updateData.position2Name = body.position2Name || body.position_2_name;
      if (body.position2Amount !== undefined || body.position_2_amount !== undefined) updateData.position2Amount = String(body.position2Amount ?? body.position_2_amount ?? 0);
      if (body.position3Name !== undefined || body.position_3_name !== undefined) updateData.position3Name = body.position3Name || body.position_3_name;
      if (body.position3Amount !== undefined || body.position_3_amount !== undefined) updateData.position3Amount = String(body.position3Amount ?? body.position_3_amount ?? 0);
      if (body.position4Name !== undefined || body.position_4_name !== undefined) updateData.position4Name = body.position4Name || body.position_4_name;
      if (body.position4Amount !== undefined || body.position_4_amount !== undefined) updateData.position4Amount = String(body.position4Amount ?? body.position_4_amount ?? 0);
      if (body.position5Name !== undefined || body.position_5_name !== undefined) updateData.position5Name = body.position5Name || body.position_5_name;
      if (body.position5Amount !== undefined || body.position_5_amount !== undefined) updateData.position5Amount = String(body.position5Amount ?? body.position_5_amount ?? 0);
      if (body.notes !== undefined) updateData.notes = body.notes;
      
      const orgId = req.session.organizationId;
      const result = await db.update(schema.propertyBudgets)
        .set(updateData)
        .where(and(eq(schema.propertyBudgets.id, id), eq(schema.propertyBudgets.organizationId, orgId)))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Budget not found" });
      }
      res.json(result[0]);
    } catch (error) {
      console.error('Budget update error:', error);
      res.status(500).json({ error: "Failed to update budget" });
    }
  });

  app.patch("/api/budgets/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const orgId = req.session.organizationId;
      const { status, approved_by } = req.body;
      
      const updateData: any = { 
        status,
        updatedAt: new Date(),
      };
      
      if (status === 'genehmigt') {
        updateData.approvedBy = approved_by;
        updateData.approvedAt = new Date();
      }
      
      const result = await db.update(schema.propertyBudgets)
        .set(updateData)
        .where(and(eq(schema.propertyBudgets.id, id), eq(schema.propertyBudgets.organizationId, orgId)))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Budget not found" });
      }
      res.json(result[0]);
    } catch (error) {
      console.error('Budget status update error:', error);
      res.status(500).json({ error: "Failed to update budget status" });
    }
  });

  app.delete("/api/budgets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const orgId = req.session.organizationId;
      await db.delete(schema.propertyBudgets).where(and(eq(schema.propertyBudgets.id, id), eq(schema.propertyBudgets.organizationId, orgId)));
      res.json({ success: true });
    } catch (error) {
      console.error('Budget delete error:', error);
      res.status(500).json({ error: "Failed to delete budget" });
    }
  });

  // Get expenses for budget comparison
  app.get("/api/budgets/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const { property_id, year } = req.query;
      
      if (!property_id || !year) {
        return res.status(400).json({ error: "property_id and year required" });
      }
      
      const expenses = await db.select()
        .from(schema.expenses)
        .where(eq(schema.expenses.propertyId, property_id as string));
      
      // Group by position (month) for budget comparison
      const byPosition: Record<number, number> = {};
      expenses.forEach(e => {
        const expenseDate = new Date(e.date);
        if (expenseDate.getFullYear() === parseInt(year as string)) {
          const position = expenseDate.getMonth() + 1;
          byPosition[position] = (byPosition[position] || 0) + parseFloat(e.amount || '0');
        }
      });
      
      res.json(byPosition);
    } catch (error) {
      console.error('Budget expenses fetch error:', error);
      res.status(500).json({ error: "Failed to fetch budget expenses" });
    }
  });

  app.get("/api/budgets/expenses-all", isAuthenticated, async (req: any, res) => {
    try {
      const { property_id, year } = req.query;
      
      if (!property_id || !year) {
        return res.status(400).json({ error: "property_id and year required" });
      }
      
      const expenses = await db.select()
        .from(schema.expenses)
        .where(eq(schema.expenses.propertyId, property_id as string));
      
      // Sum all expenses for the year
      const byPosition: Record<number, number> = {};
      let total = 0;
      expenses.forEach(e => {
        const expenseDate = new Date(e.date);
        if (expenseDate.getFullYear() === parseInt(year as string)) {
          total += parseFloat(e.amount || '0');
        }
      });
      
      byPosition[1] = total;
      res.json(byPosition);
    } catch (error) {
      console.error('Budget expenses-all fetch error:', error);
      res.status(500).json({ error: "Failed to fetch budget expenses" });
    }
  });

  // ===== Property Documents =====
  app.get("/api/properties/:propertyId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId } = req.params;
      const orgId = req.session.organizationId;
      const documents = await db.select()
        .from(schema.propertyDocuments)
        .where(and(eq(schema.propertyDocuments.propertyId, propertyId), eq(schema.propertyDocuments.organizationId, orgId)));
      
      res.json(documents.map(d => ({
        ...d,
        property_id: d.propertyId,
        organization_id: d.organizationId,
        file_url: d.fileUrl,
        file_size: d.fileSize,
        mime_type: d.mimeType,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
      })));
    } catch (error) {
      console.error('Property documents fetch error:', error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/properties/:propertyId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId } = req.params;
      const orgId = req.session.organizationId;
      const body = snakeToCamel(req.body);
      
      // Validate property ownership
      const property = await db.select().from(schema.properties)
        .where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, orgId)));
      if (property.length === 0) {
        return res.status(403).json({ error: "Property not found or access denied" });
      }
      
      const result = await db.insert(schema.propertyDocuments).values({
        propertyId,
        organizationId: orgId,
        name: body.name,
        category: body.category || 'sonstiges',
        fileUrl: body.fileUrl || body.file_url,
        fileSize: body.fileSize || body.file_size,
        mimeType: body.mimeType || body.mime_type,
        notes: body.notes,
      }).returning();
      
      res.json(result[0]);
    } catch (error) {
      console.error('Property document create error:', error);
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
      console.error('Property document delete error:', error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ===== Tenant Documents =====
  app.get("/api/tenant-documents", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.session.organizationId;
      const documents = await db.select()
        .from(schema.tenantDocuments)
        .where(eq(schema.tenantDocuments.organizationId, orgId));
      
      res.json(documents.map(d => ({
        ...d,
        tenant_id: d.tenantId,
        organization_id: d.organizationId,
        file_url: d.fileUrl,
        file_size: d.fileSize,
        mime_type: d.mimeType,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
      })));
    } catch (error) {
      console.error('Tenant documents fetch error:', error);
      res.status(500).json({ error: "Failed to fetch tenant documents" });
    }
  });

  app.get("/api/tenants/:tenantId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const documents = await db.select()
        .from(schema.tenantDocuments)
        .where(eq(schema.tenantDocuments.tenantId, tenantId));
      
      res.json(documents.map(d => ({
        ...d,
        tenant_id: d.tenantId,
        organization_id: d.organizationId,
        file_url: d.fileUrl,
        file_size: d.fileSize,
        mime_type: d.mimeType,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
      })));
    } catch (error) {
      console.error('Tenant documents fetch error:', error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/tenants/:tenantId/documents", isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.params;
      const orgId = req.session.organizationId;
      const body = snakeToCamel(req.body);
      
      // Validate tenant ownership via unit -> property -> org chain
      const tenantResult = await db.select({
        tenantId: schema.tenants.id,
        unitId: schema.tenants.unitId,
        propertyId: schema.units.propertyId,
        organizationId: schema.properties.organizationId,
      })
        .from(schema.tenants)
        .leftJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
        .leftJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
        .where(eq(schema.tenants.id, tenantId));
      
      if (tenantResult.length === 0 || tenantResult[0].organizationId !== orgId) {
        return res.status(403).json({ error: "Tenant not found or access denied" });
      }
      
      const result = await db.insert(schema.tenantDocuments).values({
        tenantId,
        organizationId: orgId,
        name: body.name,
        category: body.category || 'sonstiges',
        fileUrl: body.fileUrl || body.file_url,
        fileSize: body.fileSize || body.file_size,
        mimeType: body.mimeType || body.mime_type,
        notes: body.notes,
      }).returning();
      
      res.json(result[0]);
    } catch (error) {
      console.error('Tenant document create error:', error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  app.delete("/api/tenant-documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const orgId = req.session.organizationId;
      await db.delete(schema.tenantDocuments).where(and(eq(schema.tenantDocuments.id, id), eq(schema.tenantDocuments.organizationId, orgId)));
      res.json({ success: true });
    } catch (error) {
      console.error('Tenant document delete error:', error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ===== Banking Sync - Transactions to Payments =====
  app.post("/api/sync/transactions-to-payments", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.session.organizationId;
      
      // Get ALL income categories for this organization
      const categories = await db.select()
        .from(schema.accountCategories)
        .where(eq(schema.accountCategories.organizationId, orgId));
      
      // Filter for income categories (Mieteinnahmen, Betriebskosten-Nachzahlung, Kaution, etc.)
      const incomeCategories = categories.filter(c => c.type === 'income');
      if (incomeCategories.length === 0) {
        return res.status(400).json({ error: "Keine Einnahmen-Kategorien gefunden" });
      }
      const incomeCategoryIds = incomeCategories.map(c => c.id);
      
      // Get transactions that are categorized as ANY income category (org-scoped via category IDs at DB level)
      const transactions = await db.select()
        .from(schema.transactions)
        .where(inArray(schema.transactions.categoryId, incomeCategoryIds));
      
      // Get properties belonging to this organization
      const orgProperties = await db.select()
        .from(schema.properties)
        .where(eq(schema.properties.organizationId, orgId));
      const orgPropertyIds = orgProperties.map(p => p.id);
      
      // Get units for org properties only
      const allUnits = await db.select().from(schema.units);
      const units = allUnits.filter(u => orgPropertyIds.includes(u.propertyId!));
      const orgUnitIds = units.map(u => u.id);
      
      // Get tenants for org units only
      const allTenants = await db.select().from(schema.tenants);
      const tenants = allTenants.filter(t => orgUnitIds.includes(t.unitId!));
      const orgTenantIds = tenants.map(t => t.id);
      
      // Get existing payments for org tenants only
      const allPayments = await db.select().from(schema.payments);
      const payments = allPayments.filter(p => orgTenantIds.includes(p.tenantId!));
      
      let synced = 0;
      let skipped = 0;
      
      for (const transaction of transactions) {
        if (Number(transaction.amount) <= 0) {
          skipped++;
          continue;
        }
        
        // Check if payment already exists
        const existingPayment = payments.find(p => {
          const pTenantId = p.tenantId;
          const tTenantId = transaction.tenantId;
          return pTenantId === tTenantId &&
            Math.abs(Number(p.betrag) - Number(transaction.amount)) < 0.01 &&
            p.buchungsDatum === transaction.transactionDate;
        });
        
        if (existingPayment) {
          skipped++;
          continue;
        }
        
        // Find tenant from transaction
        let tenantId = transaction.tenantId;
        if (!tenantId && transaction.propertyId) {
          // Try to match by property and amount
          const propertyUnits = units.filter(u => u.propertyId === transaction.propertyId);
          const propertyTenants = tenants.filter(t => 
            propertyUnits.some(u => u.id === t.unitId)
          );
          // Take first active tenant if only one matches
          if (propertyTenants.length === 1) {
            tenantId = propertyTenants[0].id;
          }
        }
        
        if (!tenantId) {
          skipped++;
          continue;
        }
        
        try {
          const [newPayment] = await db.insert(schema.payments).values({
            tenantId,
            betrag: String(transaction.amount),
            buchungsDatum: transaction.transactionDate || new Date().toISOString().split('T')[0],
            eingangsDatum: transaction.bookingDate || transaction.transactionDate,
            verwendungszweck: transaction.description || 'Mietzahlung',
            paymentType: 'ueberweisung',
            transactionId: transaction.id,
          }).returning();
          
          // Also allocate payment to invoices
          if (newPayment) {
            try {
              await paymentService.allocatePayment(
                newPayment.id,
                Number(newPayment.betrag),
                newPayment.tenantId
              );
            } catch (allocError) {
              console.error('Payment allocation error (non-critical):', allocError);
            }
          }
          
          synced++;
        } catch (error) {
          console.error('Failed to sync transaction to payment:', transaction.id, error);
        }
      }
      
      res.json({ synced, skipped, message: `${synced} Mieteinnahmen synchronisiert, ${skipped} übersprungen` });
    } catch (error) {
      console.error('Sync transactions to payments error:', error);
      res.status(500).json({ error: "Synchronisierung fehlgeschlagen" });
    }
  });

  // Endpoint to reallocate all existing payments to invoices (update invoice status)
  app.post("/api/sync/payments-to-invoices", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.session.organizationId;
      
      // Get properties for this organization
      const orgProperties = await db.select()
        .from(schema.properties)
        .where(eq(schema.properties.organizationId, orgId));
      const orgPropertyIds = orgProperties.map(p => p.id);
      
      if (orgPropertyIds.length === 0) {
        return res.json({ allocated: 0, message: "Keine Liegenschaften gefunden" });
      }
      
      // Get units for org properties
      const allUnits = await db.select().from(schema.units);
      const units = allUnits.filter(u => orgPropertyIds.includes(u.propertyId!));
      const orgUnitIds = units.map(u => u.id);
      
      // Get tenants for org units
      const allTenants = await db.select().from(schema.tenants);
      const tenants = allTenants.filter(t => orgUnitIds.includes(t.unitId!));
      const tenantIds = tenants.map(t => t.id);
      
      if (tenantIds.length === 0) {
        return res.json({ allocated: 0, message: "Keine Mieter gefunden" });
      }
      
      // Get all payments for org tenants
      const payments = await db.select()
        .from(schema.payments)
        .where(inArray(schema.payments.tenantId, tenantIds));
      
      let allocated = 0;
      
      // Group payments by tenant and process each
      const paymentsByTenant = new Map<string, typeof payments>();
      for (const payment of payments) {
        if (!payment.tenantId) continue;
        const existing = paymentsByTenant.get(payment.tenantId) || [];
        existing.push(payment);
        paymentsByTenant.set(payment.tenantId, existing);
      }
      
      for (const [tenantId, tenantPayments] of paymentsByTenant) {
        // Sort by date
        tenantPayments.sort((a, b) => 
          new Date(a.buchungsDatum || '').getTime() - new Date(b.buchungsDatum || '').getTime()
        );
        
        for (const payment of tenantPayments) {
          try {
            await paymentService.allocatePayment(
              payment.id,
              Number(payment.betrag),
              payment.tenantId
            );
            allocated++;
          } catch (error) {
            console.error('Failed to allocate payment:', payment.id, error);
          }
        }
      }
      
      res.json({ 
        allocated, 
        total: payments.length,
        message: `${allocated} Zahlungen wurden Rechnungen zugeordnet` 
      });
    } catch (error) {
      console.error('Sync payments to invoices error:', error);
      res.status(500).json({ error: "Zuordnung fehlgeschlagen" });
    }
  });

  // Demo Access Routes (public - no auth required)
  app.post("/api/demo/request", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: "Gültige E-Mail-Adresse erforderlich" });
      }
      
      const ipAddress = req.headers['x-forwarded-for']?.toString() || req.ip;
      const userAgent = req.headers['user-agent'];
      
      const result = await demoService.requestDemoAccess(email, ipAddress, userAgent);
      
      if (result.success) {
        res.json({ 
          message: result.message,
          activationUrl: result.activationUrl
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error('Demo request error:', error);
      res.status(500).json({ error: "Fehler beim Erstellen der Demo-Anfrage" });
    }
  });

  app.get("/api/demo/validate", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, error: "Token fehlt" });
      }
      
      const [invite] = await db.select()
        .from(schema.demoInvites)
        .where(eq(schema.demoInvites.token, token))
        .limit(1);
      
      if (!invite) {
        return res.json({ valid: false, error: "Ungültiger Demo-Link" });
      }
      
      if (invite.status !== 'pending') {
        return res.json({ valid: false, error: "Dieser Demo-Link wurde bereits verwendet" });
      }
      
      if (new Date() > invite.expiresAt) {
        return res.json({ valid: false, error: "Dieser Demo-Link ist abgelaufen" });
      }
      
      res.json({ valid: true, email: invite.email });
    } catch (error) {
      console.error('Demo validate error:', error);
      res.status(500).json({ valid: false, error: "Validierungsfehler" });
    }
  });

  app.post("/api/demo/activate", async (req: Request, res: Response) => {
    try {
      const { token, fullName, password } = req.body;
      
      if (!token || !fullName || !password) {
        return res.status(400).json({ error: "Alle Felder sind erforderlich" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Passwort muss mindestens 6 Zeichen haben" });
      }
      
      const result = await demoService.activateDemo(token, fullName, password);
      
      if (result.success && result.userId) {
        // Auto-login the user
        req.session.userId = result.userId;
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
          }
        });
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error('Demo activate error:', error);
      res.status(500).json({ error: "Fehler beim Aktivieren der Demo" });
    }
  });

  app.get("/api/demo/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const status = await demoService.getDemoStatus(userId);
      res.json(status);
    } catch (error) {
      console.error('Demo status error:', error);
      res.status(500).json({ error: "Fehler beim Abrufen des Demo-Status" });
    }
  });

  // Admin: Send demo invitation directly
  app.post("/api/admin/demo/invite", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      // Check if user is admin
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren können Demo-Einladungen versenden" });
      }
      
      const { email, name } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: "Gültige E-Mail-Adresse erforderlich" });
      }
      
      const result = await demoService.requestDemoAccess(email);
      
      if (result.success) {
        res.json({ 
          message: `Demo-Einladung an ${email} gesendet`,
          activationUrl: result.activationUrl
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error('Admin demo invite error:', error);
      res.status(500).json({ error: "Fehler beim Versenden der Einladung" });
    }
  });

  // Admin: List all demo invitations
  app.get("/api/admin/demo/invites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }
      
      const invites = await db.select()
        .from(schema.demoInvites)
        .orderBy(desc(schema.demoInvites.createdAt))
        .limit(50);
      
      res.json(invites);
    } catch (error) {
      console.error('Admin demo invites list error:', error);
      res.status(500).json({ error: "Fehler beim Laden der Einladungen" });
    }
  });

  // Admin: Delete a demo invitation
  app.delete("/api/admin/demo/invites/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren können Demo-Einladungen löschen" });
      }
      
      await db.delete(schema.demoInvites)
        .where(eq(schema.demoInvites.id, id));
      
      res.json({ message: "Einladung gelöscht" });
    } catch (error) {
      console.error('Admin demo invite delete error:', error);
      res.status(500).json({ error: "Fehler beim Löschen der Einladung" });
    }
  });

  // OCR tenant extraction route
  const ocrUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Nur Bilder (JPG, PNG) und PDFs sind erlaubt'));
      }
    },
  });

  const ocrClient = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  app.post("/api/ocr/tenant", isAuthenticated, (req: Request, res: Response, next: any) => {
    ocrUpload.single('file')(req, res, (err: any) => {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(400).json({ message: err.message || 'Datei-Upload fehlgeschlagen' });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Keine Datei hochgeladen' });
      }

      if (req.file.mimetype === 'application/pdf') {
        return res.status(400).json({ 
          message: 'PDFs müssen im Browser konvertiert werden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.' 
        });
      }

      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      const imageUrl = `data:${mimeType};base64,${base64Image}`;

      const extractionPrompt = `Du bist ein Experte für österreichische Immobilienverwaltung und Mietverträge.
Analysiere dieses Dokument (Mietvertrag, Vorschreibung, Mieterliste oder ähnliches) und extrahiere ALLE Mieterdaten.

WICHTIG: 
- Extrahiere ALLE Mieter die im Dokument vorkommen, nicht nur den ersten!
- ALLE Beträge sind NETTOBETRÄGE (ohne USt)!
- JEDE Kostenposition EINZELN erfassen (NICHT zusammenfassen!) - wegen unterschiedlicher Verteilerschlüssel
- USt-Satz pro Position erfassen: Heizung = 20%, Wohnungen BK = 10%, Geschäftslokale = 20%

Antworte im JSON-Format als ARRAY von Mietern:
{
  "tenants": [
    {
      "firstName": "Vorname des Mieters",
      "lastName": "Nachname des Mieters",
      "email": "E-Mail-Adresse (falls vorhanden)",
      "phone": "Telefonnummer (falls vorhanden)",
      "mietbeginn": "Mietbeginn im Format YYYY-MM-DD",
      "grundmiete": Hauptmietzins NETTO als Zahl,
      "grundmieteUst": USt-Satz als Zahl (10 für Wohnung, 20 für Geschäft),
      "betriebskostenVorschuss": 0,
      "heizkostenVorschuss": 0,
      "wasserkostenVorschuss": 0,
      "warmwasserkostenVorschuss": 0,
      "sonstigeKosten": {
        "Positionsname": { "betrag": NETTO-Betrag, "ust": USt-Satz, "schluessel": "Verteilerschlüssel" },
        ...
      },
      "kaution": Kaution als Zahl (falls angegeben),
      "topNummer": "Wohnungs-/Einheitsnummer (z.B. Top 1, GE01, 001)",
      "address": "Adresse der Wohnung",
      "nutzungsart": "Wohnung" oder "Geschäftslokal",
      "notes": "Weitere relevante Informationen (kurz)"
    }
  ]
}

KRITISCH - JEDE Kostenposition EINZELN in sonstigeKosten erfassen MIT Verteilerschlüssel:
- "Betriebskosten": { "betrag": 73.42, "ust": 10, "schluessel": "Betriebskosten 01" }
- "Betriebskosten2": { "betrag": 65.89, "ust": 10, "schluessel": "Betriebskosten inkl Stellplätze" }
- "Kaltwasser": { "betrag": 43.93, "ust": 10, "schluessel": "Betriebskosten 01" }
- "Warmwasser": { "betrag": 12.01, "ust": 10, "schluessel": "Direktwert" }
- "Zentralheizung": { "betrag": 44.79, "ust": 20, "schluessel": "Zentralheizung" }
- "Lift": { "betrag": 13.81, "ust": 10, "schluessel": "BK Lift" }
- "Garage": { "betrag": 85.00, "ust": 20, "schluessel": "Direktwert" }
- "Mahnkosten": { "betrag": 15.00, "ust": 0, "schluessel": "Direktwert" }

Typische Verteilerschlüssel in österreichischen Vorschreibungen:
- "Direktwert" = fixer Betrag pro Mieter
- "Betriebskosten 01", "Betriebskosten 02" = nach Nutzfläche/Einheiten
- "Betriebskosten inkl Stellplätze" = inkl. Stellplätze nach Einheiten
- "Zentralheizung" = nach Heizungsverbrauch
- "BK Lift" = Liftkosten nach m²
- "Einheiten" = nach Anzahl Einheiten

Weitere mögliche Positionen: Müll, Kabel-TV, Internet, Strom, Versicherung, Garten, Reinigung, Stellplatz

USt-Sätze Österreich:
- Wohnungsmiete/BK: 10%
- Geschäftslokalmiete/BK: 20%
- Heizung/Zentralheizung: IMMER 20%
- Mahnkosten: 0%

- Datumsformat immer als YYYY-MM-DD
- Zahlen ohne Währungssymbol, nur numerisch (NETTO!)
- Wenn etwas nicht erkennbar ist, setze null oder 0
- Bei Personen-Namen: Vorname und Nachname getrennt

Antworte NUR mit dem JSON-Objekt, ohne zusätzlichen Text.`;

      const response = await ocrClient.chat.completions.create({
        model: 'gpt-5.2',
        max_completion_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: extractionPrompt },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: 'Keine Antwort von der KI erhalten' });
      }

      let extractedData;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Kein JSON in der Antwort gefunden');
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Content:', content);
        return res.status(500).json({ message: 'Konnte die extrahierten Daten nicht verarbeiten' });
      }

      const tenants = (extractedData.tenants || [extractedData]).map((t: any) => ({
        firstName: t.firstName || '',
        lastName: t.lastName || '',
        email: t.email || '',
        phone: t.phone || '',
        mietbeginn: t.mietbeginn || '',
        grundmiete: parseFloat(t.grundmiete) || 0,
        grundmieteUst: parseFloat(t.grundmieteUst) || 10,
        betriebskostenVorschuss: parseFloat(t.betriebskostenVorschuss) || 0,
        heizkostenVorschuss: parseFloat(t.heizkostenVorschuss) || 0,
        wasserkostenVorschuss: parseFloat(t.wasserkostenVorschuss) || 0,
        warmwasserkostenVorschuss: parseFloat(t.warmwasserkostenVorschuss) || 0,
        sonstigeKosten: t.sonstigeKosten || null,
        kaution: parseFloat(t.kaution) || 0,
        topNummer: t.topNummer || '',
        address: t.address || '',
        nutzungsart: t.nutzungsart || 'Wohnung',
        notes: t.notes || '',
      }));

      res.json({ tenants });
    } catch (error: any) {
      console.error('OCR processing error:', error);
      res.status(500).json({ message: error.message || 'OCR-Verarbeitung fehlgeschlagen' });
    }
  });

  // ========================================
  // WHITE LABEL INQUIRY ROUTES
  // ========================================

  // Helper function to escape HTML for email templates
  const escapeHtml = (text: string | null | undefined): string => {
    if (!text) return '-';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Public: Submit White Label inquiry
  app.post("/api/white-label/inquiry", async (req: Request, res: Response) => {
    try {
      const { companyName, contactPerson, email, phone, propertyCount, unitCount, message } = req.body;

      if (!companyName || !contactPerson || !email) {
        return res.status(400).json({ error: "Firmenname, Ansprechpartner und E-Mail sind erforderlich" });
      }

      // Validate string lengths
      if (companyName.length > 200 || contactPerson.length > 200 || email.length > 200) {
        return res.status(400).json({ error: "Eingaben sind zu lang" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Bitte geben Sie eine gültige E-Mail-Adresse ein" });
      }

      // Sanitize numeric values
      const parsedPropertyCount = propertyCount ? parseInt(propertyCount, 10) : null;
      const parsedUnitCount = unitCount ? parseInt(unitCount, 10) : null;
      
      if (propertyCount && (isNaN(parsedPropertyCount!) || parsedPropertyCount! < 0)) {
        return res.status(400).json({ error: "Ungültige Anzahl Objekte" });
      }
      if (unitCount && (isNaN(parsedUnitCount!) || parsedUnitCount! < 0)) {
        return res.status(400).json({ error: "Ungültige Anzahl Einheiten" });
      }

      // Create inquiry
      const [inquiry] = await db.insert(schema.whiteLabelInquiries)
        .values({
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          propertyCount: parsedPropertyCount,
          unitCount: parsedUnitCount,
          message: message?.trim() || null,
          ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
          userAgent: req.headers['user-agent'] || null,
        })
        .returning();

      // Send notification email to admin with escaped HTML
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          const { Resend } = await import('resend');
          const resend = new Resend(resendApiKey);

          await resend.emails.send({
            from: 'ImmoflowMe <no-reply@immoflowme.at>',
            to: 'office@immoflowme.at',
            subject: `Neue White-Label Anfrage: ${escapeHtml(companyName)}`,
            html: `
              <h2>Neue White-Label Anfrage</h2>
              <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Firma:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(companyName)}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Ansprechpartner:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(contactPerson)}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>E-Mail:</strong></td><td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Telefon:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(phone)}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Anzahl Objekte:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${parsedPropertyCount || '-'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Anzahl Einheiten:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${parsedUnitCount || '-'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Nachricht:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(message)}</td></tr>
              </table>
              <p style="margin-top: 20px; color: #666;">Anfrage eingegangen am ${new Date().toLocaleString('de-AT')}</p>
            `,
          });
          console.log('White Label inquiry notification sent to admin');
        }
      } catch (emailError) {
        console.error('Failed to send White Label notification email:', emailError);
      }

      res.json({ success: true, message: "Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns in Kürze bei Ihnen." });
    } catch (error) {
      console.error('White Label inquiry error:', error);
      res.status(500).json({ error: "Fehler beim Übermitteln der Anfrage" });
    }
  });

  // Admin: List all White Label inquiries
  app.get("/api/admin/white-label/inquiries", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }
      
      const inquiries = await db.select()
        .from(schema.whiteLabelInquiries)
        .orderBy(desc(schema.whiteLabelInquiries.createdAt));
      
      res.json(inquiries);
    } catch (error) {
      console.error('Admin White Label inquiries list error:', error);
      res.status(500).json({ error: "Fehler beim Laden der Anfragen" });
    }
  });

  // Admin: Update White Label inquiry status
  const validInquiryStatuses = ['neu', 'kontaktiert', 'demo_vereinbart', 'verhandlung', 'abgeschlossen', 'abgelehnt'];
  const validLicenseStatuses = ['aktiv', 'gekuendigt', 'pausiert', 'abgelaufen'];

  app.patch("/api/admin/white-label/inquiries/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const { status, notes } = req.body;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }

      // Validate status if provided
      if (status && !validInquiryStatuses.includes(status)) {
        return res.status(400).json({ error: "Ungültiger Status" });
      }

      // Validate notes length
      if (notes && notes.length > 2000) {
        return res.status(400).json({ error: "Notizen zu lang (max. 2000 Zeichen)" });
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes?.trim() || null;
      
      const [updated] = await db.update(schema.whiteLabelInquiries)
        .set(updateData)
        .where(eq(schema.whiteLabelInquiries.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Admin White Label inquiry update error:', error);
      res.status(500).json({ error: "Fehler beim Aktualisieren" });
    }
  });

  // Admin: Delete White Label inquiry
  app.delete("/api/admin/white-label/inquiries/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }
      
      await db.delete(schema.whiteLabelInquiries)
        .where(eq(schema.whiteLabelInquiries.id, id));
      
      res.json({ message: "Anfrage gelöscht" });
    } catch (error) {
      console.error('Admin White Label inquiry delete error:', error);
      res.status(500).json({ error: "Fehler beim Löschen" });
    }
  });

  // Admin: List all White Label licenses
  app.get("/api/admin/white-label/licenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }
      
      const licenses = await db.select({
        license: schema.whiteLabelLicenses,
        organization: schema.organizations,
      })
        .from(schema.whiteLabelLicenses)
        .leftJoin(schema.organizations, eq(schema.whiteLabelLicenses.organizationId, schema.organizations.id))
        .orderBy(desc(schema.whiteLabelLicenses.createdAt));
      
      res.json(licenses);
    } catch (error) {
      console.error('Admin White Label licenses list error:', error);
      res.status(500).json({ error: "Fehler beim Laden der Lizenzen" });
    }
  });

  // Admin: Create White Label license
  app.post("/api/admin/white-label/licenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }

      const { organizationId, licenseName, monthlyPrice, setupFee, contractStart, contractEnd, customDomain, maxUsers, notes } = req.body;

      if (!organizationId || !licenseName || !contractStart) {
        return res.status(400).json({ error: "Organisation, Lizenzname und Vertragsbeginn sind erforderlich" });
      }

      // Validate string lengths
      if (licenseName.length > 100) {
        return res.status(400).json({ error: "Lizenzname zu lang (max. 100 Zeichen)" });
      }
      if (customDomain && customDomain.length > 100) {
        return res.status(400).json({ error: "Domain zu lang (max. 100 Zeichen)" });
      }
      if (notes && notes.length > 2000) {
        return res.status(400).json({ error: "Notizen zu lang (max. 2000 Zeichen)" });
      }

      // Validate numeric values
      const parsedMonthlyPrice = monthlyPrice ? parseFloat(monthlyPrice) : null;
      const parsedSetupFee = setupFee ? parseFloat(setupFee) : null;
      const parsedMaxUsers = maxUsers ? parseInt(maxUsers, 10) : null;

      if (monthlyPrice && (isNaN(parsedMonthlyPrice!) || parsedMonthlyPrice! < 0)) {
        return res.status(400).json({ error: "Ungültiger Monatspreis" });
      }
      if (setupFee && (isNaN(parsedSetupFee!) || parsedSetupFee! < 0)) {
        return res.status(400).json({ error: "Ungültige Setup-Gebühr" });
      }
      if (maxUsers && (isNaN(parsedMaxUsers!) || parsedMaxUsers! < 0)) {
        return res.status(400).json({ error: "Ungültige Benutzeranzahl" });
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(contractStart)) {
        return res.status(400).json({ error: "Ungültiges Datumsformat für Vertragsbeginn" });
      }
      if (contractEnd && !/^\d{4}-\d{2}-\d{2}$/.test(contractEnd)) {
        return res.status(400).json({ error: "Ungültiges Datumsformat für Vertragsende" });
      }
      
      const [license] = await db.insert(schema.whiteLabelLicenses)
        .values({
          organizationId,
          licenseName: licenseName.trim(),
          monthlyPrice: parsedMonthlyPrice?.toString() || null,
          setupFee: parsedSetupFee?.toString() || null,
          contractStart,
          contractEnd: contractEnd || null,
          customDomain: customDomain?.trim() || null,
          maxUsers: parsedMaxUsers,
          notes: notes?.trim() || null,
        })
        .returning();
      
      res.json(license);
    } catch (error) {
      console.error('Admin White Label license create error:', error);
      res.status(500).json({ error: "Fehler beim Erstellen der Lizenz" });
    }
  });

  // Admin: Update White Label license
  app.patch("/api/admin/white-label/licenses/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }

      const { status, monthlyPrice, contractEnd, customDomain, maxUsers, notes } = req.body;

      // Validate status
      if (status && !validLicenseStatuses.includes(status)) {
        return res.status(400).json({ error: "Ungültiger Status" });
      }

      // Validate numeric values if provided
      if (monthlyPrice !== undefined && monthlyPrice !== '' && monthlyPrice !== null) {
        const parsed = parseFloat(monthlyPrice);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: "Ungültiger Monatspreis" });
        }
      }
      if (maxUsers !== undefined && maxUsers !== '' && maxUsers !== null) {
        const parsed = parseInt(maxUsers, 10);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: "Ungültige Benutzeranzahl" });
        }
      }

      // Validate string lengths
      if (customDomain && customDomain.length > 100) {
        return res.status(400).json({ error: "Domain zu lang" });
      }
      if (notes && notes.length > 2000) {
        return res.status(400).json({ error: "Notizen zu lang" });
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice || null;
      if (contractEnd !== undefined) updateData.contractEnd = contractEnd || null;
      if (customDomain !== undefined) updateData.customDomain = customDomain?.trim() || null;
      if (maxUsers !== undefined) updateData.maxUsers = maxUsers ? parseInt(maxUsers) : null;
      if (notes !== undefined) updateData.notes = notes;
      
      const [updated] = await db.update(schema.whiteLabelLicenses)
        .set(updateData)
        .where(eq(schema.whiteLabelLicenses.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Admin White Label license update error:', error);
      res.status(500).json({ error: "Fehler beim Aktualisieren" });
    }
  });

  registerFunctionRoutes(app);
  registerStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
