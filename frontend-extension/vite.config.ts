import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching for server-side JSON and PKL databases to prevent unexpected page reloads on auth/data updates
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/*.json',
          '**/*.pkl',
          '**/python-backend/**',
          '**/dist/**',
          '**/.git/**',
          '**/login_events.json',
          '**/users_database.json',
          '**/security_profile.json',
          '**/sent_emails.json',
          '**/support_messages.json'
        ]
      },
      proxy: {
        '/api/face': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/face/, ''),
        },
      },
    },
  };
});
