import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ExpenseCategory, ExpenseType } from '@/hooks/useExpenses';

export interface ValidationReport {
  ist_valide: boolean;
  warnungen: string[];
  fehler: string[];
  korrekturen: string[];
  unsichere_felder: string[];
}

export interface OCRResult {
  lieferant: string | null;
  betrag: number | null;
  netto_betrag: number | null;
  datum: string | null;
  rechnungsnummer: string | null;
  iban: string | null;
  ust_betrag: number | null;
  ust_satz: number | null;
  kategorie: ExpenseCategory | null;
  expense_type: ExpenseType | null;
  beschreibung: string | null;
  leistungszeitraum_von: string | null;
  leistungszeitraum_bis: string | null;
  // Leistungsort für Property-Matching
  leistungsort_strasse: string | null;
  leistungsort_plz: string | null;
  leistungsort_stadt: string | null;
  validierung: ValidationReport;
}

export function useOCRInvoice() {
  return useMutation({
    mutationFn: async (file: File): Promise<OCRResult> => {
      // OCR feature requires OpenAI integration - show user-friendly message
      throw new Error('OCR-Funktion ist derzeit nicht verfügbar. Bitte geben Sie die Rechnungsdaten manuell ein.');
    },
    onSuccess: (data) => {
      const validation = data.validierung;
      
      if (validation.fehler.length > 0) {
        toast.error('Rechnung analysiert - mit Fehlern', {
          description: validation.fehler.join(', ')
        });
      } else if (validation.warnungen.length > 0) {
        toast.warning('Rechnung analysiert - bitte prüfen', {
          description: `${validation.warnungen.length} Warnung(en)`
        });
      } else if (validation.korrekturen.length > 0) {
        toast.success('Rechnung analysiert und korrigiert', {
          description: `${validation.korrekturen.length} Korrektur(en) durchgeführt`
        });
      } else {
        toast.success('Rechnung erfolgreich analysiert');
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Fehler bei der OCR-Analyse';
      toast.error(message);
      console.error('OCR error:', error);
    },
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
