import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, Building2, Users, Home, FileText, ArrowRight,
  Plus, Calculator, BarChart3, Wrench, Receipt, FileBox,
  Calendar, Settings, Shield, CreditCard, Zap
} from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { useUnits } from '@/hooks/useUnits';
import { cn } from '@/lib/utils';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  type: 'property' | 'tenant' | 'unit' | 'action' | 'page';
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon?: React.ReactNode;
}

const quickActions: SearchResult[] = [
  { type: 'action', id: 'new-property', title: 'Neue Liegenschaft anlegen', subtitle: 'Schnellaktion', href: '/liegenschaften/neu', icon: <Plus className="h-4 w-4 text-accent" /> },
  { type: 'action', id: 'new-tenant', title: 'Neuen Mieter anlegen', subtitle: 'Schnellaktion', href: '/mieter/neu', icon: <Plus className="h-4 w-4 text-accent" /> },
  { type: 'action', id: 'new-invoice', title: 'Vorschreibung erstellen', subtitle: 'Schnellaktion', href: '/zahlungen?tab=invoices', icon: <Receipt className="h-4 w-4 text-accent" /> },
  { type: 'action', id: 'new-maintenance', title: 'Wartungsauftrag erstellen', subtitle: 'Schnellaktion', href: '/wartungen', icon: <Wrench className="h-4 w-4 text-accent" /> },
];

const pages: SearchResult[] = [
  { type: 'page', id: 'p-dashboard', title: 'Dashboard', subtitle: 'Übersicht & KPIs', href: '/dashboard', icon: <BarChart3 className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-properties', title: 'Liegenschaften', subtitle: 'Immobilien verwalten', href: '/liegenschaften', icon: <Building2 className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-tenants', title: 'Mieter', subtitle: 'Mieterverwaltung', href: '/mieter', icon: <Users className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-units', title: 'Einheiten', subtitle: 'Alle Einheiten', href: '/einheiten', icon: <Home className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-payments', title: 'Zahlungen & Vorschreibungen', subtitle: 'Finanzen', href: '/zahlungen', icon: <CreditCard className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-costs', title: 'Kosten', subtitle: 'Ausgaben verwalten', href: '/kosten', icon: <Receipt className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-settlement', title: 'BK-Abrechnung', subtitle: 'Betriebskostenabrechnung', href: '/abrechnung', icon: <Calculator className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-banking', title: 'Buchhaltung', subtitle: 'Bankkonten & Transaktionen', href: '/buchhaltung', icon: <CreditCard className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-accounting', title: 'Finanzbuchhaltung', subtitle: 'Journal & Kontenplan', href: '/finanzbuchhaltung', icon: <FileText className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-maintenance', title: 'Wartung & Instandhaltung', subtitle: 'Aufgaben & Handwerker', href: '/wartungen', icon: <Wrench className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-documents', title: 'Dokumente', subtitle: 'Dokumentenverwaltung', href: '/dokumente', icon: <FileBox className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-deadlines', title: 'Fristen', subtitle: 'Fristenkalender', href: '/fristen', icon: <Calendar className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-reports', title: 'Reports', subtitle: 'Berichte & Auswertungen', href: '/reports', icon: <BarChart3 className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-insurance', title: 'Versicherungen', subtitle: 'Polizzen & Schäden', href: '/versicherungen', icon: <Shield className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-meters', title: 'Zähler', subtitle: 'Zählerstände & Verbrauch', href: '/zaehler', icon: <Zap className="h-4 w-4 text-primary" /> },
  { type: 'page', id: 'p-settings', title: 'Einstellungen', subtitle: 'Konfiguration', href: '/einstellungen', icon: <Settings className="h-4 w-4 text-primary" /> },
];

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const { data: units = [] } = useUnits();

  const results = useMemo<SearchResult[]>(() => {
    if (!query || query.length < 1) {
      // Show quick actions and popular pages when no query
      return [...quickActions, ...pages.slice(0, 6)];
    }
    const q = query.toLowerCase();
    const out: SearchResult[] = [];

    // Quick actions matching
    for (const a of quickActions) {
      if (a.title.toLowerCase().includes(q)) out.push(a);
    }

    // Pages matching
    for (const p of pages) {
      if (p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)) out.push(p);
    }

    // Properties
    for (const p of properties) {
      if (
        p.name?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q)
      ) {
        out.push({
          type: 'property',
          id: p.id,
          title: p.name,
          subtitle: `${p.address || ''}, ${p.city || ''}`,
          href: `/liegenschaften/${p.id}`,
        });
      }
    }

    // Tenants
    for (const t of tenants as any[]) {
      const name = `${t.first_name} ${t.last_name}`;
      if (
        name.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
      ) {
        out.push({
          type: 'tenant',
          id: t.id,
          title: name,
          subtitle: t.email || t.status || '',
          href: `/mieter/${t.id}`,
        });
      }
    }

    // Units
    for (const u of units as any[]) {
      const label = u.top_nummer || u.bezeichnung || '';
      if (label.toLowerCase().includes(q)) {
        const prop = properties.find(p => p.id === u.property_id);
        out.push({
          type: 'unit',
          id: u.id,
          title: `Top ${label}`,
          subtitle: prop?.name || '',
          href: `/einheiten/${u.id}`,
        });
      }
    }

    return out.slice(0, 25);
  }, [query, properties, tenants, units]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const handleSelect = useCallback((result: SearchResult) => {
    onOpenChange(false);
    navigate(result.href);
  }, [navigate, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  }, [results, selectedIndex, handleSelect]);

  const typeIcon = (result: SearchResult) => {
    if (result.icon) return result.icon;
    switch (result.type) {
      case 'property': return <Building2 className="h-4 w-4 text-primary" />;
      case 'tenant': return <Users className="h-4 w-4 text-primary" />;
      case 'unit': return <Home className="h-4 w-4 text-primary" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const typeLabel = (result: SearchResult) => {
    switch (result.type) {
      case 'property': return 'Liegenschaft';
      case 'tenant': return 'Mieter';
      case 'unit': return 'Einheit';
      case 'action': return 'Aktion';
      case 'page': return 'Seite';
      default: return '';
    }
  };

  // Group results
  const groupedResults = useMemo(() => {
    const groups: { label: string; items: (SearchResult & { globalIndex: number })[] }[] = [];
    const actions = results.filter(r => r.type === 'action').map((r, i) => ({ ...r, globalIndex: results.indexOf(r) }));
    const pageResults = results.filter(r => r.type === 'page').map((r) => ({ ...r, globalIndex: results.indexOf(r) }));
    const dataResults = results.filter(r => r.type !== 'action' && r.type !== 'page').map((r) => ({ ...r, globalIndex: results.indexOf(r) }));

    if (actions.length > 0) groups.push({ label: '⚡ Schnellaktionen', items: actions });
    if (dataResults.length > 0) groups.push({ label: '🔍 Ergebnisse', items: dataResults });
    if (pageResults.length > 0) groups.push({ label: '📄 Seiten', items: pageResults });
    return groups;
  }, [results]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <div className="flex items-center border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suchen oder Aktion ausführen..."
            className="border-0 focus-visible:ring-0 shadow-none text-base h-12"
            autoFocus
          />
          <kbd className="hidden sm:inline-block text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-2">ESC</kbd>
        </div>

        <div className="max-h-[450px] overflow-y-auto">
          {groupedResults.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Keine Ergebnisse für „{query}"
            </div>
          ) : (
            groupedResults.map(group => (
              <div key={group.label}>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  {group.label}
                </div>
                {group.items.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors',
                      result.globalIndex === selectedIndex && 'bg-primary/5 border-l-2 border-primary'
                    )}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(result.globalIndex)}
                  >
                    {typeIcon(result)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {typeLabel(result)}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex gap-3">
            <span><kbd className="px-1 py-0.5 bg-muted rounded">↑↓</kbd> Navigation</span>
            <span><kbd className="px-1 py-0.5 bg-muted rounded">↵</kbd> Öffnen</span>
            <span><kbd className="px-1 py-0.5 bg-muted rounded">ESC</kbd> Schließen</span>
          </div>
          <span>{results.length} Treffer</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
