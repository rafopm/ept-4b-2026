import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/ept-4b-2026/',
  server: {
    proxy: {
      '/api': {
        target: 'https://4b-ept-2026.rpampavilca.workers.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '') || '/',
      },
    },
  },
})
