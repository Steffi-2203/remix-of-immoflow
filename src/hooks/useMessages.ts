import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useDemoData } from '@/contexts/DemoDataContext';
import { mockMessages } from '@/data/mockData';

export interface Message {
  id: string;
  organization_id: string | null;
  maintenance_task_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  recipient_type: 'tenant' | 'contractor' | 'internal' | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  subject: string | null;
  message_body: string;
  message_type: 'email' | 'sms' | 'both' | null;
  sent_at: string | null;
  status: 'draft' | 'sent' | 'failed';
  created_by: string | null;
  created_at: string;
  tenants?: { first_name: string; last_name: string } | null;
  units?: { top_nummer: string } | null;
}

export function useMessages(status?: string) {
  const { user } = useAuth();
  const { isDemoMode } = useDemoData();

  return useQuery({
    queryKey: ['messages', user?.id, status, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        let messages = mockMessages as unknown as Message[];
        if (status && status !== 'all') {
          messages = messages.filter(m => m.status === status);
        }
        return messages;
      }

      let query = supabase
        .from('messages')
        .select(`
          *,
          tenants(first_name, last_name),
          units(top_nummer)
        `)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Message[];
    },
    enabled: isDemoMode || !!user?.id,
  });
}

export function useSentMessages() {
  return useMessages('sent');
}

export function useCreateMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (message: {
      recipient_type: 'tenant' | 'contractor' | 'internal';
      recipient_email?: string;
      recipient_phone?: string;
      recipient_name?: string;
      subject?: string;
      message_body: string;
      message_type?: 'email' | 'sms' | 'both';
      tenant_id?: string;
      unit_id?: string;
      maintenance_task_id?: string;
      status?: 'draft' | 'sent';
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          ...message,
          created_by: user?.id,
          sent_at: message.status === 'sent' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({
        title: data.status === 'sent' ? 'Nachricht gesendet' : 'Entwurf gespeichert',
        description: data.status === 'sent' 
          ? 'Die Nachricht wurde erfolgreich gesendet.' 
          : 'Der Entwurf wurde gespeichert.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: 'Die Nachricht konnte nicht erstellt werden.',
        variant: 'destructive',
      });
      console.error('Error creating message:', error);
    },
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Message> & { id: string }) => {
      const { data, error } = await supabase
        .from('messages')
        .update({
          ...updates,
          sent_at: updates.status === 'sent' ? new Date().toISOString() : undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({
        title: data.status === 'sent' ? 'Nachricht gesendet' : 'Nachricht aktualisiert',
        description: data.status === 'sent' 
          ? 'Die Nachricht wurde erfolgreich gesendet.' 
          : 'Die Nachricht wurde aktualisiert.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: 'Die Nachricht konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
      console.error('Error updating message:', error);
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast({
        title: 'Nachricht gelöscht',
        description: 'Die Nachricht wurde gelöscht.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Fehler',
        description: 'Die Nachricht konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
      console.error('Error deleting message:', error);
    },
  });
}
