/* פני השטח: קרקע, דשא, דרכים, שבילים, חוף, נהר, ים, שלג והרים */
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
  const parts = DETAIL_GROUPS.map(() => '');
  for (let i = 0; i < T.grass.tufts; i++) {
    const x = rand(B.x0 + 14, B.x1 - 14), y = rand(B.y0 + 14, B.y1 - 14);
    if (occ(x, y, O_ROAD | O_RIVER)) continue;
    parts[tileOf(x, y)] += `M${n2(x - 3)},${n2(y)}l1.6,-4.2l1.4,4.2l1.4,-3.2l1.2,3.2`;
  }
  parts.forEach((d, i) => d && el('path', { d, fill: 'none', stroke: '#7fb84d', 'stroke-width': 1.1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .8 }, DETAIL_GROUPS[i]));

  /* דרכים: דרכי עפר צרות (אין מכוניות): שוליים רכים, כתמים שנשחקו מהליכה, אבנים קטנות ודשא בשוליים */
  const roads = [...geo.EDGES, ...geo.OUTER], all = roads.map(E => E.d).join(''), rv = rngAt(1, 2, 81), hw = ROAD_W / 2;
  el('path', { d: all, fill: 'none', stroke: '#e2b087', 'stroke-width': ROAD_W + 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.roads);
  el('path', { d: all, fill: 'none', stroke: '#f6d4b2', 'stroke-width': ROAD_W, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, L.roads);
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
    const d = w.trails.map(t => smoothOpen(t)).join('');
    el('path', { d, fill: 'none', stroke: '#d9b48c', 'stroke-width': 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, tg);
    el('path', { d, fill: 'none', stroke: '#efd6b4', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, tg);
    el('path', { d, fill: 'none', stroke: '#d9b48c', 'stroke-width': 1.2, 'stroke-dasharray': '2 7', 'stroke-linecap': 'round', opacity: .8 }, tg);
  }

  /* חוף (למטה) */
  const wave = (y0: number, amp: number, freq: number, ph: number, step: number) => {
    const pts: number[][] = [[B.x0, y0 + 5]];
    for (let x = B.x0; x < B.x1; x += step) pts.push([x, y0 + Math.sin(x * freq + ph) * amp]);
    pts.push([B.x1, y0 + Math.sin(B.x1 * freq + ph) * amp]);
    return smoothOpen(pts);
  };
  el('path', { d: wave(T.beach.y, 14, .013, 0, 120) + `L${B.x1},${B.y1}L${B.x0},${B.y1}Z`, fill: '#f3dfb0' }, L.ground);
  // מקומות לשחייה: נכנסים למים בקצה החוף ונעלמים בהם לזמן מה
  for (const x of T.beach.swim || []) addPlace({ kind: 'swim', name: 'the sea', door: [x, T.sea.y - 8] });

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

  /* ים */
  {
    const top = wave(T.sea.y, 10, .02, 1, 90);
    el('path', { d: top + `L${B.x1},${B.y1}L${B.x0},${B.y1}Z`, fill: '#4fb8de' }, L.ground);
    el('path', { d: top, fill: 'none', stroke: '#e8f8fd', 'stroke-width': 7, 'stroke-linecap': 'round', opacity: .85 }, L.ground);
    let wv = '';
    for (let i = 0; i < T.sea.waves; i++) { const x = rand(B.x0, B.x1), y = rand(T.sea.y + 40, B.y1 - 10); wv += `M${n2(x)},${n2(y)}q5,-4 10,0q5,4 10,0`; }
    el('path', { d: wv, fill: 'none', stroke: '#bfeafa', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: .8 }, L.ground);
  }

  /* צפון ההרים: קרקע מושלגת */
  // הגבול התחתון גלי (במעברים בין ההרים רואים אותו)
  {
    const v = rngAt(T.snow.line, 0, 71), pts: number[][] = [];
    for (let x = B.x0 - 60; x <= B.x1 + 60; x += 70) pts.push([x, T.snow.line + v.rand(-22, 14)]);
    el('path', { d: `M${B.x0 - 60},${B.y0}` + smoothOpen(pts).replace(/^M/, 'L') + `L${B.x1 + 60},${B.y0}Z`, fill: '#eaf3f7' }, L.ground);
  }
  for (let i = 0; i < T.snow.patches; i++)
    el('path', { d: blob(rand(B.x0, B.x1), rand(B.y0 + 60, T.snow.patchesTo), rand(50, 140), rand(20, 50), 7, .12, rand(0, 6)), fill: pick(['#ffffff', '#dfecf2']), opacity: .8 }, L.ground);

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
