/* כלי עזר משותפים: SVG, מספרים, צבעים ומסלולים */
import { grade, COLOR_ATTRS, rememberColor } from './palette';
import { VNode } from '../render/vnode';

export const NS = 'http://www.w3.org/2000/svg';

/** יוצר אלמנט SVG עם תכונות, ומוסיף אותו להורה (אם ניתן) */
/** מונה עלות ציור (לתקציב הביצועים, world/budget.ts): כמה אלמנטים נוצרו וכמה נקודות יש בצורות שלהם */
export const drawCost = { els: 0, pts: 0 };
export function el(tag: string, a?: Record<string, any> | null, parent?: Element | null): any {
  // הורה בכרטיס הגרפי → גם הילד שם; אחרת אלמנט SVG רגיל
  const e: any = parent instanceof VNode ? new VNode(tag) : document.createElementNS(NS, tag);
  drawCost.els++;
  if (a?.d) drawCost.pts += (String(a.d).match(/[-\d.]+/g)?.length ?? 0) / 2;
  if (a) for (const k in a) {
    if (COLOR_ATTRS.has(k)) { rememberColor(e, k, a[k]); e.setAttribute(k, grade(a[k])); }
    else e.setAttribute(k, a[k]);
  }
  if (parent) parent.appendChild(e);
  return e;
}

/** מציג או מסתיר (מה שזז ויצא מהמסך מוסתר, כדי שלא יישאר מצויר קפוא במקום הישן) */
export const show = (e: any, on: boolean) => e.setAttribute('display', on ? 'inline' : 'none');

export const clamp =(v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const wrap1 = (v: number) => v - Math.floor(v);
export const n2 = (v: number) => Math.round(v * 100) / 100;
export const P = (p: number[]) => n2(p[0]) + ',' + n2(p[1]);

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255]
    .map(v => clamp(Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt), 0, 255));
  return '#' + ((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1);
}

export const circ = (cx: number, cy: number, r: number) =>
  `M${n2(cx - r)},${n2(cy)}a${n2(r)},${n2(r)} 0 1,0 ${n2(2 * r)},0a${n2(r)},${n2(r)} 0 1,0 ${n2(-2 * r)},0`;

export const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${n2(x + r)},${n2(y)}h${n2(w - 2 * r)}a${r},${r} 0 0 1 ${r},${r}v${n2(h - 2 * r)}a${r},${r} 0 0 1 ${-r},${r}h${n2(-(w - 2 * r))}a${r},${r} 0 0 1 ${-r},${-r}v${n2(-(h - 2 * r))}a${r},${r} 0 0 1 ${r},${-r}Z`;

/** מסלול סגור וחלק דרך נקודות (Catmull-Rom → Bézier) */
export function smoothClosed(pts: number[][]) {
  const n = pts.length; let d = `M${P(pts[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`;
  }
  return d + 'Z';
}

/** מסלול פתוח וחלק דרך נקודות */
export function smoothOpen(pts: number[][]) {
  let d = `M${P(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += `C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`;
  }
  return d;
}

/** צורה אורגנית (אגם, שיח, שדה) סביב מרכז */
export function blob(cx: number, cy: number, rx: number, ry: number, n: number, wob: number, seed: number) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, r = 1 + wob * Math.sin(3 * a + seed) + wob * .6 * Math.cos(5 * a + seed * 2);
    pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return smoothClosed(pts);
}

/** טרנספורמציה של הגדלה סביב נקודה */
export const at = (cx: number, cy: number, sx: number, sy: number) =>
  `translate(${n2(cx)},${n2(cy)}) scale(${sx.toFixed(3)},${sy.toFixed(3)}) translate(${n2(-cx)},${n2(-cy)})`;

/** קו מתאר עדין לבניינים */
export const ST = { stroke: 'rgba(70,45,25,.35)', 'stroke-width': 1.2, 'stroke-linejoin': 'round' };
