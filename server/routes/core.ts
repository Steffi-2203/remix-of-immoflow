import type { Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "./helpers";

export function registerCoreRoutes(app: Express) {
  app.get("/api/health", async (_req, res) => {
    const start = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      const dbLatencyMs = Date.now() - start;
      res.json({
        status: "ok",
        database: "connected",
        dbLatencyMs,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const dbLatencyMs = Date.now() - start;
      res.status(503).json({
        status: "degraded",
        database: "unreachable",
        dbLatencyMs,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get("/api/metrics", async (_req, res) => {
    try {
      const { metrics } = await import("../lib/metrics");
      const snapshot = metrics.snapshot();
      const queueStats = await db.execute(sql`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'running')::int AS running,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
        FROM job_runs
      `);
      const queueRow = queueStats.rows?.[0] as any;
      res.json({
        billing: snapshot,
        queue: {
          pending: queueRow?.pending || 0,
          running: queueRow?.running || 0,
          failed: queueRow?.failed || 0,
        },
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });
}
