import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Boudreaux's Pharmacy Shipping Dashboard",
        short_name: 'Shipping',
        description: 'Shipping & delivery logistics dashboard',
        theme_color: '#0a1a0f',
        background_color: '#0a1a0f',
        display: 'standalone',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/shipping/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-shipping',
              expiration: { maxAgeSeconds: 15 * 60 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3500',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
