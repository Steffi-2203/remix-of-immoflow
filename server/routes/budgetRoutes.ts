import { Router } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { isAuthenticated, requireRole, snakeToCamel } from "./helpers";

const router = Router();

router.post("/api/mieweg-calculate", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
  try {
    const body = snakeToCamel(req.body);
    const { miewegIndexationService } = await import('../services/miewegIndexationService');
    
    const result = miewegIndexationService.calculateAllowedIncrease({
      currentRent: Number(body.currentRent),
      inflationRate: Number(body.inflationRate),
      rentType: body.rentType || 'freier_markt',
      indexationYear: Number(body.indexationYear) || new Date().getFullYear(),
      lastIndexationDate: new Date(body.lastIndexationDate || new Date()),
      isEinZweifamilienhaus: body.isEinZweifamilienhaus || false,
    });
    
    res.json(result);
  } catch (error) {
    console.error('MieWeG calculation error:', error);
    res.status(500).json({ error: "Failed to calculate MieWeG indexation" });
  }
});

router.get("/api/budgets", isAuthenticated, async (req: any, res) => {
  try {
    const orgId = req.session.organizationId;
    const { property_id, year } = req.query;
    
    let query = db.select({
      budget: schema.propertyBudgets,
      property: {
        name: schema.properties.name,
        address: schema.properties.address,
      }
    })
      .from(schema.propertyBudgets)
      .leftJoin(schema.properties, eq(schema.propertyBudgets.propertyId, schema.properties.id))
      .where(eq(schema.propertyBudgets.organizationId, orgId));
    
    const budgets = await query;
    
    let filtered = budgets;
    if (property_id) {
      filtered = filtered.filter(b => b.budget.propertyId === property_id);
    }
    if (year) {
      filtered = filtered.filter(b => b.budget.year === parseInt(year as string));
    }
    
    res.json(filtered.map(b => ({
      ...b.budget,
      id: b.budget.id,
      property_id: b.budget.propertyId,
      organization_id: b.budget.organizationId,
      position_1_name: b.budget.position1Name,
      position_1_amount: parseFloat(b.budget.position1Amount || '0'),
      position_2_name: b.budget.position2Name,
      position_2_amount: parseFloat(b.budget.position2Amount || '0'),
      position_3_name: b.budget.position3Name,
      position_3_amount: parseFloat(b.budget.position3Amount || '0'),
      position_4_name: b.budget.position4Name,
      position_4_amount: parseFloat(b.budget.position4Amount || '0'),
      position_5_name: b.budget.position5Name,
      position_5_amount: parseFloat(b.budget.position5Amount || '0'),
      approved_by: b.budget.approvedBy,
      approved_at: b.budget.approvedAt,
      created_at: b.budget.createdAt,
      updated_at: b.budget.updatedAt,
      properties: b.property,
    })));
  } catch (error) {
    console.error('Budgets fetch error:', error);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

router.get("/api/budgets/:id", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const orgId = req.session.organizationId;
    const result = await db.select()
      .from(schema.propertyBudgets)
      .where(and(eq(schema.propertyBudgets.id, id), eq(schema.propertyBudgets.organizationId, orgId)));
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }
    
    const b = result[0];
    res.json({
      ...b,
      property_id: b.propertyId,
      organization_id: b.organizationId,
      position_1_name: b.position1Name,
      position_1_amount: parseFloat(b.position1Amount || '0'),
      position_2_name: b.position2Name,
      position_2_amount: parseFloat(b.position2Amount || '0'),
      position_3_name: b.position3Name,
      position_3_amount: parseFloat(b.position3Amount || '0'),
      position_4_name: b.position4Name,
      position_4_amount: parseFloat(b.position4Amount || '0'),
      position_5_name: b.position5Name,
      position_5_amount: parseFloat(b.position5Amount || '0'),
      approved_by: b.approvedBy,
      approved_at: b.approvedAt,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    });
  } catch (error) {
    console.error('Budget fetch error:', error);
    res.status(500).json({ error: "Failed to fetch budget" });
  }
});

router.post("/api/budgets", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
  try {
    const orgId = req.session.organizationId;
    const body = snakeToCamel(req.body);
    
    const propertyId = body.propertyId || body.property_id;
    const property = await db.select().from(schema.properties)
      .where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, orgId)));
    if (property.length === 0) {
      return res.status(403).json({ error: "Property not found or access denied" });
    }
    
    const result = await db.insert(schema.propertyBudgets).values({
      propertyId: body.propertyId || body.property_id,
      organizationId: orgId,
      year: body.year,
      position1Name: body.position1Name || body.position_1_name,
      position1Amount: String(body.position1Amount || body.position_1_amount || 0),
      position2Name: body.position2Name || body.position_2_name,
      position2Amount: String(body.position2Amount || body.position_2_amount || 0),
      position3Name: body.position3Name || body.position_3_name,
      position3Amount: String(body.position3Amount || body.position_3_amount || 0),
      position4Name: body.position4Name || body.position_4_name,
      position4Amount: String(body.position4Amount || body.position_4_amount || 0),
      position5Name: body.position5Name || body.position_5_name,
      position5Amount: String(body.position5Amount || body.position_5_amount || 0),
      notes: body.notes,
      status: 'entwurf',
    }).returning();
    
    res.json(result[0]);
  } catch (error: any) {
    console.error('Budget create error:', error);
    if (error.message?.includes('unique')) {
      res.status(400).json({ error: "Budget for this property and year already exists" });
    } else {
      res.status(500).json({ error: "Failed to create budget" });
    }
  }
});

router.patch("/api/budgets/:id", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const body = snakeToCamel(req.body);
    
    const updateData: any = { updatedAt: new Date() };
    
    if (body.position1Name !== undefined || body.position_1_name !== undefined) updateData.position1Name = body.position1Name || body.position_1_name;
    if (body.position1Amount !== undefined || body.position_1_amount !== undefined) updateData.position1Amount = String(body.position1Amount ?? body.position_1_amount ?? 0);
    if (body.position2Name !== undefined || body.position_2_name !== undefined) updateData.position2Name = body.position2Name || body.position_2_name;
    if (body.position2Amount !== undefined || body.position_2_amount !== undefined) updateData.position2Amount = String(body.position2Amount ?? body.position_2_amount ?? 0);
    if (body.position3Name !== undefined || body.position_3_name !== undefined) updateData.position3Name = body.position3Name || body.position_3_name;
    if (body.position3Amount !== undefined || body.position_3_amount !== undefined) updateData.position3Amount = String(body.position3Amount ?? body.position_3_amount ?? 0);
    if (body.position4Name !== undefined || body.position_4_name !== undefined) updateData.position4Name = body.position4Name || body.position_4_name;
    if (body.position4Amount !== undefined || body.position_4_amount !== undefined) updateData.position4Amount = String(body.position4Amount ?? body.position_4_amount ?? 0);
    if (body.position5Name !== undefined || body.position_5_name !== undefined) updateData.position5Name = body.position5Name || body.position_5_name;
    if (body.position5Amount !== undefined || body.position_5_amount !== undefined) updateData.position5Amount = String(body.position5Amount ?? body.position_5_amount ?? 0);
    if (body.notes !== undefined) updateData.notes = body.notes;
    
    const orgId = req.session.organizationId;
    const result = await db.update(schema.propertyBudgets)
      .set(updateData)
      .where(and(eq(schema.propertyBudgets.id, id), eq(schema.propertyBudgets.organizationId, orgId)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Budget update error:', error);
    res.status(500).json({ error: "Failed to update budget" });
  }
});

router.patch("/api/budgets/:id/status", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const orgId = req.session.organizationId;
    const { status, approved_by } = req.body;
    
    const updateData: any = { 
      status,
      updatedAt: new Date(),
    };
    
    if (status === 'genehmigt') {
      updateData.approvedBy = approved_by;
      updateData.approvedAt = new Date();
    }
    
    const result = await db.update(schema.propertyBudgets)
      .set(updateData)
      .where(and(eq(schema.propertyBudgets.id, id), eq(schema.propertyBudgets.organizationId, orgId)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Budget status update error:', error);
    res.status(500).json({ error: "Failed to update budget status" });
  }
});

router.delete("/api/budgets/:id", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
  try {
    const { id } = req.params;
    const orgId = req.session.organizationId;
    await db.delete(schema.propertyBudgets).where(and(eq(schema.propertyBudgets.id, id), eq(schema.propertyBudgets.organizationId, orgId)));
    res.json({ success: true });
  } catch (error) {
    console.error('Budget delete error:', error);
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

router.get("/api/budgets/expenses", isAuthenticated, async (req: any, res) => {
  try {
    const { property_id, year } = req.query;
    
    if (!property_id || !year) {
      return res.status(400).json({ error: "property_id and year required" });
    }
    
    const expenses = await db.select()
      .from(schema.expenses)
      .where(eq(schema.expenses.propertyId, property_id as string));
    
    const byPosition: Record<number, number> = {};
    expenses.forEach(e => {
      const expenseDate = new Date(e.date);
      if (expenseDate.getFullYear() === parseInt(year as string)) {
        const position = expenseDate.getMonth() + 1;
        byPosition[position] = (byPosition[position] || 0) + parseFloat(e.amount || '0');
      }
    });
    
    res.json(byPosition);
  } catch (error) {
    console.error('Budget expenses fetch error:', error);
    res.status(500).json({ error: "Failed to fetch budget expenses" });
  }
});

router.get("/api/budgets/expenses-all", isAuthenticated, async (req: any, res) => {
  try {
    const { property_id, year } = req.query;
    
    if (!property_id || !year) {
      return res.status(400).json({ error: "property_id and year required" });
    }
    
    const expenses = await db.select()
      .from(schema.expenses)
      .where(eq(schema.expenses.propertyId, property_id as string));
    
    const byPosition: Record<number, number> = {};
    let total = 0;
    expenses.forEach(e => {
      const expenseDate = new Date(e.date);
      if (expenseDate.getFullYear() === parseInt(year as string)) {
        total += parseFloat(e.amount || '0');
      }
    });
    
    byPosition[1] = total;
    res.json(byPosition);
  } catch (error) {
    console.error('Budget expenses-all fetch error:', error);
    res.status(500).json({ error: "Failed to fetch budget expenses" });
  }
});

export default router;
