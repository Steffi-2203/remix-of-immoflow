import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 50;

interface PaginationState {
  page: number;
  pageSize: number;
}

interface UsePaginatedQueryOptions {
  queryKey: string[];
  table: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean }[];
  filters?: { column: string; op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'is' | 'not.is' | 'in'; value: any }[];
  enabled?: boolean;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  isLoading: boolean;
  error: any;
  isError: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  refetch: () => void;
}

function applyFilters(query: any, filters: UsePaginatedQueryOptions['filters']) {
  let q = query;
  for (const f of filters || []) {
    if (f.op === 'not.is') {
      q = q.not(f.column, 'is', f.value);
    } else if (f.op === 'in') {
      q = q.in(f.column, f.value);
    } else {
      q = q.filter(f.column, f.op, f.value);
    }
  }
  return q;
}

export function usePaginatedQuery<T = any>(options: UsePaginatedQueryOptions): PaginatedResult<T> {
  const { table, select = '*', orderBy = [], filters = [], enabled = true, pageSize = PAGE_SIZE } = options;
  const [pagination, setPagination] = useState<PaginationState>({ page: 0, pageSize });

  // Count query
  const countQuery = useQuery({
    queryKey: [...options.queryKey, 'count', JSON.stringify(filters)],
    queryFn: async () => {
      let query = (supabase as any).from(table).select('*', { count: 'exact', head: true });
      query = applyFilters(query, filters);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled,
  });

  // Data query with pagination
  const dataQuery = useQuery({
    queryKey: [...options.queryKey, 'page', pagination.page, pagination.pageSize, JSON.stringify(filters)],
    queryFn: async () => {
      let query = (supabase as any).from(table).select(select);
      query = applyFilters(query, filters);

      for (const o of orderBy) {
        query = query.order(o.column, { ascending: o.ascending ?? false });
      }

      const from = pagination.page * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    },
    enabled,
  });

  const totalCount = countQuery.data || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page: Math.max(0, Math.min(page, totalPages - 1)) }));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, totalPages - 1) }));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 0) }));
  }, []);

  return {
    data: dataQuery.data || [],
    isLoading: dataQuery.isLoading || countQuery.isLoading,
    error: dataQuery.error || countQuery.error,
    isError: dataQuery.isError || countQuery.isError,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalCount,
    totalPages,
    hasNextPage: pagination.page < totalPages - 1,
    hasPreviousPage: pagination.page > 0,
    goToPage,
    nextPage,
    previousPage,
    refetch: dataQuery.refetch,
  };
}
