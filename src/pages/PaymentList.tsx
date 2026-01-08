import { useState, useMemo, useCallback } from 'react';
import { getActiveTenantsForPeriod } from '@/utils/tenantFilterUtils';
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
import { usePayments } from '@/hooks/usePayments';
import { useTransactions, useUpdateTransaction } from '@/hooks/useTransactions';
import { useAccountCategories } from '@/hooks/useAccountCategories';
import { useAssignPaymentWithSplit, calculatePaymentSplit } from '@/hooks/usePaymentSplit';
import { useCombinedPayments } from '@/hooks/useCombinedPayments';
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
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [splitPreview, setSplitPreview] = useState<{ bk: number; hk: number; miete: number } | null>(null);

  const { data: tenants } = useTenants();
  const { data: units } = useUnits();
  const { data: properties } = useProperties();
  const { data: payments } = usePayments();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { data: categories } = useAccountCategories();
  const { data: combinedPayments } = useCombinedPayments();
  const updateTransaction = useUpdateTransaction();
  const assignPaymentWithSplit = useAssignPaymentWithSplit();

  // Get income categories
  const mieteinnahmenCategory = useMemo(() => {
    return categories?.find(c => c.name === 'Mieteinnahmen' && c.type === 'income');
  }, [categories]);

  const bkCategory = useMemo(() => {
    return categories?.find(c => c.name === 'Betriebskostenvorauszahlungen' && c.type === 'income');
  }, [categories]);

  const hkCategory = useMemo(() => {
    return categories?.find(c => c.name === 'Heizungskostenvorauszahlungen' && c.type === 'income');
  }, [categories]);

  // Filter transactions to only show rental income (Mieteinnahmen, BK, HK)
  const incomeCategories = useMemo(() => {
    return [mieteinnahmenCategory?.id, bkCategory?.id, hkCategory?.id].filter(Boolean);
  }, [mieteinnahmenCategory, bkCategory, hkCategory]);

  // Get unit IDs for selected property
  const propertyUnitIds = useMemo(() => {
    if (!units || selectedPropertyId === 'all') return null;
    return units.filter(u => u.property_id === selectedPropertyId).map(u => u.id);
  }, [units, selectedPropertyId]);

  const rentalIncomeTransactions = useMemo(() => {
    if (!transactions || incomeCategories.length === 0) return [];
    let filtered = transactions
      .filter(t => incomeCategories.includes(t.category_id) && t.amount > 0);
    
    // Filter by property if selected
    if (propertyUnitIds) {
      filtered = filtered.filter(t => {
        // Check via unit_id on transaction
        if (t.unit_id && propertyUnitIds.includes(t.unit_id)) return true;
        // Check via tenant's unit
        if (t.tenant_id) {
          const tenant = tenants?.find(ten => ten.id === t.tenant_id);
          if (tenant && propertyUnitIds.includes(tenant.unit_id)) return true;
        }
        return false;
      });
    }
    
    return filtered.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [transactions, incomeCategories, propertyUnitIds, tenants]);

  // Filter payments by property and current month (same as Reports logic)
  const filteredPayments = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    let filtered = (payments || []).filter(p => {
      const date = new Date(p.eingangs_datum);
      return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
    });
    
    // Filter by property if selected
    if (propertyUnitIds) {
      filtered = filtered.filter(p => {
        const tenant = tenants?.find(t => t.id === p.tenant_id);
        return tenant && propertyUnitIds.includes(tenant.unit_id);
      });
    }
    
    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const tenant = tenants?.find(t => t.id === p.tenant_id);
        const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}`.toLowerCase() : '';
        return (
          p.referenz?.toLowerCase().includes(searchLower) ||
          tenantName.includes(searchLower)
        );
      });
    }
    
    return filtered.sort((a, b) => new Date(b.eingangs_datum).getTime() - new Date(a.eingangs_datum).getTime());
  }, [payments, propertyUnitIds, tenants, searchQuery]);

  // Calculate stats using SAME LOGIC as Reports page (SOLL from tenants, IST from combined payments)
  // Also calculate Unterzahlung and Überzahlung separately per tenant
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Get relevant units based on property filter
    const relevantUnits = propertyUnitIds 
      ? units?.filter(u => propertyUnitIds.includes(u.id)) 
      : units;
    
    // Verwendet zentrale Utility-Funktion für konsistente Logik
    // WICHTIG: Nur EIN aktiver Mieter pro Unit, nur Mieter mit Mietbeginn im/vor dem Monat
    const activeTenants = getActiveTenantsForPeriod(
      relevantUnits || [],
      tenants || [],
      selectedPropertyId,
      currentYear,
      currentMonth
    );
    
    // SOLL from tenant data (same as Reports page)
    const totalSoll = activeTenants.reduce((sum, t) => 
      sum + Number(t.grundmiete || 0) + 
            Number(t.betriebskosten_vorschuss || 0) + 
            Number(t.heizungskosten_vorschuss || 0), 0);
    
    // IST from COMBINED payments (payments table + transactions with tenant_id)
    const thisMonthPayments = (combinedPayments || []).filter(p => {
      const date = new Date(p.date);
      if (date.getMonth() + 1 !== currentMonth || date.getFullYear() !== currentYear) return false;
      
      // Filter by property if selected
      if (propertyUnitIds) {
        const tenant = tenants?.find(t => t.id === p.tenant_id);
        return tenant && propertyUnitIds.includes(tenant.unit_id);
      }
      return true;
    });
    
    const totalIst = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    
    // Calculate per-tenant saldos to separate Unterzahlung and Überzahlung
    let totalUnterzahlung = 0;
    let totalUeberzahlung = 0;
    
    activeTenants.forEach(tenant => {
      const sollTenant = Number(tenant.grundmiete || 0) + 
                         Number(tenant.betriebskosten_vorschuss || 0) + 
                         Number(tenant.heizungskosten_vorschuss || 0);
      
      const istTenant = thisMonthPayments
        .filter(p => p.tenant_id === tenant.id)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      
      const saldoTenant = istTenant - sollTenant;
      
      if (saldoTenant < 0) {
        totalUnterzahlung += Math.abs(saldoTenant);
      } else if (saldoTenant > 0) {
        totalUeberzahlung += saldoTenant;
      }
    });

    return {
      totalSoll,
      totalIst,
      totalUnterzahlung,
      totalUeberzahlung,
      paymentCount: thisMonthPayments.length,
    };
  }, [tenants, combinedPayments, propertyUnitIds, units, selectedPropertyId]);

  // Calculate open items (offene Posten) per tenant - using same logic as Reports page
  // SOLL from tenant data, IST from COMBINED payments (payments + transactions)
  const openItemsPerTenant = useMemo(() => {
    if (!tenants || !combinedPayments || !units) return [];

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get relevant units based on property filter
    const relevantUnits = propertyUnitIds 
      ? units.filter(u => propertyUnitIds.includes(u.id)) 
      : units;
    
    // Verwendet zentrale Utility-Funktion für konsistente Logik
    // WICHTIG: Nur EIN aktiver Mieter pro Unit, nur Mieter mit Mietbeginn im/vor dem Monat
    const activeTenants = getActiveTenantsForPeriod(
      relevantUnits,
      tenants,
      selectedPropertyId,
      currentYear,
      currentMonth
    );
    
    return activeTenants.map(tenant => {
      // SOLL from tenant data (same as Reports page)
      const monthlyTotal = Number(tenant.grundmiete || 0) + 
                           Number(tenant.betriebskosten_vorschuss || 0) + 
                           Number(tenant.heizungskosten_vorschuss || 0);
      const totalSoll = monthlyTotal; // For current month
      
      // IST from COMBINED payments for current month
      const tenantPayments = combinedPayments.filter(p => {
        if (p.tenant_id !== tenant.id) return false;
        const paymentDate = new Date(p.date);
        return paymentDate.getMonth() + 1 === currentMonth && 
               paymentDate.getFullYear() === currentYear;
      });
      const totalIst = tenantPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      
      // Saldo: negative = owes money (SOLL > IST means tenant needs to pay)
      const saldo = totalIst - totalSoll;
      
      // Days overdue: if we're past the 5th of the month and saldo is negative
      const dayOfMonth = now.getDate();
      const daysOverdue = saldo < 0 && dayOfMonth > 5 ? dayOfMonth - 5 : 0;

      // Determine Mahnstatus based on days overdue
      let mahnstatus = 'aktuell';
      if (daysOverdue > 30) {
        mahnstatus = '2. Mahnung';
      } else if (daysOverdue > 14) {
        mahnstatus = '1. Mahnung';
      } else if (daysOverdue > 0) {
        mahnstatus = 'Zahlungserinnerung';
      }

      // Get unit info
      const unit = units?.find(u => u.id === tenant.unit_id);

      return {
        tenant,
        unit,
        totalSoll,
        totalIst,
        saldo,
        oldestOverdueDays: daysOverdue,
        mahnstatus,
      };
    }).filter(item => item.saldo !== 0) // Show both underpayments AND overpayments
      .sort((a, b) => a.saldo - b.saldo); // Sort by saldo ascending (most debt first)
  }, [tenants, combinedPayments, units, propertyUnitIds, selectedPropertyId]);

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
    setSplitPreview(null);
    setReassignDialogOpen(true);
  };

  // Update split preview when tenant is selected
  const handleTenantSelect = useCallback((tenantId: string) => {
    setSelectedTenantId(tenantId);
    
    if (!selectedTransaction || !tenantId) {
      setSplitPreview(null);
      return;
    }
    
    const tenant = tenants?.find(t => t.id === tenantId);
    if (!tenant) {
      setSplitPreview(null);
      return;
    }
    
    const paymentAmount = Number(selectedTransaction.amount);
    const bkSoll = Number(tenant.betriebskosten_vorschuss || 0);
    const hkSoll = Number(tenant.heizungskosten_vorschuss || 0);
    const mieteSoll = Number(tenant.grundmiete || 0);
    
    // Calculate preview
    let remaining = paymentAmount;
    const bk = Math.min(remaining, bkSoll);
    remaining -= bk;
    const hk = Math.min(remaining, hkSoll);
    remaining -= hk;
    const miete = remaining;
    
    setSplitPreview({ bk, hk, miete });
  }, [selectedTransaction, tenants]);

  const confirmReassign = async () => {
    if (!selectedTransaction || !selectedTenantId) return;
    
    const tenant = tenants?.find(t => t.id === selectedTenantId);
    if (!tenant) return;

    // Check if we have the required categories for splitting
    if (mieteinnahmenCategory && bkCategory) {
      try {
        await assignPaymentWithSplit.mutateAsync({
          transactionId: selectedTransaction.id,
          tenantId: selectedTenantId,
          unitId: tenant.unit_id,
          paymentAmount: Number(selectedTransaction.amount),
          tenant: {
            betriebskosten_vorschuss: Number(tenant.betriebskosten_vorschuss || 0),
            heizungskosten_vorschuss: Number(tenant.heizungskosten_vorschuss || 0),
            grundmiete: Number(tenant.grundmiete || 0),
          },
          categories: {
            bkCategoryId: bkCategory.id,
            hkCategoryId: hkCategory?.id || mieteinnahmenCategory.id,
            mieteCategoryId: mieteinnahmenCategory.id,
          },
        });

        setReassignDialogOpen(false);
        setSelectedTransaction(null);
        setSelectedTenantId('');
        setSplitPreview(null);
      } catch (error) {
        console.error('Reassign transaction error:', error);
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        toast.error(`Fehler beim Zuordnen: ${message}`);
      }
    } else {
      // Fallback: simple assignment without splitting
      try {
        await updateTransaction.mutateAsync({
          id: selectedTransaction.id,
          tenant_id: selectedTenantId,
          unit_id: tenant.unit_id,
          status: 'matched',
          matched_at: new Date().toISOString(),
        });

        toast.success(`Transaktion wurde ${tenant.first_name} ${tenant.last_name} zugeordnet`);
        setReassignDialogOpen(false);
        setSelectedTransaction(null);
        setSelectedTenantId('');
        setSplitPreview(null);
      } catch (error) {
        console.error('Reassign transaction error:', error);
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
        toast.error(`Fehler beim Zuordnen: ${message}`);
      }
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

      {/* Filter Bar */}
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
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Liegenschaft wählen" />
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

      {/* Statistics - SOLL/IST matching Reports logic */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Euro className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SOLL (diesen Monat)</p>
                <p className="text-2xl font-bold">€ {stats.totalSoll.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
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
                <p className="text-sm text-muted-foreground">IST (diesen Monat)</p>
                <p className="text-2xl font-bold">€ {stats.totalIst.toLocaleString('de-AT', { minimumFractionDigits: 2 })}</p>
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
                <p className="text-sm text-muted-foreground">Saldo Unterzahlung</p>
                <p className="text-2xl font-bold text-red-600">
                  € {stats.totalUnterzahlung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
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
                <p className="text-sm text-muted-foreground">Überzahlung</p>
                <p className="text-2xl font-bold text-green-600">
                  € {stats.totalUeberzahlung.toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                </p>
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
          {/* Payments Table - using payments table like Reports page */}
          <Card>
            <CardContent className="p-0">
              {!payments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Keine Zahlungen in diesem Monat gefunden</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Zahlungen werden automatisch aus Transaktionen synchronisiert.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Eingangsdatum</TableHead>
                      <TableHead>Mieter</TableHead>
                      <TableHead>Top</TableHead>
                      <TableHead>Referenz</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead>Zahlungsart</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => {
                      const tenant = tenants?.find(t => t.id === payment.tenant_id);
                      const unit = tenant ? units?.find(u => u.id === tenant.unit_id) : null;

                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {format(new Date(payment.eingangs_datum), 'dd.MM.yyyy', { locale: de })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {tenant ? `${tenant.first_name} ${tenant.last_name}` : '-'}
                          </TableCell>
                          <TableCell>
                            {unit ? unit.top_nummer : '-'}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {payment.referenz || '-'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            € {Number(payment.betrag).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {payment.zahlungsart === 'sepa' ? 'SEPA' : 
                               payment.zahlungsart === 'ueberweisung' ? 'Überweisung' : 
                               payment.zahlungsart === 'bar' ? 'Bar' : 'Sonstige'}
                            </Badge>
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
      <Dialog open={reassignDialogOpen} onOpenChange={(open) => {
        setReassignDialogOpen(open);
        if (!open) {
          setSplitPreview(null);
          setSelectedTenantId('');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zahlung zuordnen</DialogTitle>
            <DialogDescription>
              Ordnen Sie diese Zahlung einem Mieter zu. Die Zahlung wird automatisch auf BK, Heizung und Miete aufgeteilt (MRG-konform).
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
                <Select value={selectedTenantId} onValueChange={handleTenantSelect}>
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

              {/* Split Preview */}
              {splitPreview && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Automatische Aufteilung (MRG-konform):
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center p-2 bg-white dark:bg-background rounded">
                      <p className="text-muted-foreground text-xs">Betriebskosten</p>
                      <p className="font-semibold">€ {splitPreview.bk.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-background rounded">
                      <p className="text-muted-foreground text-xs">Heizung</p>
                      <p className="font-semibold">€ {splitPreview.hk.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-background rounded">
                      <p className="text-muted-foreground text-xs">Miete</p>
                      <p className="font-semibold">€ {splitPreview.miete.toFixed(2)}</p>
                    </div>
                  </div>
                  {(() => {
                    const tenant = tenants?.find(t => t.id === selectedTenantId);
                    if (!tenant) return null;
                    const totalSoll = Number(tenant.betriebskosten_vorschuss || 0) + 
                                     Number(tenant.heizungskosten_vorschuss || 0) + 
                                     Number(tenant.grundmiete || 0);
                    const unterzahlung = totalSoll - Number(selectedTransaction.amount);
                    if (unterzahlung > 0.01) {
                      return (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                          ⚠️ Unterzahlung: € {unterzahlung.toFixed(2)} (Soll: € {totalSoll.toFixed(2)})
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button 
                  onClick={confirmReassign}
                  disabled={!selectedTenantId || assignPaymentWithSplit.isPending || updateTransaction.isPending}
                >
                  {(assignPaymentWithSplit.isPending || updateTransaction.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Zuordnen & Aufteilen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
