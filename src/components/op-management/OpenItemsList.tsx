import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search } from 'lucide-react';

const fmt = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

type AgingBucket = 'all' | 'current' | '30' | '60' | '90';

export function OpenItemsList() {
  const [search, setSearch] = useState('');
  const [agingFilter, setAgingFilter] = useState<AgingBucket>('all');

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['open_items_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_invoices')
        .select(`
          id, tenant_id, gesamtbetrag, paid_amount, status, faellig_am, month, year,
          tenants!inner(first_name, last_name),
          units!inner(name, properties!inner(name))
        `)
        .in('status', ['offen', 'teilbezahlt', 'ueberfaellig'])
        .order('faellig_am', { ascending: true })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const now = new Date();

  const filteredItems = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((inv: any) => {
      // Search filter
      const tenantName = `${inv.tenants?.first_name} ${inv.tenants?.last_name}`.toLowerCase();
      const propertyName = (inv.units?.properties?.name || '').toLowerCase();
      if (search && !tenantName.includes(search.toLowerCase()) && !propertyName.includes(search.toLowerCase())) return false;

      // Aging filter
      if (agingFilter !== 'all') {
        const daysOverdue = Math.floor((now.getTime() - new Date(inv.faellig_am).getTime()) / (1000 * 60 * 60 * 24));
        if (agingFilter === 'current' && daysOverdue > 0) return false;
        if (agingFilter === '30' && (daysOverdue <= 0 || daysOverdue > 30)) return false;
        if (agingFilter === '60' && (daysOverdue <= 30 || daysOverdue > 60)) return false;
        if (agingFilter === '90' && daysOverdue <= 60) return false;
      }

      return true;
    });
  }, [invoices, search, agingFilter]);

  const totalRemaining = filteredItems.reduce((s: number, inv: any) => s + Number(inv.gesamtbetrag) - Number(inv.paid_amount || 0), 0);

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Mieter oder Liegenschaft suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={agingFilter} onValueChange={(v) => setAgingFilter(v as AgingBucket)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle offenen</SelectItem>
            <SelectItem value="current">Nicht fällig</SelectItem>
            <SelectItem value="30">1–30 Tage überfällig</SelectItem>
            <SelectItem value="60">31–60 Tage überfällig</SelectItem>
            <SelectItem value="90">60+ Tage überfällig</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <Card className="bg-muted/30">
        <CardContent className="py-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{filteredItems.length} offene Posten</span>
          <span className="font-bold font-mono">{fmt(totalRemaining)}</span>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mieter</TableHead>
                  <TableHead>Liegenschaft</TableHead>
                  <TableHead>Monat</TableHead>
                  <TableHead>Fällig am</TableHead>
                  <TableHead className="text-right">Gesamt</TableHead>
                  <TableHead className="text-right">Bezahlt</TableHead>
                  <TableHead className="text-right">Offen</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Keine offenen Posten gefunden
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((inv: any) => {
                    const remaining = Number(inv.gesamtbetrag) - Number(inv.paid_amount || 0);
                    const daysOverdue = Math.floor((now.getTime() - new Date(inv.faellig_am).getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysOverdue > 0;

                    return (
                      <TableRow key={inv.id} className={isOverdue ? 'bg-destructive/5' : ''}>
                        <TableCell className="font-medium text-sm">
                          {inv.tenants?.first_name} {inv.tenants?.last_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {inv.units?.properties?.name}
                        </TableCell>
                        <TableCell className="text-sm">{inv.month}/{inv.year}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(inv.faellig_am).toLocaleDateString('de-AT')}
                          {isOverdue && (
                            <span className="text-xs text-destructive ml-1">({daysOverdue}d)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(Number(inv.gesamtbetrag))}</TableCell>
                        <TableCell className="text-right font-mono text-sm text-green-600">{fmt(Number(inv.paid_amount || 0))}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-bold">{fmt(remaining)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            daysOverdue > 60 ? 'destructive' :
                            daysOverdue > 30 ? 'default' :
                            isOverdue ? 'secondary' : 'outline'
                          }>
                            {daysOverdue > 60 ? '60+ Tage' :
                             daysOverdue > 30 ? '30+ Tage' :
                             isOverdue ? 'Überfällig' :
                             inv.status === 'teilbezahlt' ? 'Teilbezahlt' : 'Offen'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
