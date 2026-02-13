import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { parsePagination } from "../lib/pagination";
import { isAuthenticated, snakeToCamel, getProfileFromSession } from "./helpers";
import { assertOwnership } from "../middleware/assertOrgOwnership";
import { automatedDunningService } from "../services/automatedDunningService";
import { vpiAutomationService } from "../services/vpiAutomationService";
import { maintenanceReminderService } from "../services/maintenanceReminderService";

export function registerComplianceRoutes(app: Express) {
  // ===== SEPA Export =====
  app.post("/api/sepa/direct-debit", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const { sepaExportService } = await import("../services/sepaExportService");
      const normalizedBody = snakeToCamel(req.body);
      const { creditorName, creditorIban, creditorBic, creditorId, invoiceIds } = normalizedBody;
      const { withAuditedErrorHandling } = await import("../lib/serviceErrorHandler");
      const xml = await withAuditedErrorHandling({ service: 'sepaExport', operation: 'generateDirectDebit', userId: profile.id, context: { invoiceCount: invoiceIds?.length, organizationId: profile.organizationId }, fn: () => sepaExportService.generateDirectDebitXml(profile.organizationId, creditorName, creditorIban, creditorBic, creditorId, invoiceIds) });
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename=sepa-lastschrift.xml');
      res.send(xml);
    } catch (error: any) {
      console.error('SEPA direct debit error:', error);
      const { handleFinancialError } = await import("../lib/serviceErrorHandler");
      const errResp = handleFinancialError(error, 'sepaExport');
      res.status(errResp.status).json(errResp.body);
    }
  });

  app.post("/api/sepa/credit-transfer", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const { sepaExportService } = await import("../services/sepaExportService");
      const normalizedBody = snakeToCamel(req.body);
      const { debtorName, debtorIban, debtorBic, transfers } = normalizedBody;
      const { withAuditedErrorHandling } = await import("../lib/serviceErrorHandler");
      const xml = await withAuditedErrorHandling({ service: 'sepaExport', operation: 'generateCreditTransfer', userId: profile.id, context: { transferCount: transfers?.length, organizationId: profile.organizationId }, fn: () => sepaExportService.generateCreditTransferXml(profile.organizationId, debtorName, debtorIban, debtorBic, transfers) });
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename=sepa-ueberweisung.xml');
      res.send(xml);
    } catch (error: any) {
      console.error('SEPA credit transfer error:', error);
      const { handleFinancialError } = await import("../lib/serviceErrorHandler");
      const errResp = handleFinancialError(error, 'sepaExport');
      res.status(errResp.status).json(errResp.body);
    }
  });

  // ===== Dunning =====
  app.get("/api/dunning/check", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const { withAuditedErrorHandling } = await import("../lib/serviceErrorHandler");
      const actions = await withAuditedErrorHandling({ service: 'dunningService', operation: 'checkOverdueInvoices', userId: profile.id, context: { organizationId: profile.organizationId }, fn: () => automatedDunningService.checkOverdueInvoices(profile.organizationId) });
      res.json({ actions });
    } catch (error: any) {
      console.error('Dunning check error:', error);
      const { handleFinancialError } = await import("../lib/serviceErrorHandler");
      const errResp = handleFinancialError(error, 'dunningService');
      res.status(errResp.status).json(errResp.body);
    }
  });

  app.post("/api/dunning/process", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const normalizedBody = snakeToCamel(req.body);
      const { sendEmails } = normalizedBody;
      const { withAuditedErrorHandling } = await import("../lib/serviceErrorHandler");
      const result = await withAuditedErrorHandling({ service: 'dunningService', operation: 'processAutomatedDunning', userId: profile.id, context: { organizationId: profile.organizationId, sendEmails: sendEmails === true }, fn: () => automatedDunningService.processAutomatedDunning(profile.organizationId, sendEmails === true) });
      res.json(result);
    } catch (error: any) {
      console.error('Dunning process error:', error);
      const { handleFinancialError } = await import("../lib/serviceErrorHandler");
      const errResp = handleFinancialError(error, 'dunningService');
      res.status(errResp.status).json(errResp.body);
    }
  });

  // ===== VPI =====
  app.get("/api/vpi/check-adjustments", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const adjustments = await vpiAutomationService.checkVpiAdjustments(profile.organizationId);
      res.json({ adjustments });
    } catch (error) { res.status(500).json({ error: "Failed to check VPI adjustments" }); }
  });

  app.post("/api/vpi/apply", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const normalizedBody = snakeToCamel(req.body);
      const { tenantId, newRent, currentVpiValue, effectiveDate } = normalizedBody;
      const result = await vpiAutomationService.applyVpiAdjustment(profile.organizationId, tenantId, newRent, currentVpiValue, effectiveDate);
      res.json(result);
    } catch (error) { res.status(500).json({ error: "Failed to apply VPI adjustment" }); }
  });

  app.get("/api/vpi/values", isAuthenticated, async (req: any, res) => {
    try { const values = await vpiAutomationService.listVpiValues(); res.json({ values }); }
    catch (error) { res.status(500).json({ error: "Failed to fetch VPI values" }); }
  });

  app.post("/api/vpi/values", isAuthenticated, async (req: any, res) => {
    try {
      const { year, month, value, source, notes } = snakeToCamel(req.body);
      if (!year || !month || value == null) return res.status(400).json({ error: "year, month and value are required" });
      await vpiAutomationService.upsertVpiValue(Number(year), Number(month), Number(value), source, notes);
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to save VPI value" }); }
  });

  // ===== Booking Periods =====
  app.get("/api/booking-periods", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const rows = await db.execute(sql`SELECT * FROM booking_periods WHERE organization_id = ${profile.organizationId}::uuid ORDER BY year DESC, month DESC`);
      res.json(rows.rows);
    } catch (error) { res.status(500).json({ error: "Failed to fetch booking periods" }); }
  });

  app.post("/api/booking-periods/lock", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { year, month } = req.body;
      if (!year || !month) return res.status(400).json({ error: "year and month required" });
      await db.execute(sql`INSERT INTO booking_periods (organization_id, year, month, is_locked, locked_at, locked_by) VALUES (${profile.organizationId}::uuid, ${year}, ${month}, true, NOW(), ${profile.id}::uuid) ON CONFLICT (organization_id, year, month) DO UPDATE SET is_locked = true, locked_at = NOW(), locked_by = ${profile.id}::uuid, updated_at = NOW()`);
      res.json({ success: true, year, month, isLocked: true });
    } catch (error) { res.status(500).json({ error: "Failed to lock period" }); }
  });

  app.post("/api/booking-periods/unlock", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { year, month } = req.body;
      if (!year || !month) return res.status(400).json({ error: "year and month required" });
      await db.execute(sql`UPDATE booking_periods SET is_locked = false, updated_at = NOW() WHERE organization_id = ${profile.organizationId}::uuid AND year = ${year} AND month = ${month}`);
      res.json({ success: true, year, month, isLocked: false });
    } catch (error) { res.status(500).json({ error: "Failed to unlock period" }); }
  });

  // ===== Maintenance Reminders =====
  app.get("/api/maintenance/reminders", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const reminders = await maintenanceReminderService.checkMaintenanceReminders(profile.organizationId);
      res.json({ reminders });
    } catch (error) { res.status(500).json({ error: "Failed to check maintenance reminders" }); }
  });

  app.post("/api/maintenance/send-reminders", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const normalizedBody = snakeToCamel(req.body);
      const { managerEmail } = normalizedBody;
      const result = await maintenanceReminderService.sendMaintenanceReminders(profile.organizationId, managerEmail);
      res.json(result);
    } catch (error) { res.status(500).json({ error: "Failed to send maintenance reminders" }); }
  });

  // ===== WEG/MRG Compliance =====
  app.get("/api/properties/:propertyId/reserve-compliance", isAuthenticated, async (req: any, res) => {
    try {
      const property = await assertOwnership(req, res, req.params.propertyId, "properties");
      if (!property) return;
      const { checkReserveCompliance } = await import("../services/wegComplianceService");
      const currentReserve = Number(req.query.currentReserve || 0);
      const result = await checkReserveCompliance(req.params.propertyId, currentReserve);
      res.json(result);
    } catch (error) { res.status(500).json({ error: "Failed to check reserve compliance" }); }
  });

  app.get("/api/compliance/deposit-returns", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { checkDepositReturnDeadlines } = await import("../services/wegComplianceService");
      const checks = await checkDepositReturnDeadlines(profile.organizationId);
      res.json(checks);
    } catch (error) { res.status(500).json({ error: "Failed to check deposit return deadlines" }); }
  });

  app.get("/api/compliance/retention-status", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { archiveService } = await import("../billing/archiveService");
      const baoStatus = await archiveService.getArchiveStatus(profile.organizationId);
      const lockStats = await db.execute(sql`SELECT COUNT(*) FILTER (WHERE locked_until > NOW())::int AS active_locks, COUNT(*) FILTER (WHERE locked_until <= NOW())::int AS expired_locks, COUNT(*) FILTER (WHERE standard = 'gobd')::int AS gobd_count, COUNT(*) FILTER (WHERE standard = 'bao')::int AS bao_count FROM retention_locks`);
      const lockRow = lockStats.rows?.[0] as any;
      res.json({ archive: baoStatus, retentionLocks: { active: lockRow?.active_locks || 0, expired: lockRow?.expired_locks || 0, gobd: lockRow?.gobd_count || 0, bao: lockRow?.bao_count || 0 } });
    } catch (error) { res.status(500).json({ error: "Failed to fetch retention status" }); }
  });

  app.get("/api/compliance/backup-events", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { getBackupEvents } = await import("../lib/backupAudit");
      const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
      const since = req.query.since || undefined;
      const events = await getBackupEvents({ limit, since });
      res.json({ events });
    } catch (error) { res.status(500).json({ error: "Failed to fetch backup events" }); }
  });

  app.get("/api/compliance/worm-status", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { getWormComplianceStatus } = await import("../lib/backupAudit");
      const status = await getWormComplianceStatus();
      const { archiveService } = await import("../billing/archiveService");
      const archiveStatus = await archiveService.getArchiveStatus(profile.organizationId);
      res.json({ worm: status, archive: archiveStatus, encryption: { atRest: "AES-256 (SSE-KMS)", inTransit: "TLS 1.2+", walArchive: "Managed by infrastructure (PITR)" }, compliance: { bao: { years: 7, standard: "BAO §132", description: "Aufbewahrungspflicht Buchhaltungsunterlagen" }, gobd: { years: 10, standard: "GoBD", description: "Steuerrelevante Unterlagen" }, wormEnabled: status.wormLocked > 0 } });
    } catch (error) { res.status(500).json({ error: "Failed to fetch WORM compliance status" }); }
  });

  app.post("/api/compliance/deposit-interest", isAuthenticated, async (req: any, res) => {
    try {
      const { calculateDepositInterest, calculateDepositRefund } = await import("../services/depositInterestService");
      const { depositType, amount, depositDate, endDate, ratePeriods, fixedRate, deductions } = req.body;
      if (!depositType || !amount || !depositDate || !endDate) return res.status(400).json({ error: "Missing required fields: depositType, amount, depositDate, endDate" });
      if (deductions && Array.isArray(deductions)) {
        const result = calculateDepositRefund({ depositType, amount, depositDate, endDate, ratePeriods, fixedRate }, deductions);
        return res.json(result);
      }
      const result = calculateDepositInterest({ depositType, amount, depositDate, endDate, ratePeriods, fixedRate });
      res.json(result);
    } catch (error) { console.error('Deposit interest error:', error); res.status(500).json({ error: "Failed to calculate deposit interest" }); }
  });

  // ===== Ledger Analytics =====
  app.get("/api/ledger/overpayments", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const pagination = parsePagination(req);
      const result = await db.execute(sql`SELECT le.id, le.tenant_id, le.payment_id, le.amount, le.booking_date, le.created_at, t.first_name, t.last_name FROM ledger_entries le JOIN tenants t ON t.id = le.tenant_id JOIN units u ON u.id = t.unit_id JOIN properties p ON p.id = u.property_id WHERE le.type = 'credit' AND p.organization_id = ${profile.organizationId} ORDER BY le.created_at DESC LIMIT ${pagination.limit} OFFSET ${pagination.offset}`);
      const countResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM ledger_entries le JOIN tenants t ON t.id = le.tenant_id JOIN units u ON u.id = t.unit_id JOIN properties p ON p.id = u.property_id WHERE le.type = 'credit' AND p.organization_id = ${profile.organizationId}`);
      const total = (countResult.rows[0] as any)?.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / pagination.limit));
      res.json({ data: result.rows, pagination: { page: pagination.page, limit: pagination.limit, total, totalPages, hasNextPage: pagination.page < totalPages, hasPreviousPage: pagination.page > 1 } });
    } catch (error) { console.error("Overpayments fetch error:", error); res.status(500).json({ error: "Failed to fetch overpayments" }); }
  });

  app.get("/api/ledger/interest-accruals", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const pagination = parsePagination(req);
      const result = await db.execute(sql`SELECT le.id, le.tenant_id, le.invoice_id, le.payment_id, le.amount, le.type, le.booking_date, le.created_at, t.first_name, t.last_name FROM ledger_entries le JOIN tenants t ON t.id = le.tenant_id JOIN units u ON u.id = t.unit_id JOIN properties p ON p.id = u.property_id WHERE le.type IN ('interest', 'fee') AND p.organization_id = ${profile.organizationId} ORDER BY le.created_at DESC LIMIT ${pagination.limit} OFFSET ${pagination.offset}`);
      const countResult = await db.execute(sql`SELECT COUNT(*)::int as total FROM ledger_entries le JOIN tenants t ON t.id = le.tenant_id JOIN units u ON u.id = t.unit_id JOIN properties p ON p.id = u.property_id WHERE le.type IN ('interest', 'fee') AND p.organization_id = ${profile.organizationId}`);
      const total = (countResult.rows[0] as any)?.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / pagination.limit));
      res.json({ data: result.rows, pagination: { page: pagination.page, limit: pagination.limit, total, totalPages, hasNextPage: pagination.page < totalPages, hasPreviousPage: pagination.page > 1 } });
    } catch (error) { console.error("Interest accruals fetch error:", error); res.status(500).json({ error: "Failed to fetch interest accruals" }); }
  });

  // ===== Accountant Dashboard =====
  app.get("/api/accountant/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
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
      res.json({ dunning: { overdueAmount, overdueCount, byLevel: { level1: dunningActions.filter(a => a.newLevel === 1).length, level2: dunningActions.filter(a => a.newLevel === 2).length, level3: dunningActions.filter(a => a.newLevel === 3).length } }, maintenance: { overdueCount: maintenanceOverdue, dueThisWeek: maintenanceDue, upcomingCount: maintenanceReminders.filter(r => r.reminderType === 'upcoming').length }, vpiAdjustments: { pendingCount: pendingVpiAdjustments, totalIncrease: vpiAdjustments.reduce((sum, a) => sum + (a.newRent - a.currentRent), 0) }, actions: { dunning: dunningActions.slice(0, 5), maintenance: maintenanceReminders.slice(0, 5), vpi: vpiAdjustments.slice(0, 5) } });
    } catch (error) { console.error('Accountant dashboard error:', error); res.status(500).json({ error: "Failed to load accountant dashboard" }); }
  });
}
