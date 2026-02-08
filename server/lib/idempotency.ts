import { eq } from "drizzle-orm";
import { db } from "../db";
import { jobRuns } from "../db/models/job_runs";

export async function acquireJobLock(jobId: string, jobType: string, traceId?: string) {
  const now = new Date();
  try {
    const res = await db.insert(jobRuns).values({
      jobId,
      jobType,
      status: "running",
      attempts: 1,
      traceId,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing().returning();

    if (res.length > 0) {
      return { acquired: true, row: res[0] };
    }
    // already exists, fetch it
    const existing = await db.select().from(jobRuns).where(eq(jobRuns.jobId, jobId)).limit(1);
    return { acquired: false, row: existing[0] };
  } catch (err) {
    throw err;
  }
}

export async function markJobCompleted(jobId: string, meta?: { attempts?: number; traceId?: string }) {
  await db.update(jobRuns).set({
    status: "completed",
    attempts: meta?.attempts ?? 1,
    traceId: meta?.traceId,
    updatedAt: new Date(),
  }).where(eq(jobRuns.jobId, jobId));
}

export async function markJobFailed(jobId: string, error: string, attempts = 1) {
  await db.update(jobRuns).set({
    status: "failed",
    lastError: error,
    attempts,
    updatedAt: new Date(),
  }).where(eq(jobRuns.jobId, jobId));
}
