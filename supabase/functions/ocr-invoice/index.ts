import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OCRResult {
  lieferant: string | null;
  betrag: number | null;
  netto_betrag: number | null;
  datum: string | null;
  rechnungsnummer: string | null;
  iban: string | null;
  ust_betrag: number | null;
  ust_satz: number | null;
  kategorie: "betriebskosten_umlagefaehig" | "instandhaltung" | null;
  expense_type: string | null;
  beschreibung: string | null;
  leistungszeitraum_von: string | null;
  leistungszeitraum_bis: string | null;
  // Leistungsort für Property-Matching
  leistungsort_strasse: string | null;
  leistungsort_plz: string | null;
  leistungsort_stadt: string | null;
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

  // 1. Check if required fields exist
  if (!correctedData.lieferant) {
    validation.unsichere_felder.push("lieferant");
    correctedData.lieferant = "UNSICHER - nicht erkannt";
  }

  if (!correctedData.betrag || correctedData.betrag <= 0) {
    validation.fehler.push("Brutto-Betrag fehlt oder ist ungültig");
    validation.ist_valide = false;
  }

  if (!correctedData.datum) {
    validation.unsichere_felder.push("datum");
  }

  // 2. Validate USt calculation (Brutto = Netto + USt)
  if (correctedData.betrag && correctedData.ust_betrag !== null && correctedData.ust_betrag !== undefined) {
    const expectedNetto = correctedData.betrag - correctedData.ust_betrag;
    
    if (correctedData.netto_betrag) {
      const difference = Math.abs(correctedData.netto_betrag - expectedNetto);
      if (difference > 0.02) { // Allow 2 cent tolerance for rounding
        validation.warnungen.push(
          `Betragsabweichung: Netto (${correctedData.netto_betrag}€) + USt (${correctedData.ust_betrag}€) ≠ Brutto (${correctedData.betrag}€)`
        );
        // Auto-correct netto based on brutto - ust
        correctedData.netto_betrag = Math.round(expectedNetto * 100) / 100;
        validation.korrekturen.push(
          `Netto-Betrag korrigiert auf ${correctedData.netto_betrag}€ (Brutto - USt)`
        );
      }
    } else {
      correctedData.netto_betrag = Math.round(expectedNetto * 100) / 100;
      validation.korrekturen.push(
        `Netto-Betrag berechnet: ${correctedData.netto_betrag}€`
      );
    }
  }

  // 3. Validate USt rate is reasonable (Austria: 0%, 10%, 13%, 20%)
  if (correctedData.ust_satz !== null && correctedData.ust_satz !== undefined) {
    const validRates = [0, 10, 13, 20];
    if (!validRates.includes(correctedData.ust_satz)) {
      validation.warnungen.push(
        `Ungewöhnlicher USt-Satz: ${correctedData.ust_satz}% (Übliche Sätze: 0%, 10%, 13%, 20%)`
      );
    }

    // Cross-check USt calculation if we have netto and ust_betrag
    if (correctedData.netto_betrag && correctedData.ust_betrag) {
      const expectedUst = correctedData.netto_betrag * (correctedData.ust_satz / 100);
      const ustDifference = Math.abs(correctedData.ust_betrag - expectedUst);
      
      if (ustDifference > 0.02) {
        validation.warnungen.push(
          `USt-Berechnung prüfen: ${correctedData.netto_betrag}€ × ${correctedData.ust_satz}% = ${expectedUst.toFixed(2)}€, aber ${correctedData.ust_betrag}€ angegeben`
        );
      }
    }
  }

  // 4. Validate date logic (invoice date vs. service period)
  if (correctedData.datum && correctedData.leistungszeitraum_bis) {
    const invoiceDate = new Date(correctedData.datum);
    const servicePeriodEnd = new Date(correctedData.leistungszeitraum_bis);
    
    if (invoiceDate < servicePeriodEnd) {
      validation.warnungen.push(
        `Rechnungsdatum (${correctedData.datum}) liegt VOR Ende des Leistungszeitraums (${correctedData.leistungszeitraum_bis})`
      );
    }
  }

  // 5. Validate date is not in the future
  if (correctedData.datum) {
    const invoiceDate = new Date(correctedData.datum);
    const today = new Date();
    
    if (invoiceDate > today) {
      validation.warnungen.push(
        `Rechnungsdatum (${correctedData.datum}) liegt in der Zukunft`
      );
      validation.unsichere_felder.push("datum");
    }
  }

  // 6. Check IBAN format (basic validation)
  if (correctedData.iban) {
    const cleanIban = correctedData.iban.replace(/\s/g, '').toUpperCase();
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      validation.warnungen.push(`IBAN-Format prüfen: ${correctedData.iban}`);
      validation.unsichere_felder.push("iban");
    }
    // Normalize IBAN
    correctedData.iban = cleanIban;
  }

  // 7. Validate expense_type matches kategorie
  const betriebskostenTypes = [
    "versicherung", "grundsteuer", "muellabfuhr", "wasser_abwasser", 
    "heizung", "strom_allgemein", "hausbetreuung", "lift", 
    "gartenpflege", "schneeraeumung", "verwaltung", "ruecklage"
  ];
  const instandhaltungTypes = ["reparatur", "sanierung", "sonstiges"];

  if (correctedData.kategorie && correctedData.expense_type) {
    if (correctedData.kategorie === "betriebskosten_umlagefaehig" && 
        instandhaltungTypes.includes(correctedData.expense_type)) {
      validation.korrekturen.push(
        `Kategorie korrigiert von "betriebskosten_umlagefaehig" zu "instandhaltung" basierend auf expense_type "${correctedData.expense_type}"`
      );
      correctedData.kategorie = "instandhaltung";
    } else if (correctedData.kategorie === "instandhaltung" && 
               betriebskostenTypes.includes(correctedData.expense_type)) {
      validation.korrekturen.push(
        `Kategorie korrigiert von "instandhaltung" zu "betriebskosten_umlagefaehig" basierend auf expense_type "${correctedData.expense_type}"`
      );
      correctedData.kategorie = "betriebskosten_umlagefaehig";
    }
  }

  // 8. Mark fields that couldn't be extracted
  const optionalFields = ['rechnungsnummer', 'iban', 'ust_betrag', 'ust_satz', 'leistungszeitraum_von', 'leistungszeitraum_bis', 'leistungsort_strasse', 'leistungsort_plz', 'leistungsort_stadt'];
  for (const field of optionalFields) {
    if (correctedData[field] === null || correctedData[field] === undefined) {
      validation.unsichere_felder.push(field);
    }
  }

  // Set overall validity
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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Nicht autorisiert - bitte anmelden' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Ungültiges Token - bitte erneut anmelden' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`OCR invoice request from user: ${user.id}`);

    const { imageBase64, mimeType } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`User ${user.id}: Processing invoice image with OCR...`);

    const systemPrompt = `Du bist eine spezialisierte KI für Hausverwaltungssoftware (österreichisches Mietrecht).

Deine Aufgabe ist:
- OCR-Rechnungstexte zu analysieren
- Rechnungen korrekt zu erkennen
- Buchungsdaten strukturiert vorzubereiten

STRENGE REGELN:
1. Arbeite ausschließlich mit den im Bild sichtbaren Daten
2. Wenn Informationen fehlen oder widersprüchlich sind, gib null zurück
3. Erfinde KEINE Daten - nur extrahieren was tatsächlich sichtbar ist
4. Bei Beträgen: Unterscheide klar zwischen Netto, Brutto und USt

KATEGORISIERUNG für Hausverwaltung:
- betriebskosten_umlagefaehig: Versicherung, Grundsteuer, Müllabfuhr, Wasser/Abwasser, Heizung, Strom (Allgemein), Hausbetreuung, Lift, Gartenpflege, Schneeräumung, Verwaltung, Rücklage
- instandhaltung: Reparaturen, Sanierung, Renovierung, Instandhaltungsarbeiten

EXPENSE_TYPES:
- Betriebskosten: versicherung, grundsteuer, muellabfuhr, wasser_abwasser, heizung, strom_allgemein, hausbetreuung, lift, gartenpflege, schneeraeumung, verwaltung, ruecklage
- Instandhaltung: reparatur, sanierung, sonstiges

WICHTIG für österreichische USt:
- Übliche Sätze: 0%, 10%, 13%, 20%
- Prüfe ob Brutto = Netto + USt

LEISTUNGSORT-ERKENNUNG (WICHTIG für automatische Liegenschafts-Zuordnung):
- Suche nach: "Leistungsort", "Einsatzort", "Objektadresse", "betreffend Objekt:", "Arbeiten in:", "Lieferadresse", "Verbrauchsstelle"
- Bei Handwerkerrechnungen steht oft: "Arbeiten ausgeführt in [Adresse]" oder "Baustelle:"
- Bei Versorgern (Wasser, Strom, Gas): Verbrauchsstelle / Lieferadresse / Versorgungsadresse
- NICHT den Lieferanten-Sitz extrahieren - nur wo die Leistung erbracht wurde
- Typische Muster: "Musterstraße 5, 1010 Wien" oder "1010 Wien, Musterstraße 5"
- Trenne Straße, PLZ und Stadt wenn möglich`;

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
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              },
              {
                type: "text",
                text: `Analysiere diese Rechnung (${mimeType === 'application/pdf' ? 'PDF-Dokument' : 'Bild'}) und extrahiere ALLE sichtbaren Daten.

WICHTIG:
- Extrahiere den BRUTTO-Gesamtbetrag (inkl. USt)
- Extrahiere den NETTO-Betrag (ohne USt) falls sichtbar
- Extrahiere den USt-Betrag und USt-Satz falls angegeben
- Achte auf Leistungszeitraum (von/bis)
- LEISTUNGSORT: Suche nach der Adresse wo die Leistung erbracht wurde (Baustelle, Einsatzort, Verbrauchsstelle, Objektadresse) - NICHT die Firmenadresse des Lieferanten!
- Bei PDF: Analysiere alle Seiten falls es mehrere gibt
- Gib null für nicht lesbare/fehlende Felder zurück`
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice_data",
              description: "Extrahiere strukturierte Daten aus einer Rechnung für Hausverwaltung",
              parameters: {
                type: "object",
                properties: {
                  lieferant: { 
                    type: "string", 
                    description: "Name des Lieferanten/Rechnungsstellers - null wenn nicht erkennbar" 
                  },
                  betrag: { 
                    type: "number", 
                    description: "BRUTTO-Gesamtbetrag der Rechnung in Euro (inkl. USt)" 
                  },
                  netto_betrag: { 
                    type: "number", 
                    description: "NETTO-Betrag der Rechnung in Euro (ohne USt) - null wenn nicht angegeben" 
                  },
                  datum: { 
                    type: "string", 
                    description: "Rechnungsdatum im Format YYYY-MM-DD" 
                  },
                  rechnungsnummer: { 
                    type: "string", 
                    description: "Rechnungsnummer - null wenn nicht erkennbar" 
                  },
                  iban: { 
                    type: "string", 
                    description: "IBAN für die Überweisung - null wenn nicht angegeben" 
                  },
                  ust_betrag: { 
                    type: "number", 
                    description: "Umsatzsteuer-Betrag in Euro - null wenn nicht angegeben" 
                  },
                  ust_satz: { 
                    type: "number", 
                    description: "USt-Satz in Prozent (z.B. 20, 10, 13, 0) - null wenn nicht erkennbar" 
                  },
                  kategorie: { 
                    type: "string", 
                    enum: ["betriebskosten_umlagefaehig", "instandhaltung"],
                    description: "Kategorie der Ausgabe für Hausverwaltung" 
                  },
                  expense_type: { 
                    type: "string", 
                    enum: ["versicherung", "grundsteuer", "muellabfuhr", "wasser_abwasser", "heizung", "strom_allgemein", "hausbetreuung", "lift", "gartenpflege", "schneeraeumung", "verwaltung", "ruecklage", "reparatur", "sanierung", "sonstiges"],
                    description: "Art der Ausgabe" 
                  },
                  beschreibung: { 
                    type: "string", 
                    description: "Kurze Beschreibung des Rechnungsinhalts (max 100 Zeichen)" 
                  },
                  leistungszeitraum_von: {
                    type: "string",
                    description: "Beginn des Leistungszeitraums im Format YYYY-MM-DD - null wenn nicht angegeben"
                  },
                  leistungszeitraum_bis: {
                    type: "string",
                    description: "Ende des Leistungszeitraums im Format YYYY-MM-DD - null wenn nicht angegeben"
                  },
                  leistungsort_strasse: {
                    type: "string",
                    description: "Straße und Hausnummer des Leistungsortes (wo die Arbeit durchgeführt wurde, Baustelle, Verbrauchsstelle) - NICHT die Firmenadresse - null wenn nicht erkennbar"
                  },
                  leistungsort_plz: {
                    type: "string",
                    description: "PLZ des Leistungsortes - null wenn nicht erkennbar"
                  },
                  leistungsort_stadt: {
                    type: "string",
                    description: "Stadt/Ort des Leistungsortes - null wenn nicht erkennbar"
                  }
                },
                required: ["lieferant", "betrag", "datum", "kategorie", "expense_type", "beschreibung"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice_data" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit erreicht. Bitte versuchen Sie es später erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-Guthaben aufgebraucht. Bitte laden Sie Ihr Guthaben auf." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const result = await response.json();
    console.log("AI response:", JSON.stringify(result, null, 2));

    // Extract the tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_invoice_data") {
      throw new Error("Unexpected response format from AI");
    }

    const rawExtractedData = JSON.parse(toolCall.function.arguments);
    console.log("Raw extracted data:", rawExtractedData);

    // Validate and correct the data
    const { correctedData, validation } = validateAndCorrectData(rawExtractedData);
    
    // Add validation report to response
    const finalData: OCRResult = {
      ...correctedData,
      validierung: validation
    };

    console.log("Final validated data:", finalData);
    console.log("Validation report:", validation);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: finalData 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Log detailed error internally, return generic message to client
    console.error("Error in ocr-invoice:", error);
    return new Response(
      JSON.stringify({ error: "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie den Support." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
