/* בניית האתר לפרסום (שרת הבנייה של GitHub, משימה 30): בונים, מריצים את העולם בדפדפן בלי מסך, שומרים את מה שחושב
   (אפייה), ובונים שוב עם התוצאות הטריות. כאן יתווספו בשלבים הבאים גם אריחים מוכנים מראש וקבצים לפי אזורים.
   שימוש: node tools/site.mjs   (מתוך app/; צריך Chromium של Playwright: npx playwright install chromium) */
import { spawn, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PORT = 4399, SITE = `http://localhost:${PORT}/`;
const run = cmd => { console.log('>', cmd); execSync(cmd, { stdio: 'inherit' }); };
const baked = () => readFileSync(new URL('../src/world/baked.json', import.meta.url), 'utf8');

// 1. בנייה ראשונה (בלי בדיקת האפייה: האפייה תיעשה כאן)
run('node tools/rules.mjs --check && npx tsc --noEmit && npx vite build');
// 2. מריצים את האתר הבנוי, ואופים ממנו
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', shell: true });
try {
  for (let i = 0; i < 60; i++) { try { await fetch(SITE); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  const before = baked();
  run(`node tools/bake.mjs ${SITE}`);
  // 3. אם משהו השתנה – בונים שוב, כדי שהאתר יכלול את התוצאות הטריות
  if (baked() !== before) run('npx vite build');
  run('node tools/bake.mjs --check');
} finally {
  // ב-Windows צריך לסגור את כל עץ התהליכים (npx מפעיל תהליך בן)
  if (process.platform === 'win32') try { execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' }); } catch {} else server.kill();
}
console.log('site ready in dist/');
