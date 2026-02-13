import { lazy } from "react";
import { Route } from "react-router-dom";
import { AdminRoute } from "@/components/auth/AdminRoute";

const Admin = lazy(() => import("@/pages/Admin"));
const AdminUsers = lazy(() => import("@/pages/AdminUsers"));
const AdminAuditLogs = lazy(() => import("@/pages/AdminAuditLogs"));
const SystemTest = lazy(() => import("@/pages/SystemTest"));
const ReconciliationDashboard = lazy(() => import("@/pages/ReconciliationDashboard"));
const AdminPaymentsJobs = lazy(() => import("@/pages/AdminPaymentsJobs"));

export const adminRoutes = (
  <>
    <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
    <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
    <Route path="/admin/reconciliation" element={<AdminRoute><ReconciliationDashboard /></AdminRoute>} />
    <Route path="/admin/payments-jobs" element={<AdminRoute><AdminPaymentsJobs /></AdminRoute>} />
    <Route path="/admin/system-test" element={<AdminRoute><SystemTest /></AdminRoute>} />
  </>
);
