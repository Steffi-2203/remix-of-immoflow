/**
 * server/services/assemblyAgendaService.ts
 *
 * WEG §24 Abs 5: Pflicht-Tagesordnungspunkte für Eigentümerversammlungen.
 *
 * Bei ordentlichen Eigentümerversammlungen müssen bestimmte Punkte
 * verpflichtend auf der Tagesordnung stehen:
 *  - Rechnungslegung (Jahresabrechnung des Vorjahres)
 *  - Vorschau/Wirtschaftsplan (Vorschreibung Folgejahr)
 *  - Rücklagenbericht (§31 WEG)
 *  - Bestellung/Entlastung des Verwalters (wenn Vertrag ausläuft)
 *  - Allfälliges
 */

import { billingLogger } from "../lib/logger";

const logger = billingLogger.child({ module: "assembly-agenda" });

export type AssemblyType = "ordentlich" | "ausserordentlich";

export interface AgendaItem {
  /** Unique key for this agenda point */
  key: string;
  /** Display title */
  title: string;
  /** Whether this item is legally required */
  required: boolean;
  /** Legal basis */
  legalBasis: string;
  /** Explanation of why it's required */
  reason: string;
}

export interface AgendaValidationResult {
  isValid: boolean;
  missingRequired: AgendaItem[];
  presentRequired: AgendaItem[];
  warnings: string[];
}

/**
 * Mandatory agenda items for ordentliche Eigentümerversammlungen per WEG §24.
 */
const MANDATORY_AGENDA_ITEMS: AgendaItem[] = [
  {
    key: "rechnungslegung",
    title: "Rechnungslegung (Jahresabrechnung)",
    required: true,
    legalBasis: "WEG §34 Abs 1",
    reason: "Der Verwalter muss jährlich Rechnung legen (Einnahmen/Ausgaben, Rücklagenstand).",
  },
  {
    key: "wirtschaftsplan",
    title: "Wirtschaftsplan / Vorschau",
    required: true,
    legalBasis: "WEG §24 Abs 5",
    reason: "Vorschreibungen (Akonti) für das Folgejahr müssen beschlossen werden.",
  },
  {
    key: "ruecklagenbericht",
    title: "Rücklagenbericht (§31 WEG)",
    required: true,
    legalBasis: "WEG §31 Abs 1",
    reason: "Stand und Entwicklung der Instandhaltungsrücklage müssen dargelegt werden.",
  },
  {
    key: "allfaelliges",
    title: "Allfälliges",
    required: true,
    legalBasis: "WEG §24 Abs 5",
    reason: "Pflichtpunkt für sonstige Anträge und Wortmeldungen.",
  },
];

/**
 * Conditional agenda items (required only under certain circumstances).
 */
const CONDITIONAL_AGENDA_ITEMS: AgendaItem[] = [
  {
    key: "verwalterbestellung",
    title: "Bestellung / Entlastung des Verwalters",
    required: false, // becomes required when contract expires
    legalBasis: "WEG §19",
    reason: "Wenn der Verwaltungsvertrag im laufenden oder kommenden Jahr ausläuft.",
  },
  {
    key: "grosse_instandhaltung",
    title: "Beschluss über größere Erhaltungsarbeiten",
    required: false,
    legalBasis: "WEG §28 Abs 1",
    reason: "Wenn größere Instandhaltungsmaßnahmen geplant sind.",
  },
];

/** Normalized matching: lowercase, trimmed, common synonyms resolved */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-zäöüß\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Check if a provided agenda title matches a mandatory item */
function matchesAgendaItem(providedTitle: string, item: AgendaItem): boolean {
  const normalized = normalizeTitle(providedTitle);
  const itemNormalized = normalizeTitle(item.title);
  const key = item.key.toLowerCase();

  // Direct key match
  if (normalized.includes(key)) return true;
  // Title substring match
  if (normalized.includes(itemNormalized) || itemNormalized.includes(normalized)) return true;

  // Synonym matching
  const synonyms: Record<string, string[]> = {
    rechnungslegung: ["jahresabrechnung", "abrechnung", "rechnungsbericht", "rechnungslegung"],
    wirtschaftsplan: ["vorschau", "wirtschaftsplan", "budget", "voranschlag", "akonti"],
    ruecklagenbericht: ["rücklage", "ruecklage", "rücklagenbericht", "instandhaltungsrücklage", "reservefonds"],
    allfaelliges: ["allfälliges", "allfaelliges", "sonstiges", "verschiedenes"],
    verwalterbestellung: ["verwalter", "verwaltung", "entlastung", "bestellung"],
    grosse_instandhaltung: ["erhaltung", "instandhaltung", "sanierung", "renovierung"],
  };

  const itemSynonyms = synonyms[item.key] || [];
  return itemSynonyms.some((syn) => normalized.includes(syn));
}

/**
 * Validate agenda items for a WEG owner assembly.
 *
 * @param providedItems - Titles of agenda items as provided by the user
 * @param assemblyType - "ordentlich" (regular) or "ausserordentlich" (extraordinary)
 * @param options - Additional context for conditional items
 */
export function validateAssemblyAgenda(
  providedItems: string[],
  assemblyType: AssemblyType = "ordentlich",
  options: {
    /** Is the management contract expiring within 12 months? */
    managementContractExpiring?: boolean;
    /** Are major maintenance works planned? */
    majorMaintenancePlanned?: boolean;
  } = {}
): AgendaValidationResult {
  // For extraordinary assemblies, no mandatory items beyond what's explicitly called
  if (assemblyType === "ausserordentlich") {
    return {
      isValid: true,
      missingRequired: [],
      presentRequired: [],
      warnings: [],
    };
  }

  // Build the full required list including conditional items
  const requiredItems = [...MANDATORY_AGENDA_ITEMS];

  if (options.managementContractExpiring) {
    const verwalter = CONDITIONAL_AGENDA_ITEMS.find((i) => i.key === "verwalterbestellung")!;
    requiredItems.push({ ...verwalter, required: true });
  }

  if (options.majorMaintenancePlanned) {
    const maintenance = CONDITIONAL_AGENDA_ITEMS.find((i) => i.key === "grosse_instandhaltung")!;
    requiredItems.push({ ...maintenance, required: true });
  }

  const presentRequired: AgendaItem[] = [];
  const missingRequired: AgendaItem[] = [];
  const warnings: string[] = [];

  for (const item of requiredItems) {
    const found = providedItems.some((provided) => matchesAgendaItem(provided, item));
    if (found) {
      presentRequired.push(item);
    } else {
      missingRequired.push(item);
    }
  }

  if (missingRequired.length > 0) {
    logger.warn(
      { missing: missingRequired.map((i) => i.key), provided: providedItems },
      "WEG §24: Missing mandatory agenda items"
    );
    warnings.push(
      `Gemäß WEG §24 fehlen ${missingRequired.length} Pflicht-Tagesordnungspunkt(e): ${missingRequired.map((i) => i.title).join(", ")}`
    );
  }

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    presentRequired,
    warnings,
  };
}

/**
 * Get the full list of mandatory agenda items for reference/UI.
 */
export function getMandatoryAgendaItems(): AgendaItem[] {
  return [...MANDATORY_AGENDA_ITEMS];
}

/**
 * Get conditional agenda items for reference/UI.
 */
export function getConditionalAgendaItems(): AgendaItem[] {
  return [...CONDITIONAL_AGENDA_ITEMS];
}
