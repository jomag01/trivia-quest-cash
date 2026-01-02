import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Ultra-optimized Vite config for 100M+ concurrent users
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom', '@tanstack/react-query', 'react-router-dom', 'zustand'],
  },
  build: {
    minify: 'esbuild',
    target: 'es2020',
    cssMinify: true,
    chunkSizeWarningLimit: 300, // Stricter limit
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: false, // Faster builds
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React - smallest possible
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // Routing
          if (id.includes('react-router-dom')) {
            return 'vendor-router';
          }
          // Data fetching
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }
          // UI icons - load separately
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // Animations - load separately (can be deferred)
          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }
          // State management
          if (id.includes('zustand')) {
            return 'vendor-state';
          }
          // Form handling
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'vendor-form';
          }
          // Date utilities
          if (id.includes('date-fns')) {
            return 'vendor-date';
          }
          // Radix UI components - group together
          if (id.includes('@radix-ui')) {
            return 'vendor-radix';
          }
          // Charts - load on demand
          if (id.includes('recharts')) {
            return 'vendor-charts';
          }
          // Supabase - essential but can be loaded after core
          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }
        },
        // Content-hash for aggressive CDN caching
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-query', 
      'react-router-dom',
      'zustand',
      'lucide-react'
    ],
    exclude: [],
    // Force optimization in dev for faster startup
    force: mode === 'development',
  },
  esbuild: {
    // Remove console.log in production for smaller bundle
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
    // Tree shaking hints
    treeShaking: true,
  },
  // Performance hints
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
}));
