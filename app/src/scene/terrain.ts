/* פני השטח: קרקע, דשא, דרכים, שבילים, חוף, נהר, ים, שלג והרים */
import { addLabel } from '../world/labels';
import { curvePts } from '../world/curve';
import { el, n2, circ, blob, smoothOpen, clamp } from '../core/util';
import { rand, pick, rngAt } from '../core/rng';
import { buildMountains } from './mountains';
import { addPlace } from '../world/places';
import { ctx } from '../world/context';
import { geo, edgeAt, occ, O_ROAD, O_RIVER, ROAD_W } from '../world/geometry';
import type { WorldData } from '../world/types';

/** קבוצות של פרטים קטנים (דשא) לפי אריח: מנוע האריחים מדלג עליהם כשמתרחקים */
export const DETAIL_GROUPS: any[] = [];

export function buildTerrain(w: WorldData) {
  const { B, L } = ctx, T = w.terrain;
  /* קרקע */
  el('rect', { x: B.x0, y: B.y0, width: B.x1 - B.x0, height: B.y1 - B.y0, fill: '#9cd162' }, L.ground);
  const BAND = 300, COL = 400, NR = Math.ceil((B.y1 - B.y0) / BAND), NC = Math.ceil((B.x1 - B.x0) / COL);
  const tileOf = (x: number, y: number) => clamp(Math.floor((y - B.y0) / BAND), 0, NR - 1) * NC + clamp(Math.floor((x - B.x0) / COL), 0, NC - 1);
  for (let i = 0; i < NR * NC; i++) DETAIL_GROUPS.push(el('g', null, L.ground));
  for (let i = 0; i < T.grass.patches; i++)
    el('path', { d: blob(rand(B.x0 + 40, B.x1 - 40), rand(B.y0 + 40, B.y1 - 40), rand(40, 110), rand(25, 60), 7, .12, rand(0, 6)), fill: '#a9d96f', opacity: .7 }, L.ground);
  const parts = DETAIL_GROUPS.map(() => ''), dry = DETAIL_GROUPS.map(() => '');
  const thaw = winter(T), pr = prairie(T);
  for (let i = 0; i < T.grass.tufts; i++) {
    const x = rand(B.x0 + 14, B.x1 - 14), y = rand(B.y0 + 14, B.y1 - 14);
    if (occ(x, y, O_ROAD | O_RIVER)) continue;
    // אחרי הרכס הדרומי הדשא מצהיב ומתדלדל בהדרגה (בלי לשנות את סדר המספרים האקראיים: רק מדלגים או צובעים אחרת)
    const f = Math.max(thaw(y), pr(y)), d = `M${n2(x - 3)},${n2(y)}l1.6,-4.2l1.4,4.2l1.4,-3.2l1.2,3.2`;
    if (f > 0 && rngAt(x, y, 61).r() < f * .75) continue;
    if (f > 0) dry[tileOf(x, y)] += d; else parts[tileOf(x, y)] += d;
  }
  parts.forEach((d, i) => d && el('path', { d, fill: 'none', stroke: '#7fb84d', 'stroke-width': 1.1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .8 }, DETAIL_GROUPS[i]));
  dry.forEach((d, i) => d && el('path', { d, fill: 'none', stroke: '#c2b56a', 'stroke-width': 1.1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .85 }, DETAIL_GROUPS[i]));

  /* דרכים: דרכי עפר צרות (אין מכוניות): שוליים רכים, כתמים שנשחקו מהליכה, אבנים קטנות ודשא בשוליים */
  const roads = [...geo.EDGES, ...geo.OUTER], all = roads.map(E => E.d).join(''), rv = rngAt(1, 2, 81), hw = ROAD_W / 2;
  el('path', { d: all, fill: 'none', stroke: '#e2b087', 'stroke-width': ROAD_W + 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.roads);
  el('path', { d: all, fill: 'none', stroke: '#f6d4b2', 'stroke-width': ROAD_W, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.roads);
  // דרך ללא מוצא שממשיכה כשביל: במקום קצה עגול, הדרך הולכת ונהיית צרה עד רוחב השביל
  const neck = (h0: number, h1: number) => geo.ROAD_TAPERS.map(({ x, y, dx, dy }) => {
    // צוואר: רוחב שיורד בעקומה רכה (כמו קוסינוס) לאורך 34 יחידות, מתחיל קצת בתוך הדרך כדי לכסות את הקצה העגול
    const Lp: string[] = [], Rp: string[] = [];
    for (let s = -4; s <= 34; s += 2) {
      const f = Math.max(0, s) / 34, h = h1 + (h0 - h1) * (.5 + .5 * Math.cos(f * Math.PI)), px = x + dx * s, py = y + dy * s;
      Lp.push(`${n2(px - dy * h)},${n2(py + dx * h)}`); Rp.unshift(`${n2(px + dy * h)},${n2(py - dx * h)}`);
    }
    return `M${Lp.join('L')}L${Rp.join('L')}Z`;
  }).join('');
  el('path', { d: neck(ROAD_W / 2 + 2.5, 6), fill: '#e2b087' }, L.roads);
  el('path', { d: neck(ROAD_W / 2, 4), fill: '#f6d4b2' }, L.roads);
  // האבנים הישנות צרכו מספרים מהמחולל הכללי; צורכים אותם גם עכשיו, כדי שהיער ושאר העולם יישארו במקומם
  for (let i = 0; i < 520; i++) { pick(roads); rand(0, 1); rand(-20, 20); rand(.7, 1.5); }
  let worn = '', pebbles = '';
  const verge = DETAIL_GROUPS.map(() => '');
  for (const E of roads) for (let s = rv.rand(0, 30); s < E.len; s += rv.rand(18, 40)) {
    const p = edgeAt(E, s), nx = -p.ty, ny = p.tx;
    if (rv.chance(.45)) { const o = rv.rand(-5, 5); worn += blob(p.x + nx * o, p.y + ny * o, rv.rand(6, 13), rv.rand(2.5, 4.5), 6, .2, rv.rand(0, 6)); }
    for (let k = 0; k < 2; k++) { const o = rv.rand(-hw + 3, hw - 3); pebbles += circ(p.x + nx * o, p.y + ny * o, rv.rand(.7, 1.4)); }
    // גבעולי דשא בשולי הדרך (פרט שמופיע רק בזום קרוב)
    for (const side of [-1, 1]) if (rv.chance(.6)) {
      const o = side * (hw + rv.rand(2, 5)), x = p.x + nx * o, y = p.y + ny * o;
      verge[tileOf(x, y)] += `M${n2(x - 2.5)},${n2(y)}l1.3,-3.6l1.2,3.6l1.2,-2.8l1,2.8`;
    }
  }
  el('path', { d: worn, fill: '#fbe2c9', opacity: .7 }, L.roads);
  el('path', { d: pebbles, fill: '#e0b08a', opacity: .75 }, L.roads);
  verge.forEach((d, i) => d && el('path', { d, fill: 'none', stroke: '#7fb84d', 'stroke-width': 1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .85 }, DETAIL_GROUPS[i]));

  /* שבילים צרים להולכי רגל (מתחת לדרכים) */
  {
    const tg = el('g', null, L.roads); L.roads.insertBefore(tg, L.roads.firstChild);
    // קצה שלא מוביל לשום מקום: השביל מצטמצם ונמוג בדשא (במקום קצה עגול וסגור)
    const TAIL = 34, tails: number[][][] = [];
    const draw = w.trails.map((t, i) => {
      const ends = geo.TRAIL_FREE.filter(f => f.trail === i);
      if (!ends.length) return smoothOpen(t);
      // שביל עם קצה פנוי: מציירים מהעקומה הצפופה עצמה, כדי שהקצה הנמוג ימשיך אותה בדיוק
      let pts = curvePts(t, 3);
      for (const f of ends) {
        const src = f.start ? pts.slice().reverse() : pts;
        let acc = 0, j = src.length - 1;
        while (j > 0 && acc < TAIL) { acc += Math.hypot(src[j][0] - src[j - 1][0], src[j][1] - src[j - 1][1]); j--; }
        if (acc < TAIL || j < 2) continue;   // שביל קצר מדי
        tails.push(src.slice(j));
        const out = src.slice(0, j + 1);
        pts = f.start ? out.reverse() : out;
      }
      return 'M' + pts.map(q => `${n2(q[0])},${n2(q[1])}`).join('L');
    });
    const d = draw.join('');
    // שביל שפוגש שביל: הפינות המעוגלות מצוירות באותו קו בדיוק (מסגרת ומילוי), כך שהשבילים מתמזגים בלי מדרגות
    const fil = geo.TRAIL_FILLETS.map(([h, c, b]) => `M${n2(h[0])},${n2(h[1])}Q${n2(c[0])},${n2(c[1])} ${n2(b[0])},${n2(b[1])}`).join('');
    // התרחבות רכה במקום שבו שביל נכנס לדרך (מתחת לדרך, כך שרק החלק שבשוליים נראה)
    const flare = (half: number, f: number) => geo.TRAIL_FLARES.map(({ x, y, mx, my, tx, ty }) => {
      const p = (a: number, b: number) => `${n2(x + tx * a + mx * b)},${n2(y + ty * a + my * b)}`;
      return `M${p(half + f, -6)}L${p(half + f, 0)}Q${p(half, 0)} ${p(half, f)}L${p(-half, f)}Q${p(-half, 0)} ${p(-half - f, 0)}L${p(-half - f, -6)}Z`;
    }).join('');
    // הקצה הנמוג: רצועה שמצטמצמת לאפס, ועוד כמה כתמי אדמה שחוקה קטנים בהמשך
    const taper = (half: number) => tails.map(tl => {
      const L: string[] = [], R: string[] = [];
      tl.forEach((q, k) => {
        const a = tl[Math.max(0, k - 1)], b = tl[Math.min(tl.length - 1, k + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        // נמוג: מצטמצם רק עד שליש מהרוחב, עם שוליים לא אחידים (דשא שנכנס פנימה)
        const u = k / (tl.length - 1), nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, wob = Math.sin(q[0] * .7 + q[1] * .3) * .9 * u;
        const h = half * (1 - .65 * u) + wob - (half - 4) * .5 * u;
        L.push(`${n2(q[0] + nx * h)},${n2(q[1] + ny * h)}`); R.unshift(`${n2(q[0] - nx * h)},${n2(q[1] - ny * h)}`);
      });
      return `M${L.join('L')}L${R.join('L')}Z` + blob(tl[tl.length - 1][0], tl[tl.length - 1][1], half * .45, half * .45, 7, .2, half);
    }).join('');
    let crumbs = '';
    for (const tl of tails) {
      const e = tl[tl.length - 1], a = tl[Math.max(0, tl.length - 4)], l = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1, ux = (e[0] - a[0]) / l, uy = (e[1] - a[1]) / l, rg = rngAt(e[0], e[1], 63);
      // כמה כתמי אדמה שחוקה בהמשך, קטנים והולכים: השביל לא נגמר בקו, הוא נבלע בדשא
      for (let k = 0; k < 4; k++) { const s = 7 + k * 7 + rg.rand(-1.5, 1.5), o = rg.rand(-3.5, 3.5); crumbs += blob(e[0] + ux * s - uy * o, e[1] + uy * s + ux * o, 3.6 - k * .7, 2.6 - k * .45, 7, .25, rg.rand(0, 6)); }
    }
    el('path', { d: d + fil, fill: 'none', stroke: '#d9b48c', 'stroke-width': 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, tg);
    el('path', { d: flare(6, 7) + taper(6), fill: '#d9b48c' }, tg);
    el('path', { d: d + fil, fill: 'none', stroke: '#efd6b4', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, tg);
    el('path', { d: flare(4, 6) + taper(4), fill: '#efd6b4' }, tg);
    el('path', { d: crumbs, fill: '#ead0ab', opacity: .85 }, tg);
  }

  /* חוף (למטה) */
  // החוף והמים מתחילים בחוף המערבי של האגם (אם יש לו), ממערב לו יבשה (היער)
  const LS = lakeShore(T), X0 = LS ? LS.Wx(T.beach.y) - 60 : B.x0;
  const wave = (y0: number, amp: number, freq: number, ph: number, step: number) => {
    const pts: number[][] = [[X0, y0 + 5]];
    for (let x = X0; x < B.x1; x += step) pts.push([x, y0 + Math.sin(x * freq + ph) * amp]);
    pts.push([B.x1, y0 + Math.sin(B.x1 * freq + ph) * amp]);
    return smoothOpen(pts);
  };
  el('path', { d: wave(T.beach.y, 14, .013, 0, 120) + `L${B.x1},${B.y1}L${X0},${B.y1}Z`, fill: '#f3dfb0' }, L.ground);
  // מקומות לשחייה: נכנסים למים בקצה החוף ונעלמים בהם לזמן מה
  for (const x of T.beach.swim || []) addPlace({ kind: 'swim', name: T.sea.name || (T.sea.south ? 'the lake' : 'the sea'), at: [x, T.sea.y - 8] });
  // שם לאגם הדרומי (אפשר לשנות בלחיצה על התווית, כמו כל שם)
  if (T.sea.name) addLabel({ type: 'lake', x: T.sea.labelAt?.[0] ?? 300, y: T.sea.labelAt?.[1] ?? T.sea.y + 120, name: T.sea.name }, T.sea.labelAt?.[1] ?? T.sea.y + 120);

  /* הנהר (נמשך מעל החול אל הים) */
  {
    const d = smoothOpen(w.river);
    el('path', { d, fill: 'none', stroke: '#e9dcae', 'stroke-width': 58, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.ground);
    el('path', { d, fill: 'none', stroke: '#5ec6e8', 'stroke-width': 44, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.ground);
    el('path', { d, fill: 'none', stroke: '#86d6f0', 'stroke-width': 14, 'stroke-linecap': 'round', opacity: .7 }, L.ground);
    let wv = '';
    for (const p of geo.RIVER_SAMPLES.filter((_, i) => i % 3 === 0)) wv += `M${n2(p[0] - 6 + rand(-8, 8))},${n2(p[1])}q3,-2.5 6,0q3,2.5 6,0`;
    el('path', { d: wv, fill: 'none', stroke: '#e8f8fd', 'stroke-width': 1.3, 'stroke-linecap': 'round', opacity: .8 }, L.ground);
  }

  /* המים בדרום: אגם גדול ושקט (משימה 11). חוף דרומי וחוף מזרחי סוגרים אותו; במערב הוא ממשיך עד קצה העולם
     (שם יתחבר בעתיד לים). בלי גלים: רק אדוות קטנות וקו חוף רך */
  {
    const top = wave(T.sea.y, 10, .02, 1, 90), S = lakeShore(T);
    el('path', { d: top + `L${B.x1},${B.y1}L${X0},${B.y1}Z`, fill: S ? '#5ec0e2' : '#4fb8de' }, L.ground);
    el('path', { d: top, fill: 'none', stroke: '#e8f8fd', 'stroke-width': S ? 4 : 7, 'stroke-linecap': 'round', opacity: .8 }, L.ground);
    let wv = '';
    for (let i = 0; i < T.sea.waves; i++) {
      const x = rand(B.x0, B.x1), y = rand(T.sea.y + 40, B.y1 - 10);   // אותה צריכה של מספרים אקראיים כמו קודם (היער לא זז)
      if (!S) wv += `M${n2(x)},${n2(y)}q5,-4 10,0q5,4 10,0`;
      else if (S.inside(x, y, 30) && i % 2) wv += `M${n2(x)},${n2(y)}q3,-2 6,0q3,2 6,0`;
    }
    el('path', { d: wv, fill: 'none', stroke: '#c9eefa', 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: S ? .6 : .8 }, L.ground);
    if (S) {
      // היבשה שמסביב: רצועה במזרח ובדרום, חוף חול לאורך הקו, וקו מים בהיר
      const land = [...S.east.map(p => [p[0], p[1]]), ...S.south.slice().reverse(), [S.south[0][0] - 10, B.y1 + 10], [B.x1 + 10, B.y1 + 10], [B.x1 + 10, S.east[0][1]]];
      el('path', { d: 'M' + land.map(p => `${n2(p[0])},${n2(p[1])}`).join('L') + 'Z', fill: '#9cd162' }, L.ground);
      // החוף המערבי: יבשה מערבה ממנו (היער הגדול)
      const westLand = [[X0 - 5, T.beach.y - 40], ...S.west, [S.west[S.west.length - 1][0], B.y1 + 10], [X0 - 5, B.y1 + 10]];
      el('path', { d: 'M' + westLand.map(p => `${n2(p[0])},${n2(p[1])}`).join('L') + 'Z', fill: '#9cd162' }, L.ground);
      const shore = smoothOpen([...S.west.slice().reverse().filter(p => p[1] > T.sea.y - 30), ...S.south.filter(p => p[0] > S.west[S.west.length - 1][0] + 10), ...S.east.slice().reverse()].reverse());
      el('path', { d: shore, fill: 'none', stroke: '#f3dfb0', 'stroke-width': 34, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.ground);
      el('path', { d: shore, fill: 'none', stroke: '#e8f8fd', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .75, transform: 'translate(-6,-6)' }, L.ground);
    }
  }

  /* צפון ההרים: מעבר הדרגתי לחורף (משימה 10א). מהרכס הדרומי (snow.line) ועד קרקעית העמק (snow.full):
     הקרקע מצהיבה בשכבות שקופות, כתמי שלג קטנים שהולכים וגדלים ומתמזגים, ורק משם קרקע מושלגת מלאה.
     הכול באקראיות מקומית (rngAt), כדי שהיער ושאר העולם לא יזוזו */
  const wavy = (y0: number, salt: number, amp = 22) => {
    const v = rngAt(y0, salt, 71), pts: number[][] = [];
    for (let x = B.x0 - 60; x <= B.x1 + 60; x += 70) pts.push([x, y0 + v.rand(-amp, amp * .65)]);
    return `M${B.x0 - 60},${B.y0}` + smoothOpen(pts).replace(/^M/, 'L') + `L${B.x1 + 60},${B.y0}Z`;
  };
  const wavyPts = (y0: number, salt: number, amp = 22) => {
    const v = rngAt(y0, salt, 71), pts: number[][] = [];
    for (let x = B.x0 - 60; x <= B.x1 + 60; x += 70) pts.push([x, y0 + v.rand(-amp, amp * .65)]);
    return pts;
  };
  {
    const y0 = T.snow.line, y1 = T.snow.full ?? T.snow.line, th = T.snow.thaw as number[] | undefined, BANDS = 7, cold = winter(T);
    for (let k = 0; k < BANDS; k++) el('path', { d: wavy(y0 - (y0 - y1) * (k + .3) / BANDS, k + 1, 30), fill: '#d9d4a0', opacity: .13 }, L.ground);   // הדשא מצהיב
    // כתמי שלג: גדלים לכיוון קרקעית העמק, ומתכווצים שוב צפונה ממנה (השלג נמס אל הערבה)
    const yTop = th ? th[1] : y1, v = rngAt(y0, y1, 72); let sn = '', sn2 = '';
    for (let i = 0; i < (th ? 420 : 260); i++) {
      const y = th ? v.rand(yTop, y0) : y0 - (y0 - y1) * v.r() ** .75, f = cold(y), x = v.rand(B.x0, B.x1);
      if (f < .04) { v.r(); v.r(); v.r(); v.r(); continue; }
      const rx = 5 + 85 * f ** 1.7, ry = 2.5 + 26 * f ** 1.7, d = blob(x, y, rx * v.rand(.7, 1.2), ry * v.rand(.7, 1.2), 7, .16, v.rand(0, 6));
      if (v.r() < .3) sn2 += d; else sn += d;
    }
    el('path', { d: sn, fill: '#f4f9fb', opacity: .92 }, L.ground);
    el('path', { d: sn2, fill: '#e3eef3', opacity: .92 }, L.ground);
    if (!th) el('path', { d: wavy(y1, 0), fill: '#eaf3f7' }, L.ground);   // חורף מלא עד קצה העולם
    else {
      // חורף מלא רק ברצועה שבקרקעית העמק (בין full לתחילת ההפשרה)
      const S = wavyPts(y1, 0), N = wavyPts(th[0], 5).reverse();
      el('path', { d: smoothOpen(S) + smoothOpen(N).replace(/^M/, 'L') + 'Z', fill: '#eaf3f7' }, L.ground);
    }
  }
  /* הערבה (prairie) בצפון: מעבר הדרגתי מהדשא הירוק לעשב זהוב וגבוה, פרחי בר, וכתמים שהרוח השכיבה */
  if (T.prairie) {
    const P = T.prairie, BANDS = 8, pr = prairie(T);
    for (let k = 0; k < BANDS; k++) el('path', { d: wavy(P.start - (P.start - P.full) * (k + .4) / BANDS, 40 + k, 40), fill: '#d6cc78', opacity: .14 }, L.ground);
    el('path', { d: wavy(P.full - 60, 49, 50), fill: '#d3c977', opacity: .55 }, L.ground);
    const v = rngAt(P.start, P.full, 73), parts2 = DETAIL_GROUPS.map(() => ''), dark = DETAIL_GROUPS.map(() => '');
    let sway = '', fl: Record<string, string> = { '#b48ad6': '', '#f2d24f': '', '#ffffff': '', '#e57a6a': '' };
    const N = Math.round((B.x1 - B.x0) * (P.start - B.y0) / 1500);
    for (let i = 0; i < N; i++) {
      const x = v.rand(B.x0 + 10, B.x1 - 10), y = v.rand(B.y0 + 10, P.start + 80), f = pr(y), r = v.r(), h = v.rand(6, 11);
      if (r > f * 1.05 || occ(x, y, O_ROAD | O_RIVER)) { v.r(); continue; }
      // גבעול עשב גבוה, מעט מוטה ברוח
      const d = `M${n2(x - 2.4)},${n2(y)}q.6,${n2(-h * .6)} 2,${n2(-h)}M${n2(x)},${n2(y)}q.4,${n2(-h * .7)} 2.4,${n2(-h * 1.1)}M${n2(x + 2.2)},${n2(y)}q.6,${n2(-h * .5)} 2,${n2(-h * .8)}`;
      (v.r() < .35 ? dark : parts2)[tileOf(x, y)] += d;
    }
    for (let i = 0; i < N / 6; i++) {
      const x = v.rand(B.x0, B.x1), y = v.rand(B.y0 + 10, P.start), c = v.pick(Object.keys(fl));
      if (v.r() > pr(y)) continue;
      fl[c] += circ(x, y - 2, v.rand(.9, 1.5));
    }
    for (let i = 0; i < N / 40; i++) {
      const x = v.rand(B.x0, B.x1), y = v.rand(B.y0 + 40, P.start);
      if (v.r() > pr(y)) continue;
      sway += blob(x, y, v.rand(60, 160), v.rand(14, 30), 7, .14, v.rand(0, 6));
    }
    el('path', { d: sway, fill: '#e3d98e', opacity: .55 }, L.ground);
    parts2.forEach((d, i) => d && el('path', { d, fill: 'none', stroke: '#c9b45a', 'stroke-width': 1, 'stroke-linecap': 'round', opacity: .9 }, DETAIL_GROUPS[i]));
    dark.forEach((d, i) => d && el('path', { d, fill: 'none', stroke: '#a59a4c', 'stroke-width': 1, 'stroke-linecap': 'round', opacity: .8 }, DETAIL_GROUPS[i]));
    for (const c in fl) if (fl[c]) el('path', { d: fl[c], fill: c }, L.ground);
  }
  for (let i = 0; i < T.snow.patches; i++)
    el('path', { d: blob(rand(T.snow.thaw ? B.x0 : B.x0, B.x1), rand(T.snow.thaw ? T.snow.full : B.y0 + 60, T.snow.patchesTo), rand(50, 140), rand(20, 50), 7, .12, rand(0, 6)), fill: pick(['#ffffff', '#dfecf2']), opacity: .8 }, L.ground);

  /* רכסי הרים, העמק שביניהם והפלג */
  buildMountains(w);
  /* מפל שנשפך מההרים אל הנהר */
  if (T.waterfall) {
    const { x, top, bottom } = T.waterfall, h = bottom - top;
    el('path', { d: `M${x - 14},${top}h28l4,${h + 2}h-36z`, fill: '#bfeafa' }, L.ground);
    el('path', { d: `M${x - 8},${top + 2}v${h - 6}M${x},${top}v${h - 2}M${x + 8},${top + 2}v${h - 6}`, stroke: '#ffffff', 'stroke-width': 2, 'stroke-linecap': 'round', opacity: .9 }, L.ground);
    el('ellipse', { cx: x, cy: bottom, rx: 28, ry: 9, fill: '#e8f8fd' }, L.ground);
  }
}

/** כמה "חורף" יש בגובה y: 0 מדרום לרכס, 1 מקרקעית העמק וצפונה (snow.line → snow.full) */
export function winter(T: any) {
  const y0 = T.snow.line, y1 = T.snow.full ?? T.snow.line, th = T.snow.thaw as number[] | undefined;
  return (y: number) => {
    const f = y >= y0 ? 0 : y <= y1 ? 1 : (y0 - y) / (y0 - y1);
    // צפונה מהעמק השלג נמס בהדרגה אל הערבה (thaw: מתחיל להימס → נמס לגמרי)
    return th && y < th[0] ? f * Math.max(0, Math.min(1, (y - th[1]) / (th[0] - th[1]))) : f;
  };
}
/** כמה "ערבה" יש בגובה y: 0 דרומה מ-prairie.start, 1 מ-prairie.full וצפונה */
export function prairie(T: any) {
  const P = T.prairie;
  return (y: number) => !P || y >= P.start ? 0 : y <= P.full ? 1 : (P.start - y) / (P.start - P.full);
}

/** קו החוף של האגם הדרומי (אם terrain.sea.south מוגדר): החוף המזרחי (מלמעלה למטה) והחוף הדרומי (ממערב למזרח),
 *  ובדיקה אם נקודה בתוך המים (עם מרווח). אותה צורה משמשת לציור, למפת ההליכה, לעצים ולבדיקות */
export function lakeShore(T: any) {
  if (T.sea?.south === undefined) return null;
  const { B } = ctx, top = T.sea.y, Sy = (x: number) => T.sea.south + 28 * Math.sin(x / 230) + 14 * Math.sin(x / 83 + 1);
  const Ex = (y: number) => T.sea.east + 40 * Math.sin(y / 170) + 15 * Math.sin(y / 61);
  // חוף מערבי (sea.west): האגם נסגר, ומערבה ממנו יבשה. בלי west – האגם פתוח עד קצה העולם
  const Wx = (y: number) => T.sea.west === undefined ? B.x0 - 10 : T.sea.west + 45 * Math.sin(y / 150 + 2) + 18 * Math.sin(y / 57);
  const east: number[][] = [], south: number[][] = [], west: number[][] = [];
  const yEnd = Sy(Ex(T.sea.south)), wEnd = Sy(Wx(T.sea.south));
  for (let y = top - 20; y < yEnd; y += 30) east.push([Ex(y), y]);
  east.push([Ex(yEnd), yEnd]);
  for (let y = T.beach.y - 40; y < wEnd; y += 30) west.push([Wx(y), y]);
  west.push([Wx(wEnd), wEnd]);
  for (let x = Wx(wEnd); x < Ex(yEnd); x += 40) south.push([x, Sy(x)]);
  south.push([Ex(yEnd), yEnd]);
  const inside = (x: number, y: number, m = 0) => y > top + m && y < Sy(x) - m && x < Ex(y) - m && x > Wx(y) + m;
  /** פוליגון המים (למפת ההליכה) */
  const poly = [[Wx(top), top + 2], ...east.filter(p => p[1] > top + 2), ...south.slice().reverse(), ...west.filter(p => p[1] > top + 2).reverse()];
  return { east, south, west, inside, poly, Sy, Ex, Wx };
}
