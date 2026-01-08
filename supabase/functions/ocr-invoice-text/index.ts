import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Österreichische USt-Sätze
const AT_UST_RATES = {
  STANDARD: 20,
  ERMAESSIGT_10: 10,
  ERMAESSIGT_13: 13,
  BEFREIT: 0
};
const VALID_AT_UST_RATES = [0, 10, 13, 20];

interface OCRTextResult {
  rechnungsart: string | null;
  lieferant: string | null;
  lieferant_uid: string | null;
  empfaenger_uid: string | null;
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
  reverse_charge: boolean;
  steuerhinweis: string | null;
  validierung: ValidationReport;
}

interface ValidationReport {
  ist_valide: boolean;
  warnungen: string[];
  fehler: string[];
  korrekturen: string[];
  unsichere_felder: string[];
  ust_pruefung: {
    reverse_charge_erkannt: boolean;
    uid_lieferant_valide: boolean | null;
    uid_empfaenger_valide: boolean | null;
    ust_satz_korrekt: boolean;
  };
}

// Validate Austrian UID number format (ATU + 8 digits)
function validateUID(uid: string | null): { valid: boolean; formatted: string | null } {
  if (!uid) return { valid: false, formatted: null };
  
  // Remove spaces and convert to uppercase
  const cleaned = uid.replace(/\s/g, '').toUpperCase();
  
  // Austrian UID: ATU + 8 digits
  const atPattern = /^ATU\d{8}$/;
  if (atPattern.test(cleaned)) {
    return { valid: true, formatted: cleaned };
  }
  
  // German UID: DE + 9 digits
  const dePattern = /^DE\d{9}$/;
  if (dePattern.test(cleaned)) {
    return { valid: true, formatted: cleaned };
  }
  
  // Other EU countries (basic format check)
  const euPattern = /^[A-Z]{2}[A-Z0-9]{2,12}$/;
  if (euPattern.test(cleaned)) {
    return { valid: true, formatted: cleaned };
  }
  
  return { valid: false, formatted: cleaned };
}

// Detect Reverse-Charge from text indicators
function detectReverseCharge(data: any): boolean {
  const indicators = [
    'reverse charge',
    'reverse-charge',
    'steuerschuldnerschaft des leistungsempfängers',
    'übergang der steuerschuld',
    'art. 196',
    'art 196',
    '§ 19 abs. 1',
    'innergemeinschaftliche lieferung',
    'steuerfreie innergemeinschaftliche'
  ];
  
  const textToCheck = [
    data.steuerhinweis,
    data.beschreibung,
    data.lieferant
  ].filter(Boolean).join(' ').toLowerCase();
  
  return indicators.some(indicator => textToCheck.includes(indicator));
}

// Validate and correct extracted data (Austrian rules)
function validateAndCorrectData(data: any): { correctedData: any; validation: ValidationReport } {
  const validation: ValidationReport = {
    ist_valide: true,
    warnungen: [],
    fehler: [],
    korrekturen: [],
    unsichere_felder: [],
    ust_pruefung: {
      reverse_charge_erkannt: false,
      uid_lieferant_valide: null,
      uid_empfaenger_valide: null,
      ust_satz_korrekt: true
    }
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

  // 2. Validate UID numbers
  if (correctedData.lieferant_uid) {
    const uidResult = validateUID(correctedData.lieferant_uid);
    validation.ust_pruefung.uid_lieferant_valide = uidResult.valid;
    if (uidResult.formatted) {
      correctedData.lieferant_uid = uidResult.formatted;
    }
    if (!uidResult.valid) {
      validation.warnungen.push(`Lieferanten-UID ungültig: ${correctedData.lieferant_uid}`);
      validation.unsichere_felder.push("lieferant_uid");
    }
  }

  if (correctedData.empfaenger_uid) {
    const uidResult = validateUID(correctedData.empfaenger_uid);
    validation.ust_pruefung.uid_empfaenger_valide = uidResult.valid;
    if (uidResult.formatted) {
      correctedData.empfaenger_uid = uidResult.formatted;
    }
    if (!uidResult.valid) {
      validation.warnungen.push(`Empfänger-UID ungültig: ${correctedData.empfaenger_uid}`);
      validation.unsichere_felder.push("empfaenger_uid");
    }
  }

  // 3. Detect and handle Reverse-Charge
  const isReverseCharge = detectReverseCharge(correctedData) || correctedData.reverse_charge === true;
  correctedData.reverse_charge = isReverseCharge;
  validation.ust_pruefung.reverse_charge_erkannt = isReverseCharge;

  if (isReverseCharge) {
    validation.warnungen.push("Reverse-Charge erkannt: Steuerschuld geht auf Leistungsempfänger über");
    
    // Bei Reverse-Charge: USt = 0, Brutto = Netto
    if (correctedData.ust_betrag && correctedData.ust_betrag > 0) {
      validation.fehler.push(
        `Reverse-Charge aber USt-Betrag ${correctedData.ust_betrag}€ angegeben - widersprüchlich`
      );
      validation.unsichere_felder.push("ust_betrag");
    }
    
    // Netto = Brutto bei Reverse-Charge
    if (correctedData.bruttobetrag && !correctedData.nettobetrag) {
      correctedData.nettobetrag = correctedData.bruttobetrag;
      correctedData.ust_betrag = 0;
      correctedData.ust_satz = 0;
      validation.korrekturen.push("Reverse-Charge: Netto = Brutto, USt = 0");
    }
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
  if (correctedData.ust_satz !== null && !isReverseCharge) {
    if (!VALID_AT_UST_RATES.includes(correctedData.ust_satz)) {
      validation.warnungen.push(
        `Ungewöhnlicher USt-Satz: ${correctedData.ust_satz}% (AT üblich: 0%, 10%, 13%, 20%)`
      );
      validation.ust_pruefung.ust_satz_korrekt = false;
    }

    // Cross-check USt calculation
    if (correctedData.nettobetrag && correctedData.ust_betrag) {
      const expectedUst = correctedData.nettobetrag * (correctedData.ust_satz / 100);
      const ustDiff = Math.abs(correctedData.ust_betrag - expectedUst);
      
      if (ustDiff > 0.02) {
        validation.warnungen.push(
          `USt-Berechnung prüfen: ${correctedData.nettobetrag}€ × ${correctedData.ust_satz}% = ${expectedUst.toFixed(2)}€, angegeben: ${correctedData.ust_betrag}€`
        );
        validation.ust_pruefung.ust_satz_korrekt = false;
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

    const systemPrompt = `Du bist eine spezialisierte KI für österreichische Hausverwaltungssoftware.

DEINE AUFGABE:
- Analysiere den OCR-Text einer Rechnung
- Extrahiere alle relevanten Buchungsdaten nach österreichischem USt-Recht
- Bereite die Daten strukturiert für die Buchhaltung vor

STRENGE REGELN:
1. Arbeite AUSSCHLIESSLICH mit den gelieferten OCR-Daten
2. Wenn Informationen fehlen oder widersprüchlich sind, gib null zurück
3. ERFINDE KEINE DATEN - nur extrahieren was tatsächlich im Text steht
4. Bei Beträgen: Unterscheide klar zwischen Netto, Brutto und USt
5. Prüfe Beträge mathematisch und logisch
6. Markiere unklare Felder mit null

ÖSTERREICHISCHES UST-RECHT:
- Standard-USt: 20%
- Ermäßigt: 10% (Lebensmittel, Miete), 13% (Kunst, Kultur)
- Befreit: 0% (bestimmte Finanzdienstleistungen)
- REVERSE-CHARGE: Bei EU-Lieferanten ohne AT-USt → Steuerschuld geht auf Empfänger über
  Erkennbar an: "Reverse Charge", "Übergang der Steuerschuld", "Art. 196"

UID-NUMMERN:
- Österreich: ATU + 8 Ziffern (z.B. ATU12345678)
- Deutschland: DE + 9 Ziffern (z.B. DE123456789)
- Extrahiere sowohl Lieferanten-UID als auch Empfänger-UID falls vorhanden

RECHNUNGSARTEN für Hausverwaltung:
- Handwerker, Energie, Wartung, Reinigung, Versicherung
- Müllentsorgung, Wasser/Abwasser, Gartenpflege, Schneeräumung, Verwaltung, Sonstiges

KATEGORISIERUNG:
- betriebskosten_umlagefaehig: Versicherung, Grundsteuer, Müllabfuhr, Wasser/Abwasser, Heizung, Strom, Hausbetreuung, Lift, Gartenpflege, Schneeräumung, Verwaltung, Rücklage
- instandhaltung: Reparaturen, Sanierung, Handwerkerarbeiten

WICHTIG:
- Prüfe: Brutto = Netto + USt
- Bei Reverse-Charge: Brutto = Netto, USt = 0
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
                  lieferant_uid: { 
                    type: "string", 
                    description: "UID-Nummer des Lieferanten (z.B. ATU12345678) - null wenn nicht angegeben" 
                  },
                  empfaenger_uid: { 
                    type: "string", 
                    description: "UID-Nummer des Rechnungsempfängers - null wenn nicht angegeben" 
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
                    description: "USt-Satz in Prozent (AT: 20, 10, 13, 0)" 
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
                  },
                  reverse_charge: { 
                    type: "boolean", 
                    description: "true wenn Reverse-Charge erkennbar (z.B. 'Übergang der Steuerschuld', 'Art. 196')" 
                  },
                  steuerhinweis: { 
                    type: "string", 
                    description: "Steuerhinweis auf der Rechnung (z.B. 'Reverse Charge', 'steuerfreie ig Lieferung') - null wenn keiner" 
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
