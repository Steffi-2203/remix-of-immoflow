import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDemoData } from '@/contexts/DemoDataContext';

export interface DunningInvoice {
  id: string;
  month: number;
  year: number;
  gesamtbetrag: number;
  faellig_am: string;
  mahnstufe: number;
  zahlungserinnerung_am: string | null;
  mahnung_am: string | null;
}

export interface DunningCase {
  tenantId: string;
  tenantName: string;
  email: string | null;
  phone: string | null;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  invoices: DunningInvoice[];
  totalAmount: number;
  highestMahnstufe: number;
  oldestOverdue: string;
}

export interface DunningStats {
  totalCases: number;
  totalOpen: number;
  totalReminded: number;
  totalDunned: number;
  totalAmount: number;
}

export function useDunningOverview() {
  const { isDemoMode } = useDemoData();

  return useQuery({
    queryKey: ['dunningOverview'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all open and overdue invoices with tenant and unit info
      const { data: invoices, error } = await supabase
        .from('monthly_invoices')
        .select(`
          id,
          month,
          year,
          gesamtbetrag,
          faellig_am,
          mahnstufe,
          zahlungserinnerung_am,
          mahnung_am,
          tenant_id,
          unit_id,
          tenants (
            id,
            first_name,
            last_name,
            email,
            phone,
            unit_id,
            units (
              id,
              top_nummer,
              property_id,
              properties (
                id,
                name
              )
            )
          )
        `)
        .eq('status', 'offen')
        .lte('faellig_am', today)
        .order('faellig_am', { ascending: true });
      
      if (error) throw error;
      
      // Group by tenant
      const caseMap = new Map<string, DunningCase>();
      
      invoices?.forEach((invoice: any) => {
        const tenant = invoice.tenants;
        if (!tenant) return;
        
        const tenantId = tenant.id;
        
        if (!caseMap.has(tenantId)) {
          caseMap.set(tenantId, {
            tenantId,
            tenantName: `${tenant.first_name} ${tenant.last_name}`,
            email: tenant.email,
            phone: tenant.phone,
            propertyId: tenant.units?.properties?.id || '',
            propertyName: tenant.units?.properties?.name || 'Unbekannt',
            unitId: tenant.units?.id || '',
            unitNumber: tenant.units?.top_nummer || '',
            invoices: [],
            totalAmount: 0,
            highestMahnstufe: 0,
            oldestOverdue: invoice.faellig_am,
          });
        }
        
        const dunningCase = caseMap.get(tenantId)!;
        
        dunningCase.invoices.push({
          id: invoice.id,
          month: invoice.month,
          year: invoice.year,
          gesamtbetrag: invoice.gesamtbetrag,
          faellig_am: invoice.faellig_am,
          mahnstufe: invoice.mahnstufe,
          zahlungserinnerung_am: invoice.zahlungserinnerung_am,
          mahnung_am: invoice.mahnung_am,
        });
        
        dunningCase.totalAmount += invoice.gesamtbetrag;
        dunningCase.highestMahnstufe = Math.max(dunningCase.highestMahnstufe, invoice.mahnstufe);
        
        if (invoice.faellig_am < dunningCase.oldestOverdue) {
          dunningCase.oldestOverdue = invoice.faellig_am;
        }
      });
      
      const cases = Array.from(caseMap.values()).sort((a, b) => 
        a.oldestOverdue.localeCompare(b.oldestOverdue)
      );
      
      // Calculate stats
      const stats: DunningStats = {
        totalCases: cases.length,
        totalOpen: cases.filter(c => c.highestMahnstufe === 0).length,
        totalReminded: cases.filter(c => c.highestMahnstufe === 1).length,
        totalDunned: cases.filter(c => c.highestMahnstufe >= 2).length,
        totalAmount: cases.reduce((sum, c) => sum + c.totalAmount, 0),
      };
      
      return { cases, stats };
    },
    enabled: !isDemoMode,
  });
}

export function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}
