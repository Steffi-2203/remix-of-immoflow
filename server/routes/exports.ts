import type { Express } from "express";
import { isAuthenticated, getProfileFromSession } from "./helpers";
import { ownerReportingService } from "../services/ownerReportingService";
import { bmdDatevExportService } from "../services/bmdDatevExportService";
import { finanzOnlineService } from "../services/finanzOnlineService";

export function registerExportRoutes(app: Express) {
  // Owner reports
  app.get("/api/owners/:ownerId/report", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const { period, date } = req.query;
      const report = await ownerReportingService.generateOwnerReport(profile.organizationId, req.params.ownerId, period as any || 'month', date ? new Date(date as string) : new Date());
      if (!report) return res.status(404).json({ error: "Owner not found" });
      res.json(report);
    } catch (error) { res.status(500).json({ error: "Failed to generate owner report" }); }
  });

  app.get("/api/owners/:ownerId/report/html", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const { period, date } = req.query;
      const report = await ownerReportingService.generateOwnerReport(profile.organizationId, req.params.ownerId, period as any || 'month', date ? new Date(date as string) : new Date());
      if (!report) return res.status(404).json({ error: "Owner not found" });
      const html = ownerReportingService.generateReportHtml(report, period as string || 'Monat');
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) { res.status(500).json({ error: "Failed to generate owner report" }); }
  });

  // BMD/DATEV
  app.get("/api/export/datev", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const { startDate, endDate } = req.query;
      const csv = await bmdDatevExportService.generateDatevExport(profile.organizationId, new Date(startDate as string), new Date(endDate as string));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=datev-export.csv');
      res.send(csv);
    } catch (error) { res.status(500).json({ error: "Failed to generate DATEV export" }); }
  });

  app.get("/api/export/bmd", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const { startDate, endDate } = req.query;
      const csv = await bmdDatevExportService.generateBmdExport(profile.organizationId, new Date(startDate as string), new Date(endDate as string));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=bmd-export.csv');
      res.send(csv);
    } catch (error) { res.status(500).json({ error: "Failed to generate BMD export" }); }
  });

  // FinanzOnline
  app.get("/api/finanzonline/ust-summary", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const { year, period } = req.query;
      const voranmeldung = await finanzOnlineService.generateUstVoranmeldung(profile.organizationId, parseInt(year as string) || new Date().getFullYear(), period as any || 'Q1');
      res.json(voranmeldung);
    } catch (error) { res.status(500).json({ error: "Failed to generate USt summary" }); }
  });

  app.get("/api/finanzonline/ust-xml", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });
      const { year, period } = req.query;
      const voranmeldung = await finanzOnlineService.generateUstVoranmeldung(profile.organizationId, parseInt(year as string) || new Date().getFullYear(), period as any || 'Q1');
      const xml = finanzOnlineService.generateXml(voranmeldung);
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename=ust-voranmeldung.xml');
      res.send(xml);
    } catch (error) { res.status(500).json({ error: "Failed to generate USt XML" }); }
  });

  app.get("/api/finanzonline/periods", isAuthenticated, async (req: any, res) => {
    const { year } = req.query;
    const periods = finanzOnlineService.getAvailablePeriods(parseInt(year as string) || new Date().getFullYear());
    res.json({ periods });
  });
}
