import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import SimpleDashboard from "./pages/SimpleDashboard";
import PropertyList from "./pages/PropertyList";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyForm from "./pages/PropertyForm";
import UnitList from "./pages/UnitList";
import UnitDetail from "./pages/UnitDetail";
import UnitForm from "./pages/UnitForm";
import TenantForm from "./pages/TenantForm";
import TenantList from "./pages/TenantList";
import PaymentList from "./pages/PaymentList";
import ExpenseList from "./pages/ExpenseList";
import InvoiceList from "./pages/InvoiceList";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import Reports from "./pages/Reports";
import OperatingCostSettlement from "./pages/OperatingCostSettlement";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import AdminUsers from "./pages/AdminUsers";
import SystemTest from "./pages/SystemTest";
import Banking from "./pages/Banking";
import Maintenance from "./pages/Maintenance";
import InvoiceApproval from "./pages/InvoiceApproval";
import MessagesPage from "./pages/Messages";
import TeamManagement from "./pages/TeamManagement";
import Contractors from "./pages/Contractors";
import OwnerList from "./pages/OwnerList";
import Dunning from "./pages/Dunning";
import Budgets from "./pages/Budgets";
import MeterReadings from "./pages/MeterReadings";
import KeyManagement from "./pages/KeyManagement";
import NotFound from "./pages/NotFound";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import AGB from "./pages/AGB";
import Pricing from "./pages/Pricing";
import Checkout from "./pages/Checkout";

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
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Register route only accessible via invite token */}
            <Route path="/register" element={<Register />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/agb" element={<AGB />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/checkout" element={<Checkout />} />
            
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
            <Route path="/mieter" element={<ProtectedRoute><TenantList /></ProtectedRoute>} />
            <Route path="/mieter/neu" element={<ProtectedRoute><TenantForm /></ProtectedRoute>} />
            <Route path="/mieter/:tenantId/bearbeiten" element={<ProtectedRoute><TenantForm /></ProtectedRoute>} />
            <Route path="/zahlungen" element={<ProtectedRoute><PaymentList /></ProtectedRoute>} />
            <Route path="/buchhaltung" element={<ProtectedRoute><Banking /></ProtectedRoute>} />
            <Route path="/kosten" element={<ProtectedRoute><ExpenseList /></ProtectedRoute>} />
            <Route path="/vorschreibungen" element={<ProtectedRoute><InvoiceList /></ProtectedRoute>} />
            <Route path="/abrechnung" element={<ProtectedRoute><OperatingCostSettlement /></ProtectedRoute>} />
            <Route path="/dokumente" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/wartungen" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
            <Route path="/handwerker" element={<ProtectedRoute><Contractors /></ProtectedRoute>} />
            <Route path="/eigentuemer" element={<ProtectedRoute><OwnerList /></ProtectedRoute>} />
            <Route path="/mahnwesen" element={<ProtectedRoute><Dunning /></ProtectedRoute>} />
            <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
            <Route path="/zaehlerstaende" element={<ProtectedRoute><MeterReadings /></ProtectedRoute>} />
            <Route path="/schluessel" element={<ProtectedRoute><KeyManagement /></ProtectedRoute>} />
            <Route path="/rechnungsfreigabe" element={<ProtectedRoute><InvoiceApproval /></ProtectedRoute>} />
            <Route path="/nachrichten" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
            <Route path="/einstellungen" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
            <Route path="/admin/system-test" element={<AdminRoute><SystemTest /></AdminRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
