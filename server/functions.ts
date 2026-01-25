import type { Request, Response, Express, NextFunction } from "express";
import { db } from "./db";
import { storage } from "./storage";
import { sendEmail } from "./lib/resend";

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}
import {
  tenants,
  units,
  properties,
  propertyManagers,
  monthlyInvoices,
  payments,
  maintenanceContracts,
  maintenanceTasks,
  messages,
  expenses,
  settlements,
  settlementDetails,
  profiles,
  organizations,
} from "@shared/schema";
import { eq, and, inArray, gte, lte, sql, isNull } from "drizzle-orm";

interface CarryForward {
  vortrag_miete: number;
  vortrag_bk: number;
  vortrag_hk: number;
  vortrag_sonstige: number;
}

const getVatRates = (unitType: string) => {
  const isCommercial = ['geschaeft', 'garage', 'stellplatz', 'lager'].includes(unitType);
  return {
    ust_satz_miete: isCommercial ? 20 : 10,
    ust_satz_bk: isCommercial ? 20 : 10,
    ust_satz_heizung: 20,
  };
};

const calculateVatFromGross = (grossAmount: number, vatRate: number): number => {
  if (vatRate === 0) return 0;
  return grossAmount - (grossAmount / (1 + vatRate / 100));
};

async function calculateTenantCarryForward(
  tenantId: string,
  year: number
): Promise<CarryForward> {
  const previousYear = year - 1;
  
  const prevYearInvoices = await db.select()
    .from(monthlyInvoices)
    .where(and(
      eq(monthlyInvoices.tenantId, tenantId),
      eq(monthlyInvoices.year, previousYear)
    ));

  const startDate = `${previousYear}-01-01`;
  const endDate = `${previousYear}-12-31`;
  
  const prevYearPayments = await db.select()
    .from(payments)
    .where(and(
      eq(payments.tenantId, tenantId),
      gte(payments.buchungsDatum, startDate),
      lte(payments.buchungsDatum, endDate)
    ));

  const sollMiete = prevYearInvoices.reduce((sum, inv) => sum + Number(inv.grundmiete || 0), 0);
  const sollBk = prevYearInvoices.reduce((sum, inv) => sum + Number(inv.betriebskosten || 0), 0);
  const sollHk = prevYearInvoices.reduce((sum, inv) => sum + Number(inv.heizungskosten || 0), 0);
  const sollGesamt = sollMiete + sollBk + sollHk;

  const istGesamt = prevYearPayments.reduce((sum, p) => sum + Number(p.betrag || 0), 0);

  const differenz = sollGesamt - istGesamt;

  if (differenz <= 0) {
    if (differenz < 0) {
      return { vortrag_miete: differenz, vortrag_bk: 0, vortrag_hk: 0, vortrag_sonstige: 0 };
    }
    return { vortrag_miete: 0, vortrag_bk: 0, vortrag_hk: 0, vortrag_sonstige: 0 };
  }

  let remaining = istGesamt;
  const paidBk = Math.min(remaining, sollBk);
  remaining -= paidBk;
  const paidHk = Math.min(remaining, sollHk);
  remaining -= paidHk;
  const paidMiete = Math.min(remaining, sollMiete);

  return {
    vortrag_miete: Math.round(Math.max(0, sollMiete - paidMiete) * 100) / 100,
    vortrag_bk: Math.round(Math.max(0, sollBk - paidBk) * 100) / 100,
    vortrag_hk: Math.round(Math.max(0, sollHk - paidHk) * 100) / 100,
    vortrag_sonstige: 0,
  };
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  property_manager: "Hausverwalter",
  finance: "Buchhalter",
  viewer: "Betrachter",
  tester: "Tester",
};

const VALID_UST_RATES_AT = [0, 10, 13, 20];
const VALID_UST_RATES_DE = [0, 7, 19];
const ALL_VALID_RATES = [...new Set([...VALID_UST_RATES_AT, ...VALID_UST_RATES_DE])];

function formatCurrency(amount: number): string {
  return `€ ${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function registerFunctionRoutes(app: Express) {
  
  app.post("/api/functions/generate-monthly-invoices", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const now = new Date();
      const year = req.body.year || now.getFullYear();
      const month = req.body.month || now.getMonth() + 1;

      const isJanuary = month === 1;

      const managedProperties = await db.select({ propertyId: propertyManagers.propertyId })
        .from(propertyManagers)
        .where(eq(propertyManagers.userId, user.id));

      if (!managedProperties.length) {
        return res.json({ success: true, message: "No managed properties found", created: 0 });
      }

      const propertyIds = managedProperties.map(p => p.propertyId);

      const unitsData = await db.select()
        .from(units)
        .where(inArray(units.propertyId, propertyIds));

      if (!unitsData.length) {
        return res.json({ success: true, message: "No units found", created: 0 });
      }

      const unitIds = unitsData.map(u => u.id);
      const unitTypeMap = new Map(unitsData.map(u => [u.id, u.type || 'wohnung']));

      const tenantsData = await db.select()
        .from(tenants)
        .where(and(
          inArray(tenants.unitId, unitIds),
          eq(tenants.status, 'aktiv')
        ));

      if (!tenantsData.length) {
        return res.json({ success: true, message: "No active tenants found", created: 0 });
      }

      const existingInvoices = await db.select({ tenantId: monthlyInvoices.tenantId })
        .from(monthlyInvoices)
        .where(and(
          eq(monthlyInvoices.year, year),
          eq(monthlyInvoices.month, month)
        ));

      const existingTenantIds = new Set(existingInvoices.map(inv => inv.tenantId));
      const tenantsToInvoice = tenantsData.filter(t => !existingTenantIds.has(t.id));

      if (!tenantsToInvoice.length) {
        return res.json({ 
          success: true, 
          message: `All ${tenantsData.length} tenants already have invoices for ${month}/${year}`,
          created: 0,
          skipped: tenantsData.length
        });
      }

      const dueDate = new Date(year, month - 1, 5);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const carryForwardMap = new Map<string, CarryForward>();
      if (isJanuary) {
        for (const tenant of tenantsToInvoice) {
          const carryForward = await calculateTenantCarryForward(tenant.id, year);
          carryForwardMap.set(tenant.id, carryForward);
        }
      }

      const invoicesToCreate = tenantsToInvoice.map(tenant => {
        const unitType = unitTypeMap.get(tenant.unitId || '') || 'wohnung';
        const vatRates = getVatRates(unitType);
        
        const grundmiete = Number(tenant.grundmiete) || 0;
        const betriebskosten = Number(tenant.betriebskostenVorschuss) || 0;
        const heizungskosten = Number(tenant.heizkostenVorschuss) || 0;
        
        const ustMiete = calculateVatFromGross(grundmiete, vatRates.ust_satz_miete);
        const ustBk = calculateVatFromGross(betriebskosten, vatRates.ust_satz_bk);
        const ustHeizung = calculateVatFromGross(heizungskosten, vatRates.ust_satz_heizung);
        const ust = ustMiete + ustBk + ustHeizung;

        const carryForward = carryForwardMap.get(tenant.id) || {
          vortrag_miete: 0, vortrag_bk: 0, vortrag_hk: 0, vortrag_sonstige: 0,
        };
        const vortragGesamt = carryForward.vortrag_miete + carryForward.vortrag_bk + 
                             carryForward.vortrag_hk + carryForward.vortrag_sonstige;
        
        const gesamtbetrag = grundmiete + betriebskosten + heizungskosten + vortragGesamt;

        return {
          tenantId: tenant.id,
          unitId: tenant.unitId,
          year,
          month,
          grundmiete: grundmiete.toString(),
          betriebskosten: betriebskosten.toString(),
          heizungskosten: heizungskosten.toString(),
          gesamtbetrag: gesamtbetrag.toString(),
          ust: (Math.round(ust * 100) / 100).toString(),
          ustSatzMiete: vatRates.ust_satz_miete,
          ustSatzBk: vatRates.ust_satz_bk,
          ustSatzHeizung: vatRates.ust_satz_heizung,
          status: "offen" as const,
          faelligAm: dueDateStr,
          vortragMiete: carryForward.vortrag_miete.toString(),
          vortragBk: carryForward.vortrag_bk.toString(),
          vortragHk: carryForward.vortrag_hk.toString(),
          vortragSonstige: carryForward.vortrag_sonstige.toString(),
        };
      });

      const createdInvoices = await db.insert(monthlyInvoices)
        .values(invoicesToCreate)
        .returning();

      res.json({ 
        success: true, 
        message: `Successfully created ${createdInvoices.length} invoices for ${month}/${year}`,
        created: createdInvoices.length,
        skipped: existingTenantIds.size,
        carryForwardsCalculated: isJanuary ? carryForwardMap.size : 0,
        invoices: createdInvoices
      });
    } catch (error) {
      console.error("Error generating invoices:", error);
      res.status(500).json({ success: false, error: "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie den Support." });
    }
  });

  app.post("/api/functions/send-invite", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { email, inviteToken, organizationName, role, baseUrl } = req.body;
      
      const registrationUrl = `${baseUrl}/register?invite=${inviteToken}`;
      const roleLabel = ROLE_LABELS[role] || role;

      const result = await sendEmail({
        to: email,
        subject: `Einladung zu ${organizationName}`,
        html: `
          <!DOCTYPE html>
          <html lang="de">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">ImmoflowMe</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Sie wurden eingeladen!</h2>
              
              <p style="color: #4b5563;">
                Sie wurden eingeladen, der Organisation <strong>${organizationName}</strong> als <strong>${roleLabel}</strong> beizutreten.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${registrationUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Einladung annehmen
                </a>
              </div>
              
              <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
                Diese Einladung ist 7 Tage gültig.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      res.json(result);
    } catch (error) {
      console.error("Error in send-invite:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten." });
    }
  });

  app.post("/api/functions/send-dunning", isAuthenticated, async (req: Request, res: Response) => {
    try {
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

  app.post("/api/functions/check-maintenance-reminders", async (req: Request, res: Response) => {
    const internalSecret = req.headers['x-internal-secret'];
    if (internalSecret !== process.env.INTERNAL_CRON_SECRET && process.env.INTERNAL_CRON_SECRET) {
      return res.status(403).json({ error: 'Forbidden - internal endpoint' });
    }
    try {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const contractsData = await db.select()
        .from(maintenanceContracts)
        .where(eq(maintenanceContracts.isActive, true));

      const contractsToRemind = contractsData.filter((contract) => {
        if (!contract.nextDueDate) return false;
        const dueDate = new Date(contract.nextDueDate);
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - (contract.reminderDays || 7));

        if (reminderDate > today) return false;

        if (contract.reminderSentAt) {
          const lastReminder = new Date(contract.reminderSentAt);
          const daysSinceReminder = Math.floor(
            (today.getTime() - lastReminder.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceReminder < 7) return false;
        }

        return true;
      });

      const results = { success: 0, failed: 0 };

      for (const contract of contractsToRemind) {
        try {
          const dueDate = new Date(contract.nextDueDate!);
          const isOverdue = dueDate < today;
          
          const subject = isOverdue
            ? `ÜBERFÄLLIG: ${contract.title}`
            : `Wartung fällig: ${contract.title}`;

          await db.insert(messages).values({
            organizationId: contract.organizationId,
            recipientType: "internal",
            messageType: "maintenance_reminder",
            subject,
            messageBody: `Wartungsvertrag erfordert Ihre Aufmerksamkeit: ${contract.title}`,
            status: "sent",
            sentAt: new Date(),
          });

          await db.update(maintenanceContracts)
            .set({ reminderSentAt: new Date() })
            .where(eq(maintenanceContracts.id, contract.id));

          if (isOverdue) {
            await db.insert(maintenanceTasks).values({
              organizationId: contract.organizationId,
              propertyId: contract.propertyId,
              title: `[ÜBERFÄLLIG] ${contract.title}`,
              description: `Wiederkehrende Wartung überfällig.`,
              category: "maintenance",
              priority: "urgent",
              dueDate: todayStr,
              status: "open",
            });
          }

          results.success++;
        } catch (err) {
          console.error(`Error processing contract ${contract.id}:`, err);
          results.failed++;
        }
      }

      res.json({ message: `Processed ${contractsToRemind.length} contracts`, results });
    } catch (error) {
      console.error("Error in check-maintenance-reminders:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten." });
    }
  });

  app.post("/api/functions/validate-invoice", isAuthenticated, async (req: Request, res: Response) => {
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

  app.get("/api/functions/export-user-data", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profile = await storage.getProfileByEmail(user.email);
      if (!profile?.organizationId) {
        return res.status(403).json({ error: 'No organization found' });
      }
      
      let organization = null;
      [organization] = await db.select()
        .from(organizations)
        .where(eq(organizations.id, profile.organizationId));

      const propertiesData = await db.select().from(properties)
        .where(eq(properties.organizationId, profile.organizationId));
      
      const propertyIds = propertiesData.map(p => p.id);
      
      const unitsData = propertyIds.length > 0 
        ? await db.select().from(units).where(inArray(units.propertyId, propertyIds))
        : [];
        
      const unitIds = unitsData.map(u => u.id);
      
      const tenantsData = unitIds.length > 0
        ? await db.select().from(tenants).where(inArray(tenants.unitId, unitIds))
        : [];
        
      const tenantIds = tenantsData.map(t => t.id);
      
      const paymentsData = tenantIds.length > 0
        ? await db.select().from(payments).where(inArray(payments.tenantId, tenantIds))
        : [];
        
      const expensesData = propertyIds.length > 0
        ? await db.select().from(expenses).where(inArray(expenses.propertyId, propertyIds))
        : [];
        
      const invoicesData = tenantIds.length > 0
        ? await db.select().from(monthlyInvoices).where(inArray(monthlyInvoices.tenantId, tenantIds))
        : [];

      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
        },
        profile: profile ? {
          fullName: profile.fullName,
          email: profile.email,
          createdAt: profile.createdAt,
        } : null,
        organization: organization,
        statistics: {
          propertiesCount: propertiesData.length,
          unitsCount: unitsData.length,
          tenantsCount: tenantsData.length,
          paymentsCount: paymentsData.length,
          expensesCount: expensesData.length,
          invoicesCount: invoicesData.length,
        },
        data: {
          properties: propertiesData,
          units: unitsData,
          tenants: tenantsData,
          payments: paymentsData,
          expenses: expensesData,
          invoices: invoicesData,
        },
      };

      res.json(exportData);
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/functions/send-settlement-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const {
        settlementItemId,
        propertyName,
        propertyAddress,
        unitTopNummer,
        tenantName,
        tenantEmail,
        year,
        bkAnteil,
        hkAnteil,
        bkVorschuss,
        hkVorschuss,
        bkSaldo,
        hkSaldo,
        gesamtSaldo,
        isLeerstandBK,
        isLeerstandHK,
      } = req.body;

      if (!tenantEmail) {
        return res.json({ success: false, message: "No email provided" });
      }

      const saldoText = gesamtSaldo > 0 
        ? `eine <strong style="color: #dc2626;">Nachzahlung von ${formatCurrency(gesamtSaldo)}</strong>` 
        : gesamtSaldo < 0 
          ? `ein <strong style="color: #16a34a;">Guthaben von ${formatCurrency(Math.abs(gesamtSaldo))}</strong>`
          : "einen ausgeglichenen Saldo";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Betriebskostenabrechnung ${year}</title></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">Betriebskostenabrechnung ${year}</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p>Sehr geehrte/r ${tenantName},</p>
            <p>anbei erhalten Sie die Betriebskostenabrechnung für das Jahr ${year}:</p>
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb;">
              <p><strong>Liegenschaft:</strong> ${propertyName}</p>
              <p><strong>Adresse:</strong> ${propertyAddress}</p>
              <p><strong>Einheit:</strong> Top ${unitTopNummer}</p>
            </div>
            <p>Aus der Abrechnung ergibt sich für Sie ${saldoText}.</p>
            <p>Mit freundlichen Grüßen<br>Ihre Hausverwaltung</p>
          </div>
        </body>
        </html>
      `;

      const emailResponse = await sendEmail({
        to: tenantEmail,
        subject: `Betriebskostenabrechnung ${year} - ${propertyName} - Top ${unitTopNummer}`,
        html: htmlContent,
      });

      
      res.json({ success: true, emailId: (emailResponse as any).data?.id });
    } catch (error) {
      console.error("Error in send-settlement-email:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten." });
    }
  });

  app.post("/api/functions/send-message", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { recipientEmail, subject, messageBody } = req.body;

      const emailResponse = await sendEmail({
        to: recipientEmail,
        subject: subject,
        html: `<div style="font-family: Arial, sans-serif;">${messageBody}</div>`,
      });

      res.json({ success: true, emailId: (emailResponse as any).data?.id });
    } catch (error) {
      console.error("Error in send-message:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten." });
    }
  });

  app.delete("/api/functions/delete-account", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      res.json({ success: true, message: "Account deletion requested. Please contact support." });
    } catch (error) {
      console.error("Error in delete-account:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten." });
    }
  });

  app.post("/api/functions/cron-generate-invoices", async (req: Request, res: Response) => {
    const internalSecret = req.headers['x-internal-secret'];
    if (internalSecret !== process.env.INTERNAL_CRON_SECRET && process.env.INTERNAL_CRON_SECRET) {
      return res.status(403).json({ error: 'Forbidden - internal endpoint' });
    }
    
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const allTenants = await db.select()
        .from(tenants)
        .where(eq(tenants.status, 'aktiv'));

      res.json({ 
        success: true, 
        message: `Cron job would generate invoices for ${allTenants.length} active tenants for ${month}/${year}` 
      });
    } catch (error) {
      console.error("Error in cron-generate-invoices:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten." });
    }
  });
}
