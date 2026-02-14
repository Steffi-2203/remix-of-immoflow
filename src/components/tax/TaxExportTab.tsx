import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Save, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useTaxReport, useGenerateTaxReport, downloadE1aXml } from '@/hooks/useTaxReports';

interface PropertyOwner {
  id: string;
  name: string;
  property_id: string;
  ownership_share: string;
}

const KZ_LABELS: Record<string, string> = {
  kz370: 'KZ 370 – Mieteinnahmen brutto',
  kz371: 'KZ 371 – Betriebskosten-Einnahmen',
  kz380: 'KZ 380 – Werbungskosten (Instandhaltung)',
  kz381: 'KZ 381 – AfA (Absetzung für Abnutzung)',
  kz382: 'KZ 382 – Zinsen Fremdkapital',
  kz383: 'KZ 383 – Verwaltungskosten',
  kz390: 'KZ 390 – Einkünfte aus V+V (Saldo)',
};

export function TaxExportTab() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear - 1));
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  const { data: owners, isLoading: ownersLoading } = useQuery<PropertyOwner[]>({
    queryKey: ['property-owners-list'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/property-owners');
      return res.json();
    },
  });

  const { data: report, isLoading: reportLoading } = useTaxReport(
    selectedOwnerId,
    parseInt(selectedYear)
  );

  const generateMutation = useGenerateTaxReport();

  const uniqueOwners = owners
    ? Array.from(new Map(owners.map((o) => [o.id, o])).values())
    : [];

  const fmt = (n: number) =>
    n.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            E1a Steuer-Export
          </CardTitle>
          <CardDescription>
            Beilage zur Einkommensteuererklärung – Einkünfte aus Vermietung und Verpachtung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Jahr" />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear - 2, currentYear - 3, currentYear].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedOwnerId ?? ''}
              onValueChange={(v) => setSelectedOwnerId(v || null)}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Eigentümer wählen..." />
              </SelectTrigger>
              <SelectContent>
                {ownersLoading ? (
                  <SelectItem value="_loading" disabled>
                    Laden...
                  </SelectItem>
                ) : uniqueOwners.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    Keine Eigentümer vorhanden
                  </SelectItem>
                ) : (
                  uniqueOwners.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {reportLoading && selectedOwnerId && (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}

          {report && (
            <>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kennzahl</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(KZ_LABELS).map(([key, label]) => {
                      const value = report.totals[key as keyof typeof report.totals];
                      const isSaldo = key === 'kz390';
                      return (
                        <TableRow key={key} className={isSaldo ? 'font-bold bg-muted/50' : ''}>
                          <TableCell>{label}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(value)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {report.properties.length > 1 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Aufschlüsselung nach Liegenschaft
                  </h4>
                  {report.properties.map((p) => (
                    <Card key={p.propertyId} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{p.propertyName}</span>
                        <Badge variant="secondary">{p.ownershipShare}% Anteil</Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Miete:</span>{' '}
                          {fmt(p.kennzahlen.kz370)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">BK:</span>{' '}
                          {fmt(p.kennzahlen.kz371)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">AfA:</span>{' '}
                          {fmt(p.kennzahlen.kz381)}
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">Saldo:</span>{' '}
                          <span className="font-semibold">{fmt(p.kennzahlen.kz390)}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => downloadE1aXml(report.ownerId, report.taxYear)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  XML für FinanzOnline
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    generateMutation.mutate({
                      ownerId: report.ownerId,
                      taxYear: report.taxYear,
                    })
                  }
                  disabled={generateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Bericht speichern
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
