import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, List, BarChart3, Scale, TrendingUp, Package, FileText } from 'lucide-react';
import { JournalView } from '@/components/accounting/JournalView';
import { ChartOfAccountsView } from '@/components/accounting/ChartOfAccountsView';
import { TrialBalanceView } from '@/components/accounting/TrialBalanceView';
import { BalanceSheetView } from '@/components/accounting/BalanceSheetView';
import { ProfitLossView } from '@/components/accounting/ProfitLossView';
import { FixedAssetsView } from '@/components/accounting/FixedAssetsView';
import { UVAView } from '@/components/accounting/UVAView';

export default function Accounting() {
  const [activeTab, setActiveTab] = useState('journal');

  return (
    <MainLayout
      title="Finanzbuchhaltung"
      subtitle="Doppelte Buchführung – Journal, Bilanz, GuV, AfA & UVA"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="journal" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Journal
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <List className="h-4 w-4" />
            Kontenplan
          </TabsTrigger>
          <TabsTrigger value="balance" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Saldenliste
          </TabsTrigger>
          <TabsTrigger value="bilanz" className="gap-2">
            <Scale className="h-4 w-4" />
            Bilanz
          </TabsTrigger>
          <TabsTrigger value="guv" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            GuV
          </TabsTrigger>
          <TabsTrigger value="assets" className="gap-2">
            <Package className="h-4 w-4" />
            Anlagen (AfA)
          </TabsTrigger>
          <TabsTrigger value="uva" className="gap-2">
            <FileText className="h-4 w-4" />
            UVA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journal">
          <JournalView />
        </TabsContent>
        <TabsContent value="accounts">
          <ChartOfAccountsView />
        </TabsContent>
        <TabsContent value="balance">
          <TrialBalanceView />
        </TabsContent>
        <TabsContent value="bilanz">
          <BalanceSheetView />
        </TabsContent>
        <TabsContent value="guv">
          <ProfitLossView />
        </TabsContent>
        <TabsContent value="assets">
          <FixedAssetsView />
        </TabsContent>
        <TabsContent value="uva">
          <UVAView />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
