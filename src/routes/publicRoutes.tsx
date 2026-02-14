import { lazy } from "react";
import { Route } from "react-router-dom";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Register = lazy(() => import("@/pages/Register"));
const Impressum = lazy(() => import("@/pages/Impressum"));
const Datenschutz = lazy(() => import("@/pages/Datenschutz"));
const AGB = lazy(() => import("@/pages/AGB"));
const TenantLogin = lazy(() => import("@/pages/TenantLogin"));
const DemoRequest = lazy(() => import("@/pages/demo-request"));
const DemoActivate = lazy(() => import("@/pages/demo-activate"));

export const publicRoutes = (
  <>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/register" element={<Register />} />
    <Route path="/demo" element={<DemoRequest />} />
    <Route path="/demo/activate" element={<DemoActivate />} />
    <Route path="/impressum" element={<Impressum />} />
    <Route path="/datenschutz" element={<Datenschutz />} />
    <Route path="/agb" element={<AGB />} />
    <Route path="/mieter-login" element={<TenantLogin />} />
  </>
);
