import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  /* GitHub Pages などのサブディレクトリ配信でもそのまま動くよう相対パスで出力する */
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
  },
});
