import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PropertyList from "./pages/PropertyList";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyForm from "./pages/PropertyForm";
import UnitList from "./pages/UnitList";
import UnitDetail from "./pages/UnitDetail";
import UnitForm from "./pages/UnitForm";
import TenantForm from "./pages/TenantForm";
import Reports from "./pages/Reports";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/liegenschaften" element={<PropertyList />} />
          <Route path="/liegenschaften/neu" element={<PropertyForm />} />
          <Route path="/liegenschaften/:id" element={<PropertyDetail />} />
          <Route path="/liegenschaften/:id/bearbeiten" element={<PropertyForm />} />
          <Route path="/liegenschaften/:propertyId/einheiten/neu" element={<UnitForm />} />
          <Route path="/liegenschaften/:propertyId/einheiten/:unitId/bearbeiten" element={<UnitForm />} />
          <Route path="/einheiten" element={<UnitList />} />
          <Route path="/einheiten/:propertyId/:unitId" element={<UnitDetail />} />
          <Route path="/einheiten/:propertyId/:unitId/mieter/neu" element={<TenantForm />} />
          <Route path="/einheiten/:propertyId/:unitId/mieter/:tenantId/bearbeiten" element={<TenantForm />} />
          <Route path="/zahlungen" element={<ComingSoon title="Zahlungen" subtitle="Zahlungseingänge und SEPA-Einzüge" />} />
          <Route path="/abrechnung" element={<ComingSoon title="BK-Abrechnung" subtitle="Betriebskostenabrechnung erstellen" />} />
          <Route path="/dokumente" element={<ComingSoon title="Dokumente" subtitle="Dokumentenmanagement" />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/einstellungen" element={<ComingSoon title="Einstellungen" subtitle="System- und Benutzereinstellungen" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;