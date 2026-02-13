import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DemoDataProvider } from "@/contexts/DemoDataContext";

const SimpleDashboard = lazy(() => import("@/pages/SimpleDashboard"));
const PropertyList = lazy(() => import("@/pages/PropertyList"));
const PropertyDetail = lazy(() => import("@/pages/PropertyDetail"));
const PropertyForm = lazy(() => import("@/pages/PropertyForm"));
const UnitList = lazy(() => import("@/pages/UnitList"));
const UnitDetail = lazy(() => import("@/pages/UnitDetail"));
const UnitForm = lazy(() => import("@/pages/UnitForm"));
const TenantForm = lazy(() => import("@/pages/TenantForm"));
const TenantList = lazy(() => import("@/pages/TenantList"));
const TenantDetail = lazy(() => import("@/pages/TenantDetail"));
const RentalFinance = lazy(() => import("@/pages/RentalFinance"));
const CostsHub = lazy(() => import("@/pages/CostsHub"));
const Reports = lazy(() => import("@/pages/Reports"));
const OperatingCostSettlement = lazy(() => import("@/pages/OperatingCostSettlement"));
const Documents = lazy(() => import("@/pages/Documents"));
const Settings = lazy(() => import("@/pages/Settings"));
const Banking = lazy(() => import("@/pages/Banking"));
const Accounting = lazy(() => import("@/pages/Accounting"));
const MaintenanceHub = lazy(() => import("@/pages/MaintenanceHub"));
const MessagesPage = lazy(() => import("@/pages/Messages"));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));
const Budgets = lazy(() => import("@/pages/Budgets"));
const TenantPortal = lazy(() => import("@/pages/TenantPortal"));
const WegManagement = lazy(() => import("@/pages/WegManagement"));
const InsuranceManagement = lazy(() => import("@/pages/InsuranceManagement"));
const DeadlineCalendar = lazy(() => import("@/pages/DeadlineCalendar"));
const SerialLetters = lazy(() => import("@/pages/SerialLetters"));
const ManagementContracts = lazy(() => import("@/pages/ManagementContracts"));
const BatchOperations = lazy(() => import("@/pages/BatchOperations"));
const OwnerPortal = lazy(() => import("@/pages/OwnerPortal"));
const MeterManagement = lazy(() => import("@/pages/MeterManagement"));
const AnnouncementsPage = lazy(() => import("@/pages/AnnouncementsPage"));
const ManagementFeesPage = lazy(() => import("@/pages/ManagementFeesPage"));

/** Wraps a page component with ProtectedRoute + DemoDataProvider */
function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DemoDataProvider>{children}</DemoDataProvider>
    </ProtectedRoute>
  );
}

export const protectedRoutes = (
  <>
    {/* Dashboard */}
    <Route path="/dashboard" element={<Protected><SimpleDashboard /></Protected>} />

    {/* Properties */}
    <Route path="/liegenschaften" element={<Protected><PropertyList /></Protected>} />
    <Route path="/liegenschaften/neu" element={<Protected><PropertyForm /></Protected>} />
    <Route path="/liegenschaften/:id" element={<Protected><PropertyDetail /></Protected>} />
    <Route path="/liegenschaften/:id/bearbeiten" element={<Protected><PropertyForm /></Protected>} />
    <Route path="/liegenschaften/:propertyId/einheiten/neu" element={<Protected><UnitForm /></Protected>} />
    <Route path="/liegenschaften/:propertyId/einheiten/:unitId/bearbeiten" element={<Protected><UnitForm /></Protected>} />

    {/* Units */}
    <Route path="/einheiten" element={<Protected><UnitList /></Protected>} />
    <Route path="/einheiten/:propertyId/:unitId" element={<Protected><UnitDetail /></Protected>} />
    <Route path="/einheiten/:propertyId/:unitId/mieter/neu" element={<Protected><TenantForm /></Protected>} />
    <Route path="/einheiten/:propertyId/:unitId/mieter/:tenantId/bearbeiten" element={<Protected><TenantForm /></Protected>} />

    {/* Tenants */}
    <Route path="/mieter" element={<Protected><TenantList /></Protected>} />
    <Route path="/mieter/neu" element={<Protected><TenantForm /></Protected>} />
    <Route path="/mieter/:tenantId" element={<Protected><TenantDetail /></Protected>} />
    <Route path="/mieter/:tenantId/bearbeiten" element={<Protected><TenantForm /></Protected>} />

    {/* Finance & Accounting */}
    <Route path="/zahlungen" element={<Protected><RentalFinance /></Protected>} />
    <Route path="/buchhaltung" element={<Protected><Banking /></Protected>} />
    <Route path="/finanzbuchhaltung" element={<Protected><Accounting /></Protected>} />
    <Route path="/kosten" element={<Protected><CostsHub /></Protected>} />
    <Route path="/abrechnung" element={<Protected><OperatingCostSettlement /></Protected>} />
    <Route path="/budgets" element={<Protected><Budgets /></Protected>} />
    <Route path="/honorar" element={<Protected><ManagementFeesPage /></Protected>} />

    {/* Documents & Communication */}
    <Route path="/dokumente" element={<Protected><Documents /></Protected>} />
    <Route path="/nachrichten" element={<Protected><MessagesPage /></Protected>} />
    <Route path="/serienbriefe" element={<Protected><SerialLetters /></Protected>} />
    <Route path="/ankuendigungen" element={<Protected><AnnouncementsPage /></Protected>} />

    {/* Operations */}
    <Route path="/reports" element={<Protected><Reports /></Protected>} />
    <Route path="/wartungen" element={<Protected><MaintenanceHub /></Protected>} />
    <Route path="/team" element={<Protected><TeamManagement /></Protected>} />
    <Route path="/weg" element={<Protected><WegManagement /></Protected>} />
    <Route path="/versicherungen" element={<Protected><InsuranceManagement /></Protected>} />
    <Route path="/fristen" element={<Protected><DeadlineCalendar /></Protected>} />
    <Route path="/hv-vertraege" element={<Protected><ManagementContracts /></Protected>} />
    <Route path="/zaehler" element={<Protected><MeterManagement /></Protected>} />

    {/* Portals */}
    <Route path="/mieterportal" element={<Protected><TenantPortal /></Protected>} />
    <Route path="/eigentuemerportal" element={<Protected><OwnerPortal /></Protected>} />

    {/* Batch */}
    <Route path="/massenaktionen" element={<Protected><BatchOperations /></Protected>} />

    {/* Settings */}
    <Route path="/einstellungen" element={<Protected><Settings /></Protected>} />

    {/* Redirects for merged routes */}
    <Route path="/vorschreibungen" element={<Navigate to="/zahlungen?tab=invoices" replace />} />
    <Route path="/mahnwesen" element={<Navigate to="/zahlungen?tab=dunning" replace />} />
    <Route path="/handwerker" element={<Navigate to="/wartungen?tab=contractors" replace />} />
    <Route path="/rechnungsfreigabe" element={<Navigate to="/kosten?tab=approval" replace />} />
  </>
);
