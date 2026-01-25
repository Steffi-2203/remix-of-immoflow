import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'sonner';

export interface Tenant {
  id: string;
  unitId: string;
  unit_id: string;
  firstName: string;
  first_name: string;
  lastName: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobilePhone: string | null;
  mobile_phone: string | null;
  status: 'aktiv' | 'leerstand' | 'beendet';
  mietbeginn: string | null;
  mietende: string | null;
  grundmiete: string;
  betriebskostenVorschuss: string;
  betriebskosten_vorschuss: string;
  heizungskostenVorschuss: string;
  heizungskosten_vorschuss: string;
  kaution: string | null;
  kautionBezahlt: boolean;
  kaution_bezahlt: boolean;
  iban: string | null;
  bic: string | null;
  sepaMandat: boolean;
  sepa_mandat: boolean;
  sepaMandatDatum: string | null;
  sepa_mandat_datum: string | null;
  notes: string | null;
  createdAt: string;
  created_at: string;
  updatedAt: string;
  updated_at: string;
  units?: {
    id: string;
    topNummer: string;
    top_nummer: string;
    propertyId: string;
    property_id: string;
    properties?: {
      id: string;
      name: string;
      address: string;
    };
  };
}

function normalizeTenant(t: any): Tenant {
  return {
    ...t,
    unitId: t.unitId ?? t.unit_id ?? '',
    unit_id: t.unitId ?? t.unit_id ?? '',
    firstName: t.firstName ?? t.first_name ?? '',
    first_name: t.firstName ?? t.first_name ?? '',
    lastName: t.lastName ?? t.last_name ?? '',
    last_name: t.lastName ?? t.last_name ?? '',
    mobilePhone: t.mobilePhone ?? t.mobile_phone ?? null,
    mobile_phone: t.mobilePhone ?? t.mobile_phone ?? null,
    betriebskostenVorschuss: t.betriebskostenVorschuss ?? t.betriebskosten_vorschuss ?? '0',
    betriebskosten_vorschuss: t.betriebskostenVorschuss ?? t.betriebskosten_vorschuss ?? '0',
    heizungskostenVorschuss: t.heizungskostenVorschuss ?? t.heizungskosten_vorschuss ?? '0',
    heizungskosten_vorschuss: t.heizungskostenVorschuss ?? t.heizungskosten_vorschuss ?? '0',
    kautionBezahlt: t.kautionBezahlt ?? t.kaution_bezahlt ?? false,
    kaution_bezahlt: t.kautionBezahlt ?? t.kaution_bezahlt ?? false,
    sepaMandat: t.sepaMandat ?? t.sepa_mandat ?? false,
    sepa_mandat: t.sepaMandat ?? t.sepa_mandat ?? false,
    sepaMandatDatum: t.sepaMandatDatum ?? t.sepa_mandat_datum ?? null,
    sepa_mandat_datum: t.sepaMandatDatum ?? t.sepa_mandat_datum ?? null,
    createdAt: t.createdAt ?? t.created_at ?? '',
    created_at: t.createdAt ?? t.created_at ?? '',
    updatedAt: t.updatedAt ?? t.updated_at ?? '',
    updated_at: t.updatedAt ?? t.updated_at ?? '',
  };
}

function normalizeUnit(u: any) {
  return {
    ...u,
    topNummer: u.topNummer ?? u.top_nummer ?? '',
    top_nummer: u.topNummer ?? u.top_nummer ?? '',
    propertyId: u.propertyId ?? u.property_id ?? '',
    property_id: u.propertyId ?? u.property_id ?? '',
  };
}

export type TenantInsert = Omit<Tenant, 'id' | 'createdAt' | 'updatedAt' | 'units'>;
export type TenantUpdate = Partial<TenantInsert>;

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    staleTime: 60000,
    gcTime: 300000,
    queryFn: async () => {
      const response = await fetch('/api/tenants', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch tenants');
      const tenants = await response.json();
      
      const unitsResponse = await fetch('/api/units', { credentials: 'include' });
      const propertiesResponse = await fetch('/api/properties', { credentials: 'include' });
      
      if (unitsResponse.ok && propertiesResponse.ok) {
        const units = await unitsResponse.json();
        const properties = await propertiesResponse.json();
        
        return tenants.map((tenant: any) => {
          const normalized = normalizeTenant(tenant);
          const tenantUnitId = normalized.unitId ?? normalized.unit_id;
          const unit = units.find((u: any) => u.id === tenantUnitId);
          const normalizedUnit = unit ? normalizeUnit(unit) : null;
          const unitPropertyId = normalizedUnit?.propertyId ?? normalizedUnit?.property_id;
          const property = unitPropertyId ? properties.find((p: any) => p.id === unitPropertyId) : null;
          return {
            ...normalized,
            units: normalizedUnit ? {
              ...normalizedUnit,
              properties: property
            } : undefined
          };
        });
      }
      
      return tenants.map(normalizeTenant);
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
      
      if (tenant.unitId) {
        const unitResponse = await fetch(`/api/units/${tenant.unitId}`, { credentials: 'include' });
        if (unitResponse.ok) {
          const unit = await unitResponse.json();
          const propertyResponse = await fetch(`/api/properties/${unit.propertyId}`, { credentials: 'include' });
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
