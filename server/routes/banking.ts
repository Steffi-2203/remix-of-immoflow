import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, inArray } from "drizzle-orm";
import * as schema from "@shared/schema";
import { isAuthenticated, snakeToCamel, getProfileFromSession, getUserRoles, isTester, maskPersonalData } from "./helpers";
import { assertOwnership } from "../middleware/assertOrgOwnership";
import { paymentService } from "../billing/paymentService";
import { bankImportService } from "../services/bankImportService";

export function registerBankingRoutes(app: Express) {
  app.get("/api/bank-accounts", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const accounts = await storage.getBankAccountsByOrganization(profile?.organizationId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(accounts) : accounts);
    } catch (error) { res.status(500).json({ error: "Failed to fetch bank accounts" }); }
  });

  app.get("/api/bank-accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const account = await assertOwnership(req, res, req.params.id, "bank_accounts");
      if (!account) return;
      res.json(account);
    } catch (error) { res.status(500).json({ error: "Failed to fetch bank account" }); }
  });

  app.post("/api/bank-accounts", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { account_name, bank_name, opening_balance, opening_balance_date, property_id, iban, bic } = req.body;
      const account = await storage.createBankAccount({
        organizationId: profile.organizationId, accountName: account_name, bankName: bank_name || null,
        openingBalance: opening_balance?.toString() || '0', openingBalanceDate: opening_balance_date || null,
        propertyId: property_id || null, iban: iban || null, bic: bic || null,
      });
      res.status(201).json(account);
    } catch (error) { console.error('Create bank account error:', error); res.status(500).json({ error: "Failed to create bank account" }); }
  });

  app.patch("/api/bank-accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const account = await storage.getBankAccount(req.params.id);
      if (!account) return res.status(404).json({ error: "Bank account not found" });
      if (account.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
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
    } catch (error) { console.error('Update bank account error:', error); res.status(500).json({ error: "Failed to update bank account" }); }
  });

  app.delete("/api/bank-accounts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const account = await storage.getBankAccount(req.params.id);
      if (!account) return res.status(404).json({ error: "Bank account not found" });
      if (account.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      await storage.deleteBankAccount(req.params.id);
      res.status(204).send();
    } catch (error) { console.error('Delete bank account error:', error); res.status(500).json({ error: "Failed to delete bank account" }); }
  });

  app.get("/api/bank-accounts/:id/balance", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const account = await storage.getBankAccount(req.params.id);
      if (!account) return res.status(404).json({ error: "Bank account not found" });
      if (account.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      const asOfDate = req.query.as_of_date as string | undefined;
      const balance = await storage.getBankAccountBalance(req.params.id, asOfDate);
      res.json({ balance });
    } catch (error) { console.error('Get bank balance error:', error); res.status(500).json({ error: "Failed to calculate bank balance" }); }
  });

  app.get("/api/bank-accounts/:id/transactions", isAuthenticated, async (req: any, res) => {
    try {
      const account = await assertOwnership(req, res, req.params.id, "bank_accounts");
      if (!account) return;
      const transactions = await storage.getTransactionsByBankAccount(req.params.id);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(transactions) : transactions);
    } catch (error) { res.status(500).json({ error: "Failed to fetch transactions" }); }
  });

  // Plausibility report
  app.get("/api/bank-accounts/:id/plausibility-report", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const account = await storage.getBankAccount(req.params.id);
      if (!account) return res.status(404).json({ error: "Bankkonto nicht gefunden" });
      if (account.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Zugriff verweigert" });
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const allTransactions = await storage.getTransactionsByBankAccount(req.params.id);
      const yearTransactions = allTransactions.filter(tx => {
        const txDate = tx.transactionDate;
        if (!txDate) return false;
        return new Date(txDate) >= new Date(startDate) && new Date(txDate) <= new Date(endDate);
      });
      let totalIncome = 0, totalExpenses = 0;
      for (const tx of yearTransactions) {
        const amount = Number(tx.amount) || 0;
        if (amount > 0) totalIncome += amount; else totalExpenses += Math.abs(amount);
      }
      const openingBalanceDate = account.openingBalanceDate;
      let openingBalance = 0;
      if (openingBalanceDate === startDate) openingBalance = Number(account.openingBalance) || 0;
      else openingBalance = await storage.getBankAccountBalance(req.params.id, `${year - 1}-12-31`);
      const closingBalance = await storage.getBankAccountBalance(req.params.id, endDate);
      const expectedClosingBalance = openingBalance + totalIncome - totalExpenses;
      const difference = Math.abs(closingBalance - expectedClosingBalance);
      const isPlausible = difference < 0.01;
      res.json({ year, accountName: account.accountName, iban: account.iban, openingBalance, totalIncome, totalExpenses, expectedClosingBalance, actualClosingBalance: closingBalance, difference, isPlausible, transactionCount: yearTransactions.length, formula: `Anfangsbestand (${openingBalance.toFixed(2)} €) + Einnahmen (${totalIncome.toFixed(2)} €) - Ausgaben (${totalExpenses.toFixed(2)} €) = ${expectedClosingBalance.toFixed(2)} €` });
    } catch (error) { console.error('Plausibility report error:', error); res.status(500).json({ error: "Fehler beim Erstellen des Plausibilitätsberichts" }); }
  });

  // Carry-over
  app.post("/api/bank-accounts/:id/carry-over", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const account = await storage.getBankAccount(req.params.id);
      if (!account) return res.status(404).json({ error: "Bankkonto nicht gefunden" });
      if (account.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Zugriff verweigert" });
      const { year, force } = req.body;
      if (!year || typeof year !== 'number') return res.status(400).json({ error: "Jahr ist erforderlich" });
      const newOpeningBalanceDate = `${year + 1}-01-01`;
      const existingDate = account.openingBalanceDate;
      const existingBalance = Number(account.openingBalance) || 0;
      if (existingDate && existingDate === newOpeningBalanceDate && !force) {
        return res.status(409).json({ error: "Anfangsbestand existiert bereits", warning: `Es existiert bereits ein Anfangsbestand für 01.01.${year + 1} (${existingBalance.toFixed(2)} €). Senden Sie { force: true } um zu überschreiben.`, existingBalance, existingDate });
      }
      const endDate = `${year}-12-31`;
      const closingBalance = await storage.getBankAccountBalance(req.params.id, endDate);
      const updated = await storage.updateBankAccount(req.params.id, { openingBalance: closingBalance.toString(), openingBalanceDate: newOpeningBalanceDate });
      res.json({ success: true, message: `Endbestand vom 31.12.${year} (${closingBalance.toFixed(2)} €) wurde als Anfangsbestand für 01.01.${year + 1} übertragen.`, previousBalance: closingBalance, newOpeningBalanceDate, account: updated, wasOverwritten: existingDate === newOpeningBalanceDate });
    } catch (error) { console.error('Bank account carry-over error:', error); res.status(500).json({ error: "Fehler beim Jahresübertrag" }); }
  });

  // Banking sync
  app.post("/api/sync/transactions-to-payments", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.session.organizationId;
      const categories = await db.select().from(schema.accountCategories).where(eq(schema.accountCategories.organizationId, orgId));
      const incomeCategories = categories.filter(c => c.type === 'income');
      if (incomeCategories.length === 0) return res.status(400).json({ error: "Keine Einnahmen-Kategorien gefunden" });
      const incomeCategoryIds = incomeCategories.map(c => c.id);
      const transactions = await db.select().from(schema.transactions).where(inArray(schema.transactions.categoryId, incomeCategoryIds));
      const orgProperties = await db.select().from(schema.properties).where(eq(schema.properties.organizationId, orgId));
      const orgPropertyIds = orgProperties.map(p => p.id);
      const allUnits = await db.select().from(schema.units);
      const units = allUnits.filter(u => orgPropertyIds.includes(u.propertyId!));
      const orgUnitIds = units.map(u => u.id);
      const allTenants = await db.select().from(schema.tenants);
      const tenants = allTenants.filter(t => orgUnitIds.includes(t.unitId!));
      const orgTenantIds = tenants.map(t => t.id);
      const allPayments = await db.select().from(schema.payments);
      const payments = allPayments.filter(p => orgTenantIds.includes(p.tenantId!));
      let synced = 0, skipped = 0;
      for (const transaction of transactions) {
        if (Number(transaction.amount) <= 0) { skipped++; continue; }
        const existingPayment = payments.find(p => p.tenantId === transaction.tenantId && Math.abs(Number(p.betrag) - Number(transaction.amount)) < 0.01 && p.buchungsDatum === transaction.transactionDate);
        if (existingPayment) { skipped++; continue; }
        let tenantId = transaction.tenantId;
        if (!tenantId && transaction.propertyId) {
          const propertyUnits = units.filter(u => u.propertyId === transaction.propertyId);
          const propertyTenants = tenants.filter(t => propertyUnits.some(u => u.id === t.unitId));
          if (propertyTenants.length === 1) tenantId = propertyTenants[0].id;
        }
        if (!tenantId) { skipped++; continue; }
        try {
          const [newPayment] = await db.insert(schema.payments).values({
            tenantId, betrag: String(transaction.amount), buchungsDatum: transaction.transactionDate || new Date().toISOString().split('T')[0],
            eingangsDatum: transaction.bookingDate || transaction.transactionDate, verwendungszweck: transaction.description || 'Mietzahlung',
            paymentType: 'ueberweisung', transactionId: transaction.id,
          }).returning();
          if (newPayment) {
            try { await paymentService.allocatePayment({ paymentId: newPayment.id, amount: Number(newPayment.betrag), tenantId: newPayment.tenantId }); }
            catch (allocError) { console.error('Payment allocation error (non-critical):', allocError); }
          }
          synced++;
        } catch (error) { console.error('Failed to sync transaction to payment:', transaction.id, error); }
      }
      res.json({ synced, skipped, message: `${synced} Mieteinnahmen synchronisiert, ${skipped} übersprungen` });
    } catch (error) { console.error('Sync transactions to payments error:', error); res.status(500).json({ error: "Synchronisierung fehlgeschlagen" }); }
  });

  app.post("/api/sync/payments-to-invoices", isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.session.organizationId;
      const orgProperties = await db.select().from(schema.properties).where(eq(schema.properties.organizationId, orgId));
      const orgPropertyIds = orgProperties.map(p => p.id);
      if (orgPropertyIds.length === 0) return res.json({ allocated: 0, message: "Keine Liegenschaften gefunden" });
      const allUnits = await db.select().from(schema.units);
      const units = allUnits.filter(u => orgPropertyIds.includes(u.propertyId!));
      const orgUnitIds = units.map(u => u.id);
      const allTenants = await db.select().from(schema.tenants);
      const tenants = allTenants.filter(t => orgUnitIds.includes(t.unitId!));
      const tenantIds = tenants.map(t => t.id);
      if (tenantIds.length === 0) return res.json({ allocated: 0, message: "Keine Mieter gefunden" });
      const payments = await db.select().from(schema.payments).where(inArray(schema.payments.tenantId, tenantIds));
      let allocated = 0;
      const paymentsByTenant = new Map<string, typeof payments>();
      for (const payment of payments) {
        if (!payment.tenantId) continue;
        const existing = paymentsByTenant.get(payment.tenantId) || [];
        existing.push(payment);
        paymentsByTenant.set(payment.tenantId, existing);
      }
      for (const [tenantId, tenantPayments] of paymentsByTenant) {
        tenantPayments.sort((a, b) => new Date(a.buchungsDatum || '').getTime() - new Date(b.buchungsDatum || '').getTime());
        for (const payment of tenantPayments) {
          try { await paymentService.allocatePayment({ paymentId: payment.id, amount: Number(payment.betrag), tenantId: payment.tenantId }); allocated++; }
          catch (error) { console.error('Failed to allocate payment:', payment.id, error); }
        }
      }
      res.json({ allocated, total: payments.length, message: `${allocated} Zahlungen wurden Rechnungen zugeordnet` });
    } catch (error) { console.error('Sync payments to invoices error:', error); res.status(500).json({ error: "Zuordnung fehlgeschlagen" }); }
  });

  // ── CAMT Bank Import ────────────────────────────────────────────────────
  app.post("/api/bank/import-camt", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation" });

      const { xmlContent, bankAccountId } = req.body;
      if (!xmlContent || typeof xmlContent !== 'string') {
        return res.status(400).json({ error: "xmlContent (string) ist erforderlich" });
      }

      const result = await bankImportService.importCamtFile(
        xmlContent,
        profile.organizationId,
        bankAccountId
      );

      res.json(result);
    } catch (error: any) {
      console.error('CAMT import error:', error);
      res.status(500).json({ error: error.message || "CAMT-Import fehlgeschlagen" });
    }
  });

  // ── Learn Match Pattern ─────────────────────────────────────────────────
  app.post("/api/bank/learn-match", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "Keine Organisation" });

      const { pattern, tenantId, unitId } = req.body;
      if (!pattern || !tenantId || !unitId) {
        return res.status(400).json({ error: "pattern, tenantId und unitId sind erforderlich" });
      }

      await bankImportService.learnMatch(profile.organizationId, pattern, tenantId, unitId);
      res.json({ success: true, message: "Match-Pattern gespeichert" });
    } catch (error: any) {
      console.error('Learn match error:', error);
      res.status(500).json({ error: error.message || "Pattern-Speicherung fehlgeschlagen" });
    }
  });
}
