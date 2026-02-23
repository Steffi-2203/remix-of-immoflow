import { Router, Request, Response } from "express";
import { ebicsService } from "../services/ebicsService";
import { isAuthenticated , type AuthenticatedRequest } from "./helpers";
import { db } from "../db";
import { ebicsConnections, ebicsPaymentBatches } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

function getOrgId(req: AuthenticatedRequest): string | null {
  return req.session?.organizationId || null;
}

async function verifyConnectionOwnership(connectionId: string, orgId: string): Promise<boolean> {
  const [conn] = await db.select().from(ebicsConnections)
    .where(and(eq(ebicsConnections.id, connectionId), eq(ebicsConnections.organizationId, orgId)));
  return !!conn;
}

async function verifyBatchOwnership(batchId: string, orgId: string): Promise<boolean> {
  const [batch] = await db.select().from(ebicsPaymentBatches)
    .where(and(eq(ebicsPaymentBatches.id, batchId), eq(ebicsPaymentBatches.organizationId, orgId)));
  return !!batch;
}

router.get("/api/ebics/connections", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    const connections = await ebicsService.getConnections(orgId);
    res.json(connections);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ebics/connections", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    const connection = await ebicsService.createConnection({ ...req.body, organizationId: orgId });
    res.json(connection);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/ebics/connections/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    if (!await verifyConnectionOwnership(req.params.id, orgId)) {
      return res.status(403).json({ error: "Zugriff verweigert" });
    }
    await ebicsService.deleteConnection(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ebics/connections/:id/init-keys", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    if (!await verifyConnectionOwnership(req.params.id, orgId)) {
      return res.status(403).json({ error: "Zugriff verweigert" });
    }
    const result = await ebicsService.initializeKeys(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ebics/connections/:id/activate", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    if (!await verifyConnectionOwnership(req.params.id, orgId)) {
      return res.status(403).json({ error: "Zugriff verweigert" });
    }
    const connection = await ebicsService.activateConnection(req.params.id);
    res.json(connection);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ebics/connections/:id/fetch-statements", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    if (!await verifyConnectionOwnership(req.params.id, orgId)) {
      return res.status(403).json({ error: "Zugriff verweigert" });
    }
    const { fromDate, toDate } = req.body;
    const result = await ebicsService.fetchStatements(req.params.id, fromDate, toDate);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ebics/connections/:id/fetch-daily", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    if (!await verifyConnectionOwnership(req.params.id, orgId)) {
      return res.status(403).json({ error: "Zugriff verweigert" });
    }
    const result = await ebicsService.fetchDailyStatements(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/ebics/orders", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    const orders = await ebicsService.getOrders(orgId);
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/ebics/payment-batches", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    const batches = await ebicsService.getPaymentBatches(orgId);
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ebics/payment-batches", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    const batch = await ebicsService.createPaymentBatch({ ...req.body, organizationId: orgId });
    res.json(batch);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ebics/payment-batches/:id/submit", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    if (!await verifyBatchOwnership(req.params.id, orgId)) {
      return res.status(403).json({ error: "Zugriff verweigert" });
    }
    const result = await ebicsService.submitPaymentBatch(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/ebics/payment-batches/:id/submit-debit", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: "Organisation nicht gefunden" });
    if (!await verifyBatchOwnership(req.params.id, orgId)) {
      return res.status(403).json({ error: "Zugriff verweigert" });
    }
    const result = await ebicsService.submitDirectDebitBatch(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
