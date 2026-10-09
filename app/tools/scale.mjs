/* מבחן קנה מידה (משימה 30, שלב 6; כלל scale-load): האם עולם גדול פי 5 נטען ורץ כמו העולם האמיתי?
   בונה את האתר המפורסם פעמיים – העולם האמיתי (dist) ועולם בדיקה פי 5 (tools/scaleworld.mjs, בעותק נפרד של הפרויקט
   ב-../../lv-scale, כדי לא לגעת בעולם האמיתי) – ומודד את שניהם באותם תנאים של טלפון: דפדפן עם חלון וכרטיס גרפי,
   מעבד מואט פי 4, רשת סלולרית. משווה: עבודת הדף עד שהמפה מוצגת, הנתונים שהורדו עד שהמבט הראשון מוכן,
   וזמן העדכון בפריים. נכשל אם משהו גדל יותר מהמותר (LIMITS).
   שימוש:  node tools/scale.mjs                 (בונה הכול – כ-25 דקות)
           node tools/scale.mjs --measure <url של העולם האמיתי> <url של העולם הגדול>   (רק מדידה, על אתרים בנויים) */
import { execSync, spawn } from 'node:child_process';
import { existsSync, cpSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';

/** כמה מותר לכל מדד לגדול בעולם פי 5 (יחס לעולם האמיתי) */
const LIMITS = { work: 1.3, kb: 1.3, frameMs: 1.5 };
const RUNS = 3;

async function measure(url) {
  const b = await chromium.launch({ headless: false, args: ['--window-size=420,900'] });
  const all = [];
  for (let r = 0; r < RUNS; r++) {
    const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const p = await c.newPage(), cdp = await c.newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.5e6, uploadThroughput: 4e5 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    // כל ההורדות עד שהמבט הראשון מוכן (גם של הציירים שברקע)
    let bytes = 0, done = false;
    c.on('requestfinished', async q => { if (done) return; try { const s = await q.sizes(); bytes += s.responseBodySize + s.responseHeadersSize; } catch {} });
    await p.goto(url + (url.includes('?') ? '&' : '?') + 'debug&r=' + Date.now(), { waitUntil: 'commit' });
    await p.waitForFunction(() => window.__boot?.ready && window.__boot?.allActors, null, { timeout: 300000, polling: 50 });
    done = true;
    const bt = await p.evaluate(() => window.__boot);
    // זמן העדכון בפריים: אחרי שכולם נבנו, ממוצע של 120 פריימים (מבדיקת העולם, ?debug)
    await p.waitForFunction(() => window.__check, null, { timeout: 300000 });
    await p.waitForTimeout(4000);
    const frameMs = await p.evaluate(() => { window.__check(); return window.__budget.frameMs; });
    all.push({ work: bt.scene + bt.tiles + bt.actors, ready: bt.ready, kb: bytes / 1024, frameMs });
    await c.close();
  }
  await b.close();
  // החציון של כל מדד (מכונה רועשת)
  const med = k => { const v = all.map(x => x[k]).sort((a, b) => a - b); return v[v.length >> 1]; };
  return { work: med('work'), ready: med('ready'), kb: med('kb'), frameMs: med('frameMs') };
}

async function serve(cwd, port) {
  const s = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', shell: true, cwd });
  for (let i = 0; i < 60; i++) { try { await fetch(`http://localhost:${port}/`); break; } catch { await new Promise(r => setTimeout(r, 500)); } }
  return () => { if (process.platform === 'win32') try { execSync(`taskkill /pid ${s.pid} /T /F`, { stdio: 'ignore' }); } catch {} else s.kill(); };
}

let A, B, stop = [];
if (process.argv[2] === '--measure') [A, B] = process.argv.slice(3, 5);
else {
  const app = new URL('..', import.meta.url), copy = new URL('../../../lv-scale/app/', import.meta.url);
  const sh = (cmd, cwd) => { console.log('>', cmd); execSync(cmd, { stdio: 'inherit', cwd }); };
  sh('node tools/site.mjs', app);
  // העותק: הקוד הנוכחי (גם מה שעוד לא נשמר ב-git), עם עולם פי 5
  if (existsSync(copy)) rmSync(new URL('src/', copy), { recursive: true, force: true });
  else { sh('git worktree add --detach ../lv-scale HEAD', new URL('..', app)); }
  for (const d of ['src', 'tools', 'public', 'index.html', 'vite.config.ts', 'package.json', 'tsconfig.json']) if (existsSync(new URL(d, app))) cpSync(new URL(d, app), new URL(d, copy), { recursive: true });
  cpSync(new URL('../docs', app), new URL('../docs', copy), { recursive: true });   // docs/RULES.md (בשורש המאגר)
  if (!existsSync(new URL('node_modules', copy))) sh(process.platform === 'win32' ? `mklink /J node_modules "${new URL('node_modules', app).pathname.slice(1)}"` : `ln -s ${new URL('node_modules', app).pathname} node_modules`, copy);
  sh('node tools/scaleworld.mjs src/world/world.json 5', copy);
  sh('node tools/site.mjs', copy);
  stop.push(await serve(app, 4391)); A = 'http://localhost:4391/';
  stop.push(await serve(copy, 4392)); B = 'http://localhost:4392/';
}
try {
  const a = await measure(A), b = await measure(B), rows = [];
  let bad = 0;
  for (const k of ['work', 'kb', 'frameMs', 'ready']) {
    const ratio = b[k] / a[k], lim = LIMITS[k], ok = !lim || ratio <= lim; if (!ok) bad++;
    rows.push(`${k.padEnd(8)} ${a[k].toFixed(1).padStart(9)} ${b[k].toFixed(1).padStart(9)}  ×${ratio.toFixed(2)}${lim ? `  (limit ×${lim})${ok ? '' : '  TOO MUCH'}` : ''}`);
  }
  console.log('metric       world    world×5');
  console.log(rows.join('\n'));
  if (bad) { console.log(`${bad} metric(s) grow with the world`); process.exitCode = 1; } else console.log('loading and frames do not grow with the world');
} finally { for (const s of stop) s(); }
