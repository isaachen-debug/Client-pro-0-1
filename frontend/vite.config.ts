import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'robots.txt'],
      srcDir: 'src',
      filename: 'service-worker.ts',
      strategies: 'injectManifest',
      manifest: {
        name: 'Client Pro',
        short_name: 'Client Pro',
        description: 'App para organizar clientes, agenda e financeiro de empresas de limpeza.',
        start_url: '/',
        display: 'standalone',
        background_color: '#0F172A',
        theme_color: '#22C55E',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})

