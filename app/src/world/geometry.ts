/* גאומטריה של העולם: רשת הדרכים, הנהר, השבילים, ורשת תפוסה מהירה לשתילה */
import { clamp, P } from '../core/util';
import { ctx, NO_TREE, inWater } from './context';
import type { Pt, WorldData } from './types';

export interface Edge { a?: string; b?: string; pts: number[][]; acc: number[]; len: number; d: string }

/** עקומת בזייה עם טבלת אורך-קשת, כדי להתקדם לפי מרחק אמיתי (ולא לפי t) */
export function bez(p0: Pt, c1x: number, c1y: number, c2x: number, c2y: number, p3: Pt): Edge {
  const N = 200, pts: number[][] = [], acc = [0];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    pts.push([u * u * u * p0[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * p3[0],
              u * u * u * p0[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * p3[1]]);
    if (i) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return { pts, acc, len: acc[N], d: `M${P(p0)}C${c1x},${c1y} ${c2x},${c2y} ${P(p3)}` };
}

export function edgeAt(E: Edge, s: number) {
  s = clamp(s, 0, E.len);
  let lo = 0, hi = E.acc.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (E.acc[m] <= s) lo = m; else hi = m; }
  const f = (s - E.acc[lo]) / ((E.acc[hi] - E.acc[lo]) || 1), a = E.pts[lo], b = E.pts[hi];
  const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
  return { x: a[0] + dx * f, y: a[1] + dy * f, tx: dx / dl, ty: dy / dl };
}

export const geo = {
  EDGES: [] as Edge[],            // רשת ההליכה של הכפר
  OUTER: [] as Edge[],            // דרכים מחוץ לכפר (ציור בלבד)
  ADJ: {} as Record<string, { e: number; dir: number }[]>,
  RIVER_SAMPLES: [] as number[][],
  CREEK_SAMPLES: [] as number[][],   // הפלג שבעמק
};

/* ───────── רשת תפוסה גסה (תא של 10 יחידות): דרך / נהר / שביל ───────── */
const OC = 10;
let OGW = 0, OGH = 0, OCC: Uint8Array;
export const O_ROAD = 1, O_RIVER = 2, O_TRAIL = 4;
/** רוחב הדרכים: דרכי עפר צרות של כפר בלי מכוניות */
export const ROAD_W = 32;
function stamp(pts: number[][], r: number, bit: number) {
  const { B } = ctx, rc = Math.ceil(r / OC);
  for (const [x, y] of pts) {
    const cx = Math.floor((x - B.x0) / OC), cy = Math.floor((y - B.y0) / OC);
    for (let j = -rc; j <= rc; j++) for (let i = -rc; i <= rc; i++) {
      const gx = cx + i, gy = cy + j;
      if (gx < 0 || gy < 0 || gx >= OGW || gy >= OGH || (i * OC) ** 2 + (j * OC) ** 2 > r * r) continue;
      OCC[gy * OGW + gx] |= bit;
    }
  }
}
export function occ(x: number, y: number, bit: number) {
  const { B } = ctx, gx = Math.floor((x - B.x0) / OC), gy = Math.floor((y - B.y0) / OC);
  return gx < 0 || gy < 0 || gx >= OGW || gy >= OGH ? 0 : OCC[gy * OGW + gx] & bit;
}

export function buildGeometry(w: WorldData) {
  const { B } = ctx;
  const { nodes, edges, outer } = w.roads;
  geo.EDGES = edges.map(([a, b, c1x, c1y, c2x, c2y]) => ({ a, b, ...bez(nodes[a], c1x, c1y, c2x, c2y, nodes[b]) }));
  geo.OUTER = outer.map(([a, c1x, c1y, c2x, c2y, b]) => bez(a, c1x, c1y, c2x, c2y, b));
  geo.EDGES.forEach((E, i) => {
    (geo.ADJ[E.a] = geo.ADJ[E.a] || []).push({ e: i, dir: 1 });
    (geo.ADJ[E.b] = geo.ADJ[E.b] || []).push({ e: i, dir: -1 });
  });
  OGW = Math.ceil((B.x1 - B.x0) / OC); OGH = Math.ceil((B.y1 - B.y0) / OC); OCC = new Uint8Array(OGW * OGH);
  const roadSamples: number[][] = [];
  [...geo.EDGES, ...geo.OUTER].forEach(E => { for (let i = 0; i < E.pts.length; i += 5) roadSamples.push(E.pts[i]); });
  const trailSamples: number[][] = [];
  for (const t of w.trails) for (let i = 0; i < t.length - 1; i++) {
    const n = Math.ceil(Math.hypot(t[i + 1][0] - t[i][0], t[i + 1][1] - t[i][1]) / 6);
    for (let k = 0; k < n; k++) trailSamples.push([t[i][0] + (t[i + 1][0] - t[i][0]) * k / n, t[i][1] + (t[i + 1][1] - t[i][1]) * k / n]);
  }
  const R = w.river; geo.RIVER_SAMPLES = [];
  for (let i = 0; i < R.length - 1; i++)
    for (let t = 0; t < 1; t += .05) geo.RIVER_SAMPLES.push([R[i][0] + (R[i + 1][0] - R[i][0]) * t, R[i][1] + (R[i + 1][1] - R[i][1]) * t]);
  // הפלג בעמק: דוגמים את אותה עקומה חלקה שמצוירת (Catmull-Rom), כדי שגם הגשרים ייפלו במקום
  const C = w.terrain.creek as number[][] | undefined; geo.CREEK_SAMPLES = [];
  if (C) for (let i = 0; i < C.length - 1; i++) {
    const p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(C.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let t = 0; t < 1; t += .05) {
      const u = 1 - t;
      geo.CREEK_SAMPLES.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
    }
  }
  if (C) geo.CREEK_SAMPLES.push(C[C.length - 1]);
  stamp(roadSamples, ROAD_W / 2 + 12, O_ROAD); stamp(trailSamples, 15, O_TRAIL); stamp(geo.RIVER_SAMPLES, 44, O_RIVER); stamp(geo.CREEK_SAMPLES, 20, O_RIVER);
}

/** אפשר לשתול עץ כאן? (לא על דרך/שביל/נהר/מים, וגם הצמרת לא מסתירה מבנה או דרך) */
export function treeOk(x: number, y: number, noBands: number[][]) {
  const { B } = ctx;
  if (x < B.x0 + 12 || x > B.x1 - 12) return false;
  for (const [a, b] of noBands) if (y > a && y < b) return false;   // הרים, חוף
  if (occ(x, y, O_RIVER | O_TRAIL) || inWater(x, y, 30)) return false;
  for (const [x0, y0, x1, y1] of NO_TREE) if (x > x0 - 8 && x < x1 + 8 && y > y0 && y - 34 < y1) return false;
  return !occ(x, y, O_ROAD) && !occ(x, y - 30, O_ROAD);
}
