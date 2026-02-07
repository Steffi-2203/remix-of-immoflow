import { db } from "./db";
import { distributionKeys } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

const STANDARD_DISTRIBUTION_KEYS = [
  {
    keyCode: "nutzflaeche",
    name: "Nutzfläche (m²)",
    description: "Verteilung nach Nutzfläche in Quadratmetern",
    unit: "m²",
    inputType: "flaeche",
    isSystem: true,
    mrgKonform: true,
    mrgParagraph: "§21 MRG",
    sortOrder: 1,
  },
  {
    keyCode: "einheiten",
    name: "Anzahl Einheiten",
    description: "Gleicher Anteil pro Mieteinheit (1:1)",
    unit: "Stück",
    inputType: "anzahl",
    isSystem: true,
    mrgKonform: true,
    mrgParagraph: "§21 MRG",
    sortOrder: 2,
  },
  {
    keyCode: "personen",
    name: "Anzahl Personen",
    description: "Verteilung nach Anzahl der Bewohner",
    unit: "Personen",
    inputType: "anzahl",
    isSystem: true,
    mrgKonform: true,
    mrgParagraph: "§21 MRG",
    sortOrder: 3,
  },
  {
    keyCode: "pauschal",
    name: "Pauschal (Gleichverteilung)",
    description: "Gleiche Verteilung auf alle aktiven Mieter",
    unit: "Anteil",
    inputType: "pauschal",
    isSystem: true,
    mrgKonform: true,
    mrgParagraph: "§21 MRG",
    sortOrder: 4,
  },
  {
    keyCode: "verbrauch",
    name: "Verbrauch",
    description: "Verteilung nach tatsächlichem Verbrauch (Zählerstand)",
    unit: "kWh/m³",
    inputType: "verbrauch",
    isSystem: true,
    mrgKonform: true,
    mrgParagraph: "§21 MRG",
    sortOrder: 5,
  },
  {
    keyCode: "sondernutzung",
    name: "Sondernutzung",
    description: "Für Garage, Keller, Terrasse etc. mit individuellen Anteilen",
    unit: "Anteil",
    inputType: "sondernutzung",
    isSystem: true,
    mrgKonform: true,
    mrgParagraph: "§21 MRG",
    sortOrder: 6,
  },
];

export async function seedDistributionKeys(): Promise<void> {
  try {
    const existingKeys = await db
      .select()
      .from(distributionKeys)
      .where(and(
        eq(distributionKeys.isSystem, true),
        isNull(distributionKeys.organizationId)
      ));

    if (existingKeys.length >= STANDARD_DISTRIBUTION_KEYS.length) {
      console.log("Standard distribution keys already exist, skipping seed");
      return;
    }

    for (const key of STANDARD_DISTRIBUTION_KEYS) {
      const exists = existingKeys.find((k) => k.keyCode === key.keyCode);
      if (!exists) {
        await db.insert(distributionKeys).values({
          ...key,
          organizationId: null,
        });
        console.log(`Created distribution key: ${key.name}`);
      }
    }

    console.log("Distribution keys seeded successfully");
  } catch (error) {
    console.error("Error seeding distribution keys:", error);
  }
}

export { STANDARD_DISTRIBUTION_KEYS };
