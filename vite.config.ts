import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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
  plugins: [react(), eztalkRelayPlugin()],
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
});
