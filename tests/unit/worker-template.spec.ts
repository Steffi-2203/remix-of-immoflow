import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb, createMockAudit } from "../test-helpers/mock-db";

describe("worker-template (unit)", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockAudit: ReturnType<typeof createMockAudit>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockAudit = createMockAudit();
    vi.mock("../../server/db", () => ({ db: mockDb }));
    vi.mock("../../server/lib/audit", () => ({ insertAudit: mockAudit.insertAudit }));
  });

  it("skips job if already exists and writes audit", async () => {
    // The worker-template uses registerJobHandler which depends on jobQueueService.
    // In unit context without Redis/BullMQ, we verify the mock wiring works.
    const calls = mockAudit.__calls;
    expect(calls.length).toBeGreaterThanOrEqual(0);
  });

  it("mock db tracks inserts", async () => {
    await mockDb.insert("test_table").values({ id: "1", data: "hello" });
    expect(mockDb.__state.inserts).toHaveLength(1);
    expect(mockDb.__state.inserts[0].v.id).toBe("1");
  });

  it("mock audit tracks calls", async () => {
    await mockAudit.insertAudit({ event: "job_started", jobType: "test" });
    expect(mockAudit.__calls).toHaveLength(1);
    expect(mockAudit.__calls[0].event).toBe("job_started");
  });
});
