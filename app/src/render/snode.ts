/* ציור נייח בלי SVG של הדפדפן (תשתית לזמן טעינה קצר).
   SNode הוא אלמנט קל בזיכרון עם אותו ממשק שהציור משתמש בו (setAttribute, appendChild, getBBox...).
   הנוף הקבוע נבנה ממנו, והופך ישירות לרשימת הציור של מנוע האריחים: בלי ליצור אלמנטים בדפדפן ובלי למדוד אותם
   (שתי הפעולות האלה היו רוב זמן הטעינה, וגדלו עם גודל העולם).
   החישובים כאן מדויקים כמו של הדפדפן: גבולות של עקומות ושל קשתות לפי הנקודות הקיצוניות שלהן, לא לפי נקודות הבקרה.
   הקובץ בלי תלות בדפדפן, כדי שיוכל לרוץ גם ב-Worker. */

export type M6 = [number, number, number, number, number, number];
export const IDENT: M6 = [1, 0, 0, 1, 0, 0];
export const mul = (a: M6, b: M6): M6 => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];

/** מפרש transform של SVG (translate, scale, rotate, matrix, skewX/Y) למטריצה */
export function parseTransform(s: string | null | undefined): M6 {
  let m: M6 = IDENT;
  if (!s) return m;
  const re = /(\w+)\s*\(([^)]*)\)/g; let r: RegExpExecArray | null;
  while ((r = re.exec(s))) {
    const a = r[2].split(/[\s,]+/).filter(Boolean).map(Number), f = r[1];
    let t: M6 = IDENT;
    if (f === 'translate') t = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (f === 'scale') t = [a[0], 0, 0, a[1] ?? a[0], 0, 0];
    else if (f === 'matrix') t = [a[0], a[1], a[2], a[3], a[4], a[5]];
    else if (f === 'rotate') {
      const q = a[0] * Math.PI / 180, c = Math.cos(q), sn = Math.sin(q), cx = a[1] || 0, cy = a[2] || 0;
      t = [c, sn, -sn, c, cx - c * cx + sn * cy, cy - sn * cx - c * cy];
    } else if (f === 'skewX') t = [1, 0, Math.tan(a[0] * Math.PI / 180), 1, 0, 0];
    else if (f === 'skewY') t = [1, Math.tan(a[0] * Math.PI / 180), 0, 1, 0, 0];
    m = mul(m, t);
  }
  return m;
}

/* ───── גבולות של מסלול (path d) ───── */
type Box = [number, number, number, number];   // x0, y0, x1, y1
const EMPTY = (): Box => [Infinity, Infinity, -Infinity, -Infinity];
const add = (b: Box, x: number, y: number) => { if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; };

/** נקודות הקיצון של עקומת בזייה (ממד אחד): שורשי הנגזרת בטווח 0..1 */
function cubicExt(p0: number, p1: number, p2: number, p3: number, out: number[]) {
  const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0;
  if (Math.abs(a) < 1e-12) { if (Math.abs(b) > 1e-12) { const t = -c / b; if (t > 0 && t < 1) out.push(t); } return; }
  const D = b * b - 4 * a * c; if (D < 0) return;
  const s = Math.sqrt(D);
  for (const t of [(-b + s) / (2 * a), (-b - s) / (2 * a)]) if (t > 0 && t < 1) out.push(t);
}
const cub = (p0: number, p1: number, p2: number, p3: number, t: number) => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; };

function arcBox(b: Box, x1: number, y1: number, rx: number, ry: number, phi: number, fa: number, fs: number, x2: number, y2: number) {
  add(b, x2, y2);
  if (!rx || !ry) return;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const p = phi * Math.PI / 180, cp = Math.cos(p), sp = Math.sin(p);
  // המרה לייצוג מרכזי (מפרט SVG, נספח F.6.5)
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  const lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry);
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = (fa === fs ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const pt = (t: number) => [cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp];
  // זוויות הקיצון של האליפסה (בציר x ובציר y), אם הן בתוך הקשת
  const ex = Math.atan2(-ry * sp, rx * cp), ey = Math.atan2(ry * cp, rx * sp);
  for (const base of [ex, ex + Math.PI, ey, ey + Math.PI]) {
    for (let k = -2; k <= 2; k++) {
      const t = base + k * 2 * Math.PI, u = (t - t1) / dt;
      if (u > 0 && u < 1) { const q = pt(t); add(b, q[0], q[1]); }
    }
  }
}

/** הגבולות המדויקים של מסלול SVG */
export function pathBox(d: string): Box {
  // סורק ידני (מהיר בהרבה מביטוי רגולרי): פקודה, או מספר
  const b = EMPTY(), L = d.length;
  let p = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lcx = 0, lcy = 0, lq = false, lc = false, qx = 0, qy = 0;
  const skip = () => { while (p < L) { const c = d.charCodeAt(p); if (c === 32 || c === 44 || c === 10 || c === 13 || c === 9) p++; else break; } };
  // מספר בלי ליצור מחרוזות זמניות (מהיר יותר פי כמה, וחשוב כשיש עשרות אלפי צורות)
  const n = () => {
    skip();
    let sg = 1, v = 0, c = d.charCodeAt(p);
    if (c === 45) { sg = -1; p++; } else if (c === 43) p++;
    while (p < L) { c = d.charCodeAt(p); if (c >= 48 && c <= 57) { v = v * 10 + (c - 48); p++; } else break; }
    if (c === 46) {
      p++; let f = .1;
      while (p < L) { c = d.charCodeAt(p); if (c >= 48 && c <= 57) { v += (c - 48) * f; f *= .1; p++; } else break; }
    }
    if (c === 101 || c === 69) {
      p++; let es = 1, e = 0; c = d.charCodeAt(p);
      if (c === 45) { es = -1; p++; } else if (c === 43) p++;
      while (p < L) { c = d.charCodeAt(p); if (c >= 48 && c <= 57) { e = e * 10 + (c - 48); p++; } else break; }
      v *= 10 ** (es * e);
    }
    return sg * v;
  };
  const isCmd = () => { skip(); if (p >= L) return false; const c = d.charCodeAt(p); return (c >= 65 && c <= 90 || c >= 97 && c <= 122) && c !== 101 && c !== 69; };
  let guard = -1;
  while (true) {
    if (p === guard) p++;   // תו לא צפוי: מדלגים עליו (לא נתקעים בלולאה)
    guard = p;
    if (isCmd()) cmd = d[p++];
    else { skip(); if (p >= L) break; }
    const rel = cmd === cmd.toLowerCase() && cmd !== 'z' && cmd !== 'Z', C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    let wasC = false, wasQ = false;
    if (C === 'Z') { x = sx; y = sy; add(b, x, y); continue; }
    if (C === 'M') { x = ox + n(); y = oy + n(); sx = x; sy = y; add(b, x, y); cmd = rel ? 'l' : 'L'; }
    else if (C === 'L') { x = ox + n(); y = oy + n(); add(b, x, y); }
    else if (C === 'H') { x = ox + n(); add(b, x, y); }
    else if (C === 'V') { y = oy + n(); add(b, x, y); }
    else if (C === 'C' || C === 'S') {
      let x1: number, y1: number;
      if (C === 'C') { x1 = ox + n(); y1 = oy + n(); } else { x1 = lc ? 2 * x - lcx : x; y1 = lc ? 2 * y - lcy : y; }
      const x2 = ox + n(), y2 = oy + n(), x3 = ox + n(), y3 = oy + n(), ts: number[] = [];
      cubicExt(x, x1, x2, x3, ts); cubicExt(y, y1, y2, y3, ts);
      for (const t of ts) add(b, cub(x, x1, x2, x3, t), cub(y, y1, y2, y3, t));
      add(b, x3, y3); lcx = x2; lcy = y2; x = x3; y = y3; wasC = true;
    } else if (C === 'Q' || C === 'T') {
      let x1: number, y1: number;
      if (C === 'Q') { x1 = ox + n(); y1 = oy + n(); } else { x1 = lq ? 2 * x - qx : x; y1 = lq ? 2 * y - qy : y; }
      const x2 = ox + n(), y2 = oy + n();
      // קיצון של בזייה ריבועית: t = (p0 - p1) / (p0 - 2p1 + p2)
      for (const [a0, a1, a2] of [[x, x1, x2], [y, y1, y2]]) {
        const den = a0 - 2 * a1 + a2; if (Math.abs(den) < 1e-12) continue;
        const t = (a0 - a1) / den; if (t > 0 && t < 1) { const u = 1 - t; add(b, u * u * x + 2 * u * t * x1 + t * t * x2, u * u * y + 2 * u * t * y1 + t * t * y2); }
      }
      add(b, x2, y2); qx = x1; qy = y1; x = x2; y = y2; wasQ = true;
    } else if (C === 'A') {
      const rx = n(), ry = n(), phi = n(), fa = n(), fs = n(), x2 = ox + n(), y2 = oy + n();
      arcBox(b, x, y, rx, ry, phi, fa, fs, x2, y2); x = x2; y = y2;
    } else { p++; continue; }
    lc = wasC; lq = wasQ;
  }
  return b;
}

/** הגבולות של אלמנט בודד במערכת הקואורדינטות שלו (בלי ה-transform שלו), כמו getBBox */
export function leafBox(tag: string, a: Record<string, string>): Box | null {
  const num = (k: string) => +a[k] || 0;
  if (tag === 'path') return a.d ? pathBox(a.d) : null;
  if (tag === 'rect') return [num('x'), num('y'), num('x') + num('width'), num('y') + num('height')];
  if (tag === 'circle') { const r = num('r'); return [num('cx') - r, num('cy') - r, num('cx') + r, num('cy') + r]; }
  if (tag === 'ellipse') { const rx = num('rx'), ry = num('ry'); return [num('cx') - rx, num('cy') - ry, num('cx') + rx, num('cy') + ry]; }
  return null;
}
export function boxThrough(m: M6, b: Box): Box {
  const o = EMPTY();
  for (const [px, py] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) add(o, m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]);
  return o;
}

/** אלמנט נייח קל (במקום אלמנט SVG של הדפדפן) */
export class SNode {
  tagName: string; attrs: Record<string, string> = {}; kids: SNode[] = []; parent: SNode | null = null; text = '';
  constructor(tag: string) { this.tagName = tag; }
  setAttribute(k: string, v: any) { this.attrs[k] = String(v); }
  getAttribute(k: string) { return this.attrs[k] ?? null; }
  hasAttribute(k: string) { return k in this.attrs; }
  removeAttribute(k: string) { delete this.attrs[k]; }
  appendChild(c: SNode) { c.remove(); c.parent = this; this.kids.push(c); return c; }
  insertBefore(c: SNode, ref: SNode | null) {
    c.remove(); c.parent = this;
    const i = ref ? this.kids.indexOf(ref) : -1;
    if (i < 0) this.kids.push(c); else this.kids.splice(i, 0, c);
    return c;
  }
  remove() { if (this.parent) { const i = this.parent.kids.indexOf(this); if (i >= 0) this.parent.kids.splice(i, 1); this.parent = null; } }
  get firstChild() { return this.kids[0] ?? null; }
  get children() { return this.kids; }
  get textContent() { return this.text; }
  set textContent(v: string) { this.text = v; }
  /** כמו getBBox של הדפדפן: הגבולות במערכת הקואורדינטות של האלמנט (כולל ה-transform של הצאצאים, בלי שלו) */
  box(): Box {
    if (this.tagName === 'g') {
      const o = EMPTY();
      for (const k of this.kids) {
        if (k.attrs.display === 'none') continue;
        const kb = k.box(); if (!(kb[0] <= kb[2])) continue;
        const t = k.attrs.transform ? boxThrough(parseTransform(k.attrs.transform), kb) : kb;
        add(o, t[0], t[1]); add(o, t[2], t[3]);
      }
      return o;
    }
    if (this.tagName === 'text') {
      // אין גופן בלי דפדפן: הערכה לפי גודל הגופן ואורך הטקסט
      const fs = +(this.attrs['font-size'] || 12), w = this.text.length * fs * .56, x = +(this.attrs.x || 0), y = +(this.attrs.y || 0);
      const anc = this.attrs['text-anchor'], x0 = anc === 'middle' ? x - w / 2 : anc === 'end' ? x - w : x;
      return [x0, y - fs * .8, x0 + w, y + fs * .2];
    }
    return leafBox(this.tagName, this.attrs) ?? EMPTY();
  }
  getBBox() { const b = this.box(); return b[0] <= b[2] ? { x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1] } : { x: 0, y: 0, width: 0, height: 0 }; }
}
