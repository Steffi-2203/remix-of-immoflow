import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EbicsConnectionSetup } from "@/components/ebics/EbicsConnectionSetup";
import { EbicsStatements } from "@/components/ebics/EbicsStatements";
import { EbicsPayments } from "@/components/ebics/EbicsPayments";
import { EbicsOrderLog } from "@/components/ebics/EbicsOrderLog";
import { useEbicsConnections } from "@/hooks/useEbicsApi";
import { Landmark, Download, Upload, ScrollText } from "lucide-react";

export default function EbicsBanking() {
  const { connections, isLoading } = useEbicsConnections();
  const [activeTab, setActiveTab] = useState("connections");

  const activeConnection = connections.find((c: any) => c.status === "active");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">EBICS Live-Banking</h1>
        <p className="text-muted-foreground">
          Direkte Bankanbindung für automatische Kontoauszüge und Zahlungsaufträge
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Verbindungen
          </TabsTrigger>
          <TabsTrigger value="statements" className="flex items-center gap-2" disabled={!activeConnection}>
            <Download className="h-4 w-4" />
            Kontoauszüge
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2" disabled={!activeConnection}>
            <Upload className="h-4 w-4" />
            Zahlungen
          </TabsTrigger>
          <TabsTrigger value="log" className="flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Protokoll
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <EbicsConnectionSetup />
        </TabsContent>

        <TabsContent value="statements">
          {activeConnection && <EbicsStatements connectionId={activeConnection.id} />}
        </TabsContent>

        <TabsContent value="payments">
          {activeConnection && <EbicsPayments connectionId={activeConnection.id} />}
        </TabsContent>

        <TabsContent value="log">
          <EbicsOrderLog connectionId={activeConnection?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
