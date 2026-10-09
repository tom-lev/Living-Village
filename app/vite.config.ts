import { defineConfig } from 'vite';
import { codeHash } from './tools/geohash.mjs';

// base יחסי: האתר רץ ב-GitHub Pages תחת /Living-Village/
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist' },
  worker: { format: 'es' },
  // טביעת האצבע של קוד הגיאומטריה: חישוב שנאפה מראש (src/world/baked.json) משמש רק אם הוא תואם לקוד ולנתונים
  define: { __GEO_CODE_HASH__: JSON.stringify(codeHash()) },
});
