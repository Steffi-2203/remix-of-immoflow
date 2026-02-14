import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEbicsOrders } from "@/hooks/useEbicsApi";
import { ArrowUp, ArrowDown } from "lucide-react";

interface Props {
  connectionId?: string;
}

export function EbicsOrderLog({ connectionId }: Props) {
  const { orders, isLoading } = useEbicsOrders(connectionId);

  if (!connectionId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Wählen Sie eine aktive EBICS-Verbindung, um das Protokoll zu sehen.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">EBICS-Auftragsprotokoll</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground text-sm">Laden...</p>}
        {orders.length === 0 && !isLoading && (
          <p className="text-muted-foreground text-sm">Noch keine Aufträge protokolliert.</p>
        )}
        <div className="space-y-2">
          {orders.map((order: any) => (
            <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
              <div className="flex items-center gap-3">
                {order.direction === "upload" ? (
                  <ArrowUp className="h-4 w-4 text-primary" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-accent-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {order.order_type}
                    {order.order_id && <span className="text-muted-foreground ml-2">#{order.order_id}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("de-AT")}
                    {order.technical_code && ` · Code: ${order.technical_code}`}
                  </p>
                </div>
              </div>
              <Badge variant={order.status === "completed" ? "default" : order.status === "error" ? "destructive" : "secondary"}>
                {order.status === "completed" ? "OK" : order.status === "error" ? "Fehler" : order.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
