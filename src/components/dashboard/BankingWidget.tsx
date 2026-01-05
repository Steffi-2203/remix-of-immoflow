import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, CheckCircle2, AlertCircle, ArrowRight, Upload, Loader2, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useRecentTransactions, useUnmatchedTransactions } from '@/hooks/useTransactions';
import { useUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';

export function BankingWidget() {
  const { data: recentTransactions = [], isLoading } = useRecentTransactions(5);
  const { data: unmatchedTransactions = [] } = useUnmatchedTransactions();
  const { data: units = [] } = useUnits();
  const { data: properties = [] } = useProperties();

  const getUnitInfo = (unitId: string | null) => {
    if (!unitId) return null;
    const unit = units.find(u => u.id === unitId);
    if (!unit) return null;
    const property = properties.find(p => p.id === unit.property_id);
    return { unit, property };
  };

  const totalUnmatched = unmatchedTransactions.length;
  const recentIncome = recentTransactions
    .filter(t => t.amount > 0 && t.status === 'matched')
    .reduce((sum, t) => sum + t.amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Letzte Zahlungseingänge</CardTitle>
        <Link to="/banking">
          <Button variant="ghost" size="sm">
            Alle anzeigen
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Euro className="h-4 w-4" />
              Eingänge (letzte 10)
            </div>
            <p className="text-xl font-semibold text-green-600">
              {new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(recentIncome)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertCircle className="h-4 w-4" />
              Offene Zuordnungen
            </div>
            <p className={`text-xl font-semibold ${totalUnmatched > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {totalUnmatched}
            </p>
          </div>
        </div>

        {/* Recent Transactions */}
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Noch keine Transaktionen</p>
            <Link to="/banking">
              <Button variant="outline" size="sm" className="mt-3">
                <Upload className="h-4 w-4 mr-2" />
                Kontoauszug importieren
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.slice(0, 5).map((transaction) => {
              const unitInfo = getUnitInfo(transaction.unit_id);
              
              return (
                <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {transaction.status === 'matched' ? (
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium truncate max-w-[150px]">
                        {transaction.counterpart_name || 'Unbekannt'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(transaction.transaction_date), 'dd.MM.yy', { locale: de })}</span>
                        {unitInfo && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {unitInfo.unit.top_nummer}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount >= 0 ? '+' : ''}
                      {new Intl.NumberFormat('de-AT', { style: 'currency', currency: transaction.currency }).format(transaction.amount)}
                    </p>
                    <Badge variant={transaction.status === 'matched' ? 'default' : 'secondary'} className="text-xs">
                      {transaction.status === 'matched' ? 'Zugeordnet' : 'Offen'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalUnmatched > 0 && (
          <Link to="/banking" className="block mt-4">
            <Button variant="outline" className="w-full" size="sm">
              <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
              {totalUnmatched} offene Zuordnung{totalUnmatched !== 1 ? 'en' : ''} bearbeiten
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
