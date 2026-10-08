/* טבע: עצים, דקלים, צבאים */
import { TREE_MIN } from '../world/scale';
import { el, n2, circ, shade } from '../core/util';
import { rand, pick, R, rngAt } from '../core/rng';
import { ctx, prop, block, statics } from '../world/context';
import { markRect, SOLID } from '../world/walk';
import { register } from './registry';

export function pine(x: number, y: number, s: number, snowy = false) {
  s = Math.max(s * 1.35, TREE_MIN / 29);   // פרופורציות: עץ לפחות פי 2 מגובה אדם (הציור גבוה כ-29·s)
  // מעט צורות לכל עץ (גוף אחד והדגשה אחת לכל שלוש הקומות)
  // כל עץ קצת אחר (אקראיות מקומית, כדי לא להזיז את שאר העולם): רוחב, גובה, הטיה, גוון, גזע
  const v = rngAt(x, y, 3), wf = v.rand(.88, 1.12), hf = v.rand(.9, 1.12), lean = v.rand(-.06, .06) * s, trunk = v.rand(5, 7.5);
  const g = prop(y);
  el('ellipse', { cx: x + 2 * s, cy: y, rx: 9 * s * wf, ry: 2.6 * s, fill: 'rgba(40,70,20,.22)' }, g);
  el('rect', { x: x - 1.4 * s, y: y - trunk * s, width: 2.8 * s, height: (trunk + .5) * s, rx: .8 * s, fill: shade('#8b5a2b', v.rand(-.08, .08)) }, g);
  const tiers = [[5, 10.5, 14], [12, 8.5, 12], [18.5, 6.2, 10.5]].map(([dy, hw, th], i) => [(dy + trunk - 6) * hf, hw * wf * v.rand(.92, 1.08), th * hf * v.rand(.94, 1.06), lean * (i + 1) * 4]);
  const c = shade(rngAt(x, y, 4).pick(['#3f9150', '#3a8a4c', '#459a55']), v.rand(-.06, .06));
  let body = '', hl = '';
  for (const [dy, hw, th, lx] of tiers) {
    const by = y - dy * s, tx = x + lx;
    body += `M${n2(x - hw * s)},${n2(by)}L${n2(tx)},${n2(by - th * s)}L${n2(x + hw * s)},${n2(by)}Z`;
    hl += `M${n2(tx)},${n2(by - th * s)}L${n2(x + hw * s)},${n2(by)}L${n2(x + 1)},${n2(by)}Z`;
  }
  el('path', { d: body, fill: c, 'stroke-linejoin': 'round', stroke: c, 'stroke-width': 1.5 }, g);
  el('path', { d: hl, fill: shade(c, .12) }, g);
  // המלבן המצויר, מחושב מהצורה (בלי למדוד את הציור: מדידה מכריחה את הדפדפן לחשב פריסה, וזה האט את הטעינה)
  { const hw = Math.max(...tiers.map(q => q[1])) * s, top = Math.min(...tiers.map(q => y - q[0] * s - q[2] * s)) - 1;
    const x0 = Math.min(x - hw, x + 2 * s - 9 * s * wf) - 1, x1 = Math.max(x + hw, x + 2 * s + 9 * s * wf) + 1;
    statics[statics.length - 1].bb = [x0, top, x1 - x0, y + 2.6 * s - top]; }
  if (snowy) {
    let sn = '';
    for (const [dy, hw, th, lx] of tiers) {
      const by = y - dy * s, ty = by - th * s, tx = x + lx;
      sn += `M${n2(tx - hw * s * .45)},${n2(ty + th * s * .45)}L${n2(tx)},${n2(ty)}L${n2(tx + hw * s * .45)},${n2(ty + th * s * .45)}l${n2(-hw * s * .15)},${n2(-th * s * .08)}l${n2(-hw * s * .15)},${n2(th * s * .1)}l${n2(-hw * s * .15)},${n2(-th * s * .1)}Z`;
    }
    el('path', { d: sn, fill: '#ffffff' }, g);
  }
}

export function roundTree(x: number, y: number, s: number, fruit = false) {
  s = Math.max(s * 1.4, TREE_MIN / 33);   // פרופורציות (world/scale.ts): עץ לפחות פי 2 מגובה אדם (הציור גבוה כ-33·s עד 37·s)
  // כל עץ קצת אחר: גובה הגזע, גודל ומיקום הגושים בצמרת, וגוון
  const v = rngAt(x, y, 5), tk = v.rand(12.5, 15.5), cr = v.rand(.9, 1.1), sx = v.rand(-1.2, 1.2) * s;
  const g = prop(y);
  el('ellipse', { cx: x + 2 * s, cy: y, rx: 10 * s * cr, ry: 3 * s, fill: 'rgba(40,70,20,.22)' }, g);
  el('path', { d: `M${n2(x - 1.6 * s)},${n2(y)}L${n2(x - 1 + sx * .3)},${n2(y - tk * s)}L${n2(x + 1 + sx * .3)},${n2(y - tk * s)}L${n2(x + 1.6 * s)},${n2(y)}Z`, fill: shade('#8b5a2b', v.rand(-.08, .08)) }, g);
  const c = shade(rngAt(x, y, 6).pick(['#5db85a', '#63bd5c', '#55ad55', '#7cc35a']), v.rand(-.05, .05)), dy = (tk - 14) * s;
  let crown = circ(x + sx, y - 22 * s - dy, 10.5 * s * cr) + circ(x - 6.5 * s * cr + sx, y - 16.5 * s - dy + v.rand(-1, 1) * s, 7 * s * v.rand(.88, 1.1)) + circ(x + 6.5 * s * cr + sx, y - 17 * s - dy + v.rand(-1, 1) * s, 7.5 * s * v.rand(.88, 1.1));
  const extra = v.chance(.35);
  if (extra) crown += circ(x + sx + v.rand(-4, 4) * s, y - 29 * s - dy, 5.5 * s * v.rand(.8, 1.1));   // לפעמים גוש נוסף למעלה
  // המלבן המצויר, מחושב מהצורה (בלי למדוד את הציור)
  { const top = Math.min(y - 22 * s - dy - 10.5 * s * cr, extra ? y - 29 * s - dy - 6.1 * s : Infinity) - 1, side = 6.5 * s * cr + 8.3 * s;
    const x0 = Math.min(x + sx - side - 4 * s, x + 2 * s - 10 * s * cr), x1 = Math.max(x + sx + side + 4 * s, x + 2 * s + 10 * s * cr);
    statics[statics.length - 1].bb = [x0, top, x1 - x0, y + 3 * s - top]; }
  el('path', { d: crown, fill: c }, g);
  el('path', { d: circ(x - 3 * s + sx, y - 26 * s - dy, 4.2 * s), fill: shade(c, .2) }, g);
  let ticks = '';
  for (let i = 0; i < 3; i++) { const tx = x + rand(-6, 6) * s, ty = y - rand(14, 27) * s; ticks += `M${n2(tx)},${n2(ty)}q${n2(1.6 * s)},${n2(-1 * s)} ${n2(1.8 * s)},${n2(1 * s)}`; }
  el('path', { d: ticks, fill: 'none', stroke: shade(c, -.25), 'stroke-width': .9, 'stroke-linecap': 'round' }, g);
  if (fruit || R() < .22) {
    let fr = '';
    for (let i = 0; i < 5; i++) fr += circ(x + rand(-9, 9) * s, y - rand(15, 28) * s, 1.3 * s);
    el('path', { d: fr, fill: '#e8513f' }, g);
  }
}

export function palm(x: number, y: number, s: number) {
  const g = prop(y);
  el('ellipse', { cx: x + 6 * s, cy: y + 1, rx: 12 * s, ry: 3 * s, fill: 'rgba(120,90,40,.2)' }, g);
  el('path', { d: `M${x},${y}Q${x + 6 * s},${y - 20 * s} ${x + 2 * s},${y - 40 * s}`, stroke: '#a0643a', 'stroke-width': 4 * s, fill: 'none', 'stroke-linecap': 'round' }, g);
  let lv = ''; const tx = x + 2 * s, ty = y - 40 * s;
  for (const a of [-160, -120, -60, -20, 30, 150]) {
    const r = a * Math.PI / 180, ex = tx + Math.cos(r) * 20 * s, ey = ty + Math.sin(r) * 12 * s + 6 * s;
    lv += `M${n2(tx)},${n2(ty)}Q${n2((tx + ex) / 2)},${n2((ty + ey) / 2 - 8 * s)} ${n2(ex)},${n2(ey)}`;
  }
  el('path', { d: lv, stroke: '#3f9a4a', 'stroke-width': 4.5 * s, fill: 'none', 'stroke-linecap': 'round' }, g);
  el('path', { d: circ(tx - 2 * s, ty + 3 * s, 2 * s) + circ(tx + 2 * s, ty + 4 * s, 2 * s), fill: '#7a4a24' }, g);
}

export function deer(x: number, y: number, f: number, antlers: boolean) {
  const g = prop(y), b = el('g', { transform: `translate(${x},${y}) scale(${f},1)` }, g), c = '#b5733a';
  el('ellipse', { cx: 0, cy: 1, rx: 13, ry: 3, fill: 'rgba(40,70,20,.22)' }, b);
  el('path', { d: 'M-8,-10v10M-4,-10v10M6,-10v10M9,-10v10', stroke: shade(c, -.25), 'stroke-width': 1.8, 'stroke-linecap': 'round' }, b);
  el('ellipse', { cx: 0, cy: -13, rx: 12, ry: 5.5, fill: c }, b);
  el('path', { d: circ(-3, -14, 1) + circ(3, -15, 1) + circ(-7, -12, .9), fill: '#fff3d6' }, b);
  el('path', { d: 'M8,-15l5,-12l4,1l-3,12z', fill: c }, b);
  el('ellipse', { cx: 17, cy: -27, rx: 5, ry: 3.2, fill: c, transform: 'rotate(15 17 -27)' }, b);
  el('circle', { cx: 18, cy: -28, r: .7, fill: '#2b2220' }, b);
  el('path', { d: 'M12,-30l-3,-3', stroke: c, 'stroke-width': 2, 'stroke-linecap': 'round' }, b);
  if (antlers) el('path', { d: 'M14,-30l-2,-9l-3,-3M12,-37l3,-3M16,-30l2,-9l3,-2M18,-36l-3,-3', fill: 'none', stroke: '#8a5a35', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, b);
  el('path', { d: 'M-12,-15l-3,-2', stroke: '#fff3d6', 'stroke-width': 2, 'stroke-linecap': 'round' }, b);
  block(x - 20, y - 45, x + 25, y + 8);
}

/* ───── היער העתיק במזרח ───── */
/** אליפסה כנתיב (קשתות: מעט נקודות) */
const ell = (cx: number, cy: number, rx: number, ry: number) => `M${n2(cx - rx)},${n2(cy)}a${n2(rx)},${n2(ry)} 0 1,0 ${n2(2 * rx)},0a${n2(rx)},${n2(ry)} 0 1,0 ${n2(-2 * rx)},0Z`;

/** סקוויה ענקית: גזע עבה ואדמדם שמתרחב בבסיס, קווי קליפה, טחב על השורשים, וצמרת גבוהה של גושים כהים בשכבות,
 *  עם אור מצד אחד. גבוהה בערך פי שניים מאורן. s: קנה מידה (1 = כ-150 יחידות גובה) */
export function sequoia(x: number, y: number, s: number) {
  const v = rngAt(x, y, 15), H = 150 * s * v.rand(.9, 1.1), tw = 7.5 * s * v.rand(.9, 1.15), lean = v.rand(-.03, .03) * H;
  const g = prop(y), bark = shade('#a3572f', v.rand(-.08, .08)), dark = shade(bark, -.25);
  el('ellipse', { cx: x + 5 * s, cy: y + 1, rx: 26 * s, ry: 6 * s, fill: 'rgba(30,55,20,.25)' }, g);
  // הגזע: מתרחב בשורשים, מצטמצם למעלה
  const top = y - H * .78;
  el('path', { d: `M${n2(x - tw * 1.7)},${n2(y)}C${n2(x - tw)},${n2(y - 6 * s)} ${n2(x - tw * .8)},${n2(y - H * .3)} ${n2(x - tw * .45 + lean)},${n2(top)}L${n2(x + tw * .45 + lean)},${n2(top)}C${n2(x + tw * .8)},${n2(y - H * .3)} ${n2(x + tw)},${n2(y - 6 * s)} ${n2(x + tw * 1.7)},${n2(y)}Z`, fill: bark }, g);
  let lines = '';
  for (const f of [-.4, .25]) lines += `M${n2(x + f * tw * 1.6)},${n2(y - 2 * s)}Q${n2(x + f * tw * .9 + lean * .3)},${n2(y - H * .3)} ${n2(x + f * tw * .5 + lean)},${n2(top + 8 * s)}`;
  el('path', { d: lines, fill: 'none', stroke: dark, 'stroke-width': 1.3 * s, 'stroke-linecap': 'round' }, g);
  el('path', { d: `M${n2(x + tw * .25)},${n2(y - 3 * s)}Q${n2(x + tw * .45 + lean * .3)},${n2(y - H * .35)} ${n2(x + tw * .2 + lean)},${n2(top + 6 * s)}`, fill: 'none', stroke: shade(bark, .18), 'stroke-width': 1.6 * s, 'stroke-linecap': 'round' }, g);   // אור על הגזע
  el('path', { d: ell(x - tw * .9, y - 1.5 * s, tw * .9, 2.2 * s) + ell(x + tw * 1.1, y - 1 * s, tw * .7, 1.8 * s), fill: '#6f9a46' }, g);   // טחב על השורשים
  // הצמרת: גושים כהים מלמטה למעלה, הולכים וקטנים; אור בצד ימין
  const c = shade(v.pick(['#2f6b45', '#2c6542', '#356f47']), v.rand(-.05, .05));
  let crown = '', hl = '';
  const n = 5;
  for (let i = 0; i < n; i++) {
    // גושים עגולים וגבוהים שנבלעים זה בזה (חרוט אחד לא סדיר), כל אחד מוזז קצת לצד אחר
    const u = i / (n - 1), cy = y - H * (.5 + u * .4), w = (21 - u * 12) * s * v.rand(.88, 1.12), h = (15 - u * 5) * s, cx = x + lean * (.55 + u * .45) + (i % 2 ? 1 : -1) * w * .14 + v.rand(-2, 2) * s;
    crown += ell(cx, cy, w, h); hl += ell(cx + w * .38, cy - h * .2, w * .4, h * .55);
  }
  const tx = x + lean, ty = y - H * .9;
  crown += `M${n2(tx - 7 * s)},${n2(ty)}L${n2(tx)},${n2(y - H * 1.01)}L${n2(tx + 7 * s)},${n2(ty)}Z`;   // קצה מחודד
  el('path', { d: crown, fill: c }, g);
  el('path', { d: hl, fill: shade(c, .13) }, g);
  const x0 = x - 30 * s, x1 = x + 32 * s;
  statics[statics.length - 1].bb = [x0, y - H, x1 - x0, H + 7 * s];
}

/** אשוח עתיק: גבוה, צר וכהה, ענפים שמשתלשלים בשכבות; גזע כהה. במדרון המושלג – עם שלג */
export function ancientFir(x: number, y: number, s: number, snowy = false) {
  const v = rngAt(x, y, 17), H = 105 * s * v.rand(.9, 1.12), W = 17 * s * v.rand(.88, 1.12);
  const g = prop(y), c = shade(v.pick(['#2a5a44', '#2f6249', '#285440']), v.rand(-.05, .05));
  el('ellipse', { cx: x + 3 * s, cy: y + 1, rx: W * .9, ry: 4 * s, fill: 'rgba(30,55,20,.25)' }, g);
  el('rect', { x: x - 2.4 * s, y: y - H * .2, width: 4.8 * s, height: H * .2 + .5, fill: shade('#5c3d28', v.rand(-.08, .08)) }, g);
  let body = '', hl = '', sn = '';
  const n = 4;
  for (let i = 0; i < n; i++) {
    const u = i / n, by = y - H * (.12 + u * .8), w = W * (1 - u * .72), th = H * .27;
    // שכבה עם קצוות שמשתלשלים מטה
    body += `M${n2(x - w)},${n2(by + 2 * s)}Q${n2(x - w * .5)},${n2(by - th * .35)} ${n2(x)},${n2(by - th)}Q${n2(x + w * .5)},${n2(by - th * .35)} ${n2(x + w)},${n2(by + 2 * s)}Q${n2(x)},${n2(by - 2 * s)} ${n2(x - w)},${n2(by + 2 * s)}Z`;
    hl += `M${n2(x)},${n2(by - th)}Q${n2(x + w * .5)},${n2(by - th * .35)} ${n2(x + w)},${n2(by + 2 * s)}L${n2(x + w * .2)},${n2(by)}Z`;
    if (snowy) sn += `M${n2(x - w * .5)},${n2(by - th * .45)}Q${n2(x)},${n2(by - th * 1.1)} ${n2(x + w * .5)},${n2(by - th * .45)}Q${n2(x)},${n2(by - th * .6)} ${n2(x - w * .5)},${n2(by - th * .45)}Z`;
  }
  el('path', { d: body, fill: c }, g);
  el('path', { d: hl, fill: shade(c, .12) }, g);
  if (snowy) el('path', { d: sn, fill: '#ffffff' }, g);
  statics[statics.length - 1].bb = [x - W - 1, y - H * .92 - 2, 2 * W + 2, H * .92 + 6 * s];
}

/** הענק הזקן: סקוויה עצומה אחת עם שם (יעד לטיול), בקרחת קטנה עם טחב ושרכים */
function giantRedwood(o: any) {
  const { x, y } = o, v = rngAt(x, y, 19);
  let moss = '', fern = '';
  for (let i = 0; i < 9; i++) { const a = v.rand(0, 6.28), r = v.rand(30, 70); moss += ell(x + Math.cos(a) * r, y + 6 + Math.sin(a) * r * .35, v.rand(8, 16), v.rand(3, 5)); }
  for (let i = 0; i < 7; i++) {
    const fx = x + v.rand(-70, 70), fy = y + v.rand(8, 30);
    for (let k = -2; k <= 2; k++) { const a = -Math.PI / 2 + k * .45, l = 10 - Math.abs(k) * 1.5; fern += `M${n2(fx)},${n2(fy)}Q${n2(fx + Math.cos(a) * l * .4)},${n2(fy + Math.sin(a) * l * .7 - 2)} ${n2(fx + Math.cos(a) * l)},${n2(fy + Math.sin(a) * l * .8)}`; }
  }
  const G = ctx.L.groundProps;
  el('path', { d: moss, fill: '#6f9a46', opacity: .6 }, G);
  el('path', { d: fern, fill: 'none', stroke: '#3f7a3c', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, G);
  sequoia(x, y, 1.75);
  block(x - 80, y - 270, x + 80, y + 40);
  markRect(x - 28, y - 10, x + 28, y - 1, SOLID);
}

register({
  sequoia: o => sequoia(o.x, o.y, o.s ?? 1),
  ancientFir: o => ancientFir(o.x, o.y, o.s ?? 1, !!o.snowy),
  giantRedwood,
  pine: o => pine(o.x, o.y, o.s ?? 1.8, !!o.snowy),
  roundTree: o => roundTree(o.x, o.y, o.s ?? 1.5, !!o.fruit),
  palm: o => palm(o.x, o.y, o.s ?? 1),
  deer: o => deer(o.x, o.y, o.flip ?? 1, !!o.antlers),
});
