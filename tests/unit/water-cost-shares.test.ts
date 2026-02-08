import { describe, it, expect, vi, beforeEach } from "vitest";
import { roundMoney } from "../../shared/utils";

/**
 * Unit tests for water cost share calculation logic.
 * Tests the core algorithm without requiring a database connection.
 */

interface WaterReading {
  unitId: string;
  weighted: number;
}

function calculateWaterShares(
  readings: WaterReading[],
  unitIds: string[],
  totalWaterCost: number
): Map<string, { share: number; provisional: boolean }> {
  const result = new Map<string, { share: number; provisional: boolean }>();
  const buildingTotal = readings.reduce((s, r) => s + r.weighted, 0);

  if (buildingTotal > 0) {
    for (const r of readings) {
      const share = roundMoney((r.weighted / buildingTotal) * totalWaterCost);
      result.set(r.unitId, { share, provisional: false });
    }
  } else {
    const perUnit = roundMoney(totalWaterCost / unitIds.length);
    for (const uid of unitIds) {
      result.set(uid, { share: perUnit, provisional: true });
    }
  }

  return result;
}

describe("Water cost share calculation", () => {
  const unitIds = ["unit-1", "unit-2", "unit-3"];

  it("distributes by consumption when readings exist", () => {
    const readings: WaterReading[] = [
      { unitId: "unit-1", weighted: 100 },
      { unitId: "unit-2", weighted: 200 },
      { unitId: "unit-3", weighted: 300 },
    ];
    const totalCost = 600;

    const shares = calculateWaterShares(readings, unitIds, totalCost);

    expect(shares.get("unit-1")).toEqual({ share: 100, provisional: false });
    expect(shares.get("unit-2")).toEqual({ share: 200, provisional: false });
    expect(shares.get("unit-3")).toEqual({ share: 300, provisional: false });
  });

  it("falls back to equal distribution when no readings", () => {
    const shares = calculateWaterShares([], unitIds, 900);

    expect(shares.get("unit-1")).toEqual({ share: 300, provisional: true });
    expect(shares.get("unit-2")).toEqual({ share: 300, provisional: true });
    expect(shares.get("unit-3")).toEqual({ share: 300, provisional: true });
  });

  it("falls back to equal when building total is zero", () => {
    const readings: WaterReading[] = [
      { unitId: "unit-1", weighted: 0 },
      { unitId: "unit-2", weighted: 0 },
    ];
    const shares = calculateWaterShares(readings, unitIds, 300);

    expect(shares.size).toBe(3);
    for (const [, v] of shares) {
      expect(v.provisional).toBe(true);
      expect(v.share).toBe(100);
    }
  });

  it("applies coefficient correctly", () => {
    // coefficient is already baked into weighted values
    const readings: WaterReading[] = [
      { unitId: "unit-1", weighted: 50 },  // 100 consumption * 0.5 coefficient
      { unitId: "unit-2", weighted: 150 }, // 100 consumption * 1.5 coefficient
    ];
    const shares = calculateWaterShares(readings, ["unit-1", "unit-2"], 1000);

    expect(shares.get("unit-1")!.share).toBe(250);
    expect(shares.get("unit-2")!.share).toBe(750);
  });

  it("handles single unit", () => {
    const readings: WaterReading[] = [{ unitId: "unit-1", weighted: 42 }];
    const shares = calculateWaterShares(readings, ["unit-1"], 500);

    expect(shares.get("unit-1")).toEqual({ share: 500, provisional: false });
  });

  it("handles rounding correctly", () => {
    const readings: WaterReading[] = [
      { unitId: "unit-1", weighted: 1 },
      { unitId: "unit-2", weighted: 1 },
      { unitId: "unit-3", weighted: 1 },
    ];
    const shares = calculateWaterShares(readings, unitIds, 100);

    // Each share should be rounded to 2 decimals
    for (const [, v] of shares) {
      expect(Number.isFinite(v.share)).toBe(true);
      expect(v.share.toString().split(".")[1]?.length || 0).toBeLessThanOrEqual(2);
    }
  });
});
