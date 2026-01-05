import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AccountCategory {
  id: string;
  organization_id: string | null;
  name: string;
  type: 'income' | 'expense' | 'asset';
  parent_id: string | null;
  is_system: boolean;
  created_at: string;
}

export type AccountCategoryInsert = Omit<AccountCategory, 'id' | 'created_at'>;
export type AccountCategoryUpdate = Partial<Omit<AccountCategory, 'id' | 'created_at' | 'organization_id' | 'is_system'>>;

export function useAccountCategories() {
  return useQuery({
    queryKey: ['account_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_categories')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as AccountCategory[];
    },
  });
}

export function useAccountCategoriesByType(type: 'income' | 'expense' | 'asset') {
  return useQuery({
    queryKey: ['account_categories', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_categories')
        .select('*')
        .eq('type', type)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as AccountCategory[];
    },
  });
}

export function useCreateAccountCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: AccountCategoryInsert) => {
      const { data, error } = await supabase
        .from('account_categories')
        .insert(category)
        .select()
        .single();
      
      if (error) throw error;
      return data as AccountCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account_categories'] });
      toast.success('Kategorie erfolgreich erstellt');
    },
    onError: (error) => {
      toast.error('Fehler beim Erstellen der Kategorie');
      console.error('Create category error:', error);
    },
  });
}

export function useUpdateAccountCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: AccountCategoryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('account_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as AccountCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account_categories'] });
      toast.success('Kategorie aktualisiert');
    },
    onError: (error) => {
      toast.error('Fehler beim Aktualisieren der Kategorie');
      console.error('Update category error:', error);
    },
  });
}

export function useDeleteAccountCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('account_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account_categories'] });
      toast.success('Kategorie gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen der Kategorie');
      console.error('Delete category error:', error);
    },
  });
}
