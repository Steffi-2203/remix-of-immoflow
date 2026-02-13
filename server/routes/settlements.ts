import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, snakeToCamel, getProfileFromSession } from "./helpers";
import { assertOwnership } from "../middleware/assertOrgOwnership";
import { settlementPdfService } from "../billing/settlementPdfService";

export function registerSettlementRoutes(app: Express) {
  app.get("/api/settlements", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId, year } = req.query;
      if (!propertyId || !year) return res.status(400).json({ error: "Missing propertyId or year" });
      const property = await assertOwnership(req, res, propertyId as string, "properties");
      if (!property) return;
      const settlement = await storage.getSettlementByPropertyAndYear(propertyId as string, parseInt(year as string));
      if (!settlement) return res.status(404).json({ error: "Settlement not found" });
      const items = await storage.getSettlementItems(settlement.id);
      res.json({ ...settlement, settlement_items: items });
    } catch (error) { res.status(500).json({ error: "Failed to fetch settlement" }); }
  });

  app.post("/api/settlements", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const normalizedBody = snakeToCamel(req.body);
      const { propertyId, year, items, ...data } = normalizedBody;
      const deadlineDate = new Date(year + 1, 5, 30);
      const today = new Date();
      const isAfterDeadline = today > deadlineDate;
      const mrgDeadlineWarning = isAfterDeadline ? `Achtung: Die Frist gemäß § 21 Abs 3 MRG für die BK-Abrechnung ${year} (30.06.${year + 1}) ist bereits abgelaufen. Eine verspätete Abrechnung kann zu Rechtsverlusten führen.` : null;
      const expirationDate = new Date(year + 4, 0, 1);
      const isExpired = today >= expirationDate;
      const mrgExpirationWarning = isExpired ? `Achtung: Die Nachforderungen für ${year} sind gemäß § 21 Abs 4 MRG seit 01.01.${year + 4} verjährt. Nachforderungen können rechtlich nicht mehr durchgesetzt werden.` : null;
      const existing = await storage.getSettlementByPropertyAndYear(propertyId, year);
      let settlementId: string;
      if (existing) {
        await storage.updateSettlement(existing.id, { gesamtkosten: data.totalBk + data.totalHk, totalBk: data.totalBk, totalHk: data.totalHk, bkMieter: data.bkMieter, hkMieter: data.hkMieter, bkEigentuemer: data.bkEigentuemer, hkEigentuemer: data.hkEigentuemer, status: 'berechnet' });
        settlementId = existing.id;
        await storage.deleteSettlementItems(settlementId);
      } else {
        const settlement = await storage.createSettlement({ propertyId, year, gesamtkosten: data.totalBk + data.totalHk, totalBk: data.totalBk, totalHk: data.totalHk, bkMieter: data.bkMieter, hkMieter: data.hkMieter, bkEigentuemer: data.bkEigentuemer, hkEigentuemer: data.hkEigentuemer, status: 'berechnet', organizationId: profile?.organizationId });
        settlementId = settlement.id;
      }
      for (const item of items) {
        await storage.createSettlementItem({ settlementId, unitId: item.unitId, tenantId: item.tenantId, tenantName: item.tenantName, tenantEmail: item.tenantEmail, isLeerstandBk: item.isLeerstandBk ?? item.isLeerstandBK ?? false, isLeerstandHk: item.isLeerstandHk ?? item.isLeerstandHK ?? false, bkAnteil: item.bkAnteil, hkAnteil: item.hkAnteil, bkVorschuss: item.bkVorschuss, hkVorschuss: item.hkVorschuss, bkSaldo: item.bkSaldo, hkSaldo: item.hkSaldo, gesamtSaldo: item.gesamtSaldo });
      }
      res.json({ id: settlementId, itemsCount: items.length, mrgDeadlineWarning, mrgExpirationWarning });
    } catch (error) { console.error('Save settlement error:', error); res.status(500).json({ error: "Failed to save settlement" }); }
  });

  app.post("/api/settlements/:id/finalize", isAuthenticated, async (req: any, res) => {
    try {
      const settlement = await assertOwnership(req, res, req.params.id, "settlements");
      if (!settlement) return;
      await storage.updateSettlement(req.params.id, { status: 'abgeschlossen', finalizedAt: new Date() });
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Failed to finalize settlement" }); }
  });

  // Advance updates (MRG-konform)
  app.post("/api/advances/update", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId, totalBkKosten, totalHkKosten, units, totals } = req.body;
      if (!propertyId || !units || !totals) return res.status(400).json({ error: "Missing required fields" });
      const property = await assertOwnership(req, res, propertyId, "properties");
      if (!property) return;
      const SICHERHEITSRESERVE = 1.03;
      let updatedCount = 0;
      for (const unit of units) {
        if (!unit.currentTenantId) continue;
        const bkAnteil = totals.mea > 0 ? (unit.mea / totals.mea) * totalBkKosten : 0;
        const hkAnteil = totals.qm > 0 ? (unit.qm / totals.qm) * totalHkKosten : 0;
        const neueBkVorschreibung = Math.round((bkAnteil / 12) * SICHERHEITSRESERVE * 100) / 100;
        const neueHkVorschreibung = Math.round((hkAnteil / 12) * SICHERHEITSRESERVE * 100) / 100;
        await storage.updateTenantAdvances(unit.currentTenantId, neueBkVorschreibung, neueHkVorschreibung);
        updatedCount++;
      }
      res.json({ success: true, updatedCount });
    } catch (error) { console.error("Update advances error:", error); res.status(500).json({ error: "Failed to update advances" }); }
  });

  // Property settlements
  app.get("/api/properties/:propertyId/settlements", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const property = await storage.getProperty(req.params.propertyId);
      if (property && property.organizationId !== profile?.organizationId) return res.status(403).json({ error: "Access denied" });
      const settlements = await storage.getSettlementsByProperty(req.params.propertyId);
      res.json(settlements);
    } catch (error) { res.status(500).json({ error: "Failed to fetch settlements" }); }
  });

  // Settlement PDF
  app.get("/api/settlements/:id/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const data = await settlementPdfService.getSettlementData(req.params.id);
      if (!data) return res.status(404).json({ error: "Settlement not found" });
      const html = settlementPdfService.generateHtml(data);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) { res.status(500).json({ error: "Failed to generate settlement PDF" }); }
  });

  // Settlement warnings
  app.get("/api/settlement-warnings", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const currentYear = new Date().getFullYear();
      const checkYears = [currentYear - 1, currentYear - 2];
      const warnings: Array<{ propertyId: string; propertyName: string; year: number; message: string }> = [];
      const props = await storage.getPropertiesByOrganization(profile.organizationId);
      for (const prop of props) {
        for (const year of checkYears) {
          const settlement = await storage.getSettlementByPropertyAndYear(prop.id, year);
          if (!settlement || settlement.status !== 'abgeschlossen') {
            const deadline = new Date(year + 1, 5, 30);
            const isOverdue = new Date() > deadline;
            if (isOverdue) warnings.push({ propertyId: prop.id, propertyName: prop.name, year, message: `BK-Abrechnung ${year} für "${prop.name}" wurde nicht abgeschlossen. Frist gem. § 21 Abs 3 MRG (30.06.${year + 1}) ist abgelaufen.` });
            else if (!settlement) warnings.push({ propertyId: prop.id, propertyName: prop.name, year, message: `BK-Abrechnung ${year} für "${prop.name}" fehlt noch. Frist: 30.06.${year + 1}.` });
          }
        }
      }
      res.json({ warnings, count: warnings.length });
    } catch (error) { res.status(500).json({ error: "Failed to check settlement warnings" }); }
  });

  // MRG allocation
  app.post("/api/billing/mrg-allocation", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { propertyId, year, month } = req.body;
      if (!year || !month) return res.status(400).json({ error: "year and month required" });
      const { mrgAllocationService } = await import("../billing/mrgAllocationService");
      const result = await mrgAllocationService.calculateMonthly({ organizationId: profile.organizationId, propertyId: propertyId === 'all' ? undefined : propertyId, year: Number(year), month: Number(month) });
      res.json(result);
    } catch (error) { console.error('MRG allocation error:', error); res.status(500).json({ error: "Failed to calculate MRG allocation" }); }
  });

  app.post("/api/billing/mrg-allocation-yearly", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { propertyId, year, monthCount } = req.body;
      if (!year) return res.status(400).json({ error: "year required" });
      const { mrgAllocationService } = await import("../billing/mrgAllocationService");
      const result = await mrgAllocationService.calculateYearly({ organizationId: profile.organizationId, propertyId: propertyId === 'all' ? undefined : propertyId, year: Number(year), monthCount: monthCount ? Number(monthCount) : 12 });
      res.json(result);
    } catch (error) { console.error('MRG allocation yearly error:', error); res.status(500).json({ error: "Failed to calculate yearly MRG allocation" }); }
  });

  app.post("/api/billing/payment-allocation", isAuthenticated, async (req: any, res) => {
    try {
      const { zahlungsbetrag, grundmiete, betriebskosten, heizungskosten, mitUst } = req.body;
      if (zahlungsbetrag == null || grundmiete == null || betriebskosten == null || heizungskosten == null) return res.status(400).json({ error: "zahlungsbetrag, grundmiete, betriebskosten, heizungskosten required" });
      const { allocatePaymentServer } = await import("../billing/mrgAllocationService");
      const result = allocatePaymentServer({ zahlungsbetrag: Number(zahlungsbetrag), grundmiete: Number(grundmiete), betriebskosten: Number(betriebskosten), heizungskosten: Number(heizungskosten), mitUst: mitUst !== false });
      res.json(result);
    } catch (error) { console.error('Payment allocation error:', error); res.status(500).json({ error: "Failed to calculate payment allocation" }); }
  });
}
