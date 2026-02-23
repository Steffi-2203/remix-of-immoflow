import { Router, Request, Response } from "express";
import { db } from "../db";
import { heatingSettlements, heatingSettlementDetails, units, tenants, properties } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { isAuthenticated, requireMutationAccess , type AuthenticatedRequest } from "./helpers";

const router = Router();

function getOrgId(req: AuthenticatedRequest): string | null {
  return req.session?.organizationId || null;
}

router.get("/api/heating-settlements", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht autorisiert" });

    const { propertyId } = req.query;
    const conditions: any[] = [eq(heatingSettlements.organizationId, orgId)];
    if (propertyId) {
      conditions.push(eq(heatingSettlements.propertyId, propertyId as string));
    }

    const settlements = await db.select({
      settlement: heatingSettlements,
      propertyName: properties.name,
    })
      .from(heatingSettlements)
      .leftJoin(properties, eq(heatingSettlements.propertyId, properties.id))
      .where(and(...conditions))
      .orderBy(desc(heatingSettlements.createdAt));

    res.json(settlements.map(s => ({ ...s.settlement, propertyName: s.propertyName })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/heating-settlements", isAuthenticated, requireMutationAccess(), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht autorisiert" });

    const { propertyId, periodStart, periodEnd, totalCost, fixedCostShare, variableCostShare, notes } = req.body;

    const fixed = Number(fixedCostShare || 45);
    const variable = Number(variableCostShare || 55);

    if (fixed < 35 || fixed > 45) {
      return res.status(400).json({ error: "Fixkostenanteil muss zwischen 35% und 45% liegen (HeizKG)" });
    }
    if (variable < 55 || variable > 65) {
      return res.status(400).json({ error: "Variabler Kostenanteil muss zwischen 55% und 65% liegen (HeizKG)" });
    }
    if (Math.abs(fixed + variable - 100) > 0.01) {
      return res.status(400).json({ error: "Fixkostenanteil + Variabler Kostenanteil müssen 100% ergeben" });
    }

    const [settlement] = await db.insert(heatingSettlements).values({
      organizationId: orgId,
      propertyId,
      periodStart,
      periodEnd,
      totalCost: String(totalCost),
      fixedCostShare: String(fixed),
      variableCostShare: String(variable),
      notes: notes || null,
    }).returning();

    res.json(settlement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/heating-settlements/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht autorisiert" });

    const id = Number(req.params.id);
    const [settlement] = await db.select()
      .from(heatingSettlements)
      .where(and(eq(heatingSettlements.id, id), eq(heatingSettlements.organizationId, orgId)));

    if (!settlement) {
      return res.status(404).json({ error: "Abrechnung nicht gefunden" });
    }

    const details = await db.select()
      .from(heatingSettlementDetails)
      .where(eq(heatingSettlementDetails.settlementId, id));

    res.json({ ...settlement, details });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/heating-settlements/:id/calculate", isAuthenticated, requireMutationAccess(), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht autorisiert" });

    const id = Number(req.params.id);
    const [settlement] = await db.select()
      .from(heatingSettlements)
      .where(and(eq(heatingSettlements.id, id), eq(heatingSettlements.organizationId, orgId)));

    if (!settlement) {
      return res.status(404).json({ error: "Abrechnung nicht gefunden" });
    }

    const consumptionData: Array<{ unitId: string; consumption: number; prepayment?: number }> = req.body.consumptionData || [];

    if (!consumptionData.length) {
      return res.status(400).json({ error: "Verbrauchsdaten fehlen" });
    }

    const propertyUnits = await db.select()
      .from(units)
      .where(eq(units.propertyId, settlement.propertyId));

    const unitTenants = await db.select()
      .from(tenants)
      .where(eq(tenants.status, 'aktiv'));

    const tenantByUnit = new Map<string, string>();
    for (const tenant of unitTenants) {
      tenantByUnit.set(tenant.unitId, `${tenant.firstName} ${tenant.lastName}`);
    }

    const totalCost = Number(settlement.totalCost);
    const fixedPercent = Number(settlement.fixedCostShare) / 100;
    const variablePercent = Number(settlement.variableCostShare) / 100;
    const fixedPool = totalCost * fixedPercent;
    const variablePool = totalCost * variablePercent;

    const unitDataMap = new Map<string, { area: number; consumption: number; prepayment: number }>();
    let totalArea = 0;
    let totalConsumption = 0;

    for (const cd of consumptionData) {
      const unit = propertyUnits.find(u => u.id === cd.unitId);
      if (!unit) continue;
      const area = Number(unit.flaeche || 0);
      const consumption = Number(cd.consumption || 0);
      const prepayment = Number(cd.prepayment || 0);
      totalArea += area;
      totalConsumption += consumption;
      unitDataMap.set(cd.unitId, { area, consumption, prepayment });
    }

    if (totalArea === 0) {
      return res.status(400).json({ error: "Gesamtfläche darf nicht 0 sein" });
    }
    if (totalConsumption === 0) {
      return res.status(400).json({ error: "Gesamtverbrauch darf nicht 0 sein" });
    }

    await db.delete(heatingSettlementDetails).where(eq(heatingSettlementDetails.settlementId, id));

    const detailValues = [];
    for (const [unitId, data] of unitDataMap) {
      const fixedAmount = Math.round((data.area / totalArea) * fixedPool * 100) / 100;
      const variableAmount = Math.round((data.consumption / totalConsumption) * variablePool * 100) / 100;
      const total = Math.round((fixedAmount + variableAmount) * 100) / 100;
      const balance = Math.round((total - data.prepayment) * 100) / 100;

      detailValues.push({
        settlementId: id,
        unitId,
        tenantName: tenantByUnit.get(unitId) || null,
        area: String(data.area),
        consumption: String(data.consumption),
        fixedAmount: String(fixedAmount),
        variableAmount: String(variableAmount),
        totalAmount: String(total),
        prepayment: String(data.prepayment),
        balance: String(balance),
      });
    }

    const details = await db.insert(heatingSettlementDetails).values(detailValues).returning();

    await db.update(heatingSettlements)
      .set({ status: 'berechnet' })
      .where(eq(heatingSettlements.id, id));

    res.json(details);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/heating-settlements/:id", isAuthenticated, requireMutationAccess(), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht autorisiert" });

    const id = Number(req.params.id);
    const [settlement] = await db.select()
      .from(heatingSettlements)
      .where(and(eq(heatingSettlements.id, id), eq(heatingSettlements.organizationId, orgId)));

    if (!settlement) {
      return res.status(404).json({ error: "Abrechnung nicht gefunden" });
    }

    if (settlement.status !== 'entwurf') {
      return res.status(400).json({ error: "Nur Entwürfe können gelöscht werden" });
    }

    await db.delete(heatingSettlementDetails).where(eq(heatingSettlementDetails.settlementId, id));
    await db.delete(heatingSettlements).where(eq(heatingSettlements.id, id));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
