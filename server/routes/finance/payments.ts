import type { Express } from "express";
import { storage } from "../../storage";
import { parsePagination, paginateArray } from "../../lib/pagination";
import { isAuthenticated, snakeToCamel, maskPersonalData, getUserRoles, getProfileFromSession, isTester } from "../helpers";
import { assertOwnership } from "../../middleware/assertOrgOwnership";
import { paymentService } from "../../billing/paymentService";
import { insertPaymentSchema } from "@shared/schema";
import * as schema from "@shared/schema";

export function registerPaymentRoutes(app: Express) {
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
      const { assertRetentionAllowed } = await import("../../middleware/retentionGuard");
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

  // Cross-domain tenant payments
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
}
