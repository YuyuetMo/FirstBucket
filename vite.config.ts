import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/renderer/@core'),
      '@design': resolve(__dirname, 'src/renderer/@design'),
      '@features': resolve(__dirname, 'src/renderer/features'),
      '@stores': resolve(__dirname, 'src/renderer/stores'),
      '@pages': resolve(__dirname, 'src/renderer/pages'),
    },
  },
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: { external: ['better-sqlite3'] },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: { external: ['better-sqlite3'] },
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
