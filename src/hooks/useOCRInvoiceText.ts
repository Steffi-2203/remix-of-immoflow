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

export interface OCRTextResult {
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
  kategorie: ExpenseCategory | null;
  expense_type: ExpenseType | null;
  validierung: ValidationReport;
}

export function useOCRInvoiceText() {
  return useMutation({
    mutationFn: async (ocrText: string): Promise<OCRTextResult> => {
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Nicht angemeldet – bitte neu einloggen');
      }
      
      const { data, error } = await supabase.functions.invoke('ocr-invoice-text', {
        body: { ocrText },
      });
      
      if (error) {
        console.error('OCR text function error:', error);
        throw new Error(error.message || 'OCR-Analyse fehlgeschlagen');
      }
      if (data?.error) throw new Error(data.error);
      
      return data as OCRTextResult;
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
          description: `${validation.korrekturen.length} Korrektur(en)`
        });
      } else {
        toast.success('Rechnung erfolgreich analysiert');
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Fehler bei der OCR-Analyse';
      toast.error(message);
      console.error('OCR text error:', error);
    },
  });
}
