import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertCircle, Mail, Clock, Euro, Users, AlertTriangle, CheckCircle, Send, FileDown, Phone, MoreHorizontal, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useDunningOverview, getDaysOverdue, DunningCase } from '@/hooks/useDunningOverview';
import { useSendDunning, getDunningStatusLabel, getNextDunningAction } from '@/hooks/useDunning';
import { useProperties } from '@/hooks/useProperties';
import { useDemoData } from '@/contexts/DemoDataContext';
import { toast } from 'sonner';
import { generateDunningPdf } from '@/utils/dunningPdfExport';
import { supabase } from '@/integrations/supabase/client';

export default function Dunning({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [filterMahnstufe, setFilterMahnstufe] = useState<string>('all');
  const [filterProperty, setFilterProperty] = useState<string>('all');
  
  const { data, isLoading } = useDunningOverview();
  const { data: properties } = useProperties();
  const sendDunning = useSendDunning();
  
  const cases = data?.cases || [];
  const stats = data?.stats || { totalCases: 0, totalOpen: 0, totalReminded: 0, totalDunned: 0, totalAmount: 0 };
  
  const filteredCases = cases.filter((c) => {
    if (filterMahnstufe !== 'all' && c.highestMahnstufe !== parseInt(filterMahnstufe)) {
      return false;
    }
    if (filterProperty !== 'all' && c.propertyId !== filterProperty) {
      return false;
    }
    return true;
  });
  
  const { isDemoMode } = useDemoData();

  const handleSendDunning = async (dunningCase: DunningCase) => {
    if (isDemoMode) {
      toast.info('Mahnversand ist im Demo-Modus nicht verfügbar');
      return;
    }
    const nextAction = getNextDunningAction(dunningCase.highestMahnstufe);
    if (!nextAction || !dunningCase.email) return;
    
    // Send for the oldest unpaid invoice
    const oldestInvoice = dunningCase.invoices[0];
    if (!oldestInvoice) return;
    
    await sendDunning.mutateAsync({
      invoiceId: oldestInvoice.id,
      dunningLevel: nextAction.level,
      tenantEmail: dunningCase.email,
      tenantName: dunningCase.tenantName,
      propertyName: dunningCase.propertyName,
      unitNumber: dunningCase.unitNumber,
      amount: dunningCase.totalAmount,
      dueDate: oldestInvoice.faellig_am,
      invoiceMonth: oldestInvoice.month,
      invoiceYear: oldestInvoice.year,
    });
  };

  const handleDownloadPdf = (dunningCase: DunningCase, level: 1 | 2) => {
    const oldestInvoice = dunningCase.invoices[0];
    if (!oldestInvoice) return;
    generateDunningPdf({
      tenantName: dunningCase.tenantName,
      propertyName: dunningCase.propertyName,
      unitNumber: dunningCase.unitNumber,
      amount: dunningCase.totalAmount,
      dueDate: oldestInvoice.faellig_am,
      invoiceMonth: oldestInvoice.month,
      invoiceYear: oldestInvoice.year,
      dunningLevel: level,
    });
    toast.success('PDF wurde heruntergeladen');
  };

  const handleMarkManualDunning = async (dunningCase: DunningCase, level: 1 | 2) => {
    if (isDemoMode) {
      toast.info('Im Demo-Modus nicht verfügbar');
      return;
    }
    const oldestInvoice = dunningCase.invoices[0];
    if (!oldestInvoice) return;

    const updateData: Record<string, unknown> = { mahnstufe: level };
    if (level === 1) {
      updateData.zahlungserinnerung_am = new Date().toISOString();
    } else {
      updateData.mahnung_am = new Date().toISOString();
    }

    const { error } = await supabase
      .from('monthly_invoices')
      .update(updateData)
      .eq('id', oldestInvoice.id);

    if (error) {
      toast.error('Fehler beim Aktualisieren');
      return;
    }
    toast.success(level === 1 ? 'Als brieflich erinnert markiert' : 'Als brieflich gemahnt markiert');
  };

  const handlePhoneNote = (dunningCase: DunningCase) => {
    if (dunningCase.phone) {
      toast.info(`Telefonnummer: ${dunningCase.phone}`, { duration: 8000 });
    } else {
      toast.warning('Keine Telefonnummer hinterlegt – bitte Mieterdaten ergänzen');
    }
  };

  const handleEditTenant = (dunningCase: DunningCase) => {
    navigate(`/mieter/${dunningCase.tenantId}/bearbeiten`);
  };
  
  const getMahnstufeColor = (stufe: number) => {
    switch (stufe) {
      case 0: return 'bg-yellow-500';
      case 1: return 'bg-orange-500';
      case 2: return 'bg-red-500';
      default: return 'bg-muted';
    }
  };
  
  const content = (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Mahnwesen</h1>
          <p className="text-muted-foreground">
            Übersicht und Verwaltung offener Zahlungen
          </p>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalCases}</p>
                  <p className="text-xs text-muted-foreground">Fälle gesamt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalOpen}</p>
                  <p className="text-xs text-muted-foreground">Noch nicht erinnert</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalReminded}</p>
                  <p className="text-xs text-muted-foreground">Erinnert</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalDunned}</p>
                  <p className="text-xs text-muted-foreground">Gemahnt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Euro className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {stats.totalAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })} €
                  </p>
                  <p className="text-xs text-muted-foreground">Offener Betrag</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4">
          <Select value={filterMahnstufe} onValueChange={setFilterMahnstufe}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alle Mahnstufen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Mahnstufen</SelectItem>
              <SelectItem value="0">Noch nicht erinnert</SelectItem>
              <SelectItem value="1">Zahlungserinnerung</SelectItem>
              <SelectItem value="2">Mahnung</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Alle Liegenschaften" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Liegenschaften</SelectItem>
              {properties?.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Offene Fälle</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium">Keine offenen Fälle</h3>
                <p className="text-muted-foreground">
                  {filterMahnstufe !== 'all' || filterProperty !== 'all'
                    ? 'Keine Fälle mit diesen Filterkriterien'
                    : 'Alle Zahlungen sind beglichen'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mieter</TableHead>
                    <TableHead>Liegenschaft</TableHead>
                    <TableHead>Einheit</TableHead>
                    <TableHead className="text-center">Offene Rechnungen</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead className="text-center">Überfällig</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((dunningCase) => {
                    const daysOverdue = getDaysOverdue(dunningCase.oldestOverdue);
                    const nextAction = getNextDunningAction(dunningCase.highestMahnstufe);
                    
                    return (
                      <TableRow key={dunningCase.tenantId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{dunningCase.tenantName}</p>
                            {dunningCase.email ? (
                              <p className="text-xs text-muted-foreground">{dunningCase.email}</p>
                            ) : (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Keine E-Mail hinterlegt
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{dunningCase.propertyName}</TableCell>
                        <TableCell>{dunningCase.unitNumber}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{dunningCase.invoices.length}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {dunningCase.totalAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })} €
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={daysOverdue > 30 ? 'destructive' : 'outline'}>
                            {daysOverdue} Tage
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${getMahnstufeColor(dunningCase.highestMahnstufe)}`} />
                            <span className="text-sm">
                              {getDunningStatusLabel(dunningCase.highestMahnstufe)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Primary action: Email if available */}
                            {nextAction && dunningCase.email ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant={dunningCase.highestMahnstufe === 0 ? 'outline' : 'destructive'}
                                    onClick={() => handleSendDunning(dunningCase)}
                                    disabled={sendDunning.isPending}
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    {nextAction.label}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>E-Mail an {dunningCase.email} senden</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : !nextAction ? (
                              <Badge variant="secondary">Abgeschlossen</Badge>
                            ) : null}

                            {/* Fallback / additional actions dropdown */}
                            {nextAction && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleDownloadPdf(dunningCase, nextAction.level)}>
                                    <FileDown className="h-4 w-4 mr-2" />
                                    {nextAction.level === 1 ? 'Erinnerung' : 'Mahnung'} als PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleMarkManualDunning(dunningCase, nextAction.level)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Als brieflich versendet markieren
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePhoneNote(dunningCase)}>
                                    <Phone className="h-4 w-4 mr-2" />
                                    Telefonisch erinnern
                                    {dunningCase.phone && (
                                      <span className="ml-auto text-xs text-muted-foreground">{dunningCase.phone}</span>
                                    )}
                                  </DropdownMenuItem>
                                  {!dunningCase.email && (
                                    <DropdownMenuItem onClick={() => handleEditTenant(dunningCase)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      E-Mail nachtragen
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );

  if (embedded) return content;

  return (
    <MainLayout title="Mahnwesen" subtitle="Übersicht und Verwaltung offener Zahlungen">
      {content}
    </MainLayout>
  );
}
