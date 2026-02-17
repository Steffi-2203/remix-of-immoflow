import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import { sendEmail } from "./resend";

const QUEUE_NAME = "emailQueue";

let connectionOpts: ConnectionOptions | null = null;
let queue: Queue | null = null;
let worker: Worker | null = null;

function getConnectionOpts(): ConnectionOptions | null {
  if (connectionOpts) return connectionOpts;
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("[EmailQueue] REDIS_URL not set — falling back to inline sends");
    return null;
  }
  try {
    const parsed = new URL(url);
    connectionOpts = {
      host: parsed.hostname,
      port: parseInt(parsed.port || "6379", 10),
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null,
    };
    return connectionOpts;
  } catch (err) {
    console.error("[EmailQueue] Invalid REDIS_URL:", err);
    return null;
  }
}

export function getEmailQueue(): Queue | null {
  if (queue) return queue;
  const opts = getConnectionOpts();
  if (!opts) return null;
  queue = new Queue(QUEUE_NAME, { connection: opts });
  return queue;
}

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

export async function enqueueEmail(data: EmailJobData): Promise<string | null> {
  const q = getEmailQueue();
  if (!q) {
    await sendEmail({ to: data.to, subject: data.subject, html: data.html, text: data.text });
    return null;
  }
  const job = await q.add("send", data, {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  });
  console.log(`[EmailQueue] Enqueued job ${job.id} to=${data.to}`);
  return job.id ?? null;
}

export async function enqueueEmails(items: EmailJobData[]): Promise<void> {
  const q = getEmailQueue();
  if (!q) {
    for (const item of items) {
      try {
        await sendEmail({ to: item.to, subject: item.subject, html: item.html, text: item.text });
      } catch (err) {
        console.error(`[EmailQueue] Inline send failed to=${item.to}:`, err);
      }
    }
    return;
  }
  const bulk = items.map((data) => ({
    name: "send" as const,
    data,
    opts: {
      attempts: 5,
      backoff: { type: "exponential" as const, delay: 2000 },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    },
  }));
  await q.addBulk(bulk);
  console.log(`[EmailQueue] Enqueued ${items.length} emails in bulk`);
}

export function startEmailWorker(): Worker | null {
  const opts = getConnectionOpts();
  if (!opts) {
    console.log("[EmailQueue] No Redis — worker not started, using inline sends");
    return null;
  }

  if (worker) return worker;

  worker = new Worker(
    QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { to, subject, html, text } = job.data;
      console.log(`[EmailWorker] Processing job ${job.id} to=${to} attempt=${job.attemptsMade + 1}`);
      await sendEmail({ to, subject, html, text });
      console.log(`[EmailWorker] Sent job ${job.id} to=${to}`);
    },
    {
      connection: opts,
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 1000,
      },
    },
  );

  worker.on("completed", (job) => {
    console.log(`[EmailWorker] Completed job ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[EmailWorker] Failed job ${job?.id} after ${job?.attemptsMade} attempts:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[EmailWorker] Worker error:", err);
  });

  console.log("[EmailWorker] Started (concurrency=3, rate=10/s, retries=5, exponential backoff)");
  return worker;
}

export async function getQueueStats() {
  const q = getEmailQueue();
  if (!q) return { mode: "inline", waiting: 0, active: 0, completed: 0, failed: 0 };
  const [waiting, active, completed, failed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
  ]);
  return { mode: "queue", waiting, active, completed, failed };
}
