import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Clock, CalendarPlus, XCircle, Tag, Megaphone, Users, BarChart3,
  Send, Copy, Loader2, AlertTriangle, CheckCircle, Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { apiRequest, getAuthToken } from '@/lib/queryClient';

function authHeaders() {
  const h: Record<string, string> = {};
  const t = getAuthToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

interface Trial {
  id: string;
  name: string;
  email: string | null;
  owner_email: string | null;
  owner_name: string | null;
  subscription_status: string;
  subscription_tier: string;
  trial_ends_at: string | null;
  days_left: number | null;
  is_expired: boolean;
  created_at: string;
}

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number | null;
  discount_months: number | null;
  trial_days: number | null;
  target_tier: string | null;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

interface BroadcastMessage {
  id: string;
  subject: string;
  target_filter: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: string;
  sent_at: string | null;
  created_at: string;
}

interface OnboardingOrg {
  id: string;
  name: string;
  email: string | null;
  subscription_status: string;
  subscription_tier: string;
  created_at: string;
  property_count: number;
  unit_count: number;
  tenant_count: number;
  user_count: number;
  onboarding_step: string;
  days_since_creation: number;
}

export function MarketingManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Marketing & Kundengewinnung
        </CardTitle>
        <CardDescription>Trial-Management, Promo-Codes, Broadcast-Nachrichten und Onboarding-Tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trials">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="trials" data-testid="tab-trials">
              <Clock className="h-4 w-4 mr-1" />Trials
            </TabsTrigger>
            <TabsTrigger value="promos" data-testid="tab-promos">
              <Tag className="h-4 w-4 mr-1" />Promo-Codes
            </TabsTrigger>
            <TabsTrigger value="broadcast" data-testid="tab-broadcast">
              <Megaphone className="h-4 w-4 mr-1" />Broadcast
            </TabsTrigger>
            <TabsTrigger value="onboarding" data-testid="tab-onboarding">
              <BarChart3 className="h-4 w-4 mr-1" />Onboarding
            </TabsTrigger>
            <TabsTrigger value="invitations" data-testid="tab-marketing-invitations">
              <Mail className="h-4 w-4 mr-1" />Einladungen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trials"><TrialsTab /></TabsContent>
          <TabsContent value="promos"><PromosTab /></TabsContent>
          <TabsContent value="broadcast"><BroadcastTab /></TabsContent>
          <TabsContent value="onboarding"><OnboardingTab /></TabsContent>
          <TabsContent value="invitations"><InvitationsTab /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TrialsTab() {
  const queryClient = useQueryClient();
  const { data: trials, isLoading } = useQuery<Trial[]>({
    queryKey: ['/api/admin/marketing/trials'],
    queryFn: async () => {
      const res = await fetch('/api/admin/marketing/trials', { headers: authHeaders(), credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      return res.json();
    },
  });
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState('14');
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleExtend = async () => {
    if (!selectedTrialId) return;
    setActionLoading(selectedTrialId);
    try {
      const res = await apiRequest('POST', `/api/admin/marketing/trials/${selectedTrialId}/extend`, { days: parseInt(extendDays) || 14 });
      const data = await res.json();
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/marketing/trials'] });
      setShowExtendDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Verlängern');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEndTrial = async (id: string) => {
    if (!confirm('Trial wirklich beenden?')) return;
    setActionLoading(id);
    try {
      const res = await apiRequest('POST', `/api/admin/marketing/trials/${id}/end`, {});
      const data = await res.json();
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/marketing/trials'] });
    } catch (err: any) {
      toast.error(err.message || 'Fehler');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Lade Trial-Daten...</div>;

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{trials?.length || 0} aktive Trials</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead>Verbleibend</TableHead>
              <TableHead>Endet am</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!trials || trials.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Keine aktiven Trials</TableCell>
              </TableRow>
            ) : (
              trials.map((trial) => (
                <TableRow key={trial.id}>
                  <TableCell className="font-medium">{trial.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{trial.owner_email || trial.email || '-'}</TableCell>
                  <TableCell>
                    {trial.is_expired ? (
                      <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Abgelaufen</Badge>
                    ) : trial.days_left !== null && trial.days_left <= 3 ? (
                      <Badge variant="secondary" className="text-yellow-600">{trial.days_left} Tage</Badge>
                    ) : (
                      <Badge variant="outline">{trial.days_left ?? '?'} Tage</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {trial.trial_ends_at ? format(new Date(trial.trial_ends_at), 'dd.MM.yyyy', { locale: de }) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setSelectedTrialId(trial.id); setShowExtendDialog(true); }}
                        disabled={actionLoading === trial.id}
                        title="Trial verlängern"
                        data-testid={`button-extend-trial-${trial.id}`}
                      >
                        <CalendarPlus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEndTrial(trial.id)}
                        disabled={actionLoading === trial.id}
                        title="Trial beenden"
                        data-testid={`button-end-trial-${trial.id}`}
                      >
                        {actionLoading === trial.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trial verlängern</DialogTitle>
            <DialogDescription>Um wie viele Tage soll der Trial verlängert werden?</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="number"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              min="1"
              max="90"
              data-testid="input-extend-days"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendDialog(false)}>Abbrechen</Button>
            <Button onClick={handleExtend} disabled={!!actionLoading} data-testid="button-confirm-extend">
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarPlus className="h-4 w-4 mr-2" />}
              Verlängern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PromosTab() {
  const queryClient = useQueryClient();
  const { data: codes, isLoading } = useQuery<PromoCode[]>({
    queryKey: ['/api/admin/marketing/promo-codes'],
    queryFn: async () => {
      const res = await fetch('/api/admin/marketing/promo-codes', { headers: authHeaders(), credentials: 'include' });
      if (!res.ok) throw new Error('Fehler');
      return res.json();
    },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discountPercent: '', discountMonths: '', trialDays: '', targetTier: '', maxUses: '', validUntil: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await apiRequest('POST', '/api/admin/marketing/promo-codes', {
        code: form.code,
        description: form.description || undefined,
        discount_percent: form.discountPercent || undefined,
        discount_months: form.discountMonths || undefined,
        trial_days: form.trialDays || undefined,
        target_tier: form.targetTier || undefined,
        max_uses: form.maxUses || undefined,
        valid_until: form.validUntil || undefined,
      });
      const data = await res.json();
      toast.success(`Promo-Code "${form.code}" erstellt`);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/marketing/promo-codes'] });
      setShowCreate(false);
      setForm({ code: '', description: '', discountPercent: '', discountMonths: '', trialDays: '', targetTier: '', maxUses: '', validUntil: '' });
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Erstellen');
    } finally {
      setCreating(false);
    }
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Lade Promo-Codes...</div>;

  return (
    <div className="space-y-4 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{codes?.length || 0} Promo-Codes</p>
        <Button onClick={() => setShowCreate(true)} data-testid="button-create-promo">
          <Tag className="h-4 w-4 mr-2" />Neuer Promo-Code
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Beschreibung</TableHead>
              <TableHead>Rabatt</TableHead>
              <TableHead>Nutzungen</TableHead>
              <TableHead>Gültig bis</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!codes || codes.length === 0) ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Keine Promo-Codes vorhanden</TableCell>
              </TableRow>
            ) : (
              codes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>
                    <code className="font-mono font-bold text-sm">{code.code}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{code.description || '-'}</TableCell>
                  <TableCell className="text-sm">
                    {code.discount_percent ? `${code.discount_percent}%` : ''}
                    {code.discount_months ? ` ${code.discount_months} Monate` : ''}
                    {code.trial_days ? `${code.trial_days} Trial-Tage` : ''}
                    {!code.discount_percent && !code.discount_months && !code.trial_days && '-'}
                  </TableCell>
                  <TableCell className="text-sm">{code.current_uses}{code.max_uses ? `/${code.max_uses}` : ''}</TableCell>
                  <TableCell className="text-sm">
                    {code.valid_until ? format(new Date(code.valid_until), 'dd.MM.yyyy', { locale: de }) : 'Unbegrenzt'}
                  </TableCell>
                  <TableCell>
                    {code.is_active ? (
                      <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Aktiv</Badge>
                    ) : (
                      <Badge variant="secondary">Inaktiv</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Promo-Code erstellen</DialogTitle>
            <DialogDescription>Erstellen Sie einen Aktionscode für Kunden</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              placeholder="CODE (z.B. WINTER2026)"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              required
              data-testid="input-promo-code"
            />
            <Input
              placeholder="Beschreibung (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              data-testid="input-promo-description"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Rabatt %"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                min="0" max="100"
                data-testid="input-promo-discount"
              />
              <Input
                type="number"
                placeholder="Gratis-Monate"
                value={form.discountMonths}
                onChange={(e) => setForm({ ...form, discountMonths: e.target.value })}
                min="0"
                data-testid="input-promo-months"
              />
              <Input
                type="number"
                placeholder="Trial-Tage"
                value={form.trialDays}
                onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
                min="0"
                data-testid="input-promo-trial-days"
              />
              <Input
                type="number"
                placeholder="Max. Nutzungen"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                min="0"
                data-testid="input-promo-max-uses"
              />
            </div>
            <Select value={form.targetTier} onValueChange={(v) => setForm({ ...form, targetTier: v })}>
              <SelectTrigger data-testid="select-promo-tier">
                <SelectValue placeholder="Ziel-Plan (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="Gültig bis"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              data-testid="input-promo-valid-until"
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Abbrechen</Button>
              <Button type="submit" disabled={creating || !form.code} data-testid="button-save-promo">
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tag className="h-4 w-4 mr-2" />}
                Erstellen
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BroadcastTab() {
  const queryClient = useQueryClient();
  const { data: history, isLoading } = useQuery<BroadcastMessage[]>({
    queryKey: ['/api/admin/marketing/broadcast/history'],
    queryFn: async () => {
      const res = await fetch('/api/admin/marketing/broadcast/history', { headers: authHeaders(), credentials: 'include' });
      if (!res.ok) throw new Error('Fehler');
      return res.json();
    },
  });

  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [targetFilter, setTargetFilter] = useState('all');
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`Broadcast-Nachricht an ${targetFilter === 'all' ? 'ALLE' : targetFilter === 'trial' ? 'Trial-User' : 'aktive Kunden'} senden?`)) return;
    setSending(true);
    try {
      const res = await apiRequest('POST', '/api/admin/marketing/broadcast', {
        subject,
        html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${htmlContent}</div>`,
        text_content: htmlContent.replace(/<[^>]*>/g, ''),
        target_filter: targetFilter,
      });
      const data = await res.json();
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/marketing/broadcast/history'] });
      setSubject('');
      setHtmlContent('');
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Senden');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      <form onSubmit={handleSend} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            placeholder="Betreff *"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            data-testid="input-broadcast-subject"
          />
          <Select value={targetFilter} onValueChange={setTargetFilter}>
            <SelectTrigger data-testid="select-broadcast-target">
              <SelectValue placeholder="Empfänger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kunden</SelectItem>
              <SelectItem value="trial">Nur Trial-User</SelectItem>
              <SelectItem value="active">Nur aktive Abonnenten</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          placeholder="Nachricht (HTML erlaubt)..."
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          className="resize-none"
          rows={6}
          required
          data-testid="input-broadcast-content"
        />
        <Button type="submit" disabled={sending || !subject || !htmlContent} data-testid="button-send-broadcast">
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Broadcast senden
        </Button>
      </form>

      <div>
        <h4 className="text-sm font-medium mb-3">Versandhistorie</h4>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Lade...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Betreff</TableHead>
                  <TableHead>Zielgruppe</TableHead>
                  <TableHead>Gesendet</TableHead>
                  <TableHead>Fehler</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!history || history.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Keine Broadcasts gesendet</TableCell>
                  </TableRow>
                ) : (
                  history.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="font-medium">{msg.subject}</TableCell>
                      <TableCell className="text-sm">
                        {msg.target_filter === 'all' ? 'Alle' : msg.target_filter === 'trial' ? 'Trial' : 'Aktiv'}
                      </TableCell>
                      <TableCell className="text-sm">{msg.sent_count}/{msg.recipient_count}</TableCell>
                      <TableCell className="text-sm">{msg.failed_count > 0 ? <span className="text-destructive">{msg.failed_count}</span> : '0'}</TableCell>
                      <TableCell className="text-sm">
                        {msg.sent_at ? format(new Date(msg.sent_at), 'dd.MM.yyyy HH:mm', { locale: de }) : '-'}
                      </TableCell>
                      <TableCell>
                        {msg.status === 'sent' ? (
                          <Badge variant="default" className="bg-green-500">Gesendet</Badge>
                        ) : msg.status === 'failed' ? (
                          <Badge variant="destructive">Fehlgeschlagen</Badge>
                        ) : (
                          <Badge variant="outline">Entwurf</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function OnboardingTab() {
  const { data: orgs, isLoading } = useQuery<OnboardingOrg[]>({
    queryKey: ['/api/admin/marketing/onboarding'],
    queryFn: async () => {
      const res = await fetch('/api/admin/marketing/onboarding', { headers: authHeaders(), credentials: 'include' });
      if (!res.ok) throw new Error('Fehler');
      return res.json();
    },
  });

  const stepLabels: Record<string, string> = {
    registered: 'Registriert',
    properties_added: 'Liegenschaften',
    units_added: 'Einheiten',
    tenants_added: 'Mieter',
    subscribed: 'Abonniert',
  };

  const stepColors: Record<string, string> = {
    registered: 'bg-gray-400',
    properties_added: 'bg-yellow-500',
    units_added: 'bg-blue-500',
    tenants_added: 'bg-green-500',
    subscribed: 'bg-primary',
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Lade Onboarding-Daten...</div>;

  const stepCounts = orgs?.reduce((acc, org) => {
    acc[org.onboarding_step] = (acc[org.onboarding_step] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(stepLabels).map(([key, label]) => (
          <div key={key} className="text-center p-3 rounded-md border">
            <p className="text-2xl font-bold">{stepCounts[key] || 0}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organisation</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead className="text-center">Liegensch.</TableHead>
              <TableHead className="text-center">Einheiten</TableHead>
              <TableHead className="text-center">Mieter</TableHead>
              <TableHead>Alter</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!orgs || orgs.length === 0) ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Keine Daten</TableCell>
              </TableRow>
            ) : (
              orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${stepColors[org.onboarding_step] || 'bg-gray-400'}`} />
                      {stepLabels[org.onboarding_step] || org.onboarding_step}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{org.property_count}</TableCell>
                  <TableCell className="text-center">{org.unit_count}</TableCell>
                  <TableCell className="text-center">{org.tenant_count}</TableCell>
                  <TableCell className="text-sm">{org.days_since_creation} Tage</TableCell>
                  <TableCell>
                    <Badge variant={org.subscription_status === 'active' ? 'default' : 'secondary'}>
                      {org.subscription_status === 'active' ? 'Aktiv' : org.subscription_status === 'trial' ? 'Trial' : org.subscription_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function InvitationsTab() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [sending, setSending] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setRegistrationUrl(null);
    try {
      const res = await apiRequest('POST', '/api/admin/marketing/invitations', {
        email,
        name: name || undefined,
        message: message || undefined,
        promo_code: promoCode || undefined,
      });
      const data = await res.json();
      toast.success(data.message);
      if (data.registration_url) setRegistrationUrl(data.registration_url);
      setEmail('');
      setName('');
      setMessage('');
    } catch (err: any) {
      toast.error(err.message || 'Fehler');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <form onSubmit={handleSend} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="email"
            placeholder="E-Mail-Adresse *"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="input-marketing-invite-email"
          />
          <Input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="input-marketing-invite-name"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            placeholder="Promo-Code (optional)"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            data-testid="input-marketing-promo-code"
          />
        </div>
        <Textarea
          placeholder="Persönliche Nachricht (optional)..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-none"
          rows={3}
          data-testid="input-marketing-invite-message"
        />
        <Button type="submit" disabled={sending || !email} data-testid="button-send-marketing-invite">
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
          Marketing-Einladung senden
        </Button>
        {registrationUrl && (
          <div className="flex items-center gap-2 rounded-md border p-3">
            <span className="text-sm text-muted-foreground flex-shrink-0">Registrierungs-URL:</span>
            <code className="text-sm flex-1 truncate" data-testid="text-marketing-registration-url">{registrationUrl}</code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => { navigator.clipboard.writeText(registrationUrl); toast.success('URL kopiert'); }}
              data-testid="button-copy-marketing-url"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
