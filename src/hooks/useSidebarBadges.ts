import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDemoData } from '@/contexts/DemoDataContext';

export interface SidebarBadges {
  dunning: number;
  maintenance: number;
  messages: number;
  invoiceApproval: number;
}

export function useSidebarBadges() {
  const { isDemoMode } = useDemoData();

  return useQuery({
    queryKey: ['sidebarBadges'],
    queryFn: async (): Promise<SidebarBadges> => {
      const today = new Date().toISOString().split('T')[0];

      // Run all counts in parallel
      const [dunningRes, maintenanceRes, messagesRes, approvalRes] = await Promise.all([
        // Overdue unpaid invoices
        supabase
          .from('monthly_invoices')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'offen')
          .lte('faellig_am', today),
        // Open maintenance tasks
        supabase
          .from('maintenance_tasks')
          .select('id', { count: 'exact', head: true })
          .in('status', ['offen', 'in_bearbeitung']),
        // Unsent/draft messages
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'entwurf'),
        // Pending invoice approvals
        supabase
          .from('maintenance_invoices')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'eingereicht'),
      ]);

      return {
        dunning: dunningRes.count ?? 0,
        maintenance: maintenanceRes.count ?? 0,
        messages: messagesRes.count ?? 0,
        invoiceApproval: approvalRes.count ?? 0,
      };
    },
    enabled: !isDemoMode,
    refetchInterval: 60_000, // refresh every minute
    staleTime: 30_000,
  });
}
