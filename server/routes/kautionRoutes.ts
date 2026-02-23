import { Router, Request, Response } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthContext, checkMutationPermission, objectToSnakeCase, objectToCamelCase } from "./helpers";
import * as kautionService from "../services/kautionService";

const router = Router();

router.get("/api/kautionen/uebersicht", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const overview = await kautionService.getKautionOverview(ctx.orgId);
    res.json(objectToSnakeCase(overview));
  } catch (error) {
    console.error("Error fetching kaution overview:", error);
    res.status(500).json({ error: "Fehler beim Laden der Kautionsübersicht" });
  }
});

router.post("/api/kautionen/zinsen-batch", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const result = await kautionService.calculateAllInterest(ctx.orgId);
    res.json(objectToSnakeCase(result));
  } catch (error) {
    console.error("Error batch calculating interest:", error);
    res.status(500).json({ error: "Fehler bei der Batch-Zinsberechnung" });
  }
});

router.get("/api/kautionen", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const tenantId = req.query.tenantId as string;
    const unitId = req.query.unitId as string;
    const status = req.query.status as string;

    const conditions: any[] = [eq(schema.kautionen.organizationId, ctx.orgId)];
    if (tenantId) conditions.push(eq(schema.kautionen.tenantId, tenantId));
    if (unitId) conditions.push(eq(schema.kautionen.unitId, unitId));
    if (status) conditions.push(eq(schema.kautionen.status, status));

    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.kautionen).where(where).orderBy(desc(schema.kautionen.createdAt));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching kautionen:", error);
    res.status(500).json({ error: "Fehler beim Laden der Kautionen" });
  }
});

router.post("/api/kautionen", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const body = objectToCamelCase(req.body);
    const kaution = await kautionService.createKaution({
      ...body,
      organizationId: ctx.orgId,
    });
    res.json(objectToSnakeCase(kaution));
  } catch (error: any) {
    console.error("Error creating kaution:", error);
    res.status(400).json({ error: error.message || "Fehler beim Erstellen der Kaution" });
  }
});

router.get("/api/kautionen/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const [kaution] = await db.select().from(schema.kautionen)
      .where(and(eq(schema.kautionen.id, req.params.id), eq(schema.kautionen.organizationId, ctx.orgId)));

    if (!kaution) return res.status(404).json({ error: "Kaution nicht gefunden" });

    const bewegungen = await kautionService.getKautionHistory(kaution.id);
    res.json(objectToSnakeCase({ ...kaution, bewegungen }));
  } catch (error) {
    console.error("Error fetching kaution:", error);
    res.status(500).json({ error: "Fehler beim Laden der Kaution" });
  }
});

router.patch("/api/kautionen/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const body = objectToCamelCase(req.body);
    const { id, createdAt, updatedAt, ...updateData } = body;

    const [updated] = await db.update(schema.kautionen)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(eq(schema.kautionen.id, req.params.id), eq(schema.kautionen.organizationId, ctx.orgId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Kaution nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating kaution:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren der Kaution" });
  }
});

router.post("/api/kautionen/:id/zinsen", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const [kaution] = await db.select().from(schema.kautionen)
      .where(and(eq(schema.kautionen.id, req.params.id), eq(schema.kautionen.organizationId, ctx.orgId)));
    if (!kaution) return res.status(404).json({ error: "Kaution nicht gefunden" });

    const interest = await kautionService.calculateInterest(req.params.id);
    res.json({ interest, message: `Zinsen berechnet: € ${interest.toFixed(2)}` });
  } catch (error: any) {
    console.error("Error calculating interest:", error);
    res.status(400).json({ error: error.message || "Fehler bei der Zinsberechnung" });
  }
});

router.post("/api/kautionen/:id/rueckzahlung", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const [kaution] = await db.select().from(schema.kautionen)
      .where(and(eq(schema.kautionen.id, req.params.id), eq(schema.kautionen.organizationId, ctx.orgId)));
    if (!kaution) return res.status(404).json({ error: "Kaution nicht gefunden" });

    const body = objectToCamelCase(req.body);
    const result = await kautionService.initiateReturn(req.params.id, {
      rueckzahlungsdatum: body.rueckzahlungsdatum,
      einbehaltenBetrag: body.einbehaltenBetrag ? parseFloat(body.einbehaltenBetrag) : undefined,
      einbehaltenGrund: body.einbehaltenGrund,
    });
    res.json(objectToSnakeCase(result));
  } catch (error: any) {
    console.error("Error initiating return:", error);
    res.status(400).json({ error: error.message || "Fehler bei der Rückzahlung" });
  }
});

router.post("/api/kautionen/:id/abschluss", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const [kaution] = await db.select().from(schema.kautionen)
      .where(and(eq(schema.kautionen.id, req.params.id), eq(schema.kautionen.organizationId, ctx.orgId)));
    if (!kaution) return res.status(404).json({ error: "Kaution nicht gefunden" });

    const result = await kautionService.completeReturn(req.params.id);
    res.json(objectToSnakeCase(result));
  } catch (error: any) {
    console.error("Error completing return:", error);
    res.status(400).json({ error: error.message || "Fehler beim Abschluss" });
  }
});

router.get("/api/kautionen/:id/bewegungen", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const [kaution] = await db.select().from(schema.kautionen)
      .where(and(eq(schema.kautionen.id, req.params.id), eq(schema.kautionen.organizationId, ctx.orgId)));
    if (!kaution) return res.status(404).json({ error: "Kaution nicht gefunden" });

    const bewegungen = await kautionService.getKautionHistory(req.params.id);
    res.json(objectToSnakeCase(bewegungen));
  } catch (error) {
    console.error("Error fetching bewegungen:", error);
    res.status(500).json({ error: "Fehler beim Laden der Bewegungen" });
  }
});

export default router;
