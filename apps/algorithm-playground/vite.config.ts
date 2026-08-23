import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/turso': {
          target: env.VITE_TURSO_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/turso/, ''),
        },
      },
    },
  }
})
