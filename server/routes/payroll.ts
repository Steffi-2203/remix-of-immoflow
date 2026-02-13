import { Router } from "express";
import { db } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { propertyEmployees, payrollEntries, eldaSubmissions } from "@shared/schema/payroll";
import { organizations } from "@shared/schema/organizations";
import {
  calculatePayroll,
  generateEldaAnmeldungXml,
  generateEldaAbmeldungXml,
  generateBeitragsgrundlageXml,
} from "../services/eldaPayrollService";

const router = Router();

// Helper: get org ID from session
function getOrgId(req: any): string | null {
  return req.session?.organizationId || req.headers['x-organization-id'] as string || null;
}

// ── Employees CRUD ───────────────────────────────────────────────────────

router.get("/api/employees", async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    const employees = await db
      .select()
      .from(propertyEmployees)
      .where(eq(propertyEmployees.organizationId, orgId))
      .orderBy(propertyEmployees.nachname);

    res.json(employees);
  } catch (err) { next(err); }
});

router.post("/api/employees", async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    const [employee] = await db
      .insert(propertyEmployees)
      .values({ ...req.body, organizationId: orgId })
      .returning();

    res.status(201).json(employee);
  } catch (err) { next(err); }
});

router.put("/api/employees/:id", async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    const [updated] = await db
      .update(propertyEmployees)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(propertyEmployees.id, req.params.id), eq(propertyEmployees.organizationId, orgId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Mitarbeiter nicht gefunden" });
    res.json(updated);
  } catch (err) { next(err); }
});

router.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    // Soft delete: set status to ausgeschieden
    const [updated] = await db
      .update(propertyEmployees)
      .set({ status: 'ausgeschieden', austrittsdatum: new Date().toISOString().slice(0, 10), updatedAt: new Date() })
      .where(and(eq(propertyEmployees.id, req.params.id), eq(propertyEmployees.organizationId, orgId)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Mitarbeiter nicht gefunden" });
    res.json(updated);
  } catch (err) { next(err); }
});

// ── Payroll ──────────────────────────────────────────────────────────────

router.get("/api/payroll/:employeeId/:year", async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    const entries = await db
      .select()
      .from(payrollEntries)
      .where(and(
        eq(payrollEntries.employeeId, req.params.employeeId),
        eq(payrollEntries.year, parseInt(req.params.year)),
        eq(payrollEntries.organizationId, orgId),
      ))
      .orderBy(payrollEntries.month);

    res.json(entries);
  } catch (err) { next(err); }
});

router.post("/api/payroll/calculate", async (req, res, next) => {
  try {
    const { employeeId, year, month } = req.body;
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    // Fetch employee
    const [emp] = await db
      .select()
      .from(propertyEmployees)
      .where(and(eq(propertyEmployees.id, employeeId), eq(propertyEmployees.organizationId, orgId)));

    if (!emp) return res.status(404).json({ error: "Mitarbeiter nicht gefunden" });

    const result = calculatePayroll(
      parseFloat(emp.bruttolohnMonatlich?.toString() || '0'),
      emp.beschaeftigungsart as 'geringfuegig' | 'teilzeit' | 'vollzeit',
    );

    // Upsert payroll entry
    const existing = await db
      .select()
      .from(payrollEntries)
      .where(and(
        eq(payrollEntries.employeeId, employeeId),
        eq(payrollEntries.year, year),
        eq(payrollEntries.month, month),
      ));

    let entry;
    if (existing.length > 0 && existing[0].status === 'entwurf') {
      [entry] = await db
        .update(payrollEntries)
        .set({
          bruttolohn: result.bruttolohn.toString(),
          svDn: result.sv_dn.toString(),
          svDg: result.sv_dg.toString(),
          lohnsteuer: result.lohnsteuer.toString(),
          dbBeitrag: result.db_beitrag.toString(),
          dzBeitrag: result.dz_beitrag.toString(),
          kommunalsteuer: result.kommunalsteuer.toString(),
          mvkBeitrag: result.mvk_beitrag.toString(),
          nettolohn: result.nettolohn.toString(),
          gesamtkostenDg: result.gesamtkosten_dg.toString(),
        })
        .where(eq(payrollEntries.id, existing[0].id))
        .returning();
    } else if (existing.length === 0) {
      [entry] = await db
        .insert(payrollEntries)
        .values({
          employeeId,
          organizationId: orgId,
          year,
          month,
          bruttolohn: result.bruttolohn.toString(),
          svDn: result.sv_dn.toString(),
          svDg: result.sv_dg.toString(),
          lohnsteuer: result.lohnsteuer.toString(),
          dbBeitrag: result.db_beitrag.toString(),
          dzBeitrag: result.dz_beitrag.toString(),
          kommunalsteuer: result.kommunalsteuer.toString(),
          mvkBeitrag: result.mvk_beitrag.toString(),
          nettolohn: result.nettolohn.toString(),
          gesamtkostenDg: result.gesamtkosten_dg.toString(),
        })
        .returning();
    } else {
      return res.status(409).json({ error: "Abrechnung bereits freigegeben" });
    }

    res.json({ ...entry, calculation: result });
  } catch (err) { next(err); }
});

router.post("/api/payroll/finalize", async (req, res, next) => {
  try {
    const { entryId } = req.body;
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    const [entry] = await db
      .update(payrollEntries)
      .set({ status: 'freigegeben' })
      .where(and(eq(payrollEntries.id, entryId), eq(payrollEntries.organizationId, orgId)))
      .returning();

    if (!entry) return res.status(404).json({ error: "Abrechnung nicht gefunden" });
    res.json(entry);
  } catch (err) { next(err); }
});

// ── ELDA ─────────────────────────────────────────────────────────────────

router.get("/api/elda/generate/:employeeId", async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    const meldungsart = (req.query.meldungsart as string) || 'anmeldung';

    const [emp] = await db.select().from(propertyEmployees)
      .where(and(eq(propertyEmployees.id, req.params.employeeId), eq(propertyEmployees.organizationId, orgId)));
    if (!emp) return res.status(404).json({ error: "Mitarbeiter nicht gefunden" });

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));

    const empData = {
      vorname: emp.vorname,
      nachname: emp.nachname,
      svnr: emp.svnr || '',
      geburtsdatum: emp.geburtsdatum || '',
      adresse: emp.adresse || '',
      plz: emp.plz || '',
      ort: emp.ort || '',
      eintrittsdatum: emp.eintrittsdatum,
      austrittsdatum: emp.austrittsdatum || undefined,
      beschaeftigungsart: emp.beschaeftigungsart,
      bruttolohn_monatlich: parseFloat(emp.bruttolohnMonatlich?.toString() || '0'),
    };

    let xml: string;
    if (meldungsart === 'abmeldung') {
      xml = generateEldaAbmeldungXml(empData, { name: org?.name || '' });
    } else {
      xml = generateEldaAnmeldungXml(empData, { name: org?.name || '' });
    }

    res.json({ xml, meldungsart });
  } catch (err) { next(err); }
});

router.get("/api/elda/submissions", async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    const submissions = await db
      .select()
      .from(eldaSubmissions)
      .where(eq(eldaSubmissions.organizationId, orgId))
      .orderBy(desc(eldaSubmissions.createdAt));

    res.json(submissions);
  } catch (err) { next(err); }
});

router.post("/api/elda/submit", async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(401).json({ error: "Nicht authentifiziert" });

    const [submission] = await db
      .insert(eldaSubmissions)
      .values({ ...req.body, organizationId: orgId })
      .returning();

    res.status(201).json(submission);
  } catch (err) { next(err); }
});

export function registerPayrollRoutes(app: any) {
  app.use(router);
}
