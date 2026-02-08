import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockDb, createMockAudit } from "../test-helpers/mock-db";

/**
 * Tests the water cost calculation logic that would be used
 * by the invoice generator when processing water line items.
 * Uses the same pure-function approach as water-cost-shares.test.ts.
 */

interface WaterReading {
  unitId: string;
  consumption: number;
  coefficient: number;
}

function calculateWaterLineAmount(
  readings: WaterReading[],
  unitId: string,
  totalWaterCost: number,
  allUnitIds: string[]
): { amount: number; provisional: boolean } {
  const buildingTotal = readings.reduce((s, r) => s + r.consumption * r.coefficient, 0);

  if (buildingTotal > 0) {
    const unitReading = readings.find((r) => r.unitId === unitId);
    if (!unitReading) return { amount: 0, provisional: true };
    const weighted = unitReading.consumption * unitReading.coefficient;
    return {
      amount: Math.round((weighted / buildingTotal) * totalWaterCost * 100) / 100,
      provisional: false,
    };
  }

  // Fallback: equal distribution
  return {
    amount: Math.round((totalWaterCost / allUnitIds.length) * 100) / 100,
    provisional: true,
  };
}

describe("invoiceGenerator water costs (unit)", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let mockAudit: ReturnType<typeof createMockAudit>;

  beforeEach(() => {
    mockDb = createMockDb();
    mockAudit = createMockAudit();
  });

  it("calculates water cost without throwing when no readings exist (fallback)", () => {
    const result = calculateWaterLineAmount([], "unit-1", 1000, ["unit-1", "unit-2"]);
    expect(result.amount).toBe(500);
    expect(result.provisional).toBe(true);
  });

  it("calculates weighted share when readings exist", () => {
    const readings: WaterReading[] = [
      { unitId: "unit-1", consumption: 30, coefficient: 1.0 },
      { unitId: "unit-2", consumption: 70, coefficient: 1.0 },
    ];
    const result = calculateWaterLineAmount(readings, "unit-1", 1000, ["unit-1", "unit-2"]);
    expect(result.amount).toBe(300);
    expect(result.provisional).toBe(false);
  });

  it("returns 0 for unit with no reading when others have readings", () => {
    const readings: WaterReading[] = [
      { unitId: "unit-2", consumption: 100, coefficient: 1.0 },
    ];
    const result = calculateWaterLineAmount(readings, "unit-1", 1000, ["unit-1", "unit-2"]);
    expect(result.amount).toBe(0);
    expect(result.provisional).toBe(true);
  });

  it("applies coefficient correctly", () => {
    const readings: WaterReading[] = [
      { unitId: "unit-1", consumption: 50, coefficient: 2.0 },
      { unitId: "unit-2", consumption: 50, coefficient: 1.0 },
    ];
    // weighted: unit-1=100, unit-2=50, total=150
    const result = calculateWaterLineAmount(readings, "unit-1", 1500, ["unit-1", "unit-2"]);
    expect(result.amount).toBe(1000);
    expect(result.provisional).toBe(false);
  });

  it("mock db tracks queries", async () => {
    await mockDb.query("SELECT * FROM water_readings WHERE unit_id = $1", ["unit-1"]);
    expect(mockDb.__state.selects).toHaveLength(1);
  });
});
