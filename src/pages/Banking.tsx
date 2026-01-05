import { useState, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Loader2, Search, Building, User, Euro, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { parseCSV, autoMatchTransaction, ParsedTransaction } from '@/utils/bankImportUtils';
import { useTransactions, useCreateTransactions, useUpdateTransaction } from '@/hooks/useTransactions';
import { useUnits } from '@/hooks/useUnits';
import { useTenants } from '@/hooks/useTenants';
import { useProperties } from '@/hooks/useProperties';
import { useOrganization } from '@/hooks/useOrganization';

interface ImportTransaction extends ParsedTransaction {
  id: string;
  matchedUnitId: string | null;
  matchedTenantId: string | null;
  confidence: number;
  matchReason: string;
  selected: boolean;
}

export default function Banking() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importTransactions, setImportTransactions] = useState<ImportTransaction[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  const { data: units = [] } = useUnits();
  const { data: tenants = [] } = useTenants();
  const { data: properties = [] } = useProperties();
  const { data: organization } = useOrganization();
  const createTransactions = useCreateTransactions();
  const updateTransaction = useUpdateTransaction();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setParseErrors([]);
    
    try {
      const content = await file.text();
      const { transactions: parsed, errors } = parseCSV(content);
      
      if (errors.length > 0) {
        setParseErrors(errors);
      }
      
      if (parsed.length === 0) {
        toast.error('Keine Transaktionen in der Datei gefunden');
        setIsProcessing(false);
        return;
      }
      
      // Auto-match transactions
      const matchedTransactions: ImportTransaction[] = parsed.map((t, index) => {
        const match = autoMatchTransaction(t, units, tenants);
        return {
          ...t,
          id: `import-${index}`,
          matchedUnitId: match.unitId,
          matchedTenantId: match.tenantId,
          confidence: match.confidence,
          matchReason: match.matchReason,
          selected: true,
        };
      });
      
      setImportTransactions(matchedTransactions);
      setShowImportDialog(true);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Fehler beim Verarbeiten der Datei');
    }
    
    setIsProcessing(false);
  }, [units, tenants]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(f => f.name.endsWith('.csv'));
    
    if (csvFile) {
      processFile(csvFile);
    } else {
      toast.error('Bitte eine CSV-Datei hochladen');
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleMatchChange = useCallback((transactionId: string, unitId: string | null) => {
    setImportTransactions(prev => prev.map(t => {
      if (t.id === transactionId) {
        const tenant = unitId ? tenants.find(ten => ten.unit_id === unitId) : null;
        return {
          ...t,
          matchedUnitId: unitId,
          matchedTenantId: tenant?.id || null,
          confidence: unitId ? 1 : 0,
          matchReason: unitId ? 'Manuell zugeordnet' : '',
        };
      }
      return t;
    }));
  }, [tenants]);

  const handleToggleSelect = useCallback((transactionId: string) => {
    setImportTransactions(prev => prev.map(t => 
      t.id === transactionId ? { ...t, selected: !t.selected } : t
    ));
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setImportTransactions(prev => prev.map(t => ({ ...t, selected })));
  }, []);

  const handleImport = useCallback(async () => {
    const selectedTransactions = importTransactions.filter(t => t.selected);
    
    if (selectedTransactions.length === 0) {
      toast.error('Bitte mindestens eine Transaktion auswählen');
      return;
    }
    
    const toInsert = selectedTransactions.map(t => {
      const status: 'matched' | 'unmatched' | 'ignored' = t.matchedUnitId ? 'matched' : 'unmatched';
      return {
        organization_id: organization?.id || null,
        unit_id: t.matchedUnitId,
        tenant_id: t.matchedTenantId,
        amount: t.amount,
        currency: 'EUR',
        transaction_date: t.date,
        booking_date: t.bookingDate || null,
        description: t.description,
        reference: t.reference || null,
        counterpart_name: t.counterpartName || null,
        counterpart_iban: t.counterpartIban || null,
        status,
        match_confidence: t.confidence,
      };
    });
    
    await createTransactions.mutateAsync(toInsert);
    setShowImportDialog(false);
    setImportTransactions([]);
  }, [importTransactions, organization, createTransactions]);

  const getUnitInfo = useCallback((unitId: string | null) => {
    if (!unitId) return null;
    const unit = units.find(u => u.id === unitId);
    if (!unit) return null;
    const property = properties.find(p => p.id === unit.property_id);
    return { unit, property };
  }, [units, properties]);

  const getTenantName = useCallback((tenantId: string | null) => {
    if (!tenantId) return null;
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? `${tenant.first_name} ${tenant.last_name}` : null;
  }, [tenants]);

  // Filter existing transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = searchQuery === '' || 
        t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.counterpart_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.reference?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = transactions.length;
    const matched = transactions.filter(t => t.status === 'matched').length;
    const unmatched = transactions.filter(t => t.status === 'unmatched').length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const matchedAmount = transactions.filter(t => t.status === 'matched').reduce((sum, t) => sum + t.amount, 0);
    
    return { total, matched, unmatched, totalAmount, matchedAmount };
  }, [transactions]);

  return (
    <MainLayout 
      title="Bank-Import" 
      subtitle="Kontoauszüge importieren und Zahlungen zuordnen"
    >
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Transaktionen</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Zugeordnet</p>
                  <p className="text-2xl font-bold text-green-600">{stats.matched}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Offen</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.unmatched}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gesamtbetrag</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(stats.totalAmount)}
                  </p>
                </div>
                <Euro className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="import">
          <TabsList>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="transactions">Transaktionen ({stats.total})</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle>Kontoauszug hochladen</CardTitle>
                <CardDescription>
                  Laden Sie eine CSV-Datei von Ihrer Bank hoch. Unterstützte Formate: CSV (österreichische Banken)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    border-2 border-dashed rounded-lg p-12 text-center transition-colors
                    ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                  `}
                >
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-muted-foreground">Datei wird verarbeitet...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2">
                        CSV-Datei hierher ziehen
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        oder klicken Sie auf den Button
                      </p>
                      <div>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="csv-file-input"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => document.getElementById('csv-file-input')?.click()}
                        >
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Datei auswählen
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Anleitung</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>Laden Sie den Kontoauszug als CSV-Datei von Ihrem Online-Banking herunter</li>
                  <li>Ziehen Sie die Datei in den Upload-Bereich oder wählen Sie sie aus</li>
                  <li>ImmoFlow erkennt automatisch die Spalten (Datum, Betrag, Verwendungszweck)</li>
                  <li>Transaktionen werden automatisch Einheiten zugeordnet (z.B. "Miete Top 3" → Einheit Top 3)</li>
                  <li>Überprüfen und korrigieren Sie die Zuordnungen bei Bedarf</li>
                  <li>Bestätigen Sie den Import</li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            {/* Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Suche nach Beschreibung, Name, Referenz..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Status</SelectItem>
                      <SelectItem value="matched">Zugeordnet</SelectItem>
                      <SelectItem value="unmatched">Nicht zugeordnet</SelectItem>
                      <SelectItem value="ignored">Ignoriert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card>
              <CardContent className="pt-6">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Transaktionen gefunden</p>
                    <p className="text-sm mt-2">Importieren Sie einen Kontoauszug um loszulegen</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Beschreibung</TableHead>
                        <TableHead>Zuordnung</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Betrag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => {
                        const unitInfo = getUnitInfo(transaction.unit_id);
                        const tenantName = getTenantName(transaction.tenant_id);
                        
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(transaction.transaction_date), 'dd.MM.yyyy', { locale: de })}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="truncate font-medium">
                                  {transaction.counterpart_name || 'Unbekannt'}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {transaction.description}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {unitInfo ? (
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">{unitInfo.unit.top_nummer}</p>
                                    {tenantName && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {tenantName}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                transaction.status === 'matched' ? 'default' :
                                transaction.status === 'unmatched' ? 'secondary' : 'outline'
                              }>
                                {transaction.status === 'matched' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {transaction.status === 'unmatched' && <AlertCircle className="h-3 w-3 mr-1" />}
                                {transaction.status === 'matched' ? 'Zugeordnet' :
                                 transaction.status === 'unmatched' ? 'Offen' : 'Ignoriert'}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {new Intl.NumberFormat('de-AT', { style: 'currency', currency: transaction.currency }).format(transaction.amount)}
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
        </Tabs>
      </div>

      {/* Import Preview Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import-Vorschau</DialogTitle>
            <DialogDescription>
              {importTransactions.length} Transaktionen erkannt. Überprüfen Sie die Zuordnungen.
            </DialogDescription>
          </DialogHeader>

          {parseErrors.length > 0 && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-4">
              <p className="font-medium mb-2">Warnungen beim Parsen:</p>
              <ul className="text-sm list-disc list-inside">
                {parseErrors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="selectAll"
                checked={importTransactions.every(t => t.selected)}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="selectAll" className="text-sm">Alle auswählen</label>
            </div>
            <div className="text-sm text-muted-foreground">
              {importTransactions.filter(t => t.selected).length} von {importTransactions.length} ausgewählt
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Beschreibung</TableHead>
                <TableHead>Zuordnung</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importTransactions.map((transaction) => (
                <TableRow key={transaction.id} className={!transaction.selected ? 'opacity-50' : ''}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={transaction.selected}
                      onChange={() => handleToggleSelect(transaction.id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(transaction.date), 'dd.MM.yyyy', { locale: de })}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="truncate font-medium">{transaction.counterpartName || 'Unbekannt'}</p>
                      <p className="text-sm text-muted-foreground truncate">{transaction.description}</p>
                      {transaction.matchReason && (
                        <p className="text-xs text-green-600 mt-1">
                          <CheckCircle2 className="h-3 w-3 inline mr-1" />
                          {transaction.matchReason}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={transaction.matchedUnitId || 'none'}
                      onValueChange={(value) => handleMatchChange(transaction.id, value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Einheit auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine Zuordnung</SelectItem>
                        {units.map((unit) => {
                          const property = properties.find(p => p.id === unit.property_id);
                          const tenant = tenants.find(t => t.unit_id === unit.id);
                          return (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.top_nummer} - {property?.name || 'Unbekannt'}
                              {tenant && ` (${tenant.last_name})`}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(transaction.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={createTransactions.isPending || importTransactions.filter(t => t.selected).length === 0}
            >
              {createTransactions.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {importTransactions.filter(t => t.selected).length} Transaktionen importieren
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
