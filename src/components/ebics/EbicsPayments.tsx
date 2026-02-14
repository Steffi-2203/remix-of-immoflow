import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEbicsPaymentBatches, ebicsApi } from "@/hooks/useEbicsApi";
import { toast } from "sonner";
import { Plus, Send, CheckCircle2, Loader2, Euro } from "lucide-react";

interface Props {
  connectionId: string;
}

const BATCH_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Entwurf", variant: "secondary" },
  approved: { label: "Freigegeben", variant: "outline" },
  submitted: { label: "Übermittelt", variant: "default" },
  accepted: { label: "Akzeptiert", variant: "default" },
  rejected: { label: "Abgelehnt", variant: "destructive" },
  partially_accepted: { label: "Teilweise akzeptiert", variant: "outline" },
};

export function EbicsPayments({ connectionId }: Props) {
  const { batches, isLoading, mutate } = useEbicsPaymentBatches();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const [form, setForm] = useState({
    batch_type: "vendor_payment",
    sender_name: "",
    sender_iban: "",
    sender_bic: "",
    recipient_name: "",
    recipient_iban: "",
    amount: "",
    reference: "",
    description: "",
  });

  const handleCreate = async () => {
    try {
      setLoading("create");
      await ebicsApi.createPaymentBatch({
        connection_id: connectionId,
        batch_type: form.batch_type,
        sender_name: form.sender_name,
        sender_iban: form.sender_iban,
        sender_bic: form.sender_bic,
        payments: [
          {
            recipientName: form.recipient_name,
            recipientIban: form.recipient_iban,
            amount: parseFloat(form.amount),
            reference: form.reference,
            description: form.description,
          },
        ],
      });
      toast.success("Zahlungsauftrag erstellt");
      setOpen(false);
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setLoading(`approve-${id}`);
      await ebicsApi.approveBatch(id);
      toast.success("Zahlungsauftrag freigegeben");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      setLoading(`submit-${id}`);
      const result = await ebicsApi.submitBatch(id);
      if (result.success) {
        toast.success("Zahlungsauftrag an Bank übermittelt");
      } else {
        toast.error(`Fehler: ${result.technicalCode}`);
      }
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Zahlungsaufträge (SEPA CCT)</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Neuer Auftrag</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Zahlungsauftrag erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Auftragsart</Label>
                <Select value={form.batch_type} onValueChange={v => setForm(f => ({ ...f, batch_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor_payment">Lieferantenzahlung</SelectItem>
                    <SelectItem value="rent_collection">Mieteinzug</SelectItem>
                    <SelectItem value="custom">Sonstige</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Auftraggeber</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={form.sender_name} onChange={e => setForm(f => ({ ...f, sender_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IBAN</Label>
                    <Input value={form.sender_iban} onChange={e => setForm(f => ({ ...f, sender_iban: e.target.value }))} placeholder="AT..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">BIC</Label>
                    <Input value={form.sender_bic} onChange={e => setForm(f => ({ ...f, sender_bic: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Empfänger</p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IBAN</Label>
                    <Input value={form.recipient_iban} onChange={e => setForm(f => ({ ...f, recipient_iban: e.target.value }))} placeholder="AT..." />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Betrag (EUR)</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Referenz</Label>
                    <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Verwendungszweck</Label>
                    <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
              </div>

              <Button onClick={handleCreate} disabled={loading === "create" || !form.sender_name || !form.sender_iban || !form.sender_bic || !form.recipient_name || !form.recipient_iban || !form.amount} className="w-full">
                {loading === "create" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Auftrag erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Laden...</p>}

      {batches.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Noch keine Zahlungsaufträge. Erstellen Sie einen neuen Auftrag.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {batches.map((batch: any) => {
          const statusInfo = BATCH_STATUS[batch.status] || { label: batch.status, variant: "secondary" as const };
          return (
            <Card key={batch.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Euro className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {Number(batch.total_amount).toLocaleString("de-AT", { style: "currency", currency: "EUR" })}
                        <span className="text-muted-foreground text-sm ml-2">
                          ({batch.payment_count} {batch.payment_count === 1 ? "Zahlung" : "Zahlungen"})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {batch.batch_type === "vendor_payment" ? "Lieferant" : batch.batch_type === "rent_collection" ? "Mieteinzug" : "Sonstige"}
                        {" · "}
                        {new Date(batch.created_at).toLocaleString("de-AT")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    {batch.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => handleApprove(batch.id)} disabled={!!loading}>
                        {loading === `approve-${batch.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Freigeben
                      </Button>
                    )}
                    {batch.status === "approved" && (
                      <Button size="sm" onClick={() => handleSubmit(batch.id)} disabled={!!loading}>
                        {loading === `submit-${batch.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                        An Bank senden
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
