import { db } from "../db";
import { sql } from "drizzle-orm";

export type JobType = 
  | 'billing_run'
  | 'sepa_export'
  | 'settlement_calculation'
  | 'bulk_invoice_upsert'
  | 'dunning_run'
  | 'report_generation'
  | 'ledger_sync';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

interface EnqueueOptions {
  organizationId: string;
  jobType: JobType;
  payload: Record<string, unknown>;
  createdBy?: string;
  priority?: number;
  maxRetries?: number;
  scheduledFor?: Date;
}

interface JobRecord {
  id: string;
  organization_id: string;
  job_type: string;
  payload: Record<string, unknown>;
  status: string;
  priority: number;
  max_retries: number;
  retry_count: number;
  error: string | null;
  result: Record<string, unknown> | null;
  created_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  scheduled_for: string;
  created_at: string;
}

class JobQueueService {
  private handlers = new Map<JobType, (payload: Record<string, unknown>) => Promise<Record<string, unknown>>>();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;

  /**
   * Register a handler for a job type
   */
  registerHandler(jobType: JobType, handler: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>) {
    this.handlers.set(jobType, handler);
  }

  /**
   * Enqueue a new job
   */
  async enqueue(opts: EnqueueOptions): Promise<string> {
    const { organizationId, jobType, payload, createdBy, priority = 0, maxRetries = 3, scheduledFor } = opts;

    const result = await db.execute(sql`
      INSERT INTO job_queue (organization_id, job_type, payload, created_by, priority, max_retries, scheduled_for)
      VALUES (
        ${organizationId}::uuid,
        ${jobType},
        ${JSON.stringify(payload)}::jsonb,
        ${createdBy ? sql`${createdBy}::uuid` : sql`NULL`},
        ${priority},
        ${maxRetries},
        ${scheduledFor ? sql`${scheduledFor.toISOString()}` : sql`now()`}
      )
      RETURNING id
    `);

    const jobId = (result.rows?.[0] as any)?.id;
    console.info(`[JobQueue] Enqueued ${jobType} job: ${jobId}`);
    return jobId;
  }

  /**
   * Claim and process the next available job (atomic SELECT FOR UPDATE SKIP LOCKED)
   */
  async processNext(): Promise<boolean> {
    const claimed = await db.execute(sql`
      UPDATE job_queue
      SET status = 'processing', started_at = now(), updated_at = now()
      WHERE id = (
        SELECT id FROM job_queue
        WHERE status IN ('pending', 'retrying')
        AND scheduled_for <= now()
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);

    if (!claimed.rows || claimed.rows.length === 0) return false;

    const job = claimed.rows[0] as unknown as JobRecord;
    const handler = this.handlers.get(job.job_type as JobType);

    if (!handler) {
      await this.failJob(job.id, `No handler registered for job type: ${job.job_type}`);
      return true;
    }

    try {
      const result = await handler(job.payload);
      await db.execute(sql`
        UPDATE job_queue
        SET status = 'completed', result = ${JSON.stringify(result)}::jsonb,
            completed_at = now(), updated_at = now()
        WHERE id = ${job.id}::uuid
      `);
      console.info(`[JobQueue] Completed job ${job.id} (${job.job_type})`);
    } catch (err: any) {
      const retryCount = job.retry_count + 1;
      if (retryCount < job.max_retries) {
        // Exponential backoff: 30s, 120s, 270s...
        const backoffSec = 30 * retryCount * retryCount;
        await db.execute(sql`
          UPDATE job_queue
          SET status = 'retrying', retry_count = ${retryCount},
              error = ${String(err.message || err)},
              scheduled_for = now() + interval '${sql.raw(String(backoffSec))} seconds',
              updated_at = now()
          WHERE id = ${job.id}::uuid
        `);
        console.warn(`[JobQueue] Retrying job ${job.id} (attempt ${retryCount}/${job.max_retries})`);
      } else {
        await this.failJob(job.id, String(err.message || err));
      }
    }

    return true;
  }

  private async failJob(jobId: string, error: string) {
    await db.execute(sql`
      UPDATE job_queue
      SET status = 'failed', error = ${error}, failed_at = now(), updated_at = now()
      WHERE id = ${jobId}::uuid
    `);
    console.error(`[JobQueue] Failed job ${jobId}: ${error}`);
  }

  /**
   * Start the polling worker
   */
  start(intervalMs = 5000) {
    if (this.pollInterval) return;
    console.info(`[JobQueue] Worker started (poll every ${intervalMs}ms)`);
    this.pollInterval = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        // Process up to 5 jobs per tick
        let processed = 0;
        while (processed < 5 && await this.processNext()) {
          processed++;
        }
      } catch (err) {
        console.error('[JobQueue] Worker error:', err);
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
      console.info('[JobQueue] Worker stopped');
    }
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<JobRecord | null> {
    const result = await db.execute(sql`
      SELECT * FROM job_queue WHERE id = ${jobId}::uuid
    `);
    return (result.rows?.[0] as unknown as JobRecord) || null;
  }

  /**
   * List jobs for an organization
   */
  async listJobs(organizationId: string, opts?: { status?: JobStatus; limit?: number }) {
    const limit = opts?.limit || 50;
    const statusFilter = opts?.status ? sql`AND status = ${opts.status}` : sql``;
    const result = await db.execute(sql`
      SELECT * FROM job_queue
      WHERE organization_id = ${organizationId}::uuid ${statusFilter}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    return result.rows || [];
  }
}

export const jobQueueService = new JobQueueService();
