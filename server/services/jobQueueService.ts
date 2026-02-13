import { db, directPool } from "../db";
import { sql } from "drizzle-orm";

export type JobType = 
  | 'billing_run'
  | 'sepa_export'
  | 'settlement_calculation'
  | 'bulk_invoice_upsert'
  | 'dunning_run'
  | 'report_generation'
  | 'ledger_sync'
  | 'retention_check';

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

/**
 * JobQueueService with hybrid LISTEN/NOTIFY + polling fallback.
 *
 * - Primary: Postgres LISTEN/NOTIFY for instant job pickup (sub-100ms latency)
 * - Fallback: Polling every 30s catches any missed notifications (e.g. reconnect gaps)
 * - Feature flag: set JOB_QUEUE_MODE=polling to revert to pure polling
 */
class JobQueueService {
  private handlers = new Map<JobType, (payload: Record<string, unknown>) => Promise<Record<string, unknown>>>();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private listenerClient: any = null;
  private useNotify: boolean;

  constructor() {
    this.useNotify = process.env.JOB_QUEUE_MODE !== 'polling';
  }

  registerHandler(jobType: JobType, handler: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>) {
    this.handlers.set(jobType, handler);
  }

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

    // Send NOTIFY to wake up listeners immediately
    if (this.useNotify) {
      try {
        await db.execute(sql`SELECT pg_notify('job_queue_new', ${jobId})`);
      } catch {
        // Non-critical: fallback polling will catch it
      }
    }

    return jobId;
  }

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
   * Drain pending jobs (process up to N)
   */
  private async drainJobs(max = 5) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      let processed = 0;
      while (processed < max && await this.processNext()) {
        processed++;
      }
    } catch (err) {
      console.error('[JobQueue] Worker error:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start LISTEN/NOTIFY listener on a dedicated connection
   */
  private async startListener() {
    try {
      // Use directPool for session-level LISTEN (requires non-pooled connection)
      this.listenerClient = await directPool.connect();
      await this.listenerClient.query('LISTEN job_queue_new');
      console.info('[JobQueue] LISTEN/NOTIFY listener active');

      this.listenerClient.on('notification', () => {
        // Notification received — drain jobs immediately
        this.drainJobs();
      });

      this.listenerClient.on('error', (err: any) => {
        console.error('[JobQueue] Listener connection error:', err.message);
        this.reconnectListener();
      });

      this.listenerClient.on('end', () => {
        console.warn('[JobQueue] Listener connection ended, reconnecting...');
        this.reconnectListener();
      });
    } catch (err: any) {
      console.error('[JobQueue] Failed to start listener:', err.message);
      console.info('[JobQueue] Falling back to polling-only mode');
      this.useNotify = false;
    }
  }

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private reconnectListener() {
    if (this.reconnectTimer) return;
    this.listenerClient = null;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.startListener();
    }, 5000);
  }

  /**
   * Start the worker with hybrid LISTEN/NOTIFY + safety polling.
   *
   * @param pollIntervalMs - Fallback polling interval (default 30s with NOTIFY, 5s without)
   */
  start(pollIntervalMs?: number) {
    if (this.pollInterval) return;

    if (this.useNotify) {
      this.startListener();
      // Safety poll every 30s to catch missed notifications
      const safetyInterval = pollIntervalMs ?? 30_000;
      console.info(`[JobQueue] Worker started (LISTEN/NOTIFY + safety poll every ${safetyInterval}ms)`);
      this.pollInterval = setInterval(() => this.drainJobs(), safetyInterval);
    } else {
      // Pure polling fallback
      const interval = pollIntervalMs ?? 5000;
      console.info(`[JobQueue] Worker started (polling every ${interval}ms)`);
      this.pollInterval = setInterval(() => this.drainJobs(), interval);
    }

    // Initial drain on startup
    this.drainJobs();
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.listenerClient) {
      this.listenerClient.query('UNLISTEN job_queue_new').catch(() => {});
      this.listenerClient.release();
      this.listenerClient = null;
    }
    console.info('[JobQueue] Worker stopped');
  }

  async getJob(jobId: string): Promise<JobRecord | null> {
    const result = await db.execute(sql`
      SELECT * FROM job_queue WHERE id = ${jobId}::uuid
    `);
    return (result.rows?.[0] as unknown as JobRecord) || null;
  }

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
