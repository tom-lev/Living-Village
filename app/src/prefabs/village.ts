/* אבני בניין של כפר מסודר: מגרש עם גינה, כיכר תנועה */
import { el, circ, rrect } from '../core/util';
import { rand, R } from '../core/rng';
import { ctx, block } from '../world/context';
import { register } from './registry';

/** מגרש של בית: מדשאה, גדר חיה או גדר כלונסאות, שביל מהדלת לרחוב וערוגה ליד הבית.
 *  door: [x, y] של דלת הבית; street: 'top' | 'bottom' – לאיזה צד של המגרש פונה הרחוב */
function plot(o: any) {
  const { x0, y0, x1, y1, fence = 'hedge', door, street = 'bottom', bed = true } = o, G = ctx.L.groundProps;
  el('path', { d: rrect(x0, y0, x1 - x0, y1 - y0, 7), fill: '#b3d98a' }, G);
  if (fence === 'hedge') el('path', { d: rrect(x0, y0, x1 - x0, y1 - y0, 7), fill: 'none', stroke: '#6f9f52', 'stroke-width': 4.5, 'stroke-linejoin': 'round' }, G);
  else {
    el('path', { d: rrect(x0, y0, x1 - x0, y1 - y0, 4), fill: 'none', stroke: '#f6eedf', 'stroke-width': 1.6 }, G);
    el('path', { d: rrect(x0, y0, x1 - x0, y1 - y0, 4), fill: 'none', stroke: '#f6eedf', 'stroke-width': 3.2, 'stroke-dasharray': '1.4 4' }, G);
  }
  if (door) {
    // שביל מרוצף מהדלת לשער
    const [dx, dy] = door, ey = street === 'bottom' ? y1 + 3 : y0 - 3, top = Math.min(dy, ey), h = Math.abs(ey - dy);
    el('rect', { x: dx - 5, y: top, width: 10, height: h, rx: 2, fill: '#ecd7b5' }, G);
    let d = ''; for (let yy = top + 5; yy < top + h - 2; yy += 7) d += `M${dx - 4},${yy}h8`;
    el('path', { d, stroke: '#dcc29b', 'stroke-width': .9 }, G);
    if (fence === 'hedge') el('rect', { x: dx - 7, y: (street === 'bottom' ? y1 : y0) - 3, width: 14, height: 6, fill: '#b3d98a' }, G);   // פתח בגדר
  }
  if (bed && door) {
    // ערוגת פרחים קטנה לצד השביל, מתחת לחזית
    const by = Math.min(y1 - 10, door[1] + 9), bx = door[0] + (R() < .5 ? -1 : 1) * rand(16, 24);
    el('ellipse', { cx: bx, cy: by, rx: 11, ry: 4.5, fill: '#9c7552' }, G);
    let d = ''; for (let i = 0; i < 7; i++) d += circ(bx + rand(-8, 8), by + rand(-2.5, 2.5), 1.6);
    el('path', { d, fill: ['#f6d05a', '#e48aa5', '#ffffff', '#f2a65a'][Math.floor(R() * 4)] }, G);
  }
  block(x0, y0, x1, y1 + 30);
}

/** כיכר תנועה: אי ירוק עם שפת אבן; המזרקה מגיעה כאובייקט נפרד */
function roundabout(o: any) {
  const { x, y, r = 40 } = o, G = ctx.L.groundProps;
  el('circle', { cx: x, cy: y, r: r + 4, fill: '#e3d3bb', stroke: '#cdb895', 'stroke-width': 1.2 }, G);
  el('circle', { cx: x, cy: y, r, fill: '#a9d37c' }, G);
  let d = ''; for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; d += circ(x + Math.cos(a) * (r - 7), y + Math.sin(a) * (r - 7), 2); }
  el('path', { d, fill: '#f2c94c' }, G);
  block(x - r, y - r, x + r, y + r);
}

register({ plot, roundabout });
