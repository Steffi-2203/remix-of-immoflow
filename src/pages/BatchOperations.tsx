import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, FileCheck, Layers } from 'lucide-react';
import { BatchRentAdjustmentDialog } from '@/components/batch/BatchRentAdjustmentDialog';
import { BatchInvoiceActionsDialog } from '@/components/batch/BatchInvoiceActionsDialog';

export default function BatchOperations() {
  const [rentDialogOpen, setRentDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const actions = [
    {
      title: 'Massen-Mietanpassung',
      description: 'Grundmieten, BK- oder HK-Vorschüsse für mehrere Mieter prozentual oder absolut anpassen.',
      icon: TrendingUp,
      onClick: () => setRentDialogOpen(true),
    },
    {
      title: 'Sammel-Freigabe / Stornierung',
      description: 'Mehrere Vorschreibungen gleichzeitig als bezahlt markieren oder stornieren.',
      icon: FileCheck,
      onClick: () => setInvoiceDialogOpen(true),
    },
  ];

  return (
    <MainLayout title="Massenaktionen" subtitle="Batch-Operationen für große Bestände">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6" />
            Massenaktionen
          </h1>
          <p className="text-muted-foreground mt-1">
            Effiziente Verwaltung großer Bestände mit Sammel-Operationen
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {actions.map((action) => (
            <Card key={action.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  {action.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{action.description}</p>
                <Button onClick={action.onClick}>Starten</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <BatchRentAdjustmentDialog open={rentDialogOpen} onOpenChange={setRentDialogOpen} />
      <BatchInvoiceActionsDialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen} />
    </MainLayout>
  );
}
