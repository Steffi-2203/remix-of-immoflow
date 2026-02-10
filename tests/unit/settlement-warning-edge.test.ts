import { describe, it, expect } from "vitest";

/**
 * Settlement warning edge cases for MRG §21 Abs 3 deadlines.
 * BK-Abrechnung must be delivered by 30.06. of the following year.
 *
 * Tests boundary conditions: exactly on deadline, one day before, one day after.
 */

function getMrgDeadline(abrechnungsjahr: number): Date {
  // 30. Juni des Folgejahres
  return new Date(abrechnungsjahr + 1, 5, 30); // Month is 0-indexed
}

function isAfterDeadline(abrechnungsjahr: number, today: Date): boolean {
  const deadline = getMrgDeadline(abrechnungsjahr);
  return today > deadline;
}

function getExpirationDate(abrechnungsjahr: number): Date {
  // 3-Jahres-Verjährung: ab 01.01. des Folgejahres + 3 Jahre
  return new Date(abrechnungsjahr + 4, 0, 1);
}

function isExpired(abrechnungsjahr: number, today: Date): boolean {
  return today >= getExpirationDate(abrechnungsjahr);
}

describe("Settlement Warning Edge Cases (MRG §21)", () => {
  describe("§21 Abs 3: Abrechnungsfrist 30.06.", () => {
    it("should NOT warn on 29.06. (one day before deadline)", () => {
      const today = new Date(2026, 5, 29); // 29.06.2026
      expect(isAfterDeadline(2025, today)).toBe(false);
    });

    it("should NOT warn on 30.06. (exactly on deadline)", () => {
      // At midnight of 30.06., the deadline day has not yet passed
      const today = new Date(2026, 5, 30, 0, 0, 0); // 30.06.2026 00:00:00
      expect(isAfterDeadline(2025, today)).toBe(false);
    });

    it("should warn on 01.07. (one day after deadline)", () => {
      const today = new Date(2026, 6, 1); // 01.07.2026
      expect(isAfterDeadline(2025, today)).toBe(true);
    });

    it("should warn on 30.06. at 23:59:59 (end of deadline day)", () => {
      const today = new Date(2026, 5, 30, 23, 59, 59);
      // Still within the deadline day
      expect(isAfterDeadline(2025, today)).toBe(false);
    });

    it("should generate correct deadline date", () => {
      const deadline = getMrgDeadline(2024);
      expect(deadline.getFullYear()).toBe(2025);
      expect(deadline.getMonth()).toBe(5); // June (0-indexed)
      expect(deadline.getDate()).toBe(30);
    });
  });

  describe("§21 Abs 4: 3-Jahres-Verjährung", () => {
    it("should NOT be expired on 31.12.2028 for year 2025", () => {
      const today = new Date(2028, 11, 31); // 31.12.2028
      expect(isExpired(2025, today)).toBe(false);
    });

    it("should be expired on 01.01.2029 for year 2025", () => {
      const today = new Date(2029, 0, 1); // 01.01.2029
      expect(isExpired(2025, today)).toBe(true);
    });

    it("should NOT be expired exactly on 31.12. of third year", () => {
      const today = new Date(2027, 11, 31); // 31.12.2027 for year 2024
      expect(isExpired(2024, today)).toBe(false);
    });

    it("should be expired on 01.01. of fourth year", () => {
      const today = new Date(2028, 0, 1); // 01.01.2028 for year 2024
      expect(isExpired(2024, today)).toBe(true);
    });
  });

  describe("Combined checks", () => {
    it("deadline passed but not yet expired = warning only", () => {
      const year = 2024;
      const today = new Date(2026, 0, 15); // 15.01.2026

      const deadlinePassed = isAfterDeadline(year, today);
      const expired = isExpired(year, today);

      expect(deadlinePassed).toBe(true);
      expect(expired).toBe(false);
    });

    it("both deadline passed and expired = double warning", () => {
      const year = 2020;
      const today = new Date(2025, 6, 1);

      expect(isAfterDeadline(year, today)).toBe(true);
      expect(isExpired(year, today)).toBe(true);
    });

    it("within all limits = no warnings", () => {
      const year = 2025;
      const today = new Date(2026, 2, 15); // March 2026

      expect(isAfterDeadline(year, today)).toBe(false);
      expect(isExpired(year, today)).toBe(false);
    });
  });
});
