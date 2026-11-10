import react from '@vitejs/plugin-react'
import { defaultClientConditions } from 'vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Read @riftroom/shared straight from its TypeScript source (no build step, instant HMR).
    conditions: ['source', ...defaultClientConditions],
  },
  server: {
    port: 5173,
    strictPort: true,
    // The API is reached through the dev server, so cookies stay first-party and same-origin.
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
