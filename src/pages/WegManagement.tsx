import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, PiggyBank, Vote, Loader2, Calendar, FileSpreadsheet, ArrowRightLeft } from 'lucide-react';
import { useWegAssemblies, useCreateWegAssembly, useUpdateWegAssembly, useWegVotes, useCreateWegVote, useReserveFund, useCreateReserveFundEntry } from '@/hooks/useWeg';
import { useWegBusinessPlans, statusLabels as planStatusLabels } from '@/hooks/useWegBusinessPlan';
import { useOwnershipTransfers, transferStatusLabels, legalReasonLabels } from '@/hooks/useOwnershipTransfer';
import { useProperties } from '@/hooks/useProperties';
import { useOrganization } from '@/hooks/useOrganization';
import { BusinessPlanDialog } from '@/components/weg/BusinessPlanDialog';
import { OwnershipTransferWizard } from '@/components/weg/OwnershipTransferWizard';

const statusLabels: Record<string, string> = { geplant: 'Geplant', durchgefuehrt: 'Durchgeführt', protokolliert: 'Protokolliert' };
const statusStyles: Record<string, string> = { geplant: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', durchgefuehrt: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', protokolliert: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
const voteResultLabels: Record<string, string> = { angenommen: 'Angenommen', abgelehnt: 'Abgelehnt', vertagt: 'Vertagt' };

function fmt(amount: number) { return `€ ${amount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}`; }

export default function WegManagement() {
  const [assemblyDialogOpen, setAssemblyDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [reserveDialogOpen, setReserveDialogOpen] = useState(false);
  const [businessPlanDialogOpen, setBusinessPlanDialogOpen] = useState(false);
  const [transferWizardOpen, setTransferWizardOpen] = useState(false);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

  // Assembly form
  const [aTitle, setATitle] = useState('');
  const [aDate, setADate] = useState('');
  const [aLocation, setALocation] = useState('');
  const [aPropId, setAPropId] = useState('');

  // Vote form
  const [vTopic, setVTopic] = useState('');
  const [vDesc, setVDesc] = useState('');
  const [vYes, setVYes] = useState('0');
  const [vNo, setVNo] = useState('0');
  const [vAbstain, setVAbstain] = useState('0');
  const [vResult, setVResult] = useState<string>('');

  // Reserve form
  const [rPropId, setRPropId] = useState('');
  const [rYear, setRYear] = useState(String(new Date().getFullYear()));
  const [rMonth, setRMonth] = useState(String(new Date().getMonth() + 1));
  const [rAmount, setRAmount] = useState('');
  const [rDesc, setRDesc] = useState('');
  const [rType, setRType] = useState('einzahlung');

  const { data: properties = [] } = useProperties();
  const { data: organization } = useOrganization();
  const { data: assemblies = [], isLoading: loadingAssemblies } = useWegAssemblies(selectedPropertyId || undefined);
  const { data: votes = [] } = useWegVotes(selectedAssemblyId || undefined);
  const { data: reserveEntries = [], isLoading: loadingReserve } = useReserveFund(selectedPropertyId || undefined);

  const createAssembly = useCreateWegAssembly();
  const updateAssembly = useUpdateWegAssembly();
  const createVote = useCreateWegVote();
  const createReserve = useCreateReserveFundEntry();

  const { data: businessPlans = [], isLoading: loadingPlans } = useWegBusinessPlans(selectedPropertyId || undefined);
  const { data: transfers = [], isLoading: loadingTransfers } = useOwnershipTransfers(selectedPropertyId || undefined);

  const handleCreateAssembly = async () => {
    await createAssembly.mutateAsync({
      organization_id: organization?.id || null,
      property_id: aPropId,
      title: aTitle,
      assembly_date: aDate,
      location: aLocation || null,
      protocol_url: null,
      status: 'geplant',
      notes: null,
    });
    setAssemblyDialogOpen(false);
    setATitle(''); setADate(''); setALocation('');
  };

  const handleCreateVote = async () => {
    if (!selectedAssemblyId) return;
    await createVote.mutateAsync({
      assembly_id: selectedAssemblyId,
      topic: vTopic,
      description: vDesc || null,
      votes_yes: parseInt(vYes) || 0,
      votes_no: parseInt(vNo) || 0,
      votes_abstain: parseInt(vAbstain) || 0,
      result: (vResult as any) || null,
    });
    setVoteDialogOpen(false);
    setVTopic(''); setVDesc(''); setVYes('0'); setVNo('0'); setVAbstain('0'); setVResult('');
  };

  const handleCreateReserve = async () => {
    await createReserve.mutateAsync({
      organization_id: organization?.id || null,
      property_id: rPropId,
      year: parseInt(rYear),
      month: parseInt(rMonth),
      amount: parseFloat(rAmount.replace(',', '.')) || 0,
      description: rDesc || null,
      entry_type: rType as 'einzahlung' | 'entnahme',
    });
    setReserveDialogOpen(false);
    setRAmount(''); setRDesc('');
  };

  const reserveBalance = reserveEntries.reduce((sum, e) => sum + (e.entry_type === 'einzahlung' ? e.amount : -e.amount), 0);

  return (
    <MainLayout title="WEG-Verwaltung" subtitle="Wohnungseigentum verwalten">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">WEG-Verwaltung</h1>
            <p className="text-muted-foreground">Eigentümerversammlungen, Abstimmungen & Instandhaltungsrücklage</p>
          </div>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Liegenschaft wählen..." /></SelectTrigger>
            <SelectContent>
              {properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="assemblies">
          <TabsList>
            <TabsTrigger value="assemblies"><Users className="h-4 w-4 mr-1" /> Versammlungen</TabsTrigger>
            <TabsTrigger value="businessplan"><FileSpreadsheet className="h-4 w-4 mr-1" /> Wirtschaftsplan</TabsTrigger>
            <TabsTrigger value="reserve"><PiggyBank className="h-4 w-4 mr-1" /> Rücklage</TabsTrigger>
            <TabsTrigger value="transfers"><ArrowRightLeft className="h-4 w-4 mr-1" /> Eigentümerwechsel</TabsTrigger>
          </TabsList>

          <TabsContent value="assemblies" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setAPropId(selectedPropertyId); setAssemblyDialogOpen(true); }} disabled={!selectedPropertyId}>
                <Plus className="h-4 w-4 mr-2" /> Neue Versammlung
              </Button>
            </div>

            {loadingAssemblies ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : assemblies.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{selectedPropertyId ? 'Noch keine Eigentümerversammlungen.' : 'Bitte wählen Sie eine Liegenschaft.'}</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                {assemblies.map(a => (
                  <Card key={a.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {a.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge className={statusStyles[a.status]}>{statusLabels[a.status]}</Badge>
                          {a.status === 'geplant' && (
                            <Button variant="outline" size="sm" onClick={() => updateAssembly.mutate({ id: a.id, status: 'durchgefuehrt' } as any)}>
                              Als durchgeführt markieren
                            </Button>
                          )}
                          {a.status === 'durchgefuehrt' && (
                            <Button variant="outline" size="sm" onClick={() => updateAssembly.mutate({ id: a.id, status: 'protokolliert' } as any)}>
                              Protokolliert
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                        <span>{new Date(a.assembly_date).toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {a.location && <span>📍 {a.location}</span>}
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">Abstimmungen</h4>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedAssemblyId(a.id); setVoteDialogOpen(true); }}>
                          <Plus className="h-3 w-3 mr-1" /> Abstimmung
                        </Button>
                      </div>

                      {selectedAssemblyId === a.id && votes.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Thema</TableHead>
                              <TableHead className="text-center">Ja</TableHead>
                              <TableHead className="text-center">Nein</TableHead>
                              <TableHead className="text-center">Enthaltung</TableHead>
                              <TableHead>Ergebnis</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {votes.map(v => (
                              <TableRow key={v.id}>
                                <TableCell className="font-medium">{v.topic}</TableCell>
                                <TableCell className="text-center text-green-600">{v.votes_yes}</TableCell>
                                <TableCell className="text-center text-destructive">{v.votes_no}</TableCell>
                                <TableCell className="text-center text-muted-foreground">{v.votes_abstain}</TableCell>
                                <TableCell>
                                  {v.result ? <Badge variant={v.result === 'angenommen' ? 'default' : 'secondary'}>{voteResultLabels[v.result]}</Badge> : '—'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-xs text-muted-foreground cursor-pointer hover:underline" onClick={() => setSelectedAssemblyId(a.id)}>
                          Klicken um Abstimmungen zu laden
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reserve" className="space-y-4">
            <div className="flex items-center justify-between">
              <Card className="flex-1 mr-4">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Aktuelle Instandhaltungsrücklage</p>
                  <p className={`text-3xl font-bold ${reserveBalance >= 0 ? 'text-green-600' : 'text-destructive'}`}>{fmt(reserveBalance)}</p>
                </CardContent>
              </Card>
              <Button onClick={() => { setRPropId(selectedPropertyId); setReserveDialogOpen(true); }} disabled={!selectedPropertyId}>
                <Plus className="h-4 w-4 mr-2" /> Buchung
              </Button>
            </div>

            {loadingReserve ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : reserveEntries.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Noch keine Rücklagebuchungen vorhanden.</CardContent></Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Monat</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reserveEntries.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>{e.month}/{e.year}</TableCell>
                      <TableCell>{e.description || '—'}</TableCell>
                      <TableCell><Badge variant={e.entry_type === 'einzahlung' ? 'default' : 'destructive'}>{e.entry_type === 'einzahlung' ? 'Einzahlung' : 'Entnahme'}</Badge></TableCell>
                      <TableCell className={`text-right font-medium ${e.entry_type === 'einzahlung' ? 'text-green-600' : 'text-destructive'}`}>
                        {e.entry_type === 'einzahlung' ? '+' : '-'}{fmt(e.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Business Plan Tab */}
          <TabsContent value="businessplan" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setSelectedPlan(null); setBusinessPlanDialogOpen(true); }} disabled={!selectedPropertyId}>
                <Plus className="h-4 w-4 mr-2" /> Neuer Wirtschaftsplan
              </Button>
            </div>

            {loadingPlans ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : businessPlans.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{selectedPropertyId ? 'Noch keine Wirtschaftspläne vorhanden.' : 'Bitte wählen Sie eine Liegenschaft.'}</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {businessPlans.map((plan) => (
                  <Card key={plan.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedPlan(plan); setBusinessPlanDialogOpen(true); }}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{plan.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Gültig ab {new Date(plan.effective_date).toLocaleDateString('de-AT')} · Gesamt: {fmt(plan.total_amount)}
                          </p>
                        </div>
                        <Badge variant={plan.status === 'aktiv' ? 'default' : 'secondary'}>{planStatusLabels[plan.status]}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Ownership Transfers Tab */}
          <TabsContent value="transfers" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setTransferWizardOpen(true)} disabled={!selectedPropertyId}>
                <ArrowRightLeft className="h-4 w-4 mr-2" /> Eigentümerwechsel
              </Button>
            </div>

            {loadingTransfers ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : transfers.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{selectedPropertyId ? 'Noch keine Eigentümerwechsel.' : 'Bitte wählen Sie eine Liegenschaft.'}</p>
              </CardContent></Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Rechtsgrund</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Offene Forderungen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{new Date(t.transfer_date).toLocaleDateString('de-AT')}</TableCell>
                      <TableCell>{legalReasonLabels[t.legal_reason] || t.legal_reason}</TableCell>
                      <TableCell><Badge variant={t.status === 'abgeschlossen' ? 'default' : 'secondary'}>{transferStatusLabels[t.status]}</Badge></TableCell>
                      <TableCell className="text-right">{fmt(t.outstanding_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Business Plan Dialog */}
      {businessPlanDialogOpen && (
        <BusinessPlanDialog
          open={businessPlanDialogOpen}
          onOpenChange={setBusinessPlanDialogOpen}
          propertyId={selectedPropertyId}
          organizationId={organization?.id || null}
          existingPlan={selectedPlan || undefined}
        />
      )}

      {/* Ownership Transfer Wizard */}
      {transferWizardOpen && (
        <OwnershipTransferWizard
          open={transferWizardOpen}
          onOpenChange={setTransferWizardOpen}
          propertyId={selectedPropertyId}
          organizationId={organization?.id || null}
        />
      )}



      {/* Assembly Dialog */}
      <Dialog open={assemblyDialogOpen} onOpenChange={setAssemblyDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Eigentümerversammlung</DialogTitle><DialogDescription>Planen Sie eine neue Versammlung.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Liegenschaft</Label>
              <Select value={aPropId} onValueChange={setAPropId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Titel</Label><Input value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="z.B. Ordentliche EV 2026" /></div>
            <div className="space-y-2"><Label>Datum & Uhrzeit</Label><Input type="datetime-local" value={aDate} onChange={e => setADate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Ort</Label><Input value={aLocation} onChange={e => setALocation(e.target.value)} placeholder="z.B. Gemeinschaftsraum" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssemblyDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreateAssembly} disabled={!aTitle || !aDate || !aPropId || createAssembly.isPending}>
              {createAssembly.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Neue Abstimmung</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Thema</Label><Input value={vTopic} onChange={e => setVTopic(e.target.value)} /></div>
            <div className="space-y-2"><Label>Beschreibung</Label><Textarea value={vDesc} onChange={e => setVDesc(e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label className="text-xs">Ja-Stimmen</Label><Input type="number" value={vYes} onChange={e => setVYes(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Nein-Stimmen</Label><Input type="number" value={vNo} onChange={e => setVNo(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Enthaltungen</Label><Input type="number" value={vAbstain} onChange={e => setVAbstain(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Ergebnis</Label>
              <Select value={vResult} onValueChange={setVResult}><SelectTrigger><SelectValue placeholder="Wählen..." /></SelectTrigger><SelectContent>
                <SelectItem value="angenommen">Angenommen</SelectItem>
                <SelectItem value="abgelehnt">Abgelehnt</SelectItem>
                <SelectItem value="vertagt">Vertagt</SelectItem>
              </SelectContent></Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreateVote} disabled={!vTopic || createVote.isPending}>
              {createVote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reserve Dialog */}
      <Dialog open={reserveDialogOpen} onOpenChange={setReserveDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rücklage-Buchung</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Liegenschaft</Label>
              <Select value={rPropId} onValueChange={setRPropId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-2"><Label>Typ</Label>
              <Select value={rType} onValueChange={setRType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="einzahlung">Einzahlung</SelectItem>
                <SelectItem value="entnahme">Entnahme</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Jahr</Label><Input type="number" value={rYear} onChange={e => setRYear(e.target.value)} /></div>
              <div className="space-y-2"><Label>Monat</Label><Input type="number" min="1" max="12" value={rMonth} onChange={e => setRMonth(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Betrag (€)</Label><Input value={rAmount} onChange={e => setRAmount(e.target.value)} placeholder="0,00" /></div>
            <div className="space-y-2"><Label>Beschreibung</Label><Input value={rDesc} onChange={e => setRDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreateReserve} disabled={!rPropId || !rAmount || createReserve.isPending}>
              {createReserve.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
