import { useState, useEffect } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useTenants } from '@/hooks/useTenants';
import { useUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useTenantPortalAccess, useCreateTenantPortalAccess, useToggleTenantPortalAccess } from '@/hooks/useTenantPortalAccess';
import { useInvoices } from '@/hooks/useInvoices';
import { usePayments } from '@/hooks/usePayments';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Home, Euro, FileText, Send, AlertTriangle,
  Download, CheckCircle, Clock, Info, Users, Plus, Shield
} from 'lucide-react';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(amount);
}

export default function TenantPortal() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: tenants } = useTenants();
  const { data: units } = useUnits();
  const { data: properties } = useProperties();
  const { data: portalAccess } = useTenantPortalAccess();
  const createAccess = useCreateTenantPortalAccess();
  const toggleAccess = useToggleTenantPortalAccess();
  const { data: invoices } = useInvoices();
  const { data: payments } = usePayments();

  const [activeTab, setActiveTab] = useState('overview');
  const [showGrantAccess, setShowGrantAccess] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [accessEmail, setAccessEmail] = useState('');

  // Check if the current user IS a tenant (portal view)
  const [isTenantView, setIsTenantView] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);

  useEffect(() => {
    if (!user || !portalAccess) return;
    const myAccess = portalAccess.find(a => a.user_id === user.id);
    if (myAccess) {
      setIsTenantView(true);
      const tenant = tenants?.find(t => t.id === myAccess.tenant_id);
      setTenantData(tenant);
    }
  }, [user, portalAccess, tenants]);

  const handleGrantAccess = async () => {
    if (!selectedTenantId || !accessEmail) return;
    await createAccess.mutateAsync({ tenant_id: selectedTenantId, email: accessEmail });
    setShowGrantAccess(false);
    setSelectedTenantId('');
    setAccessEmail('');
  };

  const activeTenants = tenants?.filter(t => t.status === 'aktiv') || [];

  // Admin/Manager View: Manage portal access
  if (!isTenantView) {
    return (
      <MainLayout title="Mieterportal" subtitle="Self-Service Zugang für Mieter verwalten">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Portal-Zugänge verwalten</h2>
            </div>
            <Button onClick={() => setShowGrantAccess(true)}>
              <Plus className="h-4 w-4 mr-2" /> Zugang einrichten
            </Button>
          </div>

          {!portalAccess || portalAccess.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Keine Portal-Zugänge</p>
                <p className="text-muted-foreground text-sm">Richten Sie Zugänge ein, damit Mieter ihre Daten einsehen können.</p>
                <Button className="mt-4" onClick={() => setShowGrantAccess(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Ersten Zugang einrichten
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mieter</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Letzter Login</TableHead>
                  <TableHead>Aktiv</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portalAccess.map(access => {
                  const tenant = tenants?.find(t => t.id === access.tenant_id);
                  return (
                    <TableRow key={access.id}>
                      <TableCell className="font-medium">
                        {tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unbekannt'}
                      </TableCell>
                      <TableCell>{access.email}</TableCell>
                      <TableCell>
                        {access.user_id ? (
                          <Badge className="bg-green-100 text-green-800">Registriert</Badge>
                        ) : (
                          <Badge variant="outline">Ausstehend</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {access.last_login_at
                          ? format(new Date(access.last_login_at), 'dd.MM.yyyy HH:mm', { locale: de })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={access.is_active}
                          onCheckedChange={(checked) => toggleAccess.mutate({ id: access.id, is_active: checked })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <Dialog open={showGrantAccess} onOpenChange={setShowGrantAccess}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Portal-Zugang einrichten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Mieter</Label>
                <Select value={selectedTenantId} onValueChange={(v) => {
                  setSelectedTenantId(v);
                  const tenant = activeTenants.find(t => t.id === v);
                  if (tenant?.email) setAccessEmail(tenant.email);
                }}>
                  <SelectTrigger><SelectValue placeholder="Mieter wählen..." /></SelectTrigger>
                  <SelectContent>
                    {activeTenants.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>E-Mail für Portal-Zugang</Label>
                <Input type="email" value={accessEmail} onChange={e => setAccessEmail(e.target.value)} placeholder="mieter@example.com" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGrantAccess(false)}>Abbrechen</Button>
              <Button onClick={handleGrantAccess} disabled={!selectedTenantId || !accessEmail}>Zugang erstellen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    );
  }

  // Tenant Self-Service View
  const tenantUnit = tenantData ? units?.find(u => u.id === tenantData.unit_id) : null;
  const tenantProperty = tenantUnit ? properties?.find(p => p.id === tenantUnit.property_id) : null;
  const tenantInvoices = invoices?.filter(i => i.tenant_id === tenantData?.id) || [];
  const tenantPayments = payments?.filter(p => p.tenant_id === tenantData?.id) || [];
  const balance = tenantInvoices
    .filter(i => i.status !== 'bezahlt')
    .reduce((sum, i) => sum + (i.gesamtbetrag || 0), 0);

  return (
    <MainLayout title="Mein Portal" subtitle={tenantProperty ? `${tenantProperty.name} – Top ${tenantUnit?.top_nummer}` : ''}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Top {tenantUnit?.top_nummer || '?'}</p>
                  <p className="text-sm text-muted-foreground">{tenantProperty?.address}</p>
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
                  <p className="font-medium">{formatCurrency(tenantData?.grundmiete || 0)}</p>
                  <p className="text-sm text-muted-foreground">Monatliche Miete</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${balance > 0 ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                  {balance > 0 ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <CheckCircle className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <p className="font-medium">{formatCurrency(balance)}</p>
                  <p className="text-sm text-muted-foreground">Offener Saldo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="invoices">
          <TabsList>
            <TabsTrigger value="invoices">Vorschreibungen</TabsTrigger>
            <TabsTrigger value="payments">Zahlungen</TabsTrigger>
          </TabsList>
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Meine Vorschreibungen</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Monat</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantInvoices.slice(0, 12).map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.month}/{inv.year}</TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.gesamtbetrag || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === 'bezahlt' ? 'default' : 'outline'}>
                            {inv.status === 'bezahlt' ? 'Bezahlt' : 'Offen'}
                          </Badge>
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
                <CardTitle>Meine Zahlungen</CardTitle>
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
                    {tenantPayments.slice(0, 12).map(pay => (
                      <TableRow key={pay.id}>
                        <TableCell>{format(new Date(pay.eingangs_datum), 'dd.MM.yyyy')}</TableCell>
                        <TableCell className="text-right">{formatCurrency(pay.betrag)}</TableCell>
                        <TableCell>{pay.zahlungsart}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
