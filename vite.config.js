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
        rewrite: (path) => path.replace(/^\/api/, '/macros/s/AKfycbxIynlbM6GYasfbQIjW_r-eRz4sFY7TJkSP6O5uvf45H7GI7cFciIuqnV6hy_ys43oL/exec'),
      },
    },
  },
})
