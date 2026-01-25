import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

export interface Unit {
  id: string;
  propertyId: string;
  topNummer: string;
  type: 'wohnung' | 'geschaeft' | 'garage' | 'stellplatz' | 'lager' | 'sonstiges';
  status: 'aktiv' | 'leerstand' | 'beendet';
  flaeche: string | null;
  zimmer: number | null;
  nutzwert: string | null;
  stockwerk: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  tenants?: Tenant[];
}

export interface Tenant {
  id: string;
  unitId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: 'aktiv' | 'leerstand' | 'beendet';
  mietbeginn: string | null;
  mietende: string | null;
  grundmiete: string;
  betriebskostenVorschuss: string;
  heizungskostenVorschuss: string;
}

export type UnitInsert = Omit<Unit, 'id' | 'createdAt' | 'updatedAt' | 'tenants'>;
export type UnitUpdate = Partial<UnitInsert>;

export function useUnits(propertyId?: string) {
  return useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      const url = propertyId 
        ? `/api/properties/${propertyId}/units`
        : '/api/units';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch units');
      const units = await response.json();
      
      if (propertyId) {
        const tenantsResponse = await fetch('/api/tenants', { credentials: 'include' });
        if (tenantsResponse.ok) {
          const tenants = await tenantsResponse.json();
          return units.map((unit: Unit) => ({
            ...unit,
            tenants: tenants.filter((t: Tenant) => t.unitId === unit.id)
          }));
        }
      }
      
      return units;
    },
  });
}

export function useUnit(id: string | undefined) {
  return useQuery({
    queryKey: ['unit', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/units/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch unit');
      const unit = await response.json();
      
      const tenantsResponse = await fetch(`/api/units/${id}/tenants`, { credentials: 'include' });
      if (tenantsResponse.ok) {
        unit.tenants = await tenantsResponse.json();
      }
      
      return unit;
    },
    enabled: !!id,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (unit: UnitInsert) => {
      const response = await apiRequest('POST', '/api/units', unit);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['units', data.propertyId] });
      toast.success('Einheit erfolgreich erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen der Einheit');
      console.error('Create unit error:', error);
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: UnitUpdate & { id: string }) => {
      const response = await apiRequest('PATCH', `/api/units/${id}`, updates);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      queryClient.invalidateQueries({ queryKey: ['unit', data.id] });
      toast.success('Einheit erfolgreich aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Einheit');
      console.error('Update unit error:', error);
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast.success('Einheit erfolgreich gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Einheit');
      console.error('Delete unit error:', error);
    },
  });
}
