import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // `npm run dev`: forward API + uploaded photos to the Laravel container, like nginx does in Docker
    proxy: {
      '/api': 'http://localhost:8001',
      '/storage': 'http://localhost:8001',
    },
  },
})
