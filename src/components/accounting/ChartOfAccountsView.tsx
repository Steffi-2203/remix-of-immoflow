import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const typeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  asset: { label: 'Aktiva', variant: 'default' },
  liability: { label: 'Passiva', variant: 'secondary' },
  equity: { label: 'Eigenkapital', variant: 'outline' },
  income: { label: 'Ertrag', variant: 'default' },
  expense: { label: 'Aufwand', variant: 'destructive' },
};

export function ChartOfAccountsView() {
  const { data: accounts, isLoading } = useChartOfAccounts();

  // Group by type
  const grouped = (accounts || []).reduce((acc, account) => {
    const type = account.account_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {} as Record<string, typeof accounts>);

  const typeOrder = ['asset', 'liability', 'equity', 'income', 'expense'];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {typeOrder.map((type) => {
        const items = grouped[type];
        if (!items?.length) return null;
        const config = typeLabels[type];

        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant={config.variant}>{config.label}</Badge>
                <span className="text-muted-foreground font-normal text-sm">
                  ({items.length} Konten)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Konto-Nr.</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead>Beschreibung</TableHead>
                    <TableHead className="w-[100px]">System</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono font-bold">{acc.account_number}</TableCell>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{acc.description || '–'}</TableCell>
                      <TableCell>
                        {acc.is_system && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
