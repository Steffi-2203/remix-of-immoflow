/**
 * Tests: WEG §24 Assembly Agenda Validation
 */
import { describe, it, expect } from "vitest";
import {
  validateAssemblyAgenda,
  getMandatoryAgendaItems,
  getConditionalAgendaItems,
} from "../../server/services/assemblyAgendaService";

describe("WEG §24 Mandatory Agenda Items", () => {
  it("validates a complete agenda as valid", () => {
    const agenda = [
      "Rechnungslegung (Jahresabrechnung 2024)",
      "Wirtschaftsplan 2026",
      "Rücklagenbericht gemäß §31 WEG",
      "Allfälliges",
    ];
    const result = validateAssemblyAgenda(agenda);
    expect(result.isValid).toBe(true);
    expect(result.missingRequired).toHaveLength(0);
  });

  it("detects missing Rechnungslegung", () => {
    const agenda = [
      "Wirtschaftsplan 2026",
      "Rücklagenbericht",
      "Allfälliges",
    ];
    const result = validateAssemblyAgenda(agenda);
    expect(result.isValid).toBe(false);
    expect(result.missingRequired.some((i) => i.key === "rechnungslegung")).toBe(true);
  });

  it("detects missing Wirtschaftsplan", () => {
    const agenda = [
      "Jahresabrechnung 2024",
      "Rücklagenbericht",
      "Allfälliges",
    ];
    const result = validateAssemblyAgenda(agenda);
    expect(result.isValid).toBe(false);
    expect(result.missingRequired.some((i) => i.key === "wirtschaftsplan")).toBe(true);
  });

  it("detects missing Allfälliges", () => {
    const agenda = [
      "Jahresabrechnung 2024",
      "Wirtschaftsplan 2026",
      "Rücklagenbericht",
    ];
    const result = validateAssemblyAgenda(agenda);
    expect(result.isValid).toBe(false);
    expect(result.missingRequired.some((i) => i.key === "allfaelliges")).toBe(true);
  });

  it("detects all missing items for empty agenda", () => {
    const result = validateAssemblyAgenda([]);
    expect(result.isValid).toBe(false);
    expect(result.missingRequired.length).toBeGreaterThanOrEqual(4);
  });

  it("matches synonyms (Abrechnung → Rechnungslegung)", () => {
    const agenda = [
      "Abrechnung 2024",
      "Voranschlag 2026",
      "Instandhaltungsrücklage",
      "Sonstiges",
    ];
    const result = validateAssemblyAgenda(agenda);
    expect(result.isValid).toBe(true);
  });

  it("matching is case-insensitive", () => {
    const agenda = [
      "JAHRESABRECHNUNG 2024",
      "wirtschaftsplan 2026",
      "RÜckLageNbericht",
      "allfälliges",
    ];
    const result = validateAssemblyAgenda(agenda);
    expect(result.isValid).toBe(true);
  });
});

describe("WEG §24 Conditional Agenda Items", () => {
  it("requires Verwalterbestellung when contract is expiring", () => {
    const agenda = [
      "Jahresabrechnung 2024",
      "Wirtschaftsplan 2026",
      "Rücklagenbericht",
      "Allfälliges",
    ];
    const result = validateAssemblyAgenda(agenda, "ordentlich", {
      managementContractExpiring: true,
    });
    expect(result.isValid).toBe(false);
    expect(result.missingRequired.some((i) => i.key === "verwalterbestellung")).toBe(true);
  });

  it("passes when Verwalterbestellung is present and contract expiring", () => {
    const agenda = [
      "Jahresabrechnung 2024",
      "Wirtschaftsplan 2026",
      "Rücklagenbericht",
      "Allfälliges",
      "Bestellung des Verwalters",
    ];
    const result = validateAssemblyAgenda(agenda, "ordentlich", {
      managementContractExpiring: true,
    });
    expect(result.isValid).toBe(true);
  });

  it("requires Instandhaltung when major maintenance is planned", () => {
    const agenda = [
      "Jahresabrechnung 2024",
      "Wirtschaftsplan 2026",
      "Rücklagenbericht",
      "Allfälliges",
    ];
    const result = validateAssemblyAgenda(agenda, "ordentlich", {
      majorMaintenancePlanned: true,
    });
    expect(result.isValid).toBe(false);
    expect(result.missingRequired.some((i) => i.key === "grosse_instandhaltung")).toBe(true);
  });
});

describe("WEG §24 Extraordinary Assemblies", () => {
  it("skips mandatory checks for ausserordentliche Versammlungen", () => {
    const result = validateAssemblyAgenda([], "ausserordentlich");
    expect(result.isValid).toBe(true);
    expect(result.missingRequired).toHaveLength(0);
  });
});

describe("Agenda Item Lists", () => {
  it("returns mandatory items", () => {
    const items = getMandatoryAgendaItems();
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items.every((i) => i.required)).toBe(true);
  });

  it("returns conditional items", () => {
    const items = getConditionalAgendaItems();
    expect(items.length).toBeGreaterThanOrEqual(2);
  });
});
