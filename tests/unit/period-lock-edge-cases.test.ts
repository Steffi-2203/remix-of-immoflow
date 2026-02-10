import { describe, it, expect } from "vitest";

/**
 * Period-Lock edge cases:
 * - Month boundaries (31.1. vs 1.2.)
 * - Year transitions (31.12. vs 1.1.)
 * - Leap year (29.2.)
 * - Date parsing consistency
 */

function parsePeriod(dateStr: string): { year: number; month: number } {
  const d = new Date(dateStr);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

describe("Period-Lock Edge Cases", () => {
  describe("Month boundaries", () => {
    it("should assign 31.1. to January", () => {
      const { year, month } = parsePeriod("2025-01-31");
      expect(year).toBe(2025);
      expect(month).toBe(1);
    });

    it("should assign 1.2. to February", () => {
      const { year, month } = parsePeriod("2025-02-01");
      expect(year).toBe(2025);
      expect(month).toBe(2);
    });

    it("should assign 28.2. to February (non-leap)", () => {
      const { year, month } = parsePeriod("2025-02-28");
      expect(year).toBe(2025);
      expect(month).toBe(2);
    });

    it("should assign 30.4. to April", () => {
      const { year, month } = parsePeriod("2025-04-30");
      expect(year).toBe(2025);
      expect(month).toBe(4);
    });

    it("should assign 31.3. to March", () => {
      const { year, month } = parsePeriod("2025-03-31");
      expect(year).toBe(2025);
      expect(month).toBe(3);
    });
  });

  describe("Year transitions", () => {
    it("should assign 31.12. to December of current year", () => {
      const { year, month } = parsePeriod("2025-12-31");
      expect(year).toBe(2025);
      expect(month).toBe(12);
    });

    it("should assign 1.1. to January of next year", () => {
      const { year, month } = parsePeriod("2026-01-01");
      expect(year).toBe(2026);
      expect(month).toBe(1);
    });
  });

  describe("Leap year handling", () => {
    it("should correctly parse 29.2. in a leap year (2024)", () => {
      const { year, month } = parsePeriod("2024-02-29");
      expect(year).toBe(2024);
      expect(month).toBe(2);
    });

    it("should handle invalid 29.2. in non-leap year (rolls to March)", () => {
      // JavaScript Date rolls over invalid dates
      const d = new Date("2025-02-29");
      // In ISO parsing, 2025-02-29 becomes March 1st
      expect(d.getMonth() + 1).toBe(3);
      expect(d.getDate()).toBe(1);
    });
  });

  describe("Lock state detection", () => {
    it("locked period should block mutation for same month", () => {
      const lockedPeriods = [
        { year: 2025, month: 1, isLocked: true },
        { year: 2025, month: 2, isLocked: false },
      ];

      const check = (year: number, month: number) =>
        lockedPeriods.find((p) => p.year === year && p.month === month)
          ?.isLocked ?? false;

      expect(check(2025, 1)).toBe(true);
      expect(check(2025, 2)).toBe(false);
      expect(check(2025, 3)).toBe(false); // Non-existent = open
    });

    it("should distinguish adjacent months correctly", () => {
      const isLocked = (month: number) => month <= 6; // H1 locked

      expect(isLocked(6)).toBe(true);
      expect(isLocked(7)).toBe(false);
    });
  });
});
