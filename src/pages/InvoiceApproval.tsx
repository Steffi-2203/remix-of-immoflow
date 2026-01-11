import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  FileCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Calendar,
  Euro,
  Building2,
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import {
  usePendingInvoices,
  useApproveInvoice,
  useRejectInvoice,
} from '@/hooks/useMaintenanceInvoices';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function InvoiceApprovalPage() {
  const permissions = usePermissions();
  const { data: invoices, isLoading } = usePendingInvoices();
  const approveInvoice = useApproveInvoice();
  const rejectInvoice = useRejectInvoice();

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  if (!permissions.canApproveInvoices && !permissions.isAdmin) {
    return (
      <MainLayout title="Keine Berechtigung" subtitle="">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Sie haben keine Berechtigung für diese Seite.
          </p>
        </div>
      </MainLayout>
    );
  }

  const handleApprove = async (invoiceId: string) => {
    await approveInvoice.mutateAsync(invoiceId);
  };

  const handleRejectClick = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedInvoiceId || !rejectionReason.trim()) return;

    await rejectInvoice.mutateAsync({
      invoiceId: selectedInvoiceId,
      reason: rejectionReason,
    });

    setShowRejectDialog(false);
    setSelectedInvoiceId(null);
    setRejectionReason('');
  };

  return (
    <MainLayout
      title="Rechnungsfreigabe"
      subtitle="Wartungsrechnungen prüfen und freigeben"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Keine Rechnungen zur Freigabe</p>
            <p className="text-muted-foreground text-sm mt-1">
              Alle Rechnungen wurden bearbeitet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {invoices.length} Rechnung{invoices.length !== 1 ? 'en' : ''} zur Freigabe
            </p>
          </div>

          {invoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  {/* Invoice Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {invoice.invoice_number
                              ? `Rechnung ${invoice.invoice_number}`
                              : 'Rechnung (ohne Nummer)'}
                          </h3>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            Ausstehend
                          </Badge>
                        </div>
                        {invoice.maintenance_tasks && (
                          <p className="text-sm text-muted-foreground mt-1">
                            <Building2 className="h-4 w-4 inline mr-1" />
                            {invoice.maintenance_tasks.title}
                            {invoice.maintenance_tasks.properties && (
                              <> – {invoice.maintenance_tasks.properties.name}</>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          € {Number(invoice.amount).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(invoice.invoice_date), 'dd.MM.yyyy', { locale: de })}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Handwerker / Firma</p>
                        <p className="font-medium">{invoice.contractor_name}</p>
                      </div>

                      {invoice.notes && (
                        <div>
                          <p className="text-muted-foreground">Notizen</p>
                          <p>{invoice.notes}</p>
                        </div>
                      )}
                    </div>

                    {invoice.document_url && (
                      <a
                        href={invoice.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Rechnung ansehen
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-3">
                    <Button
                      className="flex-1 lg:flex-none"
                      onClick={() => handleApprove(invoice.id)}
                      disabled={approveInvoice.isPending}
                    >
                      {approveInvoice.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Freigeben
                    </Button>

                    <Button
                      variant="destructive"
                      className="flex-1 lg:flex-none"
                      onClick={() => handleRejectClick(invoice.id)}
                      disabled={rejectInvoice.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Ablehnen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechnung ablehnen</DialogTitle>
            <DialogDescription>
              Bitte geben Sie einen Grund für die Ablehnung an.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ablehnungsgrund *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="z.B. Betrag zu hoch, Leistung nicht erbracht..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || rejectInvoice.isPending}
            >
              {rejectInvoice.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
