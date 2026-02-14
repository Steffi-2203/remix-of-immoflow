import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface E1aKennzahlen {
  kz370: number;
  kz371: number;
  kz380: number;
  kz381: number;
  kz382: number;
  kz383: number;
  kz390: number;
}

interface PropertyE1aData {
  propertyId: string;
  propertyName: string;
  ownershipShare: number;
  kennzahlen: E1aKennzahlen;
}

export interface OwnerE1aReport {
  ownerId: string;
  ownerName: string;
  taxYear: number;
  properties: PropertyE1aData[];
  totals: E1aKennzahlen;
}

export function useTaxReport(ownerId: string | null, year: number) {
  return useQuery<OwnerE1aReport>({
    queryKey: ['tax-report', ownerId, year],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/tax-reports/${ownerId}/${year}`);
      return res.json();
    },
    enabled: !!ownerId,
  });
}

export function useGenerateTaxReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { ownerId: string; taxYear: number }) => {
      const res = await apiRequest('POST', '/api/tax-reports/generate', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-report'] });
      queryClient.invalidateQueries({ queryKey: ['tax-report-history'] });
      toast({ title: 'E1a-Bericht gespeichert' });
    },
    onError: () => {
      toast({ title: 'Fehler', description: 'Bericht konnte nicht gespeichert werden', variant: 'destructive' });
    },
  });
}

export function useTaxReportHistory() {
  return useQuery({
    queryKey: ['tax-report-history'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/tax-reports/history');
      return res.json();
    },
  });
}

export function downloadE1aXml(ownerId: string, year: number) {
  window.open(`/api/tax-reports/${ownerId}/${year}/xml`, '_blank');
}
