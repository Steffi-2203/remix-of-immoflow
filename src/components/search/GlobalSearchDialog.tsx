import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Users, Home, FileText, ArrowRight } from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { useTenants } from '@/hooks/useTenants';
import { useUnits } from '@/hooks/useUnits';
import { cn } from '@/lib/utils';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  type: 'property' | 'tenant' | 'unit';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();
  const { data: units = [] } = useUnits();

  const results = useMemo<SearchResult[]>(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const out: SearchResult[] = [];

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

    return out.slice(0, 20);
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

  const typeIcon = (type: string) => {
    switch (type) {
      case 'property': return <Building2 className="h-4 w-4 text-primary" />;
      case 'tenant': return <Users className="h-4 w-4 text-primary" />;
      case 'unit': return <Home className="h-4 w-4 text-primary" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'property': return 'Liegenschaft';
      case 'tenant': return 'Mieter';
      case 'unit': return 'Einheit';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg">
        <div className="flex items-center border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mieter, Liegenschaft oder Einheit suchen..."
            className="border-0 focus-visible:ring-0 shadow-none text-base h-12"
            autoFocus
          />
          <kbd className="hidden sm:inline-block text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground ml-2">ESC</kbd>
        </div>

        {query.length >= 2 && (
          <div className="max-h-[400px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Keine Ergebnisse für „{query}"
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, i) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors',
                      i === selectedIndex && 'bg-muted/70'
                    )}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    {typeIcon(result.type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{result.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {typeLabel(result.type)}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {query.length < 2 && (
          <div className="p-6 text-center text-muted-foreground text-sm">
            <p>Mindestens 2 Zeichen eingeben</p>
            <p className="text-xs mt-1">Durchsucht Liegenschaften, Mieter und Einheiten</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
