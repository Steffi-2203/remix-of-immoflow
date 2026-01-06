import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Search, 
  Loader2, 
  Euro, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Users,
  Info,
  ArrowRightLeft
} from 'lucide-react';
import { useTenants } from '@/hooks/useTenants';
import { useUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useInvoices } from '@/hooks/useInvoices';
import { useTransactions, useUpdateTransaction } from '@/hooks/useTransactions';
import { useAccountCategories } from '@/hooks/useAccountCategories';
import { format, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function PaymentList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  const { data: tenants } = useTenants();
  const { data: units } = useUnits();
  const { data: properties } = useProperties();
  const { data: invoices } = useInvoices();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { data: categories } = useAccountCategories();
  const updateTransaction = useUpdateTransaction();

  // Get Mieteinnahmen category
  const mieteinnahmenCategory = useMemo(() => {
    return categories?.find(c => c.name === 'Mieteinnahmen' && c.type === 'income');
  }, [categories]);

  // Filter transactions to only show Mieteinnahmen (rental income)
  const rentalIncomeTransactions = useMemo(() => {
    if (!transactions || !mieteinnahmenCategory) return [];
    return transactions
      .filter(t => t.category_id === mieteinnahmenCategory.id && t.amount > 0)
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [transactions, mieteinnahmenCategory]);

  // Filter by search query
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return rentalIncomeTransactions;
    const searchLower = searchQuery.toLowerCase();
    return rentalIncomeTransactions.filter(t => {
      const tenant = tenants?.find(tenant => tenant.id === t.tenant_id);
      const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}`.toLowerCase() : '';
      return (
        t.reference?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower) ||
        tenantName.includes(searchLower)
      );
    });
  }, [rentalIncomeTransactions, searchQuery, tenants]);

  // Calculate stats from transactions
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthTransactions = rentalIncomeTransactions.filter(t => {
      const date = new Date(t.transaction_date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    return {
      total: rentalIncomeTransactions.length,
      totalAmount: rentalIncomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
      thisMonth: thisMonthTransactions.length,
      thisMonthAmount: thisMonthTransactions.reduce((sum, t) => sum + Number(t.amount), 0),
    };
  }, [rentalIncomeTransactions]);

  // Calculate open items (offene Posten) per tenant - based on invoices vs transactions
  const openItemsPerTenant = useMemo(() => {
    if (!tenants || !invoices || !rentalIncomeTransactions) return [];

    const activeTenants = tenants.filter(t => t.status === 'aktiv');
    
    return activeTenants.map(tenant => {
      // Get all invoices for this tenant
      const tenantInvoices = invoices.filter(i => i.tenant_id === tenant.id);
      const openInvoices = tenantInvoices.filter(i => i.status === 'offen' || i.status === 'teilbezahlt' || i.status === 'ueberfaellig');
      
      // Calculate total Soll (what should be paid)
      const totalSoll = tenantInvoices.reduce((sum, i) => sum + Number(i.gesamtbetrag), 0);
      
      // Calculate total Ist from transactions (what was paid)
      const tenantPayments = rentalIncomeTransactions.filter(t => t.tenant_id === tenant.id);
      const totalIst = tenantPayments.reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Saldo (negative = owes money)
      const saldo = totalIst - totalSoll;
      
      // Find oldest overdue invoice for Mahnstatus
      const today = new Date();
      let oldestOverdueDays = 0;
      let oldestOverdueInvoice: any = null;
      
      openInvoices.forEach(inv => {
        const dueDate = new Date(inv.faellig_am);
        if (dueDate < today) {
          const daysDue = differenceInDays(today, dueDate);
          if (daysDue > oldestOverdueDays) {
            oldestOverdueDays = daysDue;
            oldestOverdueInvoice = inv;
          }
        }
      });

      // Determine Mahnstatus
      let mahnstatus = 'aktuell';
      if (oldestOverdueDays > 30) {
        mahnstatus = '2. Mahnung';
      } else if (oldestOverdueDays > 14) {
        mahnstatus = '1. Mahnung';
      } else if (oldestOverdueDays > 0) {
        mahnstatus = 'Zahlungserinnerung';
      }

      // Get unit info
      const unit = units?.find(u => u.id === tenant.unit_id);

      return {
        tenant,
        unit,
        openInvoices,
        totalSoll,
        totalIst,
        saldo,
        oldestOverdueDays,
        oldestOverdueInvoice,
        mahnstatus,
      };
    }).filter(item => item.saldo < 0 || item.openInvoices.length > 0)
      .sort((a, b) => a.saldo - b.saldo); // Sort by saldo ascending (most debt first)
  }, [tenants, invoices, rentalIncomeTransactions, units]);

  const openItemsStats = {
    totalTenants: openItemsPerTenant.length,
    totalOpenAmount: openItemsPerTenant.reduce((sum, item) => sum + Math.abs(Math.min(0, item.saldo)), 0),
    overdueCount: openItemsPerTenant.filter(item => item.oldestOverdueDays > 0).length,
  };

  // Helper to get tenant and unit info for a transaction
  // If tenant_id is set, use that. Otherwise, try to find active tenant for the unit_id
  const getTransactionDetails = (transaction: any) => {
    let tenant = null;
    let unit = null;

    // First try direct tenant_id
    if (transaction.tenant_id) {
      tenant = tenants?.find(t => t.id === transaction.tenant_id);
    }
    
    // Get unit info
    if (transaction.unit_id) {
      unit = units?.find(u => u.id === transaction.unit_id);
      
      // If no tenant found via tenant_id, try to find active tenant for this unit
      if (!tenant && unit) {
        tenant = tenants?.find(t => t.unit_id === transaction.unit_id && t.status === 'aktiv');
      }
    }
    
    return { tenant, unit };
  };

  // Handle reassignment of unmatched transactions
  const handleReassign = (transaction: any) => {
    setSelectedTransaction(transaction);
    setSelectedTenantId('');
    setReassignDialogOpen(true);
  };

  const confirmReassign = async () => {
    if (!selectedTransaction || !selectedTenantId) return;
    
    const tenant = tenants?.find(t => t.id === selectedTenantId);
    if (!tenant) return;

    try {
      await updateTransaction.mutateAsync({
        id: selectedTransaction.id,
        tenant_id: selectedTenantId,
        unit_id: tenant.unit_id,
        status: 'matched',
        matched_at: new Date().toISOString(),
        // matched_by is a UUID in the database; leave it empty here to avoid invalid values
      });

      toast.success(`Transaktion wurde ${tenant.first_name} ${tenant.last_name} zugeordnet`);
      setReassignDialogOpen(false);
      setSelectedTransaction(null);
      setSelectedTenantId('');
    } catch (error) {
      console.error('Reassign transaction error:', error);
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(`Fehler beim Zuordnen: ${message}`);
    }
  };

  // Group tenants by property for better overview (include all tenants for payment assignment)
  const tenantsByProperty = useMemo(() => {
    if (!tenants || !units || !properties) return [];
    
    // Include all tenants (aktiv and beendet) for payment assignment
    const grouped: { property: any; activeTenants: any[]; formerTenants: any[] }[] = [];
    
    properties.forEach(property => {
      const propertyUnits = units.filter(u => u.property_id === property.id);
      const allPropertyTenants = tenants.filter(t => 
        propertyUnits.some(u => u.id === t.unit_id)
      ).map(t => ({
        ...t,
        unit: propertyUnits.find(u => u.id === t.unit_id)
      }));
      
      const activeTenants = allPropertyTenants.filter(t => t.status === 'aktiv');
      const formerTenants = allPropertyTenants.filter(t => t.status === 'beendet');
      
      if (allPropertyTenants.length > 0) {
        grouped.push({ property, activeTenants, formerTenants });
      }
    });
    
    return grouped;
  }, [tenants, units, properties]);

  return (
    <MainLayout
      title="Mieteinnahmen"
      subtitle="Übersicht der Mieteinnahmen aus der Buchhaltung"
    >
      {/* Info Alert */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Diese Übersicht zeigt alle Mieteinnahmen aus der Buchhaltung. 
          Neue Zahlungen werden über <strong>Banking → Transaktionen</strong> erfasst und automatisch hier angezeigt.
        </AlertDescription>
      </Alert>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Referenz oder Mieter suchen..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zahlungen gesamt</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Euro className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gesamtbetrag</p>
                <p className="text-2xl font-bold">€ {stats.totalAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diesen Monat</p>
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Euro className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Betrag diesen Monat</p>
                <p className="text-2xl font-bold">€ {stats.thisMonthAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Payments and Open Items */}
      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Zahlungseingänge
          </TabsTrigger>
          <TabsTrigger value="openitems" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Offene Posten
            {openItemsStats.totalTenants > 0 && (
              <Badge variant="destructive" className="ml-1">{openItemsStats.totalTenants}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          {/* Payments Table */}
          <Card>
            <CardContent className="p-0">
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !filteredTransactions || filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Keine Mieteinnahmen gefunden</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Erfassen Sie Zahlungen über Banking → Transaktionen mit der Kategorie "Mieteinnahmen".
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Mieter</TableHead>
                      <TableHead>Top</TableHead>
                      <TableHead>Beschreibung</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => {
                      const { tenant, unit } = getTransactionDetails(transaction);

                      return (
                        <TableRow key={transaction.id} className={!tenant ? 'bg-orange-50 dark:bg-orange-950/20' : ''}>
                          <TableCell>
                            {format(new Date(transaction.transaction_date), 'dd.MM.yyyy', { locale: de })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {tenant ? `${tenant.first_name} ${tenant.last_name}` : (
                              <span className="text-orange-600 italic">Nicht zugeordnet</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {unit ? unit.top_nummer : '-'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.description || transaction.reference || '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            € {Number(transaction.amount).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {tenant ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Zugeordnet
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                Nicht zugeordnet
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!tenant && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleReassign(transaction)}
                                className="h-7 text-xs"
                              >
                                <ArrowRightLeft className="h-3 w-3 mr-1" />
                                Umbuchen
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Open Items Tab */}
        <TabsContent value="openitems">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <Users className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mieter mit Rückstand</p>
                    <p className="text-2xl font-bold">{openItemsStats.totalTenants}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <Euro className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Offener Gesamtbetrag</p>
                    <p className="text-2xl font-bold text-red-600">€ {openItemsStats.totalOpenAmount.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Überfällig</p>
                    <p className="text-2xl font-bold text-orange-600">{openItemsStats.overdueCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {openItemsPerTenant.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <p className="text-muted-foreground">Keine offenen Posten</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Alle Mieter sind auf dem aktuellen Stand.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mieter</TableHead>
                      <TableHead>Top</TableHead>
                      <TableHead className="text-right">Soll</TableHead>
                      <TableHead className="text-right">Gezahlt</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Tage überfällig</TableHead>
                      <TableHead>Mahnstatus</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openItemsPerTenant.map((item) => (
                      <TableRow key={item.tenant.id}>
                        <TableCell className="font-medium">
                          {item.tenant.first_name} {item.tenant.last_name}
                        </TableCell>
                        <TableCell>{item.unit?.top_nummer || '-'}</TableCell>
                        <TableCell className="text-right">
                          € {item.totalSoll.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          € {item.totalIst.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          € {item.saldo.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          {item.oldestOverdueDays > 0 ? (
                            <span className="text-orange-600 font-medium">{item.oldestOverdueDays} Tage</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.mahnstatus === 'aktuell' ? (
                            <Badge variant="secondary">Aktuell</Badge>
                          ) : item.mahnstatus === 'Zahlungserinnerung' ? (
                            <Badge className="bg-yellow-100 text-yellow-800">Zahlungserinnerung</Badge>
                          ) : item.mahnstatus === '1. Mahnung' ? (
                            <Badge className="bg-orange-100 text-orange-800">1. Mahnung</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">2. Mahnung</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reassignment Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zahlung zuordnen</DialogTitle>
            <DialogDescription>
              Ordnen Sie diese Zahlung einem Mieter zu.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Zahlung vom {format(new Date(selectedTransaction.transaction_date), 'dd.MM.yyyy', { locale: de })}</p>
                <p className="font-semibold text-lg text-green-600">
                  € {Number(selectedTransaction.amount).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
                {selectedTransaction.description && (
                  <p className="text-sm mt-1">{selectedTransaction.description}</p>
                )}
                {selectedTransaction.counterpart_name && (
                  <p className="text-sm text-muted-foreground">Von: {selectedTransaction.counterpart_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Mieter auswählen</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mieter wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenantsByProperty.map(({ property, activeTenants, formerTenants }) => (
                      <SelectGroup key={property.id}>
                        <SelectLabel className="text-muted-foreground">
                          🏠 {property.name} - Aktive Mieter
                        </SelectLabel>
                        {activeTenants.map(tenant => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.first_name} {tenant.last_name} (Top {tenant.unit?.top_nummer})
                          </SelectItem>
                        ))}
                        {formerTenants.length > 0 && (
                          <>
                            <SelectLabel className="text-muted-foreground mt-2">
                              📋 {property.name} - Altmieter
                            </SelectLabel>
                            {formerTenants.map(tenant => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                {tenant.first_name} {tenant.last_name} (Top {tenant.unit?.top_nummer})
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={confirmReassign}
                  disabled={!selectedTenantId || updateTransaction.isPending}
                >
                  {updateTransaction.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Zuordnen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
