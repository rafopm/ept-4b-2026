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
        rewrite: (path) => path.replace(/^\/api/, '/macros/s/AKfycbzPEqpn04Lt_n4QAEre1AxosjvEl2hZ6odx5CfWgpifQxQ4Tma9YptvCIurTnO9jLDB/exec'),
      },
    },
  },
})
