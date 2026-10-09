/* ───────── בדיקת העולם ─────────
   אחרי שהעולם נבנה, מריצים את הבדיקה של כל כלל מ-world/rules.ts ורושמים כל מקום שבו משהו לא בסדר.
   הבדיקה רק מדווחת, לא מתקנת: התיקון שייך לקוד שאוכף את הכלל.
   כל בדיקה כאן שייכת לכלל ברשימה (check), וכל כלל עם check חייב בדיקה כאן – אחרת מדווח "rules".
   רצה רק עם ?debug (תג בפינה, ולחיצה על שורה מטיסה את המצלמה למקום) או מהכלי tools/check.mjs לפני דחיפה.
   חריג מכוון: allow: ['<check>'] על האובייקט בנתונים. */
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
import { issues, stageMs, type Issue } from './issues';
import { REAL_H, M, TOL, MAP_MIN, HOUSE_H, TREE_MIN } from './scale';
import { RULES, ruleOfCheck } from './rules';
import { LAMPS, LAMPS_SPACING } from '../scene/generators';
import { wildIssues } from '../actors/wildlife';
import { lakeShore } from '../scene/terrain';
import { BUDGET, STATIC_COST, FRAME, totalPts } from './budget';
import { dynamics } from '../actors/people';

/** הבדיקות שממומשות כאן (כל אחת שייכת לכלל ב-RULES) */
const IMPLEMENTED = ['boot', 'baked', 'water', 'trail-end', 'prop', 'bench', 'plot-path', 'overlap', 'labels', 'reach', 'undeclared', 'order', 'scale',
  'trail-water', 'parallel', 'junctions', 'curves', 'lamps', 'gardens', 'wildlife', 'perf'];

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
      // קצה שיושב בדיוק על קצה של שביל אחר: זה המשך של אותו שביל (כלל trail-joins), לא קצה פתוח
      if (w.trails.some((o, j) => j !== i && [o[0], o[o.length - 1]].some(e => Math.hypot(e[0] - p[0], e[1] - p[1]) < 3))) continue;
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

  // trail-water: שביל קרוב מדי לגדת נהר או פלג (חוץ מליד מקום שבו הוא חוצה אותם), או נכנס לאגם
  const lake = lakeShore(w.terrain);
  const lakes = objs.map(o => declOf(o.type).water?.(o)).filter(Boolean) as number[][];
  w.trails.forEach((t, i) => {
    if (geo.DOOR_TRAILS.has(i)) return;
    const P = trails[i];
    for (const [W, clear] of [[geo.RIVER_SAMPLES, 38], [geo.CREEK_SAMPLES, 24]] as [number[][], number][]) {
      if (W.length < 2) continue;
      const cross: number[][] = [];
      for (let k = 0; k < P.length - 1; k++) for (let j = 0; j < W.length - 1; j++) {
        const a = P[k], b = P[k + 1], c = W[j], e = W[j + 1], den = (b[0] - a[0]) * (e[1] - c[1]) - (b[1] - a[1]) * (e[0] - c[0]); if (!den) continue;
        const u = ((c[0] - a[0]) * (e[1] - c[1]) - (c[1] - a[1]) * (e[0] - c[0])) / den, v = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) cross.push([a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1])]);
      }
      const bad = P.find(p => near(W, p) < clear && !cross.some(c => Math.hypot(c[0] - p[0], c[1] - p[1]) < 80));
      if (bad) add('trail-water', 'A trail runs along the water bank', bad[0], bad[1]);
    }
    for (const e of lakes) { const q = P.find(p => ((p[0] - e[0]) / (e[2] + 4)) ** 2 + ((p[1] - e[1]) / (e[3] + 4)) ** 2 < 1); if (q) add('trail-water', 'A trail enters a lake', q[0], q[1]); }
    if (lake) { const q = P.find(p => lake.inside(p[0], p[1], 4)); if (q) add('trail-water', 'A trail enters the big lake', q[0], q[1]); }
  });

  // parallel: שני שבילים צמודים לאורך קטע (רחוק מהקצוות שלהם, שם הם מתחברים)
  for (let i = 0; i < w.trails.length; i++) for (let j = i + 1; j < w.trails.length; j++) {
    if (geo.DOOR_TRAILS.has(i) || geo.DOOR_TRAILS.has(j)) continue;
    const ti = w.trails[i], tj = w.trails[j], ends = [ti[0], ti[ti.length - 1], tj[0], tj[tj.length - 1]];
    let run = 0, at: number[] | null = null;
    for (let k = 3; k < trails[i].length; k += 3) {
      const p = trails[i][k], q = trails[i][k - 3];
      run = near(trails[j], p) < 24 && !ends.some(e => Math.hypot(e[0] - p[0], e[1] - p[1]) < 90) ? run + Math.hypot(p[0] - q[0], p[1] - q[1]) : 0;
      if (run > 60) { at = p; break; }
    }
    if (at) add('parallel', 'Two trails run side by side', at[0], at[1]);
  }

  // junctions: צמתים צפופים (שני צמתים שונים קרובים מדי זה לזה)
  const J: number[][] = [...geo.TRAIL_FILLETS.map(f => f[1]), ...geo.TRAIL_FLARES.map(f => [f.cx, f.cy])];   // נקודת הצומת עצמה (על קו האמצע)
  for (let a = 0; a < J.length; a++) for (let b = a + 1; b < J.length; b++) {
    const d = Math.hypot(J[a][0] - J[b][0], J[a][1] - J[b][1]);
    if (d > 3 && d < 30) { add('junctions', 'Two junctions are crowded together', J[a][0], J[a][1]); break; }
  }

  // curves: פינה חדה באמצע שביל (לא ליד הקצוות, שם נכנסים לצומת)
  w.trails.forEach((t, i) => {
    if (geo.DOOR_TRAILS.has(i)) return;
    for (let k = 2; k < t.length - 2; k++) {
      const a = t[k - 1], v = t[k], b = t[k + 1];
      const turn = Math.abs(Math.atan2((v[0] - a[0]) * (b[1] - v[1]) - (v[1] - a[1]) * (b[0] - v[0]), (v[0] - a[0]) * (b[0] - v[0]) + (v[1] - a[1]) * (b[1] - v[1])));
      if (turn > 80 * Math.PI / 180) { add('curves', 'A trail has a sharp corner', v[0], v[1]); break; }
    }
  });

  // lamps: פנס מחוץ לכפר, על שביל, צמוד לפנס אחר, או שהזרוע שלו לא פונה אל הדרך
  const H = ctx.home;
  LAMPS.forEach((l, i) => {
    if (l.x < H.x0 - 41 || l.x > H.x1 + 41 || l.y < H.y0 - 41 || l.y > H.y1 + 41) add('lamps', 'A street lamp outside the village', l.x, l.y);
    if (!placeOk(l.x - 3, l.y - 3, l.x + 3, l.y + 1)) add('lamps', 'A street lamp on a path or obstacle', l.x, l.y);
    if (LAMPS.slice(i + 1).some(m => Math.hypot(m.x - l.x, m.y - l.y) < LAMPS_SPACING.v * .55)) add('lamps', 'Two street lamps too close together', l.x, l.y);
    if (Math.abs(l.rx - l.x) > 4 && Math.sign(l.rx - l.x) !== l.flip) add('lamps', 'A street lamp arm points away from the road', l.x, l.y);
  });

  // gardens: לכל בית גינה (רוחב המגרש לפחות רוחב הבית + 50, וחצר קדמית)
  for (const p of plots) {
    const h = objs.find(o => declOf(o.type).kind === 'home' && p.door && Math.abs(o.x - p.door[0]) < 12 && Math.abs(o.y - p.door[1]) < 12);
    if (!h) continue;
    if (p.x1 - p.x0 < (h.w ?? 52) + 50) add('gardens', 'A house plot is too narrow for a garden', p.door[0], p.door[1], p);
    const front = p.y1 - p.door[1];
    if (front < 12 || front > 34) add('gardens', 'A house has no proper front yard', p.door[0], p.door[1], p);
  }

  // perf: תקציב ביצועים (world/budget.ts)
  for (const o of objs) {
    const c = o._cost; if (!c) continue;
    if (c[0] > BUDGET.objEls || c[1] > BUDGET.objPts) add('perf', `A ${o.type} is heavy to draw (${c[0]} elements, ${c[1]} points; budget ${BUDGET.objEls} / ${BUDGET.objPts})`, o.x ?? o.x0 ?? o.cx ?? 0, o.y ?? o.y0 ?? o.cy ?? 0, o);
  }
  (window as any).__budget = { static: { ...STATIC_COST }, frameMs: +FRAME.avg().toFixed(2), movers: dynamics.length, budget: BUDGET };   // לבדיקות
  const maxPts = totalPts(ctx.B);
  if (STATIC_COST.pts > maxPts) add('perf', `The static map has ${STATIC_COST.pts} points (budget ${maxPts}, by area)`, 0, 0);
  if (FRAME.ms.length > 30 && FRAME.avg() > BUDGET.frameMs) add('perf', `Moving things take ${FRAME.avg().toFixed(1)} ms per frame (budget ${BUDGET.frameMs})`, 0, 0);
  const build = Object.values(stageMs).reduce((a, b) => a + b, 0);
  if (build > BUDGET.buildMs) add('perf', `Building the world takes ${Math.round(build)} ms (budget ${BUDGET.buildMs})`, 0, 0);
  if (dynamics.length > BUDGET.movers) add('perf', `${dynamics.length} moving things (budget ${BUDGET.movers})`, 0, 0);

  // boot: זמן הטעינה לא גדל עם העולם – עבודת הדף עד שהמפה מוצגת בתקציב קבוע, ובטעינה נבנים רק האזורים של המבט הראשון
  const bt = (window as any).__boot;
  if (bt) {
    const main = bt.scene + bt.tiles + bt.actors;
    if (main > BUDGET.bootMs) add('boot', `Loading takes ${Math.round(main)} ms of page work before the map shows (budget ${BUDGET.bootMs})`, 0, 0);
    if (bt.bootChunks > BUDGET.bootChunks) add('boot', `${bt.bootChunks} areas are drawn while loading (budget ${BUDGET.bootChunks}: only the first view)`, 0, 0);
  }
  // baked: החישוב שנאפה מראש תואם לעולם ולקוד (אחרת הוא לא משמש, והטעינה איטית יותר)
  if (!geo.baked) add('baked', 'The precomputed trail geometry (src/world/baked.json) is stale: run npm run bake -- <dev url>', 0, 0);

  // wildlife: חיות היער במקום טבעי
  for (const it of wildIssues()) add('wildlife', it.msg, it.x, it.y);

  // labels: שמות חופפים בזום שבו הם מופיעים
  for (const l of labelOverlaps()) add('labels', `Labels "${l.a}" and "${l.b}" overlap`, l.x, l.y);

  // reach: מקום עם שם שאי אפשר להגיע אליו ברגל מהכפר
  for (const p of places) {
    if (!p.name || /^(the |a bench$)/.test(p.name)) continue;
    // בית במגרש פרטי: בודקים כמו הדיירים שלו (מותר להם להיכנס למגרש)
    if (!reachable(p, p.kind === 'home' ? plotOfDoor(p.door) : -1)) { const s = p.door || p.at || p.seat || [0, 0]; add('reach', `${p.name} cannot be reached on foot from the village`, s[0], s[1]); }
  }
  // כל הפרה שייכת לכלל ברשימה, וכל כלל עם בדיקה – הבדיקה קיימת
  for (const it of out) if (it.rule !== 'rules' && !ruleOfCheck(it.rule)) { out.push({ rule: 'rules', msg: `Check "${it.rule}" belongs to no rule in world/rules.ts`, x: 0, y: 0 }); break; }
  for (const r of RULES) if (r.check && !IMPLEMENTED.includes(r.check)) out.push({ rule: 'rules', msg: `Rule "${r.id}" has no check "${r.check}"`, x: 0, y: 0 });
  for (const r of RULES) if (!r.check && !r.motion && !r.built) out.push({ rule: 'rules', msg: `Rule "${r.id}" is not verified (check, motion or built)`, x: 0, y: 0 });
  return out;
}
