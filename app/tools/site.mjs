/* בניית האתר לפרסום (שרת הבנייה של GitHub, משימה 30): בונים, מריצים את העולם בדפדפן בלי מסך, שומרים את מה שחושב
   (אפייה), ובונים שוב עם התוצאות הטריות. כאן יתווספו בשלבים הבאים גם אריחים מוכנים מראש וקבצים לפי אזורים.
   שימוש: node tools/site.mjs   (מתוך app/; צריך Chromium של Playwright: npx playwright install chromium) */
import { spawn, execSync } from 'node:child_process';
import { cpus } from 'node:os';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

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
  // 4. אריחים מוכנים מראש (שלב 2): כל האריחים של הרמות 0..MAXL, לכל פלטה, מהעולם הבנוי כולו
  await bakeTiles();
} finally {
  // ב-Windows צריך לסגור את כל עץ התהליכים (npx מפעיל תהליך בן)
  if (process.platform === 'win32') try { execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: 'ignore' }); } catch {} else server.kill();
}
console.log('site ready in dist/');

async function bakeTiles() {
  const MAXL = 3, t0 = Date.now(), K = Math.max(1, Math.min(4, cpus().length - 1));
  const { chromium } = await import('playwright');
  const b = await chromium.launch();
  // כמה חלונות במקביל, כל אחד בונה את העולם ואז מצייר שורות של אריחים מתור משותף
  const pages = await Promise.all(Array.from({ length: K }, async () => {
    const p = await b.newPage({ viewport: { width: 800, height: 600 } });
    await p.goto(SITE + '?bake=tiles');
    await p.waitForFunction(() => window.__tileBake, null, { timeout: 300000 });
    await p.evaluate(() => window.__tileBake.ready);
    return p;
  }));
  const pals = await pages[0].evaluate(() => window.__tileBake.pals), jobs = [];
  for (const [pi, pal] of pals.entries()) for (let l = 0; l <= MAXL; l++) {
    const [nx, ny] = await pages[0].evaluate(l => window.__tileBake.tileGrid(l), l);
    mkdirSync(new URL(`../dist/tiles/p${pi}/${l}/`, import.meta.url), { recursive: true });
    for (let j = 0; j < ny; j++) jobs.push({ pi, pal, l, j, nx });
  }
  let n = 0, bytes = 0;
  await Promise.all(pages.map(async p => {
    for (let job; (job = jobs.shift());) {
      const { pi, pal, l, j, nx } = job;
      // שורה שלמה בכל קריאה (פחות הלוך-חזור מול הדפדפן)
      const row = await p.evaluate(async ([pal, l, j, nx]) => { const out = []; for (let i = 0; i < nx; i++) out.push(await window.__tileBake.bakeTile(pal, l, i, j)); return out; }, [pal, l, j, nx]);
      row.forEach((b64, i) => { const buf = Buffer.from(b64, 'base64'); bytes += buf.length; n++; writeFileSync(new URL(`../dist/tiles/p${pi}/${l}/${i}_${j}.webp`, import.meta.url), buf); });
    }
  }));
  const meta = await pages[0].evaluate(() => window.__tileBake.meta);
  // שלב 3: קבצי אזורים (הצורות של העולם לזום קרוב), מידות הדברים העומדים, והשלטים
  const RS = 1024, regs = await pages[0].evaluate(RS => window.__tileBake.bakeRegions(RS), RS);
  mkdirSync(new URL('../dist/regions/', import.meta.url), { recursive: true });
  let rb = 0;
  for (const [k, b64] of Object.entries(regs)) { const buf = Buffer.from(b64, 'base64'); rb += buf.length; writeFileSync(new URL(`../dist/regions/${k}.bin`, import.meta.url), buf); }
  const st = await pages[0].evaluate(() => window.__tileBake.bakeStatic());
  writeFileSync(new URL('../dist/tiles/static.bin', import.meta.url), Buffer.from(st.bin, 'base64'));
  writeFileSync(new URL('../dist/tiles/static.json', import.meta.url), st.json);
  console.log(`baked ${Object.keys(regs).length} region files (${(rb / 1e6).toFixed(1)} MB)`);
  await b.close();
  writeFileSync(new URL('../dist/tiles/manifest.json', import.meta.url), JSON.stringify({ maxL: MAXL, pals, ...meta, regions: { RS } }));
  console.log(`baked ${n} tiles (${(bytes / 1e6).toFixed(1)} MB) with ${K} pages in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
