import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  created_at: string;
  // joined
  account?: { account_number: string; name: string; account_type: string };
}

export interface JournalEntry {
  id: string;
  organization_id: string;
  entry_date: string;
  booking_number: string;
  description: string;
  property_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  source_type: string | null;
  source_id: string | null;
  beleg_nummer: string | null;
  beleg_url: string | null;
  is_storno: boolean;
  storno_of: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  journal_entry_lines?: JournalEntryLine[];
  properties?: { name: string } | null;
  tenants?: { first_name: string; last_name: string } | null;
}

export function useJournalEntries(filters?: {
  startDate?: string;
  endDate?: string;
  sourceType?: string;
  propertyId?: string;
}) {
  return useQuery({
    queryKey: ['journal_entries', filters],
    queryFn: async () => {
      let query = supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines(*, chart_of_accounts:account_id(account_number, name, account_type)),
          properties:property_id(name),
          tenants:tenant_id(first_name, last_name)
        `)
        .order('entry_date', { ascending: false })
        .order('booking_number', { ascending: false });

      if (filters?.startDate) query = query.gte('entry_date', filters.startDate);
      if (filters?.endDate) query = query.lte('entry_date', filters.endDate);
      if (filters?.sourceType) query = query.eq('source_type', filters.sourceType);
      if (filters?.propertyId) query = query.eq('property_id', filters.propertyId);

      const { data, error } = await query.limit(500);
      if (error) throw error;

      return (data || []).map((entry: any) => ({
        ...entry,
        journal_entry_lines: (entry.journal_entry_lines || []).map((line: any) => ({
          ...line,
          account: line.chart_of_accounts,
        })),
        properties: entry.properties,
        tenants: entry.tenants,
      })) as JournalEntry[];
    },
  });
}

export interface CreateJournalEntryInput {
  entry_date: string;
  description: string;
  property_id?: string;
  unit_id?: string;
  tenant_id?: string;
  source_type?: string;
  source_id?: string;
  beleg_nummer?: string;
  lines: { account_id: string; debit: number; credit: number; description?: string }[];
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJournalEntryInput) => {
      // Get org id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();

      if (!profile?.organization_id) throw new Error('Keine Organisation gefunden');

      // Get next booking number
      const { data: bookingNum, error: bnError } = await supabase
        .rpc('next_booking_number', { _org_id: profile.organization_id });
      if (bnError) throw bnError;

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          organization_id: profile.organization_id,
          entry_date: input.entry_date,
          booking_number: bookingNum as string,
          description: input.description,
          property_id: input.property_id || null,
          unit_id: input.unit_id || null,
          tenant_id: input.tenant_id || null,
          source_type: input.source_type || 'manual',
          source_id: input.source_id || null,
          beleg_nummer: input.beleg_nummer || null,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Create lines
      const lines = input.lines.map((l) => ({
        journal_entry_id: entry.id,
        account_id: l.account_id,
        debit: l.debit,
        credit: l.credit,
        description: l.description || null,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) throw linesError;

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal_entries'] });
      toast.success('Buchung erfolgreich erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen der Buchung');
      console.error('Journal entry error:', error);
    },
  });
}

// Saldenliste: Summe Soll/Haben pro Konto
export interface AccountBalance {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export function useAccountBalances(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['account_balances', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('journal_entry_lines')
        .select(`
          account_id,
          debit,
          credit,
          chart_of_accounts:account_id(account_number, name, account_type),
          journal_entries:journal_entry_id(entry_date)
        `);

      const { data, error } = await query;
      if (error) throw error;

      // Group by account
      const map = new Map<string, AccountBalance>();
      for (const line of data || []) {
        const acc = (line as any).chart_of_accounts;
        const entryDate = (line as any).journal_entries?.entry_date;
        
        if (startDate && entryDate < startDate) continue;
        if (endDate && entryDate > endDate) continue;

        const existing = map.get(line.account_id);
        if (existing) {
          existing.total_debit += Number(line.debit);
          existing.total_credit += Number(line.credit);
          existing.balance = existing.total_debit - existing.total_credit;
        } else {
          map.set(line.account_id, {
            account_id: line.account_id,
            account_number: acc?.account_number || '',
            account_name: acc?.name || '',
            account_type: acc?.account_type || '',
            total_debit: Number(line.debit),
            total_credit: Number(line.credit),
            balance: Number(line.debit) - Number(line.credit),
          });
        }
      }

      return Array.from(map.values()).sort((a, b) => a.account_number.localeCompare(b.account_number));
    },
  });
}
