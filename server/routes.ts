import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { registerFunctionRoutes } from "./functions";
import { registerStripeRoutes } from "./stripeRoutes";
import { runSimulation } from "./seed-2025-simulation";
import { sepaExportService } from "./services/sepaExportService";
import { settlementPdfService } from "./services/settlementPdfService";
import { automatedDunningService } from "./services/automatedDunningService";
import { vpiAutomationService } from "./services/vpiAutomationService";
import { maintenanceReminderService } from "./services/maintenanceReminderService";
import { ownerReportingService } from "./services/ownerReportingService";
import { bmdDatevExportService } from "./services/bmdDatevExportService";
import { finanzOnlineService } from "./services/finanzOnlineService";
import crypto from "crypto";
import { 
  insertRentHistorySchema,
  insertPropertySchema,
  insertPaymentSchema,
  insertTransactionSchema,
  insertExpenseSchema,
  insertMonthlyInvoiceSchema
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
      
      if (req.query.includeTenants === 'true') {
        const allTenants = await storage.getTenantsByOrganization(profile?.organizationId);
        const enrichedUnits = units.map(unit => ({
          ...unit,
          tenants: allTenants.filter(t => t.unitId === unit.id)
        }));
        return res.json(enrichedUnits);
      }
      
      res.json(units);
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
      
      res.json({ id: settlementId, itemsCount: items.length });
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

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile) {
        return res.status(403).json({ error: "Profile not found" });
      }
      
      const normalizedBody = snakeToCamel(req.body);
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
      const { name, type, parentId, isSystem } = normalizedBody;
      
      const category = await storage.createAccountCategory({
        organizationId: profile.organizationId,
        name: name,
        type: type,
        parentId: parentId || null,
        isSystem: isSystem || false,
      });
      res.status(201).json(category);
    } catch (error) {
      console.error('Create account category error:', error);
      res.status(500).json({ error: "Failed to create account category" });
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
      res.json(units);
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
      res.json(unit);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unit" });
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
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { id } = req.params;
      await storage.deleteDistributionKey(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete distribution key" });
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
        await sendInviteEmail({
          to: email,
          inviterName: profile.fullName || profile.email,
          organizationName: org?.name || 'ImmoflowMe',
          role,
          inviteUrl,
        });
      } catch (emailError) {
        console.error("Email send error:", emailError);
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

  registerFunctionRoutes(app);
  registerStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
