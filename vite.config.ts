import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "events": "events",
      "util": "util",
      "stream": "stream-browserify",
      "buffer": "buffer",
      "process": "process/browser",
    },
  },
  define: {
    global: 'globalThis',
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            // Keep React and React-DOM in the main chunk to avoid loading order issues
            if (id.includes("react-dom") || id.includes("react/")) {
              return null; // Don't split React
            }
            if (id.includes("react-router")) {
              return "vendor-router";
            }
            if (id.includes("@radix-ui")) {
              return "vendor-radix";
            }
            if (id.includes("@tauri-apps")) {
              return "vendor-tauri";
            }
            if (id.includes("pdfjs-dist") || id.includes("recharts")) {
              return "vendor-heavy";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
            return "vendor";
          }
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/[name]-[hash].css';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
    chunkSizeWarningLimit: 600,
    minify: "esbuild",
    target: "esnext",
    assetsInlineLimit: 4096,
    sourcemap: true,
  },
  optimizeDeps: {
    // Force rebuild of dependencies
    force: true,
    include: [
      '@radix-ui/react-switch',
      '@radix-ui/react-separator',
      '@radix-ui/react-tabs',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-slider',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-select',
      '@radix-ui/react-checkbox',
    ],
  },
});
