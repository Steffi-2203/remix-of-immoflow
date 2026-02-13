import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MessageCircle, X, Send, Sparkles, Bot, User, Minimize2, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { useChatPersistence } from '@/hooks/useChatPersistence';

const WELCOME_MSG = 'Hallo! 👋 Ich bin Ihr ImmoflowMe-Assistent. Fragen Sie mich zu Hausverwaltung, MRG, WEG oder Ihrer Software.';

const QUICK_PROMPTS = [
  'Wie hoch ist meine Leerstandsquote?',
  'Welche Fristen laufen bald ab?',
  'Wann ist die BK-Abrechnung fällig?',
  'Was ist §21 MRG?',
];

// Local AI responses for common property management questions
function getLocalResponse(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('leerstand')) {
    return 'Ihre **Leerstandsquote** finden Sie im Dashboard unter dem **Management Cockpit**. Dort sehen Sie die aktuelle Quote, die Anzahl leerer Einheiten und den Trend.\n\nUm den Leerstand zu senken:\n- Prüfen Sie die Mietpreise im Vergleich zum Mietspiegel\n- Schalten Sie Inserate auf gängigen Portalen\n- Prüfen Sie den Zustand der leeren Einheiten';
  }
  if (q.includes('frist') || q.includes('deadline')) {
    return 'Offene **Fristen** sehen Sie im **Fristenkalender** (/fristen) und im Notification Center (Glocke oben rechts).\n\nWichtige gesetzliche Fristen:\n- **BK-Abrechnung**: bis 30.06. des Folgejahres (MRG §21)\n- **Kautionsrückgabe**: 14 Tage nach Mietende (§27b MRG)\n- **Eigentümerversammlung**: Einladung 14 Tage vorher (§24 WEG)';
  }
  if (q.includes('bk') || q.includes('abrechnung') || q.includes('betriebskosten')) {
    return 'Die **Betriebskostenabrechnung** muss gemäß **MRG §21 Abs 3** bis zum **30. Juni des Folgejahres** gelegt werden.\n\nSo erstellen Sie eine BK-Abrechnung:\n1. Gehen Sie zu **Abrechnung** im Menü\n2. Wählen Sie die Liegenschaft und das Jahr\n3. Prüfen Sie die erfassten Kosten\n4. Berechnen und versenden Sie die Abrechnung\n\nDie Anspruchsverjährung beträgt **3 Jahre**.';
  }
  if (q.includes('§21') || q.includes('mrg')) {
    return '**MRG §21** regelt die Betriebskostenabrechnung:\n\n- **Abs 1**: Betriebskosten und öffentliche Abgaben sind vom Mieter zu tragen\n- **Abs 2**: Die Aufteilung erfolgt nach Nutzfläche\n- **Abs 3**: Abrechnung bis **30. Juni** des Folgejahres\n- **Abs 4**: Einsichtsrecht des Mieters in Belege\n\nWeitere wichtige MRG-Paragraphen:\n- §27: Verbotene Leistungen\n- §16: Mietzinsbegrenzung\n- §30: Kündigungsgründe';
  }
  if (q.includes('kaution') || q.includes('deposit')) {
    return 'Die **Mietkaution** wird in ImmoflowMe unter dem jeweiligen Mieter verwaltet.\n\n**Gesetzliche Regelung (§27b MRG)**:\n- Rückgabe innerhalb **14 Tagen** nach Mietende\n- Zinsen gemäß Sparbuchzinssatz\n- Kaution max. 6 Monatsmieten (üblich: 3)\n\nDie Kautionsverwaltung mit Zinsberechnung finden Sie im Mieterdetail.';
  }
  if (q.includes('wartung') || q.includes('instandhaltung') || q.includes('reparatur')) {
    return 'Die **Wartungsverwaltung** finden Sie unter **Wartung & Instandhaltung**.\n\nFunktionen:\n- Aufgaben erstellen mit Priorität und Frist\n- Handwerker zuweisen und verwalten\n- Kosten tracken und Rechnungen freigeben\n- Wartungsverträge mit automatischen Erinnerungen\n\n**Tipp**: Dringende Aufgaben werden im Dashboard und Notification Center angezeigt.';
  }

  return `Danke für Ihre Frage! Hier sind einige Hinweise:\n\n1. **Dashboard**: Übersicht über alle KPIs und Kennzahlen\n2. **Suche (⌘K)**: Schnellsuche über alle Daten\n3. **Benachrichtigungen**: Automatische Hinweise auf Fristen und überfällige Posten\n4. **Reports**: Detaillierte Auswertungen und Berichte\n\nFür spezifische Fragen zu MRG, WEG oder HeizKG stehe ich Ihnen gerne zur Verfügung!`;
}

export function AIAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const { messages, isLoadingHistory, addMessage, clearHistory } = useChatPersistence({
    chatType: 'assistant',
    welcomeMessage: WELCOME_MSG,
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMsg });
    setIsTyping(true);

    // Simulate typing delay
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

    const response = getLocalResponse(userMsg);
    addMessage({ role: 'assistant', content: response });
    setIsTyping(false);
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent flex items-center justify-center">
          <Sparkles className="h-2.5 w-2.5 text-accent-foreground" />
        </span>
      </Button>
    );
  }

  return (
    <Card className={cn(
      'fixed z-50 shadow-2xl border border-border flex flex-col transition-all duration-200',
      minimized
        ? 'bottom-6 right-6 w-72 h-12'
        : 'bottom-6 right-6 w-96 h-[550px] max-h-[80vh]'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary-foreground" />
          <span className="text-sm font-semibold text-primary-foreground">ImmoflowMe AI</span>
          <Badge variant="outline" className="text-[10px] border-primary-foreground/30 text-primary-foreground/80">Beta</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={clearHistory}
            title="Verlauf löschen"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setMinimized(!minimized)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Verlauf wird geladen...</span>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          {messages.length <= 2 && !isLoadingHistory && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); }}
                  className="text-[11px] px-2 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-border bg-background rounded-b-lg">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Frage stellen..."
                className="text-sm h-9"
                disabled={isTyping}
              />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={isTyping || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </Card>
  );
}
