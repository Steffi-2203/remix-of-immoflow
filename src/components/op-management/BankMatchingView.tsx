import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, X, Zap, ArrowRight } from 'lucide-react';

const fmt = (v: number) => v.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

interface MatchSuggestion {
  transactionId: string;
  invoiceId: string;
  tenantName: string;
  txAmount: number;
  txDate: string;
  txCounterpart: string | null;
  invoiceAmount: number;
  invoiceMonth: number;
  invoiceYear: number;
  confidence: number;
  reason: string;
}

export function BankMatchingView() {
  const queryClient = useQueryClient();

  const { data: unmatchedTxns, isLoading: txnLoading } = useQuery({
    queryKey: ['unmatched_credit_txns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, amount, transaction_date, counterpart_name, description')
        .is('tenant_id', null)
        .gt('amount', 0)
        .order('transaction_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: openInvoices, isLoading: invLoading } = useQuery({
    queryKey: ['open_invoices_for_matching'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_invoices')
        .select(`
          id, tenant_id, gesamtbetrag, paid_amount, status, faellig_am, month, year,
          tenants!inner(first_name, last_name)
        `)
        .in('status', ['offen', 'teilbezahlt'])
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const suggestions = useMemo((): MatchSuggestion[] => {
    if (!unmatchedTxns || !openInvoices) return [];
    const results: MatchSuggestion[] = [];

    for (const txn of unmatchedTxns) {
      const txAmount = Number(txn.amount);

      for (const inv of openInvoices as any[]) {
        const remaining = Number(inv.gesamtbetrag) - Number(inv.paid_amount || 0);
        if (remaining <= 0) continue;

        const amountDiff = Math.abs(txAmount - remaining);
        const amountMatch = amountDiff < 0.01;
        const closeMatch = amountDiff / remaining < 0.05;

        if (!amountMatch && !closeMatch) continue;

        // Date proximity check (within 30 days of due date)
        const txDate = new Date(txn.transaction_date);
        const dueDate = new Date(inv.faellig_am);
        const daysDiff = Math.abs(Math.floor((txDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        if (daysDiff > 30) continue;

        // Name matching
        const tenantName = `${inv.tenants?.first_name} ${inv.tenants?.last_name}`;
        const nameMatch = txn.counterpart_name?.toLowerCase().includes(inv.tenants?.last_name?.toLowerCase() || '___none___');

        let confidence = 0;
        const reasons: string[] = [];

        if (amountMatch) { confidence += 0.5; reasons.push('Exakter Betrag'); }
        else if (closeMatch) { confidence += 0.3; reasons.push('Ähnlicher Betrag'); }

        if (daysDiff <= 3) { confidence += 0.25; reasons.push('Datum passt'); }
        else if (daysDiff <= 14) { confidence += 0.15; reasons.push('Datum nah'); }

        if (nameMatch) { confidence += 0.25; reasons.push('Name erkannt'); }

        if (confidence >= 0.4) {
          results.push({
            transactionId: txn.id,
            invoiceId: inv.id,
            tenantName,
            txAmount,
            txDate: txn.transaction_date,
            txCounterpart: txn.counterpart_name,
            invoiceAmount: remaining,
            invoiceMonth: inv.month,
            invoiceYear: inv.year,
            confidence: Math.min(confidence, 1),
            reason: reasons.join(' · '),
          });
        }
      }
    }

    results.sort((a, b) => b.confidence - a.confidence);
    return results.slice(0, 50);
  }, [unmatchedTxns, openInvoices]);

  const linkMutation = useMutation({
    mutationFn: async ({ transactionId, invoiceId, tenantId }: { transactionId: string; invoiceId: string; tenantId: string }) => {
      // Link transaction to tenant
      const { error: txnErr } = await supabase
        .from('transactions')
        .update({ tenant_id: tenantId })
        .eq('id', transactionId);
      if (txnErr) throw txnErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unmatched_credit_txns'] });
      queryClient.invalidateQueries({ queryKey: ['open_invoices_for_matching'] });
      queryClient.invalidateQueries({ queryKey: ['open_items_list'] });
      queryClient.invalidateQueries({ queryKey: ['open_invoices_summary'] });
      toast.success('Zuordnung erfolgreich');
    },
    onError: () => toast.error('Fehler bei der Zuordnung'),
  });

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visibleSuggestions = suggestions.filter(s => !dismissed.has(`${s.transactionId}-${s.invoiceId}`));

  const isLoading = txnLoading || invLoading;

  if (isLoading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="py-3 flex justify-between items-center">
          <div className="text-sm">
            <span className="text-muted-foreground">{(unmatchedTxns || []).length} unzugeordnete Bankbewegungen</span>
            <span className="mx-2">·</span>
            <span className="font-medium">{visibleSuggestions.length} Match-Vorschläge</span>
          </div>
          {visibleSuggestions.length > 0 && (
            <Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3" /> Auto-Matching aktiv</Badge>
          )}
        </CardContent>
      </Card>

      {visibleSuggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <p className="text-lg font-medium">Keine offenen Zuordnungen</p>
            <p className="text-sm text-muted-foreground">Alle Bankbewegungen sind zugeordnet oder es gibt keine passenden Vorschläge.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleSuggestions.map(suggestion => {
            const key = `${suggestion.transactionId}-${suggestion.invoiceId}`;
            const confidenceColor = suggestion.confidence >= 0.7 ? 'text-green-600' : suggestion.confidence >= 0.5 ? 'text-amber-600' : 'text-muted-foreground';
            const confidencePct = Math.round(suggestion.confidence * 100);

            return (
              <Card key={key} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Bank Transaction */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Bankbewegung</p>
                      <p className="text-sm font-medium truncate">{suggestion.txCounterpart || 'Unbekannt'}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="font-mono text-xs">{fmt(suggestion.txAmount)}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(suggestion.txDate).toLocaleDateString('de-AT')}</span>
                      </div>
                    </div>

                    {/* Arrow + Confidence */}
                    <div className="flex flex-col items-center shrink-0">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      <span className={`text-xs font-bold ${confidenceColor}`}>{confidencePct}%</span>
                    </div>

                    {/* Invoice */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Rechnung</p>
                      <p className="text-sm font-medium truncate">{suggestion.tenantName}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="font-mono text-xs">{fmt(suggestion.invoiceAmount)}</Badge>
                        <span className="text-xs text-muted-foreground">{suggestion.invoiceMonth}/{suggestion.invoiceYear}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          const inv = (openInvoices as any[])?.find(i => i.id === suggestion.invoiceId);
                          if (inv) {
                            linkMutation.mutate({
                              transactionId: suggestion.transactionId,
                              invoiceId: suggestion.invoiceId,
                              tenantId: inv.tenant_id,
                            });
                          }
                        }}
                        disabled={linkMutation.isPending}
                        className="gap-1"
                      >
                        <Check className="h-3 w-3" /> Zuordnen
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDismissed(prev => new Set([...prev, key]))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{suggestion.reason}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
