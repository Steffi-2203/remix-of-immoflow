import { Router } from "express";
import { db } from "../db";
import * as schema from "@shared/schema";
import { insertOwnerSchema } from "@shared/schema";
import { eq, and, asc, count } from "drizzle-orm";
import { isAuthenticated, requireRole, requireMutationAccess, getProfileFromSession, snakeToCamel, type AuthenticatedRequest } from "./helpers";
import { ownerReportingService } from "../services/ownerReportingService";
import { bmdDatevExportService } from "../services/bmdDatevExportService";
import { finanzOnlineService } from "../services/finanzOnlineService";
import { automatedDunningService } from "../services/automatedDunningService";
import { maintenanceReminderService } from "../services/maintenanceReminderService";
import { vpiAutomationService } from "../services/vpiAutomationService";

const router = Router();

router.get("/api/owners", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }

    const owners = await db.select().from(schema.owners)
      .where(eq(schema.owners.organizationId, profile.organizationId))
      .orderBy(asc(schema.owners.lastName), asc(schema.owners.firstName));

    res.json(owners);
  } catch (error) {
    console.error("Error fetching owners:", error);
    res.status(500).json({ error: "Failed to fetch owners" });
  }
});

router.post("/api/owners", isAuthenticated, requireMutationAccess(), async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }

    const normalizedBody = snakeToCamel(req.body);
    const validationResult = insertOwnerSchema.safeParse(normalizedBody);

    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationResult.error.flatten() 
      });
    }

    const ownerData = {
      ...validationResult.data,
      organizationId: profile.organizationId,
    };

    const [owner] = await db.insert(schema.owners)
      .values(ownerData)
      .returning();

    res.status(201).json(owner);
  } catch (error) {
    console.error("Error creating owner:", error);
    res.status(500).json({ error: "Failed to create owner" });
  }
});

router.patch("/api/owners/:id", isAuthenticated, requireMutationAccess(), async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }

    const { id } = req.params;

    const [existingOwner] = await db.select().from(schema.owners)
      .where(eq(schema.owners.id, id))
      .limit(1);

    if (!existingOwner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    if (existingOwner.organizationId !== profile.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const normalizedBody = snakeToCamel(req.body);
    
    const allowedFields = [
      'firstName', 'lastName', 'companyName', 'email', 'phone', 'mobilePhone',
      'address', 'city', 'postalCode', 'country', 'iban', 'bic', 'bankName',
      'taxNumber', 'notes'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (field in normalizedBody) {
        updateData[field] = normalizedBody[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const [updatedOwner] = await db.update(schema.owners)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.owners.id, id))
      .returning();

    res.json(updatedOwner);
  } catch (error) {
    console.error("Error updating owner:", error);
    res.status(500).json({ error: "Failed to update owner" });
  }
});

router.delete("/api/owners/:id", isAuthenticated, requireMutationAccess(), async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }

    const { id } = req.params;

    const [existingOwner] = await db.select().from(schema.owners)
      .where(eq(schema.owners.id, id))
      .limit(1);

    if (!existingOwner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    if (existingOwner.organizationId !== profile.organizationId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [referencedCount] = await db.select({ count: count() }).from(schema.wegUnitOwners)
      .where(eq(schema.wegUnitOwners.ownerId, id));

    if (referencedCount && referencedCount.count > 0) {
      return res.status(409).json({ 
        error: "Owner cannot be deleted", 
        message: "This owner is referenced by WEG unit owners. Please remove those references first." 
      });
    }

    await db.delete(schema.owners)
      .where(eq(schema.owners.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting owner:", error);
    res.status(500).json({ error: "Failed to delete owner" });
  }
});

router.get("/api/owners/:ownerId/report", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const { period, date } = req.query;
    const report = await ownerReportingService.generateOwnerReport(
      profile.organizationId,
      req.params.ownerId,
      period as any || 'month',
      date ? new Date(date as string) : new Date()
    );
    if (!report) {
      return res.status(404).json({ error: "Owner not found" });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate owner report" });
  }
});

router.get("/api/owners/:ownerId/report/html", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const { period, date } = req.query;
    const report = await ownerReportingService.generateOwnerReport(
      profile.organizationId,
      req.params.ownerId,
      period as any || 'month',
      date ? new Date(date as string) : new Date()
    );
    if (!report) {
      return res.status(404).json({ error: "Owner not found" });
    }
    const html = ownerReportingService.generateReportHtml(report, period as string || 'Monat');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate owner report" });
  }
});

router.get("/api/export/datev", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const { startDate, endDate } = req.query;
    const csv = await bmdDatevExportService.generateDatevExport(
      profile.organizationId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=datev-export.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate DATEV export" });
  }
});

router.get("/api/export/bmd", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const { startDate, endDate } = req.query;
    const csv = await bmdDatevExportService.generateBmdExport(
      profile.organizationId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bmd-export.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate BMD export" });
  }
});

router.get("/api/finanzonline/ust-summary", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const { year, period } = req.query;
    const voranmeldung = await finanzOnlineService.generateUstVoranmeldung(
      profile.organizationId,
      parseInt(year as string) || new Date().getFullYear(),
      period as any || 'Q1'
    );
    res.json(voranmeldung);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate USt summary" });
  }
});

router.get("/api/finanzonline/ust-xml", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    const { year, period } = req.query;
    const voranmeldung = await finanzOnlineService.generateUstVoranmeldung(
      profile.organizationId,
      parseInt(year as string) || new Date().getFullYear(),
      period as any || 'Q1'
    );
    const xml = finanzOnlineService.generateXml(voranmeldung);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename=ust-voranmeldung.xml');
    res.send(xml);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate USt XML" });
  }
});

router.get("/api/finanzonline/periods", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  const { year } = req.query;
  const periods = finanzOnlineService.getAvailablePeriods(parseInt(year as string) || new Date().getFullYear());
  res.json({ periods });
});

router.get("/api/accountant/dashboard", isAuthenticated, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await getProfileFromSession(req);
    if (!profile?.organizationId) {
      return res.status(400).json({ error: "No organization" });
    }
    
    const [dunningActions, maintenanceReminders, vpiAdjustments] = await Promise.all([
      automatedDunningService.checkOverdueInvoices(profile.organizationId),
      maintenanceReminderService.checkMaintenanceReminders(profile.organizationId),
      vpiAutomationService.checkVpiAdjustments(profile.organizationId),
    ]);

    const overdueAmount = dunningActions.reduce((sum, a) => sum + a.amount, 0);
    const overdueCount = dunningActions.length;
    const maintenanceOverdue = maintenanceReminders.filter(r => r.reminderType === 'overdue').length;
    const maintenanceDue = maintenanceReminders.filter(r => r.reminderType === 'due').length;
    const pendingVpiAdjustments = vpiAdjustments.length;

    res.json({
      dunning: {
        overdueAmount,
        overdueCount,
        byLevel: {
          level1: dunningActions.filter(a => a.newLevel === 1).length,
          level2: dunningActions.filter(a => a.newLevel === 2).length,
          level3: dunningActions.filter(a => a.newLevel === 3).length,
        }
      },
      maintenance: {
        overdueCount: maintenanceOverdue,
        dueThisWeek: maintenanceDue,
        upcomingCount: maintenanceReminders.filter(r => r.reminderType === 'upcoming').length,
      },
      vpiAdjustments: {
        pendingCount: pendingVpiAdjustments,
        totalIncrease: vpiAdjustments.reduce((sum, a) => sum + (a.newRent - a.currentRent), 0),
      },
      actions: {
        dunning: dunningActions.slice(0, 5),
        maintenance: maintenanceReminders.slice(0, 5),
        vpi: vpiAdjustments.slice(0, 5),
      }
    });
  } catch (error) {
    console.error('Accountant dashboard error:', error);
    res.status(500).json({ error: "Failed to load accountant dashboard" });
  }
});

export default router;
