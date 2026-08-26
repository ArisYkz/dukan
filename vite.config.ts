import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { compression } from "vite-plugin-compression2";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8082,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Compression for production builds (brotli + gzip)
    compression({
      algorithms: ["brotli", "gz"],
      exclude: ["**/*.map"],
      threshold: 1024, // Only compress files > 1KB
    }),
    // Bundle size analyzer (only in analyze mode)
    mode === "analyze" &&
      visualizer({
        open: true,
        filename: "dist/stats.html",
        gzipSize: true,
        brotliSize: true,
        template: "treemap", // treemap, sunburst, or network
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries (essential for all pages)
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // Supabase SDK (large, needed for auth + database)
          "supabase-vendor": ["@supabase/supabase-js"],
          // Chart library (Dashboard only - lazy loaded)
          "chart-vendor": ["recharts"],
          // Animation library (used across app)
          "motion-vendor": ["framer-motion"],
          // Form handling (Dashboard + Auth)
          "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
          // Utilities (small, frequently used)
          "utils-vendor": ["date-fns", "class-variance-authority", "clsx", "tailwind-merge"],
          // Lucide icons (tree-shaken automatically, but isolate for caching)
          "icons-vendor": ["lucide-react"],
        },
      },
    },
    // Enable sourcemaps only for development
    sourcemap: mode === "development",
    // Optimize chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Minification (enabled by default, but explicit for clarity)
    minify: "esbuild",
    // CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundles
    target: "es2020",
  },
}));
