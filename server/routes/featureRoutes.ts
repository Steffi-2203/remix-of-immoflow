import { Router, Request, Response } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "@shared/schema";

const router = Router();

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function objectToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(objectToSnakeCase);
  if (typeof obj !== 'object' || obj instanceof Date) return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[camelToSnake(key)] = objectToSnakeCase(value);
  }
  return result;
}

function snakeToCamelKey(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function objectToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(objectToCamelCase);
  if (typeof obj !== 'object' || obj instanceof Date) return obj;
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[snakeToCamelKey(key)] = objectToCamelCase(value);
  }
  return result;
}

async function getAuthContext(req: Request, res: Response) {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return null;
  }
  const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId)).limit(1);
  if (!profile.length) {
    res.status(403).json({ error: 'Profil nicht gefunden' });
    return null;
  }
  return { userId, orgId: profile[0].organizationId };
}

// ====== WEG ASSEMBLIES ======

router.get("/api/weg/assemblies", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    let conditions: any[] = [eq(schema.wegAssemblies.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.wegAssemblies.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.wegAssemblies).where(where).orderBy(desc(schema.wegAssemblies.assemblyDate));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching assemblies:", error);
    res.status(500).json({ error: "Fehler beim Laden der Versammlungen" });
  }
});

router.post("/api/weg/assemblies", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.wegAssemblies).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating assembly:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/weg/assemblies/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.wegAssemblies).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.wegAssemblies.id, req.params.id), eq(schema.wegAssemblies.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating assembly:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

// ====== WEG VOTES ======

router.get("/api/weg/votes", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const assemblyId = req.query.assemblyId as string;
    if (!assemblyId) return res.status(400).json({ error: "assemblyId erforderlich" });
    const assembly = await db.select().from(schema.wegAssemblies).where(and(eq(schema.wegAssemblies.id, assemblyId), eq(schema.wegAssemblies.organizationId, ctx.orgId))).limit(1);
    if (!assembly.length) return res.status(404).json({ error: "Versammlung nicht gefunden" });
    const data = await db.select().from(schema.wegVotes).where(eq(schema.wegVotes.assemblyId, assemblyId)).orderBy(schema.wegVotes.createdAt);
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching votes:", error);
    res.status(500).json({ error: "Fehler beim Laden der Abstimmungen" });
  }
});

router.post("/api/weg/votes", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const assembly = await db.select().from(schema.wegAssemblies).where(and(eq(schema.wegAssemblies.id, body.assemblyId), eq(schema.wegAssemblies.organizationId, ctx.orgId))).limit(1);
    if (!assembly.length) return res.status(404).json({ error: "Versammlung nicht gefunden" });
    const [created] = await db.insert(schema.wegVotes).values(body).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating vote:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

// ====== WEG RESERVE FUND ======

router.get("/api/weg/reserve-fund", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    let conditions: any[] = [eq(schema.wegReserveFund.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.wegReserveFund.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.wegReserveFund).where(where).orderBy(desc(schema.wegReserveFund.createdAt));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching reserve fund:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/weg/reserve-fund", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.wegReserveFund).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating reserve fund entry:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

// ====== WEG UNIT OWNERS (§ 2 WEG 2002 - Miteigentumsanteile) ======

router.get("/api/weg/unit-owners", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    let conditions: any[] = [eq(schema.wegUnitOwners.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.wegUnitOwners.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.wegUnitOwners).where(where).orderBy(schema.wegUnitOwners.createdAt);
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching unit owners:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/weg/unit-owners", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.wegUnitOwners).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating unit owner:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/weg/unit-owners/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.wegUnitOwners).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.wegUnitOwners.id, req.params.id), eq(schema.wegUnitOwners.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating unit owner:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

router.delete("/api/weg/unit-owners/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const [deleted] = await db.delete(schema.wegUnitOwners).where(and(eq(schema.wegUnitOwners.id, req.params.id), eq(schema.wegUnitOwners.organizationId, ctx.orgId))).returning();
    if (!deleted) return res.status(404).json({ error: "Nicht gefunden" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting unit owner:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== WEG AGENDA ITEMS (TOPs) ======

router.get("/api/weg/agenda-items", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const assemblyId = req.query.assemblyId as string;
    if (!assemblyId) return res.status(400).json({ error: "assemblyId erforderlich" });
    const assembly = await db.select().from(schema.wegAssemblies).where(and(eq(schema.wegAssemblies.id, assemblyId), eq(schema.wegAssemblies.organizationId, ctx.orgId))).limit(1);
    if (!assembly.length) return res.status(404).json({ error: "Versammlung nicht gefunden" });
    const data = await db.select().from(schema.wegAgendaItems).where(eq(schema.wegAgendaItems.assemblyId, assemblyId)).orderBy(schema.wegAgendaItems.topNumber);
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching agenda items:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/weg/agenda-items", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const assembly = await db.select().from(schema.wegAssemblies).where(and(eq(schema.wegAssemblies.id, body.assemblyId), eq(schema.wegAssemblies.organizationId, ctx.orgId))).limit(1);
    if (!assembly.length) return res.status(404).json({ error: "Versammlung nicht gefunden" });
    const [created] = await db.insert(schema.wegAgendaItems).values(body).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating agenda item:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.delete("/api/weg/agenda-items/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const item = await db.select().from(schema.wegAgendaItems).where(eq(schema.wegAgendaItems.id, req.params.id)).limit(1);
    if (!item.length) return res.status(404).json({ error: "Nicht gefunden" });
    const assembly = await db.select().from(schema.wegAssemblies).where(and(eq(schema.wegAssemblies.id, item[0].assemblyId), eq(schema.wegAssemblies.organizationId, ctx.orgId))).limit(1);
    if (!assembly.length) return res.status(403).json({ error: "Zugriff verweigert" });
    const [deleted] = await db.delete(schema.wegAgendaItems).where(eq(schema.wegAgendaItems.id, req.params.id)).returning();
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting agenda item:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== WEG OWNER VOTES (per-owner vote recording) ======

router.get("/api/weg/owner-votes", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const voteId = req.query.voteId as string;
    if (!voteId) return res.status(400).json({ error: "voteId erforderlich" });
    const vote = await db.select().from(schema.wegVotes).where(eq(schema.wegVotes.id, voteId)).limit(1);
    if (!vote.length) return res.status(404).json({ error: "Abstimmung nicht gefunden" });
    const assembly = await db.select().from(schema.wegAssemblies).where(and(eq(schema.wegAssemblies.id, vote[0].assemblyId), eq(schema.wegAssemblies.organizationId, ctx.orgId))).limit(1);
    if (!assembly.length) return res.status(403).json({ error: "Zugriff verweigert" });
    const data = await db.select().from(schema.wegOwnerVotes).where(eq(schema.wegOwnerVotes.voteId, voteId)).orderBy(schema.wegOwnerVotes.createdAt);
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching owner votes:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/weg/owner-votes", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const vote = await db.select().from(schema.wegVotes).where(eq(schema.wegVotes.id, body.voteId)).limit(1);
    if (!vote.length) return res.status(404).json({ error: "Abstimmung nicht gefunden" });
    const assembly = await db.select().from(schema.wegAssemblies).where(and(eq(schema.wegAssemblies.id, vote[0].assemblyId), eq(schema.wegAssemblies.organizationId, ctx.orgId))).limit(1);
    if (!assembly.length) return res.status(403).json({ error: "Zugriff verweigert" });
    const [created] = await db.insert(schema.wegOwnerVotes).values(body).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating owner vote:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

// ====== WEG BUDGET PLANS (Wirtschaftsplan § 31 WEG 2002) ======

router.get("/api/weg/budget-plans", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    let conditions: any[] = [eq(schema.wegBudgetPlans.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.wegBudgetPlans.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.wegBudgetPlans).where(where).orderBy(desc(schema.wegBudgetPlans.year));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching budget plans:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/weg/budget-plans", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.wegBudgetPlans).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating budget plan:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/weg/budget-plans/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.wegBudgetPlans).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.wegBudgetPlans.id, req.params.id), eq(schema.wegBudgetPlans.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating budget plan:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

// ====== WEG BUDGET LINES ======

router.get("/api/weg/budget-lines", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const budgetPlanId = req.query.budgetPlanId as string;
    if (!budgetPlanId) return res.status(400).json({ error: "budgetPlanId erforderlich" });
    const plan = await db.select().from(schema.wegBudgetPlans).where(and(eq(schema.wegBudgetPlans.id, budgetPlanId), eq(schema.wegBudgetPlans.organizationId, ctx.orgId))).limit(1);
    if (!plan.length) return res.status(403).json({ error: "Zugriff verweigert" });
    const data = await db.select().from(schema.wegBudgetLines).where(eq(schema.wegBudgetLines.budgetPlanId, budgetPlanId)).orderBy(schema.wegBudgetLines.createdAt);
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching budget lines:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/weg/budget-lines", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const plan = await db.select().from(schema.wegBudgetPlans).where(and(eq(schema.wegBudgetPlans.id, body.budgetPlanId), eq(schema.wegBudgetPlans.organizationId, ctx.orgId))).limit(1);
    if (!plan.length) return res.status(403).json({ error: "Zugriff verweigert" });
    const [created] = await db.insert(schema.wegBudgetLines).values(body).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating budget line:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.delete("/api/weg/budget-lines/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const line = await db.select().from(schema.wegBudgetLines).where(eq(schema.wegBudgetLines.id, req.params.id)).limit(1);
    if (!line.length) return res.status(404).json({ error: "Nicht gefunden" });
    const plan = await db.select().from(schema.wegBudgetPlans).where(and(eq(schema.wegBudgetPlans.id, line[0].budgetPlanId), eq(schema.wegBudgetPlans.organizationId, ctx.orgId))).limit(1);
    if (!plan.length) return res.status(403).json({ error: "Zugriff verweigert" });
    const [deleted] = await db.delete(schema.wegBudgetLines).where(eq(schema.wegBudgetLines.id, req.params.id)).returning();
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget line:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== WEG SPECIAL ASSESSMENTS (Sonderumlagen) ======

router.get("/api/weg/special-assessments", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    let conditions: any[] = [eq(schema.wegSpecialAssessments.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.wegSpecialAssessments.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.wegSpecialAssessments).where(where).orderBy(desc(schema.wegSpecialAssessments.createdAt));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching special assessments:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/weg/special-assessments", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.wegSpecialAssessments).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating special assessment:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/weg/special-assessments/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.wegSpecialAssessments).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.wegSpecialAssessments.id, req.params.id), eq(schema.wegSpecialAssessments.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating special assessment:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

// ====== WEG MAINTENANCE ITEMS (§ 28-29 WEG 2002) ======

router.get("/api/weg/maintenance", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    let conditions: any[] = [eq(schema.wegMaintenanceItems.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.wegMaintenanceItems.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.wegMaintenanceItems).where(where).orderBy(desc(schema.wegMaintenanceItems.createdAt));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching maintenance items:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/weg/maintenance", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.wegMaintenanceItems).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating maintenance item:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/weg/maintenance/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.wegMaintenanceItems).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.wegMaintenanceItems.id, req.params.id), eq(schema.wegMaintenanceItems.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating maintenance item:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

router.delete("/api/weg/maintenance/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const [deleted] = await db.delete(schema.wegMaintenanceItems).where(and(eq(schema.wegMaintenanceItems.id, req.params.id), eq(schema.wegMaintenanceItems.organizationId, ctx.orgId))).returning();
    if (!deleted) return res.status(404).json({ error: "Nicht gefunden" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting maintenance item:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== INSURANCE POLICIES ======

router.get("/api/insurance/policies", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    let conditions: any[] = [eq(schema.insurancePolicies.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.insurancePolicies.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.insurancePolicies).where(where).orderBy(schema.insurancePolicies.endDate);
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching policies:", error);
    res.status(500).json({ error: "Fehler beim Laden der Versicherungen" });
  }
});

router.post("/api/insurance/policies", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.insurancePolicies).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating policy:", error);
    res.status(500).json({ error: "Fehler beim Anlegen" });
  }
});

router.delete("/api/insurance/policies/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    await db.delete(schema.insurancePolicies).where(and(eq(schema.insurancePolicies.id, req.params.id), eq(schema.insurancePolicies.organizationId, ctx.orgId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting policy:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== INSURANCE CLAIMS ======

router.get("/api/insurance/claims", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db.select().from(schema.insuranceClaims).where(eq(schema.insuranceClaims.organizationId, ctx.orgId)).orderBy(desc(schema.insuranceClaims.claimDate));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching claims:", error);
    res.status(500).json({ error: "Fehler beim Laden der Schadensmeldungen" });
  }
});

router.post("/api/insurance/claims", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.insuranceClaims).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating claim:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/insurance/claims/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.insuranceClaims).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.insuranceClaims.id, req.params.id), eq(schema.insuranceClaims.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating claim:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

// ====== DEADLINES ======

router.get("/api/deadlines", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    const status = req.query.status as string;
    const category = req.query.category as string;
    let conditions: any[] = [eq(schema.deadlines.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.deadlines.propertyId, propertyId));
    if (status) conditions.push(eq(schema.deadlines.status, status));
    if (category) conditions.push(eq(schema.deadlines.category, category));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.deadlines).where(where).orderBy(schema.deadlines.deadlineDate);
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching deadlines:", error);
    res.status(500).json({ error: "Fehler beim Laden der Fristen" });
  }
});

router.post("/api/deadlines", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.deadlines).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating deadline:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/deadlines/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.deadlines).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.deadlines.id, req.params.id), eq(schema.deadlines.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating deadline:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

router.delete("/api/deadlines/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    await db.delete(schema.deadlines).where(and(eq(schema.deadlines.id, req.params.id), eq(schema.deadlines.organizationId, ctx.orgId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting deadline:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== LETTER TEMPLATES ======

router.get("/api/letter-templates", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db.select().from(schema.letterTemplates).where(eq(schema.letterTemplates.organizationId, ctx.orgId)).orderBy(schema.letterTemplates.category);
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching letter templates:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/letter-templates", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.letterTemplates).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating letter template:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/letter-templates/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.letterTemplates).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.letterTemplates.id, req.params.id), eq(schema.letterTemplates.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating letter template:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

router.delete("/api/letter-templates/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    await db.delete(schema.letterTemplates).where(and(eq(schema.letterTemplates.id, req.params.id), eq(schema.letterTemplates.organizationId, ctx.orgId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting letter template:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== SERIAL LETTERS ======

router.get("/api/serial-letters", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db.select().from(schema.serialLetters).where(eq(schema.serialLetters.organizationId, ctx.orgId)).orderBy(desc(schema.serialLetters.createdAt));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching serial letters:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/serial-letters", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.serialLetters).values({ ...body, organizationId: ctx.orgId, createdBy: ctx.userId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating serial letter:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

// ====== MANAGEMENT CONTRACTS ======

router.get("/api/management-contracts", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db.select().from(schema.managementContracts).where(eq(schema.managementContracts.organizationId, ctx.orgId)).orderBy(desc(schema.managementContracts.createdAt));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching management contracts:", error);
    res.status(500).json({ error: "Fehler beim Laden der Verträge" });
  }
});

router.post("/api/management-contracts", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.managementContracts).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating management contract:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/management-contracts/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [updated] = await db.update(schema.managementContracts).set({ ...body, updatedAt: new Date() }).where(and(eq(schema.managementContracts.id, req.params.id), eq(schema.managementContracts.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating management contract:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

router.delete("/api/management-contracts/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    await db.delete(schema.managementContracts).where(and(eq(schema.managementContracts.id, req.params.id), eq(schema.managementContracts.organizationId, ctx.orgId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting management contract:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

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
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    await db.delete(schema.ownerPayouts).where(and(eq(schema.ownerPayouts.id, req.params.id), eq(schema.ownerPayouts.organizationId, ctx.orgId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting owner payout:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== USER ORGANIZATIONS ======

router.get("/api/user-organizations", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    const data = await db.select().from(schema.userOrganizations).where(eq(schema.userOrganizations.userId, ctx.userId));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching user organizations:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/user-organizations/switch", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    const body = objectToCamelCase(req.body);
    const { organizationId } = body;
    if (!organizationId) return res.status(400).json({ error: "organizationId erforderlich" });
    const membership = await db.select().from(schema.userOrganizations).where(and(eq(schema.userOrganizations.userId, ctx.userId), eq(schema.userOrganizations.organizationId, organizationId))).limit(1);
    if (!membership.length) return res.status(403).json({ error: "Keine Berechtigung für diese Organisation" });
    await db.update(schema.userOrganizations).set({ isDefault: false }).where(eq(schema.userOrganizations.userId, ctx.userId));
    await db.update(schema.userOrganizations).set({ isDefault: true }).where(and(eq(schema.userOrganizations.userId, ctx.userId), eq(schema.userOrganizations.organizationId, organizationId)));
    await db.update(schema.profiles).set({ organizationId }).where(eq(schema.profiles.id, ctx.userId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error switching organization:", error);
    res.status(500).json({ error: "Fehler beim Wechseln" });
  }
});

export default router;
