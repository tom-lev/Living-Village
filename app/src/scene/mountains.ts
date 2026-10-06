/* הרים ועמק.
   כל רכס בנוי מ"מסות" ברוחב משתנה, עם 1–4 פסגות, רכס משונן, שלושה גוונים (צד מואר, בסיס, צד מוצל),
   כיפות שלג לא אחידות, ערוצים, ולפעמים מדף שטוח (מקום לבקתה או למטיילים בעתיד).
   בין המסות יש לפעמים מעבר, כדי שהרכס לא ייראה כמו שורה אחידה.
   העמק שבין שני הרכסים: מדרון מוצל שיורד אליו מכל צד, ופלג קפוא לאורך קרקעית העמק,
   עם גשרים אוטומטיים בכל מקום שדרך או שביל חוצים אותו. */
import { el, n2, blob, shade, smoothOpen } from '../core/util';
import { rand, rngAt, type LocalRng } from '../core/rng';
import { ctx } from '../world/context';
import { geo } from '../world/geometry';
import type { WorldData } from '../world/types';

type Pt = number[];
const poly = (P: Pt[]) => 'M' + P.map(p => `${n2(p[0])},${n2(p[1])}`).join('L') + 'Z';

export interface Massif { x0: number; x1: number; base: number; ridge: Pt[]; peaks: { x: number; y: number; h: number }[] }

/** גובה הרכס בעמודה x (או null אם אין שם הר) */
export function ridgeAt(M: Massif, x: number) {
  if (x <= M.x0 || x >= M.x1) return null;
  const R = M.ridge;
  for (let i = 0; i < R.length - 1; i++) if (R[i][0] <= x && R[i + 1][0] >= x) {
    const t = (x - R[i][0]) / ((R[i + 1][0] - R[i][0]) || 1);
    return R[i][1] + (R[i + 1][1] - R[i][1]) * t;
  }
  return null;
}

/** קו משונן בין שתי נקודות (חלוקה לחצי עם הזזה אקראית) */
function jag(a: Pt, b: Pt, base: number, rg: LocalRng, rough: number, depth = 3): Pt[] {
  if (depth === 0) return [a];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const m = [(a[0] + b[0]) / 2 + rg.rand(-.15, .15) * len * rough, Math.min(base - 2, (a[1] + b[1]) / 2 + rg.rand(-1, 1) * len * rough)];
  return [...jag(a, m, base, rg, rough, depth - 1), ...jag(m, b, base, rg, rough, depth - 1)];
}

/** מסה אחת של הר */
function massif(x0: number, x1: number, base: number, m: any, rg: LocalRng, foot: string): Massif {
  const L = ctx.L.ground, W = x1 - x0, color = shade(m.color, rg.rand(-.05, .05));
  const n = Math.max(1, Math.min(4, Math.round(W / rg.rand(150, 230))));
  const peaks = Array.from({ length: n }, (_, i) => {
    const h = rg.rand(m.hMin * .6, m.hMax * 1.1);
    return { x: x0 + W * (i + .5) / n + rg.rand(-.15, .15) * W / n, y: base - h, h };
  });
  const main = peaks[Math.floor(rg.r() * n)]; main.h = Math.max(main.h, rg.rand(m.hMax * .95, m.hMax * 1.25)); main.y = base - main.h;
  // נקודות מפתח: בסיס, פסגות ואוכפים ביניהן; אחר כך שינון
  const keys: Pt[] = [[x0, base]], peakAt: number[] = [], saddleAt: number[] = [0];
  peaks.forEach((p, i) => {
    if (i > 0) { const q = peaks[i - 1]; keys.push([(q.x + p.x) / 2 + rg.rand(-.12, .12) * (p.x - q.x), base - Math.min(q.h, p.h) * rg.rand(.42, .7)]); }
    keys.push([p.x, p.y]);
  });
  keys.push([x1, base]);
  const ridge: Pt[] = [];
  for (let i = 0; i < keys.length - 1; i++) {
    if (i > 0 && i % 2 === 1) peakAt.push(ridge.length); else if (i > 0) saddleAt.push(ridge.length);
    ridge.push(...jag(keys[i], keys[i + 1], base, rg, .1));
  }
  saddleAt.push(ridge.length); ridge.push([x1, base]);
  // הגוף
  el('path', { d: poly([...ridge, [x1, base + 2], [x0, base + 2]]), fill: color, stroke: shade(color, -.1), 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, L);
  peaks.forEach((p, i) => {
    const pi = peakAt[i], l = saddleAt[i], r = saddleAt[i + 1];
    // צד מואר (שמאל) וצד מוצל (ימין): השמש מגיעה ממערב, כמו הצללים של העצים
    const footL = p.x - (p.x - ridge[l][0]) * rg.rand(.1, .3), footR = p.x + (ridge[r][0] - p.x) * rg.rand(.05, .3);
    el('path', { d: poly([[ridge[l][0], base], ...ridge.slice(l, pi + 1), [footL, base]]), fill: shade(color, .08), opacity: .55 }, L);
    el('path', { d: poly([...ridge.slice(pi, r + 1), [ridge[r][0], base], [footR, base]]), fill: shade(color, -.13) }, L);
    // ערוצים: קווים שיורדים מהרכס
    let gul = '';
    for (let k = 0; k < 3; k++) {
      const s = ridge[Math.max(l + 1, Math.min(r - 1, pi + Math.round(rg.rand(-1, 1) * (r - l) * .35)))];
      if (!s || base - s[1] < 40) continue;
      const len = (base - s[1]) * rg.rand(.25, .5), dx = rg.rand(-.2, .2) * len;
      gul += `M${n2(s[0])},${n2(s[1] + 6)}q${n2(dx * .3)},${n2(len * .5)} ${n2(dx)},${n2(len)}`;
    }
    el('path', { d: gul, fill: 'none', stroke: shade(color, -.22), 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: .45 }, L);
    // כיפת שלג עם "טפטופים" לא אחידים במורד
    if (p.h > m.hMin * .7) {
      const sy = p.y + p.h * rg.rand(.22, .4);
      let li = pi, ri = pi;
      while (li > l && ridge[li - 1][1] < sy) li--;
      while (ri < r && ridge[ri + 1][1] < sy) ri++;
      const a = ridge[li], b = ridge[ri], edge: Pt[] = [];
      for (let xx = b[0] - rg.rand(4, 8); xx > a[0] + 4; xx -= rg.rand(7, 13)) edge.push([xx, sy + (rg.chance(.3) ? rg.rand(9, 24) : rg.rand(-3, 5))]);
      el('path', { d: poly([...ridge.slice(li, ri + 1), ...edge]), fill: m.snow, 'stroke-linejoin': 'round' }, L);
      el('path', { d: poly([...ridge.slice(pi, ri + 1), [p.x + (b[0] - p.x) * .25, sy + 6]]), fill: '#dbe7ee' }, L);
    }
  });
  // מדף שטוח באמצע הגובה: מקום לבקתה, לספסל או למטיילים בעתיד
  if (W > 360 && rg.chance(.75)) {
    const p = peaks[Math.floor(rg.r() * n)], lx = p.x + rg.rand(-.25, .25) * W / n, ly = base - p.h * rg.rand(.16, .28), top = ridgeAt({ x0, x1, base, ridge, peaks }, lx);
    if (top !== null && ly > top + 30) {
      // משטח שטוח (בהיר) עם דופן קדמית כהה שמראה את העובי שלו, שלג דק ושני סלעים
      const rx = rg.rand(34, 48), dep = rg.rand(9, 13), th = rg.rand(6, 8);
      const top2 = `M${n2(lx - rx)},${n2(ly)}C${n2(lx - rx * .6)},${n2(ly - dep)} ${n2(lx + rx * .6)},${n2(ly - dep)} ${n2(lx + rx)},${n2(ly)}`;
      el('path', { d: top2 + `C${n2(lx + rx * .6)},${n2(ly + dep * .6)} ${n2(lx - rx * .6)},${n2(ly + dep * .6)} ${n2(lx - rx)},${n2(ly)}Z`, fill: shade(color, .1) }, L);
      el('path', { d: `M${n2(lx - rx)},${n2(ly)}C${n2(lx - rx * .6)},${n2(ly + dep * .6)} ${n2(lx + rx * .6)},${n2(ly + dep * .6)} ${n2(lx + rx)},${n2(ly)}l-3,${n2(th)}C${n2(lx + rx * .5)},${n2(ly + dep * .6 + th)} ${n2(lx - rx * .5)},${n2(ly + dep * .6 + th)} ${n2(lx - rx + 3)},${n2(ly + th)}Z`, fill: shade(color, -.2) }, L);
      el('path', { d: blob(lx - rx * .25, ly - 1.5, rx * .3, dep * .2, 7, .2, 3), fill: '#ffffff', opacity: .55 }, L);
      el('path', { d: blob(lx + rx * .45, ly - 2, 4, 2.6, 6, .2, 1) + blob(lx + rx * .62, ly, 2.6, 1.8, 6, .2, 2), fill: shade(color, -.1), stroke: shade(color, -.3), 'stroke-width': .6 }, L);
    }
  }
  // גבעות למרגלות ההר וכמה סלעים
  let hills = '', rocks = '';
  for (let xx = x0 + rg.rand(10, 40); xx < x1 - 20; xx += rg.rand(60, 120)) hills += blob(xx, base + 3, rg.rand(34, 70), rg.rand(12, 22), 8, .12, rg.rand(0, 6));
  for (let k = 0; k < Math.round(W / 90); k++) rocks += blob(rg.rand(x0 + 20, x1 - 20), base + rg.rand(-14, 4), rg.rand(4, 9), rg.rand(3, 5), 6, .2, rg.rand(0, 6));
  el('path', { d: hills, fill: foot }, L);
  el('path', { d: rocks, fill: shade(color, -.05), stroke: shade(color, -.25), 'stroke-width': .7 }, L);
  return { x0, x1, base, ridge, peaks };
}

/** רכס שלם: מסות עם מעברים ביניהן; נקודות עוגן (מנהרה, מפל, מערה) תמיד מכוסות */
function range(m: any, idx: number, foot: string): Massif[] {
  const { B } = ctx, rg = rngAt(m.baseY, idx, 31), anchors: number[] = m.anchors || [], out: Massif[] = [];
  const spans: [number, number][] = [];
  for (let x = B.x0 - 220; x < B.x1 + 200;) {
    if (rg.chance(m.gaps ?? .45)) {
      const gap = rg.rand(110, 320);
      if (!anchors.some(a => a > x - 90 && a < x + gap + 90)) x += gap;
    }
    const W = rg.rand(260, 620);
    spans.push([x, x + W]);
    x += W * rg.rand(.82, 1.02);
  }
  for (const a of anchors) if (!spans.some(([s0, s1]) => a > s0 + 60 && a < s1 - 60)) spans.push([a - 190, a + 190]);
  for (const [s0, s1] of spans) out.push(massif(s0, s1, m.baseY, m, rg, foot));
  return out;
}

/** מדרון מוצל שיורד אל העמק: רצועה רכה לאורך הצד של הרכס שפונה לעמק, עם קווי מדרון עדינים */
function valleySlope(L: any, M: Massif[], dir: number, depth: number, rg: LocalRng) {
  for (const k of [1, .62, .3]) {
    let d = '';
    for (const S of M) {
      const pts: Pt[] = [];
      for (let x = S.x0 + 10; x <= S.x1 - 10; x += 24) {
        const top = dir < 0 ? (ridgeAt(S, x) ?? S.base) : S.base;
        pts.push([x, top + dir * depth * k * rg.rand(.75, 1.1)]);
      }
      if (pts.length < 3) continue;
      const edgeY = dir < 0 ? S.base - 30 : S.base;
      d += smoothOpen([[S.x0 + 10, edgeY], ...pts, [S.x1 - 10, edgeY]]) + 'Z';
    }
    el('path', { d, fill: k === 1 ? '#e2ecf1' : k > .5 ? '#d7e3ea' : '#cbdae3', opacity: .9 }, L);
  }
  // קווי מדרון קצרים בכיוון הירידה
  let h = '';
  for (const S of M) for (let x = S.x0 + 20; x < S.x1 - 20; x += rg.rand(14, 26)) {
    const top = dir < 0 ? (ridgeAt(S, x) ?? S.base) : S.base, y0 = top + dir * rg.rand(10, depth * .45);
    h += `M${n2(x)},${n2(y0)}l${n2(rg.rand(-1.5, 1.5))},${n2(dir * rg.rand(5, 11))}`;
  }
  el('path', { d: h, fill: 'none', stroke: '#bfd1dc', 'stroke-width': 1.1, 'stroke-linecap': 'round', opacity: .55 }, L);
}

/** פלג קפוא בקרקעית העמק, עם גשרים במקומות שבהם דרכים ושבילים חוצים אותו */
function creek(pts: Pt[], trails: Pt[][]) {
  const L = ctx.L, d = smoothOpen(pts), rg = rngAt(pts[0][0], pts[0][1], 41);
  el('path', { d, fill: 'none', stroke: '#f7fbfd', 'stroke-width': 26, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.ground);
  el('path', { d, fill: 'none', stroke: '#8ccbe2', 'stroke-width': 15, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.ground);
  el('path', { d, fill: 'none', stroke: '#b9e2f1', 'stroke-width': 6, 'stroke-linecap': 'round', opacity: .9 }, L.ground);
  // לוחות קרח קטנים
  let ice = '';
  for (const p of geo.CREEK_SAMPLES) if (rg.chance(.06)) ice += blob(p[0] + rg.rand(-3, 3), p[1] + rg.rand(-2, 2), rg.rand(3, 6), rg.rand(1.5, 2.5), 6, .2, rg.rand(0, 6));
  el('path', { d: ice, fill: '#ffffff', opacity: .9 }, L.ground);
  // חיתוכים עם דרכים ושבילים
  const C = geo.CREEK_SAMPLES, hits: { x: number; y: number; a: number; road: boolean }[] = [];
  const cross = (P: Pt[], road: boolean) => {
    for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < C.length - 1; j++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1], [cx, cy] = C[j], [dx, dy] = C[j + 1];
      const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx); if (!den) continue;
      const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
      if (t < 0 || t > 1 || u < 0 || u > 1) continue;
      const x = ax + t * (bx - ax), y = ay + t * (by - ay);
      if (!hits.some(h => Math.hypot(h.x - x, h.y - y) < 40)) hits.push({ x, y, a: Math.atan2(by - ay, bx - ax) * 180 / Math.PI, road });
    }
  };
  for (const E of [...geo.EDGES, ...geo.OUTER]) cross(E.pts, true);
  for (const t of trails) cross(t, false);
  for (const h of hits) {
    const g = el('g', { transform: `translate(${n2(h.x)},${n2(h.y)}) rotate(${n2(h.a)})` }, L.groundProps);
    if (h.road) {
      el('rect', { x: -20, y: -29, width: 40, height: 6, rx: 3, fill: '#b5aca2', stroke: '#8f867c', 'stroke-width': 1 }, g);
      el('rect', { x: -20, y: 23, width: 40, height: 6, rx: 3, fill: '#b5aca2', stroke: '#8f867c', 'stroke-width': 1 }, g);
    } else {
      el('rect', { x: -16, y: -7, width: 32, height: 14, rx: 2, fill: '#b98552', stroke: '#8a5f39', 'stroke-width': 1 }, g);
      let pl = ''; for (let k = -13; k <= 13; k += 5) pl += `M${k},-7v14`;
      el('path', { d: pl + 'M-16,-8h32M-16,8h32', stroke: '#6b4a2f', 'stroke-width': .9 }, g);
    }
  }
}

/** ההרים. המדרונות שיורדים לעמק נכנסים לקבוצה שנוצרת לפני ההרים, כדי שיהיו מאחוריהם */
export function buildMountains(w: WorldData) {
  const T = w.terrain, { B } = ctx;
  // הרכסים הישנים צרכו מספרים מהמחולל הכללי; צורכים אותם גם עכשיו, כדי שהיער ושאר העולם יישארו במקומם
  for (const m of T.mountains) for (let x = B.x0 - 120; x < B.x1 + 120; x += m.step * rand(.75, 1.15)) { rand(240, 330); rand(m.hMin, m.hMax); rand(-20, 20); }
  const slopes = el('g', null, ctx.L.ground), rg = rngAt(0, 0, 61);
  T.mountains.forEach((m: any, i: number) => {
    const M = range(m, i, m.foot || (m.valley === 1 ? '#e2edf2' : '#a9bfa6'));
    if (m.valley) valleySlope(slopes, M, m.valley, m.slope ?? (m.valley < 0 ? 180 : 150), rg);
  });
  if (T.creek) creek(T.creek, w.trails);
}
