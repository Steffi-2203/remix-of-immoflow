import type { Express } from "express";
import { db } from "../db";
import { isAuthenticated, getProfileFromSession } from "./helpers";
import { taxReportingService } from "../services/taxReportingService";
import { eq } from "drizzle-orm";
import { properties } from "@shared/schema";

export function registerTaxReportRoutes(app: Express) {
  // List property owners for the org
  app.get("/api/property-owners", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });

      const orgProperties = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.organizationId, profile.organizationId));

      if (orgProperties.length === 0) return res.json([]);

      const propertyIds = orgProperties.map((p) => p.id);
      const placeholders = propertyIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await db.execute(
        `SELECT id, name, property_id, ownership_share FROM property_owners WHERE property_id IN (${placeholders})`,
        propertyIds
      );
      res.json((result as any).rows ?? result);
    } catch (error) {
      console.error("Property owners error:", error);
      res.status(500).json({ error: "Failed to fetch property owners" });
    }
  });

  // Calculate E1a for an owner + year
  app.get("/api/tax-reports/:ownerId/:year", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });

      const { ownerId, year } = req.params;
      const report = await taxReportingService.calculateE1a(
        profile.organizationId,
        ownerId,
        parseInt(year)
      );
      res.json(report);
    } catch (error) {
      console.error("Tax report error:", error);
      res.status(500).json({ error: "Failed to calculate E1a" });
    }
  });

  // XML export
  app.get("/api/tax-reports/:ownerId/:year/xml", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });

      const { ownerId, year } = req.params;
      const report = await taxReportingService.calculateE1a(
        profile.organizationId,
        ownerId,
        parseInt(year)
      );
      const xml = taxReportingService.generateE1aXml(report);

      res.setHeader("Content-Type", "application/xml");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=E1a_${report.ownerName}_${year}.xml`
      );
      res.send(xml);
    } catch (error) {
      console.error("Tax XML error:", error);
      res.status(500).json({ error: "Failed to generate E1a XML" });
    }
  });

  // Generate + save report
  app.post("/api/tax-reports/generate", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });

      const { ownerId, taxYear } = req.body;
      if (!ownerId || !taxYear) return res.status(400).json({ error: "ownerId and taxYear required" });

      const report = await taxReportingService.calculateE1a(
        profile.organizationId,
        ownerId,
        taxYear
      );
      const xml = taxReportingService.generateE1aXml(report);

      // Save per property
      const savedIds: string[] = [];
      for (const prop of report.properties) {
        const id = await taxReportingService.saveReport(
          profile.organizationId,
          ownerId,
          prop.propertyId,
          taxYear,
          prop.kennzahlen,
          xml
        );
        savedIds.push(id);
      }

      res.json({ report, savedIds });
    } catch (error) {
      console.error("Tax generate error:", error);
      res.status(500).json({ error: "Failed to generate tax report" });
    }
  });

  // History
  app.get("/api/tax-reports/history", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(400).json({ error: "No organization" });

      const history = await taxReportingService.getHistory(profile.organizationId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tax report history" });
    }
  });
}
