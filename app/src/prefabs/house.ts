/* בית: כל בית בנוי קצת אחרת, כאילו כל אחד נבנה בידי בנאי אחר.
   הצורה, החומרים והפרטים נבחרים מאקראיות מקומית לפי מקום הבית: קבועים בין טעינות,
   ולא משנים את האקראיות של שאר העולם (היער, העננים). */
import { el, n2, circ, shade, ST } from '../core/util';
import { rand, rngAt, type LocalRng } from '../core/rng';
import { ctx, prop, block, smokeFx } from '../world/context';

export type Pt = number[];
export const P2 = (p: Pt) => `${n2(p[0])},${n2(p[1])}`;
export const poly = (P: Pt[]) => 'M' + P.map(P2).join('L') + 'Z';

/** החיתוך של מצולע קמור עם קו אופקי (בשביל מרקם שנשאר בתוך הגג) */
export function spanAt(P: Pt[], yy: number): [number, number] | null {
  let a = Infinity, b = -Infinity;
  for (let i = 0; i < P.length; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length];
    if (y1 === y2 || (y1 - yy) * (y2 - yy) > 0) continue;
    const x = x1 + (x2 - x1) * (yy - y1) / (y2 - y1);
    a = Math.min(a, x); b = Math.max(b, x);
  }
  return a < b ? [a, b] : null;
}
/** הנקודה הגבוהה ביותר של מצולע קמור בעמודה xx */
export function topAt(P: Pt[], xx: number) {
  let t = Infinity;
  for (let i = 0; i < P.length; i++) {
    const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % P.length];
    if (x1 === x2 || (x1 - xx) * (x2 - xx) > 0) continue;
    t = Math.min(t, y1 + (y2 - y1) * (xx - x1) / (x2 - x1));
  }
  return t;
}

export function chimneySmoke(x: number, y: number, scale: number) {
  for (let i = 0; i < 3; i++)
    smokeFx(el('circle', { cx: x, cy: y, r: 5 * scale, fill: '#f4f1ea', opacity: 0 }, ctx.L.air), x, y, i * 1.6 + rand(0, 1));
}

export const SHUTTERS = ['#5b8c5a', '#3d6fa8', '#a0643a', '#c0504d', '#6b7a8a', '#d9a441', '#7a5c99', '#2f7f7a'];
export const DOORS = ['#a86a3d', '#7a4a2a', '#3d6fa8', '#c0504d', '#4f8a5b', '#5b3a22', '#d9a441', '#6b4f7a', '#2f6f73'];
export const FLOWERS = ['#f6d05a', '#e48aa5', '#ffffff', '#f2a65a', '#e2574c', '#b48ad6'];

/* ───────── מרקם גג ───────── */
export function roofTexture(g: any, P: Pt[], kind: string, roof: string, top: number, base: number) {
  const ln = shade(roof, -.2);
  let d = '';
  if (kind === 'tiles') {                       // רעפים: שורות של קשתות
    for (let yy = base - 4, row = 0; yy > top + 3; yy -= 5.5, row++) {
      const s = spanAt(P, yy); if (!s || s[1] - s[0] < 8) continue;
      d += `M${n2(s[0] + 1.5)},${n2(yy)}`;
      for (let xx = s[0] + 1.5 + (row % 2) * 2.6; xx + 5.2 < s[1] - 1; xx += 5.2) d += `M${n2(xx)},${n2(yy)}q2.6,3 5.2,0`;
    }
    el('path', { d, fill: 'none', stroke: ln, 'stroke-width': .8, 'stroke-linecap': 'round' }, g);
  } else if (kind === 'shingles' || kind === 'slate') {   // שורות ישרות עם תפרים מדורגים
    const step = kind === 'slate' ? 4.2 : 5, tick = kind === 'slate' ? 6 : 8;
    for (let yy = base - 3, row = 0; yy > top + 2; yy -= step, row++) {
      const s = spanAt(P, yy); if (!s || s[1] - s[0] < 6) continue;
      d += `M${n2(s[0] + 1)},${n2(yy)}H${n2(s[1] - 1)}`;
      for (let xx = s[0] + 2 + (row % 2) * tick / 2; xx < s[1] - 2; xx += tick) d += `M${n2(xx)},${n2(yy)}v${n2(-step + .6)}`;
    }
    el('path', { d, fill: 'none', stroke: ln, 'stroke-width': .7 }, g);
  } else if (kind === 'thatch') {               // קש: קווים קצרים לאורך, ושוליים גליים למטה
    for (let yy = base - 3; yy > top + 4; yy -= 4.5) {
      const s = spanAt(P, yy); if (!s) continue;
      for (let xx = s[0] + 2; xx < s[1] - 2; xx += 3.2) d += `M${n2(xx)},${n2(yy)}l${n2((xx - (s[0] + s[1]) / 2) * .04)},-3.4`;
    }
    el('path', { d, fill: 'none', stroke: ln, 'stroke-width': .6, opacity: .8 }, g);
    const s = spanAt(P, base - .5);
    if (s) { let f = `M${n2(s[0])},${n2(base)}`; for (let xx = s[0]; xx < s[1]; xx += 5) f += `q2.5,3 5,0`; el('path', { d: f, fill: 'none', stroke: shade(roof, -.28), 'stroke-width': 1.1 }, g); }
  }
}

/* ───────── מרקם קיר ───────── */
export function wallTexture(g: any, x0: number, y0: number, w: number, h: number, kind: string, wall: string, rg: LocalRng) {
  const ln = shade(wall, -.13), x1 = x0 + w, y1 = y0 + h;
  let d = '';
  if (kind === 'siding') { for (let yy = y0 + 4; yy < y1 - 1; yy += 4) d += `M${n2(x0 + .8)},${n2(yy)}H${n2(x1 - .8)}`; }
  else if (kind === 'boards') { for (let xx = x0 + 5; xx < x1 - 1; xx += 5) d += `M${n2(xx)},${n2(y0 + .8)}V${n2(y1)}`; }
  else if (kind === 'brick') {
    for (let yy = y0 + 3.6, row = 0; yy < y1; yy += 3.6, row++) {
      d += `M${n2(x0 + .8)},${n2(yy)}H${n2(x1 - .8)}`;
      for (let xx = x0 + 2 + (row % 2) * 3.5; xx < x1 - 1; xx += 7) d += `M${n2(xx)},${n2(yy)}v-3.6`;
    }
  } else if (kind === 'stone') {
    // אבנים רק בפינות ובבסיס (כמו אבני פינה בבית ישן)
    let st = '';
    for (let yy = y1 - 5; yy > y0 + 2; yy -= 5.5) {
      const big = Math.round((y1 - yy) / 5.5) % 2 ? 7 : 4.5;
      st += `M${n2(x0)},${n2(yy - 4.4)}h${big}v4.4h${-big}z M${n2(x1)},${n2(yy - 4.4)}h${-big}v4.4h${big}z`;
    }
    for (let xx = x0 + 1; xx < x1 - 4; xx += rg.rand(5, 8)) st += `M${n2(xx)},${n2(y1 - .5)}h${n2(rg.rand(4, 6.5))}v${n2(-rg.rand(3.5, 5))}h${n2(-rg.rand(4, 6.5))}z`;
    el('path', { d: st, fill: shade(wall, -.1), stroke: shade(wall, -.22), 'stroke-width': .6 }, g);
    return;
  } else if (kind === 'timber') {
    // קורות עץ כהות על טיח בהיר
    const beam = '#6b4a2f', mid = y0 + h * .45;
    d = `M${n2(x0 + 1.5)},${n2(y0)}V${n2(y1)}M${n2(x1 - 1.5)},${n2(y0)}V${n2(y1)}M${n2(x0)},${n2(mid)}H${n2(x1)}M${n2(x0)},${n2(y0 + 1.2)}H${n2(x1)}`;
    const third = w / 3;
    d += `M${n2(x0 + third)},${n2(y0)}V${n2(mid)}M${n2(x1 - third)},${n2(y0)}V${n2(mid)}`;
    d += `M${n2(x0 + 1.5)},${n2(mid)}L${n2(x0 + third)},${n2(y0 + 1.2)}M${n2(x1 - 1.5)},${n2(mid)}L${n2(x1 - third)},${n2(y0 + 1.2)}`;
    el('path', { d, fill: 'none', stroke: beam, 'stroke-width': 1.8 }, g);
    return;
  } else if (kind === 'plaster') {
    // טיח עם כתם בלוי אחד
    const cx = rg.rand(x0 + 6, x1 - 6), cy = rg.rand(y0 + 6, y1 - 8);
    el('path', { d: `M${n2(cx - 4)},${n2(cy)}q2,-2.4 5,-1q3,1.4 3,3.4q-3,1.6 -6,.4z`, fill: shade(wall, -.06) }, g);
    return;
  }
  if (d) el('path', { d, fill: 'none', stroke: ln, 'stroke-width': .6 }, g);
}

/* ───────── חלון ───────── */
export function windowAt(g: any, cx: number, cy: number, ww: number, wh: number, style: string, frame: string, shutter: string | null, box: string | null) {
  const glass = '#bfe6fb';
  if (shutter) {
    const sw = ww * .42;
    el('rect', { x: cx - ww / 2 - sw - .6, y: cy - wh / 2, width: sw, height: wh, fill: shutter, stroke: shade(shutter, -.2), 'stroke-width': .6 }, g);
    el('rect', { x: cx + ww / 2 + .6, y: cy - wh / 2, width: sw, height: wh, fill: shutter, stroke: shade(shutter, -.2), 'stroke-width': .6 }, g);
    el('path', { d: `M${n2(cx - ww / 2 - sw)},${n2(cy - wh / 6)}h${n2(sw - 1)}M${n2(cx - ww / 2 - sw)},${n2(cy + wh / 6)}h${n2(sw - 1)}M${n2(cx + ww / 2 + 1.6)},${n2(cy - wh / 6)}h${n2(sw - 1)}M${n2(cx + ww / 2 + 1.6)},${n2(cy + wh / 6)}h${n2(sw - 1)}`, stroke: shade(shutter, -.25), 'stroke-width': .5 }, g);
  }
  if (style === 'round') {
    const r = Math.min(ww, wh) / 2;
    el('circle', { cx, cy, r, fill: glass, stroke: frame, 'stroke-width': 1.6 }, g);
    el('path', { d: `M${n2(cx - r)},${n2(cy)}h${n2(2 * r)}M${n2(cx)},${n2(cy - r)}v${n2(2 * r)}`, stroke: frame, 'stroke-width': .9 }, g);
  } else if (style === 'arched') {
    const r = ww / 2, top = cy - wh / 2 + r;
    el('path', { d: `M${n2(cx - r)},${n2(cy + wh / 2)}V${n2(top)}a${n2(r)},${n2(r)} 0 0 1 ${n2(2 * r)},0V${n2(cy + wh / 2)}Z`, fill: glass, stroke: frame, 'stroke-width': 1.5 }, g);
    el('path', { d: `M${n2(cx)},${n2(cy - wh / 2)}v${n2(wh)}M${n2(cx - r)},${n2(top + 1)}h${n2(2 * r)}`, stroke: frame, 'stroke-width': .9 }, g);
  } else if (style === 'wide') {
    el('rect', { x: cx - ww / 2, y: cy - wh / 2, width: ww, height: wh, rx: 1, fill: glass, stroke: frame, 'stroke-width': 1.5 }, g);
    el('path', { d: `M${n2(cx - ww / 6)},${n2(cy - wh / 2)}v${n2(wh)}M${n2(cx + ww / 6)},${n2(cy - wh / 2)}v${n2(wh)}`, stroke: frame, 'stroke-width': .9 }, g);
  } else if (style === 'tall') {
    el('rect', { x: cx - ww / 2, y: cy - wh / 2, width: ww, height: wh, rx: 1, fill: glass, stroke: frame, 'stroke-width': 1.5 }, g);
    el('path', { d: `M${n2(cx)},${n2(cy - wh / 2)}v${n2(wh)}M${n2(cx - ww / 2)},${n2(cy - wh / 6)}h${n2(ww)}M${n2(cx - ww / 2)},${n2(cy + wh / 6)}h${n2(ww)}`, stroke: frame, 'stroke-width': .8 }, g);
  } else {
    el('rect', { x: cx - ww / 2, y: cy - wh / 2, width: ww, height: wh, rx: 1.2, fill: glass, stroke: frame, 'stroke-width': 1.6 }, g);
    el('path', { d: `M${n2(cx)},${n2(cy - wh / 2)}v${n2(wh)}M${n2(cx - ww / 2)},${n2(cy)}h${n2(ww)}`, stroke: frame, 'stroke-width': 1.1 }, g);
  }
  // השתקפות קטנה
  el('path', { d: `M${n2(cx - ww / 2 + 1.5)},${n2(cy - wh / 2 + 3.5)}l2.5,-2.5`, stroke: '#ffffff', 'stroke-width': .9, opacity: .8, 'stroke-linecap': 'round' }, g);
  if (box) {
    const by = cy + wh / 2 + .8;
    el('rect', { x: cx - ww / 2 - 1.5, y: by, width: ww + 3, height: 3, rx: .8, fill: '#8a5a35' }, g);
    let f = ''; for (let xx = cx - ww / 2; xx <= cx + ww / 2 + .1; xx += ww / 4) f += circ(xx, by - .4, 1.3);
    el('path', { d: f, fill: box }, g);
    el('path', { d: `M${n2(cx - ww / 2 - 1)},${n2(by - .2)}h${n2(ww + 2)}`, stroke: '#5c9e4a', 'stroke-width': 1 }, g);
  }
}

/* ───────── דלת ───────── */
export function doorAt(g: any, x: number, y: number, dw: number, dh: number, style: string, color: string) {
  const dk = shade(color, -.22);
  if (style === 'arch') el('path', { d: `M${n2(x - dw / 2)},${n2(y)}v${n2(-dh + dw / 2)}a${n2(dw / 2)},${n2(dw / 2)} 0 0 1 ${n2(dw)},0v${n2(dh - dw / 2)}Z`, fill: color, ...ST }, g);
  else el('rect', { x: x - dw / 2, y: y - dh, width: dw, height: dh, rx: style === 'round' ? 2.5 : .6, fill: color, ...ST }, g);
  if (style === 'panel') el('path', { d: `M${n2(x - dw / 2 + 2.2)},${n2(y - dh + 3)}h${n2(dw - 4.4)}v${n2(dh * .38)}h${n2(-dw + 4.4)}zM${n2(x - dw / 2 + 2.2)},${n2(y - dh * .5)}h${n2(dw - 4.4)}v${n2(dh * .4)}h${n2(-dw + 4.4)}z`, fill: 'none', stroke: dk, 'stroke-width': .7 }, g);
  else if (style === 'glass') el('rect', { x: x - dw / 2 + 2.4, y: y - dh + 3, width: dw - 4.8, height: dh * .35, rx: .8, fill: '#bfe6fb', stroke: dk, 'stroke-width': .6 }, g);
  else if (style === 'dutch') el('path', { d: `M${n2(x - dw / 2)},${n2(y - dh * .5)}h${n2(dw)}`, stroke: dk, 'stroke-width': .9 }, g);
  else if (style === 'planks') el('path', { d: `M${n2(x - dw / 6)},${n2(y - dh + 2)}V${n2(y)}M${n2(x + dw / 6)},${n2(y - dh + 2)}V${n2(y)}`, stroke: dk, 'stroke-width': .6 }, g);
  el('circle', { cx: x + dw * .26, cy: y - dh * .45, r: 1, fill: '#f4d06f' }, g);
}

/** בית עם גג. smoke=false: ארובה בלי עשן (מחוץ לכפר הנוף סטטי).
 *  snow: גג מושלג (בקתות בצפון), logs: קירות של בולי עץ (המרקם מצויר בחוץ) */
export function house(o: any) {
  const { x, y, w, wall: wall0, roof: roof0, chimney = false, smoke = true, win = 2, attic = false } = o;
  const rg = rngAt(x, y, 7);
  const snow = o.snow ?? (roof0 === '#ffffff'), logs = !!o.logs;
  // כל בונה בחר קצת אחרת: גוון, צורה, חומרים
  const wall = shade(wall0, rg.rand(-.05, .03));
  let roof = snow ? roof0 : shade(roof0, rg.rand(-.08, .06));
  const twoStorey = !snow && !logs && w >= 50 && rg.chance(.22);
  const h = o.h * (twoStorey ? 1.42 : rg.rand(.94, 1.08));
  let rh = (o.rh ?? w * .55) * rg.rand(.88, 1.12);
  const roofType: string = o.roofType ?? (snow ? rg.pick(['gable', 'steep', 'steep']) : rg.pick(['gable', 'gable', 'steep', 'hip', 'saltbox', 'gambrel', 'cross', 'hip']));
  let roofTex: string = snow ? 'plain' : rg.pick(['tiles', 'tiles', 'shingles', 'slate', 'thatch', 'plain']);
  if (roofTex === 'thatch') roof = rg.pick(['#d8b46c', '#cfa95e', '#dcbc78']);   // קש: תמיד בצבע קש
  const wallTex: string = logs ? 'none' : snow ? rg.pick(['boards', 'siding']) : rg.pick(['plaster', 'plaster', 'siding', 'boards', 'brick', 'stone', 'timber']);
  const winStyle: string = rg.pick(['cross', 'cross', 'arched', 'tall', 'wide', 'round']);
  const frame = rg.pick(['#ffffff', '#ffffff', '#f6eedf', '#5b3a22', '#3d4a5a']);
  const shutter = rg.chance(.42) ? rg.pick(SHUTTERS) : null;
  const box = rg.chance(.4) ? rg.pick(FLOWERS) : null;
  const doorColor = o.door ?? rg.pick(DOORS), doorStyle = rg.pick(['arch', 'arch', 'rect', 'panel', 'glass', 'dutch', 'planks', 'round']);
  const annex = !snow && rg.chance(.3) ? (rg.chance(.5) ? -1 : 1) : 0;
  if (roofType === 'gambrel') rh *= .85;

  const g = prop(y);
  const x0 = x - w / 2, x1 = x + w / 2, wy = y - h, e = rg.rand(4, 7);
  el('ellipse', { cx: x + 4 + annex * w * .15, cy: y + 1, rx: w * (annex ? .78 : .62), ry: 5, fill: 'rgba(40,70,20,.2)' }, g);

  // צורת הגג (בסיס הגג בגובה המרזב, קצת מעל הקיר)
  const b = wy + 2, L = x0 - e, R = x1 + e;
  let P: Pt[], hl: Pt[];
  if (roofType === 'hip') {
    const r = w * rg.rand(.12, .25), t = b - rh * .82;
    P = [[L, b], [x - r, t], [x + r, t], [R, b]]; hl = [[x + r * .2, t], [x + r, t], [R, b], [x + w * .15, b]];
  } else if (roofType === 'saltbox') {
    const px = x + (rg.chance(.5) ? -1 : 1) * w * .2, t = b - rh;
    P = [[L, b], [px, t], [R, b]]; hl = [[px, t], [R, b], [px + w * .12, b]];
  } else if (roofType === 'gambrel') {
    const t = b - rh * 1.1;
    P = [[L, b], [x0 + 1, b - rh * .55], [x - w * .2, t], [x + w * .2, t], [x1 - 1, b - rh * .55], [R, b]];
    hl = [[x + w * .2, t], [x1 - 1, b - rh * .55], [R, b], [x + w * .12, b]];
  } else {
    const t = b - rh * (roofType === 'steep' ? 1.25 : 1);
    P = [[L, b], [x, t], [R, b]]; hl = [[x, t], [R, b], [x + w * .1, b]];
  }
  const roofTop = Math.min(...P.map(p => p[1]));

  // ארובה (מאחורי הגג): צד, חומר וגובה משתנים
  let smokeAt: Pt | null = null;
  if (chimney) {
    const cx = x + (rg.chance(.6) ? 1 : -1) * w * rg.rand(.18, .3), cw = Math.max(5, w * .11), ct = topAt(P, cx) - rg.rand(6, 10);
    const brick = rg.chance(.5), cc = brick ? '#b5654a' : '#a49a8c';
    el('rect', { x: cx - cw / 2, y: ct, width: cw, height: b - ct, fill: cc, ...ST }, g);
    el('rect', { x: cx - cw / 2 - 1, y: ct - 1.5, width: cw + 2, height: 3, fill: shade(cc, -.15) }, g);
    smokeAt = [cx, ct - 4];
  }
  // אגף צדדי נמוך עם גג חד-שיפועי
  if (annex) {
    const aw = w * rg.rand(.28, .36), ah = h * rg.rand(.58, .7), ax = annex < 0 ? x0 - aw : x1, aWall = shade(wall, -.04);
    // קיר עם ראש משופע, וגג חד-שיפועי בעובי אחיד שיורד החוצה
    const inner = annex < 0 ? ax + aw : ax, outer = annex < 0 ? ax - 3 : ax + aw + 3, wo = annex < 0 ? ax : ax + aw;
    el('path', { d: poly([[inner, y], [inner, y - ah - 7], [wo, y - ah + 1], [wo, y]]), fill: aWall, ...ST }, g);
    el('path', { d: poly([[inner, y - ah - 11], [outer, y - ah - 1], [outer, y - ah + 3], [inner, y - ah - 7]]), fill: shade(roof, -.06), ...ST }, g);
    if (rg.chance(.55)) windowAt(g, ax + aw / 2, y - ah * .55, Math.min(8, aw * .5), Math.min(8, aw * .5), 'cross', frame, null, null);
    else el('rect', { x: ax + aw / 2 - 4, y: y - ah * .7, width: 8, height: ah * .7, fill: shade(doorColor, -.1), ...ST }, g);
  }
  // קיר
  el('rect', { x: x0, y: wy, width: w, height: h, fill: wall, ...ST }, g);
  wallTexture(g, x0, wy, w, h, wallTex, wall, rg);
  el('rect', { x: x0, y: wy, width: w * .12, height: h, fill: '#000', opacity: .04 }, g);
  if (twoStorey) el('path', { d: `M${n2(x0)},${n2(y - h * .5)}h${w}`, stroke: shade(wall, -.15), 'stroke-width': 1.2 }, g);
  // גג
  el('path', { d: poly(P), fill: roof, ...ST }, g);
  el('path', { d: poly(hl), fill: shade(roof, .1), opacity: .85 }, g);
  roofTexture(g, P, roofTex, roof, roofTop, b);
  if (roofType === 'cross') {
    // גמלון קטן מעל הכניסה
    const cw = w * .26, ct = b - rh * .55;
    el('path', { d: poly([[x - cw, b + 1], [x, ct], [x + cw, b + 1]]), fill: shade(roof, -.05), ...ST }, g);
    el('path', { d: poly([[x, ct], [x + cw, b + 1], [x + cw * .3, b + 1]]), fill: shade(roof, .08) }, g);
  }
  if (snow) {
    // שלג על שפת הגג
    const s = spanAt(P, b - 2.5);
    if (s) { let d = `M${n2(s[0])},${n2(b - 2)}`; for (let xx = s[0]; xx < s[1] - 4; xx += 6) d += `q3,${n2(rg.rand(2, 4))} 6,0`; el('path', { d, fill: 'none', stroke: '#ffffff', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g); }
  }
  // חלון בגג: עגול (attic) או גומחה עם חלון
  if (attic) {
    el('circle', { cx: x, cy: b - rh * .42, r: rh * .16, fill: '#fff7e0', ...ST }, g);
    el('path', { d: `M${n2(x - rh * .16)},${n2(b - rh * .42)}h${n2(rh * .32)}M${n2(x)},${n2(b - rh * .58)}v${n2(rh * .32)}`, stroke: '#c9a47a', 'stroke-width': 1 }, g);
  } else if (!snow && roofType !== 'cross' && rh > 26 && rg.chance(.3)) {
    const dx = x + (roofType === 'saltbox' ? 0 : rg.pick([-1, 0, 1]) * w * .14), dyb = b - rh * .22, dwid = 11;
    el('rect', { x: dx - dwid / 2, y: dyb - 9, width: dwid, height: 9, fill: wall, ...ST }, g);
    el('path', { d: poly([[dx - dwid / 2 - 2, dyb - 8], [dx, dyb - 15], [dx + dwid / 2 + 2, dyb - 8]]), fill: shade(roof, -.08), ...ST }, g);
    el('rect', { x: dx - 3, y: dyb - 7.5, width: 6, height: 6, fill: '#bfe6fb', stroke: frame, 'stroke-width': 1 }, g);
  }
  // פאנלים סולאריים (מגע מודרני) על השיפוע הימני
  if (!snow && roofTex !== 'thatch' && rg.chance(.12)) {
    let d = '', grid = '';
    for (let yy = b - 5; yy > roofTop + rh * .35; yy -= 5) {
      const s = spanAt(P, yy), s2 = spanAt(P, yy - 4.5); if (!s || !s2) continue;
      const a = x + w * .06, z = Math.min(s[1], s2[1]) - 4; if (z - a < 8) continue;
      d += `M${n2(a)},${n2(yy)}H${n2(z)}V${n2(yy - 4.5)}H${n2(a)}Z`;
      for (let xx = a + 5; xx < z; xx += 5) grid += `M${n2(xx)},${n2(yy)}v-4.5`;
    }
    el('path', { d, fill: '#2c4a7a', stroke: '#9fb3cc', 'stroke-width': .6 }, g);
    el('path', { d: grid, stroke: '#9fb3cc', 'stroke-width': .5 }, g);
  }
  // שבשבת על הרכס
  if (!snow && roofType !== 'hip' && roofType !== 'gambrel' && rg.chance(.12)) {
    const vx = P.reduce((a, p) => p[1] < a[1] ? p : a)[0];
    el('path', { d: `M${n2(vx)},${n2(roofTop)}v-10M${n2(vx - 4)},${n2(roofTop - 8)}h8l-2,-1.5M${n2(vx + 4)},${n2(roofTop - 8)}l-2,1.5`, stroke: '#3b3b46', 'stroke-width': .9, fill: 'none' }, g);
  }

  // דלת: תמיד במרכז (השביל במגרש מגיע אליה)
  // דלת בגובה אדם (אנשים: 31-37 יחידות), כמו שהבעלים ביקש
  const dh = Math.min(h - 4, 34) * rg.rand(.96, 1.02), dw = Math.max(13, dh * .47) * rg.rand(.94, 1.06);
  if (rg.chance(.3)) {   // מדרגה
    el('rect', { x: x - dw / 2 - 2.5, y: y - 1.5, width: dw + 5, height: 3, rx: 1, fill: '#cfc6b8', stroke: '#b3a999', 'stroke-width': .6 }, g);
  }
  doorAt(g, x, y, dw, dh, doorStyle, doorColor);
  const canopy = rg.pick([null, null, 'gable', 'flat']);
  if (canopy === 'gable') el('path', { d: poly([[x - dw / 2 - 4, y - dh - 1], [x, y - dh - 8], [x + dw / 2 + 4, y - dh - 1]]), fill: shade(roof, -.05), ...ST }, g);
  else if (canopy === 'flat') {
    el('rect', { x: x - dw / 2 - 4, y: y - dh - 4, width: dw + 8, height: 3, fill: shade(roof, -.05), ...ST }, g);
    el('path', { d: `M${n2(x - dw / 2 - 3)},${n2(y - dh - 1)}l3,3M${n2(x + dw / 2 + 3)},${n2(y - dh - 1)}l-3,3`, stroke: '#5b3a22', 'stroke-width': .8 }, g);
  }
  if (rg.chance(.35)) {   // פנס ליד הדלת
    const lx = x + (rg.chance(.5) ? -1 : 1) * (dw / 2 + 4);
    el('rect', { x: lx - 1.6, y: y - dh * .8, width: 3.2, height: 4, rx: .8, fill: '#ffe08a', stroke: '#3b3b46', 'stroke-width': .7 }, g);
  }

  // חלונות: הסידור מגיע מהנתונים, הסגנון מהבנאי
  const ww = Math.min(13, w * .2) * (winStyle === 'wide' ? 1.35 : winStyle === 'tall' ? .8 : 1), wh = winStyle === 'tall' ? ww * 1.6 : winStyle === 'wide' ? ww * .7 : ww * .95;
  const wins = win === 2 ? [x - w * .3, x + w * .3] : win === 4 ? [x - w * .33, x - w * .19, x + w * .19, x + w * .33] : [x + rg.pick([1, -1]) * w * .28];
  const rowY = twoStorey ? [y - h * .28, y - h * .76] : [y - h * .6];
  rowY.forEach((wy2, row) => {
    const xs = row === 0 ? wins : w > 54 ? [x - w * .28, x, x + w * .28] : [x - w * .26, x + w * .26];   // קומה שנייה: שניים או שלושה חלונות
    for (const wx of xs) {
      const shut = shutter && ww < 12 && win !== 4 ? shutter : null;
      windowAt(g, wx, wy2, row ? ww * .85 : ww, row ? wh * .85 : wh, winStyle, frame, shut, row ? null : box);
    }
  });

  // פרטים ליד הבית
  if (rg.chance(.22)) {   // קיסוס על פינה
    const side = rg.chance(.5) ? x0 : x1; let d = '';
    for (let i = 0; i < 9; i++) d += circ(side + rg.rand(-2.5, 2.5), y - rg.rand(2, h * .85), rg.rand(1.8, 3));
    el('path', { d, fill: '#5c9e4a' }, g);
  }
  if (rg.chance(.3)) {   // עציצים ליד הדלת
    const s = rg.chance(.5) ? -1 : 1, px = x + s * (dw / 2 + 6);
    el('path', { d: `M${n2(px - 3)},${n2(y)}l.8,-5h4.4l.8,5z`, fill: '#c46a3a' }, g);
    el('path', { d: circ(px, y - 7, 3), fill: '#5c9e4a' }, g);
    el('path', { d: circ(px - 1, y - 8, 1.2) + circ(px + 1.4, y - 7, 1.1), fill: rg.pick(FLOWERS) }, g);
  }
  if (rg.chance(.18)) {   // חבית מי גשם
    const bx = (rg.chance(.5) ? x0 + 4 : x1 - 4);
    el('rect', { x: bx - 3.5, y: y - 8, width: 7, height: 8, rx: 1.5, fill: '#7a5a3a', stroke: '#5b3a22', 'stroke-width': .6 }, g);
    el('path', { d: `M${n2(bx - 3.5)},${n2(y - 5.5)}h7M${n2(bx - 3.5)},${n2(y - 2.5)}h7`, stroke: '#5b3a22', 'stroke-width': .5 }, g);
  }

  if (chimney && smoke && smokeAt) chimneySmoke(smokeAt[0], smokeAt[1], Math.max(.7, w / 90));
  const ax0 = annex < 0 ? w * .36 : 0, ax1 = annex > 0 ? w * .36 : 0;
  block(x0 - ax0 - 14, roofTop - 10, x1 + ax1 + 14, y + 16);
  return g;
}
