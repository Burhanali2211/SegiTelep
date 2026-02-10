import React from 'react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Production-safe global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
}

// Add debug information
console.log("🚀 Initializing application...");
console.log("📍 Environment:", typeof window !== 'undefined' && '__TAURI__' in window ? 'Tauri' : 'Browser');
console.log("📂 Root element:", document.getElementById("root"));

// Catch any initialization errors
try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  console.log("✅ Creating React root...");
  const reactRoot = createRoot(root);
  console.log("✅ Rendering App component...");
  reactRoot.render(<App />);
  console.log("✅ App initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize app:", error);
  
  // More detailed error information
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';
  
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0a0a0a; color: white; font-family: system-ui;">
      <div style="text-align: center; padding: 2rem; max-width: 500px;">
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">❌ Failed to load application</h1>
        <p style="color: #ff6b6b; margin-bottom: 1rem; font-family: monospace; font-size: 0.9rem;">${errorMessage}</p>
        <details style="margin-bottom: 1.5rem; text-align: left;">
          <summary style="cursor: pointer; color: #888;">Technical Details</summary>
          <pre style="color: #666; font-size: 0.8rem; margin-top: 0.5rem; white-space: pre-wrap;">${errorStack}</pre>
        </details>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #0066ff; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
            🔄 Refresh Page
          </button>
        </div>
      </div>
    </div>
  `;
}
