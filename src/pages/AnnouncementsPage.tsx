import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useAllAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement, CATEGORY_LABELS } from '@/hooks/useAnnouncements';
import { useProperties } from '@/hooks/useProperties';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Megaphone, Plus, Trash2, Edit } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  allgemein: 'bg-blue-100 text-blue-800',
  wartung: 'bg-yellow-100 text-yellow-800',
  wichtig: 'bg-red-100 text-red-800',
  veranstaltung: 'bg-green-100 text-green-800',
};

export default function AnnouncementsPage() {
  const { data: organization } = useOrganization();
  const { data: properties } = useProperties();
  const { data: announcements, isLoading } = useAllAnnouncements();
  const { user } = useAuth();
  const createAnnouncement = useCreateAnnouncement();
  const updateAnnouncement = useUpdateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();

  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    title: '', content: '', category: 'allgemein' as string,
    property_id: '' as string, valid_from: format(new Date(), 'yyyy-MM-dd'), valid_until: '',
  });

  const handleCreate = async () => {
    if (!form.title || !form.content || !organization) return;
    await createAnnouncement.mutateAsync({
      organization_id: organization.id,
      property_id: form.property_id || null,
      title: form.title,
      content: form.content,
      category: form.category as any,
      is_active: true,
      valid_from: form.valid_from,
      valid_until: form.valid_until || null,
      created_by: user?.id || null,
    });
    setShowNew(false);
    setForm({ title: '', content: '', category: 'allgemein', property_id: '', valid_from: format(new Date(), 'yyyy-MM-dd'), valid_until: '' });
  };

  return (
    <MainLayout title="Mieterkommunikation" subtitle="Ankündigungen und Mitteilungen für Mieter">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Ankündigungen</h2>
          </div>
          <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />Neue Ankündigung</Button>
        </div>

        {!announcements || announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium">Keine Ankündigungen</p>
              <p className="text-muted-foreground text-sm">Erstellen Sie Ankündigungen, die Mieter im Portal sehen können.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {announcements.map(ann => {
              const property = properties?.find(p => p.id === ann.property_id);
              return (
                <Card key={ann.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={CATEGORY_COLORS[ann.category]}>{CATEGORY_LABELS[ann.category]}</Badge>
                          {property && <Badge variant="outline">{property.name}</Badge>}
                          {!ann.is_active && <Badge variant="secondary">Inaktiv</Badge>}
                        </div>
                        <h3 className="font-semibold text-lg">{ann.title}</h3>
                        <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{ann.content}</p>
                        <p className="text-xs text-muted-foreground mt-3">
                          Gültig ab {format(new Date(ann.valid_from), 'dd.MM.yyyy', { locale: de })}
                          {ann.valid_until && ` bis ${format(new Date(ann.valid_until), 'dd.MM.yyyy', { locale: de })}`}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Switch
                          checked={ann.is_active}
                          onCheckedChange={(checked) => updateAnnouncement.mutate({ id: ann.id, is_active: checked })}
                        />
                        <Button size="icon" variant="ghost" onClick={() => deleteAnnouncement.mutate(ann.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Neue Ankündigung</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Wartungsarbeiten im Stiegenhaus" />
            </div>
            <div className="space-y-2">
              <Label>Inhalt</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="Beschreibung der Ankündigung..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Liegenschaft (optional)</Label>
                <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle Liegenschaften</SelectItem>
                    {properties?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gültig ab</Label>
                <Input type="date" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Gültig bis (optional)</Label>
                <Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.content}>Veröffentlichen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
