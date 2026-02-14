import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Zap, Play, Loader2, CheckCircle2, XCircle, Settings2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TRIGGER_TYPES = [
  { value: 'zahlungseingang', label: 'Zahlungseingang' },
  { value: 'mietende', label: 'Mietende' },
  { value: 'faelligkeit', label: 'Fälligkeit' },
  { value: 'leerstand', label: 'Leerstand' },
];

const ACTION_TYPES = [
  { value: 'email_senden', label: 'E-Mail senden' },
  { value: 'mahnung_erstellen', label: 'Mahnung erstellen' },
  { value: 'status_aendern', label: 'Status ändern' },
  { value: 'benachrichtigung', label: 'Interne Benachrichtigung' },
];

interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  conditions: Record<string, any>;
  actions: string[];
  is_active: boolean;
  created_at: string;
}

export default function AutomationRules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showDryRun, setShowDryRun] = useState(false);
  const [dryRunResults, setDryRunResults] = useState<any[] | null>(null);
  const [isDryRunning, setIsDryRunning] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'zahlungseingang',
    conditions: {} as Record<string, any>,
    actions: [] as string[],
  });

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AutomationRule[];
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Not configured');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get org id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization');

      const { error } = await supabase.from('automation_rules').insert([{
        organization_id: profile.organization_id,
        name: form.name,
        description: form.description || null,
        trigger_type: form.trigger_type as any,
        conditions: form.conditions,
        actions: form.actions as any,
        is_active: false,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      setShowCreate(false);
      setForm({ name: '', description: '', trigger_type: 'zahlungseingang', conditions: {}, actions: [] });
      toast({ title: 'Regel erstellt' });
    },
    onError: (err: any) => {
      toast({ title: 'Fehler', description: err.message, variant: 'destructive' });
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!supabase) throw new Error('Not configured');
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automation-rules'] }),
  });

  const handleDryRun = async () => {
    setIsDryRunning(true);
    try {
      // Simulate dry run locally
      const results = rules.map((rule) => ({
        rule_name: rule.name,
        trigger_type: rule.trigger_type,
        is_active: rule.is_active,
        would_trigger: rule.is_active,
        actions: rule.actions,
      }));
      setDryRunResults(results);
      setShowDryRun(true);
    } finally {
      setIsDryRunning(false);
    }
  };

  const getTriggerLabel = (type: string) =>
    TRIGGER_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <MainLayout title="Automatisierung" subtitle="Regeln für automatische Aktionen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{rules.length} Regeln</Badge>
          <Badge variant="outline" className="bg-primary/10 text-primary">
            {rules.filter((r) => r.is_active).length} aktiv
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDryRun} disabled={isDryRunning || rules.length === 0}>
            {isDryRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            Dry-Run testen
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Neue Regel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Keine Automatisierungsregeln</p>
            <p className="text-sm text-muted-foreground mt-1">
              Erstellen Sie Regeln, um Aktionen automatisch auszuführen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Aktionen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktiv</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTriggerLabel(rule.trigger_type)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(rule.actions as string[]).map((a, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {ACTION_TYPES.find((t) => t.value === a)?.label || a}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rule.is_active ? (
                      <Badge className="bg-primary/10 text-primary">Aktiv</Badge>
                    ) : (
                      <Badge variant="outline">Inaktiv</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) =>
                        toggleRule.mutate({ id: rule.id, is_active: checked })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Automatisierungsregel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Mahnung bei Zahlungsverzug"
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optionale Beschreibung..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select
                value={form.trigger_type}
                onValueChange={(v) => setForm((f) => ({ ...f, trigger_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Aktionen</Label>
              <div className="space-y-2">
                {ACTION_TYPES.map((action) => (
                  <div key={action.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={action.value}
                      checked={form.actions.includes(action.value)}
                      onCheckedChange={(checked) => {
                        setForm((f) => ({
                          ...f,
                          actions: checked
                            ? [...f.actions, action.value]
                            : f.actions.filter((a) => a !== action.value),
                        }));
                      }}
                    />
                    <Label htmlFor={action.value} className="font-normal">
                      {action.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => createRule.mutate()}
              disabled={!form.name || form.actions.length === 0 || createRule.isPending}
            >
              {createRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dry Run Results Dialog */}
      <Dialog open={showDryRun} onOpenChange={setShowDryRun}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Dry-Run Ergebnis
            </DialogTitle>
          </DialogHeader>
          {dryRunResults && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Regel</TableHead>
                  <TableHead>Würde auslösen</TableHead>
                  <TableHead>Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dryRunResults.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.rule_name}</TableCell>
                    <TableCell>
                      {r.would_trigger ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.actions.map((a: string, j: number) => (
                          <Badge key={j} variant="secondary" className="text-xs">
                            {ACTION_TYPES.find((t) => t.value === a)?.label || a}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
