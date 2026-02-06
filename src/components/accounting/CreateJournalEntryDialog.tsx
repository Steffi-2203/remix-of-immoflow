import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { useCreateJournalEntry } from '@/hooks/useJournalEntries';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Line {
  account_id: string;
  debit: string;
  credit: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateJournalEntryDialog({ open, onOpenChange }: Props) {
  const { data: accounts } = useChartOfAccounts();
  const createEntry = useCreateJournalEntry();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [belegNr, setBelegNr] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { account_id: '', debit: '', credit: '' },
    { account_id: '', debit: '', credit: '' },
  ]);

  const updateLine = (idx: number, field: keyof Line, value: string) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines((prev) => [...prev, { account_id: '', debit: '', credit: '' }]);

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error('Bitte Beschreibung eingeben');
      return;
    }
    if (!isBalanced || totalDebit === 0) {
      toast.error('Soll und Haben müssen gleich sein und > 0');
      return;
    }
    const validLines = lines.filter((l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) {
      toast.error('Mindestens 2 Buchungszeilen erforderlich');
      return;
    }

    await createEntry.mutateAsync({
      entry_date: date,
      description,
      beleg_nummer: belegNr || undefined,
      source_type: 'manual',
      lines: validLines.map((l) => ({
        account_id: l.account_id,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })),
    });

    onOpenChange(false);
    setDescription('');
    setBelegNr('');
    setLines([
      { account_id: '', debit: '', credit: '' },
      { account_id: '', debit: '', credit: '' },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manuelle Buchung erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Datum</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Beschreibung</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Buchungstext" />
            </div>
            <div className="space-y-1">
              <Label>Beleg-Nr.</Label>
              <Input value={belegNr} onChange={(e) => setBelegNr(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Buchungszeilen</Label>
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Select value={line.account_id} onValueChange={(v) => updateLine(idx, 'account_id', v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Konto wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(accounts || []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_number} – {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Soll"
                  value={line.debit}
                  onChange={(e) => {
                    updateLine(idx, 'debit', e.target.value);
                    if (parseFloat(e.target.value) > 0) updateLine(idx, 'credit', '');
                  }}
                  className="w-[110px]"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Haben"
                  value={line.credit}
                  onChange={(e) => {
                    updateLine(idx, 'credit', e.target.value);
                    if (parseFloat(e.target.value) > 0) updateLine(idx, 'debit', '');
                  }}
                  className="w-[110px]"
                />
                <Button variant="ghost" size="icon" onClick={() => removeLine(idx)} disabled={lines.length <= 2}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addLine} className="gap-1">
              <Plus className="h-3 w-3" /> Zeile hinzufügen
            </Button>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-sm space-x-4">
              <span>Soll: <strong>{totalDebit.toFixed(2)} €</strong></span>
              <span>Haben: <strong>{totalCredit.toFixed(2)} €</strong></span>
              {isBalanced && totalDebit > 0 ? (
                <span className="text-green-600 font-medium">✓ Ausgeglichen</span>
              ) : (
                <span className="text-destructive font-medium">
                  Differenz: {Math.abs(totalDebit - totalCredit).toFixed(2)} €
                </span>
              )}
            </div>
            <Button onClick={handleSubmit} disabled={!isBalanced || totalDebit === 0 || createEntry.isPending}>
              {createEntry.isPending ? 'Wird gebucht...' : 'Buchen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
