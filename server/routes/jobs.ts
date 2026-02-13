import type { Express } from "express";
import { db } from "../db";
import { isAuthenticated, getProfileFromSession } from "./helpers";
import { maintenanceContracts, maintenanceTasks, messages } from "@shared/schema";
import { eq } from "drizzle-orm";
import { tenants } from "@shared/schema";

export function registerJobRoutes(app: Express) {
  app.post("/api/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { jobType, payload, priority, scheduledFor } = req.body;
      if (!jobType) return res.status(400).json({ error: "jobType required" });
      const { jobQueueService } = await import("../services/jobQueueService");
      const jobId = await jobQueueService.enqueue({ organizationId: profile.organizationId, jobType, payload: payload || {}, createdBy: profile.id, priority, scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined });
      res.json({ jobId, status: "pending" });
    } catch (error) { console.error("Enqueue job error:", error); res.status(500).json({ error: "Failed to enqueue job" }); }
  });

  app.get("/api/jobs", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await getProfileFromSession(req);
      if (!profile?.organizationId) return res.status(403).json({ error: "No organization" });
      const { jobQueueService } = await import("../services/jobQueueService");
      const status = req.query.status as string | undefined;
      const jobs = await jobQueueService.listJobs(profile.organizationId, { status: status as any, limit: parseInt(req.query.limit as string) || 50 });
      res.json(jobs);
    } catch (error) { res.status(500).json({ error: "Failed to list jobs" }); }
  });

  app.get("/api/jobs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { jobQueueService } = await import("../services/jobQueueService");
      const job = await jobQueueService.getJob(req.params.id);
      if (!job) return res.status(404).json({ error: "Job not found" });
      res.json(job);
    } catch (error) { res.status(500).json({ error: "Failed to get job" }); }
  });

  // ====== CRON: GENERATE INVOICES ======
  app.post("/api/functions/cron-generate-invoices", async (req: any, res) => {
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

  // ====== CRON: MAINTENANCE REMINDERS ======
  app.post("/api/functions/check-maintenance-reminders", async (req: any, res) => {
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
}
