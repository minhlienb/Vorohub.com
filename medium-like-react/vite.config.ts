import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const envDir = path.resolve(configDir, '..');

// Vite dev server for the React rewrite of the medium-like SPA.
// Port 5174 so it doesn't collide with the existing Barba-based UI
// still running on 5173. Proxy /api/* to the Express server on 3001.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      allowedHosts: [env.FRONTEND_HOST.toString() || 'localhost'],
      port: Number(env.FRONTEND_PORT) || undefined,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://localhost:${env.BACKEND_PORT || undefined}`,
          changeOrigin: true
        }
      }
    }
  };
});
