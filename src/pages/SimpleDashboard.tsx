export default function SimpleDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Property Partner Pro</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
          <p>Dashboard lädt erfolgreich!</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p>✅ System funktioniert</p>
        </div>
      </div>
    </div>
  );
}
