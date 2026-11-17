import type { ManifestOptions } from 'vite-plugin-pwa'

/** Manifiesto web de la aplicación instalable. Los iconos están en `public/` (ver AGENTS.md). */
export const manifiesto: Partial<ManifestOptions> = {
  name: 'Quedada',
  short_name: 'Quedada',
  description: 'Organiza las quedadas de casa rural: lista de la compra, gastos y quién debe a quién.',
  lang: 'es',
  // Relativos al manifiesto: con `base: '/quedada/'` caen dentro de /quedada/, no en la raíz del dominio.
  start_url: './',
  scope: './',
  display: 'standalone',
  theme_color: '#2f6b4f',
  background_color: '#e8ecea',
  icons: [
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
