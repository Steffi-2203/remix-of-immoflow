import type { Express } from "express";
import { storage } from "../storage";
import { parsePagination, paginateArray } from "../lib/pagination";
import { isAuthenticated, snakeToCamel, getProfileFromSession, getUserRoles, isTester, maskPersonalData } from "./helpers";
import { assertOwnership } from "../middleware/assertOrgOwnership";
import { paymentService } from "../billing/paymentService";
import {
  insertPaymentSchema,
  insertTransactionSchema,
  insertExpenseSchema,
  insertMonthlyInvoiceSchema,
} from "@shared/schema";
import * as schema from "@shared/schema";

export function registerFinanceRoutes(app: Express) {
  // ====== PAYMENTS ======
  app.get("/api/payments", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const allPayments = await storage.getPaymentsByOrganization(profile?.organizationId);
      const roles = await getUserRoles(req);
      const masked = isTester(roles) ? maskPersonalData(allPayments) : allPayments;
      const pagination = parsePagination(req);
      res.json(paginateArray(masked, pagination));
    } catch (error) {
      console.error("Payments error:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", isAuthenticated, async (req: any, res) => {
    try {
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertPaymentSchema.safeParse(normalizedBody);
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      const tenant = await assertOwnership(req, res, validationResult.data.tenantId, "tenants");
      if (!tenant) return;
      const payment = await storage.createPayment(validationResult.data);
      try {
        await paymentService.allocatePayment({ paymentId: payment.id, amount: Number(payment.betrag), tenantId: payment.tenantId, userId: (req as any).session?.userId });
      } catch (allocError) {
        console.error("Payment allocation error (non-critical):", allocError);
      }
      res.json(payment);
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  app.patch("/api/payments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existingPayment = await assertOwnership(req, res, req.params.id, "payments");
      if (!existingPayment) return;
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertPaymentSchema.partial().safeParse(normalizedBody);
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      const payment = await storage.updatePayment(req.params.id, validationResult.data);
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to update payment" });
    }
  });

  app.delete("/api/payments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const payment = await assertOwnership(req, res, req.params.id, "payments");
      if (!payment) return;
      const { assertRetentionAllowed } = await import("../middleware/retentionGuard");
      const retCheck = await assertRetentionAllowed("payments", req.params.id);
      if (!retCheck.allowed) {
        return res.status(403).json({ error: retCheck.reason, retentionUntil: retCheck.retentionUntil, standard: retCheck.standard });
      }
      await storage.deletePayment(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete payment" });
    }
  });

  app.get("/api/payments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const payment = await assertOwnership(req, res, req.params.id, "payments");
      if (!payment) return;
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(payment) : payment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payment" });
    }
  });

  // ====== TRANSACTIONS ======
  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const transactions = await storage.getTransactionsByOrganization(profile?.organizationId);
      const roles = await getUserRoles(req);
      const masked = isTester(roles) ? maskPersonalData(transactions) : transactions;
      const pagination = parsePagination(req);
      res.json(paginateArray(masked, pagination));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertTransactionSchema.safeParse(normalizedBody);
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      if (validationResult.data.bankAccountId) {
        const bankAccount = await assertOwnership(req, res, validationResult.data.bankAccountId, "bank_accounts");
        if (!bankAccount) return;
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
      const transaction = await assertOwnership(req, res, req.params.id, "transactions");
      if (!transaction) return;
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(transaction) : transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.delete("/api/transactions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const transaction = await assertOwnership(req, res, req.params.id, "transactions");
      if (!transaction) return;
      await storage.deleteTransactionSplits(req.params.id);
      await storage.deleteExpensesByTransactionId(req.params.id);
      await storage.deleteTransaction(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // ====== EXPENSES ======
  app.post("/api/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertExpenseSchema.safeParse(normalizedBody);
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      if (validationResult.data.propertyId) {
        const property = await assertOwnership(req, res, validationResult.data.propertyId, "properties");
        if (!property) return;
      }
      if (validationResult.data.distributionKeyId) {
        const key = await storage.getDistributionKey(validationResult.data.distributionKeyId);
        if (!key) return res.status(400).json({ error: "Invalid distribution key" });
        if (!key.isSystem && key.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Distribution key access denied" });
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
      const pagination = parsePagination(req);
      res.json(paginateArray(expenses, pagination));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.patch("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await assertOwnership(req, res, req.params.id, "expenses");
      if (!existing) return;
      const profile = await getProfileFromSession(req);
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertExpenseSchema.partial().safeParse(normalizedBody);
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      if (validationResult.data.distributionKeyId) {
        const key = await storage.getDistributionKey(validationResult.data.distributionKeyId);
        if (!key) return res.status(400).json({ error: "Invalid distribution key" });
        if (!key.isSystem && key.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Distribution key access denied" });
      }
      const expense = await storage.updateExpense(req.params.id, validationResult.data);
      res.json(expense);
    } catch (error) {
      res.status(500).json({ error: "Failed to update expense" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await assertOwnership(req, res, req.params.id, "expenses");
      if (!existing) return;
      const { assertRetentionAllowed } = await import("../middleware/retentionGuard");
      const retCheck = await assertRetentionAllowed("expenses", req.params.id);
      if (!retCheck.allowed) {
        return res.status(403).json({ error: retCheck.reason, retentionUntil: retCheck.retentionUntil, standard: retCheck.standard });
      }
      await storage.deleteExpense(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // ====== ACCOUNT CATEGORIES ======
  app.get("/api/account-categories", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.session?.email;
      const profile = await storage.getProfileByEmail(userEmail);
      if (!profile?.organizationId) return res.json([]);
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
        organizationId: profile.organizationId, name, type, parentId: parentId || null,
        isSystem: isSystem || false, defaultDistributionKeyId: defaultDistributionKeyId || null,
      });
      res.status(201).json(category);
    } catch (error) {
      console.error('Create account category error:', error);
      res.status(500).json({ error: "Failed to create account category" });
    }
  });

  app.patch("/api/account-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const category = await assertOwnership(req, res, req.params.id, "account_categories");
      if (!category) return;
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
      const category = await assertOwnership(req, res, req.params.id, "account_categories");
      if (!category) return;
      await storage.deleteAccountCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete account category error:', error);
      res.status(500).json({ error: "Failed to delete account category" });
    }
  });

  // ====== PAYMENT ALLOCATIONS ======
  app.get("/api/payments/:paymentId/allocations", isAuthenticated, async (req: any, res) => {
    try {
      const payment = await assertOwnership(req, res, req.params.paymentId, "payments");
      if (!payment) return;
      const allocations = await storage.getPaymentAllocationsByPayment(req.params.paymentId);
      res.json(allocations);
    } catch (error) {
      console.error("Get payment allocations error:", error);
      res.status(500).json({ error: "Failed to fetch payment allocations" });
    }
  });

  app.get("/api/invoices/:invoiceId/allocations", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await assertOwnership(req, res, req.params.invoiceId, "invoices");
      if (!invoice) return;
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
      const payment = await assertOwnership(req, res, validatedData.paymentId, "payments");
      if (!payment) return;
      if (validatedData.invoiceId) {
        const invoice = await assertOwnership(req, res, validatedData.invoiceId, "invoices");
        if (!invoice) return;
      }
      const allocation = await storage.createPaymentAllocation(validatedData);
      res.status(201).json(allocation);
    } catch (error: any) {
      console.error("Create payment allocation error:", error);
      if (error.name === 'ZodError') return res.status(400).json({ error: "Validation error", details: error.errors });
      res.status(500).json({ error: "Failed to create payment allocation" });
    }
  });

  app.delete("/api/payment-allocations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const alloc = await assertOwnership(req, res, req.params.id, "payment_allocations");
      if (!alloc) return;
      await storage.deletePaymentAllocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete payment allocation error:", error);
      res.status(500).json({ error: "Failed to delete payment allocation" });
    }
  });

  // ====== INVOICES ======
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
      const masked = isTester(roles) ? maskPersonalData(invoices) : invoices;
      const pagination = parsePagination(req);
      res.json(paginateArray(masked, pagination));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await assertOwnership(req, res, req.params.id, "invoices");
      if (!invoice) return;
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(invoice) : invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertMonthlyInvoiceSchema.safeParse(normalizedBody);
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      const tenant = await assertOwnership(req, res, validationResult.data.tenantId, "tenants");
      if (!tenant) return;
      const invoice = await storage.createInvoice(validationResult.data);
      res.json(invoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await assertOwnership(req, res, req.params.id, "invoices");
      if (!existing) return;
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertMonthlyInvoiceSchema.partial().safeParse(normalizedBody);
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      const invoice = await storage.updateInvoice(req.params.id, validationResult.data);
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await assertOwnership(req, res, req.params.id, "invoices");
      if (!invoice) return;
      const { archiveService } = await import("../billing/archiveService");
      const freeze = await archiveService.isDeletionFrozen(req.params.id);
      if (freeze.frozen) {
        return res.status(409).json({ error: "Dokument unterliegt der gesetzlichen Aufbewahrungspflicht", retentionUntil: freeze.retentionUntil, standard: freeze.standard, reason: freeze.reason });
      }
      await storage.deleteInvoice(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Dry-run invoice generation
  app.post("/api/invoices/dry-run", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "Organization not found" });
      const { period, units: unitIds } = req.body;
      if (!period || !/^\d{4}-\d{2}$/.test(period)) return res.status(400).json({ error: "Invalid period format. Use YYYY-MM" });
      const [yearStr, monthStr] = period.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      let tenants = await storage.getTenantsByOrganization(profile.organizationId);
      const activeTenants = tenants.filter(t => t.status === "aktiv");
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
        const grundmiete = Number(tenant.grundmiete || 0);
        const bkVorschuss = Number(tenant.betriebskostenVorschuss || 0);
        const hkVorschuss = Number(tenant.heizkostenVorschuss || 0);
        const unitType = (unit.type || "wohnung").toLowerCase();
        const isCommercial = unitType.includes("geschäft") || unitType.includes("gewerbe") || unitType.includes("büro");
        const isParking = unitType.includes("stellplatz") || unitType.includes("garage") || unitType.includes("parkplatz");
        const mietUst = isCommercial || isParking ? 20 : 10;
        const mieteBrutto = grundmiete * (1 + mietUst / 100);
        const bkBrutto = bkVorschuss * 1.10;
        const hkBrutto = hkVorschuss * 1.20;
        const totalBrutto = mieteBrutto + bkBrutto + hkBrutto;
        preview.push({
          tenantId: tenant.id, tenantName: `${tenant.firstName} ${tenant.lastName}`,
          unitId: unit.id, unitNumber: unit.unitNumber, propertyId: property.id, propertyName: property.name,
          year, month, grundmieteNetto: grundmiete, grundmieteBrutto: mieteBrutto, mietUst,
          bkNetto: bkVorschuss, bkBrutto, hkNetto: hkVorschuss, hkBrutto, totalBrutto,
          dueDate: new Date(year, month - 1, 5).toISOString().split("T")[0]
        });
      }
      res.json({ success: true, dryRun: true, period, count: preview.length, totalBrutto: preview.reduce((sum, p) => sum + p.totalBrutto, 0), preview });
    } catch (error) {
      console.error("Dry-run invoice error:", error);
      res.status(500).json({ error: "Failed to generate invoice preview" });
    }
  });

  // Generate monthly invoices
  app.post("/api/functions/generate-monthly-invoices", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "Organization not found" });
      const { year, month } = req.body;
      const currentDate = new Date();
      const targetYear = year || currentDate.getFullYear();
      const targetMonth = month || (currentDate.getMonth() + 1);
      const { invoiceService } = await import("../billing/invoiceService");
      const { withAuditedErrorHandling } = await import("../lib/serviceErrorHandler");
      const result = await withAuditedErrorHandling({
        service: 'invoiceService', operation: 'generateMonthlyInvoices', userId: profile.id,
        context: { year: targetYear, month: targetMonth, organizationId: profile.organizationId },
        fn: () => invoiceService.generateMonthlyInvoices(profile.id, targetYear, targetMonth, profile.organizationId),
      });
      res.json({ success: result.success, created: result.created, skipped: result.skipped, errors: 0, errorDetails: [], message: result.message });
    } catch (error: any) {
      console.error('Generate invoices error:', error);
      const { handleFinancialError } = await import("../lib/serviceErrorHandler");
      const errResp = handleFinancialError(error, 'invoiceService');
      res.status(errResp.status).json(errResp.body);
    }
  });

  // Cross-domain tenant invoices/payments
  app.get("/api/invoices/:invoiceId/payments", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await assertOwnership(req, res, req.params.invoiceId, "invoices");
      if (!invoice) return;
      const payments = await storage.getPaymentsByInvoice(req.params.invoiceId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(payments) : payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice payments" });
    }
  });

  app.get("/api/tenants/:tenantId/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await assertOwnership(req, res, req.params.tenantId, "tenants");
      if (!tenant) return;
      const invoices = await storage.getInvoicesByTenant(req.params.tenantId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(invoices) : invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant invoices" });
    }
  });

  app.get("/api/tenants/:tenantId/payments", isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await assertOwnership(req, res, req.params.tenantId, "tenants");
      if (!tenant) return;
      const payments = await storage.getPaymentsByTenant(req.params.tenantId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(payments) : payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant payments" });
    }
  });

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
}
