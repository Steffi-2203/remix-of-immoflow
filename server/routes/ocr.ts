import type { Express } from "express";
import { isAuthenticated } from "./helpers";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export function registerOcrRoutes(app: Express) {
  // OCR Invoice - Extract invoice data from image
  app.post("/api/functions/ocr-invoice", isAuthenticated, async (req: any, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Bild-Daten erforderlich" });
      }

      const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (mimeType && !validMimeTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Nur Bilder werden unterstützt (JPEG, PNG, GIF, WebP)" });
      }

      if (imageBase64.length > 10 * 1024 * 1024 * 1.37) {
        return res.status(400).json({ error: "Datei ist zu groß (max. 10MB)" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Du bist ein Experte für österreichische Rechnungsanalyse. Extrahiere alle relevanten Daten aus der Rechnung und gib sie als JSON zurück.

Antworte NUR mit einem JSON-Objekt im folgenden Format:
{
  "lieferant": "Firmenname",
  "betrag": 123.45,
  "netto_betrag": 102.88,
  "datum": "2024-01-15",
  "rechnungsnummer": "RE-2024-001",
  "iban": "AT12 3456 7890 1234 5678",
  "ust_betrag": 20.57,
  "ust_satz": 20,
  "kategorie": "betriebskosten_umlagefaehig",
  "expense_type": "strom",
  "beschreibung": "Stromrechnung Jänner 2024",
  "leistungszeitraum_von": "2024-01-01",
  "leistungszeitraum_bis": "2024-01-31",
  "leistungsort_strasse": "Musterstraße 1",
  "leistungsort_plz": "1010",
  "leistungsort_stadt": "Wien",
  "validierung": {
    "ist_valide": true,
    "warnungen": [],
    "fehler": [],
    "korrekturen": [],
    "unsichere_felder": []
  }
}

Kategorien: betriebskosten_umlagefaehig, betriebskosten_nicht_umlagefaehig, instandhaltung, verwaltung, sonstiges
Expense Types: strom, gas, wasser, heizung, muellabfuhr, hausreinigung, hausbetreuung, lift, versicherung, grundsteuer, kanalgebuehr, schornsteinfeger, winterdienst, gartenarbeit, reparatur, wartung, verwaltung, sonstiges`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: "Analysiere diese Rechnung und extrahiere alle Daten. Antworte nur mit dem JSON-Objekt.",
              },
            ],
          },
        ],
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "";

      let data;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Keine JSON-Daten in der Antwort");
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return res.status(500).json({ error: "Fehler beim Parsen der OCR-Ergebnisse" });
      }

      res.json({ data });
    } catch (error) {
      console.error("Error in ocr-invoice:", error);
      res.status(500).json({ error: "OCR-Analyse fehlgeschlagen" });
    }
  });

  // OCR Invoice Text - Extract invoice data from OCR text
  app.post("/api/functions/ocr-invoice-text", isAuthenticated, async (req: any, res) => {
    try {
      const { ocrText } = req.body;

      if (!ocrText) {
        return res.status(400).json({ error: "OCR-Text erforderlich" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Du bist ein Experte für österreichische Rechnungsanalyse. Analysiere den OCR-Text einer Rechnung und extrahiere alle relevanten Daten.

Antworte NUR mit einem JSON-Objekt im folgenden Format:
{
  "rechnungsart": "Rechnung",
  "lieferant": "Firmenname",
  "lieferant_uid": "ATU12345678",
  "empfaenger_uid": null,
  "rechnungsnummer": "RE-2024-001",
  "rechnungsdatum": "2024-01-15",
  "leistungszeitraum_von": "2024-01-01",
  "leistungszeitraum_bis": "2024-01-31",
  "nettobetrag": 102.88,
  "ust_satz": 20,
  "ust_betrag": 20.57,
  "bruttobetrag": 123.45,
  "zahlungsziel": "2024-02-15",
  "objekt": null,
  "einheit": null,
  "iban": "AT12 3456 7890 1234 5678",
  "bic": "GIBAATWWXXX",
  "kategorie": "betriebskosten_umlagefaehig",
  "expense_type": "strom",
  "reverse_charge": false,
  "steuerhinweis": null,
  "validierung": {
    "ist_valide": true,
    "warnungen": [],
    "fehler": [],
    "korrekturen": [],
    "unsichere_felder": [],
    "ust_pruefung": {
      "reverse_charge_erkannt": false,
      "uid_lieferant_valide": null,
      "uid_empfaenger_valide": null,
      "ust_satz_korrekt": true
    }
  }
}`
          },
          {
            role: "user",
            content: `Analysiere diesen Rechnungstext und extrahiere alle Daten:\n\n${ocrText}`,
          },
        ],
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content || "";

      let data;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Keine JSON-Daten in der Antwort");
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return res.status(500).json({ error: "Fehler beim Parsen der OCR-Ergebnisse" });
      }

      res.json({ data });
    } catch (error) {
      console.error("Error in ocr-invoice-text:", error);
      res.status(500).json({ error: "OCR-Analyse fehlgeschlagen" });
    }
  });

  // OCR Bank Statement - Extract bank statement data from image
  app.post("/api/functions/ocr-bank-statement", isAuthenticated, async (req: any, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Bild-Daten erforderlich" });
      }

      const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (mimeType && !validMimeTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Nur Bilder werden unterstützt (JPEG, PNG, GIF, WebP). Für PDFs bitte erst in Bild konvertieren." });
      }

      if (imageBase64.length > 10 * 1024 * 1024 * 1.37) {
        return res.status(400).json({ error: "Datei ist zu groß (max. 10MB)" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Du bist ein Experte für Kontoauszugsanalyse. Extrahiere alle Buchungszeilen aus dem Kontoauszug.

Antworte NUR mit einem JSON-Objekt im folgenden Format:
{
  "kontoinhaber": "Max Mustermann",
  "iban": "AT12 3456 7890 1234 5678",
  "auszugsnummer": "2024/01",
  "zeitraum_von": "2024-01-01",
  "zeitraum_bis": "2024-01-31",
  "buchungen": [
    {
      "datum": "2024-01-15",
      "betrag": -123.45,
      "verwendungszweck": "Miete Jänner 2024",
      "auftraggeber_empfaenger": "Hans Mieter",
      "iban": "AT98 7654 3210 9876 5432",
      "buchungstext": "Dauerauftrag"
    }
  ],
  "validierung": {
    "ist_valide": true,
    "warnungen": [],
    "erkannte_zeilen": 5
  }
}

Wichtig:
- Einzahlungen sind positive Beträge
- Auszahlungen/Abbuchungen sind negative Beträge
- Datumsformat: YYYY-MM-DD`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`,
                },
              },
              {
                type: "text",
                text: "Analysiere diesen Kontoauszug und extrahiere alle Buchungen. Antworte nur mit dem JSON-Objekt.",
              },
            ],
          },
        ],
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || "";

      let data;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Keine JSON-Daten in der Antwort");
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return res.status(500).json({ error: "Fehler beim Parsen der OCR-Ergebnisse" });
      }

      res.json({ data });
    } catch (error) {
      console.error("Error in ocr-bank-statement:", error);
      res.status(500).json({ error: "OCR-Analyse fehlgeschlagen" });
    }
  });
}
