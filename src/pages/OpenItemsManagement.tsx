import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OpenItemsList } from '@/components/op-management/OpenItemsList';
import { BankMatchingView } from '@/components/op-management/BankMatchingView';
import { ReconciliationOverview } from '@/components/op-management/ReconciliationOverview';
import { List, GitCompareArrows, LayoutDashboard } from 'lucide-react';

export default function OpenItemsManagement() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <MainLayout
      title="Offene-Posten-Management"
      subtitle="OP-Pflege, Bank-Abgleich und tägliche Abstimmung"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Abstimmung
          </TabsTrigger>
          <TabsTrigger value="items" className="gap-2">
            <List className="h-4 w-4" />
            OP-Liste
          </TabsTrigger>
          <TabsTrigger value="matching" className="gap-2">
            <GitCompareArrows className="h-4 w-4" />
            Bank↔OP Match
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ReconciliationOverview />
        </TabsContent>
        <TabsContent value="items">
          <OpenItemsList />
        </TabsContent>
        <TabsContent value="matching">
          <BankMatchingView />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
