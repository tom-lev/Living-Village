/* רשת ההליכה: כל הדרכים (בכפר ומחוצה לו) וכל השבילים, מחוברים בצמתים, עם חיפוש מסלול קצר (A*).
   נבנית פעם אחת אחרי בניית העולם. כל קטע מקבל "רוחב" (דרך או שביל), כדי שההולכים יתפזרו לרוחב הדרך
   אבל יישארו במרכז שביל צר. */
import { ctx } from './context';
import { geo, ROAD_W } from './geometry';
import type { Pt } from './places';

interface Node { x: number; y: number; lane: number; nb: number[]; cost: number[]; line: number }
const nodes: Node[] = [];
const CELL = 40, grid = new Map<string, number[]>();
const cellKey = (x: number, y: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
let built = false;

/** דגימה של עקומת Catmull-Rom (כמו ששבילים מצוירים) */
function catmull(P: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let t = 0; t < 1; t += .1) {
      const u = 1 - t;
      out.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
/** דגימה מחדש במרווחים שווים */
function resample(P: Pt[], step: number): Pt[] {
  const out: Pt[] = [P[0]]; let carry = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1], d = Math.hypot(bx - ax, by - ay);
    let s = step - carry;
    while (s < d) { out.push([ax + (bx - ax) * s / d, ay + (by - ay) * s / d]); s += step; }
    carry = d - (s - step);
  }
  const last = P[P.length - 1], e = out[out.length - 1];
  if (Math.hypot(last[0] - e[0], last[1] - e[1]) > step * .3) out.push(last);
  return out;
}
function link(a: number, b: number, extra = 0) {
  if (a === b || nodes[a].nb.includes(b)) return;
  const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y) + extra;
  nodes[a].nb.push(b); nodes[a].cost.push(d); nodes[b].nb.push(a); nodes[b].cost.push(d);
}
function near(x: number, y: number, r: number, f: (i: number) => void) {
  const c0 = Math.floor((x - r) / CELL), c1 = Math.floor((x + r) / CELL), d0 = Math.floor((y - r) / CELL), d1 = Math.floor((y + r) / CELL);
  for (let cy = d0; cy <= d1; cy++) for (let cx = c0; cx <= c1; cx++) for (const i of grid.get(cx + ',' + cy) || []) f(i);
}

export function buildNav() {
  if (built) return; built = true;
  const lines: { pts: Pt[]; lane: number }[] = [];
  for (const E of [...geo.EDGES, ...geo.OUTER]) lines.push({ pts: E.pts, lane: 1 });
  for (const t of ctx.world.trails) lines.push({ pts: catmull(t), lane: .25 });
  const ends: number[] = [];
  lines.forEach((L, li) => {
    const P = resample(L.pts, 14);
    let prev = -1;
    P.forEach((p, k) => {
      const i = nodes.length;
      nodes.push({ x: p[0], y: p[1], lane: L.lane, nb: [], cost: [], line: li });
      const key = cellKey(p[0], p[1]); (grid.get(key) || grid.set(key, []).get(key))!.push(i);
      if (prev >= 0) link(prev, i);
      if (k === 0 || k === P.length - 1) ends.push(i);
      prev = i;
    });
  });
  // צמתים: קצה של קו מתחבר לנקודה הקרובה על קו אחר; וקווים שחוצים זה את זה מתחברים בנקודת המפגש
  for (const i of ends) {
    let best = -1, bd = 34;
    near(nodes[i].x, nodes[i].y, 34, j => { if (nodes[j].line === nodes[i].line) return; const d = Math.hypot(nodes[j].x - nodes[i].x, nodes[j].y - nodes[i].y); if (d < bd) { bd = d; best = j; } });
    if (best >= 0) link(i, best);
  }
  nodes.forEach((n, i) => near(n.x, n.y, 9, j => { if (nodes[j].line !== n.line) link(i, j, 1); }));
}

/** הצומת הקרוב לנקודה */
export function nearestNode(x: number, y: number): number {
  buildNav();
  for (let r = 40; r < 4000; r *= 2) {
    let best = -1, bd = r;
    near(x, y, r, j => { const d = Math.hypot(nodes[j].x - x, nodes[j].y - y); if (d < bd) { bd = d; best = j; } });
    if (best >= 0) return best;
  }
  return 0;
}
/** הצומת הקרוב לדלת מלפנים: המבנים פונים דרומה (הדלת למטה), אז לא ניגשים אליה דרך הבניין מהרחוב שמאחוריו */
export function frontNode(x: number, y: number): number {
  buildNav();
  let best = -1, bd = 220;
  near(x, y, 220, j => { const n = nodes[j]; if (n.y < y - 2) return; const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = j; } });
  return best >= 0 ? best : nearestNode(x, y);
}
export const nodeAt = (i: number) => nodes[i];
/** קצוות של שבילים שלא מתחברים לשום דבר: יעדים טבעיים לטיול ביער */
export function deadEnds(): number[] { buildNav(); return nodes.map((n, i) => (n.nb.length === 1 && n.lane < 1 ? i : -1)).filter(i => i >= 0); }

/** מסלול קצר בין שני צמתים (A*). מחזיר רשימת צמתים */
export function routeNodes(a: number, b: number): number[] {
  buildNav();
  const N = nodes.length, g = new Float64Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const bx = nodes[b].x, by = nodes[b].y, h = (i: number) => Math.hypot(nodes[i].x - bx, nodes[i].y - by);
  const heap: [number, number][] = [[h(a), a]]; g[a] = 0;
  const push = (f: number, i: number) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  while (heap.length) {
    const [, i] = pop(); if (done[i]) continue; done[i] = 1;
    if (i === b) break;
    const n = nodes[i];
    for (let k = 0; k < n.nb.length; k++) { const j = n.nb[k], ng = g[i] + n.cost[k]; if (ng < g[j]) { g[j] = ng; from[j] = i; push(ng + h(j), j); } }
  }
  if (from[b] < 0 && a !== b) return [a];
  const path: number[] = []; for (let i = b; i >= 0; i = from[i]) { path.push(i); if (i === a) break; }
  return path.reverse();
}

/** רוחב הנתיב בצומת: בדרך מתפזרים לרוחב, בשביל הולכים במרכז */
export const laneScale = (i: number) => nodes[i].lane * (ROAD_W / 32);
