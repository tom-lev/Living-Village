// כלי מדידת ביצועים לכפר החי (Playwright + Chromium).
// הרצה:  node tools/perf.mjs <מדידה> [כתובת] [אפשרויות]
//   drag     – זמני פריים בגרירות ארוכות
//   zoom     – זמני פריים ברצף זומים מהירים, וכמה זמן עד שהכול חד
//   idle     – כמה אריחים מצוירים כשהמפה עומדת (צריך להיות 0)
//   profile  – פרופיל JS: הפונקציות שלוקחות הכי הרבה זמן (רצוי עם build בלי minify)
// אפשרויות: --phone (390x844, פי 3) | --desktop (1600x1000, פי 2) | --throttle=N (האטת מעבד) | --headed (חלון אמיתי)
//           --gpu-sw (מאפשר WebGL בתוכנה; בשרת בלי כרטיס גרפי יחד עם ?forcegpu בכתובת)
// דרישות: npm i -D playwright && npx playwright install chromium
// הערה: בלי --headed ובמכונה בלי כרטיס גרפי, WebGL רץ בתוכנה והמספרים לא מייצגים טלפון/מחשב אמיתי.
import { chromium } from 'playwright';

const [, , what = 'drag', url = 'http://localhost:4173/', ...rest] = process.argv;
const opt = Object.fromEntries(rest.map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const vp = opt.desktop ? { width: 1600, height: 1000, deviceScaleFactor: 2 } : { width: 390, height: 844, deviceScaleFactor: 3 };
const args = [];
if (opt['gpu-sw']) args.push('--enable-unsafe-swiftshader');
if (opt.headed) args.push('--enable-gpu', '--ignore-gpu-blocklist');

const b = await chromium.launch({ headless: !opt.headed, args });
const p = await b.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });
p.on('pageerror', e => console.log('page error:', e.message));
await p.goto(url, { waitUntil: 'domcontentloaded' });
await p.waitForFunction(() => window.__village, null, { timeout: 30000 });
await p.waitForTimeout(3000);
const cdp = await p.context().newCDPSession(p);
const mode = await p.evaluate(() => window.__village.tileStats.mode);
console.log(`mode: ${mode}  viewport: ${vp.width}x${vp.height}@${vp.deviceScaleFactor}`);
if (opt.throttle) await cdp.send('Emulation.setCPUThrottlingRate', { rate: +opt.throttle });

const startFrames = () => p.evaluate(() => { window.__ft = []; let last = performance.now(); window.__run = true;
  const loop = t => { window.__ft.push(t - last); last = t; if (window.__run) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
const stopFrames = () => p.evaluate(() => { window.__run = false; const ft = window.__ft.slice(1).sort((a, b) => a - b), q = f => ft[Math.floor(ft.length * f)].toFixed(1);
  return `frames ${ft.length}, median ${q(.5)}ms, p90 ${q(.9)}ms, p99 ${q(.99)}ms, >50ms ${ft.filter(x => x > 50).length}`; });

if (what === 'drag') {
  await p.evaluate(() => { const v = window.__village; v.animateTo(v.fitK() * 2.5, 400, 900, 1); }); await p.waitForTimeout(2500);
  await startFrames();
  const cx = vp.width / 2, cy = vp.height / 2;
  for (let r = 0; r < 3; r++) {
    await p.mouse.move(cx - 100, cy + 150); await p.mouse.down();
    for (let i = 0; i < 40; i++) await p.mouse.move(cx - 100 + i * 4, cy + 150 - i * 9);
    for (let i = 0; i < 40; i++) await p.mouse.move(cx + 60 - i * 4, cy - 210 + i * 9);
    await p.mouse.up();
  }
  console.log('drag:', await stopFrames());
} else if (what === 'zoom') {
  await startFrames();
  const sharp = await p.evaluate(async () => {
    const v = window.__village, sleep = ms => new Promise(r => setTimeout(r, ms)), out = [];
    for (const [k, x, y] of [[3, 450, 900], [8, 520, 850], [2, 400, 1000], [6, 300, 700], [1, 400, 850], [4, 600, 1200], [1.2, 400, 800]]) {
      v.animateTo(v.fitK() * k, x, y, 450); const t0 = performance.now(); await sleep(460);
      while (v.tileStats.missing > 0 && performance.now() - t0 < 6000) await sleep(16);
      out.push(Math.round(performance.now() - t0 - 450)); await sleep(300);
    }
    return out;
  });
  console.log('zoom:', await stopFrames());
  console.log('ms until sharp after each zoom:', sharp.join(' '));
} else if (what === 'idle') {
  const out = [];
  for (let s = 0; s < 3; s++) { const a = await p.evaluate(() => window.__village.tileStats.painted); await p.waitForTimeout(3000); out.push(await p.evaluate(() => window.__village.tileStats.painted) - a); }
  console.log('tiles painted per 3s at rest:', out.join(' '));
} else if (what === 'profile') {
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); await cdp.send('Profiler.start');
  await startFrames(); await p.waitForTimeout(4000); const fr = await stopFrames();
  const { profile } = await cdp.send('Profiler.stop');
  const byId = new Map(profile.nodes.map(n => [n.id, n])), parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const incl = new Map();
  profile.samples.forEach((id, i) => { const t = profile.timeDeltas[i] || 0, seen = new Set();
    for (let x = id; x; x = parent.get(x)) { const n = byId.get(x), k = `${n.callFrame.functionName} ${n.callFrame.url.split('/').pop()}`; if (seen.has(k) || !n.callFrame.url) continue; seen.add(k); incl.set(k, (incl.get(k) || 0) + t); } });
  console.log(fr);
  console.log([...incl].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, t]) => `${(t / 1000).toFixed(0).padStart(6)}ms  ${k}`).join('\n'));
}
await b.close();
