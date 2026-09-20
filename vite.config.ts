import { defineConfig, createLogger, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Filter out harmless browser-close / server-restart abort errors from proxy logs
const customLogger = createLogger();
const originalError = customLogger.error;
customLogger.error = (msg, options) => {
  if (
    typeof msg === 'string' &&
    msg.includes('ws proxy socket error') &&
    (msg.includes('ECONNABORTED') || msg.includes('ECONNRESET') || msg.includes('EPIPE'))
  ) {
    return;
  }
  originalError(msg, options);
};

function eztalkRelayPlugin(): Plugin {
  return {
    name: 'eztalk-live-relay',
    configureServer(server) {
      server.ws.on('eztalk:broadcast', (data) => {
        // Forward message to all other connected clients (Incognito, Regular, Mobile, etc.)
        server.ws.send({
          type: 'custom',
          event: 'eztalk:event',
          data,
        });
      });
    },
  };
}

export default defineConfig({
  customLogger,
  plugins: [
    react(),
    eztalkRelayPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'EzTalk Web',
        short_name: 'EzTalk',
        description: 'Lightweight real-time web messenger',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  server: {
    port: 3000,
    host: true, // Listen on all network addresses (0.0.0.0)
    open: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5050',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-socket': ['socket.io-client'],
        },
      },
    },
  },
});
