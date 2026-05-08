import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.config.js';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        alarm: 'src/alarm/index.html',
        offscreen: 'src/offscreen/index.html',
      },
    },
  },
  server: { port: 5174, strictPort: true, hmr: { port: 5174 } },
});
