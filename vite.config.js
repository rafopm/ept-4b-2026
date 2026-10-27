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
        rewrite: (path) => path.replace(/^\/api/, '/macros/s/AKfycbxDGEIqxaI9WcVwaLXialm7Z7TcvoqQM--UEC4h1toqAB96sI5_dBNdzra__019WZqu/exec'),
      },
    },
  },
})
