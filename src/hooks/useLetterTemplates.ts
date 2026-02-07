import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useLetterTemplates() {
  return useQuery({
    queryKey: ['letter-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLetterTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: {
      name: string;
      category: string;
      subject: string;
      body: string;
      organization_id: string;
    }) => {
      const { data, error } = await supabase
        .from('letter_templates')
        .insert(template)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-templates'] });
      toast.success('Vorlage gespeichert');
    },
    onError: () => toast.error('Fehler beim Speichern'),
  });
}

export function useDeleteLetterTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('letter_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-templates'] });
      toast.success('Vorlage gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });
}

export function useSerialLetters() {
  return useQuery({
    queryKey: ['serial-letters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('serial_letters')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSerialLetter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (letter: {
      organization_id: string;
      property_id: string;
      template_id?: string;
      subject: string;
      body: string;
      recipient_count: number;
      sent_via: string;
      sent_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('serial_letters')
        .insert(letter)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serial-letters'] });
      toast.success('Serienbrief erstellt');
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });
}
