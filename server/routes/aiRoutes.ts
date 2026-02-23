import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { eq, and, or, sql, desc, count, isNull, lt } from "drizzle-orm";
import * as schema from "@shared/schema";
import { isAuthenticated, requireRole, getProfileFromSession, snakeToCamel, type AuthenticatedRequest } from "./helpers";
import { storage } from "../storage";
import OpenAI from "openai";
import multer from "multer";

const router = Router();

async function requireKiAutopilot(req: AuthenticatedRequest, res: Response): Promise<boolean> {
  const profile = await getProfileFromSession(req);
  if (!profile) {
    res.status(401).json({ error: "Nicht authentifiziert" });
    return false;
  }
  const roles = await storage.getUserRoles(profile.id);
  const isAdmin = roles.some((r: any) => r.role === 'admin');
  if (isAdmin || (profile as any).kiAutopilotActive) {
    return true;
  }
  res.status(403).json({ error: "KI-Autopilot ist nicht aktiviert" });
  return false;
}

const kiOcrUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilder und PDFs sind erlaubt'));
    }
  },
});

router.get("/api/user/ki-autopilot-status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile) return res.status(401).json({ error: "Nicht authentifiziert" });

    const roles = await storage.getUserRoles(profile.id);
    const isAdmin = roles.some(r => r.role === 'admin');

    res.json({
      active: isAdmin || !!(profile as any).kiAutopilotActive,
      trialEndsAt: null,
    });
  } catch (error) {
    console.error("KI Autopilot status error:", error);
    res.status(500).json({ error: "Fehler beim Abrufen des KI-Status" });
  }
});

router.post("/api/ki/chat", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(400).json({ error: "Keine Organisation gefunden" });

    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Nachricht erforderlich" });

    const orgId = profile.organizationId;
    const [propCount] = await db.select({ count: count() }).from(schema.properties).where(eq(schema.properties.organizationId, orgId));
    const [unitCount] = await db.select({ count: count() })
      .from(schema.units)
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(eq(schema.properties.organizationId, orgId));

    const tenantRows = await db.select({ count: count() })
      .from(schema.tenants)
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(eq(schema.properties.organizationId, orgId), isNull(schema.tenants.deletedAt)));

    const openInvoiceRows = await db.select({ count: count() })
      .from(schema.monthlyInvoices)
      .innerJoin(schema.units, eq(schema.monthlyInvoices.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(eq(schema.properties.organizationId, orgId), sql`${schema.monthlyInvoices.status} != 'bezahlt'`));

    const overdueRows = await db.select({ total: sql<string>`COALESCE(SUM(${schema.monthlyInvoices.gesamtbetrag}), 0)` })
      .from(schema.monthlyInvoices)
      .innerJoin(schema.units, eq(schema.monthlyInvoices.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(eq(schema.properties.organizationId, orgId), sql`${schema.monthlyInvoices.status} != 'bezahlt'`, lt(schema.monthlyInvoices.faelligAm, sql`CURRENT_DATE`)));

    const kiClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const completion = await kiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Du bist ein KI-Assistent für österreichische Hausverwaltung. Du hilfst bei Fragen zu Liegenschaften, Mietern, Zahlungen, Abrechnungen und österreichischem Mietrecht (MRG). Antworte immer auf Deutsch.

Kontext der aktuellen Organisation:
- ${propCount.count} Liegenschaften
- ${unitCount.count} Einheiten
- ${tenantRows[0].count} Mieter
- ${openInvoiceRows[0].count} offene Rechnungen
- ${overdueRows[0]?.total || '0'} EUR überfällige Zahlungen

Antworte hilfreich, präzise und in österreichischem Deutsch.`
        },
        { role: "user", content: message }
      ],
      max_tokens: 1000,
    });

    res.json({ response: completion.choices[0]?.message?.content || "Keine Antwort erhalten." });
  } catch (error) {
    console.error("KI Chat error:", error);
    res.status(500).json({ error: "Fehler bei der KI-Anfrage" });
  }
});

router.get("/api/automation/settings", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(400).json({ error: "Keine Organisation gefunden" });

    const settings = await db.select().from(schema.automationSettings)
      .where(eq(schema.automationSettings.organizationId, profile.organizationId)).limit(1);

    res.json(settings[0] || null);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Abrufen der Einstellungen" });
  }
});

router.put("/api/automation/settings", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(400).json({ error: "Keine Organisation gefunden" });

    const orgId = profile.organizationId;
    const existing = await db.select().from(schema.automationSettings)
      .where(eq(schema.automationSettings.organizationId, orgId)).limit(1);

    const data = {
      organizationId: orgId,
      autoInvoicingEnabled: req.body.autoInvoicingEnabled ?? false,
      invoicingDayOfMonth: req.body.invoicingDayOfMonth ?? 1,
      autoInvoicingEmail: req.body.autoInvoicingEmail ?? true,
      autoSepaGeneration: req.body.autoSepaGeneration ?? false,
      autoDunningEnabled: req.body.autoDunningEnabled ?? false,
      dunningDays1: req.body.dunningDays1 ?? 14,
      dunningDays2: req.body.dunningDays2 ?? 28,
      dunningDays3: req.body.dunningDays3 ?? 42,
      autoDunningEmail: req.body.autoDunningEmail ?? true,
      dunningInterestRate: req.body.dunningInterestRate ?? "4.00",
      updatedAt: new Date(),
    };

    if (existing[0]) {
      await db.update(schema.automationSettings).set(data).where(eq(schema.automationSettings.id, existing[0].id));
      const updated = await db.select().from(schema.automationSettings).where(eq(schema.automationSettings.id, existing[0].id)).limit(1);
      res.json(updated[0]);
    } else {
      const [created] = await db.insert(schema.automationSettings).values(data).returning();
      res.json(created);
    }
  } catch (error) {
    console.error("Automation settings save error:", error);
    res.status(500).json({ error: "Fehler beim Speichern der Einstellungen" });
  }
});

router.get("/api/automation/log", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.json([]);

    const logs = await db.select().from(schema.automationLog)
      .where(eq(schema.automationLog.organizationId, profile.organizationId))
      .orderBy(desc(schema.automationLog.createdAt))
      .limit(50);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Abrufen der Protokolle" });
  }
});

router.post("/api/automation/run-invoicing", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(400).json({ error: "Keine Organisation gefunden" });

    const orgId = profile.organizationId;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const activeTenants = await db.select({
      tenant: schema.tenants,
      unitId: schema.units.id,
      unitTopNummer: schema.units.topNummer,
      propertyAddress: schema.properties.address,
    })
      .from(schema.tenants)
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(
        eq(schema.properties.organizationId, orgId),
        eq(schema.tenants.status, 'aktiv'),
        isNull(schema.tenants.deletedAt)
      ));

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of activeTenants) {
      const t = row.tenant;
      try {
        const existing = await db.select({ id: schema.monthlyInvoices.id })
          .from(schema.monthlyInvoices)
          .where(and(
            eq(schema.monthlyInvoices.unitId, t.unitId),
            eq(schema.monthlyInvoices.year, year),
            eq(schema.monthlyInvoices.month, month)
          )).limit(1);

        if (existing[0]) {
          skipped++;
          continue;
        }

        const grundmieteNetto = parseFloat(t.grundmiete || '0');
        const bkNetto = parseFloat(t.betriebskostenVorschuss || '0');
        const hkNetto = parseFloat(t.heizkostenVorschuss || '0');
        const wkNetto = parseFloat(t.wasserkostenVorschuss || '0');

        const ustMiete = grundmieteNetto * 0.10;
        const ustBk = bkNetto * 0.10;
        const ustHk = hkNetto * 0.20;
        const ustWk = wkNetto * 0.10;
        const totalUst = ustMiete + ustBk + ustHk + ustWk;
        const gesamtbetrag = grundmieteNetto + bkNetto + hkNetto + wkNetto + totalUst;

        const settings = await db.select().from(schema.automationSettings)
          .where(eq(schema.automationSettings.organizationId, orgId)).limit(1);
        const dayOfMonth = settings[0]?.invoicingDayOfMonth || 5;
        const dueDay = Math.min(dayOfMonth, 28);
        const faelligAm = `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

        await db.insert(schema.monthlyInvoices).values({
          tenantId: t.id,
          unitId: t.unitId,
          year,
          month,
          grundmiete: String(grundmieteNetto),
          betriebskosten: String(bkNetto),
          heizungskosten: String(hkNetto),
          wasserkosten: String(wkNetto),
          ustSatzMiete: 10,
          ustSatzBk: 10,
          ustSatzHeizung: 20,
          ustSatzWasser: 10,
          ust: String(totalUst.toFixed(2)),
          gesamtbetrag: String(gesamtbetrag.toFixed(2)),
          status: 'offen',
          faelligAm,
        });

        created++;

        if (settings[0]?.autoInvoicingEmail && t.email && process.env.RESEND_API_KEY) {
          try {
            const { Resend } = await import('resend');
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'noreply@immoflow.me',
              to: t.email,
              subject: `Vorschreibung ${String(month).padStart(2, '0')}/${year}`,
              text: `Sehr geehrte/r ${t.firstName} ${t.lastName},\n\nIhre Vorschreibung für ${String(month).padStart(2, '0')}/${year} wurde erstellt.\n\nGesamtbetrag: \u20AC ${gesamtbetrag.toFixed(2)}\nFällig am: ${faelligAm}\n\nMit freundlichen Grüßen\nIhre Hausverwaltung`,
            });
          } catch (emailErr) {
            console.error('Email notification failed:', emailErr);
          }
        }
      } catch (err: any) {
        errors.push(`${t.firstName} ${t.lastName}: ${err.message}`);
      }
    }

    await db.update(schema.automationSettings)
      .set({ lastInvoicingRun: new Date() } as any)
      .where(eq(schema.automationSettings.organizationId, orgId));

    await db.insert(schema.automationLog).values({
      organizationId: orgId,
      type: "vorschreibung",
      status: errors.length > 0 ? "teilweise_erfolgreich" : "erfolgreich",
      details: `${created} Vorschreibungen erstellt, ${skipped} übersprungen (bereits vorhanden)${errors.length > 0 ? `, ${errors.length} Fehler` : ''}`,
      itemsProcessed: created,
    });

    res.json({
      success: true,
      created,
      skipped,
      errors: errors.length,
      message: `${created} Vorschreibungen für ${String(month).padStart(2, '0')}/${year} erstellt, ${skipped} übersprungen`,
    });
  } catch (error: any) {
    console.error("Run invoicing error:", error);
    res.status(500).json({ error: "Fehler beim Starten der Vorschreibung" });
  }
});

router.post("/api/automation/run-dunning", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(400).json({ error: "Keine Organisation gefunden" });

    const orgId = profile.organizationId;

    const settingsRows = await db.select().from(schema.automationSettings)
      .where(eq(schema.automationSettings.organizationId, orgId)).limit(1);
    const settings = settingsRows[0];
    const days1 = settings?.dunningDays1 || 14;
    const days2 = settings?.dunningDays2 || 28;
    const days3 = settings?.dunningDays3 || 42;
    const interestRate = parseFloat(settings?.dunningInterestRate || '4.00');

    const overdueInvoices = await db.select({
      invoice: schema.monthlyInvoices,
      tenantFirstName: schema.tenants.firstName,
      tenantLastName: schema.tenants.lastName,
      tenantEmail: schema.tenants.email,
      tenantId: schema.tenants.id,
    })
      .from(schema.monthlyInvoices)
      .innerJoin(schema.units, eq(schema.monthlyInvoices.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .leftJoin(schema.tenants, eq(schema.monthlyInvoices.tenantId, schema.tenants.id))
      .where(and(
        eq(schema.properties.organizationId, orgId),
        or(eq(schema.monthlyInvoices.status, 'offen'), eq(schema.monthlyInvoices.status, 'ueberfaellig')),
        lt(schema.monthlyInvoices.faelligAm, sql`CURRENT_DATE`)
      ));

    let processed = 0;
    let emailsSent = 0;
    const results: string[] = [];

    for (const row of overdueInvoices) {
      const inv = row.invoice;
      const dueDate = new Date(inv.faelligAm!);
      const today = new Date();
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      let mahnstufe = 0;
      if (daysOverdue >= days3) mahnstufe = 3;
      else if (daysOverdue >= days2) mahnstufe = 2;
      else if (daysOverdue >= days1) mahnstufe = 1;

      if (mahnstufe === 0) continue;

      const amount = parseFloat(inv.gesamtbetrag || '0');
      const yearFraction = daysOverdue / 365;
      const lateInterest = amount * (interestRate / 100) * yearFraction;

      await db.update(schema.monthlyInvoices)
        .set({ status: 'ueberfaellig' })
        .where(eq(schema.monthlyInvoices.id, inv.id));

      processed++;

      const mahnstufeText = mahnstufe === 1 ? 'Zahlungserinnerung' : mahnstufe === 2 ? '2. Mahnung' : '3. Mahnung (letzte Mahnung)';
      results.push(`${row.tenantFirstName} ${row.tenantLastName}: ${mahnstufeText} (${daysOverdue} Tage, \u20AC ${amount.toFixed(2)} + \u20AC ${lateInterest.toFixed(2)} Zinsen)`);

      if (settings?.autoDunningEmail && row.tenantEmail && process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@immoflow.me',
            to: row.tenantEmail,
            subject: `${mahnstufeText} - Offener Betrag \u20AC ${amount.toFixed(2)}`,
            text: `Sehr geehrte/r ${row.tenantFirstName} ${row.tenantLastName},\n\n` +
              `wir weisen Sie darauf hin, dass folgender Betrag seit ${daysOverdue} Tagen überfällig ist:\n\n` +
              `Offener Betrag: \u20AC ${amount.toFixed(2)}\n` +
              `Verzugszinsen (${interestRate}% p.a. gem. ABGB \u00A71333): \u20AC ${lateInterest.toFixed(2)}\n` +
              `Gesamtforderung: \u20AC ${(amount + lateInterest).toFixed(2)}\n` +
              `Fällig seit: ${dueDate.toLocaleDateString('de-AT')}\n\n` +
              `Bitte überweisen Sie den offenen Betrag umgehend.\n\n` +
              `Mit freundlichen Grüßen\nIhre Hausverwaltung`,
          });
          emailsSent++;
        } catch (emailErr) {
          console.error('Dunning email failed:', emailErr);
        }
      }
    }

    if (settings) {
      await db.update(schema.automationSettings)
        .set({ lastDunningRun: new Date() } as any)
        .where(eq(schema.automationSettings.organizationId, orgId));
    }

    await db.insert(schema.automationLog).values({
      organizationId: orgId,
      type: "mahnlauf",
      status: "erfolgreich",
      details: `${processed} Mahnungen verarbeitet, ${emailsSent} E-Mails versendet`,
      itemsProcessed: processed,
    });

    res.json({
      success: true,
      processed,
      emailsSent,
      details: results,
      message: `${processed} Mahnungen verarbeitet, ${emailsSent} E-Mails versendet`,
    });
  } catch (error: any) {
    console.error("Run dunning error:", error);
    res.status(500).json({ error: "Fehler beim Starten des Mahnlaufs" });
  }
});

router.post("/api/ki/invoice-ocr", isAuthenticated, (req: Request, res: Response, next: any) => {
  kiOcrUpload.single('file')(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload fehlgeschlagen' });
    next();
  });
}, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    const kiClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const completion = await kiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analysiere diese Rechnung und extrahiere folgende Daten im JSON-Format:
{
  "lieferant": "Name des Lieferanten/Dienstleisters",
  "rechnungsnummer": "Rechnungsnummer",
  "rechnungsdatum": "Datum im Format YYYY-MM-DD",
  "bruttobetrag": Bruttobetrag als Zahl,
  "nettobetrag": Nettobetrag als Zahl,
  "ustBetrag": USt-Betrag als Zahl,
  "ustSatz": USt-Satz als Zahl (z.B. 20),
  "beschreibung": "Kurze Beschreibung der Leistung",
  "kategorie": "Vorgeschlagene Kategorie (z.B. Reparatur, Wartung, Verwaltung, Versicherung, Betriebskosten)"
}
Antworte NUR mit dem JSON-Objekt, ohne zusätzlichen Text.`
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    } catch {
      parsed = { error: "Konnte Rechnung nicht analysieren", raw: responseText };
    }

    res.json(parsed);
  } catch (error) {
    console.error("KI Invoice OCR error:", error);
    res.status(500).json({ error: "Fehler bei der Rechnungserkennung" });
  }
});

router.post("/api/ki/invoice-ocr/confirm", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(400).json({ error: "Keine Organisation gefunden" });

    const { lieferant, rechnungsnummer, rechnungsdatum, bruttobetrag, nettobetrag, ustBetrag, ustSatz, beschreibung, kategorie, propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({ error: 'Bitte wählen Sie eine Liegenschaft aus' });
    }

    const property = await db.select().from(schema.properties)
      .where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, profile.organizationId))).limit(1);
    if (!property[0]) {
      return res.status(403).json({ error: 'Keine Berechtigung für diese Liegenschaft' });
    }

    const invoiceDate = rechnungsdatum ? new Date(rechnungsdatum) : new Date();
    const [expense] = await db.insert(schema.expenses).values({
      propertyId,
      category: 'betriebskosten_umlagefaehig',
      bezeichnung: `${lieferant || 'Rechnung'}: ${beschreibung || rechnungsnummer || 'Keine Beschreibung'}`,
      betrag: String(bruttobetrag || 0),
      datum: rechnungsdatum || new Date().toISOString().split('T')[0],
      belegNummer: rechnungsnummer || null,
      year: invoiceDate.getFullYear(),
      month: invoiceDate.getMonth() + 1,
      notizen: `KI-erkannt: Lieferant: ${lieferant}, Netto: ${nettobetrag}, USt: ${ustBetrag} (${ustSatz}%)`,
    }).returning();

    res.json(expense);
  } catch (error) {
    console.error("KI Invoice confirm error:", error);
    res.status(500).json({ error: "Fehler beim Erstellen der Buchung" });
  }
});

router.get("/api/ki/insights", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.json([]);

    const orgId = profile.organizationId;
    const insights: any[] = [];

    const overdueInvoices = await db.select({
      id: schema.monthlyInvoices.id,
      tenantId: schema.monthlyInvoices.tenantId,
      gesamtbetrag: schema.monthlyInvoices.gesamtbetrag,
      faelligAm: schema.monthlyInvoices.faelligAm,
      tenantFirstName: schema.tenants.firstName,
      tenantLastName: schema.tenants.lastName,
    })
      .from(schema.monthlyInvoices)
      .innerJoin(schema.units, eq(schema.monthlyInvoices.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .leftJoin(schema.tenants, eq(schema.monthlyInvoices.tenantId, schema.tenants.id))
      .where(and(
        eq(schema.properties.organizationId, orgId),
        or(eq(schema.monthlyInvoices.status, 'offen'), eq(schema.monthlyInvoices.status, 'ueberfaellig')),
        lt(schema.monthlyInvoices.faelligAm, sql`CURRENT_DATE - INTERVAL '14 days'`)
      ))
      .limit(20);

    for (const inv of overdueInvoices) {
      const daysOverdue = inv.faelligAm ? Math.floor((Date.now() - new Date(inv.faelligAm).getTime()) / (1000*60*60*24)) : 0;
      insights.push({
        type: 'overdue_payment',
        severity: daysOverdue > 30 ? 'critical' : 'warning',
        title: `Überfällige Zahlung${inv.tenantFirstName ? ': ' + inv.tenantFirstName + ' ' + inv.tenantLastName : ''}`,
        description: `\u20AC ${parseFloat(inv.gesamtbetrag || '0').toFixed(2)} seit ${daysOverdue} Tagen überfällig (fällig am ${inv.faelligAm})`,
        entityId: inv.id,
        entityType: 'invoice',
      });
    }

    const expiringLeases = await db.select({
      id: schema.tenants.id,
      firstName: schema.tenants.firstName,
      lastName: schema.tenants.lastName,
      mietende: schema.tenants.mietende,
    })
      .from(schema.tenants)
      .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .where(and(
        eq(schema.properties.organizationId, orgId),
        eq(schema.tenants.status, 'aktiv'),
        isNull(schema.tenants.deletedAt),
        sql`${schema.tenants.mietende} IS NOT NULL`,
        sql`${schema.tenants.mietende} <= CURRENT_DATE + INTERVAL '90 days'`,
        sql`${schema.tenants.mietende} >= CURRENT_DATE`
      ))
      .limit(20);

    for (const t of expiringLeases) {
      const daysLeft = t.mietende ? Math.floor((new Date(t.mietende).getTime() - Date.now()) / (1000*60*60*24)) : 0;
      insights.push({
        type: 'expiring_lease',
        severity: daysLeft <= 30 ? 'warning' : 'info',
        title: `Ablaufender Mietvertrag: ${t.firstName} ${t.lastName}`,
        description: `Vertrag endet am ${t.mietende} (noch ${daysLeft} Tage)`,
        entityId: t.id,
        entityType: 'tenant',
      });
    }

    const vacantUnits = await db.select({
      unitId: schema.units.id,
      topNummer: schema.units.topNummer,
      propertyAddress: schema.properties.address,
    })
      .from(schema.units)
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .leftJoin(schema.tenants, and(
        eq(schema.tenants.unitId, schema.units.id),
        eq(schema.tenants.status, 'aktiv'),
        isNull(schema.tenants.deletedAt)
      ))
      .where(and(
        eq(schema.properties.organizationId, orgId),
        isNull(schema.tenants.id)
      ))
      .limit(20);

    if (vacantUnits.length > 0) {
      insights.push({
        type: 'vacancy',
        severity: vacantUnits.length > 5 ? 'warning' : 'info',
        title: `Leerstand: ${vacantUnits.length} Einheit${vacantUnits.length > 1 ? 'en' : ''}`,
        description: vacantUnits.length <= 3
          ? `Leerstehend: ${vacantUnits.map(u => `${u.propertyAddress} Top ${u.topNummer}`).join(', ')}`
          : `${vacantUnits.length} Einheiten sind aktuell nicht vermietet`,
        entityId: null,
        entityType: 'property',
      });
    }

    const highBalanceTenants = await db.select({
      tenantId: schema.tenants.id,
      firstName: schema.tenants.firstName,
      lastName: schema.tenants.lastName,
      totalOpen: sql<string>`COALESCE(SUM(${schema.monthlyInvoices.gesamtbetrag}), 0)`,
      invoiceCount: count(),
    })
      .from(schema.monthlyInvoices)
      .innerJoin(schema.units, eq(schema.monthlyInvoices.unitId, schema.units.id))
      .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
      .innerJoin(schema.tenants, eq(schema.monthlyInvoices.tenantId, schema.tenants.id))
      .where(and(
        eq(schema.properties.organizationId, orgId),
        or(eq(schema.monthlyInvoices.status, 'offen'), eq(schema.monthlyInvoices.status, 'ueberfaellig'))
      ))
      .groupBy(schema.tenants.id, schema.tenants.firstName, schema.tenants.lastName)
      .having(sql`SUM(${schema.monthlyInvoices.gesamtbetrag}) > 500`)
      .limit(10);

    for (const t of highBalanceTenants) {
      const totalOpen = parseFloat(t.totalOpen || '0');
      insights.push({
        type: 'high_balance',
        severity: totalOpen > 2000 ? 'critical' : 'warning',
        title: `Hoher Rückstand: ${t.firstName} ${t.lastName}`,
        description: `\u20AC ${totalOpen.toFixed(2)} offen über ${t.invoiceCount} Rechnung${Number(t.invoiceCount) > 1 ? 'en' : ''}`,
        entityId: t.tenantId,
        entityType: 'tenant',
      });
    }

    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    insights.sort((a: any, b: any) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

    res.json(insights);
  } catch (error) {
    console.error("KI Insights error:", error);
    res.status(500).json({ error: "Fehler bei der Analyse" });
  }
});

router.post("/api/ki/generate-email", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) return res.status(400).json({ error: "Keine Organisation gefunden" });

    const { template, tenantId, propertyId, notes } = req.body;
    if (!template) return res.status(400).json({ error: "Vorlage erforderlich" });

    if (tenantId) {
      const tenant = await db.select().from(schema.tenants)
        .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
        .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
        .where(and(eq(schema.tenants.id, tenantId), eq(schema.properties.organizationId, profile.organizationId))).limit(1);
      if (!tenant[0]) {
        return res.status(403).json({ error: 'Keine Berechtigung für diesen Mieter' });
      }
    }

    if (propertyId) {
      const property = await db.select().from(schema.properties)
        .where(and(eq(schema.properties.id, propertyId), eq(schema.properties.organizationId, profile.organizationId))).limit(1);
      if (!property[0]) {
        return res.status(403).json({ error: 'Keine Berechtigung für diese Liegenschaft' });
      }
    }

    let tenantInfo = '';
    if (tenantId) {
      const tenantWithUnit = await db.select({
        tenant: schema.tenants,
        unit: schema.units,
        property: schema.properties,
      }).from(schema.tenants)
        .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
        .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
        .where(eq(schema.tenants.id, tenantId)).limit(1);
      if (tenantWithUnit[0]) {
        const t = tenantWithUnit[0];
        tenantInfo = `Mieter: ${t.tenant.firstName} ${t.tenant.lastName}, Adresse: ${t.property.address || 'k.A.'}`;
      }
    }

    let propertyInfo = '';
    if (propertyId) {
      const property = await db.select().from(schema.properties).where(eq(schema.properties.id, propertyId)).limit(1);
      if (property[0]) {
        propertyInfo = `Liegenschaft: ${property[0].address}, ${property[0].city}`;
      }
    }

    const templateMap: Record<string, string> = {
      mieterhoehung: 'Mieterhöhung gemäß MRG',
      kuendigung: 'Kündigung des Mietverhältnisses',
      bk_info: 'Information zur Betriebskostenabrechnung',
      mahnung: 'Zahlungserinnerung / Mahnung',
      wartung: 'Ankündigung von Wartungsarbeiten',
      allgemein: 'Allgemeine Mitteilung',
    };

    const kiClient = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const completion = await kiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Du bist ein Assistent für österreichische Hausverwaltung. Erstelle professionelle E-Mails auf Deutsch (österreichisches Deutsch). Die E-Mails müssen höflich, rechtlich korrekt und MRG-konform sein.`
        },
        {
          role: "user",
          content: `Erstelle eine E-Mail zum Thema: ${templateMap[template] || template}
${tenantInfo}
${propertyInfo}
${notes ? `Zusätzliche Hinweise: ${notes}` : ''}

Antworte im JSON-Format: { "subject": "Betreff", "body": "E-Mail-Text" }`
        }
      ],
      max_tokens: 800,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
    } catch {
      parsed = { subject: templateMap[template] || 'Mitteilung', body: responseText };
    }

    res.json(parsed);
  } catch (error) {
    console.error("KI Email generation error:", error);
    res.status(500).json({ error: "Fehler bei der E-Mail-Generierung" });
  }
});

router.post("/api/ki/send-email", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    if (!(await requireKiAutopilot(req, res))) return;

    const profile = await getProfileFromSession(req);
    const { to, subject, body, tenantId } = req.body;
    if (!to || !subject || !body) return res.status(400).json({ error: "Empfänger, Betreff und Text erforderlich" });

    if (tenantId && profile?.organizationId) {
      const tenant = await db.select().from(schema.tenants)
        .innerJoin(schema.units, eq(schema.tenants.unitId, schema.units.id))
        .innerJoin(schema.properties, eq(schema.units.propertyId, schema.properties.id))
        .where(and(eq(schema.tenants.id, tenantId), eq(schema.properties.organizationId, profile.organizationId))).limit(1);
      if (!tenant[0]) {
        return res.status(403).json({ error: 'Keine Berechtigung für diesen Mieter' });
      }
    }

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@immoflow.me',
        to,
        subject,
        text: body,
      });
    }

    res.json({ success: true, message: "E-Mail gesendet" });
  } catch (error) {
    console.error("KI Send email error:", error);
    res.status(500).json({ error: "Fehler beim Senden der E-Mail" });
  }
});

export default router;
