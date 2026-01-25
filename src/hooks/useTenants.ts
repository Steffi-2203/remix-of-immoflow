import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

export interface Tenant {
  id: string;
  unit_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  status: 'aktiv' | 'leerstand' | 'beendet';
  mietbeginn: string | null;
  mietende: string | null;
  grundmiete: string;
  betriebskosten_vorschuss: string;
  heizungskosten_vorschuss: string;
  kaution: string | null;
  kaution_bezahlt: boolean;
  iban: string | null;
  bic: string | null;
  sepa_mandat: boolean;
  sepa_mandat_datum: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  units?: {
    id: string;
    top_nummer: string;
    property_id: string;
    properties?: {
      id: string;
      name: string;
      address: string;
    };
  };
}

export type TenantInsert = Omit<Tenant, 'id' | 'created_at' | 'updated_at' | 'units'>;
export type TenantUpdate = Partial<TenantInsert>;

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await fetch('/api/tenants', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch tenants');
      const tenants = await response.json();
      
      const unitsResponse = await fetch('/api/units', { credentials: 'include' });
      const propertiesResponse = await fetch('/api/properties', { credentials: 'include' });
      
      if (unitsResponse.ok && propertiesResponse.ok) {
        const units = await unitsResponse.json();
        const properties = await propertiesResponse.json();
        
        return tenants.map((tenant: Tenant) => {
          const unit = units.find((u: any) => u.id === tenant.unit_id);
          const property = unit ? properties.find((p: any) => p.id === unit.property_id) : null;
          return {
            ...tenant,
            units: unit ? {
              ...unit,
              properties: property
            } : undefined
          };
        });
      }
      
      return tenants;
    },
  });
}

export function useTenantsByUnit(unitId?: string) {
  return useQuery({
    queryKey: ['tenants', 'unit', unitId],
    queryFn: async () => {
      if (!unitId) return [];
      const response = await fetch(`/api/units/${unitId}/tenants`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch tenants');
      return response.json();
    },
    enabled: !!unitId,
  });
}

export function useTenant(id: string | undefined) {
  return useQuery({
    queryKey: ['tenant', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/tenants/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch tenant');
      const tenant = await response.json();
      
      if (tenant.unit_id) {
        const unitResponse = await fetch(`/api/units/${tenant.unit_id}`, { credentials: 'include' });
        if (unitResponse.ok) {
          const unit = await unitResponse.json();
          const propertyResponse = await fetch(`/api/properties/${unit.property_id}`, { credentials: 'include' });
          if (propertyResponse.ok) {
            const property = await propertyResponse.json();
            tenant.units = { ...unit, properties: property };
          }
        }
      }
      
      return tenant;
    },
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (tenant: TenantInsert) => {
      const response = await apiRequest('POST', '/api/tenants', tenant);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Mieter erfolgreich erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen des Mieters');
      console.error('Create tenant error:', error);
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: TenantUpdate & { id: string }) => {
      const response = await apiRequest('PATCH', `/api/tenants/${id}`, updates);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', data.id] });
      toast.success('Mieter erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren des Mieters');
      console.error('Update tenant error:', error);
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Mieter erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen des Mieters');
      console.error('Delete tenant error:', error);
    },
  });
}
