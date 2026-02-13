import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Vote, Clock, CheckCircle2, XCircle, Loader2, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CirculationResolutionProps {
  propertyId: string;
  organizationId: string | null;
}

interface Resolution {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: 'offen' | 'angenommen' | 'abgelehnt' | 'abgelaufen';
  votes_yes: number;
  votes_no: number;
  votes_abstain: number;
  total_owners: number;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  offen: 'Abstimmung läuft',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
  abgelaufen: 'Frist abgelaufen',
};

const statusStyles: Record<string, string> = {
  offen: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  angenommen: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  abgelehnt: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  abgelaufen: 'bg-muted text-muted-foreground',
};

export function CirculationResolution({ propertyId, organizationId }: CirculationResolutionProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [voteDialogOpen, setVoteDialogOpen] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [totalOwners, setTotalOwners] = useState('');

  // Vote form
  const [voteType, setVoteType] = useState<'yes' | 'no' | 'abstain'>('yes');
  const [voteCount, setVoteCount] = useState('1');

  const { data: resolutions = [], isLoading } = useQuery({
    queryKey: ['circulation-resolutions', propertyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('weg_circulation_resolutions')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet - return empty
        console.warn('Circulation resolutions query:', error.message);
        return [];
      }
      return data as Resolution[];
    },
  });

  const createResolution = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('weg_circulation_resolutions')
        .insert({
          property_id: propertyId,
          organization_id: organizationId,
          title,
          description,
          deadline,
          total_owners: parseInt(totalOwners) || 0,
          status: 'offen',
          votes_yes: 0,
          votes_no: 0,
          votes_abstain: 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circulation-resolutions'] });
      toast.success('Umlaufbeschluss erstellt');
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      setDeadline('');
      setTotalOwners('');
    },
    onError: (err: any) => {
      toast.error('Fehler: ' + err.message);
    },
  });

  const castVote = useMutation({
    mutationFn: async () => {
      if (!selectedResolution) return;
      const count = parseInt(voteCount) || 1;
      const field = voteType === 'yes' ? 'votes_yes' : voteType === 'no' ? 'votes_no' : 'votes_abstain';
      const currentValue = selectedResolution[field as keyof Resolution] as number;

      const updates: any = { [field]: currentValue + count };

      // Check if voting is complete
      const totalVotes =
        (voteType === 'yes' ? currentValue + count : selectedResolution.votes_yes) +
        (voteType === 'no' ? currentValue + count : selectedResolution.votes_no) +
        (voteType === 'abstain' ? currentValue + count : selectedResolution.votes_abstain);

      if (totalVotes >= selectedResolution.total_owners) {
        const yesVotes = voteType === 'yes' ? currentValue + count : selectedResolution.votes_yes;
        updates.status = yesVotes > selectedResolution.total_owners / 2 ? 'angenommen' : 'abgelehnt';
      }

      const { error } = await (supabase as any)
        .from('weg_circulation_resolutions')
        .update(updates)
        .eq('id', selectedResolution.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['circulation-resolutions'] });
      toast.success('Stimme(n) erfasst');
      setVoteDialogOpen(false);
      setSelectedResolution(null);
    },
    onError: (err: any) => {
      toast.error('Fehler: ' + err.message);
    },
  });

  const getProgress = (r: Resolution) => {
    const total = r.votes_yes + r.votes_no + r.votes_abstain;
    return r.total_owners > 0 ? Math.round((total / r.total_owners) * 100) : 0;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Neuer Umlaufbeschluss
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : resolutions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold mb-2">Keine Umlaufbeschlüsse</h3>
            <p className="text-sm max-w-md mx-auto">
              Erstellen Sie einen Umlaufbeschluss, um Eigentümer digital abstimmen zu lassen.
              Ideal für dringende Entscheidungen ohne physische Versammlung.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {resolutions.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Vote className="h-4 w-4" />
                    {r.title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={statusStyles[r.status]}>{statusLabels[r.status]}</Badge>
                    {r.status === 'offen' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedResolution(r);
                          setVoteCount('1');
                          setVoteType('yes');
                          setVoteDialogOpen(true);
                        }}
                      >
                        <Send className="h-3 w-3 mr-1" /> Stimme erfassen
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {r.description && (
                  <p className="text-sm text-muted-foreground mb-3">{r.description}</p>
                )}
                <div className="flex flex-wrap gap-4 text-sm mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Frist: {new Date(r.deadline).toLocaleDateString('de-AT')}
                  </span>
                  <span>Eigentümer: {r.total_owners}</span>
                  <span>Rücklauf: {getProgress(r)}%</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-green-600">{r.votes_yes}</p>
                    <p className="text-xs text-muted-foreground">Ja</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                    <XCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-600">{r.votes_no}</p>
                    <p className="text-xs text-muted-foreground">Nein</p>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <p className="text-lg font-bold text-muted-foreground mt-5">{r.votes_abstain}</p>
                    <p className="text-xs text-muted-foreground">Enthaltung</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${r.total_owners > 0 ? (r.votes_yes / r.total_owners) * 100 : 0}%` }}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${r.total_owners > 0 ? (r.votes_no / r.total_owners) * 100 : 0}%` }}
                    />
                    <div
                      className="bg-muted-foreground/30 transition-all"
                      style={{ width: `${r.total_owners > 0 ? (r.votes_abstain / r.total_owners) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Resolution Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuer Umlaufbeschluss</DialogTitle>
            <DialogDescription>
              Erstellen Sie einen Umlaufbeschluss gemäß § 24 Abs 6 WEG 2002.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titel *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Sanierung Fassade Innenhof"
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details zum Beschlussgegenstand..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Abstimmungsfrist *</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Anzahl Eigentümer *</Label>
                <Input
                  type="number"
                  min="1"
                  value={totalOwners}
                  onChange={(e) => setTotalOwners(e.target.value)}
                  placeholder="z.B. 12"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => createResolution.mutate()}
              disabled={!title || !deadline || !totalOwners || createResolution.isPending}
            >
              {createResolution.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Erstellen & versenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={voteDialogOpen} onOpenChange={setVoteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Stimme erfassen</DialogTitle>
            <DialogDescription>{selectedResolution?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Abstimmung</Label>
              <Select value={voteType} onValueChange={(v) => setVoteType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">✅ Ja</SelectItem>
                  <SelectItem value="no">❌ Nein</SelectItem>
                  <SelectItem value="abstain">⬜ Enthaltung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Anzahl Stimmen</Label>
              <Input
                type="number"
                min="1"
                value={voteCount}
                onChange={(e) => setVoteCount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={() => castVote.mutate()} disabled={castVote.isPending}>
              {castVote.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Stimme speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
