import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantPortalData {
  isTenant: boolean;
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
    grundmiete: number;
    email: string;
  };
  unit?: {
    id: string;
    top_nummer: string;
    property_id: string;
    flaeche: number;
    status: string;
  };
  property?: {
    id: string;
    name: string;
    address: string;
    city: string;
    postal_code: string;
  };
  invoices: Array<{
    id: string;
    month: number;
    year: number;
    gesamtbetrag: number;
    status: string;
    faellig_am: string;
  }>;
  payments: Array<{
    id: string;
    betrag: number;
    eingangs_datum: string;
    zahlungsart: string;
  }>;
  balance: number;
}

export function useTenantPortalData() {
  return useQuery<TenantPortalData>({
    queryKey: ['tenant-portal-data'],
    queryFn: async () => {
      if (!supabase) throw new Error('Backend nicht konfiguriert');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Nicht eingeloggt');

      const { data, error } = await supabase.functions.invoke('tenant-portal-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data as TenantPortalData;
    },
  });
}
