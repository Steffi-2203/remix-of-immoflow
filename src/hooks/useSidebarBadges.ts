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
  const { isDemoMode, maintenanceTasks: demoTasks } = useDemoData();

  return useQuery({
    queryKey: ['sidebarBadges', isDemoMode],
    queryFn: async (): Promise<SidebarBadges> => {
      // Demo mode: compute badges from mock data
      if (isDemoMode) {
        const openTasks = demoTasks.filter(t => t.status === 'open' || t.status === 'in_progress').length;
        const pendingApproval = demoTasks.filter(t => t.status === 'pending_approval').length;
        return {
          dunning: 0,
          maintenance: openTasks,
          messages: 0,
          invoiceApproval: pendingApproval,
        };
      }

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
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
