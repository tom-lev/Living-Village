/* בניית האתר לפרסום (שרת הבנייה של GitHub, משימה 30): בונים, מריצים את העולם בדפדפן בלי מסך, שומרים את מה שחושב
   (אפייה), ובונים שוב עם התוצאות הטריות. כאן יתווספו בשלבים הבאים גם אריחים מוכנים מראש וקבצים לפי אזורים.
   שימוש: node tools/site.mjs   (מתוך app/; צריך Chromium של Playwright: npx playwright install chromium) */
import { spawn, execSync } from 'node:child_process';
import { cpus } from 'node:os';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

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

/** ההיגיון של העולם (לבדיקה שהאתר המפורסם בונה אותו בדיוק) */
function LOGIC() { return {
  trees: window.__trees.map(t => [t.x, t.y, t.x0, t.x1, t.top].map(v => Math.round(v)).join(',')),
  places: window.__places.map(p => `${p.kind}|${p.name}|${(p.door || p.at || []).map(Math.round)}`),
  objs: window.__world.objects.map(o => `${o.type}|${(o._bb || []).map(Math.round)}|${o._k ? o._k[0].toFixed(3) : ''}`),
  rng: window.__seedEnd,
}; }

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
  const logicBaked = await pages[0].evaluate(LOGIC);
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
  const manifest = { maxL: MAXL, pals, ...meta, regions: { RS } };
  writeFileSync(new URL('../dist/tiles/manifest.json', import.meta.url), JSON.stringify(manifest));
  // הנתונים הקטנים (הרשימה, מידות הדברים העומדים, השלטים) נכתבים לתוך הדף עצמו: בלי הורדות נוספות בתחילת הטעינה
  const html = new URL('../dist/index.html', import.meta.url), inline = JSON.stringify({ manifest, static: { bin: st.bin, json: JSON.parse(st.json) } }).replace(/</g, '\\u003c');
  // כל חלקי הקוד שנטענים בהתחלה (המנוע הגרפי, הצייר שברקע): מתחילים להוריד מיד, במקביל לקוד הראשי (ולא בסבבים אחד אחרי השני)
  const pre = readdirSync(new URL('../dist/assets/', import.meta.url)).filter(f => f.endsWith('.js') && !/^(index|check|samples)-/.test(f)).map(f => `<link rel="modulepreload" href="./assets/${f}">`).join('');
  writeFileSync(html, readFileSync(html, 'utf8').replace('</head>', pre + '</head>'));
  writeFileSync(html, readFileSync(html, 'utf8').replace('<div id="instant"', `<script>window.__BAKED=${inline}</script>
<div id="instant"`));
  // בדיקה: האתר המפורסם (בלי ציור הנוף) בונה בדיוק את אותו היגיון כמו הבנייה המלאה – עצים, מקומות, מידות האובייקטים
  {
    const b2 = await chromium.launch(), q = await b2.newPage();
    await q.goto(SITE); await q.waitForFunction(() => window.__trees?.length && window.__village && window.__places, null, { timeout: 180000 });
    const logicSite = await q.evaluate(LOGIC); await b2.close();
    const bad = Object.keys(logicBaked).filter(k => JSON.stringify(logicBaked[k]) !== JSON.stringify(logicSite[k]));
    if (bad.length) throw new Error(`the published site builds different world logic than the full build: ${bad.join(', ')}`);
    console.log('published site logic matches the full build');
  }
  console.log(`baked ${n} tiles (${(bytes / 1e6).toFixed(1)} MB) with ${K} pages in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
