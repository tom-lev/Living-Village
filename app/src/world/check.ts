/* ───────── בדיקת העולם (כלל תשתית 1) ─────────
   אחרי שהעולם נבנה, עוברים על כל החוקים ורושמים כל מקום שבו משהו לא בסדר. הבדיקה רק מדווחת, לא מתקנת:
   התיקון שייך לחוק עצמו, כדי שבדיקה לא תשנה את העולם בשקט.
   רצה רק עם ?debug (תג בפינה, ולחיצה על שורה מטיסה את המצלמה למקום) או מהכלי tools/check.mjs לפני דחיפה.
   חריג מכוון: allow: ['rule'] על האובייקט בנתונים.
   הכללים: water, trail-end, prop, bench, plot-path, overlap, labels, reach, undeclared, order, scale. */
import { ctx } from './context';
import { geo, ROAD_W } from './geometry';
import { curvePts, curveWithSegs } from './curve';
import { flagsAt, placeOk, WATER, PATH, LANE } from './walk';
import { DECL, declOf } from './decl';
import { PREFABS } from '../prefabs/registry';
import { labelOverlaps } from './labels';
import { places } from './places';
import { reachable } from '../actors/agenda';
import { plotOfDoor } from '../prefabs/village';
import { issues, type Issue } from './issues';
import { REAL_H, M, TOL, MAP_MIN, HOUSE_H, TREE_MIN } from './scale';

const near = (P: number[][], p: number[]) => {
  let d = Infinity;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
    d = Math.min(d, Math.hypot(a[0] + dx * t - p[0], a[1] + dy * t - p[1]));
  }
  return d;
};

export function runChecks(): Issue[] {
  const out: Issue[] = [...issues], w = ctx.world, objs = w.objects as any[];
  const add = (rule: string, msg: string, x: number, y: number, o?: any) => { if (!o?.allow?.includes(rule)) out.push({ rule, msg, x: Math.round(x), y: Math.round(y) }); };
  const roads = [...geo.EDGES, ...geo.OUTER].map(E => E.pts), trails = w.trails.map(t => curvePts(t, 4));

  // water: דרך או שביל על מים בלי גשר (קטע רציף אחד = הפרה אחת)
  const wet = (P: number[][], what: string) => {
    let inRun = false;
    for (const p of P) {
      const f = flagsAt(p[0], p[1]), bad = !!(f & WATER) && !(f & PATH);
      if (bad && !inRun) add('water', `${what} crosses water without a bridge`, p[0], p[1]);
      inRun = bad;
    }
  };
  roads.forEach(P => wet(P, 'A road'));
  trails.forEach(P => wet(P, 'A trail'));

  // trail-end: קצה שביל שאמור להתחבר ולא נוגע בעקומה המצוירת של דרך או שביל
  w.trails.forEach((t, i) => {
    for (const start of [true, false]) {
      if (geo.TRAIL_FREE.some(f => f.trail === i && f.start === start) || (start && geo.DOOR_TRAILS.has(i))) continue;
      const p = t[start ? 0 : t.length - 1];
      let d = Infinity;
      for (const P of roads) d = Math.min(d, near(P, p) - ROAD_W / 2);
      w.trails.forEach((o, j) => {
        if (j !== i) { d = Math.min(d, near(trails[j], p) - 4); return; }
        const { out: P, segs } = curveWithSegs(o, 4);   // אותו שביל: רק החלק הרחוק מהקצה הזה
        d = Math.min(d, near(P.filter((_, k) => start ? segs[k] >= 2 : segs[k] <= o.length - 4), p) - 4);
      });
      if (d > 1) add('trail-end', `A trail end stops ${Math.round(d)} short of the path it joins`, p[0], p[1]);
    }
  });

  for (const o of objs) {
    const D = DECL[o.type];
    // undeclared: סוג בלי הצהרה ב-world/decl.ts
    if (!D) { add('undeclared', `Type "${o.type}" has no declaration in world/decl.ts`, o.x ?? o.x0 ?? o.cx ?? 0, o.y ?? o.y0 ?? o.cy ?? 0, o); continue; }
    // prop: חפץ קטן על שביל, מים, מבנה או מגרש
    const f = D.foot?.(o);
    if (f && !placeOk(f[0], f[1], f[2], f[3])) add('prop', `A ${o.type} stands on a path, water, a building or a private plot`, o.x, o.y, o);
    // scale: חפץ בגודל אמיתי (world/scale.ts) שהגובה המצויר שלו רחוק מהגובה האמיתי
    const realH = REAL_H[o.type];
    if (realH && o._bb) {
      const m = (o._bb[3] - o._bb[1] - 2) / M;
      if (Math.abs(m / realH - 1) > TOL + .02) add('scale', `A ${o.type} is ${m.toFixed(1)} m tall instead of about ${realH} m`, o.x ?? o._bb[0], o._bb[3], o);
    }
    const minH = MAP_MIN[o.type];
    if (minH && o._bb && o._bb[3] - o._bb[1] - 2 < minH * HOUSE_H - 2) add('scale', `A ${o.type} is not clearly taller than a house (needs ${minH}× a house)`, o.x ?? o._bb[0], o._bb[3], o);
    if (o.type === 'roundTree' || o.type === 'pine') if (o._bb && o._bb[3] - o._bb[1] < TREE_MIN - 4) add('scale', `A tree is shorter than twice a person`, o.x, o.y, o);
    // plot-path: השביל המרוצף מהדלת נוגע בדרך או בשביל
    if (o.type === 'plot' && o._pathEnd) {
      const [x, y, dir] = o._pathEnd;
      if (!(flagsAt(x, y + dir * 5) & PATH)) add('plot-path', 'The paved path from a door does not reach the road', x, y, o);
    }
  }
  for (const t of Object.keys(PREFABS)) if (!DECL[t]) add('undeclared', `Prefab "${t}" has no declaration in world/decl.ts`, 0, 0);

  // overlap: מגרשים חופפים, בית מחוץ למגרש שלו, דרך או שביל בתוך מגרש
  const plots = objs.filter(o => o.type === 'plot');
  plots.forEach((a, i) => {
    for (const b of plots.slice(i + 1)) if (a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0) add('overlap', 'Two house plots overlap', (a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2, a);
    for (let y = a.y0 + 6; y < a.y1 - 6; y += 6) for (let x = a.x0 + 6; x < a.x1 - 6; x += 6)
      if (flagsAt(x, y) & LANE) { add('overlap', 'A road or trail runs through a house plot', x, y, a); y = a.y1; break; }
    if (a.door && !objs.some(h => declOf(h.type).kind === 'home' && Math.abs(h.x - a.door[0]) < 12 && Math.abs(h.y - a.door[1]) < 12)) add('overlap', 'A plot has no house at its door', a.door[0], a.door[1], a);
  });

  // labels: שמות חופפים בזום שבו הם מופיעים
  for (const l of labelOverlaps()) add('labels', `Labels "${l.a}" and "${l.b}" overlap`, l.x, l.y);

  // reach: מקום עם שם שאי אפשר להגיע אליו ברגל מהכפר
  for (const p of places) {
    if (!p.name || /^(the |a bench$)/.test(p.name)) continue;
    // בית במגרש פרטי: בודקים כמו הדיירים שלו (מותר להם להיכנס למגרש)
    if (!reachable(p, p.kind === 'home' ? plotOfDoor(p.door) : -1)) { const s = p.door || p.at || p.seat || [0, 0]; add('reach', `${p.name} cannot be reached on foot from the village`, s[0], s[1]); }
  }
  return out;
}
