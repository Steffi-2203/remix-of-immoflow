import { Router, Request, Response } from "express";
import { db } from "../db";
import { eq, and, desc, inArray, gte, gt, lte, sql, sum, isNull, or, ne } from "drizzle-orm";
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

// ====== WEG WIRTSCHAFTSPLAN PREVIEW & ACTIVATION ======

router.get("/api/weg/budget-plans/:id/preview", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const plan = await db.select().from(schema.wegBudgetPlans).where(and(eq(schema.wegBudgetPlans.id, req.params.id), eq(schema.wegBudgetPlans.organizationId, ctx.orgId))).limit(1);
    if (!plan.length) return res.status(404).json({ error: "Wirtschaftsplan nicht gefunden" });
    const bp = plan[0];

    const lines = await db.select().from(schema.wegBudgetLines).where(eq(schema.wegBudgetLines.budgetPlanId, bp.id));

    const unitOwners = await db.select().from(schema.wegUnitOwners).where(and(eq(schema.wegUnitOwners.propertyId, bp.propertyId), eq(schema.wegUnitOwners.organizationId, ctx.orgId)));
    if (!unitOwners.length) return res.status(400).json({ error: "Keine Eigentümer für diese Liegenschaft hinterlegt" });

    const unitIds = [...new Set(unitOwners.map(uo => uo.unitId))];
    const ownerIds = [...new Set(unitOwners.map(uo => uo.ownerId))];

    const unitsData = await db.select().from(schema.units).where(eq(schema.units.propertyId, bp.propertyId));
    const ownersData = ownerIds.length > 0 ? await Promise.all(ownerIds.map(async (oid) => {
      const [o] = await db.select().from(schema.owners).where(eq(schema.owners.id, oid));
      return o;
    })) : [];

    const totalMea = unitOwners.reduce((s, uo) => s + parseFloat(String(uo.meaShare || '0')), 0);
    if (totalMea <= 0) return res.status(400).json({ error: "Gesamt-MEA ist 0, bitte Anteile pflegen" });

    const distributions: any[] = [];

    for (const uo of unitOwners) {
      const meaShare = parseFloat(String(uo.meaShare || '0'));
      const ratio = meaShare / totalMea;
      const unit = unitsData.find(u => u.id === uo.unitId);
      const owner = ownersData.find(o => o && o.id === uo.ownerId);
      const unitType = unit?.type || 'wohnung';

      let bkNetto = 0;
      let hkNetto = 0;
      let sonstigesNetto = 0;
      let ruecklage = 0;
      let verwaltung = 0;

      for (const line of lines) {
        const lineAmount = parseFloat(String(line.amount || '0'));
        const ownerShare = lineAmount * ratio;
        const cat = (line.category || '').toLowerCase();

        if (cat.includes('rücklage') || cat.includes('ruecklage') || cat.includes('rucklage')) {
          ruecklage += ownerShare;
        } else if (cat.includes('heiz') || cat.includes('wärme') || cat.includes('waerme')) {
          hkNetto += ownerShare;
        } else if (cat.includes('verwaltung') || cat.includes('honorar')) {
          verwaltung += ownerShare;
        } else if (cat.includes('betriebskosten') || cat.includes('wasser') || cat.includes('kanal') || cat.includes('müll') || cat.includes('muell') || cat.includes('versicherung') || cat.includes('hausbetreuung') || cat.includes('strom') || cat.includes('lift') || cat.includes('garten')) {
          bkNetto += ownerShare;
        } else {
          sonstigesNetto += ownerShare;
        }
      }

      const mgmtFee = parseFloat(String(bp.managementFee || '0')) * ratio;
      verwaltung += mgmtFee;

      const reserveContrib = parseFloat(String(bp.reserveContribution || '0')) * ratio;
      ruecklage += reserveContrib;

      const bkUstRate = (unitType === 'geschaeft' || unitType === 'garage') ? 20 : 10;
      const hkUstRate = 20;
      const verwUstRate = 20;

      const bkUst = bkNetto * bkUstRate / 100;
      const hkUst = hkNetto * hkUstRate / 100;
      const verwUst = verwaltung * verwUstRate / 100;
      const sonstigesUst = sonstigesNetto * 10 / 100;

      const jahresTotal = bkNetto + bkUst + hkNetto + hkUst + ruecklage + verwaltung + verwUst + sonstigesNetto + sonstigesUst;
      const monatsTotal = jahresTotal / 12;

      distributions.push({
        unit_owner_id: uo.id,
        unit_id: uo.unitId,
        owner_id: uo.ownerId,
        unit_top: unit?.topNummer || '',
        unit_type: unitType,
        owner_name: owner ? `${owner.firstName} ${owner.lastName}` : 'Unbekannt',
        owner_email: owner?.email || null,
        mea_share: meaShare,
        mea_ratio: ratio,
        bk_netto_jahr: Math.round(bkNetto * 100) / 100,
        bk_ust_rate: bkUstRate,
        bk_ust_jahr: Math.round(bkUst * 100) / 100,
        hk_netto_jahr: Math.round(hkNetto * 100) / 100,
        hk_ust_rate: hkUstRate,
        hk_ust_jahr: Math.round(hkUst * 100) / 100,
        ruecklage_jahr: Math.round(ruecklage * 100) / 100,
        verwaltung_netto_jahr: Math.round(verwaltung * 100) / 100,
        verwaltung_ust_jahr: Math.round(verwUst * 100) / 100,
        sonstiges_netto_jahr: Math.round(sonstigesNetto * 100) / 100,
        sonstiges_ust_jahr: Math.round(sonstigesUst * 100) / 100,
        jahres_total: Math.round(jahresTotal * 100) / 100,
        monats_total: Math.round(monatsTotal * 100) / 100,
      });
    }

    res.json({ plan: objectToSnakeCase(bp), distributions, total_mea: totalMea });
  } catch (error) {
    console.error("Error previewing budget plan:", error);
    res.status(500).json({ error: "Fehler bei der Vorschau" });
  }
});

router.post("/api/weg/budget-plans/:id/activate", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const plan = await db.select().from(schema.wegBudgetPlans).where(and(eq(schema.wegBudgetPlans.id, req.params.id), eq(schema.wegBudgetPlans.organizationId, ctx.orgId))).limit(1);
    if (!plan.length) return res.status(404).json({ error: "Wirtschaftsplan nicht gefunden" });
    const bp = plan[0];

    if (bp.status !== 'beschlossen') {
      return res.status(400).json({ error: "Wirtschaftsplan muss erst von der Eigentümerversammlung beschlossen werden (Status: beschlossen)" });
    }

    const existingInvoices = await db.select({ id: schema.monthlyInvoices.id }).from(schema.monthlyInvoices).where(eq(schema.monthlyInvoices.wegBudgetPlanId, bp.id)).limit(1);
    if (existingInvoices.length > 0) {
      return res.status(409).json({ error: "Für diesen Wirtschaftsplan wurden bereits Vorschreibungen generiert" });
    }

    const lines = await db.select().from(schema.wegBudgetLines).where(eq(schema.wegBudgetLines.budgetPlanId, bp.id));
    const unitOwners = await db.select().from(schema.wegUnitOwners).where(and(eq(schema.wegUnitOwners.propertyId, bp.propertyId), eq(schema.wegUnitOwners.organizationId, ctx.orgId)));

    if (!unitOwners.length) return res.status(400).json({ error: "Keine Eigentümer hinterlegt" });

    const unitsData = await db.select().from(schema.units).where(eq(schema.units.propertyId, bp.propertyId));
    const totalMea = unitOwners.reduce((s, uo) => s + parseFloat(String(uo.meaShare || '0')), 0);
    if (totalMea <= 0) return res.status(400).json({ error: "Gesamt-MEA ist 0" });

    const dueDay = bp.dueDay || 5;
    const year = bp.year;
    const createdInvoices: any[] = [];

    for (const uo of unitOwners) {
      const meaShare = parseFloat(String(uo.meaShare || '0'));
      const ratio = meaShare / totalMea;
      const unit = unitsData.find(u => u.id === uo.unitId);
      const unitType = unit?.type || 'wohnung';

      let bkNetto = 0;
      let hkNetto = 0;
      let sonstigesNetto = 0;
      let ruecklage = 0;
      let verwaltung = 0;

      for (const line of lines) {
        const lineAmount = parseFloat(String(line.amount || '0'));
        const ownerShare = lineAmount * ratio;
        const cat = (line.category || '').toLowerCase();

        if (cat.includes('rücklage') || cat.includes('ruecklage') || cat.includes('rucklage')) {
          ruecklage += ownerShare;
        } else if (cat.includes('heiz') || cat.includes('wärme') || cat.includes('waerme')) {
          hkNetto += ownerShare;
        } else if (cat.includes('verwaltung') || cat.includes('honorar')) {
          verwaltung += ownerShare;
        } else if (cat.includes('betriebskosten') || cat.includes('wasser') || cat.includes('kanal') || cat.includes('müll') || cat.includes('muell') || cat.includes('versicherung') || cat.includes('hausbetreuung') || cat.includes('strom') || cat.includes('lift') || cat.includes('garten')) {
          bkNetto += ownerShare;
        } else {
          sonstigesNetto += ownerShare;
        }
      }

      const mgmtFee = parseFloat(String(bp.managementFee || '0')) * ratio;
      verwaltung += mgmtFee;
      const reserveContrib = parseFloat(String(bp.reserveContribution || '0')) * ratio;
      ruecklage += reserveContrib;

      const bkUstRate = (unitType === 'geschaeft' || unitType === 'garage') ? 20 : 10;
      const hkUstRate = 20;

      const bkMonat = Math.round(bkNetto / 12 * 100) / 100;
      const hkMonat = Math.round(hkNetto / 12 * 100) / 100;
      const ruecklageMonat = Math.round(ruecklage / 12 * 100) / 100;
      const verwMonat = Math.round(verwaltung / 12 * 100) / 100;
      const sonstigesMonat = Math.round(sonstigesNetto / 12 * 100) / 100;

      const bkUstMonat = Math.round(bkMonat * bkUstRate / 100 * 100) / 100;
      const hkUstMonat = Math.round(hkMonat * hkUstRate / 100 * 100) / 100;
      const verwUstMonat = Math.round(verwMonat * 20 / 100 * 100) / 100;
      const sonstigesUstMonat = Math.round(sonstigesMonat * 10 / 100 * 100) / 100;

      const totalUstMonat = bkUstMonat + hkUstMonat + verwUstMonat + sonstigesUstMonat;
      const gesamtMonat = bkMonat + bkUstMonat + hkMonat + hkUstMonat + ruecklageMonat + verwMonat + verwUstMonat + sonstigesMonat + sonstigesUstMonat;

      for (let month = 1; month <= 12; month++) {
        const faelligAm = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

        const [invoice] = await db.insert(schema.monthlyInvoices).values({
          unitId: uo.unitId,
          tenantId: null,
          year,
          month,
          grundmiete: '0',
          betriebskosten: String(bkMonat + sonstigesMonat + verwMonat),
          heizungskosten: String(hkMonat),
          wasserkosten: '0',
          ustSatzBk: bkUstRate,
          ustSatzHeizung: hkUstRate,
          ustSatzMiete: 0,
          ustSatzWasser: 0,
          ust: String(totalUstMonat),
          gesamtbetrag: String(Math.round(gesamtMonat * 100) / 100),
          status: 'offen',
          faelligAm,
          isVacancy: false,
          wegBudgetPlanId: bp.id,
          ownerId: uo.ownerId,
        }).returning();

        createdInvoices.push(invoice);
      }
    }

    await db.update(schema.wegBudgetPlans).set({
      status: 'aktiv',
      activatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(schema.wegBudgetPlans.id, bp.id));

    res.json({
      success: true,
      message: `${createdInvoices.length} Vorschreibungen für ${unitOwners.length} Eigentümer generiert`,
      invoices_count: createdInvoices.length,
      owners_count: unitOwners.length,
    });
  } catch (error) {
    console.error("Error activating budget plan:", error);
    res.status(500).json({ error: "Fehler beim Aktivieren" });
  }
});

router.get("/api/weg/budget-plans/:id/vorschreibungen", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const plan = await db.select().from(schema.wegBudgetPlans).where(and(eq(schema.wegBudgetPlans.id, req.params.id), eq(schema.wegBudgetPlans.organizationId, ctx.orgId))).limit(1);
    if (!plan.length) return res.status(404).json({ error: "Nicht gefunden" });

    const invoices = await db.select().from(schema.monthlyInvoices).where(eq(schema.monthlyInvoices.wegBudgetPlanId, req.params.id)).orderBy(schema.monthlyInvoices.month);

    const ownerIds = [...new Set(invoices.filter(i => i.ownerId).map(i => i.ownerId!))];
    const unitIds = [...new Set(invoices.map(i => i.unitId))];

    const ownersMap: Record<string, any> = {};
    if (ownerIds.length > 0) {
      const owners = await db.select().from(schema.owners).where(inArray(schema.owners.id, ownerIds));
      for (const o of owners) ownersMap[o.id] = o;
    }
    const unitsMap: Record<string, any> = {};
    if (unitIds.length > 0) {
      const propertyId = plan[0].propertyId;
      const units = await db.select().from(schema.units).where(and(inArray(schema.units.id, unitIds), eq(schema.units.propertyId, propertyId)));
      for (const u of units) unitsMap[u.id] = u;
    }

    const enriched = invoices.map(inv => ({
      ...objectToSnakeCase(inv),
      owner_name: inv.ownerId && ownersMap[inv.ownerId] ? `${ownersMap[inv.ownerId].firstName} ${ownersMap[inv.ownerId].lastName}` : null,
      unit_top: unitsMap[inv.unitId]?.topNummer || null,
      unit_type: unitsMap[inv.unitId]?.type || null,
    }));

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching Vorschreibungen:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
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

// ====== WEG EIGENTÜMERWECHSEL (OWNER CHANGE - § 38 WEG 2002) ======

router.get("/api/weg/owner-changes", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const propertyId = req.query.propertyId as string;
    let conditions: any[] = [eq(schema.wegOwnerChanges.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.wegOwnerChanges.propertyId, propertyId));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.wegOwnerChanges).where(where).orderBy(desc(schema.wegOwnerChanges.createdAt));

    const ownerIds = [...new Set(data.flatMap(d => [d.previousOwnerId, d.newOwnerId]))];
    const unitIds = [...new Set(data.map(d => d.unitId))];
    const ownersMap: Record<string, any> = {};
    if (ownerIds.length) {
      const owners = await db.select().from(schema.owners).where(inArray(schema.owners.id, ownerIds));
      for (const o of owners) ownersMap[o.id] = o;
    }
    const unitsMap: Record<string, any> = {};
    if (unitIds.length) {
      const units = await db.select().from(schema.units).where(inArray(schema.units.id, unitIds));
      for (const u of units) unitsMap[u.id] = u;
    }

    const enriched = data.map(d => ({
      ...objectToSnakeCase(d),
      previous_owner_name: ownersMap[d.previousOwnerId] ? `${ownersMap[d.previousOwnerId].firstName} ${ownersMap[d.previousOwnerId].lastName}` : null,
      new_owner_name: ownersMap[d.newOwnerId] ? `${ownersMap[d.newOwnerId].firstName} ${ownersMap[d.newOwnerId].lastName}` : null,
      unit_top: unitsMap[d.unitId]?.topNummer || null,
    }));
    res.json(enriched);
  } catch (error) {
    console.error("Error fetching owner changes:", error);
    res.status(500).json({ error: "Fehler beim Laden" });
  }
});

router.post("/api/weg/owner-changes", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);

    const prop = await db.select().from(schema.properties).where(and(eq(schema.properties.id, body.propertyId), eq(schema.properties.organizationId, ctx.orgId))).limit(1);
    if (!prop.length) return res.status(403).json({ error: "Zugriff verweigert" });

    const currentUo = await db.select().from(schema.wegUnitOwners).where(and(
      eq(schema.wegUnitOwners.unitId, body.unitId),
      eq(schema.wegUnitOwners.propertyId, body.propertyId),
      eq(schema.wegUnitOwners.organizationId, ctx.orgId),
      or(isNull(schema.wegUnitOwners.validTo), gte(schema.wegUnitOwners.validTo, body.transferDate))
    )).limit(1);

    const [created] = await db.insert(schema.wegOwnerChanges).values({
      organizationId: ctx.orgId,
      propertyId: body.propertyId,
      unitId: body.unitId,
      previousOwnerId: body.previousOwnerId,
      newOwnerId: body.newOwnerId,
      transferDate: body.transferDate,
      grundbuchDate: body.grundbuchDate || null,
      tzNumber: body.tzNumber || null,
      kaufvertragDate: body.kaufvertragDate || null,
      rechtsgrund: body.rechtsgrund || 'kauf',
      status: 'entwurf',
      meaShare: currentUo.length ? String(currentUo[0].meaShare) : null,
      nutzwert: currentUo.length ? String(currentUo[0].nutzwert) : null,
      notes: body.notes || null,
      createdBy: ctx.userId,
    }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating owner change:", error);
    res.status(500).json({ error: "Fehler beim Erstellen" });
  }
});

router.patch("/api/weg/owner-changes/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);

    const existing = await db.select().from(schema.wegOwnerChanges).where(and(eq(schema.wegOwnerChanges.id, req.params.id), eq(schema.wegOwnerChanges.organizationId, ctx.orgId))).limit(1);
    if (!existing.length) return res.status(404).json({ error: "Nicht gefunden" });
    if (existing[0].status === 'abgeschlossen') return res.status(400).json({ error: "Abgeschlossener Eigentümerwechsel kann nicht bearbeitet werden" });

    const updateData: any = { updatedAt: new Date() };
    if (body.grundbuchDate !== undefined) updateData.grundbuchDate = body.grundbuchDate;
    if (body.tzNumber !== undefined) updateData.tzNumber = body.tzNumber;
    if (body.kaufvertragDate !== undefined) updateData.kaufvertragDate = body.kaufvertragDate;
    if (body.rechtsgrund !== undefined) updateData.rechtsgrund = body.rechtsgrund;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.transferDate !== undefined) updateData.transferDate = body.transferDate;

    const [updated] = await db.update(schema.wegOwnerChanges).set(updateData).where(eq(schema.wegOwnerChanges.id, req.params.id)).returning();
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating owner change:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

router.get("/api/weg/owner-changes/:id/preview", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const [oc] = await db.select().from(schema.wegOwnerChanges).where(and(eq(schema.wegOwnerChanges.id, req.params.id), eq(schema.wegOwnerChanges.organizationId, ctx.orgId))).limit(1);
    if (!oc) return res.status(404).json({ error: "Nicht gefunden" });

    const transferDate = new Date(oc.transferDate);
    const transferYear = transferDate.getFullYear();
    const transferMonth = transferDate.getMonth() + 1;
    const transferDay = transferDate.getDate();

    const daysInTransferMonth = new Date(transferYear, transferMonth, 0).getDate();
    const daysInYear = ((transferYear % 4 === 0 && transferYear % 100 !== 0) || transferYear % 400 === 0) ? 366 : 365;

    const oldOwnerDaysInMonth = transferDay - 1;
    const newOwnerDaysInMonth = daysInTransferMonth - oldOwnerDaysInMonth;

    const dayOfYear = Math.floor((transferDate.getTime() - new Date(transferYear, 0, 1).getTime()) / 86400000);
    const oldOwnerDaysInYear = dayOfYear;
    const newOwnerDaysInYear = daysInYear - oldOwnerDaysInYear;

    const activePlans = await db.select().from(schema.wegBudgetPlans).where(and(
      eq(schema.wegBudgetPlans.propertyId, oc.propertyId),
      eq(schema.wegBudgetPlans.organizationId, ctx.orgId),
      eq(schema.wegBudgetPlans.status, 'aktiv'),
      eq(schema.wegBudgetPlans.year, transferYear)
    )).limit(1);

    let monthlyAmount = 0;
    let yearlyAmount = 0;
    let bkMonat = 0, hkMonat = 0, ruecklageMonat = 0, verwaltungMonat = 0;

    if (activePlans.length) {
      const bp = activePlans[0];
      const existingInvoices = await db.select().from(schema.monthlyInvoices).where(and(
        eq(schema.monthlyInvoices.wegBudgetPlanId, bp.id),
        eq(schema.monthlyInvoices.ownerId, oc.previousOwnerId),
        eq(schema.monthlyInvoices.unitId, oc.unitId),
      )).orderBy(schema.monthlyInvoices.month).limit(1);

      if (existingInvoices.length) {
        const inv = existingInvoices[0];
        monthlyAmount = parseFloat(String(inv.gesamtbetrag || '0'));
        bkMonat = parseFloat(String(inv.betriebskosten || '0'));
        hkMonat = parseFloat(String(inv.heizungskosten || '0'));
      }
      yearlyAmount = monthlyAmount * 12;
    }

    const openInvoices = await db.select().from(schema.monthlyInvoices).where(and(
      eq(schema.monthlyInvoices.ownerId, oc.previousOwnerId),
      eq(schema.monthlyInvoices.unitId, oc.unitId),
      eq(schema.monthlyInvoices.status, 'offen'),
    ));

    const openDebts = openInvoices.reduce((s, inv) => s + parseFloat(String(inv.gesamtbetrag || '0')), 0);

    const futureInvoices = openInvoices.filter(inv => {
      if (inv.year > transferYear) return true;
      if (inv.year === transferYear && inv.month >= transferMonth) return true;
      return false;
    });

    const pastDueInvoices = openInvoices.filter(inv => {
      if (inv.year < transferYear) return true;
      if (inv.year === transferYear && inv.month < transferMonth) return true;
      return false;
    });

    const reserveEntries = await db.select().from(schema.wegReserveFund).where(and(
      eq(schema.wegReserveFund.propertyId, oc.propertyId),
      eq(schema.wegReserveFund.organizationId, ctx.orgId),
    ));
    const totalReserve = reserveEntries.reduce((s, e) => s + parseFloat(String(e.amount || '0')), 0);

    const unitOwners = await db.select().from(schema.wegUnitOwners).where(and(
      eq(schema.wegUnitOwners.propertyId, oc.propertyId),
      eq(schema.wegUnitOwners.organizationId, ctx.orgId),
      or(isNull(schema.wegUnitOwners.validTo), gte(schema.wegUnitOwners.validTo, oc.transferDate))
    ));
    const totalMea = unitOwners.reduce((s, uo) => s + parseFloat(String(uo.meaShare || '0')), 0);
    const ownerMea = parseFloat(String(oc.meaShare || '0'));
    const meaRatio = totalMea > 0 ? ownerMea / totalMea : 0;
    const reserveShare = Math.round(totalReserve * meaRatio * 100) / 100;

    const aliquotOldMonth = Math.round(monthlyAmount * oldOwnerDaysInMonth / daysInTransferMonth * 100) / 100;
    const aliquotNewMonth = Math.round(monthlyAmount * newOwnerDaysInMonth / daysInTransferMonth * 100) / 100;

    const aliquotOldYear = Math.round(yearlyAmount * oldOwnerDaysInYear / daysInYear * 100) / 100;
    const aliquotNewYear = Math.round(yearlyAmount * newOwnerDaysInYear / daysInYear * 100) / 100;

    const [prevOwner] = await db.select().from(schema.owners).where(eq(schema.owners.id, oc.previousOwnerId));
    const [newOwner] = await db.select().from(schema.owners).where(eq(schema.owners.id, oc.newOwnerId));
    const [unit] = await db.select().from(schema.units).where(eq(schema.units.id, oc.unitId));

    const remainingMonths: number[] = [];
    const startMonth = transferDay > 1 ? transferMonth + 1 : transferMonth;
    for (let m = startMonth; m <= 12; m++) remainingMonths.push(m);

    res.json({
      owner_change: objectToSnakeCase(oc),
      previous_owner: prevOwner ? { id: prevOwner.id, name: `${prevOwner.firstName} ${prevOwner.lastName}`, email: prevOwner.email } : null,
      new_owner: newOwner ? { id: newOwner.id, name: `${newOwner.firstName} ${newOwner.lastName}`, email: newOwner.email } : null,
      unit: unit ? { id: unit.id, top_nummer: unit.topNummer, type: unit.type, nutzflaeche: unit.nutzflaeche } : null,
      transfer: {
        transfer_date: oc.transferDate,
        transfer_year: transferYear,
        transfer_month: transferMonth,
        transfer_day: transferDay,
        days_in_transfer_month: daysInTransferMonth,
        days_in_year: daysInYear,
      },
      aliquotierung: {
        old_owner_days_in_month: oldOwnerDaysInMonth,
        new_owner_days_in_month: newOwnerDaysInMonth,
        old_owner_days_in_year: oldOwnerDaysInYear,
        new_owner_days_in_year: newOwnerDaysInYear,
        monthly_amount: monthlyAmount,
        yearly_amount: yearlyAmount,
        aliquot_old_month: aliquotOldMonth,
        aliquot_new_month: aliquotNewMonth,
        aliquot_old_year: aliquotOldYear,
        aliquot_new_year: aliquotNewYear,
      },
      financials: {
        open_debts_total: openDebts,
        past_due_invoices: pastDueInvoices.length,
        past_due_amount: pastDueInvoices.reduce((s, i) => s + parseFloat(String(i.gesamtbetrag || '0')), 0),
        future_invoices_to_cancel: futureInvoices.length,
        reserve_total: totalReserve,
        reserve_share: reserveShare,
        mea_share: ownerMea,
        mea_ratio: meaRatio,
        total_mea: totalMea,
      },
      new_invoices: {
        remaining_months: remainingMonths,
        count: remainingMonths.length,
        monthly_amount: monthlyAmount,
        first_month_aliquot: transferDay > 1 ? aliquotNewMonth : null,
        has_aliquot_month: transferDay > 1,
      },
      warnings: [
        ...(pastDueInvoices.length > 0 ? [`Solidarhaftung gem. § 38 WEG: ${pastDueInvoices.length} offene Rückstände des Voreigentümers (€ ${pastDueInvoices.reduce((s, i) => s + parseFloat(String(i.gesamtbetrag || '0')), 0).toFixed(2)}). Der neue Eigentümer haftet solidarisch für BK-Rückstände bis zu 3 Jahren.`] : []),
        ...(reserveShare < 0 ? ['Rücklage unter Mindestdotierung'] : []),
        ...(!activePlans.length ? ['Kein aktiver Wirtschaftsplan für das Übergabejahr vorhanden. Neue Vorschreibungen können nicht automatisch erstellt werden.'] : []),
      ],
    });
  } catch (error) {
    console.error("Error preview owner change:", error);
    res.status(500).json({ error: "Fehler bei der Vorschau" });
  }
});

router.post("/api/weg/owner-changes/:id/execute", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const [oc] = await db.select().from(schema.wegOwnerChanges).where(and(eq(schema.wegOwnerChanges.id, req.params.id), eq(schema.wegOwnerChanges.organizationId, ctx.orgId))).limit(1);
    if (!oc) return res.status(404).json({ error: "Nicht gefunden" });
    if (oc.status === 'abgeschlossen') return res.status(400).json({ error: "Eigentümerwechsel bereits durchgeführt" });

    const dateParts = String(oc.transferDate).split('-');
    const transferYear = parseInt(dateParts[0]);
    const transferMonth = parseInt(dateParts[1]);
    const transferDay = parseInt(dateParts[2]);
    const daysInTransferMonth = new Date(transferYear, transferMonth, 0).getDate();

    const result = await db.transaction(async (tx) => {
      const currentUo = await tx.select().from(schema.wegUnitOwners).where(and(
        eq(schema.wegUnitOwners.unitId, oc.unitId),
        eq(schema.wegUnitOwners.ownerId, oc.previousOwnerId),
        eq(schema.wegUnitOwners.organizationId, ctx.orgId),
      ));

      let meaShare = oc.meaShare || '0';
      let nutzwert = oc.nutzwert || null;

      if (currentUo.length) {
        meaShare = String(currentUo[0].meaShare);
        nutzwert = currentUo[0].nutzwert ? String(currentUo[0].nutzwert) : null;

        const validToStr = `${transferYear}-${String(transferMonth).padStart(2, '0')}-${String(transferDay - 1 > 0 ? transferDay - 1 : 1).padStart(2, '0')}`;
        await tx.update(schema.wegUnitOwners).set({
          validTo: validToStr,
          updatedAt: new Date(),
        }).where(eq(schema.wegUnitOwners.id, currentUo[0].id));
      }

      await tx.insert(schema.wegUnitOwners).values({
        organizationId: ctx.orgId,
        propertyId: oc.propertyId,
        unitId: oc.unitId,
        ownerId: oc.newOwnerId,
        meaShare,
        nutzwert,
        validFrom: oc.transferDate,
        validTo: null,
      });

      let cancelledCount = 0;
      const futureInvoices = await tx.select().from(schema.monthlyInvoices).where(and(
        eq(schema.monthlyInvoices.ownerId, oc.previousOwnerId),
        eq(schema.monthlyInvoices.unitId, oc.unitId),
        eq(schema.monthlyInvoices.status, 'offen'),
      ));

      for (const inv of futureInvoices) {
        const isAfterTransfer = inv.year > transferYear || (inv.year === transferYear && inv.month > transferMonth);
        const isTransferMonth = inv.year === transferYear && inv.month === transferMonth;

        if (isAfterTransfer) {
          await tx.update(schema.monthlyInvoices).set({ status: 'storniert', updatedAt: new Date() }).where(eq(schema.monthlyInvoices.id, inv.id));
          cancelledCount++;
        } else if (isTransferMonth && transferDay > 1) {
          const oldRatio = (transferDay - 1) / daysInTransferMonth;
          const originalTotal = parseFloat(String(inv.gesamtbetrag || '0'));
          const originalBk = parseFloat(String(inv.betriebskosten || '0'));
          const originalHk = parseFloat(String(inv.heizungskosten || '0'));
          const originalUst = parseFloat(String(inv.ust || '0'));

          await tx.update(schema.monthlyInvoices).set({
            betriebskosten: String(Math.round(originalBk * oldRatio * 100) / 100),
            heizungskosten: String(Math.round(originalHk * oldRatio * 100) / 100),
            ust: String(Math.round(originalUst * oldRatio * 100) / 100),
            gesamtbetrag: String(Math.round(originalTotal * oldRatio * 100) / 100),
            updatedAt: new Date(),
          }).where(eq(schema.monthlyInvoices.id, inv.id));
        }
      }

      let newInvoiceCount = 0;
      const activePlans = await tx.select().from(schema.wegBudgetPlans).where(and(
        eq(schema.wegBudgetPlans.propertyId, oc.propertyId),
        eq(schema.wegBudgetPlans.organizationId, ctx.orgId),
        eq(schema.wegBudgetPlans.status, 'aktiv'),
        eq(schema.wegBudgetPlans.year, transferYear)
      )).limit(1);

      if (activePlans.length) {
        const bp = activePlans[0];
        const dueDay = bp.dueDay || 5;

        const templateInvoice = await tx.select().from(schema.monthlyInvoices).where(and(
          eq(schema.monthlyInvoices.wegBudgetPlanId, bp.id),
          eq(schema.monthlyInvoices.ownerId, oc.previousOwnerId),
          eq(schema.monthlyInvoices.unitId, oc.unitId),
        )).orderBy(schema.monthlyInvoices.month).limit(1);

        if (templateInvoice.length) {
          const tmpl = templateInvoice[0];
          const fullBk = parseFloat(String(tmpl.betriebskosten || '0'));
          const fullHk = parseFloat(String(tmpl.heizungskosten || '0'));
          const fullUst = parseFloat(String(tmpl.ust || '0'));
          const fullTotal = parseFloat(String(tmpl.gesamtbetrag || '0'));

          if (transferDay > 1) {
            const newRatio = (daysInTransferMonth - transferDay + 1) / daysInTransferMonth;
            const faelligAm = `${transferYear}-${String(transferMonth).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
            await tx.insert(schema.monthlyInvoices).values({
              unitId: oc.unitId,
              tenantId: null,
              year: transferYear,
              month: transferMonth,
              grundmiete: '0',
              betriebskosten: String(Math.round(fullBk * newRatio * 100) / 100),
              heizungskosten: String(Math.round(fullHk * newRatio * 100) / 100),
              wasserkosten: '0',
              ustSatzBk: tmpl.ustSatzBk,
              ustSatzHeizung: tmpl.ustSatzHeizung,
              ustSatzMiete: 0,
              ustSatzWasser: 0,
              ust: String(Math.round(fullUst * newRatio * 100) / 100),
              gesamtbetrag: String(Math.round(fullTotal * newRatio * 100) / 100),
              status: 'offen',
              faelligAm,
              isVacancy: false,
              wegBudgetPlanId: bp.id,
              ownerId: oc.newOwnerId,
            });
            newInvoiceCount++;
          }

          const startMonth = transferDay > 1 ? transferMonth + 1 : transferMonth;
          for (let m = startMonth; m <= 12; m++) {
            const faelligAm = `${transferYear}-${String(m).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
            await tx.insert(schema.monthlyInvoices).values({
              unitId: oc.unitId,
              tenantId: null,
              year: transferYear,
              month: m,
              grundmiete: '0',
              betriebskosten: String(fullBk),
              heizungskosten: String(fullHk),
              wasserkosten: '0',
              ustSatzBk: tmpl.ustSatzBk,
              ustSatzHeizung: tmpl.ustSatzHeizung,
              ustSatzMiete: 0,
              ustSatzWasser: 0,
              ust: String(fullUst),
              gesamtbetrag: String(fullTotal),
              status: 'offen',
              faelligAm,
              isVacancy: false,
              wegBudgetPlanId: bp.id,
              ownerId: oc.newOwnerId,
            });
            newInvoiceCount++;
          }
        }
      }

      const reserveEntries = await tx.select().from(schema.wegReserveFund).where(and(
        eq(schema.wegReserveFund.propertyId, oc.propertyId),
        eq(schema.wegReserveFund.organizationId, ctx.orgId),
        eq(schema.wegReserveFund.ownerId, oc.previousOwnerId),
        eq(schema.wegReserveFund.unitId, oc.unitId),
      ));
      const reserveAmount = reserveEntries.reduce((s, e) => s + parseFloat(String(e.amount || '0')), 0);

      if (reserveAmount > 0) {
        await tx.insert(schema.wegReserveFund).values({
          organizationId: ctx.orgId,
          propertyId: oc.propertyId,
          year: transferYear,
          month: transferMonth,
          amount: String(-reserveAmount),
          description: `Rücklagen-Übertrag Eigentümerwechsel an ${oc.newOwnerId} (Top ${oc.unitId})`,
          entryType: 'uebertrag',
          unitId: oc.unitId,
          ownerId: oc.previousOwnerId,
        });
        await tx.insert(schema.wegReserveFund).values({
          organizationId: ctx.orgId,
          propertyId: oc.propertyId,
          year: transferYear,
          month: transferMonth,
          amount: String(reserveAmount),
          description: `Rücklagen-Übernahme Eigentümerwechsel von ${oc.previousOwnerId} (Top ${oc.unitId})`,
          entryType: 'uebertrag',
          unitId: oc.unitId,
          ownerId: oc.newOwnerId,
        });
      }

      const openDebtsAmount = futureInvoices
        .filter(i => i.year < transferYear || (i.year === transferYear && i.month < transferMonth))
        .reduce((s, i) => s + parseFloat(String(i.gesamtbetrag || '0')), 0);

      const transferMonthInv = futureInvoices.find(i => i.year === transferYear && i.month === transferMonth);
      const transferMonthTotal = parseFloat(String(transferMonthInv?.gesamtbetrag || '0'));
      const aliquotOldMonth = transferDay > 1 ? Math.round(transferMonthTotal * (transferDay - 1) / daysInTransferMonth * 100) / 100 : 0;
      const aliquotNewMonth = transferDay > 1 ? Math.round(transferMonthTotal * (daysInTransferMonth - transferDay + 1) / daysInTransferMonth * 100) / 100 : 0;

      await tx.update(schema.wegOwnerChanges).set({
        status: 'abgeschlossen',
        executedAt: new Date(),
        cancelledInvoiceCount: cancelledCount,
        newInvoiceCount,
        reserveAmount: String(reserveAmount),
        openDebtsAmount: String(openDebtsAmount),
        aliquotMonth: transferDay > 1 ? transferMonth : null,
        aliquotOldOwnerAmount: String(aliquotOldMonth),
        aliquotNewOwnerAmount: String(aliquotNewMonth),
        updatedAt: new Date(),
      }).where(eq(schema.wegOwnerChanges.id, oc.id));

      await tx.insert(schema.auditLogs).values({
        userId: ctx.userId,
        tableName: 'weg_owner_changes',
        recordId: oc.id,
        action: 'execute_owner_change',
        newData: {
          previousOwnerId: oc.previousOwnerId,
          newOwnerId: oc.newOwnerId,
          unitId: oc.unitId,
          transferDate: oc.transferDate,
          cancelledInvoices: cancelledCount,
          newInvoices: newInvoiceCount,
          reserveTransfer: reserveAmount,
        },
        details: { rechtsgrund: oc.rechtsgrund, grundbuchDate: oc.grundbuchDate, tzNumber: oc.tzNumber },
      });

      return { cancelledCount, newInvoiceCount, reserveAmount };
    });

    res.json({
      success: true,
      message: `Eigentümerwechsel durchgeführt: ${result.cancelledCount} Vorschreibungen storniert, ${result.newInvoiceCount} neue erstellt`,
      cancelled_invoices: result.cancelledCount,
      new_invoices: result.newInvoiceCount,
      reserve_transferred: result.reserveAmount,
    });
  } catch (error) {
    console.error("Error executing owner change:", error);
    res.status(500).json({ error: "Fehler beim Durchführen des Eigentümerwechsels" });
  }
});

// ====== AUDIT LOGS ======

router.get("/api/audit-logs", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    const tableName = req.query.table_name as string;
    const action = req.query.action as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;
    const limit = parseInt(req.query.limit as string) || 100;
    let conditions: any[] = [];
    if (tableName) conditions.push(eq(schema.auditLogs.tableName, tableName));
    if (action) conditions.push(eq(schema.auditLogs.action, action));
    if (startDate) conditions.push(gte(schema.auditLogs.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(schema.auditLogs.createdAt, new Date(endDate)));
    const where = conditions.length > 1 ? and(...conditions) : conditions.length === 1 ? conditions[0] : undefined;
    const data = await db.select().from(schema.auditLogs).where(where).orderBy(desc(schema.auditLogs.createdAt)).limit(limit);
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Fehler beim Laden der Audit-Logs" });
  }
});

// ====== TENANT PORTAL ACCESS ======

router.get("/api/tenant-portal-access", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db
      .select({ tenantPortalAccess: schema.tenantPortalAccess })
      .from(schema.tenantPortalAccess)
      .innerJoin(schema.tenants, eq(schema.tenantPortalAccess.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(eq(schema.properties.organizationId, ctx.orgId))
      .orderBy(desc(schema.tenantPortalAccess.createdAt));
    res.json(objectToSnakeCase(data.map(d => d.tenantPortalAccess)));
  } catch (error) {
    console.error("Error fetching tenant portal access:", error);
    res.status(500).json({ error: "Fehler beim Laden der Mieterportal-Zugänge" });
  }
});

router.post("/api/tenant-portal-access", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const parsed = schema.insertTenantPortalAccessSchema.parse(body);
    const tenant = await db
      .select()
      .from(schema.tenants)
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(eq(schema.tenants.id, parsed.tenantId), eq(schema.properties.organizationId, ctx.orgId)))
      .limit(1);
    if (!tenant.length) return res.status(404).json({ error: "Mieter nicht gefunden" });
    const [created] = await db.insert(schema.tenantPortalAccess).values(parsed).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating tenant portal access:", error);
    res.status(500).json({ error: "Fehler beim Erstellen des Mieterportal-Zugangs" });
  }
});

router.patch("/api/tenant-portal-access/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const existing = await db
      .select({ tenantPortalAccess: schema.tenantPortalAccess })
      .from(schema.tenantPortalAccess)
      .innerJoin(schema.tenants, eq(schema.tenantPortalAccess.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(eq(schema.tenantPortalAccess.id, req.params.id), eq(schema.properties.organizationId, ctx.orgId)))
      .limit(1);
    if (!existing.length) return res.status(404).json({ error: "Nicht gefunden" });
    const [updated] = await db.update(schema.tenantPortalAccess).set({ isActive: body.isActive, updatedAt: new Date() }).where(eq(schema.tenantPortalAccess.id, req.params.id)).returning();
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating tenant portal access:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren des Mieterportal-Zugangs" });
  }
});

// ====== LEARNED MATCHES ======

router.get("/api/learned-matches", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db.select().from(schema.learnedMatches).where(eq(schema.learnedMatches.organizationId, ctx.orgId)).orderBy(desc(schema.learnedMatches.matchCount));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching learned matches:", error);
    res.status(500).json({ error: "Fehler beim Laden der gelernten Zuordnungen" });
  }
});

router.post("/api/learned-matches", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const [created] = await db.insert(schema.learnedMatches).values({ ...body, organizationId: ctx.orgId }).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating learned match:", error);
    res.status(500).json({ error: "Fehler beim Erstellen der Zuordnung" });
  }
});

router.post("/api/learned-matches/:id/increment", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const [updated] = await db.update(schema.learnedMatches).set({ matchCount: sql`${schema.learnedMatches.matchCount} + 1`, updatedAt: new Date() }).where(and(eq(schema.learnedMatches.id, req.params.id), eq(schema.learnedMatches.organizationId, ctx.orgId))).returning();
    if (!updated) return res.status(404).json({ error: "Nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error incrementing learned match:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren der Zuordnung" });
  }
});

router.delete("/api/learned-matches/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const [deleted] = await db.delete(schema.learnedMatches).where(and(eq(schema.learnedMatches.id, req.params.id), eq(schema.learnedMatches.organizationId, ctx.orgId))).returning();
    if (!deleted) return res.status(404).json({ error: "Nicht gefunden" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting learned match:", error);
    res.status(500).json({ error: "Fehler beim Löschen der Zuordnung" });
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
