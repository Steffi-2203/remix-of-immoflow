import { useState } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, type Employee } from '@/hooks/usePayrollApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const statusBadge: Record<string, string> = {
  aktiv: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  karenz: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ausgeschieden: 'bg-muted text-muted-foreground',
};

const beschaeftigungLabel: Record<string, string> = {
  geringfuegig: 'Geringfügig',
  teilzeit: 'Teilzeit',
  vollzeit: 'Vollzeit',
};

interface EmployeeFormData {
  vorname: string;
  nachname: string;
  svnr: string;
  geburtsdatum: string;
  adresse: string;
  plz: string;
  ort: string;
  eintrittsdatum: string;
  beschaeftigungsart: string;
  wochenstunden: string;
  bruttolohn_monatlich: string;
  kollektivvertrag_stufe: string;
  property_id: string;
}

const emptyForm: EmployeeFormData = {
  vorname: '', nachname: '', svnr: '', geburtsdatum: '', adresse: '', plz: '', ort: '',
  eintrittsdatum: new Date().toISOString().slice(0, 10), beschaeftigungsart: 'geringfuegig',
  wochenstunden: '0', bruttolohn_monatlich: '0', kollektivvertrag_stufe: '', property_id: '',
};

export function EmployeeList() {
  const { data: employees, isLoading } = useEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeFormData>(emptyForm);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({
      vorname: emp.vorname, nachname: emp.nachname, svnr: emp.svnr || '',
      geburtsdatum: emp.geburtsdatum || '', adresse: emp.adresse || '',
      plz: emp.plz || '', ort: emp.ort || '', eintrittsdatum: emp.eintrittsdatum,
      beschaeftigungsart: emp.beschaeftigungsart, wochenstunden: emp.wochenstunden || '0',
      bruttolohn_monatlich: emp.bruttolohn_monatlich, kollektivvertrag_stufe: emp.kollektivvertrag_stufe || '',
      property_id: emp.property_id || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...form } as any);
        toast.success('Mitarbeiter aktualisiert');
      } else {
        await createMutation.mutateAsync(form as any);
        toast.success('Mitarbeiter angelegt');
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Fehler beim Speichern');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Mitarbeiter wirklich als ausgeschieden markieren?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Mitarbeiter als ausgeschieden markiert');
    } catch (e: any) {
      toast.error(e.message || 'Fehler');
    }
  };

  const updateField = (field: keyof EmployeeFormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Hausbetreuer</CardTitle>
        <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Neuer Mitarbeiter</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Lade...</p>
        ) : !employees?.length ? (
          <p className="text-muted-foreground">Noch keine Hausbetreuer angelegt.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SVNR</TableHead>
                <TableHead>Beschäftigung</TableHead>
                <TableHead>Bruttolohn</TableHead>
                <TableHead>Eintritt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.nachname}, {emp.vorname}</TableCell>
                  <TableCell className="font-mono text-sm">{emp.svnr || '–'}</TableCell>
                  <TableCell>{beschaeftigungLabel[emp.beschaeftigungsart]}</TableCell>
                  <TableCell>€ {parseFloat(emp.bruttolohn_monatlich).toFixed(2)}</TableCell>
                  <TableCell>{emp.eintrittsdatum}</TableCell>
                  <TableCell>
                    <Badge className={statusBadge[emp.status]}>{emp.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {emp.status !== 'ausgeschieden' && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Mitarbeiter bearbeiten' : 'Neuer Hausbetreuer'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vorname *</Label>
              <Input value={form.vorname} onChange={e => updateField('vorname', e.target.value)} />
            </div>
            <div>
              <Label>Nachname *</Label>
              <Input value={form.nachname} onChange={e => updateField('nachname', e.target.value)} />
            </div>
            <div>
              <Label>SVNR</Label>
              <Input value={form.svnr} onChange={e => updateField('svnr', e.target.value)} placeholder="1234 010190" maxLength={10} />
            </div>
            <div>
              <Label>Geburtsdatum</Label>
              <Input type="date" value={form.geburtsdatum} onChange={e => updateField('geburtsdatum', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Adresse</Label>
              <Input value={form.adresse} onChange={e => updateField('adresse', e.target.value)} />
            </div>
            <div>
              <Label>PLZ</Label>
              <Input value={form.plz} onChange={e => updateField('plz', e.target.value)} />
            </div>
            <div>
              <Label>Ort</Label>
              <Input value={form.ort} onChange={e => updateField('ort', e.target.value)} />
            </div>
            <div>
              <Label>Eintrittsdatum *</Label>
              <Input type="date" value={form.eintrittsdatum} onChange={e => updateField('eintrittsdatum', e.target.value)} />
            </div>
            <div>
              <Label>Beschäftigungsart</Label>
              <Select value={form.beschaeftigungsart} onValueChange={v => updateField('beschaeftigungsart', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geringfuegig">Geringfügig</SelectItem>
                  <SelectItem value="teilzeit">Teilzeit</SelectItem>
                  <SelectItem value="vollzeit">Vollzeit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Wochenstunden</Label>
              <Input type="number" step="0.5" value={form.wochenstunden} onChange={e => updateField('wochenstunden', e.target.value)} />
            </div>
            <div>
              <Label>Bruttolohn monatlich (€) *</Label>
              <Input type="number" step="0.01" value={form.bruttolohn_monatlich} onChange={e => updateField('bruttolohn_monatlich', e.target.value)} />
            </div>
            <div>
              <Label>KV-Stufe</Label>
              <Input value={form.kollektivvertrag_stufe} onChange={e => updateField('kollektivvertrag_stufe', e.target.value)} placeholder="z.B. Stufe 1" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={!form.vorname || !form.nachname || !form.eintrittsdatum}>
              {editingId ? 'Speichern' : 'Anlegen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
