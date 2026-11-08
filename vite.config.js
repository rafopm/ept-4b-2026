import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/ept-4b-2026/',
  server: {
    proxy: {
      '/api': {
        target: 'https://script.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, 'https://script.google.com/macros/s/AKfycbwGf1G8azMizsMjHfOIRo_ISZNB8GtihdHu_yju2OhBlnnviHKv-3Qv3BPKKQjfzBok/exec'),
      },
    },
  },
})
