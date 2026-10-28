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
        rewrite: (path) => path.replace(/^\/api/, '/macros/s/AKfycbyUs9W9CHKVIsifLdIQ_jqOGF3VMH3dIgGctL8RvjsL67bXtuqhriiNzwjLJqMHBaD3/exec'),
      },
    },
  },
})
