import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OCRResult {
  lieferant: string | null;
  betrag: number | null;
  datum: string | null;
  rechnungsnummer: string | null;
  iban: string | null;
  ust_betrag: number | null;
  ust_satz: number | null;
  kategorie: "betriebskosten_umlagefaehig" | "instandhaltung" | null;
  expense_type: string | null;
  beschreibung: string | null;
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

    console.log("Processing invoice image with OCR...");

    const systemPrompt = `Du bist ein OCR-Spezialist für Eingangsrechnungen in der Immobilienverwaltung.
Analysiere das Bild einer Rechnung und extrahiere alle relevanten Daten.

Kategorisiere die Rechnung nach folgendem Schema:
- betriebskosten_umlagefaehig: Versicherung, Grundsteuer, Müllabfuhr, Wasser/Abwasser, Heizung, Strom (Allgemein), Hausbetreuung, Lift, Gartenpflege, Schneeräumung, Verwaltung, Rücklage
- instandhaltung: Reparaturen, Sanierung, Renovierung

Bestimme auch den expense_type basierend auf dem Inhalt:
- versicherung, grundsteuer, muellabfuhr, wasser_abwasser, heizung, strom_allgemein, hausbetreuung, lift, gartenpflege, schneeraeumung, verwaltung, ruecklage (für Betriebskosten)
- reparatur, sanierung, sonstiges (für Instandhaltung)`;

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
                text: "Analysiere diese Rechnung und extrahiere alle Daten."
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice_data",
              description: "Extrahiere strukturierte Daten aus einer Rechnung",
              parameters: {
                type: "object",
                properties: {
                  lieferant: { 
                    type: "string", 
                    description: "Name des Lieferanten/Rechnungsstellers" 
                  },
                  betrag: { 
                    type: "number", 
                    description: "Brutto-Gesamtbetrag der Rechnung in Euro" 
                  },
                  datum: { 
                    type: "string", 
                    description: "Rechnungsdatum im Format YYYY-MM-DD" 
                  },
                  rechnungsnummer: { 
                    type: "string", 
                    description: "Rechnungsnummer" 
                  },
                  iban: { 
                    type: "string", 
                    description: "IBAN für die Überweisung" 
                  },
                  ust_betrag: { 
                    type: "number", 
                    description: "Umsatzsteuer-Betrag in Euro" 
                  },
                  ust_satz: { 
                    type: "number", 
                    description: "USt-Satz in Prozent (z.B. 20 oder 10)" 
                  },
                  kategorie: { 
                    type: "string", 
                    enum: ["betriebskosten_umlagefaehig", "instandhaltung"],
                    description: "Kategorie der Ausgabe" 
                  },
                  expense_type: { 
                    type: "string", 
                    enum: ["versicherung", "grundsteuer", "muellabfuhr", "wasser_abwasser", "heizung", "strom_allgemein", "hausbetreuung", "lift", "gartenpflege", "schneeraeumung", "verwaltung", "ruecklage", "reparatur", "sanierung", "sonstiges"],
                    description: "Art der Ausgabe" 
                  },
                  beschreibung: { 
                    type: "string", 
                    description: "Kurze Beschreibung des Rechnungsinhalts" 
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

    const extractedData: OCRResult = JSON.parse(toolCall.function.arguments);
    console.log("Extracted data:", extractedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ocr-invoice:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
