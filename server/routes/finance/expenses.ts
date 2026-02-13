import type { Express } from "express";
import { storage } from "../../storage";
import { parsePagination, paginateArray } from "../../lib/pagination";
import { isAuthenticated, snakeToCamel, getProfileFromSession } from "../helpers";
import { assertOwnership } from "../../middleware/assertOrgOwnership";
import { insertExpenseSchema, insertTransactionSchema } from "@shared/schema";

export function registerExpenseRoutes(app: Express) {
  // ====== TRANSACTIONS ======
  app.get("/api/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const { getUserRoles, isTester, maskPersonalData } = await import("../helpers");
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
      const { getUserRoles, isTester, maskPersonalData } = await import("../helpers");
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
      const { assertRetentionAllowed } = await import("../../middleware/retentionGuard");
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

  // Property expenses (cross-domain)
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
