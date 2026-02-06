import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, List, BarChart3, Plus } from 'lucide-react';
import { JournalView } from '@/components/accounting/JournalView';
import { ChartOfAccountsView } from '@/components/accounting/ChartOfAccountsView';
import { TrialBalanceView } from '@/components/accounting/TrialBalanceView';

export default function Accounting() {
  const [activeTab, setActiveTab] = useState('journal');

  return (
    <MainLayout
      title="Buchhaltung"
      subtitle="Doppelte Buchführung – Journal, Kontenplan & Saldenliste"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
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
      </Tabs>
    </MainLayout>
  );
}
