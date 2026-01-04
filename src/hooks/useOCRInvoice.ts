import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ExpenseCategory, ExpenseType } from '@/hooks/useExpenses';

interface OCRResult {
  lieferant: string | null;
  betrag: number | null;
  datum: string | null;
  rechnungsnummer: string | null;
  iban: string | null;
  ust_betrag: number | null;
  ust_satz: number | null;
  kategorie: ExpenseCategory | null;
  expense_type: ExpenseType | null;
  beschreibung: string | null;
}

export function useOCRInvoice() {
  return useMutation({
    mutationFn: async (file: File): Promise<OCRResult> => {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      const { data, error } = await supabase.functions.invoke('ocr-invoice', {
        body: {
          imageBase64: base64,
          mimeType: file.type,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data.data as OCRResult;
    },
    onSuccess: () => {
      toast.success('Rechnung erfolgreich analysiert');
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
