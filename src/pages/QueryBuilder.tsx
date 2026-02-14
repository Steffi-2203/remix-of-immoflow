import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Play, Download, Save, Loader2, Database, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const TABLES = [
  {
    value: 'tenants',
    label: 'Mieter',
    columns: ['first_name', 'last_name', 'email', 'phone', 'status', 'rent_amount', 'move_in_date', 'move_out_date'],
  },
  {
    value: 'units',
    label: 'Einheiten',
    columns: ['top_nummer', 'type', 'qm', 'status', 'rent_net', 'betriebskosten_akonto'],
  },
  {
    value: 'monthly_invoices',
    label: 'Rechnungen',
    columns: ['month', 'year', 'grundmiete', 'betriebskosten', 'gesamtbetrag', 'status', 'faellig_am'],
  },
  {
    value: 'expenses',
    label: 'Ausgaben',
    columns: ['bezeichnung', 'betrag', 'datum', 'category', 'expense_type', 'month', 'year'],
  },
  {
    value: 'transactions',
    label: 'Transaktionen',
    columns: ['description', 'amount', 'transaction_date', 'category', 'type'],
  },
];

const OPERATORS = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
  { value: 'like', label: 'enthält' },
];

interface Filter {
  column: string;
  operator: string;
  value: string;
}

export default function QueryBuilder() {
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sortColumn, setSortColumn] = useState('');
  const [limit, setLimit] = useState(100);
  const [results, setResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const tableConfig = TABLES.find((t) => t.value === selectedTable);

  const handleTableChange = (table: string) => {
    setSelectedTable(table);
    setSelectedColumns([]);
    setFilters([]);
    setSortColumn('');
    setResults(null);
  };

  const toggleColumn = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const addFilter = () => {
    if (!tableConfig) return;
    setFilters((f) => [...f, { column: tableConfig.columns[0], operator: 'eq', value: '' }]);
  };

  const removeFilter = (index: number) => {
    setFilters((f) => f.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: keyof Filter, value: string) => {
    setFilters((f) => f.map((filter, i) => (i === index ? { ...filter, [field]: value } : filter)));
  };

  const executeQuery = async () => {
    if (!supabase || !selectedTable) return;
    setIsLoading(true);
    try {
      const cols = selectedColumns.length > 0 ? selectedColumns.join(',') : '*';
      let query = supabase.from(selectedTable as any).select(cols).limit(limit);

      for (const filter of filters) {
        if (!filter.value) continue;
        switch (filter.operator) {
          case 'eq': query = query.eq(filter.column, filter.value); break;
          case 'neq': query = query.neq(filter.column, filter.value); break;
          case 'gt': query = query.gt(filter.column, filter.value); break;
          case 'lt': query = query.lt(filter.column, filter.value); break;
          case 'gte': query = query.gte(filter.column, filter.value); break;
          case 'lte': query = query.lte(filter.column, filter.value); break;
          case 'like': query = query.ilike(filter.column, `%${filter.value}%`); break;
        }
      }

      if (sortColumn) {
        query = query.order(sortColumn);
      }

      const { data, error } = await query;
      if (error) throw error;
      setResults(data || []);
    } catch (err: any) {
      toast({ title: 'Abfrage fehlgeschlagen', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    if (!results || results.length === 0) return;
    const headers = Object.keys(results[0]);
    const csv = [
      headers.join(';'),
      ...results.map((row) => headers.map((h) => `"${row[h] ?? ''}"`).join(';')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${selectedTable}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Ad-hoc Reporting" subtitle="Erstellen Sie individuelle Berichte">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Query Builder Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5" />
                Abfrage erstellen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tabelle</Label>
                <Select value={selectedTable} onValueChange={handleTableChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tabelle wählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TABLES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tableConfig && (
                <>
                  <div className="space-y-2">
                    <Label>Spalten</Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {tableConfig.columns.map((col) => (
                        <div key={col} className="flex items-center space-x-2">
                          <Checkbox
                            id={col}
                            checked={selectedColumns.includes(col)}
                            onCheckedChange={() => toggleColumn(col)}
                          />
                          <Label htmlFor={col} className="font-normal text-sm">
                            {col}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Filter</Label>
                      <Button variant="ghost" size="sm" onClick={addFilter}>
                        <Plus className="h-3 w-3 mr-1" />
                        Hinzufügen
                      </Button>
                    </div>
                    {filters.map((filter, i) => (
                      <div key={i} className="flex gap-1 items-center">
                        <Select
                          value={filter.column}
                          onValueChange={(v) => updateFilter(i, 'column', v)}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tableConfig.columns.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={filter.operator}
                          onValueChange={(v) => updateFilter(i, 'operator', v)}
                        >
                          <SelectTrigger className="w-16 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="h-8 text-xs flex-1"
                          value={filter.value}
                          onChange={(e) => updateFilter(i, 'value', e.target.value)}
                          placeholder="Wert..."
                        />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeFilter(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Sortierung</Label>
                    <Select value={sortColumn} onValueChange={setSortColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Keine" />
                      </SelectTrigger>
                      <SelectContent>
                        {tableConfig.columns.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Limit</Label>
                    <Input
                      type="number"
                      value={limit}
                      onChange={(e) => setLimit(Math.min(500, parseInt(e.target.value) || 100))}
                      min={1}
                      max={500}
                    />
                  </div>
                </>
              )}

              <Button
                className="w-full"
                onClick={executeQuery}
                disabled={!selectedTable || isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Ausführen
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Ergebnis
                {results && <Badge variant="outline" className="ml-2">{results.length} Zeilen</Badge>}
              </CardTitle>
              {results && results.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV Export
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {results === null ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Erstellen Sie eine Abfrage und klicken Sie auf "Ausführen"</p>
                </div>
              ) : results.length === 0 ? (
                <p className="text-center py-12 text-muted-foreground">Keine Ergebnisse</p>
              ) : (
                <div className="overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(results[0]).map((key) => (
                          <TableHead key={key} className="text-xs whitespace-nowrap">
                            {key}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((val: any, j) => (
                            <TableCell key={j} className="text-xs whitespace-nowrap">
                              {val === null ? '—' : String(val)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
