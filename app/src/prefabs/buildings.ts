/* מבנים: בתים, חנויות, כנסייה, טירה ועוד */
import { el, n2, circ, shade, blob, ST } from '../core/util';
import { rngAt } from '../core/rng';
import { ctx, prop, block, smokeFx } from '../world/context';
import { register } from './registry';
import { addPlace } from '../world/places';
import { house, roofTexture, windowAt, poly, type Pt } from './house';
import { shop } from './shop';

export { house };

/** בקתה אלפינית: בית עץ עם גג מושלג */
function chalet(o: any) {
  house({ w: 52, h: 34, rh: 30, roof: '#ffffff', win: 2, smoke: false, door: '#5b3a22', ...o });
}

/** בקתת עץ ביער: בית עם קורות אופקיות */
function logCabin(o: any) {
  const g = house({ w: 70, h: 40, rh: 34, wall: '#a0643a', roof: '#5b3a22', win: 2, chimney: true, smoke: false, door: '#5b3a22', logs: true, ...o });
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
  const { x: sx, y: sy, name = 'Station' } = o, g = prop(sy);
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

/** בית אבן עתיק עם חצר מוקפת חומת אבנים וגינת ירק (במקום הטירה).
 *  השערים בחומה נמצאים איפה שהשבילים והדרך מגיעים: דרום, דרום-מזרח וצפון */
function stoneFarm(o: any) {
  const { x, y } = o, rg = rngAt(x, y, 21), G = ctx.L.groundProps;
  const X0 = x - 160, X1 = x + 160, Y0 = y - 125, Y1 = y + 65;
  // קרקע החצר: אדמה מהודקת ליד הבית
  el('path', { d: blob(x - 10, y - 2, 120, 26, 9, .1, 2), fill: '#d8c8a0', opacity: .75 }, G);
  // חומת אבנים נמוכה, עם פתחים לשערים
  const gaps: [number, number, number][] = [[x - 12, Y1, x + 12], [x + 88, Y1, x + 116], [x - 24, Y0, x + 2]];
  const side = (a: Pt, b: Pt) => {
    const segs: [Pt, Pt][] = []; let cur = a;
    for (const [gx0, gy, gx1] of gaps) if (gy === a[1] && gy === b[1]) { segs.push([cur, [gx0, gy]]); cur = [gx1, gy]; }
    segs.push([cur, b]); return segs;
  };
  let wall = '', stones = '';
  for (const [a, b] of [...side([X0, Y0], [X1, Y0]), ...side([X1, Y0], [X1, Y1]), ...side([X0, Y1], [X1, Y1]), ...side([X0, Y0], [X0, Y1])]) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 2) continue;
    wall += `M${n2(a[0])},${n2(a[1])}L${n2(b[0])},${n2(b[1])}`;
    const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
    for (let t = 2; t < len - 2; t += rg.rand(4.5, 7)) stones += blob(a[0] + ux * t, a[1] + uy * t + rg.rand(-1, 1), rg.rand(2.4, 3.6), rg.rand(1.8, 2.6), 6, .15, rg.rand(0, 6));
  }
  el('path', { d: wall, fill: 'none', stroke: '#a99b84', 'stroke-width': 8, 'stroke-linecap': 'round' }, G);
  el('path', { d: wall, fill: 'none', stroke: '#c9bea9', 'stroke-width': 6, 'stroke-linecap': 'round' }, G);
  el('path', { d: stones, fill: '#d6ccb8', stroke: '#9c8f78', 'stroke-width': .6 }, G);
  // שבילי אבני מדרך: מהשער הדרומי לדלת, ומהשער המזרחי
  let flag = '';
  for (let t = 0; t < 1; t += .1) flag += blob(x - 10 + t * 10 + rg.rand(-1.5, 1.5), y - 6 + t * 70, rg.rand(4, 5.5), rg.rand(2.6, 3.4), 6, .12, rg.rand(0, 6));
  for (let t = 0; t < 1; t += .14) flag += blob(x + 30 + t * 72, y + 6 + t * 50 + rg.rand(-1, 1), rg.rand(3.6, 5), rg.rand(2.4, 3.2), 6, .12, rg.rand(0, 6));
  el('path', { d: flag, fill: '#e3dac8', stroke: '#b8ab92', 'stroke-width': .6 }, G);

  addPlace({ kind: 'home', name: o.name, door: [x - 10, y - 8], vertical: true });
  addPlace({ kind: 'work', name: o.name, at: [x - 60, y + 58] });
  // ── גינת ירק: ערוגות משני צדי השביל ──
  const bedY = y + 14, bedH = 38, beds: [number, number][] = [[X0 + 16, x - 24], [x + 6, x + 80]];
  for (const [bx0, bx1] of beds) {
    el('rect', { x: bx0, y: bedY, width: bx1 - bx0, height: bedH, rx: 4, fill: '#9c6f48', stroke: '#7d5636', 'stroke-width': 1.2 }, G);
    let furrow = ''; for (let r = 0; r < 4; r++) furrow += `M${n2(bx0 + 4)},${n2(bedY + 6 + r * 9.5)}H${n2(bx1 - 4)}`;
    el('path', { d: furrow, stroke: '#7d5636', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: .7 }, G);
  }
  // שורות של ירקות שונים
  const crops: ((a: number, b: number, yy: number) => void)[] = [
    (a, b, yy) => {   // כרוב
      let d = '', c = ''; for (let xx = a; xx < b; xx += 8) { d += circ(xx, yy, 3.4); c += circ(xx, yy, 1.4); }
      el('path', { d, fill: '#79b85a' }, G); el('path', { d: c, fill: '#b9df9a' }, G);
    },
    (a, b, yy) => {   // גזר
      let d = '', t = ''; for (let xx = a; xx < b; xx += 4.5) { d += `M${n2(xx)},${n2(yy + 1)}l-1.4,-4M${n2(xx)},${n2(yy + 1)}l0,-4.6M${n2(xx)},${n2(yy + 1)}l1.4,-4`; t += circ(xx, yy + 1.8, 1); }
      el('path', { d, stroke: '#5c9e4a', 'stroke-width': .8 }, G); el('path', { d: t, fill: '#f08a2c' }, G);
    },
    (a, b, yy) => {   // חסה
      let d = ''; for (let xx = a; xx < b; xx += 7) d += blob(xx, yy, 3.2, 2.6, 6, .2, xx);
      el('path', { d, fill: '#a8d878', stroke: '#86bb5a', 'stroke-width': .5 }, G);
    },
    (a, b, yy) => {   // דלעות על קנוקנות
      let v = `M${n2(a)},${n2(yy)}`, p = ''; for (let xx = a; xx < b - 5; xx += 6) v += 'q3,-3 6,0';
      for (let xx = a + 6; xx < b; xx += 14) p += circ(xx, yy + .5, 3.2);
      el('path', { d: v, fill: 'none', stroke: '#5c9e4a', 'stroke-width': 1.2 }, G); el('path', { d: p, fill: '#ef9a3a', stroke: '#c9772a', 'stroke-width': .6 }, G);
    },
  ];
  const order = [0, 1, 2, 3].sort(() => rg.r() - .5);
  for (let r = 0; r < 4; r++) crops[order[r]](beds[0][0] + 7, beds[0][1] - 6, bedY + 4 + r * 9.5);
  for (let r = 2; r < 4; r++) crops[order[(r + 1) % 4]](beds[1][0] + 7, beds[1][1] - 6, bedY + 4 + r * 9.5);
  // עגבניות על מוטות וסוכת שעועית (גבוהות: אובייקטים עם עומק)
  for (let k = 0; k < 2; k++) {
    const ry = bedY + 7 + k * 9.5, gT = prop(ry);
    let st = '', fr = '', lv = '';
    for (let xx = x + 12; xx < x + 76; xx += 9) { st += `M${n2(xx)},${n2(ry)}v-14`; lv += circ(xx - 1.5, ry - 9, 2.6) + circ(xx + 1.6, ry - 5, 2.4) + circ(xx, ry - 12, 2.2); fr += circ(xx + 1.8, ry - 8, 1.2) + circ(xx - 1.6, ry - 4.5, 1.1); }
    el('path', { d: st, stroke: '#a0784a', 'stroke-width': 1 }, gT);
    el('path', { d: lv, fill: '#5c9e4a' }, gT);
    el('path', { d: fr, fill: '#e2453a' }, gT);
  }
  const bean = prop(bedY + 36), bx = X0 + 8;
  el('path', { d: `M${bx - 6},${bedY + 36}L${bx},${bedY + 10}L${bx + 6},${bedY + 36}M${bx},${bedY + 10}v-3`, fill: 'none', stroke: '#a0784a', 'stroke-width': 1.2 }, bean);
  let bl = ''; for (let k = 0; k < 7; k++) bl += circ(bx + rg.rand(-4, 4), bedY + 14 + k * 3, 2);
  el('path', { d: bl, fill: '#6aae4e' }, bean);

  // ── הבית: קירות אבן לא אחידים, גג רעפים ישן עם טחב ──
  const hy = y - 8, w = 112, h = 50, hx0 = x - 10 - w / 2, hx1 = hx0 + w, top = hy - h, g = prop(hy);
  el('ellipse', { cx: x - 2, cy: hy + 1, rx: 92, ry: 6, fill: 'rgba(40,70,20,.22)' }, g);
  // מחסן אבן נמוך צמוד משמאל, עם דלת אסם
  const ax0 = hx0 - 44, ah = 32;
  el('rect', { x: ax0, y: hy - ah, width: 46, height: ah, fill: '#c3b69e', ...ST }, g);
  el('path', { d: poly([[ax0 - 4, hy - ah + 3], [ax0 + 2, hy - ah - 12], [hx0 + 6, hy - ah - 18], [hx0 + 6, hy - ah + 3]]), fill: '#a8644a', ...ST }, g);
  el('rect', { x: ax0 + 12, y: hy - 22, width: 20, height: 22, fill: '#7a5a3a', ...ST }, g);
  el('path', { d: `M${ax0 + 12},${hy - 22}l20,22M${ax0 + 32},${hy - 22}l-20,22M${ax0 + 22},${hy - 22}v22`, stroke: '#5b3f26', 'stroke-width': 1 }, g);
  // ארובה (מאחורי הגג)
  const cx = hx1 - 26;
  el('rect', { x: cx - 6, y: top - 46, width: 12, height: 46, fill: '#b3a690', ...ST }, g);
  el('rect', { x: cx - 7.5, y: top - 48, width: 15, height: 4, fill: '#9c8f78' }, g);
  // קיר ואבנים בגדלים שונים
  el('rect', { x: hx0, y: top, width: w, height: h, fill: '#cbbfa8', ...ST }, g);
  let st = '';
  for (let yy = hy - 2, row = 0; yy > top + 2; yy -= 6.2, row++)
    for (let xx = hx0 + 1 + (row % 2) * 4; xx < hx1 - 3;) {
      const sw = Math.min(rg.rand(6, 13), hx1 - 1 - xx), sh = rg.rand(4.4, 5.8);
      if (sw > 2.5) st += `M${n2(xx + 1)},${n2(yy)}h${n2(sw - 2)}q1,0 1,-1v${n2(-sh + 2)}q0,-1 -1,-1h${n2(-sw + 2)}q-1,0 -1,1v${n2(sh - 2)}q0,1 1,1z`;
      xx += sw + .8;
    }
  el('path', { d: st, fill: '#d6cbb6', stroke: '#9c8f78', 'stroke-width': .55 }, g);
  el('rect', { x: hx0, y: top, width: w, height: h, fill: 'none', ...ST }, g);
  // גג רעפים ישן: צבעים לא אחידים וכתמי טחב
  const P: Pt[] = [[hx0 - 7, top + 3], [hx0 + 18, top - 40], [hx1 - 18, top - 40], [hx1 + 7, top + 3]];
  el('path', { d: poly(P), fill: '#b0674c', ...ST }, g);
  el('path', { d: poly([[x + 20, top - 40], [hx1 - 18, top - 40], [hx1 + 7, top + 3], [x + 30, top + 3]]), fill: '#bd765a', opacity: .7 }, g);
  roofTexture(g, P, 'tiles', '#b0674c', top - 40, top + 3);
  let moss = '', worn = '';
  for (let i = 0; i < 7; i++) moss += blob(rg.rand(hx0 + 10, hx1 - 10), rg.rand(top - 30, top - 4), rg.rand(4, 9), rg.rand(2, 3.5), 6, .2, i);
  for (let i = 0; i < 10; i++) worn += `M${n2(rg.rand(hx0 + 14, hx1 - 14))},${n2(rg.rand(top - 34, top - 2))}h${n2(rg.rand(3, 6))}v2h${n2(-rg.rand(3, 6))}z`;
  el('path', { d: worn, fill: '#8f5440', opacity: .6 }, g);
  el('path', { d: moss, fill: '#7d9a52', opacity: .7 }, g);
  el('path', { d: `M${hx0 + 18},${top - 40}H${hx1 - 18}`, stroke: '#8f5440', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g);
  // חלונות קטנים ועמוקים עם קשת אבן ותריסי עץ
  for (const wx of [hx0 + 20, hx1 - 22, x + 28]) {
    el('path', { d: `M${wx - 9},${hy - 28}a9,7 0 0 1 18,0`, fill: 'none', stroke: '#b3a690', 'stroke-width': 3 }, g);
    windowAt(g, wx, hy - 22, 9, 12, 'cross', '#e9dfcc', '#6f7d5a', null);
    el('rect', { x: wx - 6, y: hy - 15.5, width: 12, height: 2.4, fill: '#b3a690' }, g);
  }
  // דלת עץ כבדה בקשת אבנים
  const dx = x - 10;
  el('path', { d: `M${dx - 11},${hy}v-20a11,11 0 0 1 22,0v20`, fill: '#b3a690', ...ST }, g);
  let arch = ''; for (let k = 0; k <= 6; k++) { const a = Math.PI + k * Math.PI / 6; arch += `M${n2(dx + Math.cos(a) * 9)},${n2(hy - 20 + Math.sin(a) * 9)}L${n2(dx + Math.cos(a) * 12)},${n2(hy - 20 + Math.sin(a) * 12)}`; }
  el('path', { d: arch, stroke: '#8f8270', 'stroke-width': .8 }, g);
  el('path', { d: `M${dx - 8},${hy}v-20a8,8 0 0 1 16,0v20z`, fill: '#6b4a2f', ...ST }, g);
  el('path', { d: `M${dx - 2.7},${hy - 27}V${hy}M${dx + 2.7},${hy - 27}V${hy}M${dx - 8},${hy - 18}h16M${dx - 8},${hy - 7}h16`, stroke: '#4f3520', 'stroke-width': .8 }, g);
  el('circle', { cx: dx + 4.5, cy: hy - 11, r: 1.2, fill: '#3b3b46' }, g);
  // קיסוס על הפינה הימנית
  let ivy = ''; for (let i = 0; i < 16; i++) ivy += circ(hx1 - rg.rand(0, 6), hy - rg.rand(2, h - 4), rg.rand(2, 3.4));
  el('path', { d: ivy, fill: '#5f9a48' }, g);
  // ספסל ליד הדלת
  el('rect', { x: dx + 16, y: hy - 7, width: 18, height: 3, rx: 1, fill: '#8a5a35' }, g);
  el('path', { d: `M${dx + 18},${hy - 4}v4M${dx + 32},${hy - 4}v4`, stroke: '#5b3a22', 'stroke-width': 1.2 }, g);
  for (let i = 0; i < 3; i++) smokeFx(el('circle', { cx, cy: top - 52, r: 5.5, fill: '#f4f1ea', opacity: 0 }, ctx.L.air), cx, top - 52, i * 1.6 + rg.rand(0, 1));

  // ── מאחורי הבית: עץ פרי, ערימת עצים ולול עם תרנגולות ──
  const tx = x + 108, ty = y - 70, tg = prop(ty);
  el('ellipse', { cx: tx + 3, cy: ty, rx: 16, ry: 4, fill: 'rgba(40,70,20,.22)' }, tg);
  el('path', { d: `M${tx - 2.4},${ty}L${tx - 1.2},${ty - 20}L${tx + 1.2},${ty - 20}L${tx + 2.4},${ty}Z`, fill: '#7a5230' }, tg);
  el('path', { d: circ(tx, ty - 32, 15) + circ(tx - 10, ty - 24, 10) + circ(tx + 10, ty - 25, 11), fill: '#5fae55' }, tg);
  let fruit = ''; for (let i = 0; i < 9; i++) fruit += circ(tx + rg.rand(-14, 14), ty - rg.rand(20, 42), 1.6);
  el('path', { d: fruit, fill: '#f2c14e' }, tg);
  const wp = prop(hy - 2);
  let logs = ''; for (let r = 0; r < 3; r++) for (let k = 0; k < 4 - r; k++) logs += circ(ax0 - 14 + k * 5 + r * 2.5, hy - 3 - r * 4.4, 2.3);
  el('path', { d: logs, fill: '#c9955c', stroke: '#7a4f2a', 'stroke-width': .7 }, wp);
  const kx = x - 120, ky = y - 82, cp = prop(ky);
  el('rect', { x: kx - 14, y: ky - 16, width: 28, height: 16, fill: '#b98552', ...ST }, cp);
  el('path', { d: poly([[kx - 17, ky - 15], [kx, ky - 26], [kx + 17, ky - 15]]), fill: '#7a5a3a', ...ST }, cp);
  el('path', { d: `M${kx - 3},${ky}v-8h6v8`, fill: '#4f3520' }, cp);
  for (const [hx, hy2, c] of [[kx + 22, ky + 8, '#ffffff'], [kx + 32, ky + 2, '#c9772a'], [kx + 14, ky + 14, '#ffffff']] as [number, number, string][]) {
    const hen = prop(hy2);
    el('ellipse', { cx: hx, cy: hy2 - 3.5, rx: 3.6, ry: 2.8, fill: c, stroke: '#b9a990', 'stroke-width': .5 }, hen);
    el('circle', { cx: hx + 3, cy: hy2 - 6, r: 1.7, fill: c }, hen);
    el('path', { d: `M${hx + 3},${hy2 - 7.8}l.6,-1l.6,1`, stroke: '#e2453a', 'stroke-width': .7, fill: 'none' }, hen);
    el('path', { d: `M${hx + 4.6},${hy2 - 6.4}l1.4,.5l-1.4,.5z`, fill: '#e2a33b' }, hen);
  }
  block(X0 - 12, Y0 - 50, X1 + 12, Y1 + 12);
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

register({ house, chalet, logCabin, modernHouse, shop, church, chapel, barn, windmill, station, lighthouse, waterTower, greenhouse, observatory, lookoutTower, stoneFarm, tunnelPortal, well });
