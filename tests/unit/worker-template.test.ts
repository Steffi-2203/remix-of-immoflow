import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the dependencies before importing the module
vi.mock("../../server/services/jobQueueService", () => {
  const handlers = new Map();
  return {
    jobQueueService: {
      registerHandler: vi.fn((jobType: string, handler: Function) => {
        handlers.set(jobType, handler);
      }),
      _getHandler: (jobType: string) => handlers.get(jobType),
    },
    
  };
});

vi.mock("../../server/lib/idempotency", () => ({
  acquireJobLock: vi.fn().mockResolvedValue({ acquired: true, row: { status: "running" } }),
  markJobCompleted: vi.fn().mockResolvedValue(undefined),
  markJobFailed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../server/lib/auditLog", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../server/lib/tracing", () => ({
  createTrace: vi.fn(() => ({
    traceId: "test-trace-id",
    runId: "test-run-id",
    startSpan: vi.fn(() => ({
      spanId: "test-span",
      end: vi.fn(),
      setStatus: vi.fn(),
      setAttribute: vi.fn(),
      addEvent: vi.fn(),
      data: {},
    })),
    finish: vi.fn(() => ({ traceId: "test-trace-id", spans: [] })),
    toJSON: vi.fn(),
  })),
}));

vi.mock("../../server/db", () => ({
  db: {},
}));

describe("worker-template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers a handler with jobQueueService", async () => {
    const { registerJobHandler } = await import("../../server/workers/worker-template");
    const { jobQueueService } = await import("../../server/services/jobQueueService");

    const handler = vi.fn().mockResolvedValue({ success: true });
    registerJobHandler("sepa_export" as any, handler);

    expect(jobQueueService.registerHandler).toHaveBeenCalledWith("sepa_export", expect.any(Function));
  });

  it("skips already completed jobs", async () => {
    const { acquireJobLock } = await import("../../server/lib/idempotency");
    (acquireJobLock as any).mockResolvedValueOnce({ acquired: false, row: { status: "completed" } });

    const { registerJobHandler } = await import("../../server/workers/worker-template");
    const { jobQueueService } = await import("../../server/services/jobQueueService");

    const handler = vi.fn();
    registerJobHandler("billing_run" as any, handler);

    // Get the wrapped handler that was registered
    const wrappedHandler = (jobQueueService.registerHandler as any).mock.calls.at(-1)?.[1];
    const result = await wrappedHandler({ _jobId: "test-job-1" });

    expect(result).toEqual({ skipped: true, reason: "already_completed" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls markJobCompleted on success", async () => {
    const { acquireJobLock, markJobCompleted } = await import("../../server/lib/idempotency");
    (acquireJobLock as any).mockResolvedValueOnce({ acquired: true, row: { status: "running" } });

    const { registerJobHandler } = await import("../../server/workers/worker-template");
    const { jobQueueService } = await import("../../server/services/jobQueueService");

    const handler = vi.fn().mockResolvedValue({ filesGenerated: 1 });
    registerJobHandler("sepa_export" as any, handler);

    const wrappedHandler = (jobQueueService.registerHandler as any).mock.calls.at(-1)?.[1];
    const result = await wrappedHandler({ _jobId: "test-job-2" });

    expect(handler).toHaveBeenCalled();
    expect(markJobCompleted).toHaveBeenCalledWith("test-job-2", expect.objectContaining({ traceId: expect.any(String) }));
    expect(result).toEqual({ filesGenerated: 1 });
  });

  it("calls markJobFailed and re-throws on error", async () => {
    const { acquireJobLock, markJobFailed } = await import("../../server/lib/idempotency");
    (acquireJobLock as any).mockResolvedValueOnce({ acquired: true, row: { status: "running" } });

    const { registerJobHandler } = await import("../../server/workers/worker-template");
    const { jobQueueService } = await import("../../server/services/jobQueueService");

    const handler = vi.fn().mockRejectedValue(new Error("SEPA generation failed"));
    registerJobHandler("sepa_export" as any, handler);

    const wrappedHandler = (jobQueueService.registerHandler as any).mock.calls.at(-1)?.[1];

    await expect(wrappedHandler({ _jobId: "test-job-3" })).rejects.toThrow("SEPA generation failed");
    expect(markJobFailed).toHaveBeenCalledWith("test-job-3", "SEPA generation failed");
  });
});
