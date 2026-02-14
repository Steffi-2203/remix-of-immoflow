import { Suspense, lazy } from "react";
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
import { Loader2 } from "lucide-react";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import SimpleDashboard from "./pages/SimpleDashboard";
import PropertyList from "./pages/PropertyList";
import PropertyDetail from "./pages/PropertyDetail";
import PropertyForm from "./pages/PropertyForm";
import NotFound from "./pages/NotFound";

const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Register = lazy(() => import("./pages/Register"));
const UnitList = lazy(() => import("./pages/UnitList"));
const UnitDetail = lazy(() => import("./pages/UnitDetail"));
const UnitForm = lazy(() => import("./pages/UnitForm"));
const TenantForm = lazy(() => import("./pages/TenantForm"));
const TenantList = lazy(() => import("./pages/TenantList"));
const TenantDetail = lazy(() => import("./pages/TenantDetail"));
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
const BankReconciliation = lazy(() => import("./pages/BankReconciliation"));
const AutoMatch = lazy(() => import("./pages/AutoMatch"));
const Accounting = lazy(() => import("./pages/Accounting"));
const MaintenanceHub = lazy(() => import("./pages/MaintenanceHub"));
const MessagesPage = lazy(() => import("./pages/Messages"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const Budgets = lazy(() => import("./pages/Budgets"));
const TenantPortal = lazy(() => import("./pages/TenantPortal"));
const WegManagement = lazy(() => import("./pages/WegManagement"));
const WegVorschreibungen = lazy(() => import("./pages/WegVorschreibungen"));
const InsuranceManagement = lazy(() => import("./pages/InsuranceManagement"));
const DeadlineCalendar = lazy(() => import("./pages/DeadlineCalendar"));
const SerialLetters = lazy(() => import("./pages/SerialLetters"));
const ManagementContracts = lazy(() => import("./pages/ManagementContracts"));
const Impressum = lazy(() => import("./pages/Impressum"));
const Datenschutz = lazy(() => import("./pages/Datenschutz"));
const AGB = lazy(() => import("./pages/AGB"));
const DsgvoCompliance = lazy(() => import("./pages/DsgvoCompliance"));
const SecurityDashboard = lazy(() => import("./pages/SecurityDashboard"));
const SupportTickets = lazy(() => import("./pages/SupportTickets"));
const GuidedWorkflows = lazy(() => import("./pages/GuidedWorkflows"));
const EsgDashboard = lazy(() => import("./pages/EsgDashboard"));
const DamageReports = lazy(() => import("./pages/DamageReports"));
const TenantLogin = lazy(() => import("./pages/TenantLogin"));
const TenantPortalStandalone = lazy(() => import("./pages/TenantPortalStandalone"));
const OwnerLogin = lazy(() => import("./pages/OwnerLogin"));
const OwnerPortalStandalone = lazy(() => import("./pages/OwnerPortalStandalone"));
const OwnerPortal = lazy(() => import("./pages/OwnerPortal"));
const LeaseContractGenerator = lazy(() => import("./pages/LeaseContractGenerator"));
const KiAssistent = lazy(() => import("./pages/KiAssistent"));
const AutomationSettings = lazy(() => import("./pages/AutomationSettings"));
const InvoiceOcr = lazy(() => import("./pages/InvoiceOcr"));
const KiInsights = lazy(() => import("./pages/KiInsights"));
const KiKommunikation = lazy(() => import("./pages/KiKommunikation"));
const EbicsBanking = lazy(() => import("./pages/EbicsBanking"));
const OffenePosten = lazy(() => import("./pages/OffenePosten"));
const Jahresabschluss = lazy(() => import("./pages/Jahresabschluss"));
const ScheduledReports = lazy(() => import("./pages/ScheduledReports"));
const Signatures = lazy(() => import("./pages/Signatures"));
const QueryBuilder = lazy(() => import("./pages/QueryBuilder"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen" data-testid="page-loader">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

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
            <Route path="/mieter-portal" element={<TenantPortalStandalone />} />
            <Route path="/eigentuemer-login" element={<OwnerLogin />} />
            <Route path="/eigentuemer-portal" element={<OwnerPortalStandalone />} />
            
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
            <Route path="/buchhaltung" element={<Navigate to="/finanzbuchhaltung" replace />} />
            <Route path="/auto-zuordnung" element={<ProtectedRoute><DemoDataProvider><AutoMatch /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/bank-abgleich" element={<ProtectedRoute><DemoDataProvider><BankReconciliation /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/finanzbuchhaltung" element={<ProtectedRoute><DemoDataProvider><Accounting /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/ebics-banking" element={<ProtectedRoute><DemoDataProvider><EbicsBanking /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/offene-posten" element={<ProtectedRoute><DemoDataProvider><OffenePosten /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/jahresabschluss" element={<ProtectedRoute><DemoDataProvider><Jahresabschluss /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/kosten" element={<ProtectedRoute><DemoDataProvider><CostsHub /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/abrechnung" element={<ProtectedRoute><DemoDataProvider><OperatingCostSettlement /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/dokumente" element={<ProtectedRoute><DemoDataProvider><Documents /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><DemoDataProvider><Reports /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/geplante-berichte" element={<ProtectedRoute><DemoDataProvider><ScheduledReports /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/wartungen" element={<ProtectedRoute><DemoDataProvider><MaintenanceHub /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/budgets" element={<ProtectedRoute><DemoDataProvider><Budgets /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/nachrichten" element={<ProtectedRoute><DemoDataProvider><MessagesPage /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><DemoDataProvider><TeamManagement /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/weg" element={<ProtectedRoute><DemoDataProvider><WegManagement /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/weg-vorschreibungen" element={<ProtectedRoute><DemoDataProvider><WegVorschreibungen /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/versicherungen" element={<ProtectedRoute><DemoDataProvider><InsuranceManagement /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/fristen" element={<ProtectedRoute><DemoDataProvider><DeadlineCalendar /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/serienbriefe" element={<ProtectedRoute><DemoDataProvider><SerialLetters /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/hv-vertraege" element={<ProtectedRoute><DemoDataProvider><ManagementContracts /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/mieterportal" element={<ProtectedRoute><DemoDataProvider><TenantPortal /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/eigentuemerportal" element={<ProtectedRoute><DemoDataProvider><OwnerPortal /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/dsgvo" element={<ProtectedRoute><DemoDataProvider><DsgvoCompliance /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/sicherheit" element={<ProtectedRoute><DemoDataProvider><SecurityDashboard /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/tickets" element={<ProtectedRoute><DemoDataProvider><SupportTickets /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/workflows" element={<ProtectedRoute><DemoDataProvider><GuidedWorkflows /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/esg" element={<ProtectedRoute><DemoDataProvider><EsgDashboard /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/schadensmeldungen" element={<ProtectedRoute><DemoDataProvider><DamageReports /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/mietvertrag-generator" element={<ProtectedRoute><DemoDataProvider><LeaseContractGenerator /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/ki-assistent" element={<ProtectedRoute><DemoDataProvider><KiAssistent /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/automatisierung" element={<ProtectedRoute><DemoDataProvider><AutomationSettings /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/ki-rechnungen" element={<ProtectedRoute><DemoDataProvider><InvoiceOcr /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/ki-insights" element={<ProtectedRoute><DemoDataProvider><KiInsights /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/ki-kommunikation" element={<ProtectedRoute><DemoDataProvider><KiKommunikation /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/signaturen" element={<ProtectedRoute><DemoDataProvider><Signatures /></DemoDataProvider></ProtectedRoute>} />
            <Route path="/abfrage-builder" element={<ProtectedRoute><DemoDataProvider><QueryBuilder /></DemoDataProvider></ProtectedRoute>} />
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
