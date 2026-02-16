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
const Index = React.lazy(() => import("./pages/Index"));
const ExternalPlayer = React.lazy(() => import("./components/Teleprompter/ExternalPlayer").then(m => ({ default: m.ExternalPlayer })));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground animate-pulse font-medium tracking-wide">SegiTelep Pro is initializing...</p>
    </div>
  </div>
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
      console.error("❌ Global error:", event.error);
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
