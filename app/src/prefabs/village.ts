/* אבני בניין של כפר מסודר: מגרש עם גינה, כיכר תנועה */
import { el, circ, rrect, n2, blob } from '../core/util';
import { rand, R, rngAt } from '../core/rng';
import { ctx, block } from '../world/context';
import { register } from './registry';
import { ROAD_W } from '../world/geometry';
import { markPrivate, markLine, SOLID } from '../world/walk';

/** המגרש של כל דלת (כדי לדעת מי מורשה להיכנס) */
export const plotDoors: { x: number; y: number; id: number }[] = [];
export const plotOfDoor = (d: number[] | undefined) => d ? plotDoors.find(p => Math.abs(p.x - d[0]) < 6 && Math.abs(p.y - d[1]) < 10)?.id ?? 0 : 0;

/** מגרש של בית: מדשאה, גדר חיה או גדר כלונסאות, שביל מהדלת לרחוב וערוגה ליד הבית.
 *  door: [x, y] של דלת הבית; street: 'top' | 'bottom' – לאיזה צד של המגרש פונה הרחוב */
function plot(o: any) {
  const { x0, y0, x1, y1, fence = 'hedge', door, street = 'bottom', bed = true } = o, G = ctx.L.groundProps;
  let gateX = door ? door[0] : (x0 + x1) / 2;
  el('path', { d: rrect(x0, y0, x1 - x0, y1 - y0, 7), fill: '#b3d98a' }, G);
  if (fence === 'hedge') el('path', { d: rrect(x0, y0, x1 - x0, y1 - y0, 7), fill: 'none', stroke: '#6f9f52', 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, G);
  else {
    el('path', { d: rrect(x0, y0, x1 - x0, y1 - y0, 4), fill: 'none', stroke: '#f6eedf', 'stroke-width': 1.6 }, G);
    el('path', { d: rrect(x0, y0, x1 - x0, y1 - y0, 4), fill: 'none', stroke: '#f6eedf', 'stroke-width': 3.2, 'stroke-dasharray': '1.4 4' }, G);
  }
  if (door) {
    // שביל מרוצף מהדלת לשער
    // השביל מגיע עד שפת הדרך הצרה (המגרשים תוכננו לדרך רחבה יותר)
    const reach = 3 + (25 - ROAD_W / 2), [dx, dy] = door, ey = street === 'bottom' ? y1 + reach : y0 - reach;
    const seg = (ax: number, ay: number, bx: number, by: number) => {   // קטע שביל מרוצף (אופקי או אנכי)
      const x = Math.min(ax, bx) - 5, y = Math.min(ay, by) - (ax === bx ? 0 : 5), w = Math.abs(bx - ax) + 10, h = ax === bx ? Math.abs(by - ay) : 10;
      el('rect', { x, y, width: w, height: h, rx: 2, fill: '#ecd7b5' }, G);
      let d = '';
      if (ax === bx) for (let yy = y + 5; yy < y + h - 2; yy += 7) d += `M${ax - 4},${yy}h8`;
      else for (let xx = x + 5; xx < x + w - 2; xx += 7) d += `M${xx},${ay - 4}v8`;
      el('path', { d, stroke: '#dcc29b', 'stroke-width': .9 }, G);
    };
    gateX = dx;
    if (street === 'bottom') seg(dx, dy, dx, ey);
    else {
      // הרחוב מאחורי הבית: מהדלת קצת קדימה, לצד הרחב של המגרש לאורך הגדר, ומשם אל השער
      const side = x1 - dx >= dx - x0 ? 1 : -1, sx = side > 0 ? x1 - 9 : x0 + 9;
      seg(dx, dy, dx, dy + 8); seg(dx, dy + 8, sx, dy + 8); seg(sx, dy + 8, sx, ey);
      gateX = sx;
    }
    if (fence === 'hedge') el('rect', { x: gateX - 7, y: (street === 'bottom' ? y1 : y0) - 3, width: 14, height: 6, fill: '#b3d98a' }, G);   // פתח בגדר
  }
  if (bed && door) {
    // הערוגה הישנה צרכה מספרים מהמחולל הכללי; צורכים אותם גם עכשיו, כדי שהיער ושאר העולם יישארו במקומם
    R(); rand(16, 24); for (let i = 0; i < 7; i++) { rand(-8, 8); rand(-2.5, 2.5); } R();
    flowerBed(G, x0, y0, x1, y1, door, street);
  }
  block(x0, y0, x1, y1 + 30);
  // מפת מעבר: פנים המגרש פרטי (רק לדיירים), והגדר סביבו חסומה חוץ מהשער מול השביל
  const id = plotDoors.length + 1, gy = street === 'bottom' ? y1 : y0, gx = gateX;
  markPrivate(x0, y0, x1, y1, id);
  if (door) plotDoors.push({ x: door[0], y: door[1], id });
  const other = street === 'bottom' ? y0 : y1;
  markLine([[x0, other], [x1, other]], 3, SOLID); markLine([[x0, y0], [x0, y1]], 3, SOLID); markLine([[x1, y0], [x1, y1]], 3, SOLID);
  markLine([[x0, gy], [gx - 9, gy]], 3, SOLID); markLine([[gx + 9, gy], [x1, gy]], 3, SOLID);
}

/** ערוגת פרחים: רק בחלק מהמגרשים, ובכל מגרש במקום אחר, בצורה אחרת ועם פרחים אחרים */
function flowerBed(G: any, x0: number, y0: number, x1: number, y1: number, door: number[], street: string) {
  const v = rngAt(door[0], door[1], 13);
  if (!v.chance(.55)) return;
  const [dx, dy] = door, front = street === 'bottom' ? 1 : -1, fy = street === 'bottom' ? y1 : y0;
  // מקומות פנויים וגלויים במגרש: לפני החזית או בצדי הבית ליד החזית (מאחור הבית מסתיר)
  const spots: [number, number, number, number][] = [];   // מרכז, רוחב, גובה
  const sideL = dx - 31 - (x0 + 4), sideR = x1 - 4 - (dx + 31), gapF = Math.abs(fy - dy) - 6;
  if (sideL > 8) spots.push([x0 + 3 + sideL / 2, dy - 9, sideL - 1, 18]);                       // בצד הבית, משמאל
  if (sideR > 8) spots.push([x1 - 3 - sideR / 2, dy - 9, sideR - 1, 18]);                       // בצד הבית, מימין
  if (gapF > 5) {
    spots.push([x0 + 16, dy + front * (gapF / 2 + 2), 22, gapF]);                             // פינה קדמית שמאלית
    spots.push([x1 - 16, dy + front * (gapF / 2 + 2), 22, gapF]);                             // פינה קדמית ימנית
    const s = v.chance(.5) ? -1 : 1;
    spots.push([dx + s * 22, dy + front * (gapF / 2 + 1), 26, Math.min(gapF, 9)]);            // ליד הדלת, באחד הצדדים
  }
  if (!spots.length) return;
  const [cx, cy, bw0, bh0] = v.pick(spots);
  const tall = bh0 > bw0 * 1.3, bw = Math.min(bw0, tall ? 14 : 30), bh = Math.min(bh0, tall ? 30 : 11);
  const soil = v.pick(['#9c7552', '#8e6a4a', '#a37b56']);
  // צורה
  const shape = v.pick(tall ? ['rect', 'oval', 'pair'] : ['oval', 'rect', 'round', 'kidney', 'pair']);
  const areas: [number, number, number, number][] = [];   // אזורים לשתילה: מרכז ורדיוסים
  if (shape === 'pair') {
    const r = Math.min(bw, bh) / 2 * .9, ox = tall ? 0 : bw / 4, oy = tall ? bh / 4 : 0;
    for (const s of [-1, 1]) { el('circle', { cx: cx + s * ox, cy: cy + s * oy, r, fill: soil }, G); areas.push([cx + s * ox, cy + s * oy, r * .7, r * .6]); }
  } else if (shape === 'rect') {
    el('path', { d: rrect(cx - bw / 2, cy - bh / 2, bw, bh, 2), fill: soil }, G); areas.push([cx, cy, bw / 2 - 2, bh / 2 - 1.5]);
  } else if (shape === 'round') {
    const r = Math.min(bw, bh) * .6; el('circle', { cx, cy, r, fill: soil }, G); areas.push([cx, cy, r * .75, r * .7]);
  } else if (shape === 'kidney') {
    el('path', { d: blob(cx, cy, bw / 2, bh / 2, 7, .18, v.rand(0, 6)), fill: soil }, G); areas.push([cx, cy, bw / 2 - 2.5, bh / 2 - 1.5]);
  } else {
    el('ellipse', { cx, cy, rx: bw / 2, ry: bh / 2, fill: soil }, G); areas.push([cx, cy, bw / 2 - 2.5, bh / 2 - 1.5]);
  }
  // שוליים: אבנים קטנות, קורת עץ, לבנים, או בלי
  const edge = v.pick(['stones', 'wood', 'brick', 'none', 'none']);
  if (edge !== 'none') for (const [ax, ay, rx, ry] of areas) {
    const Rx = rx + 2.6, Ry = ry + 2;
    if (edge === 'stones') { let st = ''; for (let t = 0; t < 6.28; t += 6.28 / Math.max(8, Math.round((Rx + Ry) * .9))) st += circ(ax + Math.cos(t) * Rx, ay + Math.sin(t) * Ry, v.rand(1, 1.5)); el('path', { d: st, fill: '#d6d0c4', stroke: '#a9a194', 'stroke-width': .4 }, G); }
    else if (shape === 'rect') el('path', { d: rrect(ax - Rx, ay - Ry, 2 * Rx, 2 * Ry, 1.5), fill: 'none', stroke: edge === 'wood' ? '#8a5a35' : '#b5654a', 'stroke-width': 1.6, 'stroke-dasharray': edge === 'brick' ? '3 .8' : undefined }, G);
    else el('ellipse', { cx: ax, cy: ay, rx: Rx, ry: Ry, fill: 'none', stroke: edge === 'wood' ? '#8a5a35' : '#b5654a', 'stroke-width': 1.4, 'stroke-dasharray': edge === 'brick' ? '3 .8' : undefined }, G);
  }
  // שתילה: עלים ירוקים ופרחים (נמוכים, צבעונים או גבוהים), בצבע אחד עד שלושה
  const COLORS = ['#f6d05a', '#e48aa5', '#ffffff', '#f2a65a', '#e2574c', '#b48ad6', '#7aa7e0'];
  const cols = Array.from({ length: v.pick([1, 2, 3]) }, () => v.pick(COLORS)), kind = v.pick(['low', 'low', 'tulip', 'tall']);
  let leaf = '', stem = '';
  const flowers: Record<string, string> = {}, centers: string[] = [];
  for (const [ax, ay, rx, ry] of areas) {
    const n = Math.max(3, Math.round(rx * ry * .35));
    for (let i = 0; i < n; i++) {
      const t = v.rand(0, 6.28), r = Math.sqrt(v.r()), px = ax + Math.cos(t) * rx * r, py = ay + Math.sin(t) * ry * r, c = v.pick(cols);
      leaf += circ(px + v.rand(-1, 1), py + 1, v.rand(1.6, 2.4));
      if (kind === 'tall') { stem += `M${n2(px)},${n2(py + 1)}v-5`; flowers[c] = (flowers[c] || '') + circ(px, py - 4.5, 1.5); }
      else if (kind === 'tulip') { stem += `M${n2(px)},${n2(py + 1)}v-3`; flowers[c] = (flowers[c] || '') + `M${n2(px - 1.3)},${n2(py - 2)}v-2l.65,.8l.65,-.8l.65,.8l.65,-.8v2a1.3,1.3 0 0 1 -2.6,0z`; }
      else { flowers[c] = (flowers[c] || '') + circ(px - .9, py, .9) + circ(px + .9, py, .9) + circ(px, py - .9, .9) + circ(px, py + .9, .9); centers.push(circ(px, py, .5)); }
    }
  }
  el('path', { d: leaf, fill: v.pick(['#5c9e4a', '#6aae4e', '#4f9446']) }, G);
  if (stem) el('path', { d: stem, stroke: '#4f8a3e', 'stroke-width': .6 }, G);
  for (const c in flowers) el('path', { d: flowers[c], fill: c }, G);
  if (centers.length) el('path', { d: centers.join(''), fill: '#f2b33d' }, G);
}

/** כיכר הכפר (בלי מכוניות): רחבה מרוצפת שהדרכים נפגשות בה, עם מקום להלך מסביב למזרקה שבמרכז.
 *  ריצוף אבנים בטבעות, שפת אבן, וטבעת פרחים נמוכה סביב המזרקה (המזרקה עצמה אובייקט נפרד) */
function roundabout(o: any) {
  const { x, y, r = 40 } = o, G = ctx.L.groundProps, R = r + 42, v = rngAt(x, y, 33);
  el('circle', { cx: x, cy: y, r: R + 3, fill: '#d9c7a6' }, G);
  el('circle', { cx: x, cy: y, r: R, fill: '#ece0c8' }, G);
  // אבני ריצוף: טבעות של אבנים קטנות מעוגלות, כל אבן קצת אחרת
  let st = '';
  for (let rr = 12; rr < R - 3; rr += 7.5) {
    const n = Math.round(2 * Math.PI * rr / 8.5), off = v.rand(0, 1);
    for (let k = 0; k < n; k++) { const a = (k + off) / n * Math.PI * 2, w = v.rand(5.2, 6.6), h = v.rand(4.4, 5.6), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; st += rrect(px - w / 2, py - h / 2, w, h, 1.8); }
  }
  el('path', { d: st, fill: '#e3d4b8', stroke: '#d4c19f', 'stroke-width': .5 }, G);
  // שפת אבן ופרחים סביב המזרקה (נמוכים: לא מסתירים)
  el('ellipse', { cx: x, cy: y + 5, rx: 46, ry: 22, fill: '#a9d37c', stroke: '#cdb895', 'stroke-width': 2 }, G);
  let d = ''; for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2; d += circ(x + Math.cos(a) * 40, y + 5 + Math.sin(a) * 17, 2); }
  el('path', { d, fill: '#f2c94c' }, G);
  block(x - R, y - R, x + R, y + R);
}

register({ plot, roundabout });
