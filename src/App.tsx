import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { toast } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import { DeveloperConsole } from "@/components/DeveloperConsole";
import { useDeveloperConsole } from "@/hooks/useDeveloperConsole";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isOpen, closeConsole, toggleConsole, isTauriApp } = useDeveloperConsole();

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

  // Log environment info
  useEffect(() => {
    console.log(`🚀 Application starting in ${isTauriApp ? 'Tauri' : 'Browser'} environment`);
    console.log(`🔧 Developer Console: Press Ctrl + \` or F12 to toggle`);
    
    // Log app info
    console.log('📱 App Info:', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      timestamp: new Date().toISOString(),
      isDevelopment: import.meta.env.DEV
    });

    // Test log to verify console capture is working
    setTimeout(() => {
      console.log('✅ Console capture test - this should appear in the developer console');
    }, 1000);
  }, [isTauriApp]);

  return (
    <>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
      
      <DeveloperConsole isOpen={isOpen} onClose={closeConsole} />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
