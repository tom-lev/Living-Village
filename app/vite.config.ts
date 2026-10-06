import { defineConfig } from 'vite';

// base יחסי: האתר רץ ב-GitHub Pages תחת /Living-Village/
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist' },
  worker: { format: 'es' },
});
