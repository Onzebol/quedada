import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { manifiesto } from './src/pwa/manifiesto.ts'

// https://vite.dev/config/
export default defineConfig({
  base: '/quedada/',
  plugins: [
    react(),
    // App instalable (#69). `prompt`: el service worker nuevo espera y la app avisa («Hay una versión nueva»);
    // no se actualiza solo para no recargar la página bajo los pies de quien está editando.
    VitePWA({
      registerType: 'prompt',
      manifest: manifiesto,
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Solo se guarda la interfaz: los datos van siempre a Supabase (nunca se cachean).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-archivos',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // Puerto fijo: la URL de redirección de Supabase Auth necesita una dirección concreta (#60).
  server: { port: 39726, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: { provider: 'v8', include: ['src/**/*.{ts,tsx}'], exclude: ['src/main.tsx', 'src/test/**'] },
  },
})
