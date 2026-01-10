import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  user_id: string | null;
  table_name: string;
  record_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: unknown;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  tableName?: string;
  action?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit ?? 100);

      if (filters?.tableName) {
        query = query.eq('table_name', filters.tableName);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });
}

export function useAuditLogStats() {
  const { data: logs } = useAuditLogs({ limit: 1000 });

  if (!logs) {
    return {
      totalLogs: 0,
      createCount: 0,
      updateCount: 0,
      deleteCount: 0,
      tableStats: {} as Record<string, number>,
    };
  }

  const createCount = logs.filter(l => l.action === 'create').length;
  const updateCount = logs.filter(l => l.action === 'update').length;
  const deleteCount = logs.filter(l => l.action === 'delete').length;

  const tableStats: Record<string, number> = {};
  logs.forEach(log => {
    tableStats[log.table_name] = (tableStats[log.table_name] || 0) + 1;
  });

  return {
    totalLogs: logs.length,
    createCount,
    updateCount,
    deleteCount,
    tableStats,
  };
}
