import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskInvoiceSummary {
  taskId: string;
  count: number;
  totalAmount: number;
  pendingCount: number;
  approvedCount: number;
  paidCount: number;
  rejectedCount: number;
}

export function useTaskInvoices(taskIds: string[]) {
  return useQuery({
    queryKey: ['task-invoices', taskIds],
    queryFn: async () => {
      if (!taskIds.length) return {};

      const { data, error } = await supabase
        .from('maintenance_invoices')
        .select('id, maintenance_task_id, amount, status')
        .in('maintenance_task_id', taskIds);

      if (error) throw error;

      // Gruppieren nach Task
      const summaries: Record<string, TaskInvoiceSummary> = {};

      for (const invoice of data || []) {
        const taskId = invoice.maintenance_task_id;
        if (!taskId) continue;

        if (!summaries[taskId]) {
          summaries[taskId] = {
            taskId,
            count: 0,
            totalAmount: 0,
            pendingCount: 0,
            approvedCount: 0,
            paidCount: 0,
            rejectedCount: 0,
          };
        }

        summaries[taskId].count++;
        summaries[taskId].totalAmount += Number(invoice.amount);

        switch (invoice.status) {
          case 'pending':
            summaries[taskId].pendingCount++;
            break;
          case 'approved':
            summaries[taskId].approvedCount++;
            break;
          case 'paid':
            summaries[taskId].paidCount++;
            break;
          case 'rejected':
            summaries[taskId].rejectedCount++;
            break;
        }
      }

      return summaries;
    },
    enabled: taskIds.length > 0,
  });
}
