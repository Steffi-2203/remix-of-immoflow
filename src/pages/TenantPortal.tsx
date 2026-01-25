import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  Home, Euro, FileText, MessageSquare, AlertTriangle,
  Download, CheckCircle, Clock, Send, Info
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TenantInfo {
  id: string;
  name: string;
  unit: string;
  property: string;
  address: string;
  rentAmount: number;
  contractStart: string;
}

interface Invoice {
  id: string;
  month: number;
  year: number;
  amount: number;
  status: string;
  dueDate: string;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  reference: string;
}

interface DamageReport {
  id: string;
  title: string;
  description: string;
  status: 'offen' | 'in_bearbeitung' | 'erledigt';
  createdAt: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function TenantPortal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [damageTitle, setDamageTitle] = useState('');
  const [damageDescription, setDamageDescription] = useState('');
  const [damageCategory, setDamageCategory] = useState('');

  const mockTenant: TenantInfo = {
    id: '1',
    name: 'Max Mustermann',
    unit: 'Top 1',
    property: 'Musterhaus 1',
    address: 'Musterstraße 1, 1010 Wien',
    rentAmount: 850,
    contractStart: '2020-01-01',
  };

  const mockInvoices: Invoice[] = [
    { id: '1', month: 1, year: 2026, amount: 850, status: 'bezahlt', dueDate: '2026-01-05' },
    { id: '2', month: 12, year: 2025, amount: 850, status: 'bezahlt', dueDate: '2025-12-05' },
    { id: '3', month: 11, year: 2025, amount: 850, status: 'bezahlt', dueDate: '2025-11-05' },
  ];

  const mockPayments: Payment[] = [
    { id: '1', date: '2026-01-03', amount: 850, reference: 'Miete Januar 2026' },
    { id: '2', date: '2025-12-02', amount: 850, reference: 'Miete Dezember 2025' },
    { id: '3', date: '2025-11-04', amount: 850, reference: 'Miete November 2025' },
  ];

  const mockDamageReports: DamageReport[] = [
    { 
      id: '1', 
      title: 'Wasserhahn tropft', 
      description: 'Der Wasserhahn in der Küche tropft seit einer Woche.',
      status: 'in_bearbeitung',
      createdAt: '2025-12-15'
    },
  ];

  const handleSubmitDamageReport = () => {
    if (!damageTitle || !damageDescription || !damageCategory) {
      toast({
        title: 'Fehler',
        description: 'Bitte alle Felder ausfüllen',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Schadensmeldung gesendet',
      description: 'Ihre Meldung wurde erfolgreich übermittelt.',
    });
    setDamageTitle('');
    setDamageDescription('');
    setDamageCategory('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'bezahlt':
        return <Badge className="bg-green-500">Bezahlt</Badge>;
      case 'offen':
        return <Badge className="bg-yellow-500">Offen</Badge>;
      case 'ueberfaellig':
        return <Badge className="bg-red-500">Überfällig</Badge>;
      case 'in_bearbeitung':
        return <Badge className="bg-blue-500">In Bearbeitung</Badge>;
      case 'erledigt':
        return <Badge className="bg-green-500">Erledigt</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const balance = mockInvoices.filter(i => i.status !== 'bezahlt').reduce((sum, i) => sum + i.amount, 0);

  return (
    <MainLayout title="Mieterportal" subtitle="Self-Service für Mieter">
      <div className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Demo-Ansicht:</strong> Dies ist eine Vorschau des Mieterportals. Für Produktiveinsatz ist eine separate Mieter-Authentifizierung erforderlich.
          </AlertDescription>
        </Alert>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Willkommen, {mockTenant.name}</h1>
            <p className="text-muted-foreground">{mockTenant.property} - {mockTenant.unit}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card data-testid="card-tenant-unit">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{mockTenant.unit}</p>
                  <p className="text-sm text-muted-foreground">{mockTenant.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-tenant-rent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Euro className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">{formatCurrency(mockTenant.rentAmount)}</p>
                  <p className="text-sm text-muted-foreground">Monatliche Miete</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-tenant-balance">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${balance > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                  {balance > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{formatCurrency(balance)}</p>
                  <p className="text-sm text-muted-foreground">Offener Saldo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invoices" data-testid="tab-invoices">Vorschreibungen</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Zahlungen</TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">Dokumente</TabsTrigger>
            <TabsTrigger value="damage" data-testid="tab-damage">Schadensmeldung</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Ihre Vorschreibungen</CardTitle>
                <CardDescription>Übersicht aller monatlichen Vorschreibungen</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Monat</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead>Fällig am</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockInvoices.map(invoice => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {format(new Date(invoice.year, invoice.month - 1), 'MMMM yyyy', { locale: de })}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell>{format(new Date(invoice.dueDate), 'dd.MM.yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" data-testid={`button-download-invoice-${invoice.id}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Ihre Zahlungen</CardTitle>
                <CardDescription>Übersicht aller eingegangenen Zahlungen</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead>Verwendungszweck</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPayments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>{format(new Date(payment.date), 'dd.MM.yyyy')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{payment.reference}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Dokumente</CardTitle>
                <CardDescription>Mietvertrag, Abrechnungen und weitere Dokumente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Mietvertrag</p>
                        <p className="text-sm text-muted-foreground">Abgeschlossen am {format(new Date(mockTenant.contractStart), 'dd.MM.yyyy')}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-download-contract">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Betriebskostenabrechnung 2024</p>
                        <p className="text-sm text-muted-foreground">Erstellt am 15.03.2025</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-download-settlement">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Übergabeprotokoll</p>
                        <p className="text-sm text-muted-foreground">Vom {format(new Date(mockTenant.contractStart), 'dd.MM.yyyy')}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-download-protocol">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="damage">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Neue Schadensmeldung</CardTitle>
                  <CardDescription>Melden Sie Schäden oder Mängel in Ihrer Wohnung</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="damage-category">Kategorie</Label>
                    <Select value={damageCategory} onValueChange={setDamageCategory}>
                      <SelectTrigger id="damage-category" data-testid="select-damage-category">
                        <SelectValue placeholder="Kategorie wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sanitaer">Sanitär</SelectItem>
                        <SelectItem value="elektrik">Elektrik</SelectItem>
                        <SelectItem value="heizung">Heizung</SelectItem>
                        <SelectItem value="fenster">Fenster/Türen</SelectItem>
                        <SelectItem value="feuchtigkeit">Feuchtigkeit</SelectItem>
                        <SelectItem value="sonstiges">Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="damage-title">Titel</Label>
                    <Input 
                      id="damage-title"
                      placeholder="Kurze Beschreibung des Schadens"
                      value={damageTitle}
                      onChange={(e) => setDamageTitle(e.target.value)}
                      data-testid="input-damage-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="damage-description">Beschreibung</Label>
                    <Textarea 
                      id="damage-description"
                      placeholder="Detaillierte Beschreibung des Schadens..."
                      value={damageDescription}
                      onChange={(e) => setDamageDescription(e.target.value)}
                      rows={4}
                      data-testid="textarea-damage-description"
                    />
                  </div>

                  <Button onClick={handleSubmitDamageReport} className="w-full" data-testid="button-submit-damage">
                    <Send className="h-4 w-4 mr-2" />
                    Schadensmeldung senden
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ihre Meldungen</CardTitle>
                  <CardDescription>Status Ihrer Schadensmeldungen</CardDescription>
                </CardHeader>
                <CardContent>
                  {mockDamageReports.length > 0 ? (
                    <div className="space-y-3">
                      {mockDamageReports.map(report => (
                        <div key={report.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{report.title}</p>
                            {getStatusBadge(report.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Gemeldet am {format(new Date(report.createdAt), 'dd.MM.yyyy')}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>Keine offenen Meldungen</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
