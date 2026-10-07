/* רשת ההליכה: כל הדרכים (בכפר ומחוצה לו) וכל השבילים, מחוברים בצמתים, עם חיפוש מסלול קצר (A*).
   נבנית פעם אחת אחרי בניית העולם. כל קטע מקבל "רוחב" (דרך או שביל), כדי שההולכים יתפזרו לרוחב הדרך
   אבל יישארו במרכז שביל צר. */
import { ctx } from './context';
import { geo, ROAD_W } from './geometry';
import type { Pt } from './places';
import { flagsAt, privateAt, gridPath, SOLID, WATER, PATH } from './walk';

interface Node { x: number; y: number; lane: number; nb: number[]; cost: number[]; line: number }
const nodes: Node[] = [];
const CELL = 40, grid = new Map<string, number[]>();
const cellKey = (x: number, y: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
let built = false;

/** דגימה של עקומת Catmull-Rom (כמו ששבילים מצוירים) */
export function catmull(P: Pt[]): Pt[] {
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
  // קצה שנגמר קרוב לדרך או לשביל אחר (עד 130 יחידות): מתחבר אליו במסלול שמכבד את כללי העולם
  for (const i of ends) {
    let best = -1, bd = 220;
    near(nodes[i].x, nodes[i].y, 220, j => { if (nodes[j].line === nodes[i].line) return; const d = Math.hypot(nodes[j].x - nodes[i].x, nodes[j].y - nodes[i].y); if (d < bd) { bd = d; best = j; } });
    if (best < 0) continue;
    if (bd < 34) { link(i, best); continue; }
    const P = gridPath([nodes[i].x, nodes[i].y], [nodes[best].x, nodes[best].y], { priv: -1 }, 90);
    if (P) chain(i, best, P);
  }
  // מנהרות: אין בנתונים קטע דרך בין שני הפתחים, אז מחברים אותם; בתוך המנהרה ההולכים נעלמים (lane שלילי)
  const portals = ctx.world.objects.filter((o: any) => o.type === 'tunnelPortal');
  for (let a = 0; a < portals.length; a++) for (let b = a + 1; b < portals.length; b++) {
    const A = portals[a], Bp = portals[b];
    if (Math.hypot(A.x - Bp.x, A.y - Bp.y) > 500) continue;
    const na = nearestNode(A.x, A.y), nb = nearestNode(Bp.x, Bp.y), k0 = nodes.length;
    nodes.push({ x: A.x, y: A.y - 4, lane: -1, nb: [], cost: [], line: -1 }, { x: Bp.x, y: Bp.y - 4, lane: -1, nb: [], cost: [], line: -1 });
    link(na, k0); link(k0, k0 + 1); link(k0 + 1, nb);
  }
  nodes.forEach((n, i) => near(n.x, n.y, 9, j => { if (nodes[j].line !== n.line) link(i, j, 1); }));
  repairLinks();
}

/** מכשול קשה לרשת: מבנה, מזרקה, האי שבכיכר, מגרש פרטי, או מים בלי גשר */
const hardAt = (x: number, y: number) => { const f = flagsAt(x, y); return !!(f & SOLID || (f & WATER && !(f & PATH)) || privateAt(x, y)); };
function hardBlocked(a: Node, b: Node) {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3));
  for (let s = 0; s <= n; s++) if (hardAt(a.x + (b.x - a.x) * s / n, a.y + (b.y - a.y) * s / n)) return true;
  return false;
}
function unlink(a: number, b: number) {
  for (const [p, q] of [[a, b], [b, a]]) { const k = nodes[p].nb.indexOf(q); if (k >= 0) { nodes[p].nb.splice(k, 1); nodes[p].cost.splice(k, 1); } }
}
/** מוסיף שרשרת נקודות לאורך מסלול על מפת המעבר בין שני צמתים */
function chain(i: number, j: number, P: number[][]) {
  let prev = i;
  for (const p of P.slice(1, -1)) {
    const k = nodes.length;
    nodes.push({ x: p[0], y: p[1], lane: .2, nb: [], cost: [], line: nodes[i].line });   // בעקיפה הולכים במרכז, לא צמוד למכשול
    const key = cellKey(p[0], p[1]); (grid.get(key) || grid.set(key, []).get(key))!.push(k);
    link(prev, k); prev = k;
  }
  link(prev, j);
}
/** כללי העולם על רשת ההליכה: נקודה שנמצאת בתוך מכשול (למשל באמצע האי שבכיכר) מנותקת;
 *  קטע שחוצה מכשול מוחלף בעקיפה; ונקודות שבשולי אותו מכשול מתחברות זו לזו מסביב לו */
function repairLinks() {
  const n0 = nodes.length, inside = (i: number) => hardAt(nodes[i].x, nodes[i].y), edge = new Set<number>();
  const bad: [number, number][] = [];
  for (let i = 0; i < n0; i++) for (const j of nodes[i].nb) if (j > i && hardBlocked(nodes[i], nodes[j])) bad.push([i, j]);
  for (const [i, j] of bad) {
    unlink(i, j);
    const ii = inside(i), jj = inside(j);
    if (ii || jj) { if (!ii) edge.add(i); if (!jj) edge.add(j); continue; }   // צד אחד בתוך המכשול: רק מסמנים את הצד שבחוץ
    const P = gridPath([nodes[i].x, nodes[i].y], [nodes[j].x, nodes[j].y], { priv: -1 }, 90);
    if (P) chain(i, j, P);
  }
  const E = [...edge], done = new Set<string>();
  for (const ea of E) {
    const u = nodes[ea];
    const near3 = E.filter(e => e !== ea).map(e => [e, Math.hypot(nodes[e].x - u.x, nodes[e].y - u.y)] as [number, number]).filter(x => x[1] < 650).sort((p, q) => p[1] - q[1]).slice(0, 3);
    for (const [eb, d] of near3) {
      const key = ea < eb ? `${ea},${eb}` : `${eb},${ea}`; if (done.has(key)) continue; done.add(key);
      const v = nodes[eb], P = gridPath([u.x, u.y], [v.x, v.y], { priv: -1 }, Math.min(260, 80 + d * .5));
      if (P) { let len = 0; for (let k = 1; k < P.length; k++) len += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); if (len < d * 2.4 + 100) chain(ea, eb, P); }
    }
  }
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
/** הצמתים הקרובים לנקודה, מהקרוב לרחוק */
export function nearNodes(x: number, y: number, r: number, max = 8): number[] {
  buildNav();
  const out: [number, number][] = [];
  near(x, y, r, j => { const d = Math.hypot(nodes[j].x - x, nodes[j].y - y); if (d < r) out.push([d, j]); });
  return out.sort((a, b) => a[0] - b[0]).slice(0, max).map(x => x[1]);
}
/** קצוות של שבילים שלא מתחברים לשום דבר: יעדים טבעיים לטיול ביער */
/** נקודות על שבילים ליד הכפר (פארק, לאורך הנהר), במרווחים: יעדים לטיול רגלי רגוע */
export function trailSpots(x0: number, y0: number, x1: number, y1: number, gapMin: number): number[] {
  buildNav();
  const out: number[] = [];
  nodes.forEach((n, i) => {
    if (n.lane >= 1 || n.lane < 0 || n.x < x0 || n.x > x1 || n.y < y0 || n.y > y1 || hardAt(n.x, n.y)) return;
    if (out.every(j => Math.hypot(nodes[j].x - n.x, nodes[j].y - n.y) > gapMin)) out.push(i);
  });
  return out;
}
export function deadEnds(): number[] { buildNav(); return nodes.map((n, i) => (n.nb.length === 1 && n.lane < 1 && n.lane >= 0 && !hardAt(n.x, n.y) ? i : -1)).filter(i => i >= 0); }

/** מסלול קצר בין שני צמתים (A*). מחזיר רשימת צמתים */
export function routeNodes(a: number, b: number, trailBias = 1): number[] | null {
  buildNav();
  const N = nodes.length, g = new Float64Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const bx = nodes[b].x, by = nodes[b].y, hk = Math.min(1, trailBias), h = (i: number) => Math.hypot(nodes[i].x - bx, nodes[i].y - by) * hk;
  const heap: [number, number][] = [[h(a), a]]; g[a] = 0;
  const push = (f: number, i: number) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop()!; if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  while (heap.length) {
    const [, i] = pop(); if (done[i]) continue; done[i] = 1;
    if (i === b) break;
    const n = nodes[i];
    for (let k = 0; k < n.nb.length; k++) {
      const j = n.nb[k], trail = n.lane < 1 && nodes[j].lane < 1, ng = g[i] + n.cost[k] * (trail ? trailBias : 1);
      if (ng < g[j]) { g[j] = ng; from[j] = i; push(ng + h(j), j); }
    }
  }
  if (from[b] < 0 && a !== b) return null;   // אין דרך ברשת (לא קופצים בקו ישר!)
  const path: number[] = []; for (let i = b; i >= 0; i = from[i]) { path.push(i); if (i === a) break; }
  return path.reverse();
}

/** רוחב הנתיב בצומת: בדרך מתפזרים לרוחב, בשביל הולכים במרכז */
export const laneScale = (i: number) => nodes[i].lane < 0 ? -1 : nodes[i].lane * (ROAD_W / 32);   // -1: בתוך מנהרה

/** לבדיקות: חלקים נפרדים של הרשת (גודל ונקודה לדוגמה מכל חלק) */
export function components() {
  buildNav();
  const comp = new Int32Array(nodes.length).fill(-1), out: { size: number; x: number; y: number; trail: number }[] = [];
  for (let s = 0; s < nodes.length; s++) {
    if (comp[s] >= 0) continue;
    const id = out.length, st = [s]; comp[s] = id; let size = 0, trail = 0;
    while (st.length) { const i = st.pop()!; size++; if (nodes[i].lane < 1) trail++; for (const j of nodes[i].nb) if (comp[j] < 0) { comp[j] = id; st.push(j); } }
    out.push({ size, x: Math.round(nodes[s].x), y: Math.round(nodes[s].y), trail });
  }
  return out.sort((a, b) => b.size - a.size);
}

export function compIdOf(i: number) { compOf(nodes[i].x, nodes[i].y); return compCache![i]; }
/** לבדיקות: לאיזה חלק של הרשת שייכת נקודה (לפי הצומת הקרוב אליה) */
let compCache: Int32Array | null = null;
export function compOf(x: number, y: number) {
  buildNav();
  if (!compCache) {
    compCache = new Int32Array(nodes.length).fill(-1); let id = 0;
    for (let s = 0; s < nodes.length; s++) { if (compCache[s] >= 0) continue; const st = [s]; compCache[s] = id; while (st.length) { const i = st.pop()!; for (const j of nodes[i].nb) if (compCache[j] < 0) { compCache[j] = id; st.push(j); } } id++; }
  }
  const n = nearestNode(x, y);
  return { comp: compCache[n], node: [Math.round(nodes[n].x), Math.round(nodes[n].y)] };
}
