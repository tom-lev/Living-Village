/* חפצים קטנים: ספסלים, פנסים, אופניים, שלטים, שמשיות, סירות ועוד */
import { el, n2, circ, shade, wrap1, rrect, ST } from '../core/util';
import { rand, pick } from '../core/rng';
import { ctx, prop, block, FX } from '../world/context';
import { register } from './registry';

export function bench(o: any) {
  const { x, y } = o, g = prop(y), c = '#b07a48', d = shade(c, -.25);
  el('ellipse', { cx: x + 2, cy: y + 1, rx: 22, ry: 3, fill: 'rgba(40,70,20,.2)' }, g);
  el('path', { d: `M${x - 16},${y}v-9M${x + 16},${y}v-9M${x - 14},${y - 9}v-12M${x + 14},${y - 9}v-12`, stroke: d, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, g);
  el('rect', { x: x - 20, y: y - 11, width: 40, height: 4, rx: 1.5, fill: c }, g);
  el('rect', { x: x - 20, y: y - 22, width: 40, height: 3.5, rx: 1.5, fill: c }, g);
  el('rect', { x: x - 20, y: y - 16.5, width: 40, height: 3.5, rx: 1.5, fill: c }, g);
  block(x - 26, y - 26, x + 26, y + 10);
}

/** פנס רחוב עם אור חם */
export function lamp(o: any) {
  const { x, y, flip: f = 1 } = o, g = prop(y), b = el('g', { transform: `translate(${n2(x)},${n2(y)}) scale(${f},1)` }, g);
  el('ellipse', { cx: 0, cy: 0, rx: 4, ry: 1.4, fill: 'rgba(40,70,20,.25)' }, b);
  el('path', { d: 'M0,0v-30q0,-4 5,-4h4', stroke: '#3b3b46', 'stroke-width': 1.8, fill: 'none', 'stroke-linecap': 'round' }, b);
  el('path', { d: 'M6,-34h7l-1.5,3h-4z', fill: '#3b3b46' }, b);
  el('ellipse', { cx: 9.5, cy: -30.5, rx: 2.4, ry: 1.2, fill: '#ffe6a3' }, b);
  el('circle', { cx: 9.5, cy: -29, r: 6, fill: '#fff3c4', opacity: .25 }, b);
}

export function bike(o: any) {
  const { x, y, color: c, flip: f = 1 } = o, g = prop(y), b = el('g', { transform: `translate(${x},${y}) scale(${f},1)` }, g);
  el('path', { d: circ(-6, -4, 4) + circ(6, -4, 4), fill: 'none', stroke: '#3b3b46', 'stroke-width': 1.2 }, b);
  el('path', { d: 'M-6,-4L-1,-11H6L6,-4M-1,-11L1,-4H-6M6,-11l-1,-3h-3M-2,-12h4', fill: 'none', stroke: c, 'stroke-width': 1.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, b);
}

function signpost(o: any) {
  const { x, y } = o, g = prop(y + 12);
  el('path', { d: `M${x + 14},${y + 12}v-24`, stroke: '#7a4f2a', 'stroke-width': 2.2 }, g);
  el('path', { d: `M${x + 6},${y - 10}h16l4,3l-4,3h-16z`, fill: '#e9c48a', stroke: '#8a5f39', 'stroke-width': .8 }, g);
  el('path', { d: `M${x + 22},${y - 2}h-16l-4,3l4,3h16z`, fill: '#e9c48a', stroke: '#8a5f39', 'stroke-width': .8 }, g);
}

function mailbox(o: any) {
  const { x, y } = o, g = prop(y);
  el('path', { d: `M${x},${y}v-16`, stroke: '#7a4f2a', 'stroke-width': 2.4 }, g);
  el('rect', { x: x - 7, y: y - 24, width: 14, height: 9, rx: 4, fill: '#e2574c' }, g);
}

function haybale(o: any) {
  const { x, y } = o, g = prop(y + 7);
  el('ellipse', { cx: x + 2, cy: y + 7, rx: 10, ry: 3, fill: 'rgba(90,70,20,.25)' }, g);
  el('circle', { cx: x, cy: y, r: 8, fill: '#f2cd5c', stroke: '#d6aa38', 'stroke-width': 1.2 }, g);
  el('path', { d: `M${x},${y}m-4,0a4,4 0 1 1 4,4a2.4,2.4 0 1 1 -2.4,-2.4`, fill: 'none', stroke: '#c99a2a', 'stroke-width': 1 }, g);
}

/** שמשייה במבט מלמעלה, עם מגבת לידה */
function umbrella(o: any) {
  const { x, y, color: c, towel = pick(['#ffd23f', '#9fd8ff', '#ff9fb8', '#b6f0a0']), towelAngle = Math.round(rand(-20, 20)) } = o, G = ctx.L.groundProps;
  el('rect', { x: x + 10, y: y + 6, width: 16, height: 26, rx: 2, fill: towel, transform: `rotate(${towelAngle} ${x + 18} ${y + 19})` }, G);
  el('ellipse', { cx: x + 3, cy: y + 4, rx: 15, ry: 5, fill: 'rgba(120,90,40,.18)' }, G);
  let d = '';
  for (let k = 0; k < 8; k += 2) { const a0 = k / 8 * Math.PI * 2, a1 = (k + 1) / 8 * Math.PI * 2; d += `M${x},${y}L${n2(x + Math.cos(a0) * 15)},${n2(y + Math.sin(a0) * 15)}A15,15 0 0 1 ${n2(x + Math.cos(a1) * 15)},${n2(y + Math.sin(a1) * 15)}Z`; }
  el('circle', { cx: x, cy: y, r: 15, fill: '#fffaf0' }, G);
  el('path', { d, fill: c }, G);
  el('circle', { cx: x, cy: y, r: 1.8, fill: '#6b4a2f' }, G);
}

function sailboat(o: any) {
  const { x, y, color: c, flip: f = 1 } = o, g = prop(y), b = el('g', { transform: `translate(${x},${y}) scale(${f},1)` }, g);
  el('ellipse', { cx: 0, cy: 2, rx: 22, ry: 4, fill: '#3fa9cc', opacity: .6 }, b);
  el('path', { d: 'M-20,-6h40l-7,8h-26z', fill: '#8a5a35' }, b);
  el('path', { d: 'M0,-6v-36', stroke: '#6b4a2f', 'stroke-width': 1.6 }, b);
  el('path', { d: 'M1,-41l16,33h-16z', fill: c, stroke: shade(c, -.15), 'stroke-width': .8 }, b);
  el('path', { d: 'M-1,-36l-12,28h12z', fill: '#fffaf0', stroke: '#ddd', 'stroke-width': .8 }, b);
}

function buoy(o: any) {
  const { x, y, color: c } = o, g = prop(y);
  el('ellipse', { cx: x, cy: y, rx: 8, ry: 3, fill: '#3fa9cc', opacity: .6 }, g);
  el('path', { d: `M${x - 5},${y}l2,-12h6l2,12z`, fill: c, stroke: shade(c, -.25), 'stroke-width': .8 }, g);
  el('rect', { x: x - 4, y: y - 8, width: 8, height: 3, fill: '#fff' }, g);
}

function ship(o: any) {
  const { x, y } = o, g = prop(y), b = el('g', { transform: `translate(${x},${y})` }, g);
  el('ellipse', { cx: 0, cy: 4, rx: 90, ry: 9, fill: '#3fa9cc', opacity: .6 }, b);
  el('path', { d: 'M-90,-14h180l-22,22h-140z', fill: '#2f4858', stroke: '#1f3340', 'stroke-width': 1.2 }, b);
  el('rect', { x: -86, y: -18, width: 172, height: 6, fill: '#e2574c' }, b);
  el('rect', { x: -50, y: -46, width: 70, height: 28, rx: 3, fill: '#fffaf0', ...ST }, b);
  for (let k = -44; k < 16; k += 14) el('circle', { cx: k + 4, cy: -32, r: 3.4, fill: '#bfe6fb', stroke: '#9ec6d6', 'stroke-width': .8 }, b);
  el('rect', { x: 34, y: -66, width: 16, height: 48, fill: '#e2574c', ...ST }, b);
  el('rect', { x: 34, y: -66, width: 16, height: 8, fill: '#2f4858' }, b);
  el('path', { d: 'M-80,-18l-6,-38M-86,-56l46,0', stroke: '#6b4a2f', 'stroke-width': 1.6 }, b);
}

function beehives(o: any) {
  const { x: x0, y: y0, count = 5 } = o;
  for (let i = 0; i < count; i++) {
    const x = x0 + (i % 3) * 32, y = y0 + Math.floor(i / 3) * 34, g = prop(y);
    el('rect', { x: x - 10, y: y - 6, width: 20, height: 6, fill: '#8a5a35' }, g);
    el('rect', { x: x - 9, y: y - 26, width: 18, height: 20, fill: i % 2 ? '#fff3d6' : '#ffe08a', ...ST }, g);
    el('path', { d: `M${x - 9},${y - 19}h18M${x - 9},${y - 12}h18`, stroke: '#d6b25a', 'stroke-width': 1 }, g);
    el('rect', { x: x - 11, y: y - 30, width: 22, height: 5, rx: 1, fill: '#a0643a' }, g);
    el('rect', { x: x - 3, y: y - 9, width: 6, height: 2, fill: '#3b2f25' }, g);
  }
  block(x0 - 25, y0 - 40, x0 + 80, y0 + 50);
}

function picnicTable(o: any) {
  const { x, y } = o, g = prop(y), c = '#b07a48';
  el('ellipse', { cx: x + 2, cy: y + 1, rx: 20, ry: 3, fill: 'rgba(40,70,20,.2)' }, g);
  el('path', { d: `M${x - 13},${y}l4,-12M${x + 13},${y}l-4,-12`, stroke: shade(c, -.25), 'stroke-width': 2.2 }, g);
  el('rect', { x: x - 18, y: y - 6, width: 36, height: 3.5, rx: 1.5, fill: c }, g);
  el('rect', { x: x - 15, y: y - 16, width: 30, height: 5, rx: 1.5, fill: c }, g);
}

function picnicBlanket(o: any) {
  const { x, y, angle = -8 } = o, g = el('g', { transform: `rotate(${angle} ${x} ${y})` }, ctx.L.groundProps);
  el('rect', { x: x - 20, y: y - 14, width: 40, height: 28, fill: '#fff' }, g);
  let d = ''; for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) d += `M${x - 20 + i * 8},${y - 14 + j * 7}h8v7h-8z`;
  el('path', { d, fill: '#e2574c' }, g);
  el('circle', { cx: x - 8, cy: y - 4, r: 4, fill: '#c46a3a' }, g); el('circle', { cx: x + 6, cy: y + 3, r: 3, fill: '#e8513f' }, g);
}

function igloo(o: any) {
  const { x, y, s = 1 } = o, g = prop(y);
  el('ellipse', { cx: x + 3, cy: y + 1, rx: 30 * s, ry: 5 * s, fill: 'rgba(60,90,110,.18)' }, g);
  el('path', { d: `M${x - 28 * s},${y}a28,26 0 0 1 ${56 * s},0z`, fill: '#ffffff', stroke: '#c9dde6', 'stroke-width': 1.2 }, g);
  let d = ''; for (const yy of [-8, -16, -22]) { const hw = Math.sqrt(Math.max(0, 1 - (yy / 26) ** 2)) * 28 * s; d += `M${n2(x - hw)},${n2(y + yy * s)}h${n2(2 * hw)}`; }
  for (const k of [-18, -6, 6, 18]) d += `M${x + k * s},${y}v${-8 * s}M${x + (k + 6) * s},${y - 8 * s}v${-8 * s}`;
  el('path', { d, stroke: '#c9dde6', 'stroke-width': 1 }, g);
  el('path', { d: `M${x + 14 * s},${y}v${-10 * s}a8,8 0 0 1 ${16 * s},0v${10 * s}z`, fill: '#ffffff', stroke: '#c9dde6', 'stroke-width': 1.2 }, g);
  el('path', { d: `M${x + 17 * s},${y}v${-8 * s}a5,5 0 0 1 ${10 * s},0v${8 * s}z`, fill: '#2b4c5a' }, g);
  block(x - 35, y - 32, x + 35, y + 8);
}

function snowman(o: any) {
  const { x, y, scarf: c } = o, g = prop(y);
  el('ellipse', { cx: x + 2, cy: y + 1, rx: 12, ry: 3, fill: 'rgba(60,90,110,.2)' }, g);
  el('path', { d: circ(x, y - 9, 10) + circ(x, y - 24, 7.5) + circ(x, y - 36, 5.5), fill: '#ffffff', stroke: '#c9dde6', 'stroke-width': 1 }, g);
  el('path', { d: `M${x - 7},${y - 26}l-10,-6M${x + 7},${y - 26}l10,-7`, stroke: '#6b4a2f', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, g);
  el('path', { d: `M${x + 3},${y - 36}l7,1.5l-7,1.5z`, fill: '#f29e38' }, g);
  el('path', { d: circ(x - 2, y - 38, .8) + circ(x + 2, y - 38, .8) + circ(x, y - 26, .9) + circ(x, y - 21, .9), fill: '#2b2220' }, g);
  el('rect', { x: x - 6, y: y - 47, width: 12, height: 6, fill: '#2b2220' }, g); el('rect', { x: x - 8, y: y - 42, width: 16, height: 2, fill: '#2b2220' }, g);
  el('path', { d: `M${x - 6},${y - 31}h12l-2,4`, stroke: c, 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }, g);
  block(x - 18, y - 50, x + 18, y + 6);
}

/** מחליק על הקרח (דמות עומדת, לא מונפשת) */
function skater(o: any) {
  const { x, y, color: c, flip: f = 1 } = o, g = prop(y), b = el('g', { transform: `translate(${x},${y}) scale(${f},1)` }, g);
  el('ellipse', { cx: 0, cy: 1, rx: 6, ry: 1.6, fill: 'rgba(60,90,110,.25)' }, b);
  el('path', { d: 'M0,-10L-5,0M0,-10L6,-2', stroke: '#3b3b46', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, b);
  el('path', { d: 'M-8,0.5h6M3,-1.5h6', stroke: '#9aa3a8', 'stroke-width': 1 }, b);
  el('path', { d: 'M0,-10L1,-21', stroke: c, 'stroke-width': 5, 'stroke-linecap': 'round' }, b);
  el('path', { d: 'M1,-19l-9,-3M1,-19l9,2', stroke: c, 'stroke-width': 1.8, 'stroke-linecap': 'round' }, b);
  el('circle', { cx: 1.5, cy: -25, r: 3, fill: '#f1c7a5' }, b);
  el('path', { d: 'M-1.5,-26.5a3,3 0 0 1 6,0z', fill: shade(c, -.2) }, b);
}

function iceHut(o: any) {
  const { x, y, color: c } = o, g = prop(y);
  el('rect', { x: x - 11, y: y - 18, width: 22, height: 18, fill: c, ...ST }, g);
  el('path', { d: `M${x - 13},${y - 18}L${x},${y - 28}L${x + 13},${y - 18}Z`, fill: '#ffffff', ...ST }, g);
  el('rect', { x: x - 3, y: y - 10, width: 6, height: 10, fill: shade(c, -.3) }, g);
  el('circle', { cx: x + 18, cy: y - 2, r: 3, fill: '#2b4c5a' }, g);
}

/** טורבינת רוח (עומדת) */
function turbine(o: any) {
  const { x, y, angle: a = 0 } = o, g = prop(y);
  el('path', { d: `M${x - 3},${y}L${x - 1.5},${y - 110}h3L${x + 3},${y}Z`, fill: '#f4f7f8', stroke: '#c9d4dc', 'stroke-width': 1 }, g);
  el('rect', { x: x - 6, y: y - 115, width: 14, height: 7, rx: 3, fill: '#f4f7f8', stroke: '#c9d4dc', 'stroke-width': 1 }, g);
  for (let k = 0; k < 3; k++) {
    const r = (a + k * 120) * Math.PI / 180;
    el('path', { d: `M${x},${y - 111}l${n2(Math.cos(r) * 48 - Math.sin(r) * 3)},${n2(Math.sin(r) * 48 + Math.cos(r) * 3)}l${n2(Math.sin(r) * 5)},${n2(-Math.cos(r) * 5)}z`, fill: '#ffffff', stroke: '#c9d4dc', 'stroke-width': .8 }, g);
  }
  el('circle', { cx: x, cy: y - 111, r: 3, fill: '#dfe5e8' }, g);
  block(x - 50, y - 165, x + 50, y + 8);
}

function cave(o: any) {
  const { x, y } = o, g = el('g', null, ctx.L.ground);
  el('path', { d: `M${x - 45},${y}v-30a45,40 0 0 1 90,0v30z`, fill: '#4a4f57' }, g);
  el('path', { d: `M${x - 30},${y}v-24a30,28 0 0 1 60,0v24z`, fill: '#24272c' }, g);
}

function scarecrow(o: any) {
  const { x, y } = o, g = prop(y);
  el('path', { d: `M${x},${y}v-46M${x - 16},${y - 30}h32`, stroke: '#7a4f2a', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
  el('path', { d: `M${x - 10},${y - 36}h20l-3,20h-14z`, fill: '#4f86c6' }, g);
  el('circle', { cx: x, cy: y - 44, r: 7, fill: '#f2cd5c' }, g);
  el('path', { d: `M${x - 11},${y - 48}h22l-4,-9h-14z`, fill: '#8a5a35' }, g);
}

/** גשר עץ להולכי רגל */
function footbridge(o: any) {
  const { x, y, angle = 0 } = o, g = el('g', { transform: `translate(${x},${y}) rotate(${angle})` }, ctx.L.groundProps);
  el('rect', { x: -40, y: -8, width: 80, height: 16, rx: 3, fill: '#b98552', stroke: '#8a5f39', 'stroke-width': 1.2 }, g);
  let d = ''; for (let k = -36; k <= 36; k += 6) d += `M${k},-8v16`;
  el('path', { d, stroke: '#8a5f39', 'stroke-width': .8 }, g);
  el('path', { d: 'M-40,-9h80M-40,9h80', stroke: '#6b4a2f', 'stroke-width': 2 }, g);
}

/** מעקות אבן של גשר דרך מעל הנהר */
function stoneBridge(o: any) {
  const { x, y, angle = 0 } = o, G = el('g', { transform: `translate(${x},${y}) rotate(${angle})` }, ctx.L.groundProps);
  el('rect', { x: -40, y: -27, width: 80, height: 54, fill: '#e9dcc6' }, G);   // סיפון הגשר מעל המים
  el('rect', { x: -46, y: -31, width: 92, height: 7, rx: 3, fill: '#b5aca2', stroke: '#8f867c', 'stroke-width': 1 }, G);
  el('rect', { x: -46, y: 24, width: 92, height: 7, rx: 3, fill: '#b5aca2', stroke: '#8f867c', 'stroke-width': 1 }, G);
}

function pier(o: any) {
  const { x, y, w = 44, h = 200 } = o, G = ctx.L.groundProps;
  el('rect', { x, y, width: w, height: h, fill: '#b98552', stroke: '#8a5f39', 'stroke-width': 1.5 }, G);
  let d = ''; for (let yy = y + 8; yy < y + h; yy += 9) d += `M${x + 2},${yy}h${w - 4}`;
  el('path', { d, stroke: '#8a5f39', 'stroke-width': 1 }, G);
  for (const [px, py] of [[x + 2, y + 90], [x + w - 2, y + 90], [x + 2, y + h - 2], [x + w - 2, y + h - 2]]) el('circle', { cx: px, cy: py, r: 3.5, fill: '#6b4a2f' }, G);
}

/** יונה שמנקרת (מונפשת, בשכבה הדינמית) */
function pigeon(o: any) {
  const { x, y, flip: f = 1 } = o, b = el('g', { transform: `translate(${x},${y}) scale(${f},1)` }, ctx.L.fx);
  el('ellipse', { cx: 0, cy: 1, rx: 5, ry: 1.3, fill: 'rgba(40,70,20,.2)' }, b);
  el('ellipse', { cx: 0, cy: -4, rx: 5, ry: 3.4, fill: '#a7adb8' }, b);
  el('path', { d: 'M-5,-4l-3,-1.5l1,3z', fill: '#8b919c' }, b);
  const head = el('g', null, b), d0 = rand(0, 1.4);
  const KEYS = [[0, 0], [.55, 0], [.7, 38], [.8, 5], [.88, 36], [1, 0]];
  FX.push(t => {
    const p = wrap1((t + d0) / 1.4); let k = 1; while (KEYS[k][0] < p) k++;
    const [p0, a0] = KEYS[k - 1], [p1, a1] = KEYS[k], u = (p - p0) / (p1 - p0), e = u * u * (3 - 2 * u);
    head.setAttribute('transform', `rotate(${(a0 + (a1 - a0) * e).toFixed(1)} 5.5 -5.5)`);
  });
  el('circle', { cx: 4.2, cy: -7.2, r: 2.2, fill: '#8b919c' }, head);
  el('path', { d: 'M6.2,-7.2l2,.6l-2,.6z', fill: '#e2a33b' }, head);
  el('circle', { cx: 4.9, cy: -7.7, r: .45, fill: '#222' }, head);
  el('path', { d: 'M-1,-1v2M1,-1v2', stroke: '#e07a5f', 'stroke-width': .7 }, b);
}

/** אזור בלי עצים (מלבן) */
function noTrees(o: any) { const [x0, y0, x1, y1] = o.rect; block(x0, y0, x1, y1); }

void rrect;
register({ bench, lamp, bike, signpost, mailbox, haybale, umbrella, sailboat, buoy, ship, beehives, picnicTable, picnicBlanket,
  igloo, snowman, skater, iceHut, turbine, cave, scarecrow, footbridge, stoneBridge, pier, pigeon, noTrees });
