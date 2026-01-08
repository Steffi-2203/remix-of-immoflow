import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceData {
  lieferant?: string | null;
  rechnungsnummer?: string | null;
  rechnungsdatum?: string | null;
  leistungszeitraum_von?: string | null;
  leistungszeitraum_bis?: string | null;
  nettobetrag?: number | null;
  ust_satz?: number | null;
  ust_betrag?: number | null;
  bruttobetrag?: number | null;
  zahlungsziel?: string | null;
  iban?: string | null;
  kategorie?: string | null;
  expense_type?: string | null;
  [key: string]: any;
}

interface ValidationReport {
  ist_valide: boolean;
  gefundene_fehler: string[];
  vorgenommene_korrekturen: string[];
  unsichere_felder: { feld: string; grund: string }[];
  hinweise: string[];
}

interface ValidationResult {
  korrigierte_daten: InvoiceData;
  validierungsbericht: ValidationReport;
}

// Valid VAT rates for Austria and Germany
const VALID_UST_RATES_AT = [0, 10, 13, 20];
const VALID_UST_RATES_DE = [0, 7, 19];
const ALL_VALID_RATES = [...new Set([...VALID_UST_RATES_AT, ...VALID_UST_RATES_DE])];

function validateInvoiceData(data: InvoiceData): ValidationResult {
  const report: ValidationReport = {
    ist_valide: true,
    gefundene_fehler: [],
    vorgenommene_korrekturen: [],
    unsichere_felder: [],
    hinweise: []
  };

  const corrected: InvoiceData = { ...data };

  // ============================================
  // 1. PFLICHTFELDER PRÜFEN
  // ============================================
  
  const pflichtfelder = ['lieferant', 'bruttobetrag', 'rechnungsdatum'];
  for (const feld of pflichtfelder) {
    if (corrected[feld] === null || corrected[feld] === undefined || corrected[feld] === '') {
      report.gefundene_fehler.push(`Pflichtfeld "${feld}" fehlt`);
      report.ist_valide = false;
    }
  }

  // Lieferant prüfen
  if (!corrected.lieferant || corrected.lieferant.trim() === '') {
    corrected.lieferant = 'UNSICHER - nicht erkannt';
    report.unsichere_felder.push({ feld: 'lieferant', grund: 'Nicht erkannt oder leer' });
  }

  // ============================================
  // 2. BETRAGSLOGIK: Netto + USt = Brutto
  // ============================================
  
  const hasNetto = typeof corrected.nettobetrag === 'number' && corrected.nettobetrag > 0;
  const hasUst = typeof corrected.ust_betrag === 'number';
  const hasBrutto = typeof corrected.bruttobetrag === 'number' && corrected.bruttobetrag > 0;
  const hasUstSatz = typeof corrected.ust_satz === 'number';

  if (hasBrutto && hasNetto && hasUst) {
    // Alle drei Werte vorhanden - Konsistenzprüfung
    const calculatedBrutto = corrected.nettobetrag! + corrected.ust_betrag!;
    const diff = Math.abs(corrected.bruttobetrag! - calculatedBrutto);

    if (diff > 0.02) { // 2 Cent Toleranz für Rundung
      report.gefundene_fehler.push(
        `Betragsabweichung: Netto (${corrected.nettobetrag}€) + USt (${corrected.ust_betrag}€) = ${calculatedBrutto.toFixed(2)}€ ≠ Brutto (${corrected.bruttobetrag}€)`
      );
      
      // Versuche Korrektur: Brutto hat Vorrang
      const correctedNetto = corrected.bruttobetrag! - corrected.ust_betrag!;
      if (correctedNetto > 0) {
        corrected.nettobetrag = Math.round(correctedNetto * 100) / 100;
        report.vorgenommene_korrekturen.push(
          `Nettobetrag korrigiert: ${data.nettobetrag}€ → ${corrected.nettobetrag}€ (berechnet aus Brutto - USt)`
        );
      } else {
        report.unsichere_felder.push({ 
          feld: 'nettobetrag', 
          grund: 'Konnte nicht automatisch korrigiert werden' 
        });
      }
    }
  } else if (hasBrutto && hasUst && !hasNetto) {
    // Netto fehlt - berechnen
    corrected.nettobetrag = Math.round((corrected.bruttobetrag! - corrected.ust_betrag!) * 100) / 100;
    report.vorgenommene_korrekturen.push(
      `Nettobetrag berechnet: ${corrected.nettobetrag}€ (Brutto - USt)`
    );
  } else if (hasBrutto && hasNetto && !hasUst) {
    // USt-Betrag fehlt - berechnen
    corrected.ust_betrag = Math.round((corrected.bruttobetrag! - corrected.nettobetrag!) * 100) / 100;
    report.vorgenommene_korrekturen.push(
      `USt-Betrag berechnet: ${corrected.ust_betrag}€ (Brutto - Netto)`
    );
  } else if (hasNetto && hasUstSatz && !hasBrutto) {
    // Brutto fehlt - berechnen
    const calculatedUst = corrected.nettobetrag! * (corrected.ust_satz! / 100);
    corrected.ust_betrag = Math.round(calculatedUst * 100) / 100;
    corrected.bruttobetrag = Math.round((corrected.nettobetrag! + corrected.ust_betrag!) * 100) / 100;
    report.vorgenommene_korrekturen.push(
      `Bruttobetrag berechnet: ${corrected.bruttobetrag}€ (Netto + ${corrected.ust_satz}% USt)`
    );
  }

  // ============================================
  // 3. UST-SATZ PLAUSIBILITÄT
  // ============================================
  
  if (hasUstSatz) {
    if (!ALL_VALID_RATES.includes(corrected.ust_satz!)) {
      report.gefundene_fehler.push(
        `Ungewöhnlicher USt-Satz: ${corrected.ust_satz}% (Gültig: AT: 0/10/13/20%, DE: 0/7/19%)`
      );
      report.unsichere_felder.push({ 
        feld: 'ust_satz', 
        grund: `${corrected.ust_satz}% ist kein üblicher Steuersatz` 
      });
    } else {
      // Hinweis zum Land
      if (VALID_UST_RATES_DE.includes(corrected.ust_satz!) && !VALID_UST_RATES_AT.includes(corrected.ust_satz!)) {
        report.hinweise.push(`USt-Satz ${corrected.ust_satz}% deutet auf deutsche Rechnung hin`);
      }
    }

    // USt-Betrag vs. Satz Konsistenz prüfen
    if (corrected.nettobetrag && corrected.ust_betrag) {
      const expectedUst = corrected.nettobetrag * (corrected.ust_satz! / 100);
      const ustDiff = Math.abs(corrected.ust_betrag - expectedUst);
      
      if (ustDiff > 0.02) {
        report.gefundene_fehler.push(
          `USt-Berechnung inkonsistent: ${corrected.nettobetrag}€ × ${corrected.ust_satz}% = ${expectedUst.toFixed(2)}€, aber ${corrected.ust_betrag}€ angegeben`
        );
        
        // Versuche USt-Satz zu korrigieren
        if (corrected.nettobetrag > 0) {
          const actualRate = (corrected.ust_betrag / corrected.nettobetrag) * 100;
          const roundedRate = Math.round(actualRate);
          
          if (ALL_VALID_RATES.includes(roundedRate)) {
            report.vorgenommene_korrekturen.push(
              `USt-Satz korrigiert: ${corrected.ust_satz}% → ${roundedRate}% (berechnet aus Beträgen)`
            );
            corrected.ust_satz = roundedRate;
          } else {
            report.unsichere_felder.push({ 
              feld: 'ust_satz', 
              grund: `Berechneter Satz ${actualRate.toFixed(2)}% passt zu keinem Standardsatz` 
            });
          }
        }
      }
    }
  } else if (hasNetto && hasUst && corrected.ust_betrag! > 0) {
    // USt-Satz fehlt aber kann berechnet werden
    const calculatedRate = (corrected.ust_betrag! / corrected.nettobetrag!) * 100;
    const roundedRate = Math.round(calculatedRate);
    
    if (ALL_VALID_RATES.includes(roundedRate)) {
      corrected.ust_satz = roundedRate;
      report.vorgenommene_korrekturen.push(
        `USt-Satz berechnet: ${roundedRate}% (aus Netto und USt-Betrag)`
      );
    } else {
      report.unsichere_felder.push({ 
        feld: 'ust_satz', 
        grund: `Berechneter Satz ${calculatedRate.toFixed(2)}% ist kein Standardsatz` 
      });
    }
  }

  // ============================================
  // 4. DATUMSLOGIK PRÜFEN
  // ============================================
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  // Rechnungsdatum prüfen
  if (corrected.rechnungsdatum) {
    const invoiceDate = new Date(corrected.rechnungsdatum);
    
    if (isNaN(invoiceDate.getTime())) {
      report.gefundene_fehler.push(`Ungültiges Rechnungsdatum: ${corrected.rechnungsdatum}`);
      report.unsichere_felder.push({ feld: 'rechnungsdatum', grund: 'Ungültiges Datumsformat' });
    } else {
      // Zukunft?
      if (invoiceDate > today) {
        report.gefundene_fehler.push(
          `Rechnungsdatum liegt in der Zukunft: ${corrected.rechnungsdatum}`
        );
        report.unsichere_felder.push({ feld: 'rechnungsdatum', grund: 'Datum in der Zukunft' });
      }
      
      // Sehr alt? (> 2 Jahre)
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      if (invoiceDate < twoYearsAgo) {
        report.hinweise.push(
          `Rechnungsdatum ist älter als 2 Jahre: ${corrected.rechnungsdatum}`
        );
      }
    }
  }

  // Leistungszeitraum prüfen
  if (corrected.leistungszeitraum_von && corrected.leistungszeitraum_bis) {
    const von = new Date(corrected.leistungszeitraum_von);
    const bis = new Date(corrected.leistungszeitraum_bis);
    
    if (!isNaN(von.getTime()) && !isNaN(bis.getTime())) {
      if (von > bis) {
        report.gefundene_fehler.push(
          `Leistungszeitraum ungültig: Beginn (${corrected.leistungszeitraum_von}) liegt nach Ende (${corrected.leistungszeitraum_bis})`
        );
        // Korrektur: Tauschen
        const temp = corrected.leistungszeitraum_von;
        corrected.leistungszeitraum_von = corrected.leistungszeitraum_bis;
        corrected.leistungszeitraum_bis = temp;
        report.vorgenommene_korrekturen.push('Leistungszeitraum-Daten getauscht');
      }
    }
  }

  // Rechnungsdatum vs. Leistungszeitraum
  if (corrected.rechnungsdatum && corrected.leistungszeitraum_bis) {
    const invoiceDate = new Date(corrected.rechnungsdatum);
    const servicePeriodEnd = new Date(corrected.leistungszeitraum_bis);
    
    if (!isNaN(invoiceDate.getTime()) && !isNaN(servicePeriodEnd.getTime())) {
      if (invoiceDate < servicePeriodEnd) {
        report.hinweise.push(
          `Rechnungsdatum (${corrected.rechnungsdatum}) liegt vor Ende des Leistungszeitraums (${corrected.leistungszeitraum_bis}) - ungewöhnlich`
        );
      }
    }
  }

  // Zahlungsziel prüfen
  if (corrected.zahlungsziel && corrected.rechnungsdatum) {
    const invoiceDate = new Date(corrected.rechnungsdatum);
    const dueDate = new Date(corrected.zahlungsziel);
    
    if (!isNaN(dueDate.getTime()) && !isNaN(invoiceDate.getTime())) {
      if (dueDate < invoiceDate) {
        report.gefundene_fehler.push(
          `Zahlungsziel (${corrected.zahlungsziel}) liegt vor Rechnungsdatum (${corrected.rechnungsdatum})`
        );
        report.unsichere_felder.push({ feld: 'zahlungsziel', grund: 'Liegt vor Rechnungsdatum' });
      }
    }
  }

  // ============================================
  // 5. IBAN FORMAT PRÜFEN
  // ============================================
  
  if (corrected.iban) {
    const cleanIban = corrected.iban.replace(/\s/g, '').toUpperCase();
    
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      report.gefundene_fehler.push(`IBAN-Länge ungültig: ${cleanIban.length} Zeichen`);
      report.unsichere_felder.push({ feld: 'iban', grund: 'Ungültige Länge' });
    } else if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) {
      report.gefundene_fehler.push(`IBAN-Format ungültig: ${corrected.iban}`);
      report.unsichere_felder.push({ feld: 'iban', grund: 'Ungültiges Format' });
    } else {
      corrected.iban = cleanIban;
      if (corrected.iban !== data.iban) {
        report.vorgenommene_korrekturen.push(`IBAN normalisiert: ${cleanIban}`);
      }
    }
  }

  // ============================================
  // 6. KATEGORIE/EXPENSE_TYPE KONSISTENZ
  // ============================================
  
  const betriebskostenTypes = [
    "versicherung", "grundsteuer", "muellabfuhr", "wasser_abwasser", 
    "heizung", "strom_allgemein", "hausbetreuung", "lift", 
    "gartenpflege", "schneeraeumung", "verwaltung", "ruecklage"
  ];
  const instandhaltungTypes = ["reparatur", "sanierung", "sonstiges"];

  if (corrected.kategorie && corrected.expense_type) {
    if (corrected.kategorie === "betriebskosten_umlagefaehig" && 
        instandhaltungTypes.includes(corrected.expense_type)) {
      report.vorgenommene_korrekturen.push(
        `Kategorie korrigiert: "betriebskosten_umlagefaehig" → "instandhaltung" (basierend auf expense_type "${corrected.expense_type}")`
      );
      corrected.kategorie = "instandhaltung";
    } else if (corrected.kategorie === "instandhaltung" && 
               betriebskostenTypes.includes(corrected.expense_type)) {
      report.vorgenommene_korrekturen.push(
        `Kategorie korrigiert: "instandhaltung" → "betriebskosten_umlagefaehig" (basierend auf expense_type "${corrected.expense_type}")`
      );
      corrected.kategorie = "betriebskosten_umlagefaehig";
    }
  }

  // ============================================
  // 7. FINALE VALIDITÄT BESTIMMEN
  // ============================================
  
  if (report.gefundene_fehler.length > 0) {
    report.ist_valide = false;
  }

  return {
    korrigierte_daten: corrected,
    validierungsbericht: report
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Support both direct data and nested "daten" field
    const invoiceData: InvoiceData = body.daten || body;
    
    if (!invoiceData || typeof invoiceData !== 'object') {
      return new Response(
        JSON.stringify({ error: "Keine gültigen JSON-Daten übergeben" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Validating invoice data:", JSON.stringify(invoiceData, null, 2));

    const result = validateInvoiceData(invoiceData);

    console.log("Validation result:", JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in validate-invoice:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unbekannter Fehler" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
