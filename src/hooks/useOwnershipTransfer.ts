import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getDaysInMonth } from 'date-fns';

export interface WegOwnershipTransfer {
  id: string;
  organization_id: string | null;
  property_id: string;
  unit_id: string | null;
  old_owner_id: string;
  new_owner_id: string | null;
  transfer_date: string;
  land_registry_date: string | null;
  land_registry_ref: string | null;
  legal_reason: 'kauf' | 'schenkung' | 'erbschaft' | 'zwangsversteigerung' | 'einbringung';
  status: 'entwurf' | 'grundbuch_eingetragen' | 'abgeschlossen';
  outstanding_amount: number;
  reserve_balance_transferred: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export const legalReasonLabels: Record<string, string> = {
  kauf: 'Kauf',
  schenkung: 'Schenkung',
  erbschaft: 'Erbschaft',
  zwangsversteigerung: 'Zwangsversteigerung',
  einbringung: 'Einbringung',
};

export const transferStatusLabels: Record<string, string> = {
  entwurf: 'Entwurf',
  grundbuch_eingetragen: 'Grundbuch eingetragen',
  abgeschlossen: 'Abgeschlossen',
};

export function useOwnershipTransfers(propertyId?: string) {
  return useQuery({
    queryKey: ['weg-ownership-transfers', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('weg_ownership_transfers' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as WegOwnershipTransfer[];
    },
  });
}

export function useCreateOwnershipTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (transfer: Omit<WegOwnershipTransfer, 'id' | 'created_at' | 'completed_at'>) => {
      const { data, error } = await supabase
        .from('weg_ownership_transfers' as any)
        .insert(transfer as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WegOwnershipTransfer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weg-ownership-transfers'] });
      toast.success('Eigentümerwechsel angelegt');
    },
    onError: () => toast.error('Fehler beim Anlegen'),
  });
}

export function useUpdateOwnershipTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WegOwnershipTransfer>) => {
      const { data, error } = await supabase
        .from('weg_ownership_transfers' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weg-ownership-transfers'] });
      toast.success('Eigentümerwechsel aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });
}

// ── Proration Logic ──

export interface ProratedResult {
  oldOwnerDays: number;
  newOwnerDays: number;
  totalDays: number;
  oldOwnerFactor: number;
  newOwnerFactor: number;
}

export function calculateProration(transferDate: string): ProratedResult {
  const date = new Date(transferDate);
  const day = date.getDate();
  const totalDays = getDaysInMonth(date);
  // Old owner owns days 1 through (day-1), new owner from day onwards
  const oldOwnerDays = day - 1;
  const newOwnerDays = totalDays - oldOwnerDays;

  return {
    oldOwnerDays,
    newOwnerDays,
    totalDays,
    oldOwnerFactor: oldOwnerDays / totalDays,
    newOwnerFactor: newOwnerDays / totalDays,
  };
}

export function calculateSolidarhaftung(
  outstandingInvoices: { amount_gross: number; due_date: string }[],
): { totalLiable: number; warningYears: number } {
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const liable = outstandingInvoices
    .filter((inv) => new Date(inv.due_date) >= threeYearsAgo)
    .reduce((sum, inv) => sum + inv.amount_gross, 0);

  return {
    totalLiable: Math.round(liable * 100) / 100,
    warningYears: 3,
  };
}
