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
        rewrite: (path) => path.replace(/^\/api/, '/macros/s/AKfycbyU22BKh2wN2OUQ_iAr_zfYQXpHsNKArSXMoz_dlFhnttCpUTTBvt5L9VraDxbIj7yO/exec'),
      },
    },
  },
})
