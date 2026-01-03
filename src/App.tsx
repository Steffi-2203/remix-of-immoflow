import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PropertyList from "./pages/PropertyList";
import PropertyDetail from "./pages/PropertyDetail";
import UnitList from "./pages/UnitList";
import TenantList from "./pages/TenantList";
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
          <Route path="/liegenschaften/:id" element={<PropertyDetail />} />
          <Route path="/liegenschaften/neu" element={<ComingSoon title="Neue Liegenschaft" subtitle="Liegenschaft anlegen" />} />
          <Route path="/einheiten" element={<UnitList />} />
          <Route path="/mieter" element={<TenantList />} />
          <Route path="/vorschreibungen" element={<ComingSoon title="Vorschreibungen" subtitle="Monatliche Mietvorschreibungen" />} />
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
