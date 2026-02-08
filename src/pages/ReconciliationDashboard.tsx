import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReconciliationRunsList } from '@/components/reconciliation/RunsList';
import { ReconciliationRunDetail } from '@/components/reconciliation/RunDetail';
import { ReconciliationDuplicates } from '@/components/reconciliation/DuplicatesTab';
import { ReconciliationAuditExplorer } from '@/components/reconciliation/AuditExplorer';
import { ListChecks, Search, GitMerge, FileText } from 'lucide-react';

export default function ReconciliationDashboard() {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('runs');

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    setActiveTab('detail');
  };

  return (
    <MainLayout
      title="Reconciliation Dashboard"
      subtitle="Run Lifecycle, Samples, Duplikat-Auflösung und Audit-Explorer"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="runs" className="gap-1.5">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Runs</span>
          </TabsTrigger>
          <TabsTrigger value="detail" className="gap-1.5" disabled={!selectedRunId}>
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Detail</span>
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="gap-1.5">
            <GitMerge className="h-4 w-4" />
            <span className="hidden sm:inline">Duplikate</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="runs">
          <ReconciliationRunsList onSelectRun={handleSelectRun} />
        </TabsContent>

        <TabsContent value="detail">
          {selectedRunId ? (
            <ReconciliationRunDetail
              runId={selectedRunId}
              onBack={() => setActiveTab('runs')}
            />
          ) : (
            <p className="text-muted-foreground text-center py-12">
              Wähle einen Run aus der Liste
            </p>
          )}
        </TabsContent>

        <TabsContent value="duplicates">
          <ReconciliationDuplicates />
        </TabsContent>

        <TabsContent value="audit">
          <ReconciliationAuditExplorer />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
