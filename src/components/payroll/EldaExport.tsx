import { useState } from 'react';
import { useEmployees, useGenerateEldaXml, useEldaSubmissions, useCreateEldaSubmission } from '@/hooks/usePayrollApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Download, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';

const meldungsartLabels: Record<string, string> = {
  anmeldung: 'Anmeldung',
  abmeldung: 'Abmeldung',
  aenderung: 'Änderungsmeldung',
  beitragsgrundlage: 'Beitragsgrundlage (mBGM)',
};

const statusColors: Record<string, string> = {
  erstellt: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  uebermittelt: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  bestaetigt: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  fehler: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function EldaExport() {
  const { data: employees } = useEmployees();
  const { data: submissions } = useEldaSubmissions();
  const generateXml = useGenerateEldaXml();
  const createSubmission = useCreateEldaSubmission();

  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [meldungsart, setMeldungsart] = useState('anmeldung');
  const [generatedXml, setGeneratedXml] = useState('');

  const activeEmployees = employees?.filter(e => e.status !== 'ausgeschieden') || [];

  const handleGenerate = async () => {
    if (!selectedEmployee) return toast.error('Bitte Mitarbeiter auswählen');
    try {
      const result = await generateXml.mutateAsync({ employeeId: selectedEmployee, meldungsart });
      setGeneratedXml(result.xml);
      toast.success('ELDA-XML generiert');
    } catch (e: any) {
      toast.error(e.message || 'Fehler bei XML-Generierung');
    }
  };

  const handleDownload = () => {
    if (!generatedXml) return;
    const blob = new Blob([generatedXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elda_${meldungsart}_${new Date().toISOString().slice(0, 10)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSubmission = async () => {
    if (!generatedXml || !selectedEmployee) return;
    try {
      await createSubmission.mutateAsync({
        employee_id: selectedEmployee,
        meldungsart: meldungsart as any,
        zeitraum: new Date().toISOString().slice(0, 7),
        xml_content: generatedXml,
        status: 'erstellt',
      });
      toast.success('ELDA-Meldung gespeichert');
    } catch (e: any) {
      toast.error(e.message || 'Fehler beim Speichern');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ELDA-XML generieren
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Mitarbeiter</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger><SelectValue placeholder="Auswählen..." /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nachname}, {emp.vorname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Meldungsart</label>
              <Select value={meldungsart} onValueChange={setMeldungsart}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anmeldung">Anmeldung</SelectItem>
                  <SelectItem value="abmeldung">Abmeldung</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={!selectedEmployee || generateXml.isPending}>
              <FileText className="h-4 w-4 mr-1" /> Generieren
            </Button>
          </div>

          {generatedXml && (
            <div className="space-y-3">
              <Textarea value={generatedXml} readOnly rows={12} className="font-mono text-xs" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" /> XML herunterladen
                </Button>
                <Button onClick={handleSaveSubmission}>
                  <Send className="h-4 w-4 mr-1" /> Als Meldung speichern
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meldungshistorie</CardTitle>
        </CardHeader>
        <CardContent>
          {!submissions?.length ? (
            <p className="text-muted-foreground">Noch keine ELDA-Meldungen vorhanden.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Meldungsart</TableHead>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell>{new Date(sub.created_at).toLocaleDateString('de-AT')}</TableCell>
                    <TableCell>{meldungsartLabels[sub.meldungsart] || sub.meldungsart}</TableCell>
                    <TableCell>{sub.zeitraum || '–'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[sub.status]}>{sub.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
