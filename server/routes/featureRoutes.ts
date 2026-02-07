import { Router, Request, Response } from "express";
import { db } from "../db";
import { eq, and, desc, inArray } from "drizzle-orm";
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

export default router;
