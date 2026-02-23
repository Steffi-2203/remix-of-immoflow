import { Router } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { isAuthenticated, requireRole, snakeToCamel, type AuthenticatedRequest } from "./helpers";

const router = Router();

router.get("/api/key-inventory", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.session?.organizationId;
    const propertyId = req.query.property_id;
    
    let query = db.select({
      key: schema.keyInventory,
      property: schema.properties,
      unit: schema.units,
    })
    .from(schema.keyInventory)
    .leftJoin(schema.properties, eq(schema.keyInventory.propertyId, schema.properties.id))
    .leftJoin(schema.units, eq(schema.keyInventory.unitId, schema.units.id));
    
    if (organizationId) {
      query = query.where(eq(schema.properties.organizationId, organizationId));
    }
    
    const results = await query;
    
    const keys = results
      .filter(r => !propertyId || r.key.propertyId === propertyId)
      .map(r => ({
        ...r.key,
        property_id: r.key.propertyId,
        unit_id: r.key.unitId,
        key_type: r.key.keyType,
        key_number: r.key.keyNumber,
        total_count: r.key.totalCount,
        available_count: r.key.availableCount,
        created_at: r.key.createdAt,
        updated_at: r.key.updatedAt,
        properties: r.property ? { id: r.property.id, name: r.property.name } : null,
        units: r.unit ? { id: r.unit.id, top_nummer: r.unit.topNummer } : null,
      }));
    
    res.json(keys);
  } catch (error) {
    console.error('Key inventory fetch error:', error);
    res.status(500).json({ error: "Failed to fetch key inventory" });
  }
});

router.get("/api/key-inventory/:id", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const result = await db.select({
      key: schema.keyInventory,
      property: schema.properties,
      unit: schema.units,
    })
    .from(schema.keyInventory)
    .leftJoin(schema.properties, eq(schema.keyInventory.propertyId, schema.properties.id))
    .leftJoin(schema.units, eq(schema.keyInventory.unitId, schema.units.id))
    .where(eq(schema.keyInventory.id, id))
    .limit(1);
    
    if (!result.length) {
      return res.status(404).json({ error: "Key not found" });
    }
    
    const r = result[0];
    const key = {
      ...r.key,
      property_id: r.key.propertyId,
      unit_id: r.key.unitId,
      key_type: r.key.keyType,
      key_number: r.key.keyNumber,
      total_count: r.key.totalCount,
      available_count: r.key.availableCount,
      created_at: r.key.createdAt,
      updated_at: r.key.updatedAt,
      properties: r.property ? { id: r.property.id, name: r.property.name } : null,
      units: r.unit ? { id: r.unit.id, top_nummer: r.unit.topNummer } : null,
    };
    
    res.json(key);
  } catch (error) {
    console.error('Key inventory fetch error:', error);
    res.status(500).json({ error: "Failed to fetch key" });
  }
});

router.post("/api/key-inventory", isAuthenticated, requireRole("property_manager"), async (req: AuthenticatedRequest, res) => {
  try {
    const body = snakeToCamel(req.body);
    const result = await db.insert(schema.keyInventory).values({
      propertyId: body.propertyId,
      unitId: body.unitId || null,
      keyType: body.keyType,
      keyNumber: body.keyNumber || null,
      description: body.description || null,
      totalCount: body.totalCount || 1,
      availableCount: body.availableCount || 1,
      notes: body.notes || null,
    }).returning();
    
    const key = result[0];
    res.json({
      ...key,
      property_id: key.propertyId,
      unit_id: key.unitId,
      key_type: key.keyType,
      key_number: key.keyNumber,
      total_count: key.totalCount,
      available_count: key.availableCount,
      created_at: key.createdAt,
      updated_at: key.updatedAt,
    });
  } catch (error) {
    console.error('Key inventory create error:', error);
    res.status(500).json({ error: "Failed to create key" });
  }
});

router.patch("/api/key-inventory/:id", isAuthenticated, requireRole("property_manager"), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const body = snakeToCamel(req.body);
    
    const updates: any = { updatedAt: new Date() };
    if (body.propertyId !== undefined) updates.propertyId = body.propertyId;
    if (body.unitId !== undefined) updates.unitId = body.unitId || null;
    if (body.keyType !== undefined) updates.keyType = body.keyType;
    if (body.keyNumber !== undefined) updates.keyNumber = body.keyNumber || null;
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.totalCount !== undefined) updates.totalCount = body.totalCount;
    if (body.availableCount !== undefined) updates.availableCount = body.availableCount;
    if (body.notes !== undefined) updates.notes = body.notes || null;
    
    const result = await db.update(schema.keyInventory)
      .set(updates)
      .where(eq(schema.keyInventory.id, id))
      .returning();
    
    if (!result.length) {
      return res.status(404).json({ error: "Key not found" });
    }
    
    const key = result[0];
    res.json({
      ...key,
      property_id: key.propertyId,
      unit_id: key.unitId,
      key_type: key.keyType,
      key_number: key.keyNumber,
      total_count: key.totalCount,
      available_count: key.availableCount,
      created_at: key.createdAt,
      updated_at: key.updatedAt,
    });
  } catch (error) {
    console.error('Key inventory update error:', error);
    res.status(500).json({ error: "Failed to update key" });
  }
});

router.delete("/api/key-inventory/:id", isAuthenticated, requireRole("property_manager"), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    await db.delete(schema.keyInventory).where(eq(schema.keyInventory.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Key inventory delete error:', error);
    res.status(500).json({ error: "Failed to delete key" });
  }
});

router.get("/api/key-inventory/:keyInventoryId/handovers", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const { keyInventoryId } = req.params;
    const results = await db.select({
      handover: schema.keyHandovers,
      tenant: schema.tenants,
    })
    .from(schema.keyHandovers)
    .leftJoin(schema.tenants, eq(schema.keyHandovers.tenantId, schema.tenants.id))
    .where(eq(schema.keyHandovers.keyInventoryId, keyInventoryId));
    
    const handovers = results.map(r => ({
      ...r.handover,
      key_inventory_id: r.handover.keyInventoryId,
      tenant_id: r.handover.tenantId,
      recipient_name: r.handover.recipientName,
      handover_date: r.handover.handoverDate,
      return_date: r.handover.returnDate,
      handover_protocol: r.handover.handoverProtocol,
      created_at: r.handover.createdAt,
      tenants: r.tenant ? {
        id: r.tenant.id,
        first_name: r.tenant.firstName,
        last_name: r.tenant.lastName,
      } : null,
    }));
    
    res.json(handovers);
  } catch (error) {
    console.error('Key handovers fetch error:', error);
    res.status(500).json({ error: "Failed to fetch key handovers" });
  }
});

router.post("/api/key-inventory/:keyInventoryId/handovers", isAuthenticated, requireRole("property_manager"), async (req: AuthenticatedRequest, res) => {
  try {
    const { keyInventoryId } = req.params;
    const body = snakeToCamel(req.body);
    
    const result = await db.insert(schema.keyHandovers).values({
      keyInventoryId,
      tenantId: body.tenantId || null,
      recipientName: body.recipientName || null,
      handoverDate: body.handoverDate,
      returnDate: body.returnDate || null,
      quantity: body.quantity || 1,
      status: body.status || 'ausgegeben',
      handoverProtocol: body.handoverProtocol || null,
      notes: body.notes || null,
    }).returning();
    
    if (!body.returnDate) {
      await db.update(schema.keyInventory)
        .set({ 
          availableCount: sql`GREATEST(0, ${schema.keyInventory.availableCount} - ${body.quantity || 1})`,
          updatedAt: new Date()
        })
        .where(eq(schema.keyInventory.id, keyInventoryId));
    }
    
    const handover = result[0];
    res.json({
      ...handover,
      key_inventory_id: handover.keyInventoryId,
      tenant_id: handover.tenantId,
      recipient_name: handover.recipientName,
      handover_date: handover.handoverDate,
      return_date: handover.returnDate,
      handover_protocol: handover.handoverProtocol,
      created_at: handover.createdAt,
    });
  } catch (error) {
    console.error('Key handover create error:', error);
    res.status(500).json({ error: "Failed to create key handover" });
  }
});

export default router;
