import { Router, Request, Response } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "@shared/schema";
import { getAuthContext, checkMutationPermission, objectToSnakeCase, objectToCamelCase } from "./helpers";

const router = Router();

// ====== HEATING COST READINGS ======

router.get("/api/heating-cost-readings", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    let conditions: any[] = [eq(schema.heatingCostReadings.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.heatingCostReadings.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.heatingCostReadings).where(where).orderBy(desc(schema.heatingCostReadings.periodFrom));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching heating cost readings:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/heating-cost-readings", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    if (Array.isArray(req.body)) {
      const values = req.body.map((r: any) => ({ ...objectToCamelCase(r), organizationId: ctx.orgId }));
      const created = await db.insert(schema.heatingCostReadings).values(values).returning();
      return res.json(objectToSnakeCase(created));
    }
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.heatingCostReadings).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating heating cost reading:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/heating-cost-readings/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.heatingCostReadings).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.heatingCostReadings.id, req.params.id), eq(schema.heatingCostReadings.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating heating cost reading:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

router.delete("/api/heating-cost-readings/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    await db.delete(schema.heatingCostReadings).where(and(eq(schema.heatingCostReadings.id, req.params.id), eq(schema.heatingCostReadings.organizationId, ctx.orgId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting heating cost reading:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== OWNER PAYOUTS ======

router.get("/api/owner-payouts", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    let conditions: any[] = [eq(schema.ownerPayouts.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.ownerPayouts.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.ownerPayouts).where(where).orderBy(desc(schema.ownerPayouts.createdAt));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching owner payouts:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/owner-payouts", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.ownerPayouts).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating owner payout:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/owner-payouts/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.ownerPayouts).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.ownerPayouts.id, req.params.id), eq(schema.ownerPayouts.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating owner payout:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

router.delete("/api/owner-payouts/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    await db.delete(schema.ownerPayouts).where(and(eq(schema.ownerPayouts.id, req.params.id), eq(schema.ownerPayouts.organizationId, ctx.orgId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting owner payout:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== SEPA COLLECTIONS ======

router.get("/api/sepa-collections", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db.select().from(schema.sepaCollections).where(eq(schema.sepaCollections.organizationId, ctx.orgId)).orderBy(desc(schema.sepaCollections.createdAt));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching SEPA collections:", error);
    res.status(500).json({ error: "Fehler beim Laden der SEPA-Einzüge" });
  }
});

router.get("/api/sepa-collections/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db.select().from(schema.sepaCollections).where(and(eq(schema.sepaCollections.id, req.params.id), eq(schema.sepaCollections.organizationId, ctx.orgId))).limit(1);
    if (!data.length) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(data[0]));
  } catch (error) {
    console.error("Error fetching SEPA collection:", error);
    res.status(500).json({ error: "Fehler beim Laden des SEPA-Einzugs" });
  }
});

router.post("/api/sepa-collections", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.sepaCollections).values({ ...body, organizationId: ctx.orgId, createdBy: ctx.userId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating SEPA collection:", error);
    res.status(500).json({ error: "Fehler beim Erstellen des SEPA-Einzugs" });
  }
});

router.patch("/api/sepa-collections/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.sepaCollections).set({ status: body.status }).where(and(eq(schema.sepaCollections.id, req.params.id), eq(schema.sepaCollections.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating SEPA collection:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren des SEPA-Einzugs" });
  }
});

router.post("/api/sepa-collections/:id/mark-all-successful", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const [updated] = await db.update(schema.sepaCollections).set({ status: 'completed' }).where(and(eq(schema.sepaCollections.id, req.params.id), eq(schema.sepaCollections.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error marking SEPA collection as successful:", error);
    res.status(500).json({ error: "Fehler beim Markieren des SEPA-Einzugs als erfolgreich" });
  }
});

router.delete("/api/sepa-collections/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const [deleted] = await db.delete(schema.sepaCollections).where(and(eq(schema.sepaCollections.id, req.params.id), eq(schema.sepaCollections.organizationId, ctx.orgId))).returning();
    if (!deleted) return res.status(404).json({ error: "Nicht gefunden" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting SEPA collection:", error);
    res.status(500).json({ error: "Fehler beim Löschen des SEPA-Einzugs" });
  }
});

// ====== PROPERTY OWNERS ======

router.get("/api/property-owners", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.property_id as string;
    let conditions: any[] = [eq(schema.properties.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.propertyOwners.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db
      .select({ propertyOwners: schema.propertyOwners })
      .from(schema.propertyOwners)
      .innerJoin(schema.properties, eq(schema.propertyOwners.propertyId, schema.properties.id))
      .where(where)
      .orderBy(desc(schema.propertyOwners.createdAt));
    res.json(objectToSnakeCase(data.map(d => d.propertyOwners)));
  } catch (error) {
    console.error("Error fetching property owners:", error);
    res.status(500).json({ error: "Fehler beim Laden der Eigentümerzuordnungen" });
  }
});

router.get("/api/property-owners/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db
      .select({ propertyOwners: schema.propertyOwners })
      .from(schema.propertyOwners)
      .innerJoin(schema.properties, eq(schema.propertyOwners.propertyId, schema.properties.id))
      .where(and(eq(schema.propertyOwners.id, req.params.id), eq(schema.properties.organizationId, ctx.orgId)))
      .limit(1);
    if (!data.length) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(data[0].propertyOwners));
  } catch (error) {
    console.error("Error fetching property owner:", error);
    res.status(500).json({ error: "Fehler beim Laden der Eigentümerzuordnung" });
  }
});

router.post("/api/property-owners", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const parsed = schema.insertPropertyOwnerSchema.parse(body);
    const property = await db.select().from(schema.properties).where(and(eq(schema.properties.id, parsed.propertyId), eq(schema.properties.organizationId, ctx.orgId))).limit(1);
    if (!property.length) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });
    const [created] = await db.insert(schema.propertyOwners).values(parsed).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating property owner:", error);
    res.status(500).json({ error: "Fehler beim Erstellen der Eigentümerzuordnung" });
  }
});

router.patch("/api/property-owners/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const existing = await db
      .select({ propertyOwners: schema.propertyOwners })
      .from(schema.propertyOwners)
      .innerJoin(schema.properties, eq(schema.propertyOwners.propertyId, schema.properties.id))
      .where(and(eq(schema.propertyOwners.id, req.params.id), eq(schema.properties.organizationId, ctx.orgId)))
      .limit(1);
    if (!existing.length) return res.status(404).json({ error: "Nicht gefunden" });
    const updateData: any = {};
    if (body.ownershipShare !== undefined) updateData.ownershipShare = body.ownershipShare;
    if (body.validFrom !== undefined) updateData.validFrom = body.validFrom;
    if (body.validTo !== undefined) updateData.validTo = body.validTo;
    if (body.notes !== undefined) updateData.notes = body.notes;
    const [updated] = await db.update(schema.propertyOwners).set(updateData).where(eq(schema.propertyOwners.id, req.params.id)).returning();
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating property owner:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren der Eigentümerzuordnung" });
  }
});

router.delete("/api/property-owners/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const existing = await db
      .select({ propertyOwners: schema.propertyOwners })
      .from(schema.propertyOwners)
      .innerJoin(schema.properties, eq(schema.propertyOwners.propertyId, schema.properties.id))
      .where(and(eq(schema.propertyOwners.id, req.params.id), eq(schema.properties.organizationId, ctx.orgId)))
      .limit(1);
    if (!existing.length) return res.status(404).json({ error: "Nicht gefunden" });
    await db.delete(schema.propertyOwners).where(eq(schema.propertyOwners.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting property owner:", error);
    res.status(500).json({ error: "Fehler beim Löschen der Eigentümerzuordnung" });
  }
});

// ====== VPI ADJUSTMENTS ======

router.get("/api/vpi-adjustments", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db
      .select({ vpiAdjustments: schema.vpiAdjustments })
      .from(schema.vpiAdjustments)
      .innerJoin(schema.tenants, eq(schema.vpiAdjustments.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(eq(schema.properties.organizationId, ctx.orgId))
      .orderBy(desc(schema.vpiAdjustments.adjustmentDate));
    res.json(objectToSnakeCase(data.map(d => d.vpiAdjustments)));
  } catch (error) {
    console.error("Error fetching VPI adjustments:", error);
    res.status(500).json({ error: "Fehler beim Laden der VPI-Anpassungen" });
  }
});

router.get("/api/vpi-adjustments/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db
      .select({ vpiAdjustments: schema.vpiAdjustments })
      .from(schema.vpiAdjustments)
      .innerJoin(schema.tenants, eq(schema.vpiAdjustments.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(eq(schema.vpiAdjustments.id, req.params.id), eq(schema.properties.organizationId, ctx.orgId)))
      .limit(1);
    if (!data.length) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(data[0].vpiAdjustments));
  } catch (error) {
    console.error("Error fetching VPI adjustment:", error);
    res.status(500).json({ error: "Fehler beim Laden der VPI-Anpassung" });
  }
});

router.post("/api/vpi-adjustments", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const parsed = schema.insertVpiAdjustmentSchema.parse(body);
    const tenant = await db
      .select()
      .from(schema.tenants)
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(eq(schema.tenants.id, parsed.tenantId), eq(schema.properties.organizationId, ctx.orgId)))
      .limit(1);
    if (!tenant.length) return res.status(404).json({ error: "Mieter nicht gefunden" });
    const [created] = await db.insert(schema.vpiAdjustments).values(parsed).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating VPI adjustment:", error);
    res.status(500).json({ error: "Fehler beim Erstellen der VPI-Anpassung" });
  }
});

router.patch("/api/vpi-adjustments/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const existing = await db
      .select({ vpiAdjustments: schema.vpiAdjustments })
      .from(schema.vpiAdjustments)
      .innerJoin(schema.tenants, eq(schema.vpiAdjustments.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(eq(schema.vpiAdjustments.id, req.params.id), eq(schema.properties.organizationId, ctx.orgId)))
      .limit(1);
    if (!existing.length) return res.status(404).json({ error: "Nicht gefunden" });
    const [updated] = await db.update(schema.vpiAdjustments).set(body).where(eq(schema.vpiAdjustments.id, req.params.id)).returning();
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating VPI adjustment:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren der VPI-Anpassung" });
  }
});

router.post("/api/vpi-adjustments/:id/apply", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const existing = await db
      .select({ vpiAdjustments: schema.vpiAdjustments })
      .from(schema.vpiAdjustments)
      .innerJoin(schema.tenants, eq(schema.vpiAdjustments.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(eq(schema.vpiAdjustments.id, req.params.id), eq(schema.properties.organizationId, ctx.orgId)))
      .limit(1);
    if (!existing.length) return res.status(404).json({ error: "Nicht gefunden" });
    const today = new Date().toISOString().split('T')[0];
    const [updated] = await db.update(schema.vpiAdjustments).set({ notificationSent: true, notificationDate: today }).where(eq(schema.vpiAdjustments.id, req.params.id)).returning();
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error applying VPI adjustment:", error);
    res.status(500).json({ error: "Fehler beim Anwenden der VPI-Anpassung" });
  }
});

router.delete("/api/vpi-adjustments/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const existing = await db
      .select({ vpiAdjustments: schema.vpiAdjustments })
      .from(schema.vpiAdjustments)
      .innerJoin(schema.tenants, eq(schema.vpiAdjustments.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(eq(schema.vpiAdjustments.id, req.params.id), eq(schema.properties.organizationId, ctx.orgId)))
      .limit(1);
    if (!existing.length) return res.status(404).json({ error: "Nicht gefunden" });
    await db.delete(schema.vpiAdjustments).where(eq(schema.vpiAdjustments.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting VPI adjustment:", error);
    res.status(500).json({ error: "Fehler beim Löschen der VPI-Anpassung" });
  }
});

export default router;
