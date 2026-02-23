import { Router } from "express";
import type { Request, Response } from "express";
import { isAuthenticated, requireRole, getProfileFromSession, snakeToCamel } from "./helpers";
import { sepaExportService } from "../services/sepaExportService";
import { settlementPdfService } from "../services/settlementPdfService";

const router = Router();

router.post("/api/sepa/direct-debit", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
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

router.post("/api/sepa/credit-transfer", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
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

router.get("/api/settlements/:id/pdf", isAuthenticated, async (req: any, res) => {
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

export default router;
