import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, or, sql, lt } from "drizzle-orm";
import { isAuthenticated, requireRole, getProfileFromSession, snakeToCamel } from "./helpers";
import { automatedDunningService } from "../services/automatedDunningService";
import { vpiAutomationService } from "../services/vpiAutomationService";
import { maintenanceReminderService } from "../services/maintenanceReminderService";

const router = Router();

router.get("/api/dunning-overview", isAuthenticated, async (req: any, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }

    const overdueInvoices = await db.select({
      invoice: schema.monthlyInvoices,
      tenant: schema.tenants,
      unit: schema.units,
      property: schema.properties,
    })
      .from(schema.monthlyInvoices)
      .innerJoin(schema.tenants, eq(schema.monthlyInvoices.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(
        eq(schema.properties.organizationId, profile.organizationId),
        or(
          eq(schema.monthlyInvoices.status, 'offen'),
          eq(schema.monthlyInvoices.status, 'teilbezahlt'),
          eq(schema.monthlyInvoices.status, 'ueberfaellig')
        ),
        lt(schema.monthlyInvoices.faelligAm, new Date().toISOString().split('T')[0])
      ));

    const tenantMap = new Map<string, any>();

    for (const row of overdueInvoices) {
      const tid = row.tenant.id;
      if (!tenantMap.has(tid)) {
        tenantMap.set(tid, {
          tenantId: tid,
          tenantName: `${row.tenant.firstName || ''} ${row.tenant.lastName || ''}`.trim(),
          email: row.tenant.email || null,
          phone: row.tenant.phone || null,
          propertyId: row.property.id,
          propertyName: row.property.name || '',
          unitId: row.unit.id,
          unitNumber: row.unit.topNummer || '',
          invoices: [],
          totalAmount: 0,
          highestMahnstufe: 0,
          oldestOverdue: row.invoice.faelligAm,
        });
      }
      const entry = tenantMap.get(tid)!;
      const invAmount = Number(row.invoice.gesamtbetrag || 0) - Number(row.invoice.paidAmount || 0);
      entry.invoices.push({
        id: row.invoice.id,
        month: row.invoice.month,
        year: row.invoice.year,
        gesamtbetrag: Number(row.invoice.gesamtbetrag || 0),
        faellig_am: row.invoice.faelligAm,
        mahnstufe: row.invoice.mahnstufe || 0,
        zahlungserinnerung_am: (row.invoice as any).zahlungserinnerungAm || null,
        mahnung_am: (row.invoice as any).mahnungAm || null,
      });
      entry.totalAmount += invAmount;
      if ((row.invoice.mahnstufe || 0) > entry.highestMahnstufe) {
        entry.highestMahnstufe = row.invoice.mahnstufe || 0;
      }
      if (row.invoice.faelligAm && (!entry.oldestOverdue || row.invoice.faelligAm < entry.oldestOverdue)) {
        entry.oldestOverdue = row.invoice.faelligAm;
      }
    }

    const cases = Array.from(tenantMap.values());
    const stats = {
      totalCases: cases.length,
      totalOpen: cases.filter(c => c.highestMahnstufe === 0).length,
      totalReminded: cases.filter(c => c.highestMahnstufe === 1).length,
      totalDunned: cases.filter(c => c.highestMahnstufe >= 2).length,
      totalAmount: Math.round(cases.reduce((s, c) => s + c.totalAmount, 0) * 100) / 100,
    };

    res.json({ cases, stats });
  } catch (error) {
    console.error("Error fetching dunning overview:", error);
    res.status(500).json({ error: "Fehler beim Laden der Mahnübersicht" });
  }
});

router.post("/api/dunning/send", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const body = snakeToCamel(req.body);
    const { invoiceId, dunningLevel, tenantEmail, tenantName, propertyName, unitNumber, amount, dueDate } = body;

    if (!invoiceId || !tenantEmail) {
      return res.status(400).json({ error: "invoiceId und tenantEmail sind erforderlich" });
    }

    const invoiceWithOrg = await db.select({
      invoice: schema.monthlyInvoices,
      orgId: schema.properties.organizationId,
    })
      .from(schema.monthlyInvoices)
      .innerJoin(schema.tenants, eq(schema.monthlyInvoices.tenantId, schema.tenants.id))
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(
        eq(schema.monthlyInvoices.id, invoiceId),
        eq(schema.properties.organizationId, profile.organizationId)
      ))
      .limit(1);
    if (!invoiceWithOrg.length) return res.status(404).json({ error: "Rechnung nicht gefunden" });

    const invoice = [invoiceWithOrg[0].invoice];
    const newLevel = dunningLevel || ((invoice[0].mahnstufe || 0) + 1);

    const levelLabels: Record<number, string> = { 1: 'Zahlungserinnerung', 2: '1. Mahnung', 3: '2. Mahnung' };
    const levelLabel = levelLabels[newLevel] || 'Zahlungserinnerung';
    const subject = `${levelLabel} - Offener Betrag für ${propertyName || 'Ihre Wohnung'}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif;">
        <h2>${levelLabel}</h2>
        <p>Sehr geehrte(r) ${tenantName || 'Mieter/in'},</p>
        <p>für Ihre Wohnung in der ${propertyName || ''} (${unitNumber || ''}) besteht noch ein offener Betrag:</p>
        <p><strong>Offener Betrag: ${new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(amount || 0)}</strong></p>
        ${newLevel >= 2 ? `<p>Gemäß § 1333 ABGB sind wir berechtigt, Verzugszinsen in Höhe von 4% p.a. zu berechnen.</p>` : ''}
        ${newLevel >= 3 ? `<p><strong style="color: red;">Dies ist die letzte Mahnung vor Einleitung rechtlicher Schritte.</strong></p>` : ''}
        <p>Mit freundlichen Grüßen,<br>Ihre Hausverwaltung</p>
      </div>
    `;

    const { sendEmail } = await import("../lib/resend");
    await sendEmail({ to: tenantEmail, subject, html: htmlBody });

    await db.update(schema.monthlyInvoices).set({
      mahnstufe: newLevel,
      status: 'ueberfaellig',
    }).where(eq(schema.monthlyInvoices.id, invoiceId));

    res.json({ success: true, message: `${levelLabel} an ${tenantEmail} gesendet` });
  } catch (error) {
    console.error("Error sending dunning:", error);
    res.status(500).json({ error: "Fehler beim Versenden der Mahnung" });
  }
});

router.get("/api/dunning/check", isAuthenticated, async (req: any, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const actions = await automatedDunningService.checkOverdueInvoices(profile.organizationId);
    res.json({ actions });
  } catch (error) {
    res.status(500).json({ error: "Failed to check dunning" });
  }
});

router.post("/api/dunning/process", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const normalizedBody = snakeToCamel(req.body);
    const { sendEmails } = normalizedBody;
    const result = await automatedDunningService.processAutomatedDunning(
      profile.organizationId,
      sendEmails === true
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to process dunning" });
  }
});

router.get("/api/vpi/values", isAuthenticated, async (req: any, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, year, month, value, source, created_at, updated_at
      FROM vpi_values ORDER BY year DESC, month DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("VPI values error:", error);
    res.status(500).json({ error: "Fehler beim Laden der VPI-Werte" });
  }
});

router.post("/api/vpi/values", isAuthenticated, requireRole("admin", "finance"), async (req: any, res) => {
  try {
    const { year, month, value, source } = req.body;
    if (!year || !month || value === undefined) {
      return res.status(400).json({ error: "Jahr, Monat und Wert sind erforderlich" });
    }
    const result = await db.execute(sql`
      INSERT INTO vpi_values (year, month, value, source)
      VALUES (${year}, ${month}, ${value}, ${source || 'manual'})
      ON CONFLICT (year, month) DO UPDATE SET value = EXCLUDED.value, source = EXCLUDED.source, updated_at = NOW()
      RETURNING *
    `);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("VPI value create error:", error);
    res.status(500).json({ error: "Fehler beim Speichern des VPI-Werts" });
  }
});

router.delete("/api/vpi/values/:id", isAuthenticated, requireRole("admin"), async (req: any, res) => {
  try {
    await db.execute(sql`DELETE FROM vpi_values WHERE id = ${req.params.id}::uuid`);
    res.json({ success: true });
  } catch (error) {
    console.error("VPI value delete error:", error);
    res.status(500).json({ error: "Fehler beim Löschen des VPI-Werts" });
  }
});

router.get("/api/vpi/check-adjustments", isAuthenticated, async (req: any, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const adjustments = await vpiAutomationService.checkVpiAdjustments(profile.organizationId);
    res.json({ adjustments });
  } catch (error) {
    res.status(500).json({ error: "Failed to check VPI adjustments" });
  }
});

router.post("/api/vpi/apply", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const normalizedBody = snakeToCamel(req.body);
    const { tenantId, newRent, currentVpiValue, effectiveDate } = normalizedBody;
    const result = await vpiAutomationService.applyVpiAdjustment(
      profile.organizationId,
      tenantId,
      newRent,
      currentVpiValue,
      effectiveDate
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to apply VPI adjustment" });
  }
});

router.get("/api/maintenance/reminders", isAuthenticated, async (req: any, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const reminders = await maintenanceReminderService.checkMaintenanceReminders(profile.organizationId);
    res.json({ reminders });
  } catch (error) {
    res.status(500).json({ error: "Failed to check maintenance reminders" });
  }
});

router.post("/api/maintenance/send-reminders", isAuthenticated, requireRole("property_manager"), async (req: any, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const normalizedBody = snakeToCamel(req.body);
    const { managerEmail } = normalizedBody;
    const result = await maintenanceReminderService.sendMaintenanceReminders(
      profile.organizationId,
      managerEmail
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to send maintenance reminders" });
  }
});

export default router;
