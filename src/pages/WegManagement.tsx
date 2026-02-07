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
import {
  Plus, Users, PiggyBank, Vote, Loader2, Calendar, Building2, Gavel,
  FileText, Wrench, AlertTriangle, Trash2, MapPin, Clock, CheckCircle2,
  CircleDot, ChevronRight, Euro, Shield, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import {
  useWegUnitOwners, useCreateWegUnitOwner, useDeleteWegUnitOwner,
  useWegAssemblies, useCreateWegAssembly, useUpdateWegAssembly,
  useWegAgendaItems, useCreateWegAgendaItem, useDeleteWegAgendaItem,
  useWegVotes, useCreateWegVote,
  useWegOwnerVotes, useCreateWegOwnerVote,
  useReserveFund, useCreateReserveFundEntry,
  useWegBudgetPlans, useCreateWegBudgetPlan, useUpdateWegBudgetPlan,
  useWegBudgetLines, useCreateWegBudgetLine, useDeleteWegBudgetLine,
  useWegSpecialAssessments, useCreateWegSpecialAssessment,
  useWegMaintenance, useCreateWegMaintenance, useUpdateWegMaintenance, useDeleteWegMaintenance,
} from '@/hooks/useWeg';
import { useProperties } from '@/hooks/useProperties';
import { useOrganization } from '@/hooks/useOrganization';
import { useQuery } from '@tanstack/react-query';

function fmt(amount: number) {
  return `\u20AC ${amount.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtPct(value: number) {
  return `${value.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

const assemblyTypeLabels: Record<string, string> = {
  ordentlich: 'Ordentlich',
  ausserordentlich: 'Au\u00DFerordentlich',
  umlaufbeschluss: 'Umlaufbeschluss',
};

const assemblyStatusLabels: Record<string, string> = {
  geplant: 'Geplant',
  eingeladen: 'Eingeladen',
  durchgefuehrt: 'Durchgef\u00FChrt',
  protokolliert: 'Protokolliert',
};

const budgetStatusLabels: Record<string, string> = {
  entwurf: 'Entwurf',
  beschlossen: 'Beschlossen',
  abgeschlossen: 'Abgeschlossen',
};

const maintenanceCategoryLabels: Record<string, string> = {
  ordentliche_verwaltung: 'Ordentliche Verwaltung',
  ausserordentliche_verwaltung: 'Au\u00DFerordentliche Verwaltung',
  notmassnahme: 'Notma\u00DFnahme',
};

const priorityLabels: Record<string, string> = {
  niedrig: 'Niedrig',
  normal: 'Normal',
  hoch: 'Hoch',
  dringend: 'Dringend',
};

const maintenanceStatusLabels: Record<string, string> = {
  geplant: 'Geplant',
  beauftragt: 'Beauftragt',
  in_ausfuehrung: 'In Ausf\u00FChrung',
  abgeschlossen: 'Abgeschlossen',
};

const financingLabels: Record<string, string> = {
  ruecklage: 'R\u00FCcklage',
  sonderumlage: 'Sonderumlage',
  laufend: 'Laufend',
};

const budgetCategories = [
  'Betriebskosten', 'Heizkosten', 'Versicherung', 'Verwaltung', 'R\u00FCcklage', 'Sonstiges',
];

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    niedrig: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    hoch: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    dringend: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  };
  return <Badge className={colors[priority] || ''}>{priorityLabels[priority] || priority}</Badge>;
}

function StatusBadge({ status, labels, variant }: { status: string; labels: Record<string, string>; variant?: string }) {
  const colors: Record<string, string> = {
    geplant: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    eingeladen: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    durchgefuehrt: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    protokolliert: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    entwurf: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    beschlossen: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    abgeschlossen: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    beauftragt: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    in_ausfuehrung: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    in_einzahlung: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };
  return <Badge className={colors[status] || ''}>{labels[status] || status}</Badge>;
}

function ResultBadge({ result }: { result: string | null }) {
  if (!result) return <span className="text-muted-foreground">\u2014</span>;
  const map: Record<string, { label: string; cls: string }> = {
    angenommen: { label: 'Angenommen', cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    abgelehnt: { label: 'Abgelehnt', cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    vertagt: { label: 'Vertagt', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  };
  const entry = map[result];
  if (!entry) return <Badge>{result}</Badge>;
  return <Badge className={entry.cls}>{entry.label}</Badge>;
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{text}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSpinner() {
  return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
}

export default function WegManagement() {
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const { data: properties = [] } = useProperties();
  const { data: organization } = useOrganization();
  const orgId = organization?.id || null;

  return (
    <MainLayout title="WEG-Verwaltung" subtitle="Wohnungseigentumsverwaltung gem\u00E4\u00DF WEG 2002">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">WEG-Verwaltung</h1>
            <p className="text-muted-foreground">Eigent\u00FCmergemeinschaft, Versammlungen, Abstimmungen & Instandhaltung</p>
          </div>
          <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId} data-testid="select-property">
            <SelectTrigger className="w-[260px]" data-testid="select-property-trigger">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Liegenschaft w\u00E4hlen..." />
            </SelectTrigger>
            <SelectContent>
              {properties.map((p: any) => (
                <SelectItem key={p.id} value={p.id} data-testid={`select-property-${p.id}`}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="owners">
          <TabsList className="flex-wrap">
            <TabsTrigger value="owners" data-testid="tab-owners"><Users className="h-4 w-4 mr-1" /> Eigent\u00FCmer & MEA</TabsTrigger>
            <TabsTrigger value="assemblies" data-testid="tab-assemblies"><Calendar className="h-4 w-4 mr-1" /> Versammlungen</TabsTrigger>
            <TabsTrigger value="votes" data-testid="tab-votes"><Vote className="h-4 w-4 mr-1" /> Abstimmungen</TabsTrigger>
            <TabsTrigger value="budget" data-testid="tab-budget"><FileText className="h-4 w-4 mr-1" /> Wirtschaftsplan</TabsTrigger>
            <TabsTrigger value="reserve" data-testid="tab-reserve"><PiggyBank className="h-4 w-4 mr-1" /> R\u00FCcklage</TabsTrigger>
            <TabsTrigger value="maintenance" data-testid="tab-maintenance"><Wrench className="h-4 w-4 mr-1" /> Erhaltung</TabsTrigger>
          </TabsList>

          <TabsContent value="owners"><OwnersTab propertyId={selectedPropertyId} orgId={orgId} /></TabsContent>
          <TabsContent value="assemblies"><AssembliesTab propertyId={selectedPropertyId} orgId={orgId} properties={properties} /></TabsContent>
          <TabsContent value="votes"><VotesTab propertyId={selectedPropertyId} /></TabsContent>
          <TabsContent value="budget"><BudgetTab propertyId={selectedPropertyId} orgId={orgId} /></TabsContent>
          <TabsContent value="reserve"><ReserveTab propertyId={selectedPropertyId} orgId={orgId} properties={properties} /></TabsContent>
          <TabsContent value="maintenance"><MaintenanceTab propertyId={selectedPropertyId} orgId={orgId} /></TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function OwnersTab({ propertyId, orgId }: { propertyId: string; orgId: string | null }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unitId, setUnitId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [meaShare, setMeaShare] = useState('');
  const [nutzwert, setNutzwert] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');

  const { data: unitOwners = [], isLoading } = useWegUnitOwners(propertyId || undefined);
  const { data: units = [] } = useQuery({
    queryKey: ['/api/units', propertyId],
    queryFn: async () => {
      const res = await fetch(`/api/units?propertyId=${propertyId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!propertyId,
  });
  const { data: owners = [] } = useQuery({
    queryKey: ['/api/owners'],
    queryFn: async () => {
      const res = await fetch('/api/owners', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createOwner = useCreateWegUnitOwner();
  const deleteOwner = useDeleteWegUnitOwner();

  const totalMea = unitOwners.reduce((sum, uo) => sum + (uo.mea_share || 0), 0);
  const meaWarning = unitOwners.length > 0 && Math.abs(totalMea - 100) > 0.01;

  const handleCreate = async () => {
    await createOwner.mutateAsync({
      organization_id: orgId,
      property_id: propertyId,
      unit_id: unitId,
      owner_id: ownerId,
      mea_share: parseFloat(meaShare.replace(',', '.')) || 0,
      nutzwert: nutzwert ? parseFloat(nutzwert.replace(',', '.')) : null,
      valid_from: validFrom || null,
      valid_to: validTo || null,
      notes: null,
    });
    setDialogOpen(false);
    setUnitId(''); setOwnerId(''); setMeaShare(''); setNutzwert(''); setValidFrom(''); setValidTo('');
  };

  const getUnitName = (id: string) => {
    const u = units.find((u: any) => u.id === id);
    return u ? (u.name || u.unitNumber || id) : id;
  };
  const getOwnerName = (id: string) => {
    const o = owners.find((o: any) => o.id === id);
    return o ? (o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim() || id) : id;
  };

  if (!propertyId) return <EmptyState icon={Building2} text="Bitte w\u00E4hlen Sie eine Liegenschaft." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Card>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground">Gesamt-MEA</p>
              <p className="text-lg font-bold" data-testid="text-total-mea">{fmtPct(totalMea)}</p>
            </CardContent>
          </Card>
          {meaWarning && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" data-testid="badge-mea-warning">
              <AlertTriangle className="h-3 w-3 mr-1" /> MEA-Summe weicht von 100 % ab
            </Badge>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!propertyId} data-testid="button-add-owner">
          <Plus className="h-4 w-4 mr-2" /> Eigent\u00FCmer zuordnen
        </Button>
      </div>

      {isLoading ? <LoadingSpinner /> : unitOwners.length === 0 ? (
        <EmptyState icon={Users} text="Noch keine Eigent\u00FCmer-Zuordnungen vorhanden." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Top / Einheit</TableHead>
              <TableHead>Eigent\u00FCmer</TableHead>
              <TableHead className="text-right">MEA-Anteil</TableHead>
              <TableHead className="text-right">Nutzwert</TableHead>
              <TableHead>G\u00FCltig ab</TableHead>
              <TableHead>G\u00FCltig bis</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unitOwners.map(uo => (
              <TableRow key={uo.id} data-testid={`row-owner-${uo.id}`}>
                <TableCell className="font-medium">{getUnitName(uo.unit_id)}</TableCell>
                <TableCell>{getOwnerName(uo.owner_id)}</TableCell>
                <TableCell className="text-right">{fmtPct(uo.mea_share)}</TableCell>
                <TableCell className="text-right">{uo.nutzwert != null ? uo.nutzwert.toLocaleString('de-AT') : '\u2014'}</TableCell>
                <TableCell>{fmtDate(uo.valid_from)}</TableCell>
                <TableCell>{fmtDate(uo.valid_to)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => deleteOwner.mutate(uo.id)} data-testid={`button-delete-owner-${uo.id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eigent\u00FCmer zuordnen</DialogTitle>
            <DialogDescription>Weisen Sie einer Einheit einen Eigent\u00FCmer mit MEA-Anteil zu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Einheit</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger data-testid="select-unit"><SelectValue placeholder="Einheit w\u00E4hlen..." /></SelectTrigger>
                <SelectContent>
                  {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name || u.unitNumber || u.id}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Eigent\u00FCmer</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger data-testid="select-owner"><SelectValue placeholder="Eigent\u00FCmer w\u00E4hlen..." /></SelectTrigger>
                <SelectContent>
                  {owners.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.name || `${o.firstName || ''} ${o.lastName || ''}`.trim()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>MEA-Anteil (%)</Label>
                <Input value={meaShare} onChange={e => setMeaShare(e.target.value)} placeholder="z.B. 12,50" data-testid="input-mea-share" />
              </div>
              <div className="space-y-2">
                <Label>Nutzwert</Label>
                <Input value={nutzwert} onChange={e => setNutzwert(e.target.value)} placeholder="z.B. 45" data-testid="input-nutzwert" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>G\u00FCltig ab</Label>
                <Input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} data-testid="input-valid-from" />
              </div>
              <div className="space-y-2">
                <Label>G\u00FCltig bis</Label>
                <Input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} data-testid="input-valid-to" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-owner">Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!unitId || !ownerId || !meaShare || createOwner.isPending} data-testid="button-save-owner">
              {createOwner.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Zuordnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssembliesTab({ propertyId, orgId, properties }: { propertyId: string; orgId: string | null; properties: any[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [topDialogOpen, setTopDialogOpen] = useState(false);
  const [topAssemblyId, setTopAssemblyId] = useState('');
  const [topTitle, setTopTitle] = useState('');
  const [topDesc, setTopDesc] = useState('');
  const [topCategory, setTopCategory] = useState('allgemein');

  const [aTitle, setATitle] = useState('');
  const [aType, setAType] = useState<string>('ordentlich');
  const [aDate, setADate] = useState('');
  const [aLocation, setALocation] = useState('');
  const [aCircularDeadline, setACircularDeadline] = useState('');

  const { data: assemblies = [], isLoading } = useWegAssemblies(propertyId || undefined);
  const { data: agendaItems = [] } = useWegAgendaItems(expandedId || undefined);

  const createAssembly = useCreateWegAssembly();
  const updateAssembly = useUpdateWegAssembly();
  const createAgendaItem = useCreateWegAgendaItem();
  const deleteAgendaItem = useDeleteWegAgendaItem();

  const handleCreateAssembly = async () => {
    await createAssembly.mutateAsync({
      organization_id: orgId,
      property_id: propertyId,
      title: aTitle,
      assembly_type: aType,
      assembly_date: aDate,
      location: aLocation || null,
      is_circular_resolution: aType === 'umlaufbeschluss',
      circular_deadline: aCircularDeadline || null,
      invitation_sent_at: null,
      invitation_deadline: null,
      protocol_url: null,
      protocol_number: null,
      status: 'geplant',
      total_mea_present: null,
      total_mea_property: null,
      quorum_reached: null,
      notes: null,
    });
    setDialogOpen(false);
    setATitle(''); setAType('ordentlich'); setADate(''); setALocation(''); setACircularDeadline('');
  };

  const handleCreateTop = async () => {
    const nextNum = agendaItems.length + 1;
    await createAgendaItem.mutateAsync({
      assembly_id: topAssemblyId,
      top_number: nextNum,
      title: topTitle,
      description: topDesc || null,
      category: topCategory,
    });
    setTopDialogOpen(false);
    setTopTitle(''); setTopDesc(''); setTopCategory('allgemein');
  };

  function checkInvitationCompliance(a: any): { warning: boolean; message: string } {
    if (!a.invitation_sent_at || !a.assembly_date) return { warning: false, message: '' };
    const sent = new Date(a.invitation_sent_at);
    const assembly = new Date(a.assembly_date);
    const diffDays = (assembly.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 14) {
      return { warning: true, message: `Einladung nur ${Math.floor(diffDays)} Tage vor Versammlung (min. 14 Tage gem. \u00A7 25 Abs 2 WEG)` };
    }
    return { warning: false, message: '' };
  }

  const nextStatus: Record<string, string> = {
    geplant: 'eingeladen',
    eingeladen: 'durchgefuehrt',
    durchgefuehrt: 'protokolliert',
  };
  const nextStatusLabel: Record<string, string> = {
    geplant: 'Als eingeladen markieren',
    eingeladen: 'Als durchgef\u00FChrt markieren',
    durchgefuehrt: 'Protokolliert',
  };

  if (!propertyId) return <EmptyState icon={Building2} text="Bitte w\u00E4hlen Sie eine Liegenschaft." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} disabled={!propertyId} data-testid="button-add-assembly">
          <Plus className="h-4 w-4 mr-2" /> Neue Versammlung
        </Button>
      </div>

      {isLoading ? <LoadingSpinner /> : assemblies.length === 0 ? (
        <EmptyState icon={Calendar} text="Noch keine Eigent\u00FCmerversammlungen." />
      ) : (
        <div className="space-y-4">
          {assemblies.map(a => {
            const compliance = checkInvitationCompliance(a);
            const isExpanded = expandedId === a.id;
            return (
              <Card key={a.id} data-testid={`card-assembly-${a.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {a.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                        {assemblyTypeLabels[a.assembly_type] || a.assembly_type}
                      </Badge>
                      <StatusBadge status={a.status} labels={assemblyStatusLabels} />
                      {nextStatus[a.status] && (
                        <Button
                          variant="outline" size="sm"
                          onClick={() => updateAssembly.mutate({ id: a.id, status: nextStatus[a.status] } as any)}
                          data-testid={`button-advance-${a.id}`}
                        >
                          <ChevronRight className="h-3 w-3 mr-1" /> {nextStatusLabel[a.status]}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDate(a.assembly_date)}</span>
                    {a.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.location}</span>}
                    {a.total_mea_present != null && a.total_mea_property != null && (
                      <span className="flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Quorum: {fmtPct(a.total_mea_present)} / {fmtPct(a.total_mea_property)}
                        {a.quorum_reached != null && (
                          a.quorum_reached
                            ? <CheckCircle2 className="h-3 w-3 text-green-600" />
                            : <AlertTriangle className="h-3 w-3 text-destructive" />
                        )}
                      </span>
                    )}
                  </div>
                  {compliance.warning && (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" data-testid={`badge-invitation-warning-${a.id}`}>
                      <AlertTriangle className="h-3 w-3 mr-1" /> {compliance.message}
                    </Badge>
                  )}

                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setExpandedId(isExpanded ? null : a.id)} data-testid={`button-toggle-tops-${a.id}`}>
                      <Gavel className="h-3 w-3 mr-1" /> Tagesordnung {isExpanded ? 'ausblenden' : 'anzeigen'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setTopAssemblyId(a.id); setExpandedId(a.id); setTopDialogOpen(true); }} data-testid={`button-add-top-${a.id}`}>
                      <Plus className="h-3 w-3 mr-1" /> TOP hinzuf\u00FCgen
                    </Button>
                  </div>

                  {isExpanded && (
                    agendaItems.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">TOP</TableHead>
                            <TableHead>Titel</TableHead>
                            <TableHead>Kategorie</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {agendaItems.map(item => (
                            <TableRow key={item.id} data-testid={`row-top-${item.id}`}>
                              <TableCell className="font-medium">{item.top_number}</TableCell>
                              <TableCell>
                                {item.title}
                                {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                              </TableCell>
                              <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => deleteAgendaItem.mutate(item.id)} data-testid={`button-delete-top-${item.id}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Keine Tagesordnungspunkte vorhanden.</p>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Eigent\u00FCmerversammlung</DialogTitle>
            <DialogDescription>Planen Sie eine neue Versammlung gem\u00E4\u00DF WEG 2002.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="z.B. Ordentliche EV 2026" data-testid="input-assembly-title" />
            </div>
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={aType} onValueChange={setAType}>
                <SelectTrigger data-testid="select-assembly-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ordentlich">Ordentliche Versammlung</SelectItem>
                  <SelectItem value="ausserordentlich">Au\u00DFerordentliche Versammlung</SelectItem>
                  <SelectItem value="umlaufbeschluss">Umlaufbeschluss</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Datum & Uhrzeit</Label>
              <Input type="datetime-local" value={aDate} onChange={e => setADate(e.target.value)} data-testid="input-assembly-date" />
            </div>
            <div className="space-y-2">
              <Label>Ort</Label>
              <Input value={aLocation} onChange={e => setALocation(e.target.value)} placeholder="z.B. Gemeinschaftsraum" data-testid="input-assembly-location" />
            </div>
            {aType === 'umlaufbeschluss' && (
              <div className="space-y-2">
                <Label>R\u00FCcksendefrist (Umlaufbeschluss)</Label>
                <Input type="date" value={aCircularDeadline} onChange={e => setACircularDeadline(e.target.value)} data-testid="input-circular-deadline" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-assembly">Abbrechen</Button>
            <Button onClick={handleCreateAssembly} disabled={!aTitle || !aDate || createAssembly.isPending} data-testid="button-save-assembly">
              {createAssembly.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={topDialogOpen} onOpenChange={setTopDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tagesordnungspunkt hinzuf\u00FCgen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input value={topTitle} onChange={e => setTopTitle(e.target.value)} placeholder="z.B. Genehmigung Wirtschaftsplan" data-testid="input-top-title" />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea value={topDesc} onChange={e => setTopDesc(e.target.value)} data-testid="input-top-description" />
            </div>
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={topCategory} onValueChange={setTopCategory}>
                <SelectTrigger data-testid="select-top-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="allgemein">Allgemein</SelectItem>
                  <SelectItem value="finanzen">Finanzen</SelectItem>
                  <SelectItem value="erhaltung">Erhaltung</SelectItem>
                  <SelectItem value="verwaltung">Verwaltung</SelectItem>
                  <SelectItem value="sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopDialogOpen(false)} data-testid="button-cancel-top">Abbrechen</Button>
            <Button onClick={handleCreateTop} disabled={!topTitle || createAgendaItem.isPending} data-testid="button-save-top">
              {createAgendaItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Hinzuf\u00FCgen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VotesTab({ propertyId }: { propertyId: string }) {
  const [selectedAssemblyId, setSelectedAssemblyId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vTopic, setVTopic] = useState('');
  const [vDesc, setVDesc] = useState('');
  const [vMajority, setVMajority] = useState<string>('einfach');
  const [vYes, setVYes] = useState('0');
  const [vNo, setVNo] = useState('0');
  const [vAbstain, setVAbstain] = useState('0');
  const [vMeaYes, setVMeaYes] = useState('0');
  const [vMeaNo, setVMeaNo] = useState('0');
  const [vMeaAbstain, setVMeaAbstain] = useState('0');

  const { data: assemblies = [] } = useWegAssemblies(propertyId || undefined);
  const { data: votes = [], isLoading } = useWegVotes(selectedAssemblyId || undefined);
  const createVote = useCreateWegVote();

  const majorityLabels: Record<string, string> = {
    einfach: 'Einfache Mehrheit (>50 %)',
    qualifiziert: 'Qualifizierte Mehrheit (>66,67 %)',
    einstimmig: 'Einstimmigkeit (100 %)',
  };

  function computeResult(majority: string, meaYes: number, meaNo: number, meaAbstain: number): string | null {
    const totalMea = meaYes + meaNo + meaAbstain;
    if (totalMea === 0) return null;
    const pct = meaYes / totalMea;
    if (majority === 'einfach') return pct > 0.5 ? 'angenommen' : 'abgelehnt';
    if (majority === 'qualifiziert') return pct > 2 / 3 ? 'angenommen' : 'abgelehnt';
    if (majority === 'einstimmig') return pct >= 1.0 ? 'angenommen' : 'abgelehnt';
    return null;
  }

  const handleCreate = async () => {
    const meaY = parseFloat(vMeaYes.replace(',', '.')) || 0;
    const meaN = parseFloat(vMeaNo.replace(',', '.')) || 0;
    const meaA = parseFloat(vMeaAbstain.replace(',', '.')) || 0;
    const result = computeResult(vMajority, meaY, meaN, meaA);

    await createVote.mutateAsync({
      assembly_id: selectedAssemblyId,
      agenda_item_id: null,
      topic: vTopic,
      description: vDesc || null,
      required_majority: vMajority,
      votes_yes: parseInt(vYes) || 0,
      votes_no: parseInt(vNo) || 0,
      votes_abstain: parseInt(vAbstain) || 0,
      mea_votes_yes: meaY,
      mea_votes_no: meaN,
      mea_votes_abstain: meaA,
      total_mea: meaY + meaN + meaA,
      result,
      result_basis: 'mea',
      is_circular_vote: false,
    });
    setDialogOpen(false);
    setVTopic(''); setVDesc(''); setVMajority('einfach');
    setVYes('0'); setVNo('0'); setVAbstain('0');
    setVMeaYes('0'); setVMeaNo('0'); setVMeaAbstain('0');
  };

  if (!propertyId) return <EmptyState icon={Building2} text="Bitte w\u00E4hlen Sie eine Liegenschaft." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Select value={selectedAssemblyId} onValueChange={setSelectedAssemblyId}>
          <SelectTrigger className="w-[300px]" data-testid="select-vote-assembly">
            <SelectValue placeholder="Versammlung w\u00E4hlen..." />
          </SelectTrigger>
          <SelectContent>
            {assemblies.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.title} ({fmtDate(a.assembly_date)})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setDialogOpen(true)} disabled={!selectedAssemblyId} data-testid="button-add-vote">
          <Plus className="h-4 w-4 mr-2" /> Neue Abstimmung
        </Button>
      </div>

      {!selectedAssemblyId ? (
        <EmptyState icon={Vote} text="Bitte w\u00E4hlen Sie eine Versammlung f\u00FCr die Abstimmungen." />
      ) : isLoading ? <LoadingSpinner /> : votes.length === 0 ? (
        <EmptyState icon={Vote} text="Keine Abstimmungen f\u00FCr diese Versammlung." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thema</TableHead>
              <TableHead>Mehrheit</TableHead>
              <TableHead className="text-center">Ja (K\u00F6pfe)</TableHead>
              <TableHead className="text-center">Nein (K\u00F6pfe)</TableHead>
              <TableHead className="text-center">Enthaltung</TableHead>
              <TableHead className="text-center">MEA Ja</TableHead>
              <TableHead className="text-center">MEA Nein</TableHead>
              <TableHead className="text-center">MEA Enth.</TableHead>
              <TableHead>Ergebnis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {votes.map(v => (
              <TableRow key={v.id} data-testid={`row-vote-${v.id}`}>
                <TableCell>
                  <span className="font-medium">{v.topic}</span>
                  {v.description && <p className="text-xs text-muted-foreground mt-1">{v.description}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{majorityLabels[v.required_majority] || v.required_majority}</Badge>
                </TableCell>
                <TableCell className="text-center text-green-600 dark:text-green-400">{v.votes_yes}</TableCell>
                <TableCell className="text-center text-destructive">{v.votes_no}</TableCell>
                <TableCell className="text-center text-muted-foreground">{v.votes_abstain}</TableCell>
                <TableCell className="text-center text-green-600 dark:text-green-400">{fmtPct(v.mea_votes_yes)}</TableCell>
                <TableCell className="text-center text-destructive">{fmtPct(v.mea_votes_no)}</TableCell>
                <TableCell className="text-center text-muted-foreground">{fmtPct(v.mea_votes_abstain)}</TableCell>
                <TableCell><ResultBadge result={v.result} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Abstimmung</DialogTitle>
            <DialogDescription>Erfassen Sie eine Abstimmung mit K\u00F6pfe- und MEA-Ergebnis.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Thema</Label>
              <Input value={vTopic} onChange={e => setVTopic(e.target.value)} data-testid="input-vote-topic" />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea value={vDesc} onChange={e => setVDesc(e.target.value)} data-testid="input-vote-description" />
            </div>
            <div className="space-y-2">
              <Label>Erforderliche Mehrheit</Label>
              <Select value={vMajority} onValueChange={setVMajority}>
                <SelectTrigger data-testid="select-vote-majority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="einfach">Einfache Mehrheit (&gt;50 %)</SelectItem>
                  <SelectItem value="qualifiziert">Qualifizierte Mehrheit (&gt;66,67 %)</SelectItem>
                  <SelectItem value="einstimmig">Einstimmigkeit (100 %)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Abstimmung nach K\u00F6pfen</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Ja</Label><Input type="number" value={vYes} onChange={e => setVYes(e.target.value)} data-testid="input-head-yes" /></div>
                <div className="space-y-1"><Label className="text-xs">Nein</Label><Input type="number" value={vNo} onChange={e => setVNo(e.target.value)} data-testid="input-head-no" /></div>
                <div className="space-y-1"><Label className="text-xs">Enthaltung</Label><Input type="number" value={vAbstain} onChange={e => setVAbstain(e.target.value)} data-testid="input-head-abstain" /></div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Abstimmung nach MEA-Anteilen (%)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Ja (MEA)</Label><Input value={vMeaYes} onChange={e => setVMeaYes(e.target.value)} data-testid="input-mea-yes" /></div>
                <div className="space-y-1"><Label className="text-xs">Nein (MEA)</Label><Input value={vMeaNo} onChange={e => setVMeaNo(e.target.value)} data-testid="input-mea-no" /></div>
                <div className="space-y-1"><Label className="text-xs">Enthaltung (MEA)</Label><Input value={vMeaAbstain} onChange={e => setVMeaAbstain(e.target.value)} data-testid="input-mea-abstain" /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-vote">Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!vTopic || createVote.isPending} data-testid="button-save-vote">
              {createVote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BudgetTab({ propertyId, orgId }: { propertyId: string; orgId: string | null }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lineDialogOpen, setLineDialogOpen] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [bYear, setBYear] = useState(String(new Date().getFullYear()));
  const [bTotal, setBTotal] = useState('');
  const [bReserve, setBReserve] = useState('');
  const [bNotes, setBNotes] = useState('');
  const [lCategory, setLCategory] = useState('Betriebskosten');
  const [lDesc, setLDesc] = useState('');
  const [lAmount, setLAmount] = useState('');
  const [lKey, setLKey] = useState('mea');

  const { data: plans = [], isLoading } = useWegBudgetPlans(propertyId || undefined);
  const { data: lines = [] } = useWegBudgetLines(expandedPlanId || undefined);
  const createPlan = useCreateWegBudgetPlan();
  const updatePlan = useUpdateWegBudgetPlan();
  const createLine = useCreateWegBudgetLine();
  const deleteLine = useDeleteWegBudgetLine();

  const handleCreatePlan = async () => {
    await createPlan.mutateAsync({
      organization_id: orgId,
      property_id: propertyId,
      year: parseInt(bYear),
      total_amount: parseFloat(bTotal.replace(',', '.')) || 0,
      reserve_contribution: parseFloat(bReserve.replace(',', '.')) || 0,
      status: 'entwurf',
      approved_at: null,
      approved_by_vote_id: null,
      notes: bNotes || null,
    });
    setDialogOpen(false);
    setBYear(String(new Date().getFullYear())); setBTotal(''); setBReserve(''); setBNotes('');
  };

  const handleCreateLine = async () => {
    if (!expandedPlanId) return;
    await createLine.mutateAsync({
      budget_plan_id: expandedPlanId,
      category: lCategory,
      description: lDesc || null,
      amount: parseFloat(lAmount.replace(',', '.')) || 0,
      allocation_key: lKey,
    });
    setLineDialogOpen(false);
    setLCategory('Betriebskosten'); setLDesc(''); setLAmount(''); setLKey('mea');
  };

  const linesTotal = lines.reduce((s, l) => s + l.amount, 0);

  if (!propertyId) return <EmptyState icon={Building2} text="Bitte w\u00E4hlen Sie eine Liegenschaft." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-budget">
          <Plus className="h-4 w-4 mr-2" /> Neuer Wirtschaftsplan
        </Button>
      </div>

      {isLoading ? <LoadingSpinner /> : plans.length === 0 ? (
        <EmptyState icon={FileText} text="Noch keine Wirtschaftspl\u00E4ne vorhanden." />
      ) : (
        <div className="space-y-4">
          {plans.map(p => {
            const isExpanded = expandedPlanId === p.id;
            return (
              <Card key={p.id} data-testid={`card-budget-${p.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" /> Wirtschaftsplan {p.year}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={p.status} labels={budgetStatusLabels} />
                      {p.status === 'entwurf' && (
                        <Button variant="outline" size="sm" onClick={() => updatePlan.mutate({ id: p.id, status: 'beschlossen' } as any)} data-testid={`button-approve-budget-${p.id}`}>
                          Beschlie\u00DFen
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-6 text-sm flex-wrap">
                    <span>Gesamtbetrag: <strong>{fmt(p.total_amount)}</strong></span>
                    <span>R\u00FCcklagenbeitrag: <strong>{fmt(p.reserve_contribution)}</strong></span>
                    {p.notes && <span className="text-muted-foreground">{p.notes}</span>}
                  </div>

                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setExpandedPlanId(isExpanded ? null : p.id)} data-testid={`button-toggle-lines-${p.id}`}>
                      <Euro className="h-3 w-3 mr-1" /> Positionen {isExpanded ? 'ausblenden' : 'anzeigen'}
                    </Button>
                    {isExpanded && (
                      <Button variant="ghost" size="sm" onClick={() => setLineDialogOpen(true)} data-testid={`button-add-line-${p.id}`}>
                        <Plus className="h-3 w-3 mr-1" /> Position hinzuf\u00FCgen
                      </Button>
                    )}
                  </div>

                  {isExpanded && (
                    lines.length > 0 ? (
                      <>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Kategorie</TableHead>
                              <TableHead>Beschreibung</TableHead>
                              <TableHead className="text-right">Betrag</TableHead>
                              <TableHead>Verteilschl\u00FCssel</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map(l => (
                              <TableRow key={l.id} data-testid={`row-line-${l.id}`}>
                                <TableCell><Badge variant="outline">{l.category}</Badge></TableCell>
                                <TableCell>{l.description || '\u2014'}</TableCell>
                                <TableCell className="text-right font-medium">{fmt(l.amount)}</TableCell>
                                <TableCell>{l.allocation_key}</TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" onClick={() => deleteLine.mutate(l.id)} data-testid={`button-delete-line-${l.id}`}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="flex justify-between text-sm px-4 py-2 border-t">
                          <span>Summe Positionen: <strong>{fmt(linesTotal)}</strong></span>
                          <span>Plan-Gesamt: <strong>{fmt(p.total_amount)}</strong></span>
                          {Math.abs(linesTotal - p.total_amount) > 0.01 && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Differenz: {fmt(Math.abs(linesTotal - p.total_amount))}
                            </Badge>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Keine Positionen vorhanden.</p>
                    )
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Wirtschaftsplan</DialogTitle>
            <DialogDescription>Erstellen Sie einen Wirtschaftsplan gem\u00E4\u00DF \u00A7 31 WEG.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Jahr</Label>
              <Input type="number" value={bYear} onChange={e => setBYear(e.target.value)} data-testid="input-budget-year" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gesamtbetrag (\u20AC)</Label>
                <Input value={bTotal} onChange={e => setBTotal(e.target.value)} placeholder="0,00" data-testid="input-budget-total" />
              </div>
              <div className="space-y-2">
                <Label>R\u00FCcklagenbeitrag (\u20AC)</Label>
                <Input value={bReserve} onChange={e => setBReserve(e.target.value)} placeholder="0,00" data-testid="input-budget-reserve" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Anmerkungen</Label>
              <Textarea value={bNotes} onChange={e => setBNotes(e.target.value)} data-testid="input-budget-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-budget">Abbrechen</Button>
            <Button onClick={handleCreatePlan} disabled={!bYear || !bTotal || createPlan.isPending} data-testid="button-save-budget">
              {createPlan.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lineDialogOpen} onOpenChange={setLineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Budgetposition hinzuf\u00FCgen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={lCategory} onValueChange={setLCategory}>
                <SelectTrigger data-testid="select-line-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {budgetCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Input value={lDesc} onChange={e => setLDesc(e.target.value)} data-testid="input-line-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Betrag (\u20AC)</Label>
                <Input value={lAmount} onChange={e => setLAmount(e.target.value)} placeholder="0,00" data-testid="input-line-amount" />
              </div>
              <div className="space-y-2">
                <Label>Verteilschl\u00FCssel</Label>
                <Select value={lKey} onValueChange={setLKey}>
                  <SelectTrigger data-testid="select-line-key"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mea">MEA-Anteil</SelectItem>
                    <SelectItem value="nutzflaeche">Nutzfl\u00E4che</SelectItem>
                    <SelectItem value="einheiten">Einheiten</SelectItem>
                    <SelectItem value="verbrauch">Verbrauch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLineDialogOpen(false)} data-testid="button-cancel-line">Abbrechen</Button>
            <Button onClick={handleCreateLine} disabled={!lAmount || createLine.isPending} data-testid="button-save-line">
              {createLine.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Hinzuf\u00FCgen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReserveTab({ propertyId, orgId, properties }: { propertyId: string; orgId: string | null; properties: any[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rType, setRType] = useState('einzahlung');
  const [rYear, setRYear] = useState(String(new Date().getFullYear()));
  const [rMonth, setRMonth] = useState(String(new Date().getMonth() + 1));
  const [rAmount, setRAmount] = useState('');
  const [rDesc, setRDesc] = useState('');

  const { data: reserveEntries = [], isLoading } = useReserveFund(propertyId || undefined);
  const createReserve = useCreateReserveFundEntry();

  const reserveBalance = reserveEntries.reduce((sum, e) => sum + (e.entry_type === 'einzahlung' ? e.amount : -e.amount), 0);

  const handleCreate = async () => {
    await createReserve.mutateAsync({
      organization_id: orgId,
      property_id: propertyId,
      year: parseInt(rYear),
      month: parseInt(rMonth),
      amount: parseFloat(rAmount.replace(',', '.')) || 0,
      description: rDesc || null,
      entry_type: rType as 'einzahlung' | 'entnahme',
    });
    setDialogOpen(false);
    setRAmount(''); setRDesc('');
  };

  if (!propertyId) return <EmptyState icon={Building2} text="Bitte w\u00E4hlen Sie eine Liegenschaft." />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Card>
          <CardContent className="py-4 px-6">
            <p className="text-sm text-muted-foreground">Aktuelle Instandhaltungsr\u00FCcklage (\u00A7 31 WEG)</p>
            <p className={`text-3xl font-bold ${reserveBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`} data-testid="text-reserve-balance">
              {fmt(reserveBalance)}
            </p>
          </CardContent>
        </Card>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-reserve">
          <Plus className="h-4 w-4 mr-2" /> Buchung erfassen
        </Button>
      </div>

      {isLoading ? <LoadingSpinner /> : reserveEntries.length === 0 ? (
        <EmptyState icon={PiggyBank} text="Noch keine R\u00FCcklagebuchungen vorhanden." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zeitraum</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="text-right">Betrag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reserveEntries.map(e => (
              <TableRow key={e.id} data-testid={`row-reserve-${e.id}`}>
                <TableCell>{String(e.month).padStart(2, '0')}/{e.year}</TableCell>
                <TableCell>{e.description || '\u2014'}</TableCell>
                <TableCell>
                  <Badge className={e.entry_type === 'einzahlung'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }>
                    {e.entry_type === 'einzahlung' ? <ArrowUpCircle className="h-3 w-3 mr-1" /> : <ArrowDownCircle className="h-3 w-3 mr-1" />}
                    {e.entry_type === 'einzahlung' ? 'Einzahlung' : 'Entnahme'}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-medium ${e.entry_type === 'einzahlung' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {e.entry_type === 'einzahlung' ? '+' : '-'}{fmt(e.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>R\u00FCcklage-Buchung</DialogTitle>
            <DialogDescription>Erfassen Sie eine Ein- oder Auszahlung der Instandhaltungsr\u00FCcklage.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={rType} onValueChange={setRType}>
                <SelectTrigger data-testid="select-reserve-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="einzahlung">Einzahlung</SelectItem>
                  <SelectItem value="entnahme">Entnahme</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jahr</Label>
                <Input type="number" value={rYear} onChange={e => setRYear(e.target.value)} data-testid="input-reserve-year" />
              </div>
              <div className="space-y-2">
                <Label>Monat</Label>
                <Input type="number" min="1" max="12" value={rMonth} onChange={e => setRMonth(e.target.value)} data-testid="input-reserve-month" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Betrag (\u20AC)</Label>
              <Input value={rAmount} onChange={e => setRAmount(e.target.value)} placeholder="0,00" data-testid="input-reserve-amount" />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Input value={rDesc} onChange={e => setRDesc(e.target.value)} data-testid="input-reserve-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-reserve">Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!rAmount || createReserve.isPending} data-testid="button-save-reserve">
              {createReserve.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MaintenanceTab({ propertyId, orgId }: { propertyId: string; orgId: string | null }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mCategory, setMCategory] = useState<string>('ordentliche_verwaltung');
  const [mPriority, setMPriority] = useState<string>('normal');
  const [mEstCost, setMEstCost] = useState('');
  const [mFinancing, setMFinancing] = useState<string>('ruecklage');
  const [mContractorName, setMContractorName] = useState('');
  const [mContractorContact, setMContractorContact] = useState('');

  const { data: items = [], isLoading } = useWegMaintenance(propertyId || undefined);
  const createMaintenance = useCreateWegMaintenance();
  const updateMaintenance = useUpdateWegMaintenance();
  const deleteMaintenance = useDeleteWegMaintenance();

  const statusFlow: Record<string, string> = {
    geplant: 'beauftragt',
    beauftragt: 'in_ausfuehrung',
    in_ausfuehrung: 'abgeschlossen',
  };
  const statusFlowLabel: Record<string, string> = {
    geplant: 'Beauftragen',
    beauftragt: 'In Ausf\u00FChrung',
    in_ausfuehrung: 'Abschlie\u00DFen',
  };

  const handleCreate = async () => {
    await createMaintenance.mutateAsync({
      organization_id: orgId,
      property_id: propertyId,
      title: mTitle,
      description: mDesc || null,
      category: mCategory,
      priority: mPriority,
      estimated_cost: mEstCost ? parseFloat(mEstCost.replace(',', '.')) : null,
      actual_cost: null,
      financing_source: mFinancing,
      special_assessment_id: null,
      approved_by_vote_id: null,
      status: 'geplant',
      start_date: null,
      completion_date: null,
      contractor_name: mContractorName || null,
      contractor_contact: mContractorContact || null,
      notes: null,
    });
    setDialogOpen(false);
    setMTitle(''); setMDesc(''); setMCategory('ordentliche_verwaltung'); setMPriority('normal');
    setMEstCost(''); setMFinancing('ruecklage'); setMContractorName(''); setMContractorContact('');
  };

  if (!propertyId) return <EmptyState icon={Building2} text="Bitte w\u00E4hlen Sie eine Liegenschaft." />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-maintenance">
          <Plus className="h-4 w-4 mr-2" /> Neue Ma\u00DFnahme
        </Button>
      </div>

      {isLoading ? <LoadingSpinner /> : items.length === 0 ? (
        <EmptyState icon={Wrench} text="Noch keine Erhaltungsma\u00DFnahmen vorhanden." />
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id} data-testid={`card-maintenance-${item.id}`}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="space-y-1">
                    <h4 className="font-medium flex items-center gap-2">
                      <Wrench className="h-4 w-4" /> {item.title}
                    </h4>
                    {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <Badge className={
                        item.category === 'notmassnahme'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : item.category === 'ausserordentliche_verwaltung'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }>
                        {maintenanceCategoryLabels[item.category]}
                      </Badge>
                      <PriorityBadge priority={item.priority} />
                      <StatusBadge status={item.status} labels={maintenanceStatusLabels} />
                      <Badge variant="outline">{financingLabels[item.financing_source]}</Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-2 flex-wrap">
                      {item.estimated_cost != null && <span>Gesch\u00E4tzt: {fmt(item.estimated_cost)}</span>}
                      {item.actual_cost != null && <span>Tats\u00E4chlich: {fmt(item.actual_cost)}</span>}
                      {item.contractor_name && <span>Auftragnehmer: {item.contractor_name}</span>}
                      {item.start_date && <span>Beginn: {fmtDate(item.start_date)}</span>}
                      {item.completion_date && <span>Abschluss: {fmtDate(item.completion_date)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusFlow[item.status] && (
                      <Button
                        variant="outline" size="sm"
                        onClick={() => updateMaintenance.mutate({ id: item.id, status: statusFlow[item.status] } as any)}
                        data-testid={`button-advance-maintenance-${item.id}`}
                      >
                        <ChevronRight className="h-3 w-3 mr-1" /> {statusFlowLabel[item.status]}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteMaintenance.mutate(item.id)} data-testid={`button-delete-maintenance-${item.id}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Erhaltungsma\u00DFnahme</DialogTitle>
            <DialogDescription>Erfassen Sie eine Ma\u00DFnahme gem\u00E4\u00DF \u00A7 28-29 WEG.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input value={mTitle} onChange={e => setMTitle(e.target.value)} placeholder="z.B. Fassadensanierung" data-testid="input-maintenance-title" />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea value={mDesc} onChange={e => setMDesc(e.target.value)} data-testid="input-maintenance-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={mCategory} onValueChange={setMCategory}>
                  <SelectTrigger data-testid="select-maintenance-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordentliche_verwaltung">Ordentliche Verwaltung</SelectItem>
                    <SelectItem value="ausserordentliche_verwaltung">Au\u00DFerordentliche Verwaltung</SelectItem>
                    <SelectItem value="notmassnahme">Notma\u00DFnahme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priorit\u00E4t</Label>
                <Select value={mPriority} onValueChange={setMPriority}>
                  <SelectTrigger data-testid="select-maintenance-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="niedrig">Niedrig</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hoch">Hoch</SelectItem>
                    <SelectItem value="dringend">Dringend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gesch\u00E4tzte Kosten (\u20AC)</Label>
                <Input value={mEstCost} onChange={e => setMEstCost(e.target.value)} placeholder="0,00" data-testid="input-maintenance-cost" />
              </div>
              <div className="space-y-2">
                <Label>Finanzierung</Label>
                <Select value={mFinancing} onValueChange={setMFinancing}>
                  <SelectTrigger data-testid="select-maintenance-financing"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ruecklage">R\u00FCcklage</SelectItem>
                    <SelectItem value="sonderumlage">Sonderumlage</SelectItem>
                    <SelectItem value="laufend">Laufend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Auftragnehmer</Label>
                <Input value={mContractorName} onChange={e => setMContractorName(e.target.value)} placeholder="Firma" data-testid="input-contractor-name" />
              </div>
              <div className="space-y-2">
                <Label>Kontakt</Label>
                <Input value={mContractorContact} onChange={e => setMContractorContact(e.target.value)} placeholder="Tel/Email" data-testid="input-contractor-contact" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-maintenance">Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!mTitle || createMaintenance.isPending} data-testid="button-save-maintenance">
              {createMaintenance.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
