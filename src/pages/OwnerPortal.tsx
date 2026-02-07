import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, PiggyBank, FileText, Vote, Euro, TrendingUp,
  Download, Calendar, CheckCircle, Clock, AlertTriangle
} from 'lucide-react';
import { useProperties } from '@/hooks/useProperties';
import { usePropertyOwners } from '@/hooks/usePropertyOwners';
import { useReserveFund } from '@/hooks/useWeg';
import { useWegBusinessPlans } from '@/hooks/useWegBusinessPlan';
import { useWegAssemblies, useWegVotes } from '@/hooks/useWeg';
import { useInvoices } from '@/hooks/useInvoices';

function fmt(n: number) {
  return `€ ${n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function OwnerReserveFund({ propertyId }: { propertyId: string }) {
  const { data: entries = [], isLoading } = useReserveFund(propertyId);
  
  const balance = entries.reduce((sum, e) => sum + (e.entry_type === 'einzahlung' ? e.amount : -e.amount), 0);

  if (isLoading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <PiggyBank className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aktueller Rücklagenstand</p>
              <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {fmt(balance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Letzte Bewegungen</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.slice(0, 20).map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{e.month}/{e.year}</TableCell>
                    <TableCell>{e.description || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={e.entry_type === 'einzahlung' ? 'default' : 'destructive'}>
                        {e.entry_type === 'einzahlung' ? 'Einzahlung' : 'Entnahme'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${e.entry_type === 'einzahlung' ? 'text-green-600' : 'text-destructive'}`}>
                      {e.entry_type === 'einzahlung' ? '+' : '-'}{fmt(e.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OwnerAssemblies({ propertyId }: { propertyId: string }) {
  const { data: assemblies = [], isLoading } = useWegAssemblies(propertyId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: votes = [] } = useWegVotes(selectedId || undefined);

  if (isLoading) return <Skeleton className="h-32" />;
  if (assemblies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
          Keine Eigentümerversammlungen vorhanden.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {assemblies.map(a => (
        <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(a.id === selectedId ? null : a.id)}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(a.assembly_date).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  {a.location && ` · ${a.location}`}
                </p>
              </div>
              <Badge variant={a.status === 'protokolliert' ? 'default' : 'secondary'}>
                {a.status === 'protokolliert' ? 'Protokolliert' : a.status === 'durchgefuehrt' ? 'Durchgeführt' : 'Geplant'}
              </Badge>
            </div>

            {selectedId === a.id && votes.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Beschlüsse</h4>
                <div className="space-y-2">
                  {votes.map(v => (
                    <div key={v.id} className="flex items-center justify-between p-2 rounded bg-muted text-sm">
                      <span>{v.topic}</span>
                      {v.result && (
                        <Badge variant={v.result === 'angenommen' ? 'default' : 'secondary'}>
                          {v.result === 'angenommen' ? '✓ Angenommen' : v.result === 'abgelehnt' ? '✗ Abgelehnt' : 'Vertagt'}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OwnerBusinessPlans({ propertyId }: { propertyId: string }) {
  const { data: plans = [], isLoading } = useWegBusinessPlans(propertyId);

  if (isLoading) return <Skeleton className="h-32" />;
  if (plans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          Keine Wirtschaftspläne vorhanden.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {plans.map(plan => (
        <Card key={plan.id}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{plan.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Gültig ab {new Date(plan.effective_date).toLocaleDateString('de-AT')} · Gesamt: {fmt(plan.total_amount)}
                </p>
              </div>
              <Badge variant={plan.status === 'aktiv' ? 'default' : 'secondary'}>
                {plan.status === 'aktiv' ? 'Aktiv' : plan.status === 'beschlossen' ? 'Beschlossen' : 'Entwurf'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function OwnerPortal() {
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const { data: properties = [], isLoading: propertiesLoading } = useProperties();

  return (
    <MainLayout title="Eigentümer-Portal" subtitle="Self-Service für Eigentümer">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Eigentümer-Portal
            </h1>
            <p className="text-muted-foreground">
              Abrechnungen, Rücklagenstand und Beschlüsse einsehen
            </p>
          </div>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Liegenschaft wählen..." />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedPropertyId ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Liegenschaft auswählen</h3>
              <p>Wählen Sie oben eine Liegenschaft aus, um Ihre Abrechnungen und Beschlüsse einzusehen.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="reserve">
            <TabsList>
              <TabsTrigger value="reserve">
                <PiggyBank className="h-4 w-4 mr-1" />
                Rücklage
              </TabsTrigger>
              <TabsTrigger value="plans">
                <FileText className="h-4 w-4 mr-1" />
                Wirtschaftspläne
              </TabsTrigger>
              <TabsTrigger value="assemblies">
                <Vote className="h-4 w-4 mr-1" />
                Versammlungen & Beschlüsse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reserve">
              <OwnerReserveFund propertyId={selectedPropertyId} />
            </TabsContent>

            <TabsContent value="plans">
              <OwnerBusinessPlans propertyId={selectedPropertyId} />
            </TabsContent>

            <TabsContent value="assemblies">
              <OwnerAssemblies propertyId={selectedPropertyId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </MainLayout>
  );
}
