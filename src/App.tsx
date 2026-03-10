import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { toast } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SidebarProvider } from "@/components/ui/sidebar";
const Index = React.lazy(() => import("@/pages/Index"));
const ExternalPlayer = React.lazy(() => import("@/components/Teleprompter/ExternalPlayer").then(m => ({ default: m.ExternalPlayer })));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

import { Loading } from "@/components/ui/loading";

const LoadingFallback = () => (
  <Loading variant="fullscreen" text="SegiTelep Pro is initializing..." size="xl" />
);

const queryClient = new QueryClient();

const AppContent = () => {

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("❌ Unhandled promise rejection:", event.reason);
      event.preventDefault();
      toast.error("An unexpected error occurred. Please try again.");
    };

    const handleError = (event: ErrorEvent) => {
      // Safe logging of event error to avoid cross-origin / Xray issues in Firefox
      try {
        const errorMsg = event.error?.message || event.message || "Unknown dynamic module error";
        console.error("❌ Global error:", errorMsg);
      } catch (e) {
        console.error("❌ Global error (fallback):", String(event));
      }
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  // Initialization
  useEffect(() => {
    // Basic startup logic
  }, []);

  return (
    <>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <React.Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/player" element={<ExternalPlayer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </React.Suspense>
      </HashRouter>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SidebarProvider>
            <Toaster />
            <Sonner />
            <AppContent />
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
