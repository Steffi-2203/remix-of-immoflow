import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

export interface Invoice {
  id: string;
  tenant_id: string;
  year: number;
  month: number;
  grundmiete: number;
  betriebskosten: number;
  heizungskosten: number;
  sonstige_kosten: number;
  gesamtbetrag: number;
  ust_miete: number;
  ust_betriebskosten: number;
  ust_heizung: number;
  status: 'offen' | 'bezahlt' | 'mahnung' | 'teilbezahlt';
  bezahlt_am: string | null;
  faellig_am: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tenants?: {
    first_name: string;
    last_name: string;
    unit_id: string;
    units?: {
      top_nummer: string;
      property_id: string;
      properties?: { name: string };
    };
  };
}

export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'tenants'>;
export type InvoiceUpdate = Partial<InvoiceInsert>;

export function useInvoices(year?: number, month?: number) {
  return useQuery({
    queryKey: ['invoices', year, month],
    queryFn: async () => {
      let url = '/api/invoices';
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (month) params.append('month', month.toString());
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      const invoices = await response.json();
      
      const [tenantsRes, unitsRes, propsRes] = await Promise.all([
        fetch('/api/tenants', { credentials: 'include' }),
        fetch('/api/units', { credentials: 'include' }),
        fetch('/api/properties', { credentials: 'include' })
      ]);
      
      if (tenantsRes.ok && unitsRes.ok && propsRes.ok) {
        const tenants = await tenantsRes.json();
        const units = await unitsRes.json();
        const properties = await propsRes.json();
        
        return invoices.map((invoice: Invoice) => {
          const tenant = tenants.find((t: any) => t.id === invoice.tenant_id);
          const unit = tenant ? units.find((u: any) => u.id === tenant.unit_id) : null;
          const property = unit ? properties.find((p: any) => p.id === unit.property_id) : null;
          
          return {
            ...invoice,
            tenants: tenant ? {
              first_name: tenant.first_name,
              last_name: tenant.last_name,
              unit_id: tenant.unit_id,
              units: unit ? {
                top_nummer: unit.top_nummer,
                property_id: unit.property_id,
                properties: property ? { name: property.name } : undefined
              } : undefined
            } : undefined
          };
        });
      }
      
      return invoices;
    },
  });
}

export function useInvoicesByTenant(tenantId: string) {
  return useQuery({
    queryKey: ['invoices', 'tenant', tenantId],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/invoices`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
    enabled: !!tenantId,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: InvoiceInsert) => {
      const response = await apiRequest('POST', '/api/invoices', invoice);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Vorschreibung erfolgreich erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen der Vorschreibung');
      console.error('Create invoice error:', error);
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InvoiceUpdate & { id: string }) => {
      const response = await apiRequest('PATCH', `/api/invoices/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Vorschreibung aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Vorschreibung');
      console.error('Update invoice error:', error);
    },
  });
}

export function useGenerateInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ year, month }: { year?: number; month?: number }) => {
      const response = await fetch('/api/functions/generate-monthly-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ year, month }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fehler bei der Vorschreibungsgenerierung');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      bezahltAm 
    }: { 
      id: string; 
      status: Invoice['status']; 
      bezahltAm?: string;
    }) => {
      const updateData: InvoiceUpdate = { status };
      if (bezahltAm) {
        updateData.bezahlt_am = bezahltAm;
      }

      const response = await apiRequest('PATCH', `/api/invoices/${id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Vorschreibung gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Vorschreibung');
      console.error('Delete invoice error:', error);
    },
  });
}
