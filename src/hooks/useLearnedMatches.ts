import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LearnedMatch {
  id: string;
  organization_id: string | null;
  pattern: string;
  unit_id: string | null;
  tenant_id: string | null;
  match_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface LearnedMatchInsert {
  organization_id?: string | null;
  pattern: string;
  unit_id?: string | null;
  tenant_id?: string | null;
}

export function useLearnedMatches() {
  return useQuery({
    queryKey: ['learned_matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learned_matches')
        .select('*')
        .order('match_count', { ascending: false });
      
      if (error) throw error;
      return data as LearnedMatch[];
    },
  });
}

export function useCreateLearnedMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (match: LearnedMatchInsert) => {
      // First check if pattern already exists
      const { data: existing } = await supabase
        .from('learned_matches')
        .select('*')
        .eq('pattern', match.pattern.toLowerCase())
        .maybeSingle();
      
      if (existing) {
        // Update existing match and increment count
        const { data, error } = await supabase
          .from('learned_matches')
          .update({
            unit_id: match.unit_id,
            tenant_id: match.tenant_id,
            match_count: (existing.match_count || 0) + 1,
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data as LearnedMatch;
      }
      
      // Create new match
      const { data, error } = await supabase
        .from('learned_matches')
        .insert({
          ...match,
          pattern: match.pattern.toLowerCase(),
          match_count: 1,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as LearnedMatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learned_matches'] });
    },
    onError: (error) => {
      console.error('Create learned match error:', error);
    },
  });
}

export function useIncrementLearnedMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: existing } = await supabase
        .from('learned_matches')
        .select('match_count')
        .eq('id', id)
        .single();
      
      const { data, error } = await supabase
        .from('learned_matches')
        .update({
          match_count: (existing?.match_count || 0) + 1,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as LearnedMatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learned_matches'] });
    },
  });
}

export function useDeleteLearnedMatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('learned_matches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learned_matches'] });
      toast.success('Gelerntes Pattern gelöscht');
    },
    onError: (error) => {
      toast.error('Fehler beim Löschen');
      console.error('Delete learned match error:', error);
    },
  });
}
