import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CookieConsent } from "@/components/CookieConsent";
import { ActiveOrganizationProvider } from "@/contexts/ActiveOrganizationContext";
import { publicRoutes, protectedRoutes, adminRoutes } from "@/routes";
import { lazy } from "react";

const NotFound = lazy(() => import("./pages/NotFound"));

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
            {publicRoutes}
            {protectedRoutes}
            {adminRoutes}
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
