import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

interface UseChatPersistenceOptions {
  chatType: 'assistant' | 'tenant';
  welcomeMessage: string;
}

export function useChatPersistence({ chatType, welcomeMessage }: UseChatPersistenceOptions) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: welcomeMessage },
  ]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const savingRef = useRef(false);

  // Load or create session on mount
  useEffect(() => {
    if (!user || !supabase) return;

    let cancelled = false;

    async function loadSession() {
      setIsLoadingHistory(true);
      try {
        // Find existing session
        const { data: sessions } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('user_id', user!.id)
          .eq('chat_type', chatType)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (cancelled) return;

        if (sessions && sessions.length > 0) {
          const sid = sessions[0].id;
          setSessionId(sid);

          // Load messages
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('session_id', sid)
            .order('created_at', { ascending: true })
            .limit(200);

          if (cancelled) return;

          if (msgs && msgs.length > 0) {
            setMessages(msgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
          }
        } else {
          // Create new session
          const { data: newSession } = await supabase
            .from('chat_sessions')
            .insert({ user_id: user!.id, chat_type: chatType, title: chatType === 'tenant' ? 'Mieter-Chat' : 'AI Assistent' })
            .select('id')
            .single();

          if (cancelled) return;

          if (newSession) {
            setSessionId(newSession.id);
            // Save welcome message
            await supabase.from('chat_messages').insert({
              session_id: newSession.id,
              role: 'assistant',
              content: welcomeMessage,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load chat session:', err);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    }

    loadSession();
    return () => { cancelled = true; };
  }, [user, chatType, welcomeMessage]);

  // Persist a new message
  const persistMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!sessionId || !supabase || savingRef.current) return;

    try {
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role,
        content,
      });

      // Touch session updated_at
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    } catch (err) {
      console.error('Failed to persist message:', err);
    }
  }, [sessionId]);

  // Add message locally + persist
  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
    persistMessage(msg.role, msg.content);
  }, [persistMessage]);

  // Update last assistant message (for streaming)
  const updateLastAssistant = useCallback((content: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant') {
        return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
      }
      return [...prev, { role: 'assistant', content }];
    });
  }, []);

  // Finalize streaming assistant message (persist the final content)
  const finalizeAssistant = useCallback((content: string) => {
    updateLastAssistant(content);
    persistMessage('assistant', content);
  }, [updateLastAssistant, persistMessage]);

  // Clear history
  const clearHistory = useCallback(async () => {
    if (!sessionId || !supabase) return;

    await supabase.from('chat_messages').delete().eq('session_id', sessionId);
    setMessages([{ role: 'assistant', content: welcomeMessage }]);

    // Re-insert welcome
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: welcomeMessage,
    });
  }, [sessionId, welcomeMessage]);

  return {
    messages,
    setMessages,
    sessionId,
    isLoadingHistory,
    addMessage,
    updateLastAssistant,
    finalizeAssistant,
    clearHistory,
  };
}
