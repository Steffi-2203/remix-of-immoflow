import { useState } from 'react';
import { useDemoJournalEntries } from '@/hooks/useDemoAccounting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateJournalEntryDialog } from './CreateJournalEntryDialog';

const sourceTypeLabels: Record<string, string> = {
  invoice: 'Vorschreibung',
  payment: 'Zahlung',
  expense: 'Ausgabe',
  manual: 'Manuell',
  settlement: 'Abrechnung',
  deposit: 'Kaution',
  adjustment: 'Korrektur',
};

export function JournalView() {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);

  const { data: entries, isLoading } = useDemoJournalEntries(
    sourceFilter !== 'all' ? { sourceType: sourceFilter } : undefined
  );

  const filtered = (entries || []).filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.booking_number.toLowerCase().includes(s) ||
      e.description.toLowerCase().includes(s) ||
      e.beleg_nummer?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buchungsnr., Beschreibung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Alle Typen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {Object.entries(sourceTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <span className="text-lg leading-none">+</span>
          Manuelle Buchung
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Buchungsjournal</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Keine Buchungen vorhanden. Buchungen werden automatisch bei Vorschreibungen, Zahlungen und Ausgaben erstellt.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Beleg-Nr.</TableHead>
                    <TableHead className="w-[100px]">Datum</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="w-[100px]">Typ</TableHead>
                    <TableHead>Konten</TableHead>
                    <TableHead className="text-right w-[100px]">Soll</TableHead>
                    <TableHead className="text-right w-[100px]">Haben</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => {
                    const lines = entry.journal_entry_lines || [];
                    const totalDebit = lines.reduce((s, l) => s + Number(l.debit), 0);
                    const totalCredit = lines.reduce((s, l) => s + Number(l.credit), 0);

                    return (
                      <TableRow key={entry.id} className={entry.is_storno ? 'opacity-50 line-through' : ''}>
                        <TableCell className="font-mono text-xs">{entry.booking_number}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(entry.entry_date), 'dd.MM.yyyy', { locale: de })}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{entry.description}</div>
                          {entry.properties && (
                            <div className="text-xs text-muted-foreground">{(entry.properties as any).name}</div>
                          )}
                          {entry.tenants && (
                            <div className="text-xs text-muted-foreground">
                              {(entry.tenants as any).first_name} {(entry.tenants as any).last_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {sourceTypeLabels[entry.source_type || 'manual'] || entry.source_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {lines.map((line) => (
                              <div key={line.id} className="text-xs flex gap-2">
                                <span className="font-mono text-muted-foreground">
                                  {line.account?.account_number}
                                </span>
                                <span>{line.account?.name}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {totalDebit > 0 ? totalDebit.toLocaleString('de-AT', { minimumFractionDigits: 2 }) + ' €' : '–'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {totalCredit > 0 ? totalCredit.toLocaleString('de-AT', { minimumFractionDigits: 2 }) + ' €' : '–'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateJournalEntryDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
