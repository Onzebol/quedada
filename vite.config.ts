import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/quedada/',
  plugins: [react()],
  // Puerto fijo: la URL de redirección de Supabase Auth necesita una dirección concreta (#60).
  server: { port: 39726, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: { provider: 'v8', include: ['src/**/*.{ts,tsx}'], exclude: ['src/main.tsx', 'src/test/**'] },
  },
})
