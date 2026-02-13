import { useState } from 'react';
import { useEmployees, usePayrollEntries, useCalculatePayroll, useFinalizePayroll, type Employee } from '@/hooks/usePayrollApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, Check } from 'lucide-react';
import { toast } from 'sonner';

const months = [
  'Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function PayrollCalculation() {
  const { data: employees } = useEmployees();
  const calculateMutation = useCalculatePayroll();
  const finalizeMutation = useFinalizePayroll();

  const now = new Date();
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data: payrollEntries, isLoading } = usePayrollEntries(selectedEmployee, selectedYear);

  const activeEmployees = employees?.filter(e => e.status === 'aktiv') || [];

  const handleCalculate = async () => {
    if (!selectedEmployee) return toast.error('Bitte Mitarbeiter auswählen');
    try {
      await calculateMutation.mutateAsync({
        employeeId: selectedEmployee,
        year: selectedYear,
        month: selectedMonth,
      });
      toast.success(`Abrechnung ${months[selectedMonth - 1]} ${selectedYear} berechnet`);
    } catch (e: any) {
      toast.error(e.message || 'Fehler bei Berechnung');
    }
  };

  const handleFinalize = async (entryId: string) => {
    try {
      await finalizeMutation.mutateAsync(entryId);
      toast.success('Abrechnung freigegeben');
    } catch (e: any) {
      toast.error(e.message || 'Fehler bei Freigabe');
    }
  };

  const fmt = (v: string | number) => `€ ${parseFloat(String(v)).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lohnabrechnung berechnen</CardTitle>
        </CardHeader>
        <CardContent>
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
              <label className="text-sm font-medium mb-1 block">Monat</label>
              <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Jahr</label>
              <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCalculate} disabled={!selectedEmployee || calculateMutation.isPending}>
              <Calculator className="h-4 w-4 mr-1" />
              Berechnen
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <Card>
          <CardHeader>
            <CardTitle>Abrechnungen {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Lade...</p>
            ) : !payrollEntries?.length ? (
              <p className="text-muted-foreground">Keine Abrechnungen für dieses Jahr.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Monat</TableHead>
                      <TableHead className="text-right">Brutto</TableHead>
                      <TableHead className="text-right">SV-DN</TableHead>
                      <TableHead className="text-right">LSt</TableHead>
                      <TableHead className="text-right">Netto</TableHead>
                      <TableHead className="text-right">SV-DG</TableHead>
                      <TableHead className="text-right">DB+DZ</TableHead>
                      <TableHead className="text-right">KommSt</TableHead>
                      <TableHead className="text-right">MVK</TableHead>
                      <TableHead className="text-right">Gesamt DG</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollEntries.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{months[entry.month - 1]}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(entry.bruttolohn)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(entry.sv_dn)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(entry.lohnsteuer)}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{fmt(entry.nettolohn)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(entry.sv_dg)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(parseFloat(entry.db_beitrag) + parseFloat(entry.dz_beitrag))}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(entry.kommunalsteuer)}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(entry.mvk_beitrag)}</TableCell>
                        <TableCell className="text-right font-mono font-bold">{fmt(entry.gesamtkosten_dg)}</TableCell>
                        <TableCell>
                          <Badge variant={entry.status === 'freigegeben' ? 'default' : entry.status === 'ausbezahlt' ? 'secondary' : 'outline'}>
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.status === 'entwurf' && (
                            <Button size="sm" variant="outline" onClick={() => handleFinalize(entry.id)}>
                              <Check className="h-3 w-3 mr-1" /> Freigeben
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
