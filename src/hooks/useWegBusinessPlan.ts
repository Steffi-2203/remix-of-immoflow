import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WegBusinessPlan {
  id: string;
  organization_id: string | null;
  property_id: string;
  year: number;
  title: string;
  status: 'entwurf' | 'beschlossen' | 'aktiv';
  effective_date: string;
  total_amount: number;
  notes: string | null;
  approved_at: string | null;
  approved_in_assembly_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WegBusinessPlanItem {
  id: string;
  business_plan_id: string;
  category: 'betriebskosten' | 'verwaltung' | 'ruecklage' | 'heizung' | 'wasser' | 'sonstiges';
  description: string;
  annual_amount: number;
  tax_rate: number;
  distribution_key: 'mea' | 'qm' | 'personen' | 'gleich';
  created_at: string;
}

export interface WegOwnerInvoice {
  id: string;
  business_plan_id: string;
  owner_id: string;
  unit_id: string | null;
  year: number;
  month: number;
  amount_net: number;
  amount_tax: number;
  amount_gross: number;
  reserve_contribution: number;
  status: 'offen' | 'bezahlt' | 'teilbezahlt' | 'ueberfaellig' | 'storniert';
  due_date: string;
  is_prorated: boolean;
  prorated_days: number | null;
  total_days: number | null;
  pdf_url: string | null;
  created_at: string;
}

export const categoryLabels: Record<string, string> = {
  betriebskosten: 'Betriebskosten',
  verwaltung: 'Verwaltung',
  ruecklage: 'Rücklage',
  heizung: 'Heizung',
  wasser: 'Wasser',
  sonstiges: 'Sonstiges',
};

export const statusLabels: Record<string, string> = {
  entwurf: 'Entwurf',
  beschlossen: 'Beschlossen',
  aktiv: 'Aktiv',
};

// ── Queries ──

export function useWegBusinessPlans(propertyId?: string) {
  return useQuery({
    queryKey: ['weg-business-plans', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('weg_business_plans' as any)
        .select('*')
        .order('year', { ascending: false });
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as WegBusinessPlan[];
    },
  });
}

export function useWegBusinessPlanItems(planId?: string) {
  return useQuery({
    queryKey: ['weg-business-plan-items', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weg_business_plan_items' as any)
        .select('*')
        .eq('business_plan_id', planId)
        .order('created_at');
      if (error) throw error;
      return data as unknown as WegBusinessPlanItem[];
    },
    enabled: !!planId,
  });
}

export function useWegOwnerInvoices(planId?: string) {
  return useQuery({
    queryKey: ['weg-owner-invoices', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weg_owner_invoices' as any)
        .select('*')
        .eq('business_plan_id', planId)
        .order('year')
        .order('month')
        .order('owner_id');
      if (error) throw error;
      return data as unknown as WegOwnerInvoice[];
    },
    enabled: !!planId,
  });
}

// ── Mutations ──

export function useCreateWegBusinessPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Omit<WegBusinessPlan, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('weg_business_plans' as any)
        .insert(plan as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WegBusinessPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weg-business-plans'] });
      toast.success('Wirtschaftsplan erstellt');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });
}

export function useUpdateWegBusinessPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<WegBusinessPlan>) => {
      const { data, error } = await supabase
        .from('weg_business_plans' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weg-business-plans'] });
      toast.success('Wirtschaftsplan aktualisiert');
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });
}

export function useCreateWegBusinessPlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<WegBusinessPlanItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('weg_business_plan_items' as any)
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weg-business-plan-items'] });
    },
    onError: () => toast.error('Fehler beim Speichern der Position'),
  });
}

export function useDeleteWegBusinessPlanItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('weg_business_plan_items' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weg-business-plan-items'] });
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });
}

export function useGenerateOwnerInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoices: Omit<WegOwnerInvoice, 'id' | 'created_at'>[]) => {
      const { data, error } = await supabase
        .from('weg_owner_invoices' as any)
        .insert(invoices as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weg-owner-invoices'] });
      toast.success('Vorschreibungen generiert');
    },
    onError: () => toast.error('Fehler beim Generieren'),
  });
}

// ── Calculation helpers ──

interface OwnerUnit {
  ownerId: string;
  ownerName: string;
  unitId: string | null;
  mea: number;
  qm: number;
}

export interface CalculatedInvoiceLine {
  ownerId: string;
  ownerName: string;
  unitId: string | null;
  monthlyNet: number;
  monthlyTax: number;
  monthlyGross: number;
  reserveContribution: number;
}

export function calculateMonthlyDistribution(
  items: WegBusinessPlanItem[],
  ownerUnits: OwnerUnit[],
): CalculatedInvoiceLine[] {
  const totalMea = ownerUnits.reduce((s, o) => s + o.mea, 0);
  if (totalMea === 0) return [];

  return ownerUnits.map((ou) => {
    const meaRatio = ou.mea / totalMea;
    let net = 0;
    let tax = 0;
    let reserve = 0;

    for (const item of items) {
      const monthlyAmount = item.annual_amount / 12;
      const share = monthlyAmount * meaRatio;

      if (item.category === 'ruecklage') {
        reserve += share; // Rücklage is not taxed
      } else {
        const itemTax = share * (item.tax_rate / 100);
        net += share;
        tax += itemTax;
      }
    }

    return {
      ownerId: ou.ownerId,
      ownerName: ou.ownerName,
      unitId: ou.unitId,
      monthlyNet: Math.round(net * 100) / 100,
      monthlyTax: Math.round(tax * 100) / 100,
      monthlyGross: Math.round((net + tax + reserve) * 100) / 100,
      reserveContribution: Math.round(reserve * 100) / 100,
    };
  });
}

export function checkMinReserve(
  reserveAnnual: number,
  totalQm: number,
): { ok: boolean; perQmMonth: number; minimum: number } {
  const minimum = 0.9;
  const perQmMonth = totalQm > 0 ? reserveAnnual / 12 / totalQm : 0;
  return { ok: perQmMonth >= minimum, perQmMonth: Math.round(perQmMonth * 100) / 100, minimum };
}
