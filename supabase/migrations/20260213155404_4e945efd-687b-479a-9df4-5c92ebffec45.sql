
-- Chat sessions table for persistent AI chat history
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_type TEXT NOT NULL DEFAULT 'assistant' CHECK (chat_type IN ('assistant', 'tenant')),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_chat_sessions_user ON public.chat_sessions(user_id, chat_type);
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at);

-- Updated_at trigger
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only access their own chat sessions
CREATE POLICY "Users can view own chat sessions"
  ON public.chat_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own chat sessions"
  ON public.chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chat sessions"
  ON public.chat_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own chat sessions"
  ON public.chat_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: Chat messages via session ownership
CREATE POLICY "Users can view own chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (session_id IN (SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()));

-- TTL: Auto-expire old sessions (90 days retention)
-- This can be enforced via a scheduled job or pg_cron
COMMENT ON TABLE public.chat_sessions IS 'AI chat sessions with 90-day retention policy. PII: contains user conversations.';
COMMENT ON TABLE public.chat_messages IS 'Individual messages within chat sessions.';
