import { roundMoney } from "@shared/utils";

/**
 * MRG §21 – Umlagefähige Betriebskosten-Kategorien
 * Gemäß Mietrechtsgesetz §21 Abs. 1
 */
const UMLAGEFAEHIGE_KATEGORIEN = new Set([
  'versicherung',
  'wasser',
  'kanal',
  'muell',
  'strom',
  'hausbetreuung',
  'lift',
  'garten',
  'schneeraeumung',
  'grundsteuer',
  'verwaltung',
  'heizung',
]);

const NICHT_UMLAGEFAEHIG = new Set([
  'instandhaltung',
  'reparatur',
  'finanzierung',
  'ruecklage',
  'abschreibung',
]);

/**
 * MRG Kategorie-Abschläge auf den Richtwert
 * A = Vollanwendung (100%), B = 75%, C = 50%, D = 25% (Substandard)
 */
const KATEGORIE_FAKTOREN: Record<string, number> = {
  A: 1.00,
  B: 0.75,
  C: 0.50,
  D: 0.25,
};

interface Expense {
  type: string;
  amount: number;
}

interface HauptmietzinsParams {
  flaeche: number;
  kategorie: string;
  richtwert: number;
}

interface IndexAdjustmentParams {
  baseRent: number;
  baseIndex: number;
  currentIndex: number;
  threshold?: number; // default 5%
  halfRule?: boolean;
}

interface BefristungsParams {
  nettoMiete: number;
  befristet: boolean;
  abschlagProzent?: number; // default 25%
}

export const mrg = {
  /**
   * Kaufmännische Rundung auf 2 Dezimalstellen.
   */
  round(value: number): number {
    return roundMoney(value);
  },

  /**
   * MRG §21 – Prüft ob eine Ausgabe umlagefähig ist.
   */
  isUmlagefaehig(expense: Expense): boolean {
    return UMLAGEFAEHIGE_KATEGORIEN.has(expense.type);
  },

  /**
   * Berechnet den Richtwert (Fläche × Richtwert pro m²).
   */
  calculateRichtwert(params: { flaeche: number; richtwert: number }): number {
    return roundMoney(params.flaeche * params.richtwert);
  },

  /**
   * Berechnet den Hauptmietzins basierend auf Richtwert und Kategorie.
   * Hauptmietzins = Fläche × Richtwert × Kategorie-Faktor
   */
  calculateHauptmietzins(params: HauptmietzinsParams): number {
    const faktor = KATEGORIE_FAKTOREN[params.kategorie] ?? 1.0;
    return roundMoney(params.flaeche * params.richtwert * faktor);
  },

  /**
   * VPI-Wertsicherung: Berechnet die indexierte Miete.
   */
  calculateIndexAdjustment(params: IndexAdjustmentParams) {
    const threshold = params.threshold ?? 5;
    const ratio = params.currentIndex / params.baseIndex;
    const changePercent = roundMoney((ratio - 1) * 100);
    const thresholdMet = Math.abs(changePercent) >= threshold;

    let appliedPercent = 0;
    if (thresholdMet) {
      appliedPercent = params.halfRule ? roundMoney(changePercent / 2) : changePercent;
    }

    const adjustedRent = thresholdMet
      ? roundMoney(params.baseRent * (1 + appliedPercent / 100))
      : params.baseRent;

    return { changePercent, thresholdMet, adjustedRent, appliedPercent };
  },

  /**
   * Befristungsabschlag gem. MRG (typisch 25%).
   */
  calculateBefristungsabschlag(params: BefristungsParams): number {
    if (!params.befristet) return params.nettoMiete;
    const abschlag = params.abschlagProzent ?? 25;
    return roundMoney(params.nettoMiete * (1 - abschlag / 100));
  },

  /**
   * Abrechnungsfrist gem. MRG §21: 30. Juni des Folgejahres
   */
  getAbrechnungsDeadline(year: number): Date {
    return new Date(year + 1, 5, 30);
  },

  /**
   * Verjährungsfrist: 3 Jahre ab Abrechnungsfrist
   */
  getVerjaehrungsDeadline(year: number): Date {
    const deadline = this.getAbrechnungsDeadline(year);
    deadline.setFullYear(deadline.getFullYear() + 3);
    return deadline;
  },

  /**
   * Gesetzliche Verzugszinsen gem. ABGB §1333: 4% p.a.
   */
  calculateVerzugszinsen(principal: number, daysOverdue: number, annualRate = 4): number {
    return roundMoney(principal * (annualRate / 365 / 100) * daysOverdue);
  },
};
