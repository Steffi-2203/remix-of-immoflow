import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEbicsConnections, ebicsApi } from "@/hooks/useEbicsApi";
import { toast } from "sonner";
import { Plus, Key, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_init: { label: "Initialisierung ausstehend", variant: "secondary" },
  ini_sent: { label: "INI gesendet", variant: "outline" },
  hia_sent: { label: "HIA gesendet", variant: "outline" },
  awaiting_letters: { label: "Warte auf INI-Brief", variant: "outline" },
  active: { label: "Aktiv", variant: "default" },
  suspended: { label: "Gesperrt", variant: "destructive" },
  error: { label: "Fehler", variant: "destructive" },
};

export function EbicsConnectionSetup() {
  const { connections, isLoading, mutate } = useEbicsConnections();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    host_id: "",
    host_url: "",
    partner_id: "",
    user_id_ebics: "",
    bank_name: "",
  });

  const handleCreate = async () => {
    try {
      setLoading("create");
      await ebicsApi.createConnection(form);
      toast.success("EBICS-Verbindung erstellt");
      setOpen(false);
      setForm({ host_id: "", host_url: "", partner_id: "", user_id_ebics: "", bank_name: "" });
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleInitKeys = async (id: string) => {
    try {
      setLoading(`init-${id}`);
      await ebicsApi.initKeys(id);
      toast.success("Schlüssel generiert");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSendINI = async (id: string) => {
    try {
      setLoading(`ini-${id}`);
      await ebicsApi.sendINI(id);
      toast.success("INI-Order gesendet");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSendHIA = async (id: string) => {
    try {
      setLoading(`hia-${id}`);
      await ebicsApi.sendHIA(id);
      toast.success("HIA-Order gesendet");
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      setLoading(`activate-${id}`);
      await ebicsApi.activate(id);
      toast.success("Verbindung aktiviert");
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
        <h2 className="text-lg font-semibold">EBICS-Bankverbindungen</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Neue Verbindung</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>EBICS-Verbindung einrichten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} placeholder="z.B. Erste Bank" />
              </div>
              <div className="space-y-2">
                <Label>Host-ID *</Label>
                <Input value={form.host_id} onChange={e => setForm(f => ({ ...f, host_id: e.target.value }))} placeholder="Von Ihrer Bank erhalten" />
              </div>
              <div className="space-y-2">
                <Label>Host-URL *</Label>
                <Input value={form.host_url} onChange={e => setForm(f => ({ ...f, host_url: e.target.value }))} placeholder="https://ebics.bank.at/ebics" />
              </div>
              <div className="space-y-2">
                <Label>Partner-ID *</Label>
                <Input value={form.partner_id} onChange={e => setForm(f => ({ ...f, partner_id: e.target.value }))} placeholder="Kundennummer bei der Bank" />
              </div>
              <div className="space-y-2">
                <Label>User-ID *</Label>
                <Input value={form.user_id_ebics} onChange={e => setForm(f => ({ ...f, user_id_ebics: e.target.value }))} placeholder="EBICS Benutzer-ID" />
              </div>
              <Button onClick={handleCreate} disabled={!form.host_id || !form.host_url || !form.partner_id || !form.user_id_ebics || loading === "create"} className="w-full">
                {loading === "create" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verbindung erstellen
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-muted-foreground">Laden...</p>}

      {connections.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Noch keine EBICS-Verbindung eingerichtet. Erstellen Sie eine neue Verbindung, um loszulegen.
          </CardContent>
        </Card>
      )}

      {connections.map((conn: any) => {
        const statusInfo = STATUS_MAP[conn.status] || { label: conn.status, variant: "secondary" as const };

        return (
          <Card key={conn.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{conn.bank_name || conn.host_id}</CardTitle>
                  <CardDescription>
                    Partner: {conn.partner_id} · User: {conn.user_id_ebics}
                  </CardDescription>
                </div>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {conn.status === "pending_init" && (
                  <Button size="sm" variant="outline" onClick={() => handleInitKeys(conn.id)} disabled={!!loading}>
                    {loading === `init-${conn.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Key className="h-4 w-4 mr-1" />}
                    1. Schlüssel generieren
                  </Button>
                )}
                {(conn.status === "pending_init" && conn.signature_key_hash) && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleSendINI(conn.id)} disabled={!!loading}>
                      {loading === `ini-${conn.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                      2. INI senden
                    </Button>
                  </>
                )}
                {conn.status === "ini_sent" && (
                  <Button size="sm" variant="outline" onClick={() => handleSendHIA(conn.id)} disabled={!!loading}>
                    {loading === `hia-${conn.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                    3. HIA senden
                  </Button>
                )}
                {(conn.status === "hia_sent" || conn.status === "awaiting_letters") && (
                  <Button size="sm" onClick={() => handleActivate(conn.id)} disabled={!!loading}>
                    {loading === `activate-${conn.id}` ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    4. Aktivieren (nach Bankbestätigung)
                  </Button>
                )}
                {conn.status === "active" && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Bereit für Kontoabruf und Zahlungen
                  </Badge>
                )}
                {conn.status === "error" && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {conn.error_message || "Unbekannter Fehler"}
                  </div>
                )}
              </div>

              {conn.signature_key_hash && (
                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  <p>Signaturschlüssel: <code className="bg-muted px-1 rounded">{conn.signature_key_hash?.slice(0, 16)}…</code></p>
                  {conn.last_download_at && <p>Letzter Abruf: {new Date(conn.last_download_at).toLocaleString("de-AT")}</p>}
                  {conn.last_upload_at && <p>Letzte Zahlung: {new Date(conn.last_upload_at).toLocaleString("de-AT")}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
