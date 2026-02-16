import { Router, Request, Response } from "express";
import { db } from "../db";
import { eq, and, desc, gte, lte, sql, isNull, or } from "drizzle-orm";
import * as schema from "@shared/schema";
import { getAuthContext, checkMutationPermission, objectToSnakeCase, objectToCamelCase } from "./helpers";
import { sendEmail } from "../lib/resend";
import crypto from "crypto";

const router = Router();

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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    await db.delete(schema.managementContracts).where(and(eq(schema.managementContracts.id, req.params.id), eq(schema.managementContracts.organizationId, ctx.orgId)));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting management contract:", error);
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

// ====== OWNER PORTAL ACCESS ======

router.get("/api/owner-portal-access", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const data = await db
      .select({ ownerPortalAccess: schema.ownerPortalAccess })
      .from(schema.ownerPortalAccess)
      .innerJoin(schema.owners, eq(schema.ownerPortalAccess.ownerId, schema.owners.id))
      .where(eq(schema.owners.organizationId, ctx.orgId))
      .orderBy(desc(schema.ownerPortalAccess.createdAt));
    res.json(objectToSnakeCase(data.map(d => d.ownerPortalAccess)));
  } catch (error) {
    console.error("Error fetching owner portal access:", error);
    res.status(500).json({ error: "Fehler beim Laden der Eigentümerportal-Zugänge" });
  }
});

router.post("/api/owner-portal-access", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const parsed = schema.insertOwnerPortalAccessSchema.parse(body);
    const owner = await db
      .select()
      .from(schema.owners)
      .where(and(eq(schema.owners.id, parsed.ownerId), eq(schema.owners.organizationId, ctx.orgId)))
      .limit(1);
    if (!owner.length) return res.status(404).json({ error: "Eigentümer nicht gefunden" });
    const [created] = await db.insert(schema.ownerPortalAccess).values(parsed).returning();
    res.json(objectToSnakeCase(created));
  } catch (error) {
    console.error("Error creating owner portal access:", error);
    res.status(500).json({ error: "Fehler beim Erstellen des Eigentümerportal-Zugangs" });
  }
});

router.patch("/api/owner-portal-access/:id", async (req: Request, res: Response) => {
  try {
    const ctx = await getAuthContext(req, res);
    if (!ctx) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const body = objectToCamelCase(req.body);
    const existing = await db
      .select({ ownerPortalAccess: schema.ownerPortalAccess })
      .from(schema.ownerPortalAccess)
      .innerJoin(schema.owners, eq(schema.ownerPortalAccess.ownerId, schema.owners.id))
      .where(and(eq(schema.ownerPortalAccess.id, req.params.id), eq(schema.owners.organizationId, ctx.orgId)))
      .limit(1);
    if (!existing.length) return res.status(404).json({ error: "Nicht gefunden" });
    const [updated] = await db.update(schema.ownerPortalAccess).set({ isActive: body.isActive, updatedAt: new Date() }).where(eq(schema.ownerPortalAccess.id, req.params.id)).returning();
    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating owner portal access:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren des Eigentümerportal-Zugangs" });
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
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
    if (!(await checkMutationPermission(req, res))) return;
    if (!ctx.orgId) return res.status(403).json({ error: 'Keine Organisation zugewiesen' });
    const [deleted] = await db.delete(schema.learnedMatches).where(and(eq(schema.learnedMatches.id, req.params.id), eq(schema.learnedMatches.organizationId, ctx.orgId))).returning();
    if (!deleted) return res.status(404).json({ error: "Nicht gefunden" });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting learned match:", error);
    res.status(500).json({ error: "Fehler beim Löschen der Zuordnung" });
  }
});

// ====== PERIOD LOCKS ======

router.get("/api/period-locks", async (req: Request, res: Response) => {
  const ctx = await getAuthContext(req, res);
  if (!ctx) return;
  try {
    const { getLockedPeriods } = await import("../services/periodLockService");
    const locks = await getLockedPeriods(ctx.orgId);
    res.json(locks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/period-locks", async (req: Request, res: Response) => {
  const ctx = await getAuthContext(req, res);
  if (!ctx) return;
  if (!(await checkMutationPermission(req, res))) return;
  try {
    const { year, month } = req.body;
    if (!year || !month) return res.status(400).json({ error: "Jahr und Monat erforderlich" });
    const { lockPeriod } = await import("../services/periodLockService");
    await lockPeriod(ctx.orgId, year, month, ctx.userId);
    res.json({ success: true, message: `Periode ${month}/${year} gesperrt` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/period-locks/:year/:month", async (req: Request, res: Response) => {
  const ctx = await getAuthContext(req, res);
  if (!ctx) return;
  if (!(await checkMutationPermission(req, res))) return;
  try {
    const { unlockPeriod } = await import("../services/periodLockService");
    await unlockPeriod(ctx.orgId, parseInt(req.params.year), parseInt(req.params.month));
    res.json({ success: true, message: `Periode ${req.params.month}/${req.params.year} entsperrt` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== SETTLEMENT DEADLINES ======

router.get("/api/settlement-deadlines", async (req: Request, res: Response) => {
  const ctx = await getAuthContext(req, res);
  if (!ctx) return;
  try {
    const { checkSettlementDeadlines } = await import("../services/settlementDeadlineService");
    const warnings = await checkSettlementDeadlines(ctx.orgId);
    res.json(warnings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== COMPLIANCE CHECK ======

router.get("/api/compliance-check", async (req: Request, res: Response) => {
  const ctx = await getAuthContext(req, res);
  if (!ctx) return;
  try {
    const { runFullComplianceCheck } = await import("../services/legalComplianceService");
    const warnings = await runFullComplianceCheck(ctx.orgId);
    res.json({ warnings, checkedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== AUDIT CHAIN VERIFY ======

router.get("/api/audit-chain/verify", async (req: Request, res: Response) => {
  const ctx = await getAuthContext(req, res);
  if (!ctx) return;
  try {
    const { verifyAuditChain } = await import("../services/auditHashService");
    const result = await verifyAuditChain(ctx.orgId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ====== ADMIN DASHBOARD ENDPOINTS ======

router.get("/api/admin/organizations", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

    const [userRole] = await db.select()
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId))
      .limit(1);

    if (!userRole || userRole.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Administratoren haben Zugriff' });
    }

    const orgs = await db.select().from(schema.organizations).orderBy(desc(schema.organizations.createdAt));

    const enriched = await Promise.all(orgs.map(async (org) => {
      const [userCountResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.userOrganizations)
        .where(eq(schema.userOrganizations.organizationId, org.id));

      const [propertyCountResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.properties)
        .where(and(eq(schema.properties.organizationId, org.id), isNull(schema.properties.deletedAt)));

      const [unitCountResult] = await db.select({ count: sql<number>`count(*)::int` })
        .from(schema.units)
        .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
        .where(and(eq(schema.properties.organizationId, org.id), isNull(schema.units.deletedAt)));

      const [profileWithStripe] = await db.select({
        stripeCustomerId: schema.profiles.stripeCustomerId,
        stripeSubscriptionId: schema.profiles.stripeSubscriptionId,
      })
        .from(schema.profiles)
        .where(eq(schema.profiles.organizationId, org.id))
        .limit(1);

      return {
        ...org,
        stripeCustomerId: profileWithStripe?.stripeCustomerId || null,
        stripeSubscriptionId: profileWithStripe?.stripeSubscriptionId || null,
        userCount: userCountResult?.count || 0,
        propertyCount: propertyCountResult?.count || 0,
        unitCount: unitCountResult?.count || 0,
      };
    }));

    res.json(objectToSnakeCase(enriched));
  } catch (error) {
    console.error("Error fetching admin organizations:", error);
    res.status(500).json({ error: "Fehler beim Laden der Organisationen" });
  }
});

router.patch("/api/admin/organizations/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

    const [userRole] = await db.select()
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId))
      .limit(1);

    if (!userRole || userRole.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Administratoren haben Zugriff' });
    }

    const body = objectToCamelCase(req.body);
    const allowedFields: Record<string, any> = {};
    const allowed = ['subscriptionTier', 'subscriptionStatus', 'trialEndsAt', 'name', 'email', 'phone', 'address', 'city', 'postalCode'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        allowedFields[key] = body[key];
      }
    }

    if (Object.keys(allowedFields).length === 0) {
      return res.status(400).json({ error: 'Keine gültigen Felder zum Aktualisieren' });
    }

    allowedFields.updatedAt = new Date();

    const [updated] = await db.update(schema.organizations)
      .set(allowedFields)
      .where(eq(schema.organizations.id, req.params.id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Organisation nicht gefunden" });

    res.json(objectToSnakeCase(updated));
  } catch (error) {
    console.error("Error updating admin organization:", error);
    res.status(500).json({ error: "Fehler beim Aktualisieren der Organisation" });
  }
});

router.post("/api/admin/invitations", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

    const [userRole] = await db.select()
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId))
      .limit(1);

    if (!userRole || userRole.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Administratoren haben Zugriff' });
    }

    const body = objectToCamelCase(req.body);
    const { email, name, message: customMessage } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Gültige E-Mail-Adresse erforderlich' });
    }

    const existingProfile = await db.select().from(schema.profiles).where(eq(schema.profiles.email, email)).limit(1);
    if (existingProfile.length > 0) {
      return res.status(400).json({ error: 'Diese E-Mail-Adresse ist bereits registriert' });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(schema.demoInvites).values({
      email,
      token,
      status: 'pending',
      expiresAt,
    });

    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : 'https://www.immoflowme.at';
    const registrationUrl = `${baseUrl}/register?token=${token}&email=${encodeURIComponent(email)}`;

    let emailSent = false;
    let emailError: string | null = null;
    try {
      const emailResult = await sendEmail({
        to: email,
        subject: 'Einladung zu ImmoFlowMe - Professionelle Hausverwaltung',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #1a365d;">Einladung zu ImmoFlowMe</h1>
            <p>Hallo${name ? ` ${name}` : ''},</p>
            <p>Sie wurden eingeladen, <strong>ImmoFlowMe</strong> zu nutzen - die professionelle Hausverwaltungssoftware für Österreich.</p>
            ${customMessage ? `<p style="padding: 12px; background: #f3f4f6; border-radius: 6px; font-style: italic;">${customMessage}</p>` : ''}
            <p style="margin: 30px 0;">
              <a href="${registrationUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Jetzt registrieren
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              <strong>Was Sie erwartet:</strong>
            </p>
            <ul style="color: #666; font-size: 14px;">
              <li>MRG-konforme Hausverwaltung</li>
              <li>Automatische Rechnungsstellung</li>
              <li>SEPA-Export und Buchhaltung</li>
              <li>Mieter- und Eigentümerportale</li>
            </ul>
            <p style="color: #666; font-size: 14px;">Dieser Link ist 7 Tage gültig.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">ImmoFlowMe - Professionelle Hausverwaltung für Österreich</p>
          </div>
        `,
        text: `Einladung zu ImmoFlowMe\n\nHallo${name ? ` ${name}` : ''},\n\nSie wurden eingeladen, ImmoFlowMe zu nutzen.\n\nRegistrieren Sie sich hier: ${registrationUrl}\n\nDieser Link ist 7 Tage gültig.`
      });
      if (emailResult && !(emailResult as any).error) {
        emailSent = true;
      } else {
        emailError = (emailResult as any)?.error?.message || 'E-Mail-Versand fehlgeschlagen';
      }
    } catch (err: any) {
      console.error('[Admin] Email send failed:', err);
      emailError = err.message || 'E-Mail-Versand fehlgeschlagen';
    }

    res.json({
      success: true,
      message: emailSent 
        ? `Einladung an ${email} wurde per E-Mail versendet`
        : `Einladung erstellt, aber E-Mail konnte nicht gesendet werden: ${emailError}. Registrierungslink steht bereit.`,
      email_sent: emailSent,
      registration_url: registrationUrl,
      token,
    });
  } catch (error) {
    console.error("Error creating admin invitation:", error);
    res.status(500).json({ error: "Fehler beim Erstellen der Einladung" });
  }
});

router.get("/api/admin/stats", async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

    const [userRole] = await db.select()
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId))
      .limit(1);

    if (!userRole || userRole.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Administratoren haben Zugriff' });
    }

    const [totalOrgs] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.organizations);
    const [activeOrgs] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.organizations).where(eq(schema.organizations.subscriptionStatus, 'active'));
    const [trialOrgs] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.organizations).where(eq(schema.organizations.subscriptionStatus, 'trial'));
    const [cancelledOrgs] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.organizations).where(eq(schema.organizations.subscriptionStatus, 'cancelled'));
    const [totalProps] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.properties).where(isNull(schema.properties.deletedAt));
    const [totalUnitsResult] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.units).where(isNull(schema.units.deletedAt));
    const [totalUsers] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.profiles);

    res.json({
      total_organizations: totalOrgs?.count || 0,
      active_subscriptions: activeOrgs?.count || 0,
      trial_users: trialOrgs?.count || 0,
      cancelled: cancelledOrgs?.count || 0,
      total_properties: totalProps?.count || 0,
      total_units: totalUnitsResult?.count || 0,
      total_users: totalUsers?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: "Fehler beim Laden der Statistiken" });
  }
});

export default router;
