import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OCRTextResult {
  rechnungsart: string | null;
  lieferant: string | null;
  rechnungsnummer: string | null;
  rechnungsdatum: string | null;
  leistungszeitraum_von: string | null;
  leistungszeitraum_bis: string | null;
  nettobetrag: number | null;
  ust_satz: number | null;
  ust_betrag: number | null;
  bruttobetrag: number | null;
  zahlungsziel: string | null;
  objekt: string | null;
  einheit: string | null;
  iban: string | null;
  bic: string | null;
  kategorie: "betriebskosten_umlagefaehig" | "instandhaltung" | null;
  expense_type: string | null;
  validierung: ValidationReport;
}

interface ValidationReport {
  ist_valide: boolean;
  warnungen: string[];
  fehler: string[];
  korrekturen: string[];
  unsichere_felder: string[];
}

// Validate and correct extracted data
function validateAndCorrectData(data: any): { correctedData: any; validation: ValidationReport } {
  const validation: ValidationReport = {
    ist_valide: true,
    warnungen: [],
    fehler: [],
    korrekturen: [],
    unsichere_felder: []
  };

  const correctedData = { ...data };

  // 1. Check required fields
  if (!correctedData.lieferant) {
    validation.unsichere_felder.push("lieferant");
    correctedData.lieferant = "UNSICHER - nicht erkannt";
  }

  if (!correctedData.bruttobetrag || correctedData.bruttobetrag <= 0) {
    validation.fehler.push("Bruttobetrag fehlt oder ist ungültig");
    validation.ist_valide = false;
  }

  if (!correctedData.rechnungsdatum) {
    validation.unsichere_felder.push("rechnungsdatum");
  }

  // 2. Validate: Brutto = Netto + USt
  if (correctedData.bruttobetrag && correctedData.nettobetrag && correctedData.ust_betrag !== null) {
    const calculatedBrutto = correctedData.nettobetrag + correctedData.ust_betrag;
    const difference = Math.abs(correctedData.bruttobetrag - calculatedBrutto);
    
    if (difference > 0.02) {
      validation.warnungen.push(
        `Betragsabweichung: Netto (${correctedData.nettobetrag}€) + USt (${correctedData.ust_betrag}€) = ${calculatedBrutto.toFixed(2)}€ ≠ Brutto (${correctedData.bruttobetrag}€)`
      );
    }
  }

  // 3. Calculate missing values if possible
  if (correctedData.bruttobetrag && correctedData.ust_betrag !== null && !correctedData.nettobetrag) {
    correctedData.nettobetrag = Math.round((correctedData.bruttobetrag - correctedData.ust_betrag) * 100) / 100;
    validation.korrekturen.push(`Nettobetrag berechnet: ${correctedData.nettobetrag}€`);
  }

  if (correctedData.bruttobetrag && correctedData.nettobetrag && correctedData.ust_betrag === null) {
    correctedData.ust_betrag = Math.round((correctedData.bruttobetrag - correctedData.nettobetrag) * 100) / 100;
    validation.korrekturen.push(`USt-Betrag berechnet: ${correctedData.ust_betrag}€`);
  }

  // 4. Validate USt rate (Austria: 0%, 10%, 13%, 20%)
  if (correctedData.ust_satz !== null) {
    const validRates = [0, 10, 13, 20];
    if (!validRates.includes(correctedData.ust_satz)) {
      validation.warnungen.push(
        `Ungewöhnlicher USt-Satz: ${correctedData.ust_satz}% (Üblich: 0%, 10%, 13%, 20%)`
      );
    }

    // Cross-check USt calculation
    if (correctedData.nettobetrag && correctedData.ust_betrag) {
      const expectedUst = correctedData.nettobetrag * (correctedData.ust_satz / 100);
      const ustDiff = Math.abs(correctedData.ust_betrag - expectedUst);
      
      if (ustDiff > 0.02) {
        validation.warnungen.push(
          `USt-Berechnung prüfen: ${correctedData.nettobetrag}€ × ${correctedData.ust_satz}% = ${expectedUst.toFixed(2)}€, angegeben: ${correctedData.ust_betrag}€`
        );
      }
    }
  }

  // 5. Validate date logic
  if (correctedData.rechnungsdatum && correctedData.leistungszeitraum_bis) {
    const invoiceDate = new Date(correctedData.rechnungsdatum);
    const servicePeriodEnd = new Date(correctedData.leistungszeitraum_bis);
    
    if (invoiceDate < servicePeriodEnd) {
      validation.warnungen.push(
        `Rechnungsdatum (${correctedData.rechnungsdatum}) liegt VOR Ende des Leistungszeitraums (${correctedData.leistungszeitraum_bis})`
      );
    }
  }

  // 6. Validate date not in future
  if (correctedData.rechnungsdatum) {
    const invoiceDate = new Date(correctedData.rechnungsdatum);
    const today = new Date();
    
    if (invoiceDate > today) {
      validation.warnungen.push(`Rechnungsdatum (${correctedData.rechnungsdatum}) liegt in der Zukunft`);
      validation.unsichere_felder.push("rechnungsdatum");
    }
  }

  // 7. Validate IBAN format
  if (correctedData.iban) {
    const cleanIban = correctedData.iban.replace(/\s/g, '').toUpperCase();
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      validation.warnungen.push(`IBAN-Format prüfen: ${correctedData.iban}`);
      validation.unsichere_felder.push("iban");
    }
    correctedData.iban = cleanIban;
  }

  // 8. Validate expense_type matches kategorie
  const betriebskostenTypes = [
    "versicherung", "grundsteuer", "muellabfuhr", "wasser_abwasser", 
    "heizung", "strom_allgemein", "hausbetreuung", "lift", 
    "gartenpflege", "schneeraeumung", "verwaltung", "ruecklage"
  ];
  const instandhaltungTypes = ["reparatur", "sanierung", "sonstiges"];

  if (correctedData.kategorie && correctedData.expense_type) {
    if (correctedData.kategorie === "betriebskosten_umlagefaehig" && 
        instandhaltungTypes.includes(correctedData.expense_type)) {
      correctedData.kategorie = "instandhaltung";
      validation.korrekturen.push(`Kategorie korrigiert zu "instandhaltung"`);
    } else if (correctedData.kategorie === "instandhaltung" && 
               betriebskostenTypes.includes(correctedData.expense_type)) {
      correctedData.kategorie = "betriebskosten_umlagefaehig";
      validation.korrekturen.push(`Kategorie korrigiert zu "betriebskosten_umlagefaehig"`);
    }
  }

  // 9. Mark missing optional fields
  const optionalFields = ['rechnungsnummer', 'iban', 'bic', 'zahlungsziel', 'objekt', 'einheit', 'leistungszeitraum_von', 'leistungszeitraum_bis'];
  for (const field of optionalFields) {
    if (correctedData[field] === null || correctedData[field] === undefined) {
      if (!validation.unsichere_felder.includes(field)) {
        validation.unsichere_felder.push(field);
      }
    }
  }

  if (validation.fehler.length > 0) {
    validation.ist_valide = false;
  }

  return { correctedData, validation };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ocrText } = await req.json();
    
    if (!ocrText || ocrText.trim() === '') {
      return new Response(
        JSON.stringify({ error: "Kein OCR-Text übergeben" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing OCR text...");

    const systemPrompt = `Du bist eine spezialisierte KI für Hausverwaltungssoftware (österreichisches Recht).

DEINE AUFGABE:
- Analysiere den OCR-Text einer Rechnung
- Extrahiere alle relevanten Buchungsdaten
- Bereite die Daten strukturiert für die Buchhaltung vor

STRENGE REGELN:
1. Arbeite AUSSCHLIESSLICH mit den gelieferten OCR-Daten
2. Wenn Informationen fehlen oder widersprüchlich sind, gib null zurück
3. ERFINDE KEINE DATEN - nur extrahieren was tatsächlich im Text steht
4. Bei Beträgen: Unterscheide klar zwischen Netto, Brutto und USt

RECHNUNGSARTEN für Hausverwaltung:
- Handwerker (Elektriker, Installateur, Schlosser, etc.)
- Energie (Strom, Gas, Fernwärme)
- Wartung (Lift, Heizung, Brandschutz, etc.)
- Reinigung (Hausbetreuung, Fensterreinigung)
- Versicherung
- Müllentsorgung
- Wasser/Abwasser
- Gartenpflege
- Schneeräumung
- Verwaltung
- Sonstiges

KATEGORISIERUNG:
- betriebskosten_umlagefaehig: Versicherung, Grundsteuer, Müllabfuhr, Wasser/Abwasser, Heizung, Strom (Allgemein), Hausbetreuung, Lift, Gartenpflege, Schneeräumung, Verwaltung, Rücklage
- instandhaltung: Reparaturen, Sanierung, Handwerkerarbeiten

EXPENSE_TYPES:
- Betriebskosten: versicherung, grundsteuer, muellabfuhr, wasser_abwasser, heizung, strom_allgemein, hausbetreuung, lift, gartenpflege, schneeraeumung, verwaltung, ruecklage
- Instandhaltung: reparatur, sanierung, sonstiges

WICHTIG:
- Österreichische USt-Sätze: 0%, 10%, 13%, 20%
- Prüfe: Brutto = Netto + USt
- Datumsformat: YYYY-MM-DD`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Analysiere folgenden OCR-Text einer Rechnung und extrahiere alle Buchungsdaten.

WICHTIG:
- Gib null für nicht erkennbare/fehlende Felder zurück
- Erfinde KEINE Daten

OCR-Text:
${ocrText}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice_from_text",
              description: "Extrahiere strukturierte Rechnungsdaten aus OCR-Text für Hausverwaltung",
              parameters: {
                type: "object",
                properties: {
                  rechnungsart: { 
                    type: "string", 
                    enum: ["Handwerker", "Energie", "Wartung", "Reinigung", "Versicherung", "Müllentsorgung", "Wasser/Abwasser", "Gartenpflege", "Schneeräumung", "Verwaltung", "Sonstiges"],
                    description: "Art der Rechnung" 
                  },
                  lieferant: { 
                    type: "string", 
                    description: "Name des Lieferanten/Rechnungsstellers" 
                  },
                  rechnungsnummer: { 
                    type: "string", 
                    description: "Rechnungsnummer - null wenn nicht erkennbar" 
                  },
                  rechnungsdatum: { 
                    type: "string", 
                    description: "Rechnungsdatum im Format YYYY-MM-DD" 
                  },
                  leistungszeitraum_von: {
                    type: "string",
                    description: "Beginn des Leistungszeitraums (YYYY-MM-DD) - null wenn nicht angegeben"
                  },
                  leistungszeitraum_bis: {
                    type: "string",
                    description: "Ende des Leistungszeitraums (YYYY-MM-DD) - null wenn nicht angegeben"
                  },
                  nettobetrag: { 
                    type: "number", 
                    description: "Nettobetrag in Euro (ohne USt)" 
                  },
                  ust_satz: { 
                    type: "number", 
                    description: "USt-Satz in Prozent (z.B. 20, 10, 13, 0)" 
                  },
                  ust_betrag: { 
                    type: "number", 
                    description: "USt-Betrag in Euro" 
                  },
                  bruttobetrag: { 
                    type: "number", 
                    description: "Bruttobetrag in Euro (inkl. USt)" 
                  },
                  zahlungsziel: { 
                    type: "string", 
                    description: "Zahlungsziel/Fälligkeitsdatum (YYYY-MM-DD) - null wenn nicht angegeben" 
                  },
                  objekt: { 
                    type: "string", 
                    description: "Name/Adresse des Objekts falls erwähnt - null wenn nicht erkennbar" 
                  },
                  einheit: { 
                    type: "string", 
                    description: "Wohnungs-/Einheitsnummer falls erwähnt (z.B. 'Top 3') - null wenn nicht erkennbar" 
                  },
                  iban: { 
                    type: "string", 
                    description: "IBAN für Überweisung - null wenn nicht angegeben" 
                  },
                  bic: { 
                    type: "string", 
                    description: "BIC/SWIFT - null wenn nicht angegeben" 
                  },
                  kategorie: { 
                    type: "string", 
                    enum: ["betriebskosten_umlagefaehig", "instandhaltung"],
                    description: "Kategorie für Hausverwaltung" 
                  },
                  expense_type: { 
                    type: "string", 
                    enum: ["versicherung", "grundsteuer", "muellabfuhr", "wasser_abwasser", "heizung", "strom_allgemein", "hausbetreuung", "lift", "gartenpflege", "schneeraeumung", "verwaltung", "ruecklage", "reparatur", "sanierung", "sonstiges"],
                    description: "Art der Ausgabe" 
                  }
                },
                required: ["rechnungsart", "lieferant", "rechnungsdatum", "bruttobetrag", "kategorie", "expense_type"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_from_text" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht. Bitte später erneut versuchen." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-Guthaben aufgebraucht." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    console.log("AI response:", JSON.stringify(result, null, 2));

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_invoice_from_text") {
      throw new Error("Unerwartetes Antwortformat von AI");
    }

    const rawData = JSON.parse(toolCall.function.arguments);
    console.log("Raw extracted data:", rawData);

    // Validate and correct
    const { correctedData, validation } = validateAndCorrectData(rawData);
    
    const finalData: OCRTextResult = {
      ...correctedData,
      validierung: validation
    };

    console.log("Final validated data:", finalData);

    return new Response(
      JSON.stringify(finalData),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ocr-invoice-text:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
