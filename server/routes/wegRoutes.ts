import { Router, Request, Response } from "express";
import crypto from "crypto";
import { db } from "../db";
import { eq, and, desc, inArray, gte, lte, sql, isNull, or } from "drizzle-orm";
import * as schema from "@shared/schema";
import { getAuthContext, checkMutationPermission, objectToSnakeCase, objectToCamelCase } from "./helpers";

const router = Router();

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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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

// ====== WEG VOTE RESULT (§24 Quorum Validation) ======

router.get("/api/weg/votes/:id/result", async (req: Request, res: Response) => {
  const ctx = await getAuthContext(req, res);
  if (!ctx) return;
  try {
    const { calculateVoteResult } = await import("../services/wegVotingService");
    const result = await calculateVoteResult(req.params.id, ctx.orgId);
    res.json(objectToCamelCase(result));
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const [deleted] = await db.delete(schema.wegMaintenanceItems).where(and(eq(schema.wegMaintenanceItems.id, req.params.id), eq(schema.wegMaintenanceItems.organizationId, ctx.orgId))).returning();
    if (!deleted) return res.status(404).json({ error: "Nicht gefunden" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting maintenance item:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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

// ====== WEG VORSCHREIBUNGEN ======

router.get("/api/weg/vorschreibungen", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const { propertyId, year, month } = req.query;
    let conditions: any[] = [eq(schema.wegVorschreibungen.organizationId, ctx.orgId)];
    if (propertyId) conditions.push(eq(schema.wegVorschreibungen.propertyId, propertyId as string));
    if (year) conditions.push(eq(schema.wegVorschreibungen.year, parseInt(year as string)));
    if (month) conditions.push(eq(schema.wegVorschreibungen.month, parseInt(month as string)));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const data = await db.select().from(schema.wegVorschreibungen).where(where).orderBy(desc(schema.wegVorschreibungen.year), desc(schema.wegVorschreibungen.month));
    res.json(objectToSnakeCase(data));
  } catch (error) {
    console.error("Error fetching WEG-Vorschreibungen:", error);
    res.status(500).json({ error: "Fehler beim Laden der WEG-Vorschreibungen" });
  }
});

router.post("/api/weg/vorschreibungen/generate", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const body = objectToCamelCase(req.body);
    const { propertyId, year, month } = body;
    if (!propertyId || !year || !month) {
      return res.status(400).json({ error: "propertyId, year und month sind erforderlich" });
    }

    const prop = await db.select().from(schema.properties).where(and(
      eq(schema.properties.id, propertyId),
      eq(schema.properties.organizationId, ctx.orgId)
    )).limit(1);
    if (!prop.length) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });

    const existing = await db.select().from(schema.wegVorschreibungen).where(and(
      eq(schema.wegVorschreibungen.propertyId, propertyId),
      eq(schema.wegVorschreibungen.year, year),
      eq(schema.wegVorschreibungen.month, month)
    ));
    if (existing.length > 0) {
      return res.status(409).json({ error: `Vorschreibungen für ${month}/${year} existieren bereits (${existing.length} Stück)` });
    }

    const budgetPlans = await db.select().from(schema.wegBudgetPlans).where(and(
      eq(schema.wegBudgetPlans.propertyId, propertyId),
      eq(schema.wegBudgetPlans.year, year),
      eq(schema.wegBudgetPlans.organizationId, ctx.orgId)
    )).limit(1);

    if (!budgetPlans.length) {
      return res.status(404).json({ error: `Kein Wirtschaftsplan für ${year} gefunden. Bitte zuerst einen Wirtschaftsplan erstellen.` });
    }
    const budgetPlan = budgetPlans[0];

    const budgetLines = await db.select().from(schema.wegBudgetLines).where(
      eq(schema.wegBudgetLines.budgetPlanId, budgetPlan.id)
    );

    const unitOwners = await db.select().from(schema.wegUnitOwners).where(and(
      eq(schema.wegUnitOwners.propertyId, propertyId),
      eq(schema.wegUnitOwners.organizationId, ctx.orgId)
    ));

    if (!unitOwners.length) {
      return res.status(400).json({ error: "Keine Eigentümer-Zuordnungen gefunden. Bitte zuerst Eigentümer zu Einheiten zuordnen." });
    }

    let totalBk = 0, totalRuecklage = 0, totalInstandhaltung = 0, totalVerwaltung = 0, totalHeizung = 0;
    for (const line of budgetLines) {
      const amount = Number(line.amount) || 0;
      const cat = (line.category || '').toLowerCase();
      if (cat.includes('rücklage') || cat.includes('ruecklage') || cat === 'reserve') {
        totalRuecklage += amount;
      } else if (cat.includes('instandhaltung') || cat.includes('reparatur') || cat.includes('sanierung')) {
        totalInstandhaltung += amount;
      } else if (cat.includes('verwaltung') || cat.includes('honorar') || cat.includes('management')) {
        totalVerwaltung += amount;
      } else if (cat.includes('heizung') || cat.includes('heizkosten') || cat.includes('wärme') || cat.includes('fernwärme') || cat.includes('heating')) {
        totalHeizung += amount;
      } else {
        totalBk += amount;
      }
    }

    if (totalBk === 0 && totalRuecklage === 0 && totalInstandhaltung === 0 && totalVerwaltung === 0 && totalHeizung === 0) {
      const planTotal = Number(budgetPlan.totalAmount) || 0;
      const planReserve = Number(budgetPlan.reserveContribution) || 0;
      const planMgmt = Number(budgetPlan.managementFee) || 0;
      totalBk = planTotal - planReserve - planMgmt;
      totalRuecklage = planReserve;
      totalVerwaltung = planMgmt;
    }

    const monthlyBk = totalBk / 12;
    const monthlyRuecklage = totalRuecklage / 12;
    const monthlyInstandhaltung = totalInstandhaltung / 12;
    const monthlyVerwaltung = totalVerwaltung / 12;
    const monthlyHeizung = totalHeizung / 12;

    const totalMea = unitOwners.reduce((s, uo) => s + (Number(uo.meaShare) || 0), 0);
    if (totalMea <= 0) {
      return res.status(400).json({ error: "MEA-Summe ist 0. Bitte MEA-Anteile der Eigentümer prüfen." });
    }

    const dueDay = budgetPlan.dueDay || 5;
    const faelligAm = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
    const runId = crypto.randomUUID();

    const vorschreibungen: any[] = [];
    for (const uo of unitOwners) {
      const share = (Number(uo.meaShare) || 0) / totalMea;
      const bk = Math.round(monthlyBk * share * 100) / 100;
      const ruecklage = Math.round(monthlyRuecklage * share * 100) / 100;
      const instandhaltung = Math.round(monthlyInstandhaltung * share * 100) / 100;
      const verwaltung = Math.round(monthlyVerwaltung * share * 100) / 100;
      const heizung = Math.round(monthlyHeizung * share * 100) / 100;

      const ustBk = Math.round(bk * 0.10 * 100) / 100;
      const ustRuecklage = 0;
      const ustInstandhaltung = Math.round(instandhaltung * 0.20 * 100) / 100;
      const ustVerwaltung = Math.round(verwaltung * 0.20 * 100) / 100;
      const ustHeizung = Math.round(heizung * 0.20 * 100) / 100;
      const ust = ustBk + ustRuecklage + ustInstandhaltung + ustVerwaltung + ustHeizung;
      const gesamtbetrag = bk + ruecklage + instandhaltung + verwaltung + heizung + ust;

      vorschreibungen.push({
        organizationId: ctx.orgId,
        propertyId,
        unitId: uo.unitId,
        ownerId: uo.ownerId,
        budgetPlanId: budgetPlan.id,
        year,
        month,
        meaShare: String(uo.meaShare),
        betriebskosten: String(bk),
        ruecklage: String(ruecklage),
        instandhaltung: String(instandhaltung),
        verwaltungshonorar: String(verwaltung),
        heizung: String(heizung),
        ust: String(ust),
        gesamtbetrag: String(gesamtbetrag),
        status: 'offen' as const,
        faelligAm,
        runId,
      });
    }

    const created = await db.insert(schema.wegVorschreibungen).values(vorschreibungen).returning();

    console.log(`[WEG-VORSCHREIBUNG] Erstellt: ${created.length} Vorschreibungen für Liegenschaft ${propertyId}, ${month}/${year}`);

    res.json({
      message: `${created.length} WEG-Vorschreibungen für ${month}/${year} erstellt`,
      count: created.length,
      runId,
      vorschreibungen: objectToSnakeCase(created),
    });
  } catch (error: any) {
    console.error("Error generating WEG-Vorschreibungen:", error);
    res.status(500).json({ error: error.message || "Fehler beim Generieren der WEG-Vorschreibungen" });
  }
});

router.patch("/api/weg/vorschreibungen/:id/status", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const { status } = req.body;
    if (!['offen', 'bezahlt', 'teilbezahlt', 'ueberfaellig'].includes(status)) {
      return res.status(400).json({ error: "Ungültiger Status" });
    }

    const [updated] = await db.update(schema.wegVorschreibungen)
      .set({ status, updatedAt: new Date() })
      .where(and(
        eq(schema.wegVorschreibungen.id, req.params.id),
        eq(schema.wegVorschreibungen.organizationId, ctx.orgId)
      ))
      .returning();

    if (!updated) return res.status(404).json({ error: "Vorschreibung nicht gefunden" });
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating WEG-Vorschreibung status:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren" });
  }
});

router.delete("/api/weg/vorschreibungen/run/:runId", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const deleted = await db.delete(schema.wegVorschreibungen)
      .where(and(
        eq(schema.wegVorschreibungen.runId, req.params.runId),
        eq(schema.wegVorschreibungen.organizationId, ctx.orgId)
      ))
      .returning();

    res.json({ message: `${deleted.length} Vorschreibungen gelöscht`, count: deleted.length });
  } catch (error) {
    console.error("Error deleting WEG-Vorschreibungen:", error);
    res.status(500).json({ error: "Fehler beim Löschen" });
  }
});

// ====== WEG JAHRESABRECHNUNG (ANNUAL SETTLEMENT) ======

router.get("/api/weg/settlement/preview", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const propertyId = req.query.propertyId as string;
    const year = parseInt(req.query.year as string);
    if (!propertyId || !year) {
      return res.status(400).json({ error: "propertyId und year erforderlich" });
    }

    const property = await db.select().from(schema.properties).where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, ctx.orgId))).limit(1);
    if (!property.length) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });

    const { calculateOwnerSettlement } = await import("../services/wegSettlementService");
    const result = await calculateOwnerSettlement(propertyId, year, ctx.orgId);
    res.json(objectToSnakeCase(result));
  } catch (error: any) {
    console.error("Error previewing WEG settlement:", error);
    res.status(400).json({ error: error.message || "Fehler bei der Abrechnungsvorschau" });
  }
});

router.post("/api/weg/settlement/create", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const body = objectToCamelCase(req.body);
    const { propertyId, year } = body;
    if (!propertyId || !year) {
      return res.status(400).json({ error: "propertyId und year erforderlich" });
    }

    const property = await db.select().from(schema.properties).where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, ctx.orgId))).limit(1);
    if (!property.length) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });

    const { createWegSettlement } = await import("../services/wegSettlementService");
    const result = await createWegSettlement(propertyId, parseInt(year), ctx.orgId, ctx.userId);
    res.json(objectToSnakeCase(result));
  } catch (error: any) {
    console.error("Error creating WEG settlement:", error);
    res.status(400).json({ error: error.message || "Fehler beim Erstellen der Abrechnung" });
  }
});

router.get("/api/weg/settlement/:propertyId/:year", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const { propertyId, year } = req.params;
    const property = await db.select().from(schema.properties).where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, ctx.orgId))).limit(1);
    if (!property.length) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });

    const settlement = await db.select().from(schema.wegSettlements).where(and(
      eq(schema.wegSettlements.propertyId, propertyId),
      eq(schema.wegSettlements.year, parseInt(year)),
      eq(schema.wegSettlements.organizationId, ctx.orgId)
    )).limit(1);

    if (!settlement.length) return res.status(404).json({ error: "Keine Abrechnung für dieses Jahr gefunden" });

    const details = await db.select().from(schema.wegSettlementDetails).where(eq(schema.wegSettlementDetails.settlementId, settlement[0].id));

    res.json(objectToSnakeCase({ settlement: settlement[0], details }));
  } catch (error: any) {
    console.error("Error fetching WEG settlement:", error);
    res.status(500).json({ error: "Fehler beim Laden der Abrechnung" });
  }
});

// ====== RESERVE FUND OPERATIONS ======

router.post("/api/weg/reserve/interest", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const body = objectToCamelCase(req.body);
    const { propertyId, year, month, amount, description } = body;
    if (!propertyId || !year || !month || !amount) {
      return res.status(400).json({ error: "propertyId, year, month und amount erforderlich" });
    }

    const property = await db.select().from(schema.properties).where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, ctx.orgId))).limit(1);
    if (!property.length) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });

    const { bookReserveInterest } = await import("../services/wegAccountingService");
    const entry = await bookReserveInterest(propertyId, ctx.orgId, parseInt(year), parseInt(month), parseFloat(amount), description || "");
    res.json(objectToSnakeCase(entry));
  } catch (error: any) {
    console.error("Error booking reserve interest:", error);
    res.status(400).json({ error: error.message || "Fehler beim Buchen der Zinsen" });
  }
});

router.post("/api/weg/reserve/withdraw", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const body = objectToCamelCase(req.body);
    const { propertyId, amount, description, voteId, isEmergency } = body;
    if (!propertyId || !amount || !description) {
      return res.status(400).json({ error: "propertyId, amount und description erforderlich" });
    }

    const property = await db.select().from(schema.properties).where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, ctx.orgId))).limit(1);
    if (!property.length) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });

    const { withdrawFromReserve } = await import("../services/wegAccountingService");
    const result = await withdrawFromReserve(propertyId, ctx.orgId, parseFloat(amount), description, voteId, isEmergency);
    res.json(objectToSnakeCase(result));
  } catch (error: any) {
    console.error("Error withdrawing from reserve:", error);
    res.status(400).json({ error: error.message || "Fehler bei der Entnahme" });
  }
});

router.post("/api/weg/reserve/insurance", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const body = objectToCamelCase(req.body);
    const { propertyId, totalDamage, insurancePayout, description, voteId } = body;
    if (!propertyId || totalDamage === undefined || insurancePayout === undefined || !description) {
      return res.status(400).json({ error: "propertyId, totalDamage, insurancePayout und description erforderlich" });
    }

    const property = await db.select().from(schema.properties).where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, ctx.orgId))).limit(1);
    if (!property.length) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });

    const { bookInsuranceClaim } = await import("../services/wegAccountingService");
    const result = await bookInsuranceClaim(propertyId, ctx.orgId, {
      totalDamage: parseFloat(totalDamage),
      insurancePayout: parseFloat(insurancePayout),
      description,
      voteId,
    });
    res.json(objectToSnakeCase(result));
  } catch (error: any) {
    console.error("Error booking insurance claim:", error);
    res.status(400).json({ error: error.message || "Fehler beim Buchen des Versicherungsfalls" });
  }
});

router.get("/api/weg/reserve/overview", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const propertyId = req.query.propertyId as string;
    if (!propertyId) return res.status(400).json({ error: "propertyId erforderlich" });

    const property = await db.select().from(schema.properties).where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, ctx.orgId))).limit(1);
    if (!property.length) return res.status(404).json({ error: "Liegenschaft nicht gefunden" });

    const { getReserveFundOverview } = await import("../services/wegAccountingService");
    const overview = await getReserveFundOverview(propertyId, ctx.orgId);
    res.json(objectToSnakeCase(overview));
  } catch (error: any) {
    console.error("Error fetching reserve fund overview:", error);
    res.status(500).json({ error: "Fehler beim Laden der Rücklagenübersicht" });
  }
});

// ====== SPECIAL ASSESSMENT INVOICING ======

router.post("/api/weg/special-assessments/:id/invoice", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });

    const assessment = await db.select().from(schema.wegSpecialAssessments).where(and(eq(schema.wegSpecialAssessments.id, req.params.id), eq(schema.wegSpecialAssessments.organizationId, ctx.orgId))).limit(1);
    if (!assessment.length) return res.status(404).json({ error: "Sonderumlage nicht gefunden" });

    const { createSpecialAssessmentInvoices } = await import("../services/wegAccountingService");
    const result = await createSpecialAssessmentInvoices(req.params.id, ctx.orgId);
    res.json(objectToSnakeCase({
      message: `${result.created.length} Vorschreibungen für Sonderumlage erstellt`,
      count: result.created.length,
      vorschreibungen: result.created,
    }));
  } catch (error: any) {
    console.error("Error creating special assessment invoices:", error);
    res.status(400).json({ error: error.message || "Fehler beim Erstellen der Sonderumlagen-Vorschreibungen" });
  }
});

export default router;
