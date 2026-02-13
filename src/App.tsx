import { lazy, Suspense } from "react";
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

// Lazy-loaded pages for code-splitting
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Register = lazy(() => import("./pages/Register"));
const SimpleDashboard = lazy(() => import("./pages/SimpleDashboard"));
const PropertyList = lazy(() => import("./pages/PropertyList"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const PropertyForm = lazy(() => import("./pages/PropertyForm"));
const UnitList = lazy(() => import("./pages/UnitList"));
const UnitDetail = lazy(() => import("./pages/UnitDetail"));
const UnitForm = lazy(() => import("./pages/UnitForm"));
const TenantForm = lazy(() => import("./pages/TenantForm"));
const TenantList = lazy(() => import("./pages/TenantList"));
const RentalFinance = lazy(() => import("./pages/RentalFinance"));
const CostsHub = lazy(() => import("./pages/CostsHub"));
const AdminAuditLogs = lazy(() => import("./pages/AdminAuditLogs"));
const Reports = lazy(() => import("./pages/Reports"));
const OperatingCostSettlement = lazy(() => import("./pages/OperatingCostSettlement"));
const Documents = lazy(() => import("./pages/Documents"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const SystemTest = lazy(() => import("./pages/SystemTest"));
const Banking = lazy(() => import("./pages/Banking"));
const Accounting = lazy(() => import("./pages/Accounting"));
const MaintenanceHub = lazy(() => import("./pages/MaintenanceHub"));
const MessagesPage = lazy(() => import("./pages/Messages"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const Budgets = lazy(() => import("./pages/Budgets"));
const TenantDetail = lazy(() => import("./pages/TenantDetail"));
const TenantPortal = lazy(() => import("./pages/TenantPortal"));
const WegManagement = lazy(() => import("./pages/WegManagement"));
const InsuranceManagement = lazy(() => import("./pages/InsuranceManagement"));
const DeadlineCalendar = lazy(() => import("./pages/DeadlineCalendar"));
const SerialLetters = lazy(() => import("./pages/SerialLetters"));
const ManagementContracts = lazy(() => import("./pages/ManagementContracts"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Impressum = lazy(() => import("./pages/Impressum"));
const Datenschutz = lazy(() => import("./pages/Datenschutz"));
const AGB = lazy(() => import("./pages/AGB"));
const BatchOperations = lazy(() => import("./pages/BatchOperations"));
const OwnerPortal = lazy(() => import("./pages/OwnerPortal"));
const ReconciliationDashboard = lazy(() => import("./pages/ReconciliationDashboard"));
const AdminPaymentsJobs = lazy(() => import("./pages/AdminPaymentsJobs"));
const TenantLogin = lazy(() => import("./pages/TenantLogin"));
const MeterManagement = lazy(() => import("./pages/MeterManagement"));
const AnnouncementsPage = lazy(() => import("./pages/AnnouncementsPage"));
const ManagementFeesPage = lazy(() => import("./pages/ManagementFeesPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ActiveOrganizationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
          </Suspense>
          <CookieConsent />
        </BrowserRouter>
      </TooltipProvider>
      </ActiveOrganizationProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
