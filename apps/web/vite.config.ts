import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// In docker, the api container is reachable as http://api:3000.
// Locally, it's http://localhost:3000. Compose sets VITE_API_PROXY_TARGET.
const apiTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000'

export default defineConfig({
  envDir: '../..', // Load .env from monorepo root
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@brand-radar/auth/client': fileURLToPath(new URL('../../packages/auth/src/client.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
})
