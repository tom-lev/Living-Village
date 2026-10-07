/* הרים ועמק.
   סגנון שטוח כמו שאר האיור: כל רכס בנוי מ"מסות" ברוחב משתנה, עם 1–3 פסגות רחבות, צבע אחד, צל עדין אחד
   וכיפות שלג לא אחידות. המדרונות רחבים, כדי שאפשר יהיה להוסיף עליהם בתים ושבילים עם אנשים.
   בין המסות יש לפעמים מעבר, כדי שהרכס לא ייראה כמו שורה אחידה.
   העמק שבין שני הרכסים: גבעות מושלגות בבסיס הרכס הצפוני, ופלג קפוא לאורך קרקעית העמק,
   עם גשרים אוטומטיים בכל מקום שדרך או שביל חוצים אותו. */
import { el, n2, blob, shade, smoothOpen } from '../core/util';
import { rand, rngAt, type LocalRng } from '../core/rng';
import { ctx } from '../world/context';
import { geo, ROAD_W } from '../world/geometry';
import { markPolygon, markLine, DANGER, PATH } from '../world/walk';
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
  const n = Math.max(1, Math.min(3, Math.round(W / rg.rand(210, 300))));   // פסגות רחבות: מדרונות שאפשר לשים עליהם בתים ושבילים
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
    ridge.push(...jag(keys[i], keys[i + 1], base, rg, .05, 2));
  }
  saddleAt.push(ridge.length); ridge.push([x1, base]);
  markPolygon([...ridge, [x1, base + 2], [x0, base + 2]], DANGER);   // לא מטפסים על ההר
  // הגוף
  el('path', { d: poly([...ridge, [x1, base + 2], [x0, base + 2]]), fill: color, stroke: shade(color, -.1), 'stroke-width': 1.2, 'stroke-linejoin': 'round' }, L);
  peaks.forEach((p, i) => {
    const pi = peakAt[i], l = saddleAt[i], r = saddleAt[i + 1];
    // סגנון שטוח כמו שאר האיור: צבע אחד וצל עדין אחד בצד המזרחי (השמש ממערב, כמו הצללים של העצים)
    const footR = p.x + (ridge[r][0] - p.x) * rg.rand(.15, .35);
    el('path', { d: poly([...ridge.slice(pi, r + 1), [ridge[r][0], base], [footR, base]]), fill: shade(color, -.06) }, L);
    // כיפת שלג עם "טפטופים" לא אחידים במורד
    if (p.h > m.hMin * .7) {
      const sy = p.y + p.h * rg.rand(.22, .4);
      let li = pi, ri = pi;
      while (li > l && ridge[li - 1][1] < sy) li--;
      while (ri < r && ridge[ri + 1][1] < sy) ri++;
      const a = ridge[li], b = ridge[ri], edge: Pt[] = [];
      for (let xx = b[0] - rg.rand(4, 8); xx > a[0] + 4; xx -= rg.rand(7, 13)) edge.push([xx, sy + (rg.chance(.3) ? rg.rand(9, 24) : rg.rand(-3, 5))]);
      el('path', { d: poly([...ridge.slice(li, ri + 1), ...edge]), fill: m.snow, 'stroke-linejoin': 'round' }, L);
    }
  });
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
  autoBridges(geo.CREEK_SAMPLES, trails, 22, []);
}

/** גשרים אוטומטיים: בכל מקום שדרך או שביל חוצים מים (פלג, נהר) ואין שם כבר גשר, מציירים גשר ומסמנים אותו כמעבר.
 *  כך הכלל "חוצים מים רק בגשר" לא מנתק את העולם, וגם דרך או שביל עתידיים יקבלו גשר מעצמם */
export function autoBridges(C: Pt[], trails: Pt[][], half: number, existing: Pt[]) {
  const L = ctx.L, hits: { x: number; y: number; a: number; road: boolean }[] = [];
  const cross = (P: Pt[], road: boolean) => {
    for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < C.length - 1; j++) {
      const [ax, ay] = P[i], [bx, by] = P[i + 1], [cx, cy] = C[j], [dx, dy] = C[j + 1];
      const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx); if (!den) continue;
      const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
      if (t < 0 || t > 1 || u < 0 || u > 1) continue;
      const x = ax + t * (bx - ax), y = ay + t * (by - ay);
      if (existing.some(e => Math.hypot(e[0] - x, e[1] - y) < 60) || hits.some(h => Math.hypot(h.x - x, h.y - y) < 40)) continue;
      hits.push({ x, y, a: Math.atan2(by - ay, bx - ax) * 180 / Math.PI, road });
    }
  };
  for (const E of [...geo.EDGES, ...geo.OUTER]) cross(E.pts, true);
  for (const t of trails) cross(t, false);
  for (const h of hits) {
    const g = el('g', { transform: `translate(${n2(h.x)},${n2(h.y)}) rotate(${n2(h.a)})` }, L.groundProps), len = half;
    { const a = h.a * Math.PI / 180, c = Math.cos(a) * (len + 4), s = Math.sin(a) * (len + 4); markLine([[h.x - c, h.y - s], [h.x + c, h.y + s]], h.road ? ROAD_W / 2 : 7, PATH); }   // הגשר: עוברים עליו מעל המים
    if (h.road) {
      const w = ROAD_W / 2 + 3;
      el('rect', { x: -len, y: -w - 3, width: 2 * len, height: 6, rx: 3, fill: '#b5aca2', stroke: '#8f867c', 'stroke-width': 1 }, g);
      el('rect', { x: -len, y: w - 3, width: 2 * len, height: 6, rx: 3, fill: '#b5aca2', stroke: '#8f867c', 'stroke-width': 1 }, g);
    } else {
      el('rect', { x: -len + 4, y: -7, width: 2 * len - 8, height: 14, rx: 2, fill: '#b98552', stroke: '#8a5f39', 'stroke-width': 1 }, g);
      let pl = ''; for (let k = -len + 7; k <= len - 7; k += 5) pl += `M${n2(k)},-7v14`;
      el('path', { d: pl + `M${-len + 4},-8h${2 * len - 8}M${-len + 4},8h${2 * len - 8}`, stroke: '#6b4a2f', 'stroke-width': .9 }, g);
    }
  }
}

/** ההרים, ואחריהם הפלג שבעמק */
export function buildMountains(w: WorldData) {
  const T = w.terrain, { B } = ctx;
  // הרכסים הישנים צרכו מספרים מהמחולל הכללי; צורכים אותם גם עכשיו, כדי שהיער ושאר העולם יישארו במקומם
  for (const m of T.mountains) for (let x = B.x0 - 120; x < B.x1 + 120; x += m.step * rand(.75, 1.15)) { rand(240, 330); rand(m.hMin, m.hMax); rand(-20, 20); }
  T.mountains.forEach((m: any, i: number) => range(m, i, m.foot || (m.valley === 1 ? '#e2edf2' : '#a9bfa6')));
  if (T.creek) creek(T.creek, w.trails);
}
