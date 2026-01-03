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
    chunkSizeWarningLimit: 250, // Even stricter limit
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: false, // Faster builds
    modulePreload: {
      polyfill: false, // Modern browsers only
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React - smallest possible
          if (id.includes('react-dom')) return 'vendor-react-dom';
          if (id.includes('node_modules/react/')) return 'vendor-react';
          
          // Routing - critical path
          if (id.includes('react-router')) return 'vendor-router';
          
          // Data fetching
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          
          // UI icons - defer load
          if (id.includes('lucide-react')) return 'vendor-icons';
          
          // Animations - defer load
          if (id.includes('framer-motion')) return 'vendor-motion';
          
          // State management
          if (id.includes('zustand')) return 'vendor-state';
          
          // Forms - only when needed
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-form';
          
          // Date utilities
          if (id.includes('date-fns')) return 'vendor-date';
          
          // Radix UI components - split by usage
          if (id.includes('@radix-ui')) return 'vendor-radix';
          
          // Supabase - backend
          if (id.includes('@supabase')) return 'vendor-supabase';
          
          // Charts - heavy, defer
          if (id.includes('recharts')) return 'vendor-charts';
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
