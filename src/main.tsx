import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Catch any initialization errors
try {
  const root = document.getElementById("root");
  if (root) {
    createRoot(root).render(<App />);
  }
} catch (error) {
  console.error("Failed to initialize app:", error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0a0a0a; color: white; font-family: system-ui;">
      <div style="text-align: center; padding: 2rem;">
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Failed to load application</h1>
        <p style="color: #888; margin-bottom: 1.5rem;">Please refresh the page to try again.</p>
        <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #0066ff; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
          Refresh Page
        </button>
      </div>
    </div>
  `;
}
