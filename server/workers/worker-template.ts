import { v4 as uuidv4 } from "uuid";
import { jobQueueService, type JobType } from "../services/jobQueueService";
import { acquireJobLock, markJobCompleted, markJobFailed } from "../lib/idempotency";
import { createAuditLog } from "../lib/auditLog";
import { createTrace, type Trace } from "../lib/tracing";

/**
 * Worker template using the existing PostgreSQL-based job queue.
 *
 * Usage:
 *   registerJobHandler('sepa_export', async (payload, trace) => {
 *     const span = trace.startSpan('generate_xml');
 *     // ... do work
 *     span.end();
 *     return { filesGenerated: 1 };
 *   });
 */

type JobHandler = (
  payload: Record<string, unknown>,
  trace: Trace
) => Promise<Record<string, unknown>>;

/**
 * Register a job handler with idempotency guard and tracing.
 * Wraps the handler so that:
 *  1. A job lock is acquired (via job_runs table) to prevent duplicate processing
 *  2. A distributed trace is created for observability
 *  3. Audit logs are written for start/complete/fail/skip events
 */
export function registerJobHandler(jobType: JobType, handler: JobHandler) {
  jobQueueService.registerHandler(jobType, async (payload) => {
    const jobId = (payload._jobId as string) ?? uuidv4();
    const traceId = (payload._traceId as string) ?? uuidv4();

    const trace = createTrace(`job:${jobType}`, jobId);

    // 1. Idempotency check
    const lock = await acquireJobLock(jobId, jobType, traceId);
    if (!lock.acquired && lock.row?.status === "completed") {
      await createAuditLog({
        tableName: "job_runs",
        recordId: jobId,
        action: "create",
        newData: { event: "job_skipped", jobType, traceId, reason: "already_completed" },
      });
      console.info(`[Worker:${jobType}] Skipped job ${jobId} (already completed)`);
      return { skipped: true, reason: "already_completed" };
    }

    // 2. Audit: job started
    await createAuditLog({
      tableName: "job_runs",
      recordId: jobId,
      action: "create",
      newData: { event: "job_started", jobType, traceId },
    });

    try {
      // 3. Execute handler with trace context
      const result = await handler(payload, trace);

      // 4. Mark completed
      await markJobCompleted(jobId, { traceId });
      await createAuditLog({
        tableName: "job_runs",
        recordId: jobId,
        action: "update",
        newData: { event: "job_completed", jobType, traceId },
      });

      trace.finish();
      return result;
    } catch (err: any) {
      const errorMsg = err?.message ?? String(err);
      await markJobFailed(jobId, errorMsg);
      await createAuditLog({
        tableName: "job_runs",
        recordId: jobId,
        action: "update",
        newData: { event: "job_failed", jobType, traceId, error: errorMsg },
      });

      trace.finish();
      throw err; // re-throw so jobQueueService handles retry logic
    }
  });
}
