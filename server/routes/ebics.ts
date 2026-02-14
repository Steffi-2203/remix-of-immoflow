import type { Express } from "express";
import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import * as schema from "@shared/schema";
import { isAuthenticated, getProfileFromSession } from "./helpers";
import { ebicsService } from "../services/ebicsService";

export function registerEbicsRoutes(app: Express) {
  // ── Connections CRUD ─────────────────────────────────────────────────

  app.get("/api/ebics/connections", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });

      const connections = await db
        .select()
        .from(schema.ebicsConnections)
        .where(eq(schema.ebicsConnections.organizationId, profile.organizationId))
        .orderBy(desc(schema.ebicsConnections.createdAt));

      res.json(connections);
    } catch (error: any) {
      console.error("EBICS connections error:", error);
      res.status(500).json({ error: "Fehler beim Laden der EBICS-Verbindungen" });
    }
  });

  app.post("/api/ebics/connections", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });

      const { host_id, host_url, partner_id, user_id_ebics, system_id, bank_name, bank_account_id } = req.body;

      if (!host_id || !host_url || !partner_id || !user_id_ebics) {
        return res.status(400).json({ error: "host_id, host_url, partner_id und user_id_ebics sind erforderlich" });
      }

      const [connection] = await db
        .insert(schema.ebicsConnections)
        .values({
          organizationId: profile.organizationId,
          bankAccountId: bank_account_id || null,
          hostId: host_id,
          hostUrl: host_url,
          partnerId: partner_id,
          userIdEbics: user_id_ebics,
          systemId: system_id || null,
          bankName: bank_name || null,
        })
        .returning();

      res.status(201).json(connection);
    } catch (error: any) {
      console.error("Create EBICS connection error:", error);
      res.status(500).json({ error: "Fehler beim Erstellen der EBICS-Verbindung" });
    }
  });

  app.get("/api/ebics/connections/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const details = await ebicsService.getConnectionDetails(req.params.id);

      if (details.connection.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Zugriff verweigert" });
      }

      res.json(details);
    } catch (error: any) {
      console.error("EBICS connection details error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ── Key Initialization ───────────────────────────────────────────────

  app.post("/api/ebics/connections/:id/init-keys", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const [conn] = await db
        .select()
        .from(schema.ebicsConnections)
        .where(eq(schema.ebicsConnections.id, req.params.id));

      if (!conn || conn.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Zugriff verweigert" });
      }

      const result = await ebicsService.initializeKeys(req.params.id);
      // Don't expose private keys to frontend
      res.json({ connection: result.connection, iniLetterData: result.iniLetterData });
    } catch (error: any) {
      console.error("Init keys error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ebics/connections/:id/send-ini", isAuthenticated, async (req: any, res) => {
    try {
      const result = await ebicsService.sendINI(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("Send INI error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ebics/connections/:id/send-hia", isAuthenticated, async (req: any, res) => {
    try {
      const result = await ebicsService.sendHIA(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("Send HIA error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ebics/connections/:id/activate", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const [conn] = await db
        .select()
        .from(schema.ebicsConnections)
        .where(eq(schema.ebicsConnections.id, req.params.id));

      if (!conn || conn.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Zugriff verweigert" });
      }

      const updated = await ebicsService.activateConnection(req.params.id);
      res.json(updated);
    } catch (error: any) {
      console.error("Activate connection error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ── INI Letter ───────────────────────────────────────────────────────

  app.get("/api/ebics/connections/:id/ini-letter", isAuthenticated, async (req: any, res) => {
    try {
      const data = await ebicsService.getIniLetterData(req.params.id);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Statement Download ───────────────────────────────────────────────

  app.post("/api/ebics/connections/:id/download-statements", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const [conn] = await db
        .select()
        .from(schema.ebicsConnections)
        .where(eq(schema.ebicsConnections.id, req.params.id));

      if (!conn || conn.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Zugriff verweigert" });
      }

      const orderType = (req.body.order_type === "STA" ? "STA" : "C53") as "STA" | "C53";
      const result = await ebicsService.downloadStatements(req.params.id, orderType);

      // If CAMT data received, auto-import via existing bank import service
      if (result.camtData && conn.bankAccountId) {
        try {
          const { bankImportService } = await import("../services/bankImportService");
          const importResult = await bankImportService.importCamtFile(
            result.camtData,
            profile.organizationId!,
            conn.bankAccountId
          );
          (result as any).importResult = importResult;
        } catch (importErr: any) {
          console.error("Auto-import after EBICS download failed:", importErr);
          (result as any).importError = importErr.message;
        }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Download statements error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ── Payment Batches ──────────────────────────────────────────────────

  app.get("/api/ebics/payment-batches", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });

      const batches = await db
        .select()
        .from(schema.ebicsPaymentBatches)
        .where(eq(schema.ebicsPaymentBatches.organizationId, profile.organizationId))
        .orderBy(desc(schema.ebicsPaymentBatches.createdAt))
        .limit(100);

      res.json(batches);
    } catch (error: any) {
      res.status(500).json({ error: "Fehler beim Laden der Zahlungsaufträge" });
    }
  });

  app.post("/api/ebics/payment-batches", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });

      const { connection_id, batch_type, payments, sender_name, sender_iban, sender_bic } = req.body;

      if (!connection_id || !payments?.length || !sender_name || !sender_iban || !sender_bic) {
        return res.status(400).json({ error: "connection_id, payments, sender_name, sender_iban, sender_bic erforderlich" });
      }

      const batch = await ebicsService.createPaymentBatch(
        connection_id,
        profile.organizationId,
        batch_type || "custom",
        payments,
        sender_name,
        sender_iban,
        sender_bic
      );

      res.status(201).json(batch);
    } catch (error: any) {
      console.error("Create payment batch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ebics/payment-batches/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const updated = await ebicsService.approveBatch(req.params.id);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ebics/payment-batches/:id/submit", isAuthenticated, async (req: any, res) => {
    try {
      const result = await ebicsService.submitCreditTransfer(req.params.id);
      res.json(result);
    } catch (error: any) {
      console.error("Submit payment batch error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ── Health Check ──────────────────────────────────────────────────────

  app.get("/api/ebics/connections/:id/health", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const health = await ebicsService.getHealthStatus(req.params.id);
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ── Order History ────────────────────────────────────────────────────

  app.get("/api/ebics/orders", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });

      const connectionId = req.query.connection_id as string;
      if (!connectionId) return res.status(400).json({ error: "connection_id required" });

      const orders = await db
        .select()
        .from(schema.ebicsOrders)
        .where(eq(schema.ebicsOrders.connectionId, connectionId))
        .orderBy(desc(schema.ebicsOrders.createdAt))
        .limit(100);

      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: "Fehler beim Laden der Auftragshistorie" });
    }
  });
}
