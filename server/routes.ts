import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
        const activeUnits = propertyUnits.filter(u => u.status === 'aktiv');
        const totalQm = propertyUnits.reduce((sum, u) => sum + (Number(u.flaeche) || 0), 0);
        
        // Count units with active tenants
        const rentedUnits = propertyUnits.filter(unit => {
          return allTenants.some(t => 
            t.unitId === unit.id && 
            t.status === 'aktiv' &&
            (!t.mietende || new Date(t.mietende) >= new Date())
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
      res.json(units);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      
      if (!profile) {
        return res.status(403).json({ error: "Profile not found" });
      }
      
      const validationResult = insertPropertySchema.safeParse({
        ...req.body,
        organizationId: profile.organizationId,
      });
      if (!validationResult.success) {
        return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      }
      
      const propertyId = req.body.id || crypto.randomUUID();
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
      const validationResult = insertPropertySchema.partial().safeParse(req.body);
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
      
      const result = await storage.createPropertyManager({
        userId: profile.id,
        propertyId: req.body.propertyId,
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
      const validationResult = insertPaymentSchema.safeParse(req.body);
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
      const validationResult = insertPaymentSchema.partial().safeParse(req.body);
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
      const validationResult = insertTransactionSchema.safeParse(req.body);
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
      const validationResult = insertExpenseSchema.safeParse(req.body);
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
      const validationResult = insertExpenseSchema.partial().safeParse(req.body);
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
      const validationResult = insertRentHistorySchema.safeParse({
        ...req.body,
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
      const validationResult = insertMonthlyInvoiceSchema.safeParse(req.body);
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
      const validationResult = insertMonthlyInvoiceSchema.partial().safeParse(req.body);
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

      const { keyCode, name, description, unit, inputType } = req.body;
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
      const updates = req.body;

      const updated = await storage.updateDistributionKey(id, updates);
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
      const { keyId, value } = req.body;
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
      
      const { email, role } = req.body;
      
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
      
      const { role, action } = req.body;
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
      const { creditorName, creditorIban, creditorBic, creditorId, invoiceIds } = req.body;
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
      const { debtorName, debtorIban, debtorBic, transfers } = req.body;
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
      const { sendEmails } = req.body;
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
      const { tenantId, newRent, currentVpiValue, effectiveDate } = req.body;
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
      const { managerEmail } = req.body;
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

  registerFunctionRoutes(app);
  registerStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
