import { MainLayout } from "@/components/layout/MainLayout";

export default function SimpleDashboard() {
  return (
    <MainLayout title="Dashboard" subtitle="Übersicht">
      <div className="max-w-4xl">
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
          <p className="text-muted-foreground">Dashboard lädt erfolgreich!</p>
        </div>
        
        <div className="bg-card rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p>✅ System funktioniert</p>
        </div>
      </div>
    </MainLayout>
  );
}
