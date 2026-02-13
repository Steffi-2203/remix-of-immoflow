import type { Express } from "express";
import { isAuthenticated, getProfileFromSession } from "./helpers";

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
}
