import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

export default function Accounting() {
  return (
    <MainLayout title="Finanzbuchhaltung" subtitle="Buchhaltung verwalten">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-accounting-title">Finanzbuchhaltung</h1>
          <p className="text-muted-foreground">Buchhaltungsübersicht und Kontenverwaltung</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Die Finanzbuchhaltung wird in Kürze verfügbar sein.</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
