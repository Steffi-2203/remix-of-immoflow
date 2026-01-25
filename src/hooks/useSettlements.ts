import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface SettlementItem {
  unitId: string;
  tenantId: string | null;
  tenantName: string;
  tenantEmail: string | null;
  isLeerstandBK: boolean;
  isLeerstandHK: boolean;
  bkAnteil: number;
  hkAnteil: number;
  bkVorschuss: number;
  hkVorschuss: number;
  bkSaldo: number;
  hkSaldo: number;
  gesamtSaldo: number;
}

export interface SaveSettlementData {
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  year: number;
  totalBk: number;
  totalHk: number;
  bkMieter: number;
  hkMieter: number;
  bkEigentuemer: number;
  hkEigentuemer: number;
  items: SettlementItem[];
  sendEmails: boolean;
}

export function useExistingSettlement(propertyId: string | undefined, year: number | undefined) {
  return useQuery({
    queryKey: ['settlement', propertyId, year],
    queryFn: async () => {
      if (!propertyId || !year) return null;
      
      const response = await fetch(`/api/settlements?propertyId=${propertyId}&year=${year}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch settlement');
      }
      return response.json();
    },
    enabled: !!propertyId && !!year,
  });
}

export function useSaveSettlement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: SaveSettlementData) => {
      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to save settlement');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      toast.success('Abrechnung gespeichert');
    },
    onError: (error) => {
      console.error('Save settlement error:', error);
      toast.error('Fehler beim Speichern der Abrechnung');
    },
  });
}

export function useFinalizeSettlement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ settlementId }: { settlementId: string }) => {
      const response = await fetch(`/api/settlements/${settlementId}/finalize`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to finalize settlement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      toast.success('Abrechnung finalisiert');
    },
    onError: (error) => {
      console.error('Finalize error:', error);
      toast.error('Fehler beim Finalisieren');
    },
  });
}
