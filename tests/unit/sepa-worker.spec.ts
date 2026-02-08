import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb, createMockAudit } from "../test-helpers/mock-db";

// Mock all dependencies before importing the worker
vi.mock("../../server/db", () => {
  const mockDb = {
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }) }),
    insert: () => ({ values: () => ({ onConflictDoUpdate: () => Promise.resolve() }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  };
  return { db: mockDb };
});

vi.mock("../../server/adapters/sepa/psp-sandbox", () => ({
  submitSepaBatchSandbox: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body: { pspBatchId: "SBX-TEST-123", message: "accepted", timestamp: new Date().toISOString() },
  }),
}));

vi.mock("../../server/services/sepaExportService", () => ({
  sepaExportService: {
    generateDirectDebitXml: vi.fn().mockResolvedValue("<SEPA>test-xml</SEPA>"),
  },
}));

vi.mock("../../server/lib/auditLog", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../server/services/jobQueueService", () => ({
  jobQueueService: {
    registerHandler: vi.fn(),
  },
}));

vi.mock("../../server/lib/idempotency", () => ({
  acquireJobLock: vi.fn().mockResolvedValue({ acquired: true }),
  markJobCompleted: vi.fn().mockResolvedValue(undefined),
  markJobFailed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../server/lib/tracing", () => ({
  createTrace: () => ({
    startSpan: () => ({
      setAttribute: vi.fn(),
      setStatus: vi.fn(),
      end: vi.fn(),
    }),
    finish: vi.fn(),
  }),
}));

describe("sepa-worker (unit, mocked deps)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registerSepaWorker registers a handler for sepa_export", async () => {
    const { jobQueueService } = await import("../../server/services/jobQueueService");
    const { registerSepaWorker } = await import("../../server/workers/sepa-worker");

    registerSepaWorker();

    expect(jobQueueService.registerHandler).toHaveBeenCalledWith(
      "sepa_export",
      expect.any(Function)
    );
  });

  it("PSP sandbox mock returns success", async () => {
    const { submitSepaBatchSandbox } = await import("../../server/adapters/sepa/psp-sandbox");

    const result = await submitSepaBatchSandbox("<xml/>");
    expect(result.ok).toBe(true);
    expect(result.body.pspBatchId).toBe("SBX-TEST-123");
  });

  it("sepaExportService mock generates XML", async () => {
    const { sepaExportService } = await import("../../server/services/sepaExportService");

    const xml = await sepaExportService.generateDirectDebitXml("org1", "ACME", "DE89...", "BIC", "CID", ["inv1"]);
    expect(xml).toContain("<SEPA>");
  });
});
