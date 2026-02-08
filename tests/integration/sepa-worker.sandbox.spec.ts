import { describe, it, expect, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";

// Mock all external dependencies
vi.mock("../../server/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

vi.mock("../../server/services/sepaExportService", () => ({
  sepaExportService: {
    generateDirectDebitXml: vi.fn().mockResolvedValue("<SEPA>test-xml</SEPA>"),
  },
}));

vi.mock("../../server/adapters/sepa/psp-sandbox", () => ({
  submitSepaBatchSandbox: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body: { pspBatchId: "SBX-test-123", message: "accepted", timestamp: new Date().toISOString() },
  }),
}));

vi.mock("../../server/lib/auditLog", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../server/lib/idempotency", () => ({
  acquireJobLock: vi.fn().mockResolvedValue({ acquired: true, row: { status: "running" } }),
  markJobCompleted: vi.fn().mockResolvedValue(undefined),
  markJobFailed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../server/lib/tracing", () => ({
  createTrace: vi.fn(() => ({
    traceId: "test-trace",
    runId: "test-run",
    startSpan: vi.fn(() => ({
      spanId: "s1",
      end: vi.fn(),
      setStatus: vi.fn(),
      setAttribute: vi.fn(),
      addEvent: vi.fn(),
      data: {},
    })),
    finish: vi.fn(() => ({ traceId: "test-trace", spans: [] })),
    toJSON: vi.fn(),
  })),
}));

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

describe("sepa-worker sandbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers sepa_export handler", async () => {
    const { registerSepaWorker } = await import("../../server/workers/sepa-worker");
    const { jobQueueService } = await import("../../server/services/jobQueueService");

    registerSepaWorker();
    expect(jobQueueService.registerHandler).toHaveBeenCalledWith("sepa_export", expect.any(Function));
  });

  it("processes a sepa job end-to-end in sandbox", async () => {
    const { registerSepaWorker } = await import("../../server/workers/sepa-worker");
    const { jobQueueService } = await import("../../server/services/jobQueueService");
    const { submitSepaBatchSandbox } = await import("../../server/adapters/sepa/psp-sandbox");
    const { createAuditLog } = await import("../../server/lib/auditLog");

    registerSepaWorker();

    const wrappedHandler = (jobQueueService.registerHandler as any).mock.calls.at(-1)?.[1];

    const payload = {
      batchId: `test-${Date.now()}`,
      organizationId: "org-123",
      invoiceIds: ["inv-1", "inv-2"],
      creditorName: "ACME Hausverwaltung",
      creditorIban: "AT611904300234573201",
      creditorBic: "BKAUATWW",
      creditorId: "AT12ZZZ00000000001",
    };

    const result = await wrappedHandler(payload);

    expect(result).toHaveProperty("batchId", payload.batchId);
    expect(result).toHaveProperty("pspBatchId");
    expect(result).toHaveProperty("invoiceCount", 2);
    expect(submitSepaBatchSandbox).toHaveBeenCalled();
    expect(createAuditLog).toHaveBeenCalled();
  });

  it("handles PSP failure and throws for retry", async () => {
    const { submitSepaBatchSandbox } = await import("../../server/adapters/sepa/psp-sandbox");
    (submitSepaBatchSandbox as any).mockResolvedValueOnce({
      ok: false,
      status: 502,
      body: { error: "sandbox temporary failure" },
    });

    const { registerSepaWorker } = await import("../../server/workers/sepa-worker");
    const { jobQueueService } = await import("../../server/services/jobQueueService");

    registerSepaWorker();
    const wrappedHandler = (jobQueueService.registerHandler as any).mock.calls.at(-1)?.[1];

    const payload = {
      batchId: `fail-${Date.now()}`,
      organizationId: "org-123",
      invoiceIds: ["inv-1"],
      creditorName: "ACME",
      creditorIban: "AT611904300234573201",
      creditorBic: "BKAUATWW",
      creditorId: "AT12ZZZ00000000001",
    };

    await expect(wrappedHandler(payload)).rejects.toThrow("SEPA submit failed");
  });
});
