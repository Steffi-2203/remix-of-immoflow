import { MainLayout } from "@/components/layout/MainLayout";

const NewDashboard = () => {
  return (
    <MainLayout title="Dashboard">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground">Willkommen zurück!</p>
        
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">Liegenschaften</h3>
            <p className="text-2xl font-bold mt-2">-</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">Einheiten</h3>
            <p className="text-2xl font-bold mt-2">-</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">Mieter</h3>
            <p className="text-2xl font-bold mt-2">-</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">Offene Zahlungen</h3>
            <p className="text-2xl font-bold mt-2">-</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default NewDashboard;
