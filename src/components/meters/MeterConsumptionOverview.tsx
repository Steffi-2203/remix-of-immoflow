import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Flame, Droplets, Zap, Gauge } from 'lucide-react';
import { useHeatingCostReadings } from '@/hooks/useHeatingCostReadings';
import { useUnits } from '@/hooks/useUnits';

interface MeterConsumptionOverviewProps {
  propertyId: string;
  periodFrom?: string;
  periodTo?: string;
}

const typeIcons: Record<string, any> = {
  heizung: Flame,
  warmwasser: Droplets,
  strom: Zap,
  gas: Flame,
  wasser: Droplets,
};

export function MeterConsumptionOverview({ propertyId, periodFrom, periodTo }: MeterConsumptionOverviewProps) {
  const { data: readings = [], isLoading } = useHeatingCostReadings(propertyId, periodFrom, periodTo);
  const { data: units = [] } = useUnits(propertyId);

  const summary = useMemo(() => {
    const byUnit: Record<string, { unitId: string; topNummer: string; consumption: number; unit: string; costShare: number; provider: string }> = {};
    
    for (const r of readings) {
      const unit = units.find((u: any) => u.id === r.unit_id);
      const key = r.unit_id;
      if (!byUnit[key]) {
        byUnit[key] = {
          unitId: r.unit_id,
          topNummer: (unit as any)?.top_nummer || '?',
          consumption: 0,
          unit: r.consumption_unit,
          costShare: 0,
          provider: r.provider || '—',
        };
      }
      byUnit[key].consumption += r.consumption;
      byUnit[key].costShare += r.cost_share;
    }

    return Object.values(byUnit).sort((a, b) => a.topNummer.localeCompare(b.topNummer));
  }, [readings, units]);

  const totalCost = summary.reduce((s, r) => s + r.costShare, 0);
  const totalConsumption = summary.reduce((s, r) => s + r.consumption, 0);

  if (isLoading) return null;
  if (readings.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4" />
          Verbrauchsübersicht
          <Badge variant="secondary">{readings.length} Ablesungen</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Einheit</TableHead>
              <TableHead>Anbieter</TableHead>
              <TableHead className="text-right">Verbrauch</TableHead>
              <TableHead className="text-right">Kosten (€)</TableHead>
              <TableHead className="text-right">Anteil</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map((row) => (
              <TableRow key={row.unitId}>
                <TableCell className="font-medium">Top {row.topNummer}</TableCell>
                <TableCell className="text-muted-foreground">{row.provider}</TableCell>
                <TableCell className="text-right">{row.consumption.toFixed(1)} {row.unit}</TableCell>
                <TableCell className="text-right font-medium">€ {row.costShare.toFixed(2)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {totalCost > 0 ? ((row.costShare / totalCost) * 100).toFixed(1) : '0.0'}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold border-t-2">
              <TableCell>Gesamt</TableCell>
              <TableCell />
              <TableCell className="text-right">{totalConsumption.toFixed(1)}</TableCell>
              <TableCell className="text-right">€ {totalCost.toFixed(2)}</TableCell>
              <TableCell className="text-right">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
