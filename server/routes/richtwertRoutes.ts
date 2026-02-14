import { Router, Request, Response } from "express";
import { isAuthenticated } from "./helpers";

const router = Router();

const richtwertValues: Record<string, number> = {
  "Wien": 6.67,
  "Niederösterreich": 6.85,
  "Oberösterreich": 7.23,
  "Salzburg": 9.22,
  "Tirol": 8.14,
  "Vorarlberg": 10.25,
  "Steiermark": 9.21,
  "Kärnten": 7.81,
  "Burgenland": 6.09,
};

const kategorieValues: Record<string, number> = {
  "A": 4.47,
  "B": 3.35,
  "C": 2.24,
  "D_brauchbar": 2.24,
  "D_unbrauchbar": 1.12,
};

router.get("/api/richtwert/values", isAuthenticated, async (_req: Request, res: Response) => {
  try {
    res.json({
      richtwerte: richtwertValues,
      kategorien: kategorieValues,
      stand: "2025/2026",
    });
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Laden der Richtwerte" });
  }
});

router.post("/api/richtwert/calculate", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const {
      bundesland,
      nutzflaeche,
      lagezuschlag = 0,
      ausstattung = 0,
      balkonTerrasse = 0,
      stockwerk = 0,
      aufzug = false,
      aufzugProzent = 10,
      befristung = false,
      moeblierung = 0,
      zustand = 0,
      garageStellplatz = 0,
    } = req.body;

    if (!bundesland || !richtwertValues[bundesland]) {
      return res.status(400).json({ error: "Ungültiges Bundesland" });
    }

    if (!nutzflaeche || nutzflaeche <= 0) {
      return res.status(400).json({ error: "Ungültige Nutzfläche" });
    }

    const baseRichtwert = richtwertValues[bundesland];
    const baseRent = nutzflaeche * baseRichtwert;

    let stockwerkProzent = 0;
    if (stockwerk > 0) {
      stockwerkProzent = Math.min(stockwerk * 3, 10);
    } else if (stockwerk < 0) {
      stockwerkProzent = Math.max(stockwerk * 5, -5);
    }

    const aufzugProzentValue = aufzug ? aufzugProzent : 0;
    const befristungProzent = befristung ? -25 : 0;

    const sumPercentage =
      lagezuschlag +
      ausstattung +
      balkonTerrasse +
      stockwerkProzent +
      aufzugProzentValue +
      befristungProzent +
      moeblierung +
      zustand;

    const adjustedRent = baseRent * (1 + sumPercentage / 100);
    const finalRent = adjustedRent + garageStellplatz;

    const surcharges = {
      lagezuschlag: { prozent: lagezuschlag, betrag: baseRent * (lagezuschlag / 100) },
      ausstattung: { prozent: ausstattung, betrag: baseRent * (ausstattung / 100) },
      balkonTerrasse: { prozent: balkonTerrasse, betrag: baseRent * (balkonTerrasse / 100) },
      stockwerk: { prozent: stockwerkProzent, betrag: baseRent * (stockwerkProzent / 100) },
      aufzug: { prozent: aufzugProzentValue, betrag: baseRent * (aufzugProzentValue / 100) },
      befristung: { prozent: befristungProzent, betrag: baseRent * (befristungProzent / 100) },
      moeblierung: { prozent: moeblierung, betrag: baseRent * (moeblierung / 100) },
      zustand: { prozent: zustand, betrag: baseRent * (zustand / 100) },
      garageStellplatz: { fix: true, betrag: garageStellplatz },
    };

    const totalSurchargesPercent = sumPercentage;
    const totalSurchargesAmount = adjustedRent - baseRent + garageStellplatz;

    res.json({
      bundesland,
      nutzflaeche,
      baseRichtwert,
      baseRent: Math.round(baseRent * 100) / 100,
      surcharges,
      totalSurchargesPercent,
      totalSurchargesAmount: Math.round(totalSurchargesAmount * 100) / 100,
      monatsmiete: Math.round(finalRent * 100) / 100,
      jahresmiete: Math.round(finalRent * 12 * 100) / 100,
    });
  } catch (error) {
    res.status(500).json({ error: "Fehler bei der Berechnung" });
  }
});

router.post("/api/kategorie/calculate", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { kategorie, nutzflaeche } = req.body;

    if (!kategorie || !kategorieValues[kategorie]) {
      return res.status(400).json({ error: "Ungültige Kategorie" });
    }

    if (!nutzflaeche || nutzflaeche <= 0) {
      return res.status(400).json({ error: "Ungültige Nutzfläche" });
    }

    const rate = kategorieValues[kategorie];
    const monatsmiete = nutzflaeche * rate;

    res.json({
      kategorie,
      nutzflaeche,
      rate,
      monatsmiete: Math.round(monatsmiete * 100) / 100,
      jahresmiete: Math.round(monatsmiete * 12 * 100) / 100,
    });
  } catch (error) {
    res.status(500).json({ error: "Fehler bei der Berechnung" });
  }
});

export default router;
