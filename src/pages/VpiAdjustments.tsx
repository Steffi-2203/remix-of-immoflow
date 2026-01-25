import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, TrendingUp, MoreHorizontal, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useVpiAdjustments, useDeleteVpiAdjustment, useRejectVpiAdjustment, VpiAdjustment, VpiAdjustmentStatus, getVpiStatus } from '@/hooks/useVpiAdjustments';
import { VpiCalculator } from '@/components/vpi/VpiCalculator';
import { VpiApplyDialog } from '@/components/vpi/VpiApplyDialog';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const STATUS_LABELS: Record<VpiAdjustmentStatus, string> = {
  pending: 'Ausstehend',
  applied: 'Angewendet',
  rejected: 'Abgelehnt',
};

const STATUS_COLORS: Record<VpiAdjustmentStatus, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  applied: 'default',
  rejected: 'destructive',
};

export default function VpiAdjustments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<VpiAdjustment | null>(null);
  const [applyingAdjustment, setApplyingAdjustment] = useState<VpiAdjustment | null>(null);
  const [deletingAdjustment, setDeletingAdjustment] = useState<VpiAdjustment | null>(null);
  
  const { data: adjustments, isLoading } = useVpiAdjustments();
  const deleteMutation = useDeleteVpiAdjustment();
  const rejectMutation = useRejectVpiAdjustment();
  
  const filteredAdjustments = useMemo(() => {
    return adjustments?.filter((adj) => {
      const status = getVpiStatus(adj);
      const tenant = adj.tenants;
      const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}`.toLowerCase() : '';
      const unitInfo = tenant?.units?.top_nummer?.toLowerCase() || '';
      const propertyName = tenant?.units?.properties?.name?.toLowerCase() || '';
      
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        tenantName.includes(searchLower) ||
        unitInfo.includes(searchLower) ||
        propertyName.includes(searchLower);
      
      const matchesStatus = filterStatus === 'all' || status === filterStatus;
      
      return matchesSearch && matchesStatus;
    }) || [];
  }, [adjustments, searchQuery, filterStatus]);
  
  const stats = useMemo(() => {
    if (!adjustments) return { total: 0, pending: 0, applied: 0, rejected: 0 };
    
    return adjustments.reduce((acc, adj) => {
      const status = getVpiStatus(adj);
      return {
        total: acc.total + 1,
        pending: acc.pending + (status === 'pending' ? 1 : 0),
        applied: acc.applied + (status === 'applied' ? 1 : 0),
        rejected: acc.rejected + (status === 'rejected' ? 1 : 0),
      };
    }, { total: 0, pending: 0, applied: 0, rejected: 0 });
  }, [adjustments]);
  
  const handleEdit = (adjustment: VpiAdjustment) => {
    setEditingAdjustment(adjustment);
    setCalculatorOpen(true);
  };
  
  const handleDelete = async () => {
    if (deletingAdjustment) {
      await deleteMutation.mutateAsync(deletingAdjustment.id);
      setDeletingAdjustment(null);
    }
  };
  
  const handleReject = async (adjustment: VpiAdjustment) => {
    await rejectMutation.mutateAsync(adjustment.id);
  };
  
  const handleCalculatorClose = (open: boolean) => {
    setCalculatorOpen(open);
    if (!open) {
      setEditingAdjustment(null);
    }
  };
  
  return (
    <MainLayout title="VPI-Anpassungen" subtitle="Indexbasierte Mietanpassungen gemäß MRG">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">VPI-Anpassungen</h1>
            <p className="text-muted-foreground">
              Verbraucherpreisindex-basierte Mietanpassungen
            </p>
          </div>
          <Button onClick={() => setCalculatorOpen(true)} data-testid="button-new-adjustment">
            <Plus className="h-4 w-4 mr-2" />
            Neue Anpassung berechnen
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Gesamt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ausstehend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="stat-pending">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Angewendet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-applied">{stats.applied}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Abgelehnt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="stat-rejected">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mieter suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="pending">Ausstehend</SelectItem>
              <SelectItem value="applied">Angewendet</SelectItem>
              <SelectItem value="rejected">Abgelehnt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Keine VPI-Anpassungen</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Keine Anpassungen gefunden für Ihre Filterkriterien.'
                  : 'Erstellen Sie Ihre erste VPI-basierte Mietanpassung.'}
              </p>
              {filterStatus === 'all' && !searchQuery && (
                <Button onClick={() => setCalculatorOpen(true)} data-testid="button-new-adjustment-empty">
                  <Plus className="h-4 w-4 mr-2" />
                  Neue Anpassung berechnen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mieter</TableHead>
                  <TableHead>Einheit</TableHead>
                  <TableHead className="text-right">Alte Miete</TableHead>
                  <TableHead className="text-right">Neue Miete</TableHead>
                  <TableHead className="text-right">Änderung</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdjustments.map((adjustment) => {
                  const tenant = adjustment.tenants;
                  const status = getVpiStatus(adjustment);
                  const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unbekannt';
                  const unitInfo = tenant?.units ? `Top ${tenant.units.top_nummer}` : '-';
                  
                  return (
                    <TableRow key={adjustment.id} data-testid={`row-adjustment-${adjustment.id}`}>
                      <TableCell className="font-medium" data-testid="cell-tenant">
                        {tenantName}
                      </TableCell>
                      <TableCell data-testid="cell-unit">{unitInfo}</TableCell>
                      <TableCell className="text-right" data-testid="cell-previous-rent">
                        € {adjustment.previous_rent.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium" data-testid="cell-new-rent">
                        € {adjustment.new_rent.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right" data-testid="cell-percentage">
                        <span className={adjustment.percentage_change && adjustment.percentage_change > 0 ? 'text-green-600' : 'text-red-600'}>
                          {adjustment.percentage_change ? `${adjustment.percentage_change > 0 ? '+' : ''}${adjustment.percentage_change.toFixed(2)}%` : '-'}
                        </span>
                      </TableCell>
                      <TableCell data-testid="cell-date">
                        {format(new Date(adjustment.adjustment_date), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[status]} data-testid="badge-status">
                          {STATUS_LABELS[status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${adjustment.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {status === 'pending' && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => setApplyingAdjustment(adjustment)}
                                  data-testid={`action-apply-${adjustment.id}`}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Anwenden
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleReject(adjustment)}
                                  data-testid={`action-reject-${adjustment.id}`}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Ablehnen
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleEdit(adjustment)}
                              data-testid={`action-edit-${adjustment.id}`}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeletingAdjustment(adjustment)}
                              className="text-destructive"
                              data-testid={`action-delete-${adjustment.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
      
      <VpiCalculator
        open={calculatorOpen}
        onOpenChange={handleCalculatorClose}
        editingAdjustment={editingAdjustment}
      />
      
      <VpiApplyDialog
        open={!!applyingAdjustment}
        onOpenChange={(open) => !open && setApplyingAdjustment(null)}
        adjustment={applyingAdjustment}
      />
      
      <AlertDialog open={!!deletingAdjustment} onOpenChange={(open) => !open && setDeletingAdjustment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>VPI-Anpassung löschen</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie diese VPI-Anpassung löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
