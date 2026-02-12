import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";
import { DemoDataProvider } from "@/contexts/DemoDataContext";
import { ActiveOrganizationProvider } from "@/contexts/ActiveOrganizationContext";
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
import RentalFinance from "./pages/RentalFinance";
import CostsHub from "./pages/CostsHub";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import Reports from "./pages/Reports";
import OperatingCostSettlement from "./pages/OperatingCostSettlement";
import Documents from "./pages/Documents";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import AdminUsers from "./pages/AdminUsers";
import SystemTest from "./pages/SystemTest";
import Banking from "./pages/Banking";
import Accounting from "./pages/Accounting";
import MaintenanceHub from "./pages/MaintenanceHub";
import MessagesPage from "./pages/Messages";
import TeamManagement from "./pages/TeamManagement";
import Budgets from "./pages/Budgets";
import TenantDetail from "./pages/TenantDetail";
import TenantPortal from "./pages/TenantPortal";
import WegManagement from "./pages/WegManagement";
import InsuranceManagement from "./pages/InsuranceManagement";
import DeadlineCalendar from "./pages/DeadlineCalendar";
import SerialLetters from "./pages/SerialLetters";
import ManagementContracts from "./pages/ManagementContracts";
import NotFound from "./pages/NotFound";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import AGB from "./pages/AGB";
import BatchOperations from "./pages/BatchOperations";
import OwnerPortal from "./pages/OwnerPortal";
import ReconciliationDashboard from "./pages/ReconciliationDashboard";
import AdminPaymentsJobs from "./pages/AdminPaymentsJobs";
import TenantLogin from "./pages/TenantLogin";
import MeterManagement from "./pages/MeterManagement";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import ManagementFeesPage from "./pages/ManagementFeesPage";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ActiveOrganizationProvider>
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
            <Route path="/mieter-login" element={<TenantLogin />} />
            
            {/* Protected routes - wrapped with DemoDataProvider */}
            <Route path="/dashboard" element={<ProtectedRoute><DemoDataProvider><SimpleDashboard /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/liegenschaften" element={<ProtectedRoute><DemoDataProvider><PropertyList /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/liegenschaften/neu" element={<ProtectedRoute><DemoDataProvider><PropertyForm /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/liegenschaften/:id" element={<ProtectedRoute><DemoDataProvider><PropertyDetail /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/liegenschaften/:id/bearbeiten" element={<ProtectedRoute><DemoDataProvider><PropertyForm /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/liegenschaften/:propertyId/einheiten/neu" element={<ProtectedRoute><DemoDataProvider><UnitForm /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/liegenschaften/:propertyId/einheiten/:unitId/bearbeiten" element={<ProtectedRoute><DemoDataProvider><UnitForm /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/einheiten" element={<ProtectedRoute><DemoDataProvider><UnitList /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/einheiten/:propertyId/:unitId" element={<ProtectedRoute><DemoDataProvider><UnitDetail /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/einheiten/:propertyId/:unitId/mieter/neu" element={<ProtectedRoute><DemoDataProvider><TenantForm /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/einheiten/:propertyId/:unitId/mieter/:tenantId/bearbeiten" element={<ProtectedRoute><DemoDataProvider><TenantForm /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/mieter" element={<ProtectedRoute><DemoDataProvider><TenantList /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/mieter/neu" element={<ProtectedRoute><DemoDataProvider><TenantForm /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/mieter/:tenantId" element={<ProtectedRoute><DemoDataProvider><TenantDetail /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/mieter/:tenantId/bearbeiten" element={<ProtectedRoute><DemoDataProvider><TenantForm /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/zahlungen" element={<ProtectedRoute><DemoDataProvider><RentalFinance /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/buchhaltung" element={<ProtectedRoute><DemoDataProvider><Banking /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/finanzbuchhaltung" element={<ProtectedRoute><DemoDataProvider><Accounting /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/kosten" element={<ProtectedRoute><DemoDataProvider><CostsHub /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/abrechnung" element={<ProtectedRoute><DemoDataProvider><OperatingCostSettlement /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/dokumente" element={<ProtectedRoute><DemoDataProvider><Documents /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><DemoDataProvider><Reports /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/wartungen" element={<ProtectedRoute><DemoDataProvider><MaintenanceHub /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/budgets" element={<ProtectedRoute><DemoDataProvider><Budgets /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/nachrichten" element={<ProtectedRoute><DemoDataProvider><MessagesPage /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><DemoDataProvider><TeamManagement /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/weg" element={<ProtectedRoute><DemoDataProvider><WegManagement /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/versicherungen" element={<ProtectedRoute><DemoDataProvider><InsuranceManagement /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/fristen" element={<ProtectedRoute><DemoDataProvider><DeadlineCalendar /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/serienbriefe" element={<ProtectedRoute><DemoDataProvider><SerialLetters /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/hv-vertraege" element={<ProtectedRoute><DemoDataProvider><ManagementContracts /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/mieterportal" element={<ProtectedRoute><DemoDataProvider><TenantPortal /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/eigentuemerportal" element={<ProtectedRoute><DemoDataProvider><OwnerPortal /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/massenaktionen" element={<ProtectedRoute><DemoDataProvider><BatchOperations /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/zaehler" element={<ProtectedRoute><DemoDataProvider><MeterManagement /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/ankuendigungen" element={<ProtectedRoute><DemoDataProvider><AnnouncementsPage /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/honorar" element={<ProtectedRoute><DemoDataProvider><ManagementFeesPage /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/einstellungen" element={<ProtectedRoute><DemoDataProvider><Settings /></DemoDataProvider></ProtectedRoute>} />
            {/* Redirects for merged routes */}
            <Route path="/vorschreibungen" element={<Navigate to="/zahlungen?tab=invoices" replace />} />
            <Route path="/mahnwesen" element={<Navigate to="/zahlungen?tab=dunning" replace />} />
            <Route path="/handwerker" element={<Navigate to="/wartungen?tab=contractors" replace />} />
            <Route path="/rechnungsfreigabe" element={<Navigate to="/kosten?tab=approval" replace />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
              <Route path="/admin/reconciliation" element={<AdminRoute><ReconciliationDashboard /></AdminRoute>} />
              <Route path="/admin/payments-jobs" element={<AdminRoute><AdminPaymentsJobs /></AdminRoute>} />
              <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
            <Route path="/admin/system-test" element={<AdminRoute><SystemTest /></AdminRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
      </ActiveOrganizationProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
