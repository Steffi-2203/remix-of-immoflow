import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useEbicsOrders, ebicsApi } from "@/hooks/useEbicsApi";
import { toast } from "sonner";
import { Download, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  connectionId: string;
}

export function EbicsStatements({ connectionId }: Props) {
  const { orders, isLoading, mutate } = useEbicsOrders(connectionId);
  const [downloading, setDownloading] = useState(false);
  const [orderType, setOrderType] = useState<string>("C53");

  const statementOrders = orders.filter((o: any) => o.order_type === "STA" || o.order_type === "C53");

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const result = await ebicsApi.downloadStatements(connectionId, orderType);
      if (result.success) {
        const msg = result.importResult
          ? `Kontoauszug abgerufen und ${result.importResult.imported || 0} Transaktionen importiert`
          : "Kontoauszug erfolgreich abgerufen";
        toast.success(msg);
      } else {
        toast.error(`Fehler: ${result.technicalCode}`);
      }
      mutate();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Kontoauszüge abrufen</CardTitle>
          <CardDescription>
            Kontoauszüge direkt von Ihrer Bank herunterladen und automatisch importieren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="C53">CAMT.053 (empfohlen)</SelectItem>
                  <SelectItem value="STA">MT940 (Legacy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Kontoauszug abrufen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abruf-Historie</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Laden...</p>}
          {statementOrders.length === 0 && !isLoading && (
            <p className="text-muted-foreground text-sm">Noch keine Kontoauszüge abgerufen.</p>
          )}
          <div className="space-y-2">
            {statementOrders.map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {order.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{order.order_type} – {order.order_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("de-AT")}
                    </p>
                  </div>
                </div>
                <Badge variant={order.status === "completed" ? "default" : "destructive"}>
                  {order.status === "completed" ? "Erfolgreich" : "Fehler"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
