import type { Express } from "express";
import { db } from "../../db";
import { storage } from "../../storage";
import { parsePagination, paginateArray } from "../../lib/pagination";
import { isAuthenticated, snakeToCamel, maskPersonalData, getUserRoles, getProfileFromSession, isTester } from "../helpers";
import { assertOwnership } from "../../middleware/assertOrgOwnership";
import { sendEmail } from "../../lib/resend";
import { ALL_VALID_RATES } from "../../lib/invoiceUtils";
import { insertMonthlyInvoiceSchema, monthlyInvoices } from "@shared/schema";
import { eq } from "drizzle-orm";

export function registerInvoiceRoutes(app: Express) {
  app.get("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      const { year, month } = req.query;
      const invoices = await storage.getMonthlyInvoicesByOrganization(
        profile?.organizationId,
        year ? parseInt(year as string) : undefined,
        month ? parseInt(month as string) : undefined
      );
      const roles = await getUserRoles(req);
      const masked = isTester(roles) ? maskPersonalData(invoices) : invoices;
      const pagination = parsePagination(req);
      res.json(paginateArray(masked, pagination));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await assertOwnership(req, res, req.params.id, "invoices");
      if (!invoice) return;
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(invoice) : invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertMonthlyInvoiceSchema.safeParse(normalizedBody);
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      const tenant = await assertOwnership(req, res, validationResult.data.tenantId, "tenants");
      if (!tenant) return;
      const invoice = await storage.createInvoice(validationResult.data);
      res.json(invoice);
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await assertOwnership(req, res, req.params.id, "invoices");
      if (!existing) return;
      const normalizedBody = snakeToCamel(req.body);
      const validationResult = insertMonthlyInvoiceSchema.partial().safeParse(normalizedBody);
      if (!validationResult.success) return res.status(400).json({ error: "Validation failed", details: validationResult.error.flatten() });
      const invoice = await storage.updateInvoice(req.params.id, validationResult.data);
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ error: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await assertOwnership(req, res, req.params.id, "invoices");
      if (!invoice) return;
      const { archiveService } = await import("../../billing/archiveService");
      const freeze = await archiveService.isDeletionFrozen(req.params.id);
      if (freeze.frozen) {
        return res.status(409).json({ error: "Dokument unterliegt der gesetzlichen Aufbewahrungspflicht", retentionUntil: freeze.retentionUntil, standard: freeze.standard, reason: freeze.reason });
      }
      await storage.deleteInvoice(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // Dry-run invoice generation
  app.post("/api/invoices/dry-run", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "Organization not found" });
      const { period, units: unitIds } = req.body;
      if (!period || !/^\d{4}-\d{2}$/.test(period)) return res.status(400).json({ error: "Invalid period format. Use YYYY-MM" });
      const [yearStr, monthStr] = period.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      let tenants = await storage.getTenantsByOrganization(profile.organizationId);
      const activeTenants = tenants.filter(t => t.status === "aktiv");
      const filteredTenants = unitIds && Array.isArray(unitIds) && unitIds.length > 0
        ? activeTenants.filter(t => t.unitId && unitIds.includes(t.unitId))
        : activeTenants;
      const preview = [];
      for (const tenant of filteredTenants) {
        if (!tenant.unitId) continue;
        const unit = await storage.getUnit(tenant.unitId);
        if (!unit) continue;
        const property = await storage.getProperty(unit.propertyId);
        if (!property) continue;
        const grundmiete = Number(tenant.grundmiete || 0);
        const bkVorschuss = Number(tenant.betriebskostenVorschuss || 0);
        const hkVorschuss = Number(tenant.heizkostenVorschuss || 0);
        const unitType = (unit.type || "wohnung").toLowerCase();
        const isCommercial = unitType.includes("geschäft") || unitType.includes("gewerbe") || unitType.includes("büro");
        const isParking = unitType.includes("stellplatz") || unitType.includes("garage") || unitType.includes("parkplatz");
        const mietUst = isCommercial || isParking ? 20 : 10;
        const mieteBrutto = grundmiete * (1 + mietUst / 100);
        const bkBrutto = bkVorschuss * 1.10;
        const hkBrutto = hkVorschuss * 1.20;
        const totalBrutto = mieteBrutto + bkBrutto + hkBrutto;
        preview.push({
          tenantId: tenant.id, tenantName: `${tenant.firstName} ${tenant.lastName}`,
          unitId: unit.id, unitNumber: unit.unitNumber, propertyId: property.id, propertyName: property.name,
          year, month, grundmieteNetto: grundmiete, grundmieteBrutto: mieteBrutto, mietUst,
          bkNetto: bkVorschuss, bkBrutto, hkNetto: hkVorschuss, hkBrutto, totalBrutto,
          dueDate: new Date(year, month - 1, 5).toISOString().split("T")[0]
        });
      }
      res.json({ success: true, dryRun: true, period, count: preview.length, totalBrutto: preview.reduce((sum, p) => sum + p.totalBrutto, 0), preview });
    } catch (error) {
      console.error("Dry-run invoice error:", error);
      res.status(500).json({ error: "Failed to generate invoice preview" });
    }
  });

  // Generate monthly invoices
  app.post("/api/functions/generate-monthly-invoices", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "Organization not found" });
      const { year, month } = req.body;
      const currentDate = new Date();
      const targetYear = year || currentDate.getFullYear();
      const targetMonth = month || (currentDate.getMonth() + 1);
      const { invoiceService } = await import("../../billing/invoiceService");
      const { withAuditedErrorHandling } = await import("../../lib/serviceErrorHandler");
      const result = await withAuditedErrorHandling({
        service: 'invoiceService', operation: 'generateMonthlyInvoices', userId: profile.id,
        context: { year: targetYear, month: targetMonth, organizationId: profile.organizationId },
        fn: () => invoiceService.generateMonthlyInvoices(profile.id, targetYear, targetMonth, profile.organizationId),
      });
      res.json({ success: result.success, created: result.created, skipped: result.skipped, errors: 0, errorDetails: [], message: result.message });
    } catch (error: any) {
      console.error('Generate invoices error:', error);
      const { handleFinancialError } = await import("../../lib/serviceErrorHandler");
      const errResp = handleFinancialError(error, 'invoiceService');
      res.status(errResp.status).json(errResp.body);
    }
  });

  // Invoice allocations
  app.get("/api/invoices/:invoiceId/allocations", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await assertOwnership(req, res, req.params.invoiceId, "invoices");
      if (!invoice) return;
      const allocations = await storage.getPaymentAllocationsByInvoice(req.params.invoiceId);
      res.json(allocations);
    } catch (error) {
      console.error("Get invoice allocations error:", error);
      res.status(500).json({ error: "Failed to fetch invoice allocations" });
    }
  });

  // Invoice payments
  app.get("/api/invoices/:invoiceId/payments", isAuthenticated, async (req: any, res) => {
    try {
      const invoice = await assertOwnership(req, res, req.params.invoiceId, "invoices");
      if (!invoice) return;
      const payments = await storage.getPaymentsByInvoice(req.params.invoiceId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(payments) : payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invoice payments" });
    }
  });

  // Tenant invoices
  app.get("/api/tenants/:tenantId/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const tenant = await assertOwnership(req, res, req.params.tenantId, "tenants");
      if (!tenant) return;
      const invoices = await storage.getInvoicesByTenant(req.params.tenantId);
      const roles = await getUserRoles(req);
      res.json(isTester(roles) ? maskPersonalData(invoices) : invoices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tenant invoices" });
    }
  });

  // ====== DUNNING ======
  app.post("/api/functions/send-dunning", isAuthenticated, async (req: any, res) => {
    try {
      if (req.body.invoiceId) {
        const invoice = await assertOwnership(req, res, req.body.invoiceId, "invoices");
        if (!invoice) return;
      }
      const {
        invoiceId, dunningLevel, tenantEmail, tenantName,
        propertyName, unitNumber, amount, dueDate, invoiceMonth, invoiceYear
      } = req.body;

      if (!tenantEmail) {
        return res.status(400).json({ error: "Keine E-Mail-Adresse für den Mieter hinterlegt" });
      }

      const monthNames = [
        'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
      ];
      const monthName = monthNames[invoiceMonth - 1];
      const formattedAmount = amount.toLocaleString('de-AT', { minimumFractionDigits: 2 });
      const formattedDueDate = new Date(dueDate).toLocaleDateString('de-AT');

      let subject: string;
      let htmlContent: string;

      if (dunningLevel === 1) {
        subject = `Zahlungserinnerung - Miete ${monthName} ${invoiceYear}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Freundliche Zahlungserinnerung</h2>
            <p>Sehr geehrte/r ${tenantName},</p>
            <p>bei Durchsicht unserer Buchhaltung ist uns aufgefallen, dass die nachstehende Forderung noch offen ist:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Objekt</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${propertyName} - Top ${unitNumber}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Offener Betrag</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #c00; font-weight: bold;">€ ${formattedAmount}</td>
              </tr>
            </table>
            <p>Wir bitten Sie, den offenen Betrag innerhalb der nächsten <strong>7 Tage</strong> zu überweisen.</p>
            <p>Mit freundlichen Grüßen,<br>Ihre Hausverwaltung</p>
          </div>
        `;
      } else {
        subject = `MAHNUNG - Miete ${monthName} ${invoiceYear}`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #c00;">Mahnung</h2>
            <p>Sehr geehrte/r ${tenantName},</p>
            <p>trotz unserer Zahlungserinnerung ist die nachstehende Forderung weiterhin offen:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f5f5f5;">
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Objekt</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${propertyName} - Top ${unitNumber}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>Offener Betrag</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd; color: #c00; font-weight: bold;">€ ${formattedAmount}</td>
              </tr>
            </table>
            <p style="color: #c00; font-weight: bold;">
              Wir fordern Sie hiermit letztmalig auf, den offenen Betrag innerhalb von <strong>5 Tagen</strong> zu überweisen.
            </p>
            <p>Mit freundlichen Grüßen,<br>Ihre Hausverwaltung</p>
          </div>
        `;
      }

      const emailResponse = await sendEmail({
        to: tenantEmail,
        subject: subject,
        html: htmlContent,
      });

      const updateData: Record<string, any> = { mahnstufe: dunningLevel };
      if (dunningLevel === 1) {
        updateData.zahlungserinnerungAm = new Date().toISOString();
      } else {
        updateData.mahnungAm = new Date().toISOString();
      }

      await db.update(monthlyInvoices)
        .set(updateData)
        .where(eq(monthlyInvoices.id, invoiceId));

      res.json({
        success: true,
        message: dunningLevel === 1 ? 'Zahlungserinnerung versendet' : 'Mahnung versendet',
        emailId: (emailResponse as any).data?.id
      });
    } catch (error) {
      console.error("Error in send-dunning:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten." });
    }
  });

  // ====== VALIDATE INVOICE ======
  app.post("/api/functions/validate-invoice", isAuthenticated, async (req: any, res) => {
    try {
      const invoiceData = req.body.daten || req.body;

      const report = {
        ist_valide: true,
        gefundene_fehler: [] as string[],
        vorgenommene_korrekturen: [] as string[],
        unsichere_felder: [] as { feld: string; grund: string }[],
        hinweise: [] as string[]
      };

      const corrected = { ...invoiceData };

      if (!corrected.lieferant || corrected.lieferant.trim() === '') {
        corrected.lieferant = 'UNSICHER - nicht erkannt';
        report.unsichere_felder.push({ feld: 'lieferant', grund: 'Nicht erkannt oder leer' });
      }

      if (!corrected.bruttobetrag || corrected.bruttobetrag <= 0) {
        report.gefundene_fehler.push('Pflichtfeld "bruttobetrag" fehlt');
        report.ist_valide = false;
      }

      if (corrected.bruttobetrag && corrected.ust_betrag && !corrected.nettobetrag) {
        corrected.nettobetrag = Math.round((corrected.bruttobetrag - corrected.ust_betrag) * 100) / 100;
        report.vorgenommene_korrekturen.push(`Nettobetrag berechnet: ${corrected.nettobetrag}€`);
      }

      if (corrected.ust_satz !== null && corrected.ust_satz !== undefined) {
        if (!ALL_VALID_RATES.includes(corrected.ust_satz)) {
          report.gefundene_fehler.push(`Ungewöhnlicher USt-Satz: ${corrected.ust_satz}%`);
          report.unsichere_felder.push({ feld: 'ust_satz', grund: `${corrected.ust_satz}% ist kein üblicher Steuersatz` });
        }
      }

      if (corrected.iban) {
        const cleanIban = corrected.iban.replace(/\s/g, '').toUpperCase();
        if (cleanIban.length < 15 || cleanIban.length > 34) {
          report.gefundene_fehler.push(`IBAN-Länge ungültig: ${cleanIban.length} Zeichen`);
        } else {
          corrected.iban = cleanIban;
        }
      }

      if (report.gefundene_fehler.length > 0) {
        report.ist_valide = false;
      }

      res.json({ korrigierte_daten: corrected, validierungsbericht: report });
    } catch (error) {
      console.error("Error in validate-invoice:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten." });
    }
  });
}
