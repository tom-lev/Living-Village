/* מפת מעבר: איפה מותר לדרוך. חלה על כל מי שהולך בעולם (אנשים, כלב, ובעתיד חיות).
   רשת של 6×6 יחידות על כל העולם. כל אובייקט מסמן את השטח שלו בזמן הבנייה, לפי הסוג שלו,
   כך שגם תוכן עתידי מכבד את הכללים בלי הגדרה נוספת.

   הכללים (בקיצור): לא הולכים על מים (חוץ משחייה באזור הרדוד ליד החוף), לא עוברים דרך מבנים,
   גדרות ומכשולים, לא דורכים על שדות וערוגות, לא נכנסים למגרש פרטי של אחרים, לא מטפסים על ההרים,
   וחוצים את המסילה רק במעבר. דרכים ושבילים (כולל גשרים) תמיד מותרים, אלא אם יש עליהם מבנה ממש. */
import { ctx } from './context';

export const WATER = 1, SWIM = 2, DANGER = 4, SOFT = 8, SOLID = 16, PATH = 32;
/** גשר (מעבר מעל מים), דרך או שביל (LANE), רחבה מרוצפת (PLAZA) */
export const BRIDGE = 64, LANE = 128, PLAZA = 256;
const C = 6;
let W = 0, H = 0, X0 = 0, Y0 = 0, F: Uint16Array, PRIV: Uint16Array;

export function initWalk() {
  const { B } = ctx;
  X0 = B.x0; Y0 = B.y0; W = Math.ceil((B.x1 - B.x0) / C); H = Math.ceil((B.y1 - B.y0) / C);
  F = new Uint16Array(W * H); PRIV = new Uint16Array(W * H);
}
const ix = (x: number) => Math.floor((x - X0) / C), iy = (y: number) => Math.floor((y - Y0) / C);
const inside = (i: number, j: number) => i >= 0 && j >= 0 && i < W && j < H;

/* ───────── סימון ───────── */
export function markRect(x0: number, y0: number, x1: number, y1: number, flag: number) {
  for (let j = Math.max(0, iy(y0)); j <= Math.min(H - 1, iy(y1)); j++) for (let i = Math.max(0, ix(x0)); i <= Math.min(W - 1, ix(x1)); i++) F[j * W + i] |= flag;
}
export function markEllipse(cx: number, cy: number, rx: number, ry: number, flag: number) {
  for (let j = Math.max(0, iy(cy - ry)); j <= Math.min(H - 1, iy(cy + ry)); j++) for (let i = Math.max(0, ix(cx - rx)); i <= Math.min(W - 1, ix(cx + rx)); i++) {
    const x = X0 + (i + .5) * C, y = Y0 + (j + .5) * C;
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) F[j * W + i] |= flag;
  }
}
/** דרך או שביל: מותרים, חוץ מאיפה שהם עוברים מעל מים (שם רק גשר מתיר מעבר) */
export function markPath(pts: number[][], r: number) {
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (C / 2)));
    for (let s = 0; s <= n; s++) {
      const cx = ax + (bx - ax) * s / n, cy = ay + (by - ay) * s / n;
      for (let j = Math.max(0, iy(cy - r)); j <= Math.min(H - 1, iy(cy + r)); j++) for (let i = Math.max(0, ix(cx - r)); i <= Math.min(W - 1, ix(cx + r)); i++) {
        const x = X0 + (i + .5) * C, y = Y0 + (j + .5) * C, k2 = j * W + i;
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r && !(F[k2] & WATER)) F[k2] |= PATH | LANE;
      }
    }
  }
}
/** קו עבה (גדר, נהר, שביל) דרך רשימת נקודות */
export function markLine(pts: number[][], r: number, flag: number) {
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, ay] = pts[k], [bx, by] = pts[k + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (C / 2)));
    for (let s = 0; s <= n; s++) markEllipse(ax + (bx - ax) * s / n, ay + (by - ay) * s / n, r, r, flag);
  }
  if (pts.length === 1) markEllipse(pts[0][0], pts[0][1], r, r, flag);
}
export function markPolygon(P: number[][], flag: number) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of P) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  for (let j = Math.max(0, iy(y0)); j <= Math.min(H - 1, iy(y1)); j++) for (let i = Math.max(0, ix(x0)); i <= Math.min(W - 1, ix(x1)); i++) {
    const x = X0 + (i + .5) * C, y = Y0 + (j + .5) * C;
    let inP = false;
    for (let a = 0, b = P.length - 1; a < P.length; b = a++) if ((P[a][1] > y) !== (P[b][1] > y) && x < (P[b][0] - P[a][0]) * (y - P[a][1]) / (P[b][1] - P[a][1]) + P[a][0]) inP = !inP;
    if (inP) F[j * W + i] |= flag;
  }
}
/** אגם שסומן אחרי הדרכים: בתוכו הדרך או השביל לא מתירים מעבר (חוץ מגשר) */
export function clearPathIn(cx: number, cy: number, rx: number, ry: number) {
  for (let j = Math.max(0, iy(cy - ry)); j <= Math.min(H - 1, iy(cy + ry)); j++) for (let i = Math.max(0, ix(cx - rx)); i <= Math.min(W - 1, ix(cx + rx)); i++) {
    const x = X0 + (i + .5) * C, y = Y0 + (j + .5) * C, k = j * W + i;
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && !(F[k] & BRIDGE)) F[k] &= ~(PATH | LANE);
  }
}
/** כלל המיקום של חפצים (ספסל, שולחן, שמיכה...): לא על דרך או שביל, לא על מים, מבנה, הר או מגרש פרטי,
 *  ולא "חוצה" שפה של רחבה מרוצפת: או כולו על הריצוף או כולו מחוצה לו */
export function placeOk(x0: number, y0: number, x1: number, y1: number) {
  let plaza = 0, total = 0;
  for (let j = Math.max(0, iy(y0)); j <= Math.min(H - 1, iy(y1)); j++) for (let i = Math.max(0, ix(x0)); i <= Math.min(W - 1, ix(x1)); i++) {
    const k = j * W + i, f = F[k];
    if ((f & WATER && !(f & BRIDGE)) || f & (SOLID | LANE | DANGER) || PRIV[k]) return false;
    total++; if (f & PLAZA) plaza++;
  }
  return plaza === 0 || plaza === total;
}
/** המקום המותר הקרוב לחפץ (חיפוש בספירלה עד 100 יחידות). מחזיר את ההזזה, או null */
export function findPlace(fp: number[]): number[] | null {
  for (let r = 4; r <= 100; r += 4) for (let a = 0; a < 16; a++) {
    const t = a / 16 * Math.PI * 2, dx = Math.round(Math.cos(t) * r), dy = Math.round(Math.sin(t) * r);
    if (placeOk(fp[0] + dx, fp[1] + dy, fp[2] + dx, fp[3] + dy)) return [dx, dy];
  }
  return null;
}
/** מגרש פרטי: רק מי שגר בבית של המגרש נכנס */
export function markPrivate(x0: number, y0: number, x1: number, y1: number, id: number) {
  for (let j = Math.max(0, iy(y0)); j <= Math.min(H - 1, iy(y1)); j++) for (let i = Math.max(0, ix(x0)); i <= Math.min(W - 1, ix(x1)); i++) PRIV[j * W + i] = id;
}
export const privateAt = (x: number, y: number) => { const i = ix(x), j = iy(y); return inside(i, j) ? PRIV[j * W + i] : 0; };

/* ───────── שאלות ───────── */
export interface WalkRules { priv?: number; swim?: boolean }
function okCell(i: number, j: number, r: WalkRules) {
  if (!inside(i, j)) return false;
  const k = j * W + i, f = F[k];
  if (f & SOLID) return false;
  if (PRIV[k] && PRIV[k] !== r.priv) return false;
  if (f & PATH) return true;
  if (f & WATER) return !!(r.swim && f & SWIM);
  return !(f & (DANGER | SOFT));
}
export const walkable = (x: number, y: number, r: WalkRules = {}) => okCell(ix(x), iy(y), r);
export const flagsAt = (x: number, y: number) => { const i = ix(x), j = iy(y); return inside(i, j) ? F[j * W + i] : 0; };

/** קו ישר פנוי בין שתי נקודות? */
export function clearLine(a: number[], b: number[], r: WalkRules = {}, skip: number[][] = []) {
  const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (C / 2)));
  for (let s = 0; s <= n; s++) {
    const x = a[0] + (b[0] - a[0]) * s / n, y = a[1] + (b[1] - a[1]) * s / n;
    if (skip.some(q => Math.hypot(q[0] - x, q[1] - y) < C * 1.6)) continue;   // נקודות הקצה (דלת, ספסל) מותרות
    if (!walkable(x, y, r)) return false;
  }
  return true;
}
/** הנקודה המותרת הקרובה (למשל יעד שנפל בתוך מים או בתוך מבנה) */
export function nearestWalkable(x: number, y: number, r: WalkRules = {}, maxR = 90): number[] | null {
  if (walkable(x, y, r)) return [x, y];
  for (let rad = C; rad <= maxR; rad += C) {
    let best: number[] | null = null, bd = Infinity;
    for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2, px = x + Math.cos(t) * rad, py = y + Math.sin(t) * rad; if (walkable(px, py, r)) { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = [px, py]; } } }
    if (best) return best;
  }
  return null;
}

/** מסלול על הרשת (A*, 8 כיוונים) בתוך תיבה סביב שתי הנקודות; אחר כך מיישרים (מוחקים פניות מיותרות).
 *  הנקודות עצמן מותרות גם אם הן על הקצה (דלת בבסיס בית, ספסל). מחזיר null אם אין דרך */
export function gridPath(a: number[], b: number[], r: WalkRules = {}, margin = 160): number[][] | null {
  const ax = ix(a[0]), ay = iy(a[1]), bx = ix(b[0]), by = iy(b[1]);
  const m = Math.ceil(margin / C), i0 = Math.max(0, Math.min(ax, bx) - m), i1 = Math.min(W - 1, Math.max(ax, bx) + m), j0 = Math.max(0, Math.min(ay, by) - m), j1 = Math.min(H - 1, Math.max(ay, by) + m);
  const bw = i1 - i0 + 1, bh = j1 - j0 + 1, N = bw * bh, g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const L = (i: number, j: number) => (j - j0) * bw + (i - i0);
  const ok = (i: number, j: number) => (Math.abs(i - ax) <= 1 && Math.abs(j - ay) <= 1) || (Math.abs(i - bx) <= 1 && Math.abs(j - by) <= 1) || okCell(i, j, r);
  const heap: [number, number][] = [];
  const push = (f: number, k: number) => { heap.push([f, k]); let q = heap.length - 1; while (q > 0) { const p = (q - 1) >> 1; if (heap[p][0] <= heap[q][0]) break; [heap[p], heap[q]] = [heap[q], heap[p]]; q = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let q = 0; for (;;) { const l = 2 * q + 1, rr = l + 1; let s = q; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (rr < heap.length && heap[rr][0] < heap[s][0]) s = rr; if (s === q) break; [heap[s], heap[q]] = [heap[q], heap[s]]; q = s; } } return top; };
  if (ax < i0 || ax > i1 || ay < j0 || ay > j1) return null;
  const s = L(ax, ay), t = L(bx, by); g[s] = 0; push(Math.hypot(bx - ax, by - ay), s);
  let found = false;
  while (heap.length) {
    const [, k] = pop(); if (done[k]) continue; done[k] = 1;
    if (k === t) { found = true; break; }
    const i = k % bw + i0, j = Math.floor(k / bw) + j0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj; if (ni < i0 || ni > i1 || nj < j0 || nj > j1 || !ok(ni, nj)) continue;
      if (di && dj && (!ok(i + di, j) || !ok(i, j + dj))) continue;   // לא חותכים פינה של מכשול
      const nk = L(ni, nj), ng = g[k] + (di && dj ? 1.414 : 1);
      if (ng < g[nk]) { g[nk] = ng; from[nk] = k; push(ng + Math.hypot(bx - ni, by - nj), nk); }
    }
  }
  if (!found) return null;
  const cells: number[][] = [];
  for (let k = t; k >= 0; k = from[k]) { cells.push([X0 + (k % bw + i0 + .5) * C, Y0 + (Math.floor(k / bw) + j0 + .5) * C]); if (k === s) break; }
  cells.reverse(); cells[0] = a; cells[cells.length - 1] = b;
  // יישור: מדלגים על נקודות כל עוד הקו הישר פנוי
  const out = [cells[0]];
  let cur = 0;
  while (cur < cells.length - 1) {
    let nxt = cells.length - 1;
    while (nxt > cur + 1 && !clearLine(cells[cur], cells[nxt], r, [a, b])) nxt--;
    out.push(cells[nxt]); cur = nxt;
  }
  return out;
}
