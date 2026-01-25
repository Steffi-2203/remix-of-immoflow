import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DunningRequest {
  invoiceId: string;
  dunningLevel: 1 | 2;
  tenantEmail: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  amount: number;
  dueDate: string;
  invoiceMonth: number;
  invoiceYear: number;
}

export function useSendDunning() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: DunningRequest) => {
      const response = await fetch('/api/functions/send-dunning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fehler beim Versenden');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Versenden');
      console.error('Dunning error:', error);
    },
  });
}

// Hook to get dunning status label
export function getDunningStatusLabel(mahnstufe: number): string {
  switch (mahnstufe) {
    case 0: return 'Keine';
    case 1: return 'Zahlungserinnerung';
    case 2: return 'Mahnung';
    default: return 'Unbekannt';
  }
}

// Hook to get next dunning action
export function getNextDunningAction(mahnstufe: number): { level: 1 | 2; label: string } | null {
  switch (mahnstufe) {
    case 0: return { level: 1, label: 'Zahlungserinnerung senden' };
    case 1: return { level: 2, label: 'Mahnung senden' };
    default: return null;
  }
}
