/* גאומטריה של העולם: רשת הדרכים, הנהר, השבילים, ורשת תפוסה מהירה לשתילה */
import { clamp, P } from '../core/util';
import { ctx, NO_TREE, inWater } from './context';
import type { Pt, WorldData } from './types';
import { curveFixed, curvePts, curveWithSegs } from './curve';
import { declOf, doorX } from './decl';
export { doorX } from './decl';

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
  DOOR_TRAILS: new Set<number>(),      // שבילים שנוספו מדלת של מבנה אל הרשת (כלל 23): הקצה שבדלת לא נמוג
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
  // הנהר: דוגמים את העקומה החלקה שמצוירת (ולא קווים ישרים בין הנקודות), כדי שגשרים וחציות ייפלו בדיוק על המים.
  // אותו מספר דגימות כמו קודם, כדי שהגלים (שצורכים מספרים אקראיים לכל דגימה) לא יזיזו את שאר העולם
  // הנהר והפלג: אותה עקומה שמצוירת, 20 דגימות לכל קטע (המספר קבוע: גלי הנהר צורכים מספר אקראי לכל דגימה)
  geo.RIVER_SAMPLES = curveFixed(w.river, 20);
  const C = w.terrain.creek as number[][] | undefined;
  geo.CREEK_SAMPLES = C ? curveFixed(C, 20, true) : [];
  trailRules(w);
  joinTrails(w.trails);
  const trailSamples: number[][] = [];
  for (const t of w.trails) for (let i = 0; i < t.length - 1; i++) {
    const n = Math.ceil(Math.hypot(t[i + 1][0] - t[i][0], t[i + 1][1] - t[i][1]) / 6);
    for (let k = 0; k < n; k++) trailSamples.push([t[i][0] + (t[i + 1][0] - t[i][0]) * k / n, t[i][1] + (t[i + 1][1] - t[i][1]) * k / n]);
  }
  stamp(roadSamples, ROAD_W / 2 + 12, O_ROAD); stamp(trailSamples, 15, O_TRAIL); stamp(geo.RIVER_SAMPLES, 44, O_RIVER); stamp(geo.CREEK_SAMPLES, 20, O_RIVER);
}

/** אפשר לשתול עץ כאן? (לא על דרך/שביל/נהר/מים, וגם הצמרת לא מסתירה מבנה או דרך) */
export function treeOk(x: number, y: number, noBands: number[][]) {
  const { B } = ctx;
  if (x < B.x0 + 12 || x > B.x1 - 12) return false;
  for (const [a, b] of noBands) if (y > a && y < b) return false;   // הרים, חוף
  if (occ(x, y, O_RIVER | O_TRAIL) || inWater(x, y, 30)) return false;
  // הצמרת גבוהה (עד כ-90 מעל הבסיס): לא מסתירה מבנה או דרך שמאחורי העץ
  for (const [x0, y0, x1, y1] of NO_TREE) if (x > x0 - 10 && x < x1 + 10 && y > y0 && y - 60 < y1) return false;
  return !occ(x, y, O_ROAD) && !occ(x, y - 30, O_ROAD) && !occ(x, y - 60, O_ROAD);
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
  const curve = (o: number[][]) => { const c = curveWithSegs(o, 3); return { out: c.out, seg: c.segs }; };
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
    // השביל שומר על הכיוון שלו (בלי "וו" לפני הצומת). רק אם הוא נכנס כמעט במקביל, הזווית נפתחת ל-35° לפחות,
    // דרך נקודת גישה רחוקה מספיק כדי שהפנייה תהיה רכה
    const k = start ? 0 : t.length - 1, q = t[start ? 1 : t.length - 2], c = h.c, tg = h.tg;
    const ql = Math.hypot(q[0] - c[0], q[1] - c[1]) || 1, ux = (q[0] - c[0]) / ql, uy = (q[1] - c[1]) / ql;
    let nx = -tg[1], ny = tg[0]; if (nx * ux + ny * uy < 0) { nx = -nx; ny = -ny; }
    const sn = nx * ux + ny * uy, ct = ux * tg[0] + uy * tg[1], MIN = Math.sin(35 * Math.PI / 180);
    let mx = ux, my = uy;
    t[k] = c;
    if (sn < MIN) {
      const cs = Math.cos(35 * Math.PI / 180) * Math.sign(ct || 1);
      mx = nx * MIN + tg[0] * cs; my = ny * MIN + tg[1] * cs;
      const A = Math.min(48, ql * .45);
      if (ql > A + 20) t.splice(start ? 1 : t.length - 1, 0, [c[0] + mx * A, c[1] + my * A]);
    }
    // שתי פינות מעוגלות: מהשביל המארח (משני צידי הצומת) אל השביל הנכנס. הפינה החדה (הצד שאליו השביל נוטה) מתעגלת פחות
    for (const dir of [1, -1] as const) {
      const cos = (h.tg[0] * mx + h.tg[1] * my) * dir, L = FILLET * (1 - .45 * Math.max(0, cos));
      geo.TRAIL_FILLETS.push([along(h.host, h.hj, c, dir, L), c, [c[0] + mx * L, c[1] + my * L]]);
    }
  };
  const free: { i: number; start: boolean }[] = [], pending: { i: number; start: boolean }[] = [];
  const JUNCTION_GAP = 40, roadJ: { c: number[]; tg: number[]; n: number }[] = [], trailJ: { h: ReturnType<typeof nearTrail>; n: number }[] = [];
  T.forEach((t, i) => {
    for (const start of [true, false]) {
      if (start && geo.DOOR_TRAILS.has(i)) continue;   // הקצה שבדלת: מוסתר מתחת למבנה
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
      if (best < hw + 40) {
        // 3. צמתים לא צפופים: כניסה לדרך ליד כניסה קיימת (פחות מ-40) מצטרפת אליה
        const near = roadJ.find(q => Math.hypot(q.c[0] - c[0], q.c[1] - c[1]) < JUNCTION_GAP && q.n < 2);
        if (near) { near.n++; c = near.c; tg = near.tg; } else roadJ.push({ c, tg, n: 1 });
        roadJoin(t, start, c, tg); continue;
      }
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
    const t = T[i];
    let h = nearTrail(t[start ? 0 : t.length - 1], i, start);
    if (h.d >= 40) { free.push({ i, start }); continue; }
    // 3. צמתים לא צפופים: צומת חדש ליד צומת קיים (פחות מ-40) מצטרף אליו, עד 4 ענפים בצומת
    const near = trailJ.find(q => Math.hypot(q.h.c[0] - h.c[0], q.h.c[1] - h.c[1]) < JUNCTION_GAP && q.n < 2);
    if (near) { near.n++; h = near.h; } else trailJ.push({ h, n: 1 });
    trailJoin(t, start, h);
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

/* ───────── כללי שבילים (בקשת הבעלים), רצים על כל שביל לפני החיבורים, גם על שבילים עתידיים ─────────
   6. כל מבנה מחובר: לדלת שאין לידה דרך או שביל נוסף שביל גינה קצר אל הרשת.
   7. פניות רכות: פינה חדה בנתונים (יותר מ-70°) נחתכת לשתי נקודות, וכך העקומה מתעגלת.
   1. שביל לא נצמד למים: מתרחק מהגדה, וחוצה נהר או פלג כמעט בניצב (הגשר מסתדר לבד לפי החצייה).
   2. אין שני שבילים צמודים: קטע ארוך שבו שני שבילים רצים קרוב זה לזה – אחד מהם מתרחק. */
const RIVER_CLEAR = 52, CREEK_CLEAR = 38, CROSS_MIN = 55;
function nearOn(P: number[][], p: number[]) {
  let d = Infinity, c = P[0], j = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2, 0, 1);
    const m = [a[0] + dx * t, a[1] + dy * t], dd = Math.hypot(m[0] - p[0], m[1] - p[1]);
    if (dd < d) { d = dd; c = m; j = i; }
  }
  const a = P[Math.max(0, j - 1)], b = P[Math.min(P.length - 1, j + 2)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return { d, c, tx: (b[0] - a[0]) / l, ty: (b[1] - a[1]) / l };
}
function crossAt(a: number[], b: number[], P: number[][]) {
  for (let j = 0; j < P.length - 1; j++) {
    const c = P[j], e = P[j + 1], den = (b[0] - a[0]) * (e[1] - c[1]) - (b[1] - a[1]) * (e[0] - c[0]); if (!den) continue;
    const t = ((c[0] - a[0]) * (e[1] - c[1]) - (c[1] - a[1]) * (e[0] - c[0])) / den, u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) { const l = Math.hypot(e[0] - c[0], e[1] - c[1]) || 1; return { x: a[0] + t * (b[0] - a[0]), y: a[1] + t * (b[1] - a[1]), tx: (e[0] - c[0]) / l, ty: (e[1] - c[1]) / l }; }
  }
  return null;
}
function trailRules(w: WorldData) {
  const T = w.trails as number[][][], waters = [{ P: geo.RIVER_SAMPLES, clear: RIVER_CLEAR }, { P: geo.CREEK_SAMPLES, clear: CREEK_CLEAR }].filter(x => x.P.length > 1);
  const roads = [...geo.EDGES, ...geo.OUTER];
  // 6. דלת בלי דרך או שביל לידה
  geo.DOOR_TRAILS = new Set();
  const plots = w.objects.filter(o => o.type === 'plot');
  for (const o of w.objects) {
    if (!declOf(o.type).doorPath || o.x === undefined || o.noPath) continue;
    if (plots.some(q => o.x >= q.x0 - 4 && o.x <= q.x1 + 4 && o.y >= q.y0 - 4 && o.y <= q.y1 + 4)) continue;   // מגרש: יש לו שביל מרוצף משלו
    const dx = doorX(o), door = [dx, o.y - 3], step = [dx, o.y + 22];
    let best = { d: Infinity, c: [] as number[], tx: 1, ty: 0, hw: 0 };
    for (const E of roads) { const r = nearOn(E.pts, step); if (r.d - ROAD_W / 2 < best.d) best = { d: r.d - ROAD_W / 2, c: r.c, tx: r.tx, ty: r.ty, hw: ROAD_W / 2 }; }
    for (const t of T) { const r = nearOn(curvePts(t), step); if (r.d - 6 < best.d) best = { d: r.d - 6, c: r.c, tx: r.tx, ty: r.ty, hw: 6 }; }
    if (best.d < 14 || best.d > 320) continue;   // כבר ליד הרשת, או רחוק מדי לשביל גינה
    if (waters.some(W => crossAt(step, best.c, W.P))) continue;   // לא בונים גשר בשביל שביל גינה
    /* שביל גינה: עקומה אחת חלקה. יוצא מהדלת ישר קדימה (דרומה), ומגיע לשביל או לדרך בזווית נעימה (בערך 60°),
       מהצד שבו נמצא הבית. נקודות צפופות על העקומה, כך שהציור (Catmull-Rom) עובר בדיוק עליה */
    const c = best.c, L = Math.hypot(c[0] - door[0], c[1] - door[1]);
    let nx = -best.ty, ny = best.tx; if (nx * (door[0] - c[0]) + ny * (door[1] - c[1]) < 0) { nx = -nx; ny = -ny; }
    const along = Math.sign(best.tx * (door[0] - c[0]) + best.ty * (door[1] - c[1])) || 1;
    let mx = nx * .87 + best.tx * along * .5, my = ny * .87 + best.ty * along * .5; const ml = Math.hypot(mx, my); mx /= ml; my /= ml;
    const P1 = [door[0], door[1] + L * .45], P2 = [c[0] + mx * L * .4, c[1] + my * L * .4], pts: number[][] = [];
    const n = Math.max(3, Math.ceil(L / 18));
    for (let k = 0; k <= n; k++) {
      const s = k / n, u = 1 - s;
      pts.push([u * u * u * door[0] + 3 * u * u * s * P1[0] + 3 * u * s * s * P2[0] + s * s * s * c[0], u * u * u * door[1] + 3 * u * u * s * P1[1] + 3 * u * s * s * P2[1] + s * s * s * c[1]]);
    }
    T.push(pts);
    geo.DOOR_TRAILS.add(T.length - 1);
  }
  // 1ב. אגמים ובריכות (water בהצהרה): נקודה שבתוך האגם או קרובה לשפה זזה החוצה, לאורך הקו מהמרכז, עד 16 מעבר לשפה.
  //     קטע שאמצעו נכנס לאגם מקבל נקודת ביניים בחוץ. שביל לא חוצה אגם (אין גשרים על אגמים)
  const LAKE_CLEAR = 16;
  const lakes = (w.objects as any[]).map(o => declOf(o.type).water?.(o)).filter(Boolean) as number[][];
  const outOf = (p: number[], e: number[]) => {
    const dx = p[0] - e[0], dy = p[1] - e[1], a = Math.atan2(dy * e[2], dx * e[3]);   // הזווית על האליפסה
    const bx = e[0] + Math.cos(a) * e[2], by = e[1] + Math.sin(a) * e[3];
    const nx = Math.cos(a) / e[2], ny = Math.sin(a) / e[3], nl = Math.hypot(nx, ny);   // הניצב לשפה
    return { inside: (dx / (e[2] + LAKE_CLEAR)) ** 2 + (dy / (e[3] + LAKE_CLEAR)) ** 2 < 1, p: [bx + nx / nl * LAKE_CLEAR, by + ny / nl * LAKE_CLEAR] };
  };
  for (const t of T.filter((_, i) => !geo.DOOR_TRAILS.has(i))) for (let it = 0; it < 3; it++) {
    for (const e of lakes) for (let k = 0; k < t.length; k++) { const r = outOf(t[k], e); if (r.inside) t[k] = r.p; }
    // העקומה המצוירת עצמה (לא רק הנקודות): בכל קטע שנכנס לאגם, הנקודה העמוקה ביותר יוצאת החוצה ונוספת לשביל
    for (const e of lakes) {
      const { out, segs } = curveWithSegs(t, 4), deep = new Map<number, number[]>();
      out.forEach((q, k) => {
        const d = ((q[0] - e[0]) / (e[2] + LAKE_CLEAR)) ** 2 + ((q[1] - e[1]) / (e[3] + LAKE_CLEAR)) ** 2;
        if (d < 1 && (!deep.has(segs[k]) || d < deep.get(segs[k])![0])) deep.set(segs[k], [d, k]);
      });
      [...deep.keys()].sort((a, b) => b - a).forEach(j => t.splice(j + 1, 0, outOf(out[deep.get(j)![1]], e).p));
    }
  }
  // 1. מים: חצייה כמעט בניצב, ואחר כך התרחקות מהגדה
  for (const W of waters) for (const t of T.filter((_, i) => !geo.DOOR_TRAILS.has(i))) {
    for (let k = 0; k < t.length - 1; k++) {
      const X = crossAt(t[k], t[k + 1], W.P); if (!X) continue;
      const ux = t[k + 1][0] - t[k][0], uy = t[k + 1][1] - t[k][1], ul = Math.hypot(ux, uy) || 1;
      const sin = Math.abs((ux * X.ty - uy * X.tx) / ul);
      if (sin > Math.sin(CROSS_MIN * Math.PI / 180)) continue;
      // שתי נקודות משני צידי המים, על הניצב לזרם: השביל חוצה ישר
      let nx = -X.ty, ny = X.tx; if (nx * ux + ny * uy < 0) { nx = -nx; ny = -ny; }
      const D = W.clear + 4;
      t.splice(k + 1, 0, [X.x - nx * D, X.y - ny * D], [X.x + nx * D, X.y + ny * D]); k += 2;
    }
    for (let it = 0; it < 3; it++) for (let k = 0; k < t.length; k++) {
      const p = t[k], r = nearOn(W.P, p);
      if (r.d >= W.clear || r.d < 1) continue;
      // נקודה שקטע שלה חוצה את המים נשארת בצד שלה, רק רחוקה מספיק
      let nx = -r.ty, ny = r.tx; if (nx * (p[0] - r.c[0]) + ny * (p[1] - r.c[1]) < 0) { nx = -nx; ny = -ny; }
      t[k] = [r.c[0] + nx * W.clear, r.c[1] + ny * W.clear];
    }
    // העקומה בין הנקודות (לא רק הנקודות עצמן): קטע שלא חוצה ונכנס לאזור הגדה מקבל נקודת ביניים רחוקה
    for (let k = 0; k < t.length - 1; k++) {
      if (crossAt(t[k], t[k + 1], W.P)) continue;
      const m = [(t[k][0] + t[k + 1][0]) / 2, (t[k][1] + t[k + 1][1]) / 2], r = nearOn(W.P, m);
      if (r.d >= W.clear - 6 || Math.hypot(t[k + 1][0] - t[k][0], t[k + 1][1] - t[k][1]) < 40) continue;
      let nx = -r.ty, ny = r.tx; if (nx * (m[0] - r.c[0]) + ny * (m[1] - r.c[1]) < 0) { nx = -nx; ny = -ny; }
      t.splice(k + 1, 0, [r.c[0] + nx * W.clear, r.c[1] + ny * W.clear]); k++;
    }
  }
  // 2. שבילים צמודים (לא ליד הקצוות, שם הם בדרך כלל מתחברים)
  const SIDE = 30, FAR = 44;
  for (let i = 0; i < T.length; i++) for (let j = 0; j < T.length; j++) {
    if (i === j || geo.DOOR_TRAILS.has(i)) continue;
    const Pi = curvePts(T[i]), Pj = curvePts(T[j]), ends = [T[i][0], T[i][T[i].length - 1], T[j][0], T[j][T[j].length - 1]];
    const nearEnd = (p: number[]) => ends.some(e => Math.hypot(e[0] - p[0], e[1] - p[1]) < 90);
    let run = 0;
    for (let k = 1; k < Pi.length; k++) {
      const p = Pi[k], r = nearOn(Pj, p);
      run = r.d < SIDE && !nearEnd(p) ? run + Math.hypot(p[0] - Pi[k - 1][0], p[1] - Pi[k - 1][1]) : 0;
      if (run < 60) continue;
      // דוחפים הצידה את נקודות הנתונים של שביל i שבאזור הזה, עד מרחק FAR מהשביל השני
      for (let q = 1; q < T[i].length - 1; q++) {
        const v = T[i][q], rv = nearOn(Pj, v);
        if (rv.d >= FAR || Math.hypot(v[0] - p[0], v[1] - p[1]) > 120) continue;
        let nx = -rv.ty, ny = rv.tx; if (nx * (v[0] - rv.c[0]) + ny * (v[1] - rv.c[1]) < 0) { nx = -nx; ny = -ny; }
        T[i][q] = [rv.c[0] + nx * FAR, rv.c[1] + ny * FAR];
      }
      break;
    }
  }
  // 7. פינות חדות (אחרון: גם הפינות שנוצרו מהכללים הקודמים, למשל חצייה ישרה של מים)
  for (const t of T.filter((_, i) => !geo.DOOR_TRAILS.has(i))) for (let k = t.length - 2; k >= 1; k--) {
    const a = t[k - 1], v = t[k], b = t[k + 1], la = Math.hypot(a[0] - v[0], a[1] - v[1]), lb = Math.hypot(b[0] - v[0], b[1] - v[1]);
    const turn = Math.abs(Math.atan2((v[0] - a[0]) * (b[1] - v[1]) - (v[1] - a[1]) * (b[0] - v[0]), (v[0] - a[0]) * (b[0] - v[0]) + (v[1] - a[1]) * (b[1] - v[1])));
    if (turn < 70 * Math.PI / 180 || !la || !lb) continue;
    const r = Math.min(40, la * .4, lb * .4);
    t.splice(k, 1, [v[0] + (a[0] - v[0]) * r / la, v[1] + (a[1] - v[1]) * r / la], [v[0] + (b[0] - v[0]) * r / lb, v[1] + (b[1] - v[1]) * r / lb]);
  }
}
