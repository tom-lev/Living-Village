// בדיקת תנועה (משימה 8): מריץ את העולם, דוגם כל יצור שזז 10 פעמים בשנייה, ומדווח על קפיצות, היתקעויות,
// הליכה על שטח אסור, כלב שמתרחק מהבעלים, כבשים שיוצאות מהמכלאה והבהובים (כיוון או מבט שמתחלפים מהר מדי).
// שימוש: node tools/motion.mjs [url] [seconds]   (ברירת מחדל: http://localhost:5173/, 120 שניות)
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:5173/', secs = +(process.argv[3] || 120);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(base + (base.includes('?') ? '&' : '?') + 'forcegpu');
await page.waitForFunction(() => window.__village && window.__horses, null, { timeout: 90000 });
const samples = await page.evaluate(async secs => {
  const v = window.__village, W = window.__walk, out = [];
  const t0 = performance.now();
  while (performance.now() - t0 < secs * 1000) {
    const t = (performance.now() - t0) / 1000, row = { t, w: [], d: [], h: [], s: [] };
    for (const w of v.walkers) row.w.push({ n: w.first, x: w.x, y: w.y, st: w.state, act: w.act, a: w.alpha, f: w.flip, v: w.view, ok: W.walkable(w.x, w.y, w.rules || {}) || w.act === 'swim' || !!(W.flagsAt(w.x, w.y) & W.SWIM), fl: W.flagsAt(w.x, w.y), pr: W.privateAt(w.x, w.y), mine: (w.rules || {}).priv, pl: w.place?.name, sh: w.shown });
    for (const f of v.followables) if (/dog/.test(f.name)) row.d.push({ x: f.x, y: f.y, a: f.alpha, ox: f.owner.x, oy: f.owner.y, ost: f.owner.state, v: f.view, wait: f.waiting });
    for (const h of window.__horses) row.h.push({ x: h.x, y: h.y });
    // הכבשים ממוינות מחדש לפי עומק מדי כמה פריימים: מזהים כל כבשה לפי מספר קבוע
    window.__sheep?.forEach((s, i) => s._id ??= i);
    for (const s of [...(window.__sheep || [])].sort((a, b) => a._id - b._id)) row.s.push({ x: s.x, y: s.y, area: s.area && [s.area.x0, s.area.y0, s.area.x1, s.area.y1] });
    out.push(row);
    await new Promise(r => setTimeout(r, 100));
  }
  return out;
}, secs);
await browser.close();

const issues = {}, add = (k, msg) => ((issues[k] ||= []).push(msg));
const fmt = n => Math.round(n);
// אנשים
const nW = samples[0].w.length;
for (let i = 0; i < nW; i++) {
  let still = 0, flips = [], bad = 0, total = 0, lastSit = -9; const where = {};
  for (let k = 1; k < samples.length; k++) {
    const a = samples[k - 1].w[i], b = samples[k].w[i], dt = samples[k].t - samples[k - 1].t || .1;
    const sp = Math.hypot(b.x - a.x, b.y - a.y) / dt;
    if (a.a >= 1 && b.a >= 1 && sp > 60) add('jump', `${b.n} jumped ${fmt(sp * dt)} units at (${fmt(b.x)}, ${fmt(b.y)}) t=${b.t?.toFixed?.(1) ?? samples[k].t.toFixed(1)}s, state ${a.st}→${b.st}`);
    if (b.st === 'walk' && b.a >= 1 && sp < 1) still += dt; else still = 0;
    if (still > 6) { add('stuck', `${b.n} stands still while walking at (${fmt(b.x)}, ${fmt(b.y)}) t=${samples[k].t.toFixed(1)}s`); still = -1e9; }
    if (Math.sign(a.f) !== Math.sign(b.f) && b.a >= 1) flips.push(samples[k].t);
    if (b.st === 'stay' && b.act === 'sit') lastSit = samples[k].t;   // קמים מספסל: השניות הראשונות על הבסיס שלו מותרות
    if (b.a > .5 && !(b.st === 'stay' && b.act === 'sit') && samples[k].t - lastSit > 2) { total++; if (!b.ok) { bad++; const key = `${Math.round(b.x / 40) * 40},${Math.round(b.y / 40) * 40} flags ${b.fl} plot ${b.pr} mine ${b.mine} ${b.st}/${b.act || ''} → ${b.pl}`; where[key] = (where[key] || 0) + 1; } }
  }
  for (let k = 3; k < flips.length; k++) if (flips[k] - flips[k - 3] < 1.5) { add('flicker', `${samples[0].w[i].n} turns left/right 4 times within 1.5 s around t=${flips[k].toFixed(1)}s`); break; }
  if (total && bad / total > .01) add('forbidden', `${samples[0].w[i].n} spends ${(100 * bad / total).toFixed(1)}% of the time on forbidden ground: ` + Object.entries(where).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, c]) => `${k} ×${c}`).join(' | '));
}
// כלב
for (let k = 1; k < samples.length; k++) for (let j = 0; j < samples[k].d.length; j++) {
  const a = samples[k - 1].d[j], b = samples[k].d[j], dt = samples[k].t - samples[k - 1].t || .1;
  const sp = Math.hypot(b.x - a.x, b.y - a.y) / dt, far = Math.hypot(b.x - b.ox, b.y - b.oy);
  if (a.a >= 1 && b.a >= 1 && sp > 120) add('jump', `dog jumped ${fmt(sp * dt)} units at (${fmt(b.x)}, ${fmt(b.y)}) t=${samples[k].t.toFixed(1)}s`);
  if (!b.wait && b.ost === 'walk' && far > 70) add('dog-far', `dog is ${fmt(far)} from its owner at t=${samples[k].t.toFixed(1)}s`);
}
// סוסים וכבשים
for (const [key, label] of [['h', 'horse'], ['s', 'sheep']]) for (let k = 1; k < samples.length; k++) samples[k][key].forEach((b, j) => {
  const a = samples[k - 1][key][j], dt = samples[k].t - samples[k - 1].t || .1, sp = Math.hypot(b.x - a.x, b.y - a.y) / dt;
  if (sp > 80) add('jump', `${label} ${j} jumped ${fmt(sp * dt)} units at t=${samples[k].t.toFixed(1)}s`);
  if (b.area && (b.x < b.area[0] || b.x > b.area[2] || b.y < b.area[1] || b.y > b.area[3])) add('escape', `${label} ${j} is outside its paddock at (${fmt(b.x)}, ${fmt(b.y)})`);
});

for (const e of errors) console.log(`error: ${e}`);
const fps = samples.length / secs;
console.log(`${samples.length} samples over ${secs}s (${fps.toFixed(1)}/s)`);
let n = 0;
for (const [k, list] of Object.entries(issues)) {
  const uniq = [...new Set(list)];
  n += uniq.length;
  console.log(`${k} (${uniq.length})`);
  for (const m of uniq.slice(0, 12)) console.log('  ' + m);
  if (uniq.length > 12) console.log(`  … ${uniq.length - 12} more`);
}
console.log(n ? `${n} motion issues` : '0 motion issues');
process.exit(n ? 1 : 0);
