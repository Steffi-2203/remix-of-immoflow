import { useState, useEffect } from 'react';
import { Check, Pencil, ChevronUp, Save, Trash2, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  expenseCategoryLabels,
  expenseTypeLabels,
  expenseTypesByCategory,
  type ExpenseCategory,
  type ExpenseType,
} from '@/hooks/useExpenses';
import { usePropertyMatcher } from '@/hooks/usePropertyMatcher';

export interface BatchResultItem {
  fileName: string;
  file?: File; // Original file for upload
  lieferant?: string;
  beschreibung?: string;
  betrag?: number;
  datum?: string;
  rechnungsnummer?: string;
  kategorie?: ExpenseCategory;
  expense_type?: ExpenseType;
  iban?: string;
  // Leistungsort für Property-Matching
  leistungsort_strasse?: string | null;
  leistungsort_plz?: string | null;
  leistungsort_stadt?: string | null;
  // Suggested property from matching
  suggestedPropertyId?: string;
  suggestedPropertyConfidence?: number;
  // Editable form state
  edited?: {
    bezeichnung: string;
    betrag: string;
    datum: string;
    beleg_nummer: string;
    category: ExpenseCategory;
    expense_type: ExpenseType;
    notizen: string;
  };
  // Selection state
  selected?: boolean;
  saved?: boolean;
}

interface BatchResultsSummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: BatchResultItem[];
  properties: { id: string; name: string }[];
  onSaveAll: (items: BatchResultItem[], propertyId: string, abrechnungsjahrConfig?: { useCustom: boolean; year: number; verbrauchsTypes: string[] }) => Promise<void>;
  onClose: () => void;
}

export function BatchResultsSummary({
  open,
  onOpenChange,
  results,
  properties,
  onSaveAll,
  onClose,
}: BatchResultsSummaryProps) {
  const { matchPropertyByLeistungsort } = usePropertyMatcher();
  
  const initializeItems = (resultsToInit: BatchResultItem[]): BatchResultItem[] => 
    resultsToInit.map(r => {
      // Automatisches Property-Matching basierend auf Leistungsort
      let suggestedPropertyId: string | undefined;
      let suggestedPropertyConfidence: number | undefined;
      
      if (r.leistungsort_strasse || r.leistungsort_plz || r.leistungsort_stadt) {
        const match = matchPropertyByLeistungsort({
          strasse: r.leistungsort_strasse || null,
          plz: r.leistungsort_plz || null,
          stadt: r.leistungsort_stadt || null,
        });
        
        if (match) {
          suggestedPropertyId = match.propertyId;
          suggestedPropertyConfidence = match.confidence;
        }
      }
      
      return {
        ...r,
        selected: true,
        saved: false,
        suggestedPropertyId,
        suggestedPropertyConfidence,
        edited: {
          bezeichnung: r.beschreibung || r.lieferant || '',
          betrag: r.betrag?.toString().replace('.', ',') || '',
          datum: r.datum || new Date().toISOString().split('T')[0],
          beleg_nummer: r.rechnungsnummer || '',
          category: r.kategorie || 'betriebskosten_umlagefaehig',
          expense_type: (r.expense_type as ExpenseType) || 'sonstiges',
          notizen: r.iban ? `IBAN: ${r.iban}` : '',
        },
      };
    });

  const [items, setItems] = useState<BatchResultItem[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [saving, setSaving] = useState(false);
  
  // Abrechnungsjahr für verbrauchsabhängige Kosten
  const currentYear = new Date().getFullYear();
  const [useCustomAbrechnungsjahr, setUseCustomAbrechnungsjahr] = useState(false);
  const [customAbrechnungsjahr, setCustomAbrechnungsjahr] = useState(currentYear - 1);
  
  // Verbrauchsabhängige Kostenarten
  const verbrauchsabhaengigeKosten = ['heizung', 'wasser_abwasser'];
  
  // Update items when results change (e.g., when dialog opens with new batch)
  useEffect(() => {
    if (open && results.length > 0) {
      const initialized = initializeItems(results);
      setItems(initialized);
      
      // Auto-select property if all items suggest the same property with high confidence
      const highConfidenceSuggestions = initialized
        .filter(i => i.suggestedPropertyId && (i.suggestedPropertyConfidence || 0) >= 0.6)
        .map(i => i.suggestedPropertyId);
      
      if (highConfidenceSuggestions.length > 0) {
        const uniqueProperties = [...new Set(highConfidenceSuggestions)];
        if (uniqueProperties.length === 1 && uniqueProperties[0]) {
          setSelectedProperty(uniqueProperties[0]);
        }
      }
    }
  }, [open, results]);

  const selectedCount = items.filter(i => i.selected && !i.saved).length;
  const savedCount = items.filter(i => i.saved).length;
  
  // Count items with property suggestions
  const itemsWithSuggestions = items.filter(i => i.suggestedPropertyId && (i.suggestedPropertyConfidence || 0) >= 0.5).length;

  const toggleSelect = (index: number) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, selected: !item.selected } : item
    ));
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(prev => prev === index ? null : index);
  };

  const updateItem = (index: number, field: keyof NonNullable<BatchResultItem['edited']>, value: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index || !item.edited) return item;
      
      const newEdited = { ...item.edited, [field]: value };
      
      // Reset expense_type when category changes
      if (field === 'category') {
        const newCategory = value as ExpenseCategory;
        const availableTypes = expenseTypesByCategory[newCategory];
        if (!availableTypes.includes(newEdited.expense_type)) {
          newEdited.expense_type = availableTypes[0];
        }
      }
      
      return { ...item, edited: newEdited };
    }));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const handleSaveAll = async () => {
    if (!selectedProperty) return;
    
    const itemsToSave = items.filter(i => i.selected && !i.saved);
    if (itemsToSave.length === 0) return;
    
    setSaving(true);
    try {
      await onSaveAll(itemsToSave, selectedProperty, {
        useCustom: useCustomAbrechnungsjahr,
        year: customAbrechnungsjahr,
        verbrauchsTypes: verbrauchsabhaengigeKosten,
      });
      
      // Mark items as saved
      setItems(prev => prev.map(item => 
        item.selected && !item.saved ? { ...item, saved: true } : item
      ));
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num);
  };
  
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge variant="default" className="text-xs bg-green-600">Erkannt ({Math.round(confidence * 100)}%)</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge variant="secondary" className="text-xs bg-yellow-500 text-black">Möglich ({Math.round(confidence * 100)}%)</Badge>;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Stapelverarbeitung abgeschlossen
          </DialogTitle>
          <DialogDescription>
            {results.length} Rechnungen wurden analysiert. Überprüfen Sie die Daten und speichern Sie die Einträge.
          </DialogDescription>
        </DialogHeader>

        {/* Property selection and Abrechnungsjahr */}
        <div className="space-y-3 py-2 border-b">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium whitespace-nowrap">Liegenschaft:</Label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Liegenschaft auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {itemsWithSuggestions > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{itemsWithSuggestions} Rechnung(en) mit erkanntem Leistungsort</span>
              </div>
            )}
          </div>
          
          {/* Abrechnungsjahr für Verbrauchskosten */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Verbrauchskosten im Vorjahr buchen</Label>
                  <p className="text-xs text-muted-foreground">
                    Heizung und Wasser/Abwasser werden im ausgewählten Jahr gebucht
                  </p>
                </div>
                <Switch
                  checked={useCustomAbrechnungsjahr}
                  onCheckedChange={setUseCustomAbrechnungsjahr}
                />
              </div>
              {useCustomAbrechnungsjahr && (
                <div className="flex items-center gap-2 mt-2">
                  <Label className="text-xs text-muted-foreground">Abrechnungsjahr:</Label>
                  <Select 
                    value={customAbrechnungsjahr.toString()} 
                    onValueChange={(v) => setCustomAbrechnungsjahr(parseInt(v))}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear - 2, currentYear - 1, currentYear].map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-2">
            {items.map((item, index) => (
              <div
                key={index}
                className={cn(
                  'border rounded-lg transition-all',
                  item.saved && 'bg-muted/50 opacity-60',
                  item.selected && !item.saved && 'border-primary/50',
                  !item.selected && !item.saved && 'opacity-50'
                )}
              >
                {/* Summary row */}
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => !item.saved && toggleSelect(index)}
                    disabled={item.saved}
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                      item.saved && 'bg-primary border-primary',
                      item.selected && !item.saved && 'bg-primary border-primary',
                      !item.selected && !item.saved && 'border-muted-foreground/30 hover:border-primary'
                    )}
                  >
                    {(item.selected || item.saved) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">
                        {item.edited?.bezeichnung || item.fileName}
                      </span>
                      {item.saved && (
                        <Badge variant="secondary" className="text-xs">Gespeichert</Badge>
                      )}
                      {!item.saved && item.suggestedPropertyId && item.suggestedPropertyConfidence && (
                        getConfidenceBadge(item.suggestedPropertyConfidence)
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{item.fileName}</span>
                      <span>•</span>
                      <span>{item.edited?.datum}</span>
                      {item.leistungsort_strasse && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.leistungsort_strasse}
                            {item.leistungsort_plz && `, ${item.leistungsort_plz}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <span className="font-medium text-sm whitespace-nowrap">
                    {item.edited?.betrag ? formatCurrency(item.edited.betrag) : '—'}
                  </span>

                  {/* Actions */}
                  {!item.saved && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleExpand(index)}
                      >
                        {expandedIndex === index ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Expanded edit form */}
                {expandedIndex === index && !item.saved && item.edited && (
                  <div className="border-t p-4 space-y-4 bg-muted/30">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Bezeichnung</Label>
                        <Input
                          value={item.edited.bezeichnung}
                          onChange={(e) => updateItem(index, 'bezeichnung', e.target.value)}
                          placeholder="Bezeichnung eingeben"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Betrag (€)</Label>
                        <Input
                          value={item.edited.betrag}
                          onChange={(e) => updateItem(index, 'betrag', e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Datum</Label>
                        <Input
                          type="date"
                          value={item.edited.datum}
                          onChange={(e) => updateItem(index, 'datum', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Belegnummer</Label>
                        <Input
                          value={item.edited.beleg_nummer}
                          onChange={(e) => updateItem(index, 'beleg_nummer', e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Kategorie</Label>
                        <Select
                          value={item.edited.category}
                          onValueChange={(v) => updateItem(index, 'category', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(expenseCategoryLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Kostenart</Label>
                        <Select
                          value={item.edited.expense_type}
                          onValueChange={(v) => updateItem(index, 'expense_type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {expenseTypesByCategory[item.edited.category].map(type => (
                              <SelectItem key={type} value={type}>
                                {expenseTypeLabels[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center gap-2 mr-auto text-sm text-muted-foreground">
            {savedCount > 0 && <span>{savedCount} gespeichert</span>}
            {savedCount > 0 && selectedCount > 0 && <span>•</span>}
            {selectedCount > 0 && <span>{selectedCount} ausgewählt</span>}
          </div>
          <Button variant="outline" onClick={onClose}>
            {savedCount === items.length ? 'Schließen' : 'Abbrechen'}
          </Button>
          {selectedCount > 0 && (
            <Button 
              onClick={handleSaveAll} 
              disabled={!selectedProperty || saving}
            >
              {saving ? (
                <>Speichern...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  {selectedCount} speichern
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
