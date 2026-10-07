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
  TRAIL_FLARES: [] as { x: number; y: number; mx: number; my: number; tx: number; ty: number }[],   // שביל שנכנס לדרך: התרחבות רכה בשולי הדרך
  TRAIL_FREE: [] as { trail: number; start: boolean }[],
  TRAIL_FILLETS: [] as number[][][],   // שביל שפוגש שביל: פינה מעוגלת בכל צד (עקומה ריבועית: נקודה על השביל המארח, הצומת, נקודה על השביל הנכנס)
  ROAD_TAPERS: [] as { x: number; y: number; dx: number; dy: number }[],   // דרך ללא מוצא שממשיכה כשביל: הדרך הולכת ונהיית צרה
   // קצה שביל שלא מוביל לשום מקום: נמוג בהדרגה
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
  joinTrails(w.trails);
  const trailSamples: number[][] = [];
  for (const t of w.trails) for (let i = 0; i < t.length - 1; i++) {
    const n = Math.ceil(Math.hypot(t[i + 1][0] - t[i][0], t[i + 1][1] - t[i][1]) / 6);
    for (let k = 0; k < n; k++) trailSamples.push([t[i][0] + (t[i + 1][0] - t[i][0]) * k / n, t[i][1] + (t[i + 1][1] - t[i][1]) * k / n]);
  }
  // הנהר: דוגמים את העקומה החלקה שמצוירת (ולא קווים ישרים בין הנקודות), כדי שגשרים וחציות ייפלו בדיוק על המים.
  // אותו מספר דגימות כמו קודם, כדי שהגלים (שצורכים מספרים אקראיים לכל דגימה) לא יזיזו את שאר העולם
  const R = w.river; geo.RIVER_SAMPLES = [];
  for (let i = 0; i < R.length - 1; i++) {
    const p0 = R[Math.max(0, i - 1)], p1 = R[i], p2 = R[i + 1], p3 = R[Math.min(R.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let t = 0; t < 1; t += .05) {
      const u = 1 - t;
      geo.RIVER_SAMPLES.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0], u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
    }
  }
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

/* ───────── חיבורי שבילים: כלל כללי לכל שביל, גם לשבילים עתידיים ─────────
   קצה שביל ליד דרך: נצמד לקו האמצע של הדרך (נעלם מתחתיה), נכנס בזווית טבעית ומתרחב מעט בשוליים.
   קצה ליד שביל אחר: נצמד אליו. קצה ליד קצה פנוי של שביל אחר: ממשיך אליו. אחרת: נמוג בהדרגה בדשא. */
function joinTrails(T: number[][][]) {
  const hw = ROAD_W / 2, roads = [...geo.EDGES, ...geo.OUTER];
  geo.TRAIL_FLARES = []; geo.TRAIL_FREE = []; geo.ROAD_TAPERS = []; geo.TRAIL_FILLETS = [];
  const nearSeg = (p: number[], a: number[], b: number[]) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1);
    return [a[0] + dx * t, a[1] + dy * t];
  };
  // הנקודה הקרובה ביותר על קו האמצע של דרך כלשהי, והכיוון של הדרך שם
  // קצה של דרך שלא ממשיכה משם לשום דרך אחרת (דרך ללא מוצא)
  const ends = roads.flatMap(E => [E.pts[0], E.pts[E.pts.length - 1]]);
  const deadEnd = (q: number[]) => ends.filter(e => Math.hypot(e[0] - q[0], e[1] - q[1]) < 4).length === 1;
  const nearRoad = (p: number[]) => {
    let d = Infinity, c: number[] = [], tg: number[] = [], end: number[] | null = null;
    for (const E of roads) for (let j = 0; j < E.pts.length - 1; j += 2) {
      const a = E.pts[j], b = E.pts[Math.min(j + 2, E.pts.length - 1)], m = nearSeg(p, a, b), dd = Math.hypot(m[0] - p[0], m[1] - p[1]);
      if (dd < d) {
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; d = dd; c = m; tg = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
        // הנקודה הקרובה היא קצה הדרך עצמו: הכיוון החוצה מהקצה
        const last = Math.min(j + 2, E.pts.length - 1) === E.pts.length - 1;
        end = j === 0 && Math.hypot(m[0] - a[0], m[1] - a[1]) < 1 && deadEnd(a) ? [a[0], a[1], -tg[0], -tg[1]]
          : last && Math.hypot(m[0] - b[0], m[1] - b[1]) < 1 && deadEnd(b) ? [b[0], b[1], tg[0], tg[1]] : null;
      }
    }
    return { d, c, tg, end };
  };
  // הקצה נכנס לדרך (או לשביל אחר): נצמד לקו האמצע, בזווית נעימה, עם התרחבות בשוליים.
  // hw = חצי הרוחב של מה שנכנסים אליו, gap = כמה רחוק מהשוליים נמצאת נקודת הגישה
  const roadJoin = (t: number[][], start: boolean, c: number[], tg: number[], hw = ROAD_W / 2, gap = 14, flare = true) => {
    const k = start ? 0 : t.length - 1, q = t[start ? 1 : t.length - 2];
    let nx = -tg[1], ny = tg[0];
    if (nx * (q[0] - c[0]) + ny * (q[1] - c[1]) < 0) { nx = -nx; ny = -ny; }
    // כיוון הכניסה: חצי הדרך מהזווית המקורית אל הניצב, כך שהשביל פוגש את הדרך בזווית נעימה
    const ux = q[0] - c[0], uy = q[1] - c[1], ul = Math.hypot(ux, uy) || 1, un = Math.max(.5, (ux * nx + uy * ny) / ul), ut = (ux * tg[0] + uy * tg[1]) / ul * .5;
    let mx = nx * un + tg[0] * ut, my = ny * un + tg[1] * ut; const ml = Math.hypot(mx, my); mx /= ml; my /= ml;
    const r = (hw + gap) / (mx * nx + my * ny), a = [c[0] + mx * r, c[1] + my * r];
    t[k] = c;
    if (ul > r + 16) t.splice(start ? 1 : t.length - 1, 0, a);
    const e = hw / (mx * nx + my * ny);
    if (flare) geo.TRAIL_FLARES.push({ x: c[0] + mx * e, y: c[1] + my * e, mx, my, tx: tg[0], ty: tg[1] });
    return [mx, my];
  };
  /* ───── כלל: שביל שפוגש שביל משתלב בו בצורה חלקה (בקשת הבעלים) ─────
     הקצה נצמד לקו האמצע של העקומה שמצוירת בפועל (Catmull-Rom), ולא לקווים הישרים בין נקודות הנתונים –
     אחרת הקצה נוחת לידה, בולט ממנה עם כיפה עגולה, ונראה כמו איקס. הוא נכנס בזווית נעימה (כמו לדרך),
     והפינות בין השבילים מתעגלות בהתרחבות רכה */
  const TRAIL_HW = 6;
  const curve = (o: number[][]) => {
    const out: number[][] = [], seg: number[] = [];
    for (let j = 0; j < o.length - 1; j++) {
      const p0 = o[Math.max(0, j - 1)], p1 = o[j], p2 = o[j + 1], p3 = o[Math.min(o.length - 1, j + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 3));
      for (let k = 0; k < n; k++) {
        const s = k / n, u = 1 - s;
        out.push([u * u * u * p1[0] + 3 * u * u * s * c1[0] + 3 * u * s * s * c2[0] + s * s * s * p2[0], u * u * u * p1[1] + 3 * u * u * s * c1[1] + 3 * u * s * s * c2[1] + s * s * s * p2[1]]);
        seg.push(j);
      }
    }
    out.push(o[o.length - 1]); seg.push(o.length - 2);
    return { out, seg };
  };
  // הנקודה הקרובה על העקומה המצוירת של שביל אחר (או של אותו שביל, רחוק מהקצה הזה), והכיוון שם
  const nearTrail = (p: number[], i: number, start: boolean) => {
    let d = Infinity, c: number[] = [], tg: number[] = [1, 0], host: number[][] = [], hj = 0;
    T.forEach((o, oi) => {
      if (o.length < 2) return;
      const { out, seg } = curve(o);
      for (let j = 0; j < out.length - 1; j++) {
        if (oi === i && (start ? seg[j] < 2 : seg[j] > o.length - 4)) continue;
        const a = out[j], b = out[j + 1], m = nearSeg(p, a, b), dd = Math.hypot(m[0] - p[0], m[1] - p[1]);
        if (dd >= d) continue;
        const a2 = out[Math.max(0, j - 2)], b2 = out[Math.min(out.length - 1, j + 3)], l = Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) || 1;
        d = dd; c = m; tg = [(b2[0] - a2[0]) / l, (b2[1] - a2[1]) / l]; host = out; hj = j;
      }
    });
    return { d, c, tg, host, hj };
  };
  // נקודה על העקומה המארחת במרחק L מהצומת, לכל כיוון (נעצרת בקצה השביל)
  const along = (P: number[][], j: number, c: number[], dir: 1 | -1, L: number) => {
    let acc = 0, prev = c, k = dir > 0 ? j + 1 : j;
    for (; k >= 0 && k < P.length; k += dir) {
      const l = Math.hypot(P[k][0] - prev[0], P[k][1] - prev[1]);
      if (acc + l >= L) { const f = (L - acc) / (l || 1); return [prev[0] + (P[k][0] - prev[0]) * f, prev[1] + (P[k][1] - prev[1]) * f]; }
      acc += l; prev = P[k];
    }
    return prev;
  };
  const FILLET = 15;
  const trailJoin = (t: number[][], start: boolean, h: { c: number[]; tg: number[]; host: number[][]; hj: number }) => {
    const [mx, my] = roadJoin(t, start, h.c, h.tg, TRAIL_HW, 26, false), c = h.c;
    // שתי פינות מעוגלות: מהשביל המארח (משני צידי הצומת) אל השביל הנכנס. הפינה החדה (הצד שאליו השביל נוטה) מתעגלת פחות
    for (const dir of [1, -1] as const) {
      const cos = (h.tg[0] * mx + h.tg[1] * my) * dir, L = FILLET * (1 - .45 * Math.max(0, cos));
      geo.TRAIL_FILLETS.push([along(h.host, h.hj, c, dir, L), c, [c[0] + mx * L, c[1] + my * L]]);
    }
  };
  const free: { i: number; start: boolean }[] = [], pending: { i: number; start: boolean }[] = [];
  T.forEach((t, i) => {
    for (const start of [true, false]) {
      const k = start ? 0 : t.length - 1, p = t[k];
      let { d: best, c, tg, end } = nearRoad(p);
      if (best < hw + 40 && end) {
        // שביל שמגיע לקצה של דרך ללא מוצא: ממשיך את הדרך באותו כיוון, בלי התרחבות (הדרך פשוט נהיית שביל)
        t[k] = [end[0] - end[2] * hw, end[1] - end[3] * hw];
        if (!geo.ROAD_TAPERS.some(r => Math.hypot(r.x - end[0], r.y - end[1]) < 4)) geo.ROAD_TAPERS.push({ x: end[0], y: end[1], dx: end[2], dy: end[3] });
        const q = t[start ? 1 : t.length - 2], a = [end[0] + end[2] * (hw + 20), end[1] + end[3] * (hw + 20)];
        if (Math.hypot(q[0] - end[0], q[1] - end[1]) > hw + 30) t.splice(start ? 1 : t.length - 1, 0, a);
        continue;
      }
      if (best < hw + 40) { roadJoin(t, start, c, tg); continue; }
      pending.push({ i, start });
    }
  });
  // שביל אחר קרוב (או אותו שביל, רחוק מהקצה הזה): אחרי שכל הקצוות שליד דרכים כבר סודרו
  // קצה שיושב בדיוק על קצה של שביל אחר: זה המשך של אותו שביל, לא צומת – משאירים כמו שהוא
  const tip = (i: number, start: boolean) => T[i][start ? 0 : T[i].length - 1];
  const cont = (i: number, start: boolean) => pending.some(o => o.i !== i && Math.hypot(tip(o.i, o.start)[0] - tip(i, start)[0], tip(o.i, o.start)[1] - tip(i, start)[1]) < 12);
  const conts = pending.filter(e => cont(e.i, e.start));
  for (const { i, start } of pending) {
    if (conts.some(e => e.i === i && e.start === start)) continue;
    const t = T[i], h = nearTrail(t[start ? 0 : t.length - 1], i, start);
    if (h.d < 40) trailJoin(t, start, h); else free.push({ i, start });
  }
  // שני קצוות פנויים קרובים (למשל שביל שמגיע אל שביל המגדלור): ממשיכים אחד אל השני
  const used = new Set<number>();
  free.forEach((f, a) => {
    if (used.has(a)) return;
    const t = T[f.i], p = t[f.start ? 0 : t.length - 1];
    let bi = -1, bd = 170;
    free.forEach((g, b) => {
      if (b === a || used.has(b) || g.i === f.i) return;
      const o = T[g.i], q = o[g.start ? 0 : o.length - 1], d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < bd) { bd = d; bi = b; }
    });
    if (bi < 0) return;
    const g = free[bi], o = T[g.i], q = o[g.start ? 0 : o.length - 1];
    if (f.start) t.unshift([q[0], q[1]]); else t.push([q[0], q[1]]);
    used.add(a); used.add(bi);
  });
  // שביל יכול להיגמר בשום מקום, אבל לא להתחיל משום מקום: שביל שלא נוגע בשום דרך או שביל אחר
  // ממשיך מהקצה הקרוב ביותר לרשת עד הדרך או השביל הקרובים
  const dense = (t: number[][]) => { const o: number[][] = []; for (let j = 0; j < t.length - 1; j++) { const n = Math.ceil(Math.hypot(t[j + 1][0] - t[j][0], t[j + 1][1] - t[j][1]) / 8); for (let k = 0; k < n; k++) o.push([t[j][0] + (t[j + 1][0] - t[j][0]) * k / n, t[j][1] + (t[j + 1][1] - t[j][1]) * k / n]); } o.push(t[t.length - 1]); return o;
  };
  const D = T.map(dense);
  // רשת חיפוש מהירה (תא 20): אילו שבילים (מספר) או דרכים (-1) עוברים בכל תא
  const H = new Map<number, Set<number>>(), key = (x: number, y: number) => Math.floor(x / 20) * 100003 + Math.floor(y / 20);
  const put = (x: number, y: number, id: number) => { const k = key(x, y); (H.get(k) || H.set(k, new Set()).get(k)!).add(id); };
  D.forEach((o, i) => o.forEach(q => put(q[0], q[1], i)));
  for (const E of roads) for (const q of E.pts) for (const [dx, dy] of [[0, 0], [hw, 0], [-hw, 0], [0, hw], [0, -hw]]) put(q[0] + dx, q[1] + dy, -1);
  const touches = (i: number) => D[i].some(p => {
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const S = H.get(key(p[0] + a * 20, p[1] + b * 20)); if (S) for (const id of S) if (id !== i) return true; }
    return false;
  });
  // קצה שנמצא ליד מקום עם שם (אגם, חווה, מגדלור...) כבר מתחיל ממשהו
  const named = (ctx.world.objects as any[]).filter(o => o.name);
  const atPlace = (p: number[]) => named.some(o =>
    o.cx !== undefined ? ((p[0] - o.cx) / ((o.rx ?? o.r ?? 0) + 60)) ** 2 + ((p[1] - o.cy) / ((o.ry ?? o.r ?? 0) + 60)) ** 2 <= 1
    : o.x0 !== undefined ? p[0] > Math.min(o.x0, o.x1) - 60 && p[0] < Math.max(o.x0, o.x1) + 60 && p[1] > Math.min(o.y0, o.y1) - 60 && p[1] < Math.max(o.y0, o.y1) + 60
    : o.x !== undefined && Math.hypot(p[0] - o.x - (o.w ?? 0) / 2, p[1] - o.y) < 100);
  const lone = new Set<number>();
  T.forEach((t, i) => {
    if (touches(i)) return;
    // הקצה הקרוב לרשת (דרך או שביל אחר)
    let best = { d: Infinity, start: true, c: [] as number[], tg: null as number[] | null, trail: null as ReturnType<typeof nearTrail> | null };
    for (const start of [true, false]) {
      const p = t[start ? 0 : t.length - 1], r = nearRoad(p);
      if (r.d - hw < best.d) best = { d: r.d - hw, start, c: r.c, tg: r.tg, trail: null };
      const h = nearTrail(p, i, start);
      if (h.d < best.d) best = { d: h.d, start, c: h.c, tg: h.tg, trail: h };
    }
    // הקצה הזה יושב ליד מקום עם שם (אגם, חווה...): השביל מתחיל שם, ולא ממשיכים אותו דרך המקום
    if (best.d > 400 || (best.d > 80 && atPlace(t[best.start ? 0 : t.length - 1]))) return;
    if (best.start) t.unshift([best.c[0], best.c[1]]); else t.push([best.c[0], best.c[1]]);
    if (best.trail) trailJoin(t, best.start, best.trail);
    else if (best.tg) roadJoin(t, best.start, best.c, best.tg);
    lone.add(i * 2 + (best.start ? 0 : 1));
  });
  free.forEach((f, a) => { if (!used.has(a) && !lone.has(f.i * 2 + (f.start ? 0 : 1))) geo.TRAIL_FREE.push({ trail: f.i, start: f.start }); });
}
