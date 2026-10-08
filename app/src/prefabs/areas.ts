/* אזורים: מכלאה, אגמים, כיכר, שדות, מסילה, אי, אתר סקי ועוד */
import { el, n2, circ, shade, wrap1, blob, rrect, at, ST } from '../core/util';
import { rand, pick, R, rngAt } from '../core/rng';
import { ctx, prop, block, fxAt, WATERS, smokeFx } from '../world/context';
import { register } from './registry';
import { geo, ROAD_W } from '../world/geometry';
import { curvePts } from '../world/curve';
import { palm, roundTree } from './nature';
import { house } from './buildings';

/** מכלאה מגודרת עם ערמת חציר ושוקת */
function paddock(o: any) {
  const { x0, y0, x1, y1 } = o, G = ctx.L.groundProps;
  ctx.named[o.id || 'paddock'] = o;
  block(x0 - 20, y0 - 20, x1 + 20, y1 + 20);
  el('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, rx: 34, fill: '#d9a65a' }, G);
  let d = '';
  for (let i = 0; i < 70; i++) { const x = rand(x0 + 20, x1 - 20), y = rand(y0 + 20, y1 - 20); d += `M${n2(x)},${n2(y)}h${n2(rand(4, 10))}`; }
  el('path', { d, stroke: '#c8934c', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: .8 }, G);
  const fence = { x: x0 + 6, y: y0 + 6, width: x1 - x0 - 12, height: y1 - y0 - 12, rx: 30, fill: 'none', stroke: '#8a5a35', 'stroke-width': 3 };
  el('rect', fence, G);
  el('rect', { ...fence, y: y0 + 1, stroke: '#a06c40' }, G);
  let posts = '';
  for (let x = x0 + 40; x <= x1 - 40; x += 32) posts += rrect(x - 2.5, y0 - 4, 5, 15, 1.5) + rrect(x - 2.5, y1 - 14, 5, 15, 1.5);
  for (let y = y0 + 46; y <= y1 - 46; y += 32) posts += rrect(x0 + 3.5, y - 8, 5, 15, 1.5) + rrect(x1 - 8.5, y - 8, 5, 15, 1.5);
  el('path', { d: posts, fill: '#8a5a35' }, G);
  const hx = x1 - 41, hy = y1 - 40;
  el('path', { d: blob(hx, hy, 26, 14, 8, .08, 2), fill: '#f2cd5c', stroke: '#d6aa38', 'stroke-width': 1.2 }, G);
  let straw = '';
  for (let i = 0; i < 18; i++) { const x = hx + rand(-20, 20), y = hy + rand(-9, 7); straw += `M${n2(x)},${n2(y)}l${n2(rand(-4, 4))},${n2(rand(-3, 3))}`; }
  el('path', { d: straw, stroke: '#c99a2a', 'stroke-width': 1, 'stroke-linecap': 'round' }, G);
  el('rect', { x: x0 + 23, y: y1 - 40, width: 46, height: 14, rx: 4, fill: '#8a5a35' }, G);
  el('rect', { x: x0 + 27, y: y1 - 38, width: 38, height: 6, rx: 3, fill: '#7fd3ef' }, G);
}

/** אגם עם חוף, נצנוצים על המים וקני סוף */
function lake(o: any) {
  const L = ctx.L, { cx, cy, rx, ry } = o;
  WATERS.push(o); ctx.named[o.id || 'lake'] = o;
  const d = blob(cx, cy, rx, ry, 11, .07, 1.3);
  el('path', { d, fill: '#e9dcae', stroke: '#e9dcae', 'stroke-width': 16, 'stroke-linejoin': 'round' }, L.water);
  el('path', { d, fill: '#5ec6e8' }, L.water);
  el('path', { d: blob(cx - 6, cy - 8, rx * .78, ry * .8, 9, .06, 2.2), fill: '#72cfee' }, L.water);
  for (let i = 0; i < 14; i++) {
    const a = rand(0, Math.PI * 2), r = Math.sqrt(R()) * .78, x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    const e = el('path', { d: `M${n2(x)},${n2(y)}q4,-3 8,0q4,3 8,0`, fill: 'none', stroke: '#e8f8fd', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0 }, L.waterFx);
    const ph = rand(0, 6);
    fxAt(x + 8, y, 20, t => { const q = Math.sin(wrap1((t + ph) / 6) * Math.PI); e.setAttribute('opacity', (q * q * .9).toFixed(2)); e.setAttribute('transform', `translate(${n2(q * 6)},0)`); });
  }
  for (const [x, y] of o.reeds || []) {
    for (let i = 0; i < 5; i++) {
      const rx2 = x + rand(-8, 8), h = rand(14, 22), g = el('g', null, L.water);
      el('path', { d: `M${n2(rx2)},${n2(y)}q${n2(rand(-2, 2))},${n2(-h / 2)} ${n2(rand(-3, 3))},${n2(-h)}`, stroke: '#4f8f3a', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round' }, g);
      if (R() < .6) el('rect', { x: rx2 - 1.6, y: y - h - 1, width: 3.2, height: 7, rx: 1.6, fill: '#8a5a35' }, g);
    }
  }
}

/** רחבה מרוצפת */
function plaza(o: any) {
  const { x, y, rx = 120, ry = 50 } = o, G = ctx.L.groundProps;
  el('path', { d: blob(x, y, rx, ry, 9, .05, .4), fill: '#f1dec0', stroke: '#e5cba3', 'stroke-width': 2 }, G);
  let d = '';
  for (let i = 0; i < 90; i++) { const a = rand(0, 6.28), r = Math.sqrt(R()); d += circ(x + Math.cos(a) * (rx - 15) * r, y + Math.sin(a) * (ry - 10) * r, rand(1.2, 2.4)); }
  el('path', { d, fill: '#e6cfaa' }, G);
}

/** מזרקה: אגן, עמוד, טיפות ואדוות (הטיפות בשכבה הדינמית) */
function fountain(o: any) {
  const { x: fx, y: fy } = o, g = prop(fy + 6), F = ctx.L.fx;
  el('ellipse', { cx: fx, cy: fy, rx: 34, ry: 13, fill: '#c9d4dc', stroke: '#a3b1bb', 'stroke-width': 1.5 }, g);
  el('ellipse', { cx: fx, cy: fy - 1, rx: 28, ry: 9.5, fill: '#69cbeb' }, g);
  el('rect', { x: fx - 3.5, y: fy - 22, width: 7, height: 21, rx: 2, fill: '#c9d4dc', stroke: '#a3b1bb', 'stroke-width': 1 }, g);
  el('ellipse', { cx: fx, cy: fy - 22, rx: 10, ry: 3.5, fill: '#c9d4dc', stroke: '#a3b1bb', 'stroke-width': 1 }, g);
  for (let i = 0; i < 12; i++) {
    const dx = (i % 2 ? 1 : -1) * rand(12, 24);
    const e = el('circle', { cx: fx, cy: fy - 24, r: rand(1.1, 1.8), fill: '#bfeafa' }, F), d0 = i * .11;
    fxAt(fx, fy - 40, 50, t => { const p = wrap1((t + d0) / 1.3); e.setAttribute('transform', `translate(${n2(dx * p)},${n2(-80 * p * (1 - p) + 22 * p * p)})`); e.setAttribute('opacity', (1 - .8 * p).toFixed(2)); });
  }
  for (let i = 0; i < 3; i++) {
    const cx = fx + (i - 1) * 9, e = el('ellipse', { cx, cy: fy, rx: 6, ry: 2.2, fill: 'none', stroke: '#e8f8fd', 'stroke-width': 1 }, F);
    fxAt(cx, fy, 20, t => { const p = wrap1((t + i * .8) / 2.4), q = 1 - (1 - p) ** 2, s = .25 + 1.45 * q; e.setAttribute('transform', at(cx, fy, s, s)); e.setAttribute('opacity', (.9 * (1 - q)).toFixed(2)); });
  }
}

function flowerField(o: any) {
  const { x: X, y: Y, rx, ry, count = 420 } = o, G = ctx.L.groundProps;
  ctx.named[o.id || 'flowerField'] = o;
  el('path', { d: blob(X, Y, rx, ry, 10, .05, 3.1), fill: '#b5dd78' }, G);
  let petals = '', white = '', centers = '';
  for (let i = 0; i < count; i++) {
    const a = rand(0, 6.28), r = Math.sqrt(R()) * .95, x = X + Math.cos(a) * (rx - 6) * r, y = Y + Math.sin(a) * (ry - 6) * r, s = rand(1.4, 2.2);
    const ring = circ(x - s, y, s * .8) + circ(x + s, y, s * .8) + circ(x, y - s, s * .8) + circ(x, y + s, s * .8);
    if (R() < .82) petals += ring; else white += ring;
    centers += circ(x, y, s * .55);
  }
  el('path', { d: petals, fill: '#ffe14d' }, G);
  el('path', { d: white, fill: '#fff8f0' }, G);
  el('path', { d: centers, fill: '#f29e38' }, G);
  block(X - rx - 15, Y - ry - 13, X + rx + 16, Y + ry + 13);
}

function vegGarden(o: any) {
  const { x, y, w, h } = o, G = ctx.L.groundProps;
  el('rect', { x, y, width: w, height: h, rx: 10, fill: '#a9774a' }, G);
  let rows = '', heads = '';
  for (let r = 0; r < 4; r++) {
    const yy = y + 14 + r * 16; rows += `M${x + 10},${yy + 4}h${w - 20}`;
    for (let xx = x + 18; xx < x + w - 10; xx += 16) heads += circ(xx + (r % 2) * 8, yy, 4.6);
  }
  el('path', { d: rows, stroke: '#8a5f39', 'stroke-width': 4, 'stroke-linecap': 'round' }, G);
  el('path', { d: heads, fill: '#6cc04a' }, G);
  block(x - 10, y - 27, x + w + 10, y + h + 9);
}

function tent(o: any) {
  const { x: tx, y: ty } = o, g = prop(ty);
  el('ellipse', { cx: tx + 6, cy: ty + 1, rx: 52, ry: 6, fill: 'rgba(40,70,20,.22)' }, g);
  el('path', { d: `M${tx - 46},${ty}L${tx},${ty - 62}L${tx + 46},${ty}Z`, fill: '#f4a142', stroke: '#c9772a', 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, g);
  el('path', { d: `M${tx},${ty - 62}L${tx + 46},${ty}L${tx + 8},${ty}Z`, fill: '#f8b866' }, g);
  el('path', { d: `M${tx - 13},${ty}L${tx},${ty - 34}L${tx + 13},${ty}Z`, fill: '#9c5a22' }, g);
  el('path', { d: `M${tx},${ty - 62}l-6,-9M${tx},${ty - 62}l6,-9`, stroke: '#7a4f2a', 'stroke-width': 2, 'stroke-linecap': 'round' }, g);
}

/** מדורה: עצים, להבה מהבהבת לאט, זוהר ועשן, ובול עץ לישיבה */
function campfire(o: any) {
  const { x: fx, y: fy } = o, F = ctx.L.fx;
  ctx.named[o.id || 'campfire'] = o;
  const f = el('g', null, F);
  const glow = el('circle', { cx: fx, cy: fy - 6, r: 26, fill: 'url(#fireGlow)', opacity: .4 }, f);
  el('path', { d: `M${fx - 11},${fy + 2}l22,-6M${fx - 11},${fy - 4}l22,6`, stroke: '#7a4f2a', 'stroke-width': 4, 'stroke-linecap': 'round' }, f);
  const fl = el('g', null, f), bx = fx, by = fy - 2;
  fxAt(fx, fy - 6, 40, t => {
    const u = (Math.sin(t * 2.6) + 1) / 2, w = (Math.sin(t * 3.4) + 1) / 2;
    fl.setAttribute('transform', `translate(${bx},${by}) scale(${(.92 + .14 * u).toFixed(3)},${(.9 + .22 * w).toFixed(3)}) skewX(${(-4 + 9 * u).toFixed(1)}) translate(${-bx},${-by})`);
    glow.setAttribute('opacity', (.35 + .25 * (Math.sin(t * 2) + 1) / 2).toFixed(2));
  });
  el('path', { d: `M${fx - 8},${fy - 2}q-2,-10 4,-18q0,7 4,9q2,-8 0,-12q8,7 8,15q0,6 -4,6z`, fill: '#ff7a2f' }, fl);
  el('path', { d: `M${fx - 4},${fy - 2}q-1,-6 3,-11q1,5 3,6q3,4 1,5z`, fill: '#ffd34d' }, fl);
  for (let i = 0; i < 3; i++)
    smokeFx(el('circle', { cx: fx + 2, cy: fy - 22, r: 4, fill: '#ece9e2', opacity: 0 }, ctx.L.air), fx + 2, fy - 22, i * 1.6);
  const lg = prop(fy + 4);
  el('rect', { x: fx + 24, y: fy - 6, width: 30, height: 9, rx: 4.5, fill: '#9c6a3c', stroke: '#7a4f2a', 'stroke-width': 1 }, lg);
  el('ellipse', { cx: fx + 52, cy: fy - 1.5, rx: 3, ry: 4.5, fill: '#d9a97a', stroke: '#7a4f2a', 'stroke-width': 1 }, lg);
}

/** שדה מפוספס (חיטה, ירקות, לבנדר) */
function field(o: any) {
  const { x, y, w, h, a, b, vertical } = o, G = ctx.L.groundProps;
  el('rect', { x, y, width: w, height: h, rx: 8, fill: a, stroke: shade(a, -.12), 'stroke-width': 2 }, G);
  let d = '';
  if (vertical) for (let xx = x + 10; xx < x + w - 4; xx += 12) d += `M${xx},${y + 6}v${h - 12}`;
  else for (let yy = y + 10; yy < y + h - 4; yy += 12) d += `M${x + 6},${yy}h${w - 12}`;
  el('path', { d, stroke: b, 'stroke-width': 4, 'stroke-linecap': 'round' }, G);
  block(x - 8, y - 8, x + w + 8, y + h + 8);
}

function vineyard(o: any) {
  const { x0, x1, y0, y1 } = o, G = ctx.L.groundProps;
  let rows = '', grapes = '';
  for (let x = x0; x < x1; x += 16) { rows += `M${x},${y0}v${y1 - y0}`; for (let y = y0 + 10; y < y1 - 5; y += 22) grapes += circ(x + (y % 44 ? 3 : -3), y, 3.2); }
  el('path', { d: rows, stroke: '#8a5f39', 'stroke-width': 1.6 }, G);
  el('path', { d: grapes, fill: '#6aa84f' }, G);
  block(x0 - 12, y0 - 10, x0 + 108, y1 + 10);
}

function orchard(o: any) {
  const { x, y, rows, cols, dx = 46, dy = 48, skipX } = o;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const tx = x + c * dx + (r % 2) * dx / 2, ty = y + r * dy;
    if (skipX !== undefined && Math.abs(tx - skipX) < 40) continue;   // משאירים מקום לדרך
    roundTree(tx, ty, 1.15, true);
  }
  block(x - 30, y - 40, x + cols * dx + 124, y + rows * dy + 4);
}

/** מסילת רכבת לרוחב העולם, עם גשר מעל הנהר ומעבר מפלסי */
function railway(o: any) {
  const { y, bridgeX } = o, { B } = ctx, G = ctx.L.groundProps;
  let sl = '';
  for (let x = B.x0; x <= B.x1; x += 14) sl += rrect(x - 2.5, y - 11, 5, 22, 1);
  el('path', { d: sl, fill: '#8a5f39' }, G);
  el('path', { d: `M${B.x0},${y - 6}H${B.x1}M${B.x0},${y + 6}H${B.x1}`, stroke: '#7d868b', 'stroke-width': 2.4 }, G);
  if (bridgeX !== undefined) {
    el('rect', { x: bridgeX, y: y - 16, width: 82, height: 4, fill: '#6b4a2f' }, G);
    el('rect', { x: bridgeX, y: y + 12, width: 82, height: 4, fill: '#6b4a2f' }, G);
  }
  /* מעבר מסילה (כלל: שביל או דרך לא עוברים "מתחת" למסילה): בכל מקום שבו העקומה המצוירת של דרך או שביל חוצה את המסילה,
     משטח קרשים בצבע הדרך בין הפסים ומעבר להם, והפסים נשארים גלויים מעליו. מחושב אוטומטית, גם לשבילים עתידיים */
  const cross: { x: number; a: number; hw: number; road: boolean }[] = [];
  const scan = (P: number[][], hw: number, road: boolean) => {
    for (let i = 0; i < P.length - 1; i++) {
      const p = P[i], q = P[i + 1];
      if ((p[1] - y) * (q[1] - y) > 0 || p[1] === q[1]) continue;
      const x = p[0] + (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]);
      if (!cross.some(c => Math.abs(c.x - x) < 20)) cross.push({ x, a: Math.atan2(q[1] - p[1], q[0] - p[0]), hw, road });
    }
  };
  for (const E of [...geo.EDGES, ...geo.OUTER]) scan(E.pts, ROAD_W / 2, true);
  for (const t of ctx.world.trails) scan(curvePts(t), 6, false);
  for (const c of cross) {
    // משטח מקביל למסילה, ברוחב הדרך כפי שהיא חותכת את המסילה (גם כשהיא חוצה באלכסון)
    const w = (c.hw + 3) / Math.max(.35, Math.abs(Math.sin(c.a))), sk = Math.cos(c.a) / (Math.sin(c.a) || 1) * 13;
    el('path', { d: `M${n2(c.x - w - sk)},${y - 13}h${n2(2 * w)}l${n2(2 * sk)},26h${n2(-2 * w)}z`, fill: c.road ? '#e7cfa8' : '#e3c9a2', stroke: '#b98a5c', 'stroke-width': .8 }, G);
    let pl = ''; for (let k = -10; k <= 10; k += 5) pl += `M${n2(c.x - w - sk * k / -13)},${y + k}h${n2(2 * w)}`;
    el('path', { d: pl, stroke: '#c9a77d', 'stroke-width': .6 }, G);
    el('path', { d: `M${n2(c.x - w - sk * 6 / 13 - 2)},${y - 6}h${n2(2 * w + 4)}M${n2(c.x - w + sk * 6 / 13 - 2)},${y + 6}h${n2(2 * w + 4)}`, stroke: '#7d868b', 'stroke-width': 2.4 }, G);   // הפסים מעל המשטח
  }
  block(B.x0, y - 30, B.x1, y + 26);
}

/** רכבת חונה: קטר ושני קרונות */
function train(o: any) {
  const { x, y, cars = 2 } = o, tg = prop(y + 8);
  const car = (cx: number, w: number, c: string) => {
    el('rect', { x: cx, y: y - 30, width: w, height: 26, rx: 4, fill: c, stroke: shade(c, -.25), 'stroke-width': 1.2 }, tg);
    for (let k = cx + 8; k < cx + w - 12; k += 18) el('rect', { x: k, y: y - 24, width: 12, height: 9, rx: 1.5, fill: '#cdeefa' }, tg);
    for (const wx of [cx + 10, cx + w - 10]) el('circle', { cx: wx, cy: y - 2, r: 5, fill: '#3b3330' }, tg);
  };
  for (let i = 0; i < cars; i++) car(x + i * 74, 70, '#4f86c6');
  const lx = x + cars * 74;
  el('rect', { x: lx, y: y - 34, width: 64, height: 30, rx: 5, fill: '#e2574c', stroke: '#a33223', 'stroke-width': 1.2 }, tg);
  el('rect', { x: lx + 32, y: y - 50, width: 26, height: 18, rx: 3, fill: '#e2574c', stroke: '#a33223', 'stroke-width': 1.2 }, tg);
  el('rect', { x: lx + 36, y: y - 46, width: 18, height: 9, rx: 1.5, fill: '#cdeefa' }, tg);
  el('rect', { x: lx + 6, y: y - 48, width: 9, height: 16, fill: '#3b3b46' }, tg);
  el('path', { d: `M${lx + 64},${y - 6}l10,6h-10z`, fill: '#3b3b46' }, tg);
  for (const wx of [lx + 12, lx + 32, lx + 52]) el('circle', { cx: wx, cy: y - 2, r: 6, fill: '#3b3330' }, tg);
}

/** אגם הרים */
function mountainLake(o: any) {
  const { cx, cy, rx, ry } = o, L = ctx.L; WATERS.push(o);
  const d = blob(cx, cy, rx, ry, 10, .08, 5);
  el('path', { d, fill: '#e9dcae', stroke: '#e9dcae', 'stroke-width': 14, 'stroke-linejoin': 'round' }, L.water);
  el('path', { d, fill: '#6fc6e4' }, L.water);
  el('path', { d: blob(cx - 10, cy - 6, rx * .7, ry * .6, 8, .06, 2), fill: '#8ad3ec' }, L.water);
}

/** רכבל: עמודים, כבל ושני קרונות (עומדים) */
function cableCar(o: any) {
  const { a, b } = o;
  el('path', { d: `M${a[0]},${a[1] - 40}L${b[0]},${b[1] - 40}M${a[0] + 8},${a[1] - 36}L${b[0] + 8},${b[1] - 36}`, stroke: '#4a4a55', 'stroke-width': 1.2 }, ctx.L.groundProps);
  for (const t of [0, .5, 1]) {
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, g = prop(y);
    el('path', { d: `M${x - 6},${y}L${x},${y - 42}L${x + 6},${y}M${x - 4},${y - 14}h8M${x - 8},${y - 42}h24`, stroke: '#6b6f78', 'stroke-width': 2, fill: 'none' }, g);
  }
  for (const t of [.27, .74]) {
    const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - 38, g = prop(y + 60);
    el('path', { d: `M${x},${y}v8`, stroke: '#4a4a55', 'stroke-width': 1.2 }, g);
    el('rect', { x: x - 9, y: y + 8, width: 18, height: 15, rx: 3, fill: t < .5 ? '#e2574c' : '#3d9bd9', stroke: 'rgba(0,0,0,.3)', 'stroke-width': .8 }, g);
    el('rect', { x: x - 6, y: y + 11, width: 12, height: 6, rx: 1.5, fill: '#cdeefa' }, g);
  }
}

function ruins(o: any) {
  const { x, y } = o;
  el('path', { d: blob(x, y - 10, 70, 34, 8, .1, 3), fill: '#e6dcc4' }, ctx.L.groundProps);
  for (const [cx, h] of [[-50, 46], [-25, 20], [0, 46], [25, 30], [50, 46]]) {
    const g = prop(y - 4);
    el('rect', { x: x + cx - 6, y: y - 4 - h, width: 12, height: h, fill: '#efe8d8', ...ST }, g);
    el('path', { d: `M${x + cx - 2},${y - 6}v${-h + 6}M${x + cx + 2},${y - 6}v${-h + 6}`, stroke: '#d6ccb6', 'stroke-width': 1 }, g);
    el('rect', { x: x + cx - 8, y: y - 8, width: 16, height: 5, fill: '#e2d9c5', ...ST }, g);
    if (h > 40) el('rect', { x: x + cx - 8, y: y - 6 - h, width: 16, height: 5, fill: '#e2d9c5', ...ST }, g);
  }
  const g = prop(y - 50); el('rect', { x: x - 58, y: y - 62, width: 66, height: 8, fill: '#e2d9c5', ...ST }, g);
  for (const [bx, by] of [[x + 40, y + 14], [x - 30, y + 18], [x + 64, y - 2]]) el('rect', { x: bx, y: by, width: 14, height: 8, rx: 1.5, fill: '#e2d9c5', ...ST, transform: `rotate(${rand(-25, 25).toFixed(0)} ${bx} ${by})` }, ctx.L.groundProps);
  block(x - 80, y - 75, x + 85, y + 30);
}

/** גן משחקים (משימה 19): משטח גומי רך עם מסגרת עץ, ומשטחים צבעוניים מתחת למתקנים.
 *  נדנדות עץ עם שלוש נדנדות שמתנדנדות, מגדל עם גג אדום, סולם, קיר טיפוס ומגלשה מתפתלת, ארגז חול עם דלי, את וטירה,
 *  קרוסלה שמסתובבת לאט, נדנדת מאזניים, וכיפת טיפוס. החלקים הזזים מצוירים בשכבה הדינמית (fx) ומונפשים רק כשהם על המסך */
function playground(o: any) {
  const { x, y } = o, G = ctx.L.groundProps, F = ctx.L.fx, W = 100, H = 90, wood = '#9a6a40', woodD = '#6e4a2c';
  // משטח: גומי רך, מסגרת עץ, ושביל כניסה מהצד המערבי
  el('path', { d: rrect(x - W - 4, y - H - 4, 2 * W + 8, 2 * H + 8, 18), fill: woodD }, G);
  el('path', { d: rrect(x - W, y - H, 2 * W, 2 * H, 15), fill: '#e8cfa8' }, G);
  let spk = ''; for (let i = 0; i < 160; i++) { const v = rngAt(x + i, y, 61); spk += circ(x - W + 6 + v.r() * (2 * W - 12), y - H + 6 + v.r() * (2 * H - 12), .7); }
  el('path', { d: spk, fill: '#dcbf95' }, G);   // גרגרי הגומי
  el('path', { d: `M${x - W - 5},${y + 6}h-34v20h34z`, fill: '#ecd7b5' }, G);   // כניסה
  el('path', { d: `M${x - W - 4},${y + 6}v20`, stroke: '#e8cfa8', 'stroke-width': 6 }, G);
  // משטחים צבעוניים מתחת למתקנים
  el('path', { d: rrect(x - 92, y - 70, 76, 46, 10), fill: '#9fd48a' }, G);    // נדנדות
  el('path', { d: rrect(x + 8, y - 72, 86, 52, 10), fill: '#8fc3e0' }, G);     // מגדל ומגלשה
  el('ellipse', { cx: x - 4, cy: y + 14, rx: 30, ry: 16, fill: '#f2b8c6' }, G); // קרוסלה
  el('ellipse', { cx: x + 62, cy: y + 52, rx: 30, ry: 15, fill: '#f6d77a' }, G); // כיפת טיפוס

  /* נדנדות: שתי מסגרות A, קורה עליונה, ושלוש נדנדות שמתנדנדות כל אחת בקצב משלה */
  const sx = x - 54, top = y - 66, base = y - 30;
  let g = prop(base);
  for (const fx of [sx - 32, sx + 32]) el('path', { d: `M${fx - 8},${base}L${fx},${top}L${fx + 8},${base}M${fx - 4},${base - 14}h8`, stroke: wood, 'stroke-width': 2.6, 'stroke-linecap': 'round', fill: 'none' }, g);
  el('path', { d: `M${sx - 34},${top}H${sx + 34}`, stroke: woodD, 'stroke-width': 3.4, 'stroke-linecap': 'round' }, g);
  ['#e2574c', '#3d9bd9', '#ffd23f'].forEach((c, i) => {
    const px = sx - 18 + i * 18, sw = el('g', null, F), ph = i * 1.9, amp = [9, 4, 14][i];
    el('path', { d: `M${px - 3.4},${top}L${px - 3.4},${top + 24}M${px + 3.4},${top}L${px + 3.4},${top + 24}`, stroke: '#7c8088', 'stroke-width': .8 }, sw);
    el('path', { d: rrect(px - 5, top + 23, 10, 3, 1.2), fill: c, stroke: shade(c, -.3), 'stroke-width': .5 }, sw);
    fxAt(px, top + 12, 30, t => sw.setAttribute('transform', `rotate(${(Math.sin(t * 1.5 + ph) * amp).toFixed(1)} ${px} ${top})`));
  });

  /* מגדל עם גג, סולם, קיר טיפוס ומגלשה מתפתלת */
  const tx = x + 40, tb = y - 32, plat = tb - 24;
  g = prop(tb + 1);
  el('path', { d: `M${tx - 12},${tb}V${plat - 22}M${tx + 12},${tb}V${plat - 22}`, stroke: wood, 'stroke-width': 2.4 }, g);
  el('path', { d: rrect(tx - 15, plat - 2, 30, 5, 1.5), fill: '#c99a64', stroke: woodD, 'stroke-width': .6 }, g);   // רצפת המגדל
  el('path', { d: `M${tx - 12},${plat - 8}h24M${tx - 12},${plat - 14}h24`, stroke: wood, 'stroke-width': 1.2 }, g);  // מעקה
  el('path', { d: `M${tx - 16},${plat - 21}L${tx},${plat - 36}L${tx + 16},${plat - 21}Z`, fill: '#e2574c', stroke: '#a33223', 'stroke-width': .8 }, g);   // גג
  el('path', { d: `M${tx},${plat - 36}v-6`, stroke: woodD, 'stroke-width': 1 }, g);
  el('path', { d: `M${tx},${plat - 42}l7,2.4l-7,2.4z`, fill: '#ffd23f' }, g);   // דגלון
  // סולם בצד שמאל
  el('path', { d: `M${tx - 24},${tb}L${tx - 15},${plat}M${tx - 19},${tb}L${tx - 10},${plat}`, stroke: woodD, 'stroke-width': 1.4 }, g);
  let rungs = ''; for (let k = 1; k < 5; k++) { const u = k / 5; rungs += `M${n2(tx - 24 + 9 * u)},${n2(tb - 24 * u)}h5`; }
  el('path', { d: rungs, stroke: woodD, 'stroke-width': 1.1 }, g);
  // קיר טיפוס מתחת לרצפה, עם אחיזות צבעוניות
  el('path', { d: rrect(tx - 11, plat + 3, 22, 20, 1.5), fill: '#7ab8de', stroke: '#4f8fb8', 'stroke-width': .6 }, g);
  el('path', { d: circ(tx - 6, plat + 8, 1.2) + circ(tx + 4, plat + 7, 1.1) + circ(tx - 1, plat + 13, 1.2) + circ(tx + 7, plat + 16, 1.1) + circ(tx - 7, plat + 18, 1.1), fill: '#ff7aa2' }, g);
  el('path', { d: circ(tx + 1, plat + 18, 1) + circ(tx - 3, plat + 4, 1) + circ(tx + 8, plat + 11, 1), fill: '#ffd23f' }, g);
  // מגלשה מתפתלת לימין
  el('path', { d: `M${tx + 13},${plat}C${tx + 30},${plat + 2} ${tx + 26},${tb - 4} ${tx + 46},${tb - 6}L${tx + 52},${tb - 2}`, stroke: '#e0a92a', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round' }, g);
  el('path', { d: `M${tx + 13},${plat - 1}C${tx + 30},${plat + 1} ${tx + 26},${tb - 5} ${tx + 46},${tb - 7}L${tx + 52},${tb - 3}`, stroke: '#ffd23f', 'stroke-width': 4.4, fill: 'none', 'stroke-linecap': 'round' }, g);
  el('path', { d: `M${tx + 36},${tb - 6}v6M${tx + 22},${plat + 6}v${tb - plat - 6}`, stroke: '#7c8088', 'stroke-width': 1 }, g);

  /* ארגז חול: מסגרת עץ, חול, דלי, את וטירה קטנה */
  const bx = x - 84, by = y + 26;
  el('path', { d: rrect(bx, by, 52, 38, 3), fill: wood }, G);
  el('path', { d: rrect(bx + 4, by + 4, 44, 30, 2), fill: '#f3e2b5' }, G);
  el('path', { d: blob(bx + 30, by + 22, 9, 5, 7, .2, 2), fill: '#e9d29c' }, G);
  g = prop(by + 30);
  el('path', { d: `M${bx + 26},${by + 22}h10v-5h-2v2h-2v-2h-2v2h-2v-2h-2z`, fill: '#e2c98c', stroke: '#c9a466', 'stroke-width': .5 }, g);   // טירה
  el('path', { d: `M${bx + 12},${by + 26}l1,-6h6l1,6z`, fill: '#e2574c' }, g);   // דלי
  el('path', { d: `M${bx + 13},${by + 20}q3,-3 6,0`, fill: 'none', stroke: '#a33223', 'stroke-width': .6 }, g);
  el('path', { d: `M${bx + 40},${by + 14}l-6,8`, stroke: '#3d9bd9', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, g);
  el('path', { d: `M${bx + 33},${by + 22}l1.6,1.8l1.8,-1.4z`, fill: '#3d9bd9' }, g);

  /* קרוסלה שמסתובבת: דיסקה צבעונית עם ידיות; המחיצות והידיות זזות סביב (באליפסה, בפרספקטיבה) */
  const cx = x - 4, cy = y + 10, R = 20, Ry = 8;
  g = prop(cy + 10);
  el('ellipse', { cx, cy: cy + 3, rx: R, ry: Ry, fill: '#c9603f' }, g);
  const disc = el('g', null, F), segs = el('path', { stroke: '#fff', 'stroke-width': 1, opacity: .9 }, disc), bars = el('path', { stroke: '#4a4a55', 'stroke-width': 1.2, 'stroke-linecap': 'round', fill: 'none' }, disc);
  el('ellipse', { cx, cy, rx: R, ry: Ry, fill: '#3d9bd9', stroke: '#2a6fa8', 'stroke-width': .8 }, disc);
  const colors = ['#e2574c', '#ffd23f', '#45a85a', '#ef6fa4'];
  const wedges = colors.map(c => el('path', { fill: c, opacity: .85 }, disc));
  disc.appendChild(segs); disc.appendChild(bars);
  el('path', { d: `M${cx},${cy}v-12`, stroke: '#4a4a55', 'stroke-width': 1.6 }, disc);
  el('circle', { cx, cy: cy - 12, r: 1.6, fill: '#ffd23f' }, disc);
  fxAt(cx, cy, 30, t => {
    const a0 = t * .45;
    let s = '', b = '';
    wedges.forEach((wg: any, i: number) => {
      const a = a0 + i * Math.PI / 2, a2 = a + Math.PI / 4;
      wg.setAttribute('d', `M${cx},${cy}L${n2(cx + Math.cos(a) * R)},${n2(cy + Math.sin(a) * Ry)}A${R},${Ry} 0 0 1 ${n2(cx + Math.cos(a2) * R)},${n2(cy + Math.sin(a2) * Ry)}Z`);
    });
    for (let i = 0; i < 4; i++) {
      const a = a0 + i * Math.PI / 2 + Math.PI / 8, ex = cx + Math.cos(a) * R * .8, ey = cy + Math.sin(a) * Ry * .8;
      s += `M${cx},${cy}L${n2(cx + Math.cos(a - Math.PI / 8) * R)},${n2(cy + Math.sin(a - Math.PI / 8) * Ry)}`;
      b += `M${n2(ex)},${n2(ey)}v-7h${n2(Math.cos(a + Math.PI / 2) * 3)}`;   // ידיות
    }
    segs.setAttribute('d', s); bars.setAttribute('d', b);
  });

  /* נדנדת מאזניים: קורה שמתנדנדת סביב ציר, מושבים וידיות בקצוות */
  const kx = x + 24, ky = y + 56;
  g = prop(ky + 1);
  el('path', { d: `M${kx - 5},${ky}L${kx},${ky - 9}L${kx + 5},${ky}Z`, fill: '#e2574c', stroke: '#a33223', 'stroke-width': .6 }, g);
  const plank = el('g', null, F);
  el('path', { d: rrect(kx - 26, ky - 11, 52, 3, 1.4), fill: '#45a85a', stroke: '#2f7a3f', 'stroke-width': .5 }, plank);
  el('path', { d: `M${kx - 20},${ky - 11}v-5h3M${kx + 20},${ky - 11}v-5h-3`, stroke: '#4a4a55', 'stroke-width': 1.1, fill: 'none' }, plank);
  el('path', { d: rrect(kx - 25, ky - 13, 7, 2.4, 1) + rrect(kx + 18, ky - 13, 7, 2.4, 1), fill: '#ffd23f' }, plank);
  fxAt(kx, ky - 10, 30, t => plank.setAttribute('transform', `rotate(${(Math.sin(t * 1.1) * 12).toFixed(1)} ${kx} ${ky - 9})`));

  /* כיפת טיפוס: קשתות צבעוניות */
  const dx = x + 62, dy = y + 52;
  g = prop(dy + 2);
  const arc = (rx: number, ry: number, c: string) => el('path', { d: `M${dx - rx},${dy}A${rx},${ry} 0 0 1 ${dx + rx},${dy}`, fill: 'none', stroke: c, 'stroke-width': 1.6 }, g);
  arc(22, 22, '#e2574c'); arc(15, 21.4, '#3d9bd9'); arc(7, 20.6, '#45a85a');
  el('path', { d: `M${dx - 21},${dy - 7}Q${dx},${dy - 11} ${dx + 21},${dy - 7}M${dx - 17},${dy - 14}Q${dx},${dy - 18} ${dx + 17},${dy - 14}M${dx - 9},${dy - 19.4}Q${dx},${dy - 21.6} ${dx + 9},${dy - 19.4}`, fill: 'none', stroke: '#ffd23f', 'stroke-width': 1.3 }, g);

  // פח אשפה ליד הכניסה
  g = prop(y + 32);
  el('path', { d: rrect(x - 96, y + 22, 7, 10, 1.4), fill: '#4f8a5a', stroke: '#2f5f3a', 'stroke-width': .6 }, g);
  el('path', { d: rrect(x - 97, y + 20, 9, 2.4, 1), fill: '#2f5f3a' }, g);
  block(x - W - 10, y - H - 40, x + W + 10, y + H + 10);
}

/** בריכת דייגים עם רציף וסירת משוטים */
function fishingPond(o: any) {
  const { cx, cy, rx, ry } = o, L = ctx.L; WATERS.push(o);
  const d = blob(cx, cy, rx, ry, 9, .08, 6);
  el('path', { d, fill: '#e9dcae', stroke: '#e9dcae', 'stroke-width': 12, 'stroke-linejoin': 'round' }, L.water);
  el('path', { d, fill: '#5ec6e8' }, L.water);
  const dx = cx + 85, dy = cy - 12;
  el('rect', { x: dx, y: dy, width: 50, height: 14, fill: '#b98552', stroke: '#8a5f39', 'stroke-width': 1 }, L.water);
  let pl = ''; for (let k = dx + 2; k < dx + 50; k += 6) pl += `M${k},${dy}v14`;
  el('path', { d: pl, stroke: '#8a5f39', 'stroke-width': .8 }, L.water);
  el('path', { d: `M${cx - 50},${cy + 15}q20,10 40,0l-4,-6h-32z`, fill: '#c46a3a', stroke: '#8a5f39', 'stroke-width': 1 }, L.water);
  el('path', { d: `M${cx - 48},${cy + 14}l-10,6M${cx - 12},${cy + 14}l10,6`, stroke: '#6b4a2f', 'stroke-width': 1.4 }, L.water);
}

function footballPitch(o: any) {
  const { x, y, w = 260, h = 150 } = o, g = el('g', null, ctx.L.groundProps);
  el('rect', { x: x - 8, y: y - 8, width: w + 16, height: h + 16, rx: 6, fill: '#7fbf4f' }, g);
  let st = ''; for (let k = 0; k < w; k += 26) if ((k / 26) % 2 === 0) st += `M${x + k},${y}h26v${h}h-26z`;
  el('rect', { x, y, width: w, height: h, fill: '#6fb543' }, g); el('path', { d: st, fill: '#79bf4b' }, g);
  el('path', { d: `M${x},${y}h${w}v${h}h-${w}zM${x + w / 2},${y}v${h}M${x},${y + 45}h30v60h-30M${x + w},${y + 45}h-30v60h30`, fill: 'none', stroke: '#fff', 'stroke-width': 2 }, g);
  el('circle', { cx: x + w / 2, cy: y + h / 2, r: 20, fill: 'none', stroke: '#fff', 'stroke-width': 2 }, g);
  el('path', { d: `M${x - 6},${y + 60}h6v30h-6zM${x + w},${y + 60}h6v30h-6z`, fill: '#fff', stroke: '#bbb', 'stroke-width': .6 }, g);
  block(x - 20, y - 20, x + w + 20, y + h + 20);
}

/** מבוך משוכות: נוצר כמבוך מושלם (חיפוש לעומק), אז אפשר באמת לפתור אותו */
function maze(o: any) {
  const { x: x0, y: y0, n: N = 9, cell: c = 18 } = o, G = ctx.L.groundProps;
  const seen = new Uint8Array(N * N), walls = new Set<string>();
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { walls.add(`h${i},${j}`); walls.add(`v${i},${j}`); }
  const stack = [[0, 0]]; seen[0] = 1;
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => [i + di, j + dj, di, dj]).filter(([a, b]) => a >= 0 && b >= 0 && a < N && b < N && !seen[b * N + a]);
    if (!nb.length) { stack.pop(); continue; }
    const [a, b, di] = nb[Math.floor(R() * nb.length)];
    if (di) walls.delete(`v${Math.max(i, a)},${j}`); else walls.delete(`h${i},${Math.max(j, b)}`);
    seen[b * N + a] = 1; stack.push([a, b]);
  }
  let d = `M${x0},${y0}h${N * c}v${N * c}h${-N * c}z`;
  for (const wk of walls) {
    const [i, j] = wk.slice(1).split(',').map(Number);
    if (wk[0] === 'v' && i > 0) d += `M${x0 + i * c},${y0 + j * c}v${c}`;
    if (wk[0] === 'h' && j > 0) d += `M${x0 + i * c},${y0 + j * c}h${c}`;
  }
  el('rect', { x: x0 - 6, y: y0 - 6, width: N * c + 12, height: N * c + 12, rx: 6, fill: '#e9dcae' }, G);
  el('path', { d, fill: 'none', stroke: '#3f8a3a', 'stroke-width': 7, 'stroke-linecap': 'square' }, G);
  el('path', { d, fill: 'none', stroke: '#58a84a', 'stroke-width': 3.2, 'stroke-linecap': 'square' }, G);
  el('rect', { x: x0 - 3, y: y0 + N * c - c + 3, width: 8, height: c - 6, fill: '#e9dcae' }, G);
  block(x0 - 20, y0 - 20, x0 + N * c + 20, y0 + N * c + 20);
}

function sunflowerField(o: any) {
  const { x: x0, y: y0, w = 340, h = 250, rows = 9, cols = 15 } = o, G = ctx.L.groundProps;
  el('rect', { x: x0, y: y0, width: w, height: h, rx: 8, fill: '#8cbf4f' }, G);
  let st = '', hd = '', ct = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + 14 + c * 22 + (r % 2) * 8, y = y0 + 22 + r * 26;
    st += `M${x},${y + 4}v9`; hd += circ(x, y, 6.2); ct += circ(x, y, 2.6);
  }
  el('path', { d: st, stroke: '#4f8f3a', 'stroke-width': 1.6 }, G);
  el('path', { d: hd, fill: '#ffcd29' }, G); el('path', { d: ct, fill: '#7a4a24' }, G);
  block(x0 - 8, y0 - 8, x0 + w + 8, y0 + h + 8);
}

/** אי עם חוף, עצי דקל וצריף */
function island(o: any) {
  const { cx, cy, rx, ry } = o, L = ctx.L;
  el('path', { d: blob(cx, cy, rx + 14, ry + 12, 10, .07, 7), fill: '#8ad3ec' }, L.water);
  el('path', { d: blob(cx, cy, rx, ry, 10, .07, 7), fill: '#f3dfb0' }, L.water);
  el('path', { d: blob(cx + 10, cy - 6, rx * .6, ry * .5, 8, .1, 3), fill: '#b5dd78' }, L.water);
  for (const [x, y, s] of o.palms || []) palm(x, y, s);
  if (o.hut) {
    const [hx, hy] = o.hut, g = prop(hy);
    el('path', { d: `M${hx - 17},${hy}v-20h34v20z`, fill: '#c9a27a', ...ST }, g);
    el('path', { d: `M${hx - 24},${hy - 18}L${hx},${hy - 38}L${hx + 24},${hy - 18}Z`, fill: '#e3c26a', ...ST }, g);
    el('path', { d: `M${hx - 5},${hy}v-12h10v12z`, fill: '#6b4a2f' }, g);
  }
}

function rockIslet(o: any) {
  const { x, y } = o;
  el('path', { d: blob(x, y, 60, 26, 8, .15, 2), fill: '#9aa3a8', stroke: '#8a9398', 'stroke-width': 1.2 }, ctx.L.water);
  el('path', { d: blob(x + 20, y - 8, 30, 12, 7, .15, 4), fill: '#b5bdc1' }, ctx.L.water);
}

/** אגם קפוא עם שריטות החלקה */
function frozenLake(o: any) {
  const { cx, cy, rx, ry } = o, L = ctx.L; WATERS.push(o);
  el('path', { d: blob(cx, cy, rx, ry, 11, .06, 8), fill: '#d3ecf5', stroke: '#ffffff', 'stroke-width': 12, 'stroke-linejoin': 'round' }, L.water);
  el('path', { d: blob(cx + 20, cy - 10, rx * .7, ry * .55, 9, .08, 3), fill: '#e3f4fa' }, L.water);
  let sc = '';
  for (let i = 0; i < 26; i++) { const a = rand(0, 6.28), r = Math.sqrt(R()) * .8, x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r; sc += `M${n2(x)},${n2(y)}q${n2(rand(8, 18))},${n2(rand(-6, 6))} ${n2(rand(16, 32))},${n2(rand(-3, 3))}`; }
  el('path', { d: sc, fill: 'none', stroke: '#ffffff', 'stroke-width': 1.2, opacity: .9 }, L.water);
  block(cx - rx - 10, cy - ry - 10, cx + rx + 10, cy + ry + 10);
}

/** מסלול סקי: מדרון, רכבל כיסאות ודגלי סלאלום */
function skiSlope(o: any) {
  const { a, b, w0 = 70, w1 = 50 } = o, G = ctx.L.groundProps;
  el('path', { d: `M${a[0] - w0},${a[1]}L${b[0] - w1},${b[1]}L${b[0] + w1},${b[1]}L${a[0] + w0},${a[1]}Z`, fill: '#ffffff', stroke: '#e3eef3', 'stroke-width': 3, 'stroke-linejoin': 'round' }, G);
  let gr = ''; for (let k = -50; k <= 50; k += 14) gr += `M${a[0] + k * 1.2},${a[1]}L${b[0] + k * .85},${b[1]}`;
  el('path', { d: gr, stroke: '#edf4f7', 'stroke-width': 3 }, G);
  for (let t = .1; t < .95; t += .085) {
    const x = a[0] + (b[0] - a[0]) * t + (Math.round(t * 12) % 2 ? 26 : -26), y = a[1] + (b[1] - a[1]) * t, c = Math.round(t * 12) % 2 ? '#e2574c' : '#3d7bd9', g = prop(y);
    el('path', { d: `M${n2(x)},${n2(y)}v-14`, stroke: '#6b6f78', 'stroke-width': 1.2 }, g);
    el('path', { d: `M${n2(x)},${n2(y - 14)}l9,3l-9,3z`, fill: c }, g);
  }
  const la = [a[0] - 110, a[1] - 10], lb = [b[0] - 95, b[1] - 10];
  el('path', { d: `M${la[0]},${la[1] - 40}L${lb[0]},${lb[1] - 40}`, stroke: '#4a4a55', 'stroke-width': 1.2 }, G);
  for (let t = 0; t <= 1.001; t += .2) {
    const x = la[0] + (lb[0] - la[0]) * t, y = la[1] + (lb[1] - la[1]) * t, g = prop(y);
    el('path', { d: `M${n2(x)},${n2(y)}v-42M${n2(x - 7)},${n2(y - 42)}h14`, stroke: '#6b6f78', 'stroke-width': 2.4 }, g);
  }
  for (let t = .1; t < 1; t += .2) {
    const x = la[0] + (lb[0] - la[0]) * t, y = la[1] + (lb[1] - la[1]) * t - 40, g = prop(y + 50);
    el('path', { d: `M${n2(x)},${n2(y)}v10M${n2(x - 6)},${n2(y + 10)}h12v6`, stroke: '#3b3b46', 'stroke-width': 1.4, fill: 'none' }, g);
  }
  block(a[0] - 130, b[1] - 40, b[0] + 70, a[1] + 10);
}

/** מעיין חם מהביל */
function hotSpring(o: any) {
  const { x, y } = o, L = ctx.L; WATERS.push({ cx: x, cy: y, rx: 60, ry: 30 });
  el('path', { d: blob(x, y, 72, 38, 9, .12, 1), fill: '#9aa3a8' }, L.water);
  el('path', { d: blob(x, y, 58, 28, 9, .1, 2), fill: '#7fd6e0' }, L.water);
  el('path', { d: `M${x - 30},${y - 10}q-6,-14 4,-26q8,-10 0,-22M${x + 4},${y - 6}q-6,-14 4,-26q8,-10 0,-22M${x + 34},${y - 8}q-6,-12 4,-22`, fill: 'none', stroke: '#ffffff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .8 }, L.water);
  block(x - 80, y - 70, x + 80, y + 45);
}

void pick; void house;
register({ paddock, lake, plaza, fountain, flowerField, vegGarden, tent, campfire, field, vineyard, orchard, railway, train, mountainLake, cableCar,
  ruins, playground, fishingPond, footballPitch, maze, sunflowerField, island, rockIslet, frozenLake, skiSlope, hotSpring });
