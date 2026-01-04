import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import SimpleDashboard from "./pages/SimpleDashboard";
import PropertyList from "./pages/PropertyList";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyForm from "./pages/PropertyForm";
import UnitList from "./pages/UnitList";
import UnitDetail from "./pages/UnitDetail";
import UnitForm from "./pages/UnitForm";
import TenantForm from "./pages/TenantForm";
import PaymentList from "./pages/PaymentList";
import ExpenseList from "./pages/ExpenseList";
import Reports from "./pages/Reports";
import OperatingCostSettlement from "./pages/OperatingCostSettlement";
import ComingSoon from "./pages/ComingSoon";
import Upgrade from "./pages/Upgrade";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><SimpleDashboard /></ProtectedRoute>} />
            <Route path="/liegenschaften" element={<ProtectedRoute><PropertyList /></ProtectedRoute>} />
            <Route path="/liegenschaften/neu" element={<ProtectedRoute><PropertyForm /></ProtectedRoute>} />
            <Route path="/liegenschaften/:id" element={<ProtectedRoute><PropertyDetail /></ProtectedRoute>} />
            <Route path="/liegenschaften/:id/bearbeiten" element={<ProtectedRoute><PropertyForm /></ProtectedRoute>} />
            <Route path="/liegenschaften/:propertyId/einheiten/neu" element={<ProtectedRoute><UnitForm /></ProtectedRoute>} />
            <Route path="/liegenschaften/:propertyId/einheiten/:unitId/bearbeiten" element={<ProtectedRoute><UnitForm /></ProtectedRoute>} />
            <Route path="/einheiten" element={<ProtectedRoute><UnitList /></ProtectedRoute>} />
            <Route path="/einheiten/:propertyId/:unitId" element={<ProtectedRoute><UnitDetail /></ProtectedRoute>} />
            <Route path="/einheiten/:propertyId/:unitId/mieter/neu" element={<ProtectedRoute><TenantForm /></ProtectedRoute>} />
            <Route path="/einheiten/:propertyId/:unitId/mieter/:tenantId/bearbeiten" element={<ProtectedRoute><TenantForm /></ProtectedRoute>} />
            <Route path="/zahlungen" element={<ProtectedRoute><PaymentList /></ProtectedRoute>} />
            <Route path="/buchhaltung" element={<ProtectedRoute><ExpenseList /></ProtectedRoute>} />
            <Route path="/abrechnung" element={<ProtectedRoute><OperatingCostSettlement /></ProtectedRoute>} />
            <Route path="/dokumente" element={<ProtectedRoute><ComingSoon title="Dokumente" subtitle="Dokumentenmanagement" /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/einstellungen" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
            <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
