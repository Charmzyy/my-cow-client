import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Installable app + offline. The service worker (built only by `npm run build`, not in dev):
    // - keeps the app itself on the phone, so it opens with no signal;
    // - keeps the last answer of every API read (farms, herd, milk sheet…), used when there's no
    //   signal or it's too slow (6 s); fresh data always wins when the network answers;
    // - never touches saves (POST/PUT/DELETE): those go through src/outbox.js.
    // Service workers need https (or localhost): on the VPS Caddy provides it.
    VitePWA({
      registerType: 'autoUpdate',          // a new release replaces the old app on the next visit
      injectRegister: 'auto',
      includeAssets: ['cow.svg', 'icon.svg'],
      manifest: {
        name: 'MyCow',
        short_name: 'MyCow',
        description: 'Milk, herd and health records for your farm. Works with no signal.',
        lang: 'en-KE',
        start_url: '/farm',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#1b5e37',
        background_color: '#f7f4ec',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/storage\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET'
              && !url.pathname.endsWith('.pdf') && !url.pathname.startsWith('/api/verify/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mc-api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 21 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/storage/'),
            handler: 'CacheFirst',   // cow photos never change at the same address
            options: {
              cacheName: 'mc-photos',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    // `npm run dev`: forward API + uploaded photos to the Laravel container, like nginx does in Docker
    proxy: {
      '/api': 'http://localhost:8001',
      '/storage': 'http://localhost:8001',
    },
  },
})
