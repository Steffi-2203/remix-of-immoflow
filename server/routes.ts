import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, sql, desc, asc, count, or, isNull, gte, lte, inArray, ne, ilike } from "drizzle-orm";
import * as schema from "@shared/schema";
import { isAuthenticated, requireRole, requireMutationAccess, requireFinanceAccess, requireAdminAccess, getUserRoles, getProfileFromSession, isTester, maskPersonalData } from "./routes/helpers";
import { registerFunctionRoutes } from "./functions";
import { registerStripeRoutes } from "./stripeRoutes";
import { jobQueueService } from "./services/jobQueueService";
import { apiErrorHandler as globalErrorHandler } from "./lib/apiErrors";
import multer from "multer";
import OpenAI from "openai";
import propertyRoutes from "./routes/propertyRoutes";
import tenantRoutes from "./routes/tenantRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import accountingRoutes from "./routes/accountingRoutes";
import ebicsRoutes from "./routes/ebicsRoutes";
import openItemsRoutes from "./routes/openItemsRoutes";
import fiscalYearRoutes from "./routes/fiscalYearRoutes";
import searchRoutes from "./routes/searchRoutes";
import bulkRoutes from "./routes/bulkRoutes";
import kautionRoutes from "./routes/kautionRoutes";
import wegReportRoutes from "./routes/wegReportRoutes";
import eaRechnungRoutes from "./routes/eaRechnungRoutes";
import heatingSettlementRoutes from "./routes/heatingSettlementRoutes";
import heatBillingRoutes from "./routes/heatBillingRoutes";
import richtwertRoutes from "./routes/richtwertRoutes";
import activityRoutes from "./routes/activityRoutes";
import featureRoutes from "./routes/featureRoutes";
import { registerPushRoutes } from "./routes/pushRoutes";
import * as demoService from "./services/demoService";
import authProfileRoutes from "./routes/authProfileRoutes";
import aiRoutes from "./routes/aiRoutes";
import { registerScheduledReportRoutes } from "./routes/scheduledReportRoutes";
import { registerDocumentRoutes } from "./routes/documentRoutes";
import { registerAutomationRoutes } from "./routes/automationRoutes";
import { registerTwoFactorRoutes } from "./routes/twoFactorRoutes";
import { registerSignatureRoutes } from "./routes/signatureRoutes";
import { registerQueryBuilderRoutes } from "./routes/queryBuilderRoutes";
import keyRoutes from "./routes/keyRoutes";
import budgetRoutes from "./routes/budgetRoutes";
import ownerRoutes from "./routes/ownerRoutes";
import sepaRoutes from "./routes/sepaRoutes";
import dunningRoutes from "./routes/dunningRoutes";
import { reportSchedules } from "@shared/schema";
import { sendScheduledReport, parseNextRun } from "./services/scheduledReportsService";

function startScheduledReportChecker() {
  const INTERVAL_MS = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      const now = new Date();
      const dueSchedules = await db.select().from(reportSchedules)
        .where(and(
          eq(reportSchedules.isActive, true),
          lte(reportSchedules.nextRun, now)
        ));

      for (const schedule of dueSchedules) {
        try {
          await sendScheduledReport(
            schedule.organizationId,
            schedule.reportType,
            schedule.recipients,
            schedule.propertyId || undefined
          );

          const nextRun = parseNextRun(schedule.schedule, now);
          await db.update(reportSchedules)
            .set({ lastRun: now, nextRun })
            .where(eq(reportSchedules.id, schedule.id));

          console.log(`[ScheduledReports] Executed schedule ${schedule.id} (${schedule.reportType})`);
        } catch (err) {
          console.error(`[ScheduledReports] Error executing schedule ${schedule.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[ScheduledReports] Checker error:', err);
    }
  }, INTERVAL_MS);
  console.log(`[ScheduledReports] Checker started (every ${INTERVAL_MS / 1000}s)`);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(propertyRoutes);
  app.use(tenantRoutes);
  app.use(paymentRoutes);
  app.use(accountingRoutes);
  app.use(ebicsRoutes);
  app.use(openItemsRoutes);
  app.use(fiscalYearRoutes);
  app.use(searchRoutes);
  app.use(bulkRoutes);
  app.use(kautionRoutes);
  app.use(wegReportRoutes);
  app.use(eaRechnungRoutes);
  app.use(heatingSettlementRoutes);
  app.use(heatBillingRoutes);
  app.use(richtwertRoutes);
  app.use(activityRoutes);
  app.use(featureRoutes);
  app.use(authProfileRoutes);
  app.use(aiRoutes);
  app.use(keyRoutes);
  app.use(budgetRoutes);
  app.use(ownerRoutes);
  app.use(sepaRoutes);
  app.use(dunningRoutes);
  registerPushRoutes(app);
  registerDocumentRoutes(app);
  registerAutomationRoutes(app);
  registerTwoFactorRoutes(app);
  registerSignatureRoutes(app);
  registerQueryBuilderRoutes(app);

  // ===== Storage Endpoints =====
  app.post("/api/storage/signed-url", isAuthenticated, requireMutationAccess(), async (req: any, res) => {
    try {
      const normalizedBody = snakeToCamel(req.body);
      const { bucket, filePath, expiresIn } = normalizedBody;
      // For now, return the direct path since we're not using external storage
      // In production, this would generate a signed URL from the storage provider
      const signedUrl = `/api/storage/files/${bucket}/${filePath}`;
      res.json({ signedUrl });
    } catch (error) {
      console.error('Signed URL error:', error);
      res.status(500).json({ error: "Failed to generate signed URL" });
    }
  });

  app.post("/api/storage/upload", isAuthenticated, requireMutationAccess(), async (req: any, res) => {
    try {
      const { ObjectStorageService } = await import("./replit_integrations/object_storage");
      const oss = new ObjectStorageService();
      const uploadURL = await oss.getObjectEntityUploadURL();
      const objectPath = oss.normalizeObjectEntityPath(uploadURL);
      res.json({ 
        success: true, 
        uploadURL,
        objectPath,
        path: objectPath,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Demo Access Routes (public - no auth required)
  app.post("/api/demo/request", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: "Gültige E-Mail-Adresse erforderlich" });
      }
      
      const ipAddress = req.headers['x-forwarded-for']?.toString() || req.ip;
      const userAgent = req.headers['user-agent'];
      
      const result = await demoService.requestDemoAccess(email, ipAddress, userAgent);
      
      if (result.success) {
        res.json({ 
          message: result.message,
          activationUrl: result.activationUrl
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error('Demo request error:', error);
      res.status(500).json({ error: "Fehler beim Erstellen der Demo-Anfrage" });
    }
  });

  app.get("/api/demo/validate", async (req: Request, res: Response) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ valid: false, error: "Token fehlt" });
      }
      
      const [invite] = await db.select()
        .from(schema.demoInvites)
        .where(eq(schema.demoInvites.token, token))
        .limit(1);
      
      if (!invite) {
        return res.json({ valid: false, error: "Ungültiger Demo-Link" });
      }
      
      if (invite.status !== 'pending') {
        return res.json({ valid: false, error: "Dieser Demo-Link wurde bereits verwendet" });
      }
      
      if (new Date() > invite.expiresAt) {
        return res.json({ valid: false, error: "Dieser Demo-Link ist abgelaufen" });
      }
      
      res.json({ valid: true, email: invite.email });
    } catch (error) {
      console.error('Demo validate error:', error);
      res.status(500).json({ valid: false, error: "Validierungsfehler" });
    }
  });

  app.post("/api/demo/activate", async (req: Request, res: Response) => {
    try {
      const { token, fullName, password } = req.body;
      
      if (!token || !fullName || !password) {
        return res.status(400).json({ error: "Alle Felder sind erforderlich" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Passwort muss mindestens 6 Zeichen haben" });
      }
      
      const result = await demoService.activateDemo(token, fullName, password);
      
      if (result.success && result.userId) {
        // Auto-login the user
        req.session.userId = result.userId;
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
          }
        });
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error('Demo activate error:', error);
      res.status(500).json({ error: "Fehler beim Aktivieren der Demo" });
    }
  });

  app.get("/api/demo/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const status = await demoService.getDemoStatus(userId);
      res.json(status);
    } catch (error) {
      console.error('Demo status error:', error);
      res.status(500).json({ error: "Fehler beim Abrufen des Demo-Status" });
    }
  });

  // Admin: Send demo invitation directly
  app.post("/api/admin/demo/invite", isAuthenticated, requireAdminAccess(), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      // Check if user is admin
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren können Demo-Einladungen versenden" });
      }
      
      const { email, name } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: "Gültige E-Mail-Adresse erforderlich" });
      }
      
      const result = await demoService.requestDemoAccess(email);
      
      if (result.success) {
        res.json({ 
          message: `Demo-Einladung an ${email} gesendet`,
          activationUrl: result.activationUrl
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error('Admin demo invite error:', error);
      res.status(500).json({ error: "Fehler beim Versenden der Einladung" });
    }
  });

  // Admin: List all demo invitations
  app.get("/api/admin/demo/invites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }
      
      const invites = await db.select()
        .from(schema.demoInvites)
        .orderBy(desc(schema.demoInvites.createdAt))
        .limit(50);
      
      res.json(invites);
    } catch (error) {
      console.error('Admin demo invites list error:', error);
      res.status(500).json({ error: "Fehler beim Laden der Einladungen" });
    }
  });

  // Admin: Delete a demo invitation
  app.delete("/api/admin/demo/invites/:id", isAuthenticated, requireAdminAccess(), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren können Demo-Einladungen löschen" });
      }
      
      await db.delete(schema.demoInvites)
        .where(eq(schema.demoInvites.id, id));
      
      res.json({ message: "Einladung gelöscht" });
    } catch (error) {
      console.error('Admin demo invite delete error:', error);
      res.status(500).json({ error: "Fehler beim Löschen der Einladung" });
    }
  });

  // OCR tenant extraction route
  const ocrUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Nur Bilder (JPG, PNG) und PDFs sind erlaubt'));
      }
    },
  });

  const ocrClient = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  app.post("/api/ocr/tenant", isAuthenticated, requireRole("property_manager"), (req: Request, res: Response, next: any) => {
    ocrUpload.single('file')(req, res, (err: any) => {
      if (err) {
        console.error('Multer upload error:', err);
        return res.status(400).json({ message: err.message || 'Datei-Upload fehlgeschlagen' });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Keine Datei hochgeladen' });
      }

      if (req.file.mimetype === 'application/pdf') {
        return res.status(400).json({ 
          message: 'PDFs müssen im Browser konvertiert werden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.' 
        });
      }

      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      const imageUrl = `data:${mimeType};base64,${base64Image}`;

      const extractionPrompt = `Du bist ein Experte für österreichische Immobilienverwaltung und Mietverträge.
Analysiere dieses Dokument (Mietvertrag, Vorschreibung, Mieterliste oder ähnliches) und extrahiere ALLE Mieterdaten.

WICHTIG: 
- Extrahiere ALLE Mieter die im Dokument vorkommen, nicht nur den ersten!
- ALLE Beträge sind NETTOBETRÄGE (ohne USt)!
- JEDE Kostenposition EINZELN erfassen (NICHT zusammenfassen!) - wegen unterschiedlicher Verteilerschlüssel
- USt-Satz pro Position erfassen: Heizung = 20%, Wohnungen BK = 10%, Geschäftslokale = 20%

Antworte im JSON-Format als ARRAY von Mietern:
{
  "tenants": [
    {
      "firstName": "Vorname des Mieters",
      "lastName": "Nachname des Mieters",
      "email": "E-Mail-Adresse (falls vorhanden)",
      "phone": "Telefonnummer (falls vorhanden)",
      "mietbeginn": "Mietbeginn im Format YYYY-MM-DD",
      "grundmiete": Hauptmietzins NETTO als Zahl,
      "grundmieteUst": USt-Satz als Zahl (10 für Wohnung, 20 für Geschäft),
      "betriebskostenVorschuss": 0,
      "heizkostenVorschuss": 0,
      "wasserkostenVorschuss": 0,
      "warmwasserkostenVorschuss": 0,
      "sonstigeKosten": {
        "Positionsname": { "betrag": NETTO-Betrag, "ust": USt-Satz, "schluessel": "Verteilerschlüssel" },
        ...
      },
      "kaution": Kaution als Zahl (falls angegeben),
      "topNummer": "Wohnungs-/Einheitsnummer (z.B. Top 1, GE01, 001)",
      "address": "Adresse der Wohnung",
      "nutzungsart": "Wohnung" oder "Geschäftslokal",
      "notes": "Weitere relevante Informationen (kurz)"
    }
  ]
}

KRITISCH - JEDE Kostenposition EINZELN in sonstigeKosten erfassen MIT Verteilerschlüssel:
- "Betriebskosten": { "betrag": 73.42, "ust": 10, "schluessel": "Betriebskosten 01" }
- "Betriebskosten2": { "betrag": 65.89, "ust": 10, "schluessel": "Betriebskosten inkl Stellplätze" }
- "Kaltwasser": { "betrag": 43.93, "ust": 10, "schluessel": "Betriebskosten 01" }
- "Warmwasser": { "betrag": 12.01, "ust": 10, "schluessel": "Direktwert" }
- "Zentralheizung": { "betrag": 44.79, "ust": 20, "schluessel": "Zentralheizung" }
- "Lift": { "betrag": 13.81, "ust": 10, "schluessel": "BK Lift" }
- "Garage": { "betrag": 85.00, "ust": 20, "schluessel": "Direktwert" }
- "Mahnkosten": { "betrag": 15.00, "ust": 0, "schluessel": "Direktwert" }

Typische Verteilerschlüssel in österreichischen Vorschreibungen:
- "Direktwert" = fixer Betrag pro Mieter
- "Betriebskosten 01", "Betriebskosten 02" = nach Nutzfläche/Einheiten
- "Betriebskosten inkl Stellplätze" = inkl. Stellplätze nach Einheiten
- "Zentralheizung" = nach Heizungsverbrauch
- "BK Lift" = Liftkosten nach m²
- "Einheiten" = nach Anzahl Einheiten

Weitere mögliche Positionen: Müll, Kabel-TV, Internet, Strom, Versicherung, Garten, Reinigung, Stellplatz

USt-Sätze Österreich:
- Wohnungsmiete/BK: 10%
- Geschäftslokalmiete/BK: 20%
- Heizung/Zentralheizung: IMMER 20%
- Mahnkosten: 0%

- Datumsformat immer als YYYY-MM-DD
- Zahlen ohne Währungssymbol, nur numerisch (NETTO!)
- Wenn etwas nicht erkennbar ist, setze null oder 0
- Bei Personen-Namen: Vorname und Nachname getrennt

Antworte NUR mit dem JSON-Objekt, ohne zusätzlichen Text.`;

      const response = await ocrClient.chat.completions.create({
        model: 'gpt-5.2',
        max_completion_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: extractionPrompt },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: 'Keine Antwort von der KI erhalten' });
      }

      let extractedData;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Kein JSON in der Antwort gefunden');
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Content:', content);
        return res.status(500).json({ message: 'Konnte die extrahierten Daten nicht verarbeiten' });
      }

      const tenants = (extractedData.tenants || [extractedData]).map((t: any) => ({
        firstName: t.firstName || '',
        lastName: t.lastName || '',
        email: t.email || '',
        phone: t.phone || '',
        mietbeginn: t.mietbeginn || '',
        grundmiete: parseFloat(t.grundmiete) || 0,
        grundmieteUst: parseFloat(t.grundmieteUst) || 10,
        betriebskostenVorschuss: parseFloat(t.betriebskostenVorschuss) || 0,
        heizkostenVorschuss: parseFloat(t.heizkostenVorschuss) || 0,
        wasserkostenVorschuss: parseFloat(t.wasserkostenVorschuss) || 0,
        warmwasserkostenVorschuss: parseFloat(t.warmwasserkostenVorschuss) || 0,
        sonstigeKosten: t.sonstigeKosten || null,
        kaution: parseFloat(t.kaution) || 0,
        topNummer: t.topNummer || '',
        address: t.address || '',
        nutzungsart: t.nutzungsart || 'Wohnung',
        notes: t.notes || '',
      }));

      res.json({ tenants });
    } catch (error: any) {
      console.error('OCR processing error:', error);
      res.status(500).json({ message: error.message || 'OCR-Verarbeitung fehlgeschlagen' });
    }
  });

  // ========================================
  // WHITE LABEL INQUIRY ROUTES
  // ========================================

  // Helper function to escape HTML for email templates
  const escapeHtml = (text: string | null | undefined): string => {
    if (!text) return '-';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Public: Submit White Label inquiry
  app.post("/api/white-label/inquiry", async (req: Request, res: Response) => {
    try {
      const { companyName, contactPerson, email, phone, propertyCount, unitCount, message } = req.body;

      if (!companyName || !contactPerson || !email) {
        return res.status(400).json({ error: "Firmenname, Ansprechpartner und E-Mail sind erforderlich" });
      }

      // Validate string lengths
      if (companyName.length > 200 || contactPerson.length > 200 || email.length > 200) {
        return res.status(400).json({ error: "Eingaben sind zu lang" });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Bitte geben Sie eine gültige E-Mail-Adresse ein" });
      }

      // Sanitize numeric values
      const parsedPropertyCount = propertyCount ? parseInt(propertyCount, 10) : null;
      const parsedUnitCount = unitCount ? parseInt(unitCount, 10) : null;
      
      if (propertyCount && (isNaN(parsedPropertyCount!) || parsedPropertyCount! < 0)) {
        return res.status(400).json({ error: "Ungültige Anzahl Objekte" });
      }
      if (unitCount && (isNaN(parsedUnitCount!) || parsedUnitCount! < 0)) {
        return res.status(400).json({ error: "Ungültige Anzahl Einheiten" });
      }

      // Create inquiry
      const [inquiry] = await db.insert(schema.whiteLabelInquiries)
        .values({
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          email: email.trim().toLowerCase(),
          phone: phone?.trim() || null,
          propertyCount: parsedPropertyCount,
          unitCount: parsedUnitCount,
          message: message?.trim() || null,
          ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
          userAgent: req.headers['user-agent'] || null,
        })
        .returning();

      // Send notification email to admin with escaped HTML
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          const { Resend } = await import('resend');
          const resend = new Resend(resendApiKey);

          await resend.emails.send({
            from: 'ImmoFlowMe <no-reply@immoflowme.at>',
            to: 'office@immoflowme.at',
            subject: `Neue White-Label Anfrage: ${escapeHtml(companyName)}`,
            html: `
              <h2>Neue White-Label Anfrage</h2>
              <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Firma:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(companyName)}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Ansprechpartner:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(contactPerson)}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>E-Mail:</strong></td><td style="padding: 8px; border: 1px solid #ddd;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Telefon:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(phone)}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Anzahl Objekte:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${parsedPropertyCount || '-'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Anzahl Einheiten:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${parsedUnitCount || '-'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Nachricht:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(message)}</td></tr>
              </table>
              <p style="margin-top: 20px; color: #666;">Anfrage eingegangen am ${new Date().toLocaleString('de-AT')}</p>
            `,
          });
          console.log('White Label inquiry notification sent to admin');
        }
      } catch (emailError) {
        console.error('Failed to send White Label notification email:', emailError);
      }

      res.json({ success: true, message: "Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns in Kürze bei Ihnen." });
    } catch (error) {
      console.error('White Label inquiry error:', error);
      res.status(500).json({ error: "Fehler beim Übermitteln der Anfrage" });
    }
  });

  // Admin: List all White Label inquiries
  app.get("/api/admin/white-label/inquiries", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }
      
      const inquiries = await db.select()
        .from(schema.whiteLabelInquiries)
        .orderBy(desc(schema.whiteLabelInquiries.createdAt));
      
      res.json(inquiries);
    } catch (error) {
      console.error('Admin White Label inquiries list error:', error);
      res.status(500).json({ error: "Fehler beim Laden der Anfragen" });
    }
  });

  // Admin: Update White Label inquiry status
  const validInquiryStatuses = ['neu', 'kontaktiert', 'demo_vereinbart', 'verhandlung', 'abgeschlossen', 'abgelehnt'];
  const validLicenseStatuses = ['aktiv', 'gekuendigt', 'pausiert', 'abgelaufen'];

  app.patch("/api/admin/white-label/inquiries/:id", isAuthenticated, requireAdminAccess(), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const { status, notes } = req.body;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }

      // Validate status if provided
      if (status && !validInquiryStatuses.includes(status)) {
        return res.status(400).json({ error: "Ungültiger Status" });
      }

      // Validate notes length
      if (notes && notes.length > 2000) {
        return res.status(400).json({ error: "Notizen zu lang (max. 2000 Zeichen)" });
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes?.trim() || null;
      
      const [updated] = await db.update(schema.whiteLabelInquiries)
        .set(updateData)
        .where(eq(schema.whiteLabelInquiries.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Admin White Label inquiry update error:', error);
      res.status(500).json({ error: "Fehler beim Aktualisieren" });
    }
  });

  // Admin: Delete White Label inquiry
  app.delete("/api/admin/white-label/inquiries/:id", isAuthenticated, requireAdminAccess(), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }
      
      await db.delete(schema.whiteLabelInquiries)
        .where(eq(schema.whiteLabelInquiries.id, id));
      
      res.json({ message: "Anfrage gelöscht" });
    } catch (error) {
      console.error('Admin White Label inquiry delete error:', error);
      res.status(500).json({ error: "Fehler beim Löschen" });
    }
  });

  // Admin: List all White Label licenses
  app.get("/api/admin/white-label/licenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }
      
      const licenses = await db.select({
        license: schema.whiteLabelLicenses,
        organization: schema.organizations,
      })
        .from(schema.whiteLabelLicenses)
        .leftJoin(schema.organizations, eq(schema.whiteLabelLicenses.organizationId, schema.organizations.id))
        .orderBy(desc(schema.whiteLabelLicenses.createdAt));
      
      res.json(licenses);
    } catch (error) {
      console.error('Admin White Label licenses list error:', error);
      res.status(500).json({ error: "Fehler beim Laden der Lizenzen" });
    }
  });

  // Admin: Create White Label license
  app.post("/api/admin/white-label/licenses", isAuthenticated, requireAdminAccess(), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }

      const { organizationId, licenseName, monthlyPrice, setupFee, contractStart, contractEnd, customDomain, maxUsers, notes } = req.body;

      if (!organizationId || !licenseName || !contractStart) {
        return res.status(400).json({ error: "Organisation, Lizenzname und Vertragsbeginn sind erforderlich" });
      }

      // Validate string lengths
      if (licenseName.length > 100) {
        return res.status(400).json({ error: "Lizenzname zu lang (max. 100 Zeichen)" });
      }
      if (customDomain && customDomain.length > 100) {
        return res.status(400).json({ error: "Domain zu lang (max. 100 Zeichen)" });
      }
      if (notes && notes.length > 2000) {
        return res.status(400).json({ error: "Notizen zu lang (max. 2000 Zeichen)" });
      }

      // Validate numeric values
      const parsedMonthlyPrice = monthlyPrice ? parseFloat(monthlyPrice) : null;
      const parsedSetupFee = setupFee ? parseFloat(setupFee) : null;
      const parsedMaxUsers = maxUsers ? parseInt(maxUsers, 10) : null;

      if (monthlyPrice && (isNaN(parsedMonthlyPrice!) || parsedMonthlyPrice! < 0)) {
        return res.status(400).json({ error: "Ungültiger Monatspreis" });
      }
      if (setupFee && (isNaN(parsedSetupFee!) || parsedSetupFee! < 0)) {
        return res.status(400).json({ error: "Ungültige Setup-Gebühr" });
      }
      if (maxUsers && (isNaN(parsedMaxUsers!) || parsedMaxUsers! < 0)) {
        return res.status(400).json({ error: "Ungültige Benutzeranzahl" });
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(contractStart)) {
        return res.status(400).json({ error: "Ungültiges Datumsformat für Vertragsbeginn" });
      }
      if (contractEnd && !/^\d{4}-\d{2}-\d{2}$/.test(contractEnd)) {
        return res.status(400).json({ error: "Ungültiges Datumsformat für Vertragsende" });
      }
      
      const [license] = await db.insert(schema.whiteLabelLicenses)
        .values({
          organizationId,
          licenseName: licenseName.trim(),
          monthlyPrice: parsedMonthlyPrice?.toString() || null,
          setupFee: parsedSetupFee?.toString() || null,
          contractStart,
          contractEnd: contractEnd || null,
          customDomain: customDomain?.trim() || null,
          maxUsers: parsedMaxUsers,
          notes: notes?.trim() || null,
        })
        .returning();
      
      res.json(license);
    } catch (error) {
      console.error('Admin White Label license create error:', error);
      res.status(500).json({ error: "Fehler beim Erstellen der Lizenz" });
    }
  });

  // Admin: Update White Label license
  app.patch("/api/admin/white-label/licenses/:id", isAuthenticated, requireAdminAccess(), async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      
      const [userRole] = await db.select()
        .from(schema.userRoles)
        .where(eq(schema.userRoles.userId, userId))
        .limit(1);
      
      if (!userRole || userRole.role !== 'admin') {
        return res.status(403).json({ error: "Nur Administratoren" });
      }

      const { status, monthlyPrice, contractEnd, customDomain, maxUsers, notes } = req.body;

      // Validate status
      if (status && !validLicenseStatuses.includes(status)) {
        return res.status(400).json({ error: "Ungültiger Status" });
      }

      // Validate numeric values if provided
      if (monthlyPrice !== undefined && monthlyPrice !== '' && monthlyPrice !== null) {
        const parsed = parseFloat(monthlyPrice);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: "Ungültiger Monatspreis" });
        }
      }
      if (maxUsers !== undefined && maxUsers !== '' && maxUsers !== null) {
        const parsed = parseInt(maxUsers, 10);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: "Ungültige Benutzeranzahl" });
        }
      }

      // Validate string lengths
      if (customDomain && customDomain.length > 100) {
        return res.status(400).json({ error: "Domain zu lang" });
      }
      if (notes && notes.length > 2000) {
        return res.status(400).json({ error: "Notizen zu lang" });
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice || null;
      if (contractEnd !== undefined) updateData.contractEnd = contractEnd || null;
      if (customDomain !== undefined) updateData.customDomain = customDomain?.trim() || null;
      if (maxUsers !== undefined) updateData.maxUsers = maxUsers ? parseInt(maxUsers) : null;
      if (notes !== undefined) updateData.notes = notes;
      
      const [updated] = await db.update(schema.whiteLabelLicenses)
        .set(updateData)
        .where(eq(schema.whiteLabelLicenses.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error('Admin White Label license update error:', error);
      res.status(500).json({ error: "Fehler beim Aktualisieren" });
    }
  });

  // ===== Job Queue Routes =====
  app.post("/api/jobs", isAuthenticated, requireRole("property_manager", "finance"), async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const { type, payload } = req.body;
      if (!type) return res.status(400).json({ error: "Job type required" });
      const jobId = await jobQueueService.enqueue(type, payload || {}, profile?.organizationId, profile?.id);
      res.json({ jobId, status: 'pending' });
    } catch (error) {
      console.error("Job enqueue error:", error);
      res.status(500).json({ error: "Failed to enqueue job" });
    }
  });

  app.get("/api/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const jobs = await jobQueueService.getJobsByOrganization(profile?.organizationId);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const job = await jobQueueService.getJobStatus(req.params.id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      if (job.organizationId && job.organizationId !== profile?.organizationId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job status" });
    }
  });

  // ===== DSGVO / GDPR Routes =====
  app.get("/api/gdpr/export/:tenantId", isAuthenticated, requireRole("admin"), async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "Keine Organisation zugeordnet" });
      }
      const data = await exportTenantData(req.params.tenantId, profile.organizationId);
      res.json(data);
    } catch (error: any) {
      console.error("DSGVO export error:", error);
      res.status(error.message?.includes("gehört nicht") ? 403 : 500).json({
        error: error.message || "Fehler beim Datenexport",
      });
    }
  });

  app.post("/api/gdpr/anonymize/:tenantId", isAuthenticated, requireRole("admin"), async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) {
        return res.status(400).json({ error: "Keine Organisation zugeordnet" });
      }
      const result = await anonymizeTenantData(req.params.tenantId, profile.organizationId);
      res.json(result);
    } catch (error: any) {
      console.error("DSGVO anonymize error:", error);
      const status = error.message?.includes("gehört nicht") ? 403
        : error.message?.includes("bereits anonymisiert") ? 409
        : 500;
      res.status(status).json({
        error: error.message || "Fehler bei der Datenanonymisierung",
      });
    }
  });

  registerFunctionRoutes(app);
  registerStripeRoutes(app);
  registerScheduledReportRoutes(app);

  jobQueueService.startPolling(5000);

  startScheduledReportChecker();

  app.use(globalErrorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
