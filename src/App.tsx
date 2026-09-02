import { lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import CookieConsent from "@/components/CookieConsent";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StoreFront = lazy(() => import("./pages/StoreFront"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const Success = lazy(() => import("./pages/Success"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Settings = lazy(() => import("./pages/Settings"));
const Admin = lazy(() => import("./pages/Admin"));
const TestPerformance = lazy(() => import("./pages/TestPerformance"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const RouteBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary>{children}</ErrorBoundary>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <ErrorBoundary>
          <Sonner />
          <BrowserRouter>
            <CookieConsent />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<RouteBoundary><Index /></RouteBoundary>} />
                <Route path="/auth" element={<RouteBoundary><Auth /></RouteBoundary>} />
                <Route path="/auth/callback" element={<RouteBoundary><AuthCallback /></RouteBoundary>} />
                <Route path="/dashboard" element={<RouteBoundary><Dashboard /></RouteBoundary>} />
                <Route path="/s/:slug" element={<RouteBoundary><StoreFront /></RouteBoundary>} />
                <Route path="/order/:id" element={<RouteBoundary><OrderTracking /></RouteBoundary>} />
                <Route path="/success" element={<RouteBoundary><Success /></RouteBoundary>} />
                <Route path="/update-password" element={<RouteBoundary><UpdatePassword /></RouteBoundary>} />
                <Route path="/settings" element={<RouteBoundary><Settings /></RouteBoundary>} />
                <Route path="/admin" element={<RouteBoundary><Admin /></RouteBoundary>} />
                <Route path="/privacy" element={<RouteBoundary><Privacy /></RouteBoundary>} />
                <Route path="/terms" element={<RouteBoundary><Terms /></RouteBoundary>} />
                <Route path="/test-performance" element={<RouteBoundary><TestPerformance /></RouteBoundary>} />
                <Route path="/:slug" element={<RouteBoundary><StoreFront /></RouteBoundary>} />
                <Route path="*" element={<RouteBoundary><NotFound /></RouteBoundary>} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
