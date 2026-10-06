/* מבנים: בתים, חנויות, כנסייה, טירה ועוד */
import { el, n2, circ, shade, wrap1, blob, ST } from '../core/util';
import { rand } from '../core/rng';
import { ctx, prop, block, fxAt, smokeFx, WATERS } from '../world/context';
import { register } from './registry';

function chimneySmoke(x: number, y: number, scale: number) {
  for (let i = 0; i < 3; i++)
    smokeFx(el('circle', { cx: x, cy: y, r: 5 * scale, fill: '#f4f1ea', opacity: 0 }, ctx.L.air), x, y, i * 1.6 + rand(0, 1));
}

/** בית עם גג משולש. smoke=false: ארובה בלי עשן (מחוץ לכפר הנוף סטטי) */
export function house(o: any) {
  const { x, y, w, h, wall, roof, rh = w * .55, chimney = false, smoke = true, door = '#a86a3d', win = 2, attic = false } = o;
  const g = prop(y);
  el('ellipse', { cx: x + 4, cy: y + 1, rx: w * .62, ry: 5, fill: 'rgba(40,70,20,.2)' }, g);
  if (chimney) el('rect', { x: x + w * .2, y: y - h - rh * .85, width: w * .11, height: rh * .55, fill: shade(roof, -.2), ...ST }, g);
  el('rect', { x: x - w / 2, y: y - h, width: w, height: h, fill: wall, ...ST }, g);
  el('rect', { x: x - w / 2, y: y - h, width: w * .14, height: h, fill: shade(wall, -.06) }, g);
  el('path', { d: `M${n2(x - w / 2 - 6)},${n2(y - h + 2)}L${n2(x)},${n2(y - h - rh)}L${n2(x + w / 2 + 6)},${n2(y - h + 2)}Z`, fill: roof, ...ST }, g);
  el('path', { d: `M${n2(x)},${n2(y - h - rh)}L${n2(x + w / 2 + 6)},${n2(y - h + 2)}L${n2(x + w * .1)},${n2(y - h + 2)}Z`, fill: shade(roof, .12) }, g);
  if (attic) {
    el('circle', { cx: x, cy: y - h - rh * .42, r: rh * .16, fill: '#fff7e0', ...ST }, g);
    el('path', { d: `M${n2(x - rh * .16)},${n2(y - h - rh * .42)}h${n2(rh * .32)}M${n2(x)},${n2(y - h - rh * .58)}v${n2(rh * .32)}`, stroke: '#c9a47a', 'stroke-width': 1 }, g);
  }
  const dw = Math.min(14, w * .22), dh = Math.min(22, h * .6);
  el('path', { d: `M${n2(x - dw / 2)},${y}v${n2(-dh + dw / 2)}a${n2(dw / 2)},${n2(dw / 2)} 0 0 1 ${n2(dw)},0v${n2(dh - dw / 2)}Z`, fill: door, ...ST }, g);
  el('circle', { cx: x + dw * .25, cy: y - dh * .45, r: 1, fill: '#f4d06f' }, g);
  const ww = Math.min(13, w * .2), wh = ww * .95;
  const wins = win === 2 ? [x - w * .3, x + w * .3] : win === 4 ? [x - w * .33, x - w * .19, x + w * .19, x + w * .33] : [x + w * .28];
  for (const wx of wins) {
    const wy = y - h * .62;
    el('rect', { x: wx - ww / 2, y: wy - wh / 2, width: ww, height: wh, rx: 1.2, fill: '#bfe6fb', stroke: '#fff', 'stroke-width': 1.6 }, g);
    el('path', { d: `M${n2(wx)},${n2(wy - wh / 2)}v${n2(wh)}M${n2(wx - ww / 2)},${n2(wy)}h${n2(ww)}`, stroke: '#fff', 'stroke-width': 1.1 }, g);
  }
  if (chimney && smoke) chimneySmoke(x + w * .255, y - h - rh * .9, Math.max(.7, w / 90));
  block(x - w / 2 - 14, y - h - rh - 10, x + w / 2 + 14, y + 16);
  return g;
}

/** בקתה אלפינית: בית עץ עם גג מושלג */
function chalet(o: any) {
  const g = house({ w: 52, h: 34, rh: 30, roof: '#ffffff', win: 2, smoke: false, door: '#5b3a22', ...o });
  el('path', { d: `M${o.x - 32},${o.y - 32}h64`, stroke: '#cfe0e8', 'stroke-width': 2 }, g);
}

/** בקתת עץ ביער: בית עם קורות אופקיות */
function logCabin(o: any) {
  const g = house({ w: 70, h: 40, rh: 34, wall: '#a0643a', roof: '#5b3a22', win: 2, chimney: true, smoke: false, door: '#5b3a22', ...o });
  let d = ''; for (let k = 1; k < 5; k++) d += `M${o.x - 35},${o.y - k * 8}h70`;
  el('path', { d, stroke: '#7a4a2a', 'stroke-width': 1.2 }, g);
}

/** בית מודרני: גג שטוח, חלונות גדולים, חיפוי עץ ופאנלים סולאריים */
function modernHouse(o: any) {
  const { x, y, w = 92, h = 46, wall = '#f4f1ea', wood = '#c9a27a', upper = false } = o, g = prop(y);
  el('ellipse', { cx: x + 5, cy: y + 1, rx: w * .62, ry: 5, fill: 'rgba(40,70,20,.2)' }, g);
  const top = upper ? y - h - 30 : y - h;
  if (upper) {
    el('rect', { x: x - w / 2 + 4, y: y - h - 30, width: w * .62, height: 30, fill: wall, ...ST }, g);
    el('rect', { x: x - w / 2 + 12, y: y - h - 22, width: w * .42, height: 16, rx: 1, fill: '#9fd3ea', stroke: '#6b6f78', 'stroke-width': 1.2 }, g);
  }
  el('rect', { x: x - w / 2, y: y - h, width: w, height: h, fill: wall, ...ST }, g);
  el('rect', { x: x + w * .12, y: y - h, width: w * .38, height: h, fill: wood, ...ST }, g);
  let d = ''; for (let k = x + w * .12 + 5; k < x + w / 2 - 2; k += 5) d += `M${n2(k)},${y - h + 1}v${h - 2}`;
  el('path', { d, stroke: shade(wood, -.15), 'stroke-width': .8 }, g);
  el('rect', { x: x - w / 2 + 7, y: y - h + 9, width: w * .5, height: h - 9, fill: '#9fd3ea', stroke: '#6b6f78', 'stroke-width': 1.4 }, g);
  el('path', { d: `M${n2(x - w / 2 + 7 + w * .25)},${y - h + 9}v${h - 9}M${x - w / 2 + 7},${y - h + 22}h${n2(w * .5)}`, stroke: '#6b6f78', 'stroke-width': 1.2 }, g);
  el('path', { d: `M${n2(x - w / 2 + 10)},${y - h + 12}l8,-0v6z`, fill: '#e8f6fc', opacity: .8 }, g);
  el('rect', { x: x + w * .22, y: y - 22, width: 13, height: 22, fill: '#4a4a55' }, g);
  el('rect', { x: x - w / 2 - 3, y: y - h - 4, width: w + 6, height: 5, fill: '#4a4a55' }, g);
  if (upper) el('rect', { x: x - w / 2 + 1, y: top - 4, width: w * .62 + 6, height: 5, fill: '#4a4a55' }, g);
  const px = upper ? x + w * .2 : x - w / 2 + 8, pw = upper ? w * .28 : w * .6, py = y - h - 5;
  el('path', { d: `M${n2(px)},${n2(py)}l8,-12h${n2(pw)}l-8,12z`, fill: '#2c4a7a', stroke: '#9fb3cc', 'stroke-width': .8 }, g);
  let gr = `M${n2(px + 4)},${n2(py - 6)}h${n2(pw)}`;
  for (let k = 1; k < 4; k++) gr += `M${n2(px + k * pw / 4)},${n2(py)}l8,-12`;
  el('path', { d: gr, stroke: '#9fb3cc', 'stroke-width': .7 }, g);
  el('path', { d: circ(x - w / 2 - 8, y - 6, 7) + circ(x + w / 2 + 7, y - 5, 6), fill: '#5db85a' }, g);
  block(x - w / 2 - 18, top - 24, x + w / 2 + 16, y + 14);
}

/* קישוט מיוחד לכל חנות */
const SHOP_EXTRAS: Record<string, (g: any, x: number, y: number, w: number, h: number) => void> = {
  bakery: (g, x, y, w, h) => {
    el('path', { d: `M${x - 13},${y - h - 26}q13,-14 26,0z`, fill: '#e3a857', stroke: '#b97a2f', 'stroke-width': 1.2 }, g);
    el('path', { d: `M${x - 6},${y - h - 31}l3,4M${x},${y - h - 32}l3,4M${x + 6},${y - h - 31}l3,4`, stroke: '#b97a2f', 'stroke-width': 1.2, 'stroke-linecap': 'round' }, g);
  },
  flowers: (g, x, y) => {
    for (const dx of [-38, -26]) {
      el('path', { d: `M${x + dx - 5},${y}l1.5,-8h7l1.5,8z`, fill: '#c46a3a' }, g);
      el('path', { d: circ(x + dx - 2, y - 12, 2.6) + circ(x + dx + 2.5, y - 11, 2.4) + circ(x + dx, y - 15, 2.4), fill: dx < -30 ? '#ff7aa2' : '#ffd23f' }, g);
    }
  },
  barber: (g, x, y, w) => {
    // עמוד מספרה: הפסים מסתובבים לאט (בשכבה הדינמית)
    const px = x + w / 2 + 6, cp = el('clipPath', { id: 'poleClip' }, ctx.defs);
    el('rect', { x: px - 3, y: y - 34, width: 6, height: 24, rx: 3 }, cp);
    el('rect', { x: px - 3, y: y - 34, width: 6, height: 24, rx: 3, fill: '#fff', stroke: '#9aa', 'stroke-width': .8 }, g);
    const sg = el('g', { 'clip-path': 'url(#poleClip)' }, ctx.L.fx), sp = el('g', null, sg);
    fxAt(px, y - 22, 30, t => sp.setAttribute('transform', `translate(0,${n2(-8 * wrap1(t / 2.6))})`));
    let d = '';
    for (let k = -2; k < 6; k++) d += `M${px - 4},${y - 30 + k * 8}l8,-5v3l-8,5z`;
    el('path', { d, fill: '#e2574c' }, sp);
    el('circle', { cx: px, cy: y - 36, r: 3, fill: '#3d7bd9' }, g);
  },
  icecream: (g, x, y, w, h) => {
    el('path', { d: `M${x - 5},${y - h - 30}l5,14l5,-14z`, fill: '#e3a857', stroke: '#b97a2f', 'stroke-width': 1 }, g);
    el('path', { d: circ(x, y - h - 33, 5.5), fill: '#ffd1e3' }, g);
    el('path', { d: circ(x + 2, y - h - 37, 3.5), fill: '#8b5a2b' }, g);
  },
};
function shop(o: any) {
  const { x, y, color: c, wall, name } = o, w = 86, h = 54, g = prop(y);
  el('ellipse', { cx: x + 4, cy: y + 1, rx: w * .6, ry: 5, fill: 'rgba(40,70,20,.2)' }, g);
  el('rect', { x: x - w / 2, y: y - h, width: w, height: h, fill: wall, ...ST }, g);
  el('rect', { x: x - w / 2 - 3, y: y - h - 6, width: w + 6, height: 8, rx: 2, fill: shade(c, -.15), ...ST }, g);
  const aw = w + 8, ay = y - h + 4, n = 6, sw = aw / n;
  for (let i = 0; i < n; i++) {
    const ax = x - aw / 2 + i * sw;
    el('path', { d: `M${n2(ax)},${n2(ay)}h${n2(sw)}v12a${n2(sw / 2)},${n2(sw / 2.4)} 0 0 1 ${n2(-sw)},0Z`, fill: i % 2 ? '#fffaf0' : c }, g);
  }
  el('path', { d: `M${n2(x - aw / 2)},${n2(ay)}h${aw}`, stroke: shade(c, -.2), 'stroke-width': 1.4 }, g);
  el('rect', { x: x - w / 2 + 8, y: y - 24, width: 30, height: 18, rx: 2, fill: '#bfe6fb', stroke: '#fff', 'stroke-width': 2 }, g);
  el('rect', { x: x + 10, y: y - 26, width: 16, height: 26, rx: 2, fill: shade(c, -.1), ...ST }, g);
  el('circle', { cx: x + 22, cy: y - 13, r: 1.1, fill: '#f4d06f' }, g);
  el('rect', { x: x - 24, y: y - h - 24, width: 48, height: 16, rx: 8, fill: '#fffaf0', ...ST }, g);
  const t = el('text', { x, y: y - h - 12.6, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: shade(c, -.35) }, g);
  t.textContent = name;
  SHOP_EXTRAS[o.variant]?.(g, x, y, w, h);
  block(x - w / 2 - 12, y - h - 34, x + w / 2 + 12, y + 14);
}

function church(o: any) {
  const { x, y } = o, g = prop(y);
  el('ellipse', { cx: x + 6, cy: y + 1, rx: 64, ry: 6, fill: 'rgba(40,70,20,.2)' }, g);
  el('rect', { x: x - 40, y: y - 56, width: 70, height: 56, fill: '#fffaf2', ...ST }, g);
  el('path', { d: `M${x - 46},${y - 54}L${x - 5},${y - 86}L${x + 36},${y - 54}Z`, fill: '#8e6cc9', ...ST }, g);
  el('rect', { x: x + 26, y: y - 92, width: 26, height: 92, fill: '#fff3d6', ...ST }, g);
  el('path', { d: `M${x + 22},${y - 90}L${x + 39},${y - 130}L${x + 56},${y - 90}Z`, fill: '#7656b3', ...ST }, g);
  el('path', { d: `M${x + 39},${y - 130}v-14M${x + 33},${y - 138}h12`, stroke: '#b8860b', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g);
  el('path', { d: `M${x + 32},${y - 72}v-8a7,7 0 0 1 14,0v8z`, fill: '#3b3b46' }, g);
  el('circle', { cx: x + 39, cy: y - 74, r: 3, fill: '#e3a857' }, g);
  el('circle', { cx: x - 5, cy: y - 40, r: 8, fill: '#bfe6fb', stroke: '#fff', 'stroke-width': 2 }, g);
  el('path', { d: `M${x - 5},${y - 48}v16M${x - 13},${y - 40}h16`, stroke: '#fff', 'stroke-width': 1.2 }, g);
  el('path', { d: `M${x - 12},${y}v-16a7,7 0 0 1 14,0v16z`, fill: '#8a5a35', ...ST }, g);
  for (const wx of [x - 30, x + 14]) el('path', { d: `M${wx - 4},${y - 14}v-12a4,4 0 0 1 8,0v12z`, fill: '#bfe6fb', stroke: '#fff', 'stroke-width': 1.2 }, g);
  block(x - 60, y - 150, x + 70, y + 16);
}

function chapel(o: any) {
  const { x, y } = o, g = prop(y);
  el('ellipse', { cx: x + 4, cy: y + 1, rx: 36, ry: 5, fill: 'rgba(60,90,110,.2)' }, g);
  el('rect', { x: x - 26, y: y - 46, width: 52, height: 46, fill: '#fffaf2', ...ST }, g);
  el('rect', { x: x - 10, y: y - 78, width: 20, height: 32, fill: '#fde9c8', ...ST }, g);
  el('path', { d: `M${x - 12},${y - 78}q0,-16 12,-22q12,6 12,22z`, fill: '#3d9bd9', ...ST }, g);
  el('path', { d: `M${x},${y - 100}v-10M${x - 4},${y - 106}h8`, stroke: '#b8860b', 'stroke-width': 1.8 }, g);
  el('path', { d: `M${x - 30},${y - 44}L${x},${y - 60}L${x + 30},${y - 44}Z`, fill: '#ffffff', ...ST }, g);
  el('path', { d: `M${x - 7},${y}v-14a7,7 0 0 1 14,0v14z`, fill: '#8a5a35' }, g);
  block(x - 40, y - 115, x + 40, y + 10);
}

function barn(o: any) {
  const { x, y } = o, g = prop(y);
  el('ellipse', { cx: x + 6, cy: y + 1, rx: 70, ry: 6, fill: 'rgba(40,70,20,.2)' }, g);
  el('rect', { x: x + 40, y: y - 78, width: 26, height: 78, rx: 3, fill: '#c9d4dc', ...ST }, g);
  el('path', { d: `M${x + 40},${y - 78}a13,10 0 0 1 26,0z`, fill: '#9aa8b3', ...ST }, g);
  el('path', { d: `M${x + 40},${y - 52}h26M${x + 40},${y - 26}h26`, stroke: '#a3b1bb', 'stroke-width': 1.2 }, g);
  el('rect', { x: x - 48, y: y - 52, width: 88, height: 52, fill: '#c0392b', ...ST }, g);
  el('path', { d: `M${x - 54},${y - 50}L${x - 34},${y - 82}H${x + 26}L${x + 46},${y - 50}Z`, fill: '#7a2a20', ...ST }, g);
  el('rect', { x: x - 18, y: y - 34, width: 28, height: 34, fill: '#fffaf0' }, g);
  el('rect', { x: x - 15, y: y - 31, width: 22, height: 31, fill: '#a33223' }, g);
  el('path', { d: `M${x - 15},${y - 31}l22,31M${x + 7},${y - 31}l-22,31`, stroke: '#fffaf0', 'stroke-width': 2.4 }, g);
  el('rect', { x: x - 10, y: y - 72, width: 12, height: 10, fill: '#fffaf0' }, g);
  block(x - 60, y - 95, x + 75, y + 14);
}

/** טחנת רוח (עומדת: הכנפיים לא מסתובבות) */
function windmill(o: any) {
  const { x, y } = o, g = prop(y);
  el('ellipse', { cx: x + 4, cy: y + 1, rx: 26, ry: 5, fill: 'rgba(40,70,20,.2)' }, g);
  el('path', { d: `M${x - 18},${y}L${x - 11},${y - 70}h22L${x + 18},${y}Z`, fill: '#fff3d6', ...ST }, g);
  el('path', { d: `M${x - 14},${y - 68}L${x},${y - 84}L${x + 14},${y - 68}Z`, fill: '#a0643a', ...ST }, g);
  el('path', { d: `M${x - 5},${y}v-14a5,5 0 0 1 10,0v14z`, fill: '#8a5a35' }, g);
  el('circle', { cx: x, cy: y - 42, r: 4, fill: '#bfe6fb', stroke: '#fff', 'stroke-width': 1.2 }, g);
  const hub = [x, y - 70];
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + .35;
    const g2 = el('g', { transform: `translate(${hub[0]},${hub[1]}) rotate(${(a * 180 / Math.PI).toFixed(1)})` }, g);
    el('path', { d: 'M0,0h46', stroke: '#6b4a2f', 'stroke-width': 2.2 }, g2);
    el('rect', { x: 12, y: 0, width: 34, height: 11, fill: '#fffaf0', stroke: '#c9b9a0', 'stroke-width': 1 }, g2);
    el('path', { d: 'M20,0v11M29,0v11M38,0v11', stroke: '#d8cbb4', 'stroke-width': .8 }, g2);
  }
  el('circle', { cx: hub[0], cy: hub[1], r: 3.5, fill: '#6b4a2f' }, g);
  block(x - 50, y - 125, x + 50, y + 12);
}

function station(o: any) {
  const { x: sx, y: sy, name = 'תחנה' } = o, g = prop(sy);
  el('rect', { x: sx - 70, y: sy - 4, width: 140, height: 10, fill: '#d9c9ae', ...ST }, g);
  el('rect', { x: sx - 46, y: sy - 50, width: 92, height: 46, fill: '#fde9c8', ...ST }, g);
  el('path', { d: `M${sx - 56},${sy - 48}L${sx - 40},${sy - 72}H${sx + 40}L${sx + 56},${sy - 48}Z`, fill: '#3d7bd9', ...ST }, g);
  for (const wx of [sx - 32, sx + 18]) el('rect', { x: wx, y: sy - 38, width: 14, height: 14, rx: 1.5, fill: '#bfe6fb', stroke: '#fff', 'stroke-width': 1.6 }, g);
  el('path', { d: `M${sx - 8},${sy - 4}v-22a8,8 0 0 1 16,0v22z`, fill: '#8a5a35' }, g);
  el('rect', { x: sx - 24, y: sy - 90, width: 48, height: 15, rx: 7.5, fill: '#fffaf0', ...ST }, g);
  const t = el('text', { x: sx, y: sy - 79, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#2b5aa8' }, g); t.textContent = name;
  block(sx - 80, sy - 100, sx + 80, sy + 14);
}

function lighthouse(o: any) {
  const { x, y } = o, g = prop(y);
  el('path', { d: blob(x, y + 4, 46, 16, 8, .12, 4), fill: '#9aa3a8' }, g);
  el('path', { d: blob(x + 14, y - 2, 22, 9, 7, .12, 2), fill: '#b5bdc1' }, g);
  el('path', { d: `M${x - 13},${y}L${x - 9},${y - 78}h18L${x + 13},${y}Z`, fill: '#fffaf0', stroke: 'rgba(70,45,25,.35)', 'stroke-width': 1.2 }, g);
  for (const k of [0, 2]) el('path', { d: `M${x - 12.4 + k * 1},${y - 14 - k * 22}L${x - 11.6 + k},${y - 28 - k * 22}h${23.2 - k * 2}L${x + 12.4 - k},${y - 14 - k * 22}Z`, fill: '#e2574c' }, g);
  el('rect', { x: x - 12, y: y - 96, width: 24, height: 18, rx: 2, fill: '#3b3b46' }, g);
  el('rect', { x: x - 8, y: y - 93, width: 16, height: 12, rx: 2, fill: '#ffe680' }, g);
  el('path', { d: `M${x - 14},${y - 96}L${x},${y - 110}L${x + 14},${y - 96}Z`, fill: '#e2574c' }, g);
  el('path', { d: `M${x - 3},${y}v-14a3,3 0 0 1 6,0v14z`, fill: '#8a5a35' }, g);
}

function waterTower(o: any) {
  const { x, y } = o, g = prop(y);
  el('ellipse', { cx: x + 3, cy: y + 1, rx: 26, ry: 4, fill: 'rgba(40,70,20,.22)' }, g);
  el('path', { d: `M${x - 18},${y}L${x - 12},${y - 50}M${x + 18},${y}L${x + 12},${y - 50}M${x - 16},${y - 12}L${x + 14},${y - 38}M${x + 16},${y - 12}L${x - 14},${y - 38}`, stroke: '#7d868b', 'stroke-width': 2.4 }, g);
  el('rect', { x: x - 22, y: y - 86, width: 44, height: 36, rx: 6, fill: '#c9d4dc', ...ST }, g);
  el('path', { d: `M${x - 22},${y - 74}h44M${x - 22},${y - 62}h44`, stroke: '#a3b1bb', 'stroke-width': 1.2 }, g);
  el('path', { d: `M${x - 25},${y - 86}L${x},${y - 104}L${x + 25},${y - 86}Z`, fill: '#e2574c', ...ST }, g);
  block(x - 30, y - 110, x + 30, y + 8);
}

function greenhouse(o: any) {
  const { x, y } = o, g = prop(y);
  el('rect', { x: x - 34, y: y - 42, width: 68, height: 42, fill: 'rgba(205,238,250,.75)', stroke: '#9ec6d6', 'stroke-width': 1.4 }, g);
  el('path', { d: `M${x - 38},${y - 40}Q${x},${y - 72} ${x + 38},${y - 40}Z`, fill: 'rgba(225,246,253,.8)', stroke: '#9ec6d6', 'stroke-width': 1.4 }, g);
  let d = ''; for (let k = -34; k <= 34; k += 11) d += `M${x + k},${y}v-42`;
  el('path', { d: d + `M${x - 34},${y - 21}h68`, stroke: '#b5d9e6', 'stroke-width': 1 }, g);
  let pl = ''; for (let k = -28; k < 30; k += 8) pl += circ(x + k, y - 6, 3);
  el('path', { d: pl, fill: '#5db85a' }, g);
  block(x - 50, y - 65, x + 50, y + 15);
}

function observatory(o: any) {
  const { x, y } = o, g = prop(y);
  el('path', { d: blob(x, y + 6, 90, 22, 8, .08, 2), fill: '#dfecf2' }, ctx.L.groundProps);
  el('rect', { x: x - 30, y: y - 40, width: 60, height: 40, fill: '#f4f1ea', ...ST }, g);
  el('path', { d: `M${x - 34},${y - 40}a34,30 0 0 1 68,0z`, fill: '#c9d4dc', ...ST }, g);
  el('path', { d: `M${x - 4},${y - 70}h10l-2,30h-6z`, fill: '#3b3b46' }, g);
  el('path', { d: `M${x + 1},${y - 66}l20,-18`, stroke: '#6b6f78', 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  el('path', { d: `M${x - 6},${y}v-16a6,6 0 0 1 12,0v16z`, fill: '#5b3a22' }, g);
  block(x - 50, y - 95, x + 50, y + 20);
}

function lookoutTower(o: any) {
  const { x, y } = o, g = prop(y);
  el('ellipse', { cx: x + 3, cy: y + 1, rx: 24, ry: 4, fill: 'rgba(40,70,20,.22)' }, g);
  el('path', { d: `M${x - 16},${y}L${x - 9},${y - 60}M${x + 16},${y}L${x + 9},${y - 60}M${x - 14},${y - 14}L${x + 12},${y - 34}M${x + 14},${y - 14}L${x - 12},${y - 34}M${x - 13},${y - 34}L${x + 10},${y - 54}M${x + 13},${y - 34}L${x - 10},${y - 54}`, stroke: '#8a5a35', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, g);
  el('rect', { x: x - 15, y: y - 70, width: 30, height: 12, fill: '#a0643a', ...ST }, g);
  el('path', { d: `M${x - 19},${y - 70}L${x},${y - 88}L${x + 19},${y - 70}Z`, fill: '#5b3a22', ...ST }, g);
  block(x - 25, y - 95, x + 25, y + 8);
}

/** טירה עם חפיר, גשר נמשך, מגדלים ודגלים */
function castle(o: any) {
  const { x, y } = o, MO = { cx: x, cy: y - 25, rx: 150, ry: 92 };
  WATERS.push(MO);
  const L = ctx.L;
  el('path', { d: blob(MO.cx, MO.cy, MO.rx, MO.ry, 10, .04, 1), fill: '#5ec6e8', stroke: '#e9dcae', 'stroke-width': 8 }, L.water);
  el('path', { d: blob(MO.cx, MO.cy - 4, MO.rx - 26, MO.ry - 24, 10, .04, 1), fill: '#9cd162' }, L.water);
  el('rect', { x: x - 12, y: y + 30, width: 24, height: 48, fill: '#a0643a', stroke: '#6b4a2f', 'stroke-width': 1.2 }, L.water);
  let pl = ''; for (let k = y + 34; k < y + 78; k += 6) pl += `M${x - 12},${k}h24`;
  el('path', { d: pl, stroke: '#6b4a2f', 'stroke-width': .8 }, L.water);
  const g = prop(y + 30), wall = '#cfc6b8', dk = '#b3a999';
  const tower = (tx: number, ty: number, w: number, h: number) => {
    el('rect', { x: tx - w / 2, y: ty - h, width: w, height: h, fill: wall, ...ST }, g);
    let cr = ''; for (let k = 0; k < 4; k++) cr += `M${tx - w / 2 + k * w / 3.5},${ty - h}v-6h${w / 7}v6`;
    el('path', { d: cr, fill: wall, stroke: 'rgba(70,45,25,.35)', 'stroke-width': 1 }, g);
    el('path', { d: `M${tx - 2.5},${ty - h * .6}v-8a2.5,2.5 0 0 1 5,0v8z`, fill: '#3b3b46' }, g);
  };
  el('rect', { x: x - 80, y: y - 70, width: 160, height: 100, fill: dk, ...ST }, g);
  let cr = ''; for (let k = x - 78; k < x + 76; k += 12) cr += `M${k},${y - 70}v-7h7v7`;
  el('path', { d: cr, fill: dk, stroke: 'rgba(70,45,25,.35)', 'stroke-width': 1 }, g);
  tower(x - 80, y + 30, 32, 120); tower(x + 80, y + 30, 32, 120); tower(x, y - 30, 40, 125);
  el('path', { d: `M${x - 14},${y + 30}v-26a14,14 0 0 1 28,0v26z`, fill: '#5b3a22', ...ST }, g);
  el('path', { d: `M${x - 14},${y + 6}h28M${x - 14},${y + 16}h28M${x - 7},${y - 6}v36M${x + 7},${y - 6}v36`, stroke: '#3b2a1c', 'stroke-width': 1 }, g);
  for (const [fx, fy, c] of [[x - 80, y - 96, '#e2574c'], [x + 80, y - 96, '#3d7bd9'], [x, y - 161, '#ffd23f']] as [number, number, string][]) {
    el('path', { d: `M${fx},${fy}v-22`, stroke: '#6b4a2f', 'stroke-width': 1.4 }, g);
    el('path', { d: `M${fx},${fy - 22}l16,5l-16,5z`, fill: c }, g);
  }
  block(x - 175, y - 200, x + 175, y + 90);
}

function tunnelPortal(o: any) {
  const { x, y } = o, g = prop(y);
  el('path', { d: `M${x - 34},${y}v-30a34,32 0 0 1 68,0v30z`, fill: '#9aa3a8', stroke: '#7d868b', 'stroke-width': 1.5 }, g);
  el('path', { d: `M${x - 24},${y}v-26a24,24 0 0 1 48,0v26z`, fill: '#2b2f35' }, g);
  let d = ''; for (let k = -30; k <= 30; k += 12) d += `M${x + k},${y - 30 + Math.abs(k) * .3}l2,-6`;
  el('path', { d, stroke: '#7d868b', 'stroke-width': 1.2 }, g);
}

function well(o: any) {
  const { x, y } = o, g = prop(y);
  el('ellipse', { cx: x, cy: y, rx: 15, ry: 6, fill: '#9aa3a8', stroke: '#7d868b', 'stroke-width': 1.2 }, g);
  el('ellipse', { cx: x, cy: y - 1, rx: 10, ry: 3.5, fill: '#3f7f99' }, g);
  el('path', { d: `M${x - 12},${y}v-26M${x + 12},${y}v-26`, stroke: '#7a4f2a', 'stroke-width': 2.4 }, g);
  el('path', { d: `M${x - 17},${y - 24}L${x},${y - 36}L${x + 17},${y - 24}Z`, fill: '#a0643a' }, g);
  el('path', { d: `M${x},${y - 24}v12`, stroke: '#6b5a4a', 'stroke-width': .8 }, g);
  el('rect', { x: x - 3, y: y - 13, width: 6, height: 5, fill: '#8a5a35' }, g);
  block(x - 25, y - 45, x + 25, y + 12);
}

register({ house, chalet, logCabin, modernHouse, shop, church, chapel, barn, windmill, station, lighthouse, waterTower, greenhouse, observatory, lookoutTower, castle, tunnelPortal, well });
