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
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom'],
          // Routing
          'vendor-router': ['react-router-dom'],
          // Data fetching
          'vendor-query': ['@tanstack/react-query'],
          // UI framework
          'vendor-ui': ['lucide-react'],
          // Animations (load separately)
          'vendor-motion': ['framer-motion'],
          // State management
          'vendor-state': ['zustand'],
          // Form handling
          'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Date utilities
          'vendor-date': ['date-fns'],
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
