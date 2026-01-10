import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BankStatementLine {
  datum: string;
  betrag: number;
  verwendungszweck: string;
  auftraggeber_empfaenger: string | null;
  iban: string | null;
  buchungstext: string | null;
}

interface OCRBankStatementResult {
  kontoinhaber: string | null;
  iban: string | null;
  auszugsnummer: string | null;
  zeitraum_von: string | null;
  zeitraum_bis: string | null;
  buchungen: BankStatementLine[];
  validierung: {
    ist_valide: boolean;
    warnungen: string[];
    erkannte_zeilen: number;
  };
}

// Validate and process extracted data
function validateExtractedData(data: any): OCRBankStatementResult {
  const validation = {
    ist_valide: true,
    warnungen: [] as string[],
    erkannte_zeilen: 0
  };

  const result: OCRBankStatementResult = {
    kontoinhaber: data.kontoinhaber || null,
    iban: data.iban || null,
    auszugsnummer: data.auszugsnummer || null,
    zeitraum_von: data.zeitraum_von || null,
    zeitraum_bis: data.zeitraum_bis || null,
    buchungen: [],
    validierung: validation
  };

  // Process and validate each booking line
  if (Array.isArray(data.buchungen)) {
    for (const buchung of data.buchungen) {
      // Validate date format
      if (!buchung.datum || !/^\d{4}-\d{2}-\d{2}$/.test(buchung.datum)) {
        validation.warnungen.push(`Ungültiges Datum: ${buchung.datum}`);
        continue;
      }

      // Validate amount is a number
      const betrag = typeof buchung.betrag === 'number' 
        ? buchung.betrag 
        : parseFloat(String(buchung.betrag).replace(/\./g, '').replace(',', '.'));
      
      if (isNaN(betrag)) {
        validation.warnungen.push(`Ungültiger Betrag für Buchung am ${buchung.datum}`);
        continue;
      }

      // Clean IBAN if present
      let iban = buchung.iban || null;
      if (iban) {
        iban = iban.replace(/\s/g, '').toUpperCase();
        if (iban.length < 15 || iban.length > 34) {
          validation.warnungen.push(`Ungültige IBAN: ${iban}`);
        }
      }

      result.buchungen.push({
        datum: buchung.datum,
        betrag: Math.round(betrag * 100) / 100, // Round to 2 decimal places
        verwendungszweck: buchung.verwendungszweck || '',
        auftraggeber_empfaenger: buchung.auftraggeber_empfaenger || null,
        iban: iban,
        buchungstext: buchung.buchungstext || null
      });
    }
  }

  validation.erkannte_zeilen = result.buchungen.length;
  
  if (result.buchungen.length === 0) {
    validation.ist_valide = false;
    validation.warnungen.push("Keine gültigen Buchungszeilen erkannt");
  }

  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log("Processing bank statement with OCR...");

    const systemPrompt = `Du bist eine spezialisierte KI für die Analyse von Bankauszügen (österreichische/deutsche Formate).

Deine Aufgabe ist:
- Kontoauszugs-Bilder oder PDFs zu analysieren
- ALLE Buchungszeilen strukturiert zu extrahieren
- Einnahmen (positive Beträge) und Ausgaben (negative Beträge) korrekt zu unterscheiden

STRENGE REGELN:
1. Extrahiere JEDE sichtbare Buchungszeile
2. Positive Beträge = Eingänge/Gutschriften (z.B. Mietzahlungen)
3. Negative Beträge = Ausgänge/Abbuchungen (z.B. Überweisungen)
4. Datumsformat: YYYY-MM-DD
5. Beträge als Zahl (deutsches Format 1.234,56 → 1234.56)
6. Bei mehrseitigen PDFs: ALLE Seiten analysieren

TYPISCHE BUCHUNGSZEILEN-STRUKTUR:
- Buchungsdatum / Wertstellung
- Verwendungszweck / Beschreibung
- Auftraggeber/Empfänger Name
- IBAN (falls angegeben)
- Betrag (Soll = negativ, Haben = positiv)

WICHTIG:
- Mieteinnahmen erkennst du an: positiver Betrag + typische Verwendungszwecke wie "Miete", "Monatsmiete", etc.
- Achte auf Top-Nummern in Verwendungszwecken (z.B. "Top 5", "Whg. 3")
- Extrahiere Auftraggeber-Namen für spätere Mieter-Zuordnung`;

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
                text: `Analysiere diesen Kontoauszug und extrahiere ALLE Buchungszeilen.

Für JEDE Buchung extrahiere:
- datum: Buchungsdatum (YYYY-MM-DD)
- betrag: Betrag in Euro (positiv = Eingang, negativ = Ausgang)
- verwendungszweck: Vollständiger Verwendungszweck-Text
- auftraggeber_empfaenger: Name des Absenders/Empfängers
- iban: IBAN falls sichtbar
- buchungstext: Buchungsart (z.B. "Überweisung", "Dauerauftrag", "Lastschrift")

Extrahiere auch die Kopfdaten:
- kontoinhaber: Name des Kontoinhabers
- iban: IBAN des Kontos
- auszugsnummer: Auszugsnummer falls vorhanden
- zeitraum_von/bis: Auszugszeitraum falls angegeben`
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_bank_statement",
              description: "Extrahiere strukturierte Daten aus einem Kontoauszug",
              parameters: {
                type: "object",
                properties: {
                  kontoinhaber: { 
                    type: "string", 
                    description: "Name des Kontoinhabers" 
                  },
                  iban: { 
                    type: "string", 
                    description: "IBAN des Kontos" 
                  },
                  auszugsnummer: { 
                    type: "string", 
                    description: "Auszugsnummer" 
                  },
                  zeitraum_von: { 
                    type: "string", 
                    description: "Beginn des Auszugszeitraums (YYYY-MM-DD)" 
                  },
                  zeitraum_bis: { 
                    type: "string", 
                    description: "Ende des Auszugszeitraums (YYYY-MM-DD)" 
                  },
                  buchungen: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        datum: { 
                          type: "string", 
                          description: "Buchungsdatum (YYYY-MM-DD)" 
                        },
                        betrag: { 
                          type: "number", 
                          description: "Betrag in Euro (positiv = Eingang, negativ = Ausgang)" 
                        },
                        verwendungszweck: { 
                          type: "string", 
                          description: "Verwendungszweck-Text" 
                        },
                        auftraggeber_empfaenger: { 
                          type: "string", 
                          description: "Name des Absenders bei Eingängen, Empfänger bei Ausgängen" 
                        },
                        iban: { 
                          type: "string", 
                          description: "IBAN des Absenders/Empfängers" 
                        },
                        buchungstext: { 
                          type: "string", 
                          description: "Buchungsart (Überweisung, Lastschrift, etc.)" 
                        }
                      },
                      required: ["datum", "betrag", "verwendungszweck"]
                    },
                    description: "Liste aller Buchungszeilen"
                  }
                },
                required: ["buchungen"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_bank_statement" } }
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
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "extract_bank_statement") {
      throw new Error("Unexpected response format from AI");
    }

    const rawExtractedData = JSON.parse(toolCall.function.arguments);
    console.log(`Extracted ${rawExtractedData.buchungen?.length || 0} booking lines`);

    // Validate and process the data
    const validatedData = validateExtractedData(rawExtractedData);
    
    console.log("Validation result:", validatedData.validierung);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: validatedData 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ocr-bank-statement:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
