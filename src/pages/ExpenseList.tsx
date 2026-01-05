import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Receipt, 
  Plus, 
  Search, 
  Loader2, 
  Euro, 
  Wrench,
  Building2,
  Trash2,
  Pencil,
  FileText,
  Upload,
  ExternalLink,
  Camera,
  Sparkles
} from 'lucide-react';
import { 
  useExpenses, 
  useExpensesByCategory,
  useCreateExpense, 
  useUpdateExpense,
  useDeleteExpense,
  expenseCategoryLabels,
  expenseTypeLabels,
  expenseTypesByCategory,
  type ExpenseCategory,
  type ExpenseType,
  type Expense
} from '@/hooks/useExpenses';
import { useProperties } from '@/hooks/useProperties';
import { useOCRInvoice } from '@/hooks/useOCRInvoice';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function ExpenseList() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);
  const currentYear = new Date().getFullYear();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | ExpenseCategory>('all');
  
  const [newExpense, setNewExpense] = useState({
    property_id: '',
    category: 'betriebskosten_umlagefaehig' as ExpenseCategory,
    expense_type: 'sonstiges' as ExpenseType,
    bezeichnung: '',
    betrag: '',
    datum: format(new Date(), 'yyyy-MM-dd'),
    beleg_nummer: '',
    notizen: '',
  });
  const [hasReceipt, setHasReceipt] = useState<boolean | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<(Expense & { properties?: { name: string }, beleg_url?: string }) | null>(null);
  const [editForm, setEditForm] = useState({
    property_id: '',
    category: 'betriebskosten_umlagefaehig' as ExpenseCategory,
    expense_type: 'sonstiges' as ExpenseType,
    bezeichnung: '',
    betrag: '',
    datum: '',
    beleg_nummer: '',
    notizen: '',
    beleg_url: '',
  });
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);

  // OCR state
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const ocrInvoice = useOCRInvoice();

  const propertyFilter = selectedProperty === 'all' ? undefined : selectedProperty;
  const { data: expenses, isLoading } = useExpenses(propertyFilter, selectedYear);
  const { data: categoryStats } = useExpensesByCategory(propertyFilter, selectedYear);
  const { data: properties } = useProperties();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  // Filter expenses
  const filteredExpenses = expenses?.filter(expense => {
    if (activeTab !== 'all' && expense.category !== activeTab) return false;
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      expense.bezeichnung.toLowerCase().includes(searchLower) ||
      expense.beleg_nummer?.toLowerCase().includes(searchLower) ||
      (expense as any).properties?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      // Allow PDF and images
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast({
          title: 'Ungültiges Format',
          description: 'Bitte PDF oder Bilddateien hochladen.',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'Datei zu groß',
          description: 'Maximale Dateigröße: 10 MB.',
          variant: 'destructive',
        });
        return;
      }
      if (isEdit) {
        setEditSelectedFile(file);
      } else {
        setSelectedFile(file);
      }
    }
  };

  const uploadFile = async (file: File, propertyId: string): Promise<string | null> => {
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `${propertyId}/${fileName}`;

    const { error } = await supabase.storage
      .from('expense-receipts')
      .upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload fehlgeschlagen',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('expense-receipts')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleCreateExpense = async () => {
    if (!newExpense.property_id || !newExpense.bezeichnung || !newExpense.betrag) {
      return;
    }

    // If user said they have a receipt, enforce upload.
    if (hasReceipt === true && !selectedFile) {
      toast({
        title: 'Beleg fehlt',
        description: 'Bitte Beleg hochladen oder „Nein, ohne Beleg“ auswählen.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    let beleg_url: string | undefined;

    try {
      // Upload file if selected
      if (selectedFile) {
        const url = await uploadFile(selectedFile, newExpense.property_id);
        if (url) {
          beleg_url = url;
        }
      }

      const date = new Date(newExpense.datum);
      
      await createExpense.mutateAsync({
        property_id: newExpense.property_id,
        category: newExpense.category,
        expense_type: newExpense.expense_type,
        bezeichnung: newExpense.bezeichnung,
        betrag: parseFloat(newExpense.betrag),
        datum: newExpense.datum,
        beleg_nummer: newExpense.beleg_nummer || undefined,
        notizen: newExpense.notizen || undefined,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        beleg_url,
      } as any);

      setDialogOpen(false);
      setSelectedFile(null);
      setHasReceipt(null);
      setNewExpense({
        property_id: '',
        category: 'betriebskosten_umlagefaehig',
        expense_type: 'sonstiges',
        bezeichnung: '',
        betrag: '',
        datum: format(new Date(), 'yyyy-MM-dd'),
        beleg_nummer: '',
        notizen: '',
      });

      toast({
        title: 'Kosten erfasst',
        description: beleg_url ? 'Rechnung wurde hochgeladen.' : 'Eintrag wurde erstellt.',
      });
    } finally {
      setUploading(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (expense: Expense & { properties?: { name: string }, beleg_url?: string }) => {
    setEditingExpense(expense);
    setEditForm({
      property_id: expense.property_id,
      category: expense.category,
      expense_type: expense.expense_type,
      bezeichnung: expense.bezeichnung,
      betrag: expense.betrag.toString(),
      datum: expense.datum,
      beleg_nummer: expense.beleg_nummer || '',
      notizen: expense.notizen || '',
      beleg_url: expense.beleg_url || '',
    });
    setEditSelectedFile(null);
    setEditDialogOpen(true);
  };

  // Handle update expense
  const handleUpdateExpense = async () => {
    if (!editingExpense || !editForm.bezeichnung || !editForm.betrag) {
      return;
    }

    setUploading(true);
    let beleg_url: string | undefined = editForm.beleg_url || undefined;

    try {
      // Upload new file if selected
      if (editSelectedFile) {
        const url = await uploadFile(editSelectedFile, editForm.property_id);
        if (url) {
          beleg_url = url;
        }
      }

      const date = new Date(editForm.datum);
      
      await updateExpense.mutateAsync({
        id: editingExpense.id,
        category: editForm.category,
        expense_type: editForm.expense_type,
        bezeichnung: editForm.bezeichnung,
        betrag: parseFloat(editForm.betrag),
        datum: editForm.datum,
        beleg_nummer: editForm.beleg_nummer || undefined,
        notizen: editForm.notizen || undefined,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        beleg_url,
      } as any);

      setEditDialogOpen(false);
      setEditingExpense(null);
      setEditSelectedFile(null);

      toast({
        title: 'Kosten aktualisiert',
        description: editSelectedFile ? 'Rechnung wurde hochgeladen.' : 'Änderungen wurden gespeichert.',
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle OCR file selection
  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Accept images for OCR
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ungültiges Format',
        description: 'Bitte ein Bild der Rechnung hochladen (JPG, PNG).',
        variant: 'destructive',
      });
      return;
    }

    setOcrFile(file);
    setOcrDialogOpen(true);

    try {
      const result = await ocrInvoice.mutateAsync(file);
      
      // Pre-fill the form with OCR data
      setNewExpense(prev => ({
        ...prev,
        bezeichnung: result.beschreibung || result.lieferant || '',
        betrag: result.betrag?.toString() || '',
        datum: result.datum || format(new Date(), 'yyyy-MM-dd'),
        beleg_nummer: result.rechnungsnummer || '',
        category: result.kategorie || 'betriebskosten_umlagefaehig',
        expense_type: result.expense_type as ExpenseType || 'sonstiges',
        notizen: result.iban ? `IBAN: ${result.iban}` : '',
      }));

      setOcrDialogOpen(false);
      setDialogOpen(true);
    } catch (error) {
      setOcrDialogOpen(false);
      console.error('OCR failed:', error);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <MainLayout
      title="Buchhaltung"
      subtitle="Kosten erfassen und kategorisieren"
    >
      {/* OCR Processing Dialog */}
      <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Rechnung wird analysiert
            </DialogTitle>
            <DialogDescription>
              Die Rechnung wird mit KI analysiert und die Daten automatisch extrahiert.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">
              {ocrFile?.name}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Bezeichnung oder Beleg suchen..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Alle Liegenschaften" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Liegenschaften</SelectItem>
            {properties?.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* OCR Scan Button */}
        <input
          ref={ocrFileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleOcrFileChange}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => ocrFileInputRef.current?.click()}
          disabled={ocrInvoice.isPending}
        >
          <Camera className="h-4 w-4 mr-2" />
          Rechnung scannen
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Kosten erfassen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Neue Kosten erfassen</DialogTitle>
              <DialogDescription>
                Erfassen Sie Betriebskosten oder Instandhaltungskosten.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Liegenschaft</Label>
                <Select
                  value={newExpense.property_id}
                  onValueChange={(value) => setNewExpense(prev => ({ ...prev, property_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Liegenschaft wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select
                    value={newExpense.category}
                    onValueChange={(value: ExpenseCategory) => setNewExpense(prev => ({ 
                      ...prev, 
                      category: value,
                      expense_type: expenseTypesByCategory[value][0] 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="betriebskosten_umlagefaehig">Betriebskosten (umlagefähig)</SelectItem>
                      <SelectItem value="instandhaltung">Instandhaltung</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Art</Label>
                  <Select
                    value={newExpense.expense_type}
                    onValueChange={(value: ExpenseType) => setNewExpense(prev => ({ ...prev, expense_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypesByCategory[newExpense.category].map(type => (
                        <SelectItem key={type} value={type}>{expenseTypeLabels[type]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bezeichnung</Label>
                <Input
                  placeholder="z.B. Gebäudeversicherung 2024"
                  value={newExpense.bezeichnung}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, bezeichnung: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Betrag (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newExpense.betrag}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, betrag: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={newExpense.datum}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, datum: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Belegnummer (optional)</Label>
                <Input
                  placeholder="z.B. RE-2024-001"
                  value={newExpense.beleg_nummer}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, beleg_nummer: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Notizen (optional)</Label>
                <Textarea
                  placeholder="Zusätzliche Informationen..."
                  value={newExpense.notizen}
                  onChange={(e) => setNewExpense(prev => ({ ...prev, notizen: e.target.value }))}
                />
              </div>

              {/* Receipt Question */}
              <div className="space-y-3">
                <Label>Haben Sie einen Rechnungsbeleg?</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={hasReceipt === true ? 'default' : 'outline'}
                    onClick={() => setHasReceipt(true)}
                    className="flex-1"
                  >
                    Ja, Beleg vorhanden
                  </Button>
                  <Button
                    type="button"
                    variant={hasReceipt === false ? 'default' : 'outline'}
                    onClick={() => {
                      setHasReceipt(false);
                      setSelectedFile(null);
                    }}
                    className="flex-1"
                  >
                    Nein, ohne Beleg
                  </Button>
                </div>
              </div>

              {/* File Upload - only shown when hasReceipt is true */}
              {hasReceipt === true && (
                <div className="space-y-2">
                  <Label>Rechnungsbeleg hochladen</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(e) => handleFileChange(e, false)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {selectedFile ? selectedFile.name : 'Beleg hochladen'}
                    </Button>
                    {selectedFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedFile(null)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PDF oder Bild, max. 10 MB
                  </p>
                </div>
              )}

              {hasReceipt === false && (
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <p className="text-sm text-foreground">
                    Die Kosten werden ohne Beleg erfasst. Sie können später einen Beleg hinzufügen.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button 
                onClick={handleCreateExpense} 
                disabled={
                  uploading ||
                  createExpense.isPending ||
                  !newExpense.property_id ||
                  !newExpense.bezeichnung ||
                  !newExpense.betrag ||
                  (hasReceipt === true && !selectedFile)
                }
              >
                {(uploading || createExpense.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {uploading ? 'Hochladen...' : 'Erfassen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Betriebskosten (umlagefähig)</p>
                <p className="text-2xl font-bold">
                  € {categoryStats?.totalBetriebskosten.toLocaleString('de-AT', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Wrench className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Instandhaltung</p>
                <p className="text-2xl font-bold">
                  € {categoryStats?.totalInstandhaltung.toLocaleString('de-AT', { minimumFractionDigits: 2 }) || '0,00'}
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
                <p className="text-sm text-muted-foreground">Gesamtkosten {selectedYear}</p>
                <p className="text-2xl font-bold">
                  € {categoryStats?.total.toLocaleString('de-AT', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Table */}
      <Card>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="all">Alle</TabsTrigger>
              <TabsTrigger value="betriebskosten_umlagefaehig">Betriebskosten</TabsTrigger>
              <TabsTrigger value="instandhaltung">Instandhaltung</TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="p-0 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !filteredExpenses || filteredExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Keine Kosten gefunden</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Klicken Sie auf "Kosten erfassen" um eine neue Position hinzuzufügen.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Liegenschaft</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Art</TableHead>
                    <TableHead>Beleg-Nr.</TableHead>
                    <TableHead>Scan</TableHead>
                    <TableHead className="text-right">Betrag</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {format(new Date(expense.datum), 'dd.MM.yyyy', { locale: de })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {(expense as any).properties?.name || '-'}
                      </TableCell>
                      <TableCell>{expense.bezeichnung}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={expense.category === 'betriebskosten_umlagefaehig' 
                            ? 'border-blue-500 text-blue-700 dark:text-blue-300' 
                            : 'border-orange-500 text-orange-700 dark:text-orange-300'
                          }
                        >
                          {expense.category === 'betriebskosten_umlagefaehig' ? 'BK' : 'IH'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {expenseTypeLabels[expense.expense_type]}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {expense.beleg_nummer || '-'}
                      </TableCell>
                      <TableCell>
                        {(expense as any).beleg_url ? (
                          <a
                            href={(expense as any).beleg_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileText className="h-4 w-4" />
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        € {Number(expense.betrag).toLocaleString('de-AT', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditDialog(expense as any)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteExpense.mutate(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Tabs>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Kosten bearbeiten</DialogTitle>
            <DialogDescription>
              Bearbeiten Sie die Ausgabe oder fügen Sie einen Rechnungsbeleg hinzu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Liegenschaft</Label>
              <Input
                value={editingExpense?.properties?.name || '-'}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(value: ExpenseCategory) => setEditForm(prev => ({ 
                    ...prev, 
                    category: value,
                    expense_type: expenseTypesByCategory[value][0] 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="betriebskosten_umlagefaehig">Betriebskosten (umlagefähig)</SelectItem>
                    <SelectItem value="instandhaltung">Instandhaltung</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Art</Label>
                <Select
                  value={editForm.expense_type}
                  onValueChange={(value: ExpenseType) => setEditForm(prev => ({ ...prev, expense_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypesByCategory[editForm.category].map(type => (
                      <SelectItem key={type} value={type}>{expenseTypeLabels[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bezeichnung</Label>
              <Input
                placeholder="z.B. Gebäudeversicherung 2024"
                value={editForm.bezeichnung}
                onChange={(e) => setEditForm(prev => ({ ...prev, bezeichnung: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Betrag (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={editForm.betrag}
                  onChange={(e) => setEditForm(prev => ({ ...prev, betrag: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={editForm.datum}
                  onChange={(e) => setEditForm(prev => ({ ...prev, datum: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Belegnummer (optional)</Label>
              <Input
                placeholder="z.B. RE-2024-001"
                value={editForm.beleg_nummer}
                onChange={(e) => setEditForm(prev => ({ ...prev, beleg_nummer: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notizen (optional)</Label>
              <Textarea
                placeholder="Zusätzliche Informationen..."
                value={editForm.notizen}
                onChange={(e) => setEditForm(prev => ({ ...prev, notizen: e.target.value }))}
              />
            </div>

            {/* PDF Upload / Existing PDF */}
            <div className="space-y-2">
              <Label>Rechnungsbeleg (PDF)</Label>
              
              {/* Show existing PDF if available */}
              {editForm.beleg_url && !editSelectedFile && (
                <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-primary" />
                  <a
                    href={editForm.beleg_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex-1 truncate"
                  >
                    Vorhandener Beleg anzeigen
                  </a>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleFileChange(e, true)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => editFileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {editSelectedFile 
                    ? editSelectedFile.name 
                    : editForm.beleg_url 
                      ? 'Neuen Beleg hochladen' 
                      : 'PDF hochladen'
                  }
                </Button>
                {editSelectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditSelectedFile(null)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Max. 10 MB, nur PDF-Format
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              onClick={handleUpdateExpense} 
              disabled={uploading || updateExpense.isPending || !editForm.bezeichnung || !editForm.betrag}
            >
              {(uploading || updateExpense.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {uploading ? 'Hochladen...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
