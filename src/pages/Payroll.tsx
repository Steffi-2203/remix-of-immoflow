import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmployeeList } from '@/components/payroll/EmployeeList';
import { PayrollCalculation } from '@/components/payroll/PayrollCalculation';
import { EldaExport } from '@/components/payroll/EldaExport';

export default function Payroll() {
  const [activeTab, setActiveTab] = useState('employees');

  return (
    <MainLayout title="Lohnverrechnung" subtitle="Hausbetreuer verwalten, Löhne berechnen und ELDA-Meldungen exportieren">
      <div className="space-y-6">

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="employees">Hausbetreuer</TabsTrigger>
            <TabsTrigger value="payroll">Lohnabrechnung</TabsTrigger>
            <TabsTrigger value="elda">ELDA-Export</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="mt-6">
            <EmployeeList />
          </TabsContent>

          <TabsContent value="payroll" className="mt-6">
            <PayrollCalculation />
          </TabsContent>

          <TabsContent value="elda" className="mt-6">
            <EldaExport />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
