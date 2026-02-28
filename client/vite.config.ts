import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const certsDir = path.resolve(__dirname, '..', '..', '.shared-certs');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3009,
    host: '0.0.0.0',
    https: {
      key: fs.readFileSync(path.join(certsDir, 'key.pem')),
      cert: fs.readFileSync(path.join(certsDir, 'cert.pem')),
    },
    proxy: {
      '/api': {
        target: 'https://localhost:3094',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'https://localhost:3094',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
