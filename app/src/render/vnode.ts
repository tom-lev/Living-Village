/* שכבת תרגום: "אלמנט" עם הממשק של SVG שבונה צורות וקטוריות ב-PixiJS (כרטיס גרפי).
   הקוד של הדמויות והאפקטים ממשיך לקרוא ל-el() ול-setAttribute כרגיל, והשכבה הזאת
   הופכת אותם לאובייקטים על הכרטיס הגרפי: אין ציור מחדש של שכבה שלמה בזום, רק מטריצה אחת.
   הגאומטריה נבנית פי S (ומוקטנת חזרה), כדי שעיגולים ועקומות יישארו חלקים גם בזום עמוק. */
import { Container, Graphics, GraphicsPath, Sprite, Text, Texture, Matrix } from 'pixi.js';

const S = 8;
const SHAPES = new Set(['path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline']);
const GEOM = new Set(['d', 'x', 'y', 'width', 'height', 'rx', 'ry', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points']);
const STYLE = new Set(['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'font-size', 'font-weight', 'font-family', 'font-style', 'text-anchor', 'fill-opacity', 'stroke-opacity']);
const INHERIT = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'font-size', 'font-weight', 'font-family', 'font-style', 'text-anchor'];
const dirty = new Set<VNode>();
/* טקסט (שלטים, שמות מקומות): נצבע לתמונה ברזולוציה שצריך בזום הנוכחי – לא פי 8 תמיד (זה היה פי עשרות פיקסלים מהדרוש,
   וההעלאה שלהם לכרטיס הגרפי עלתה כשתי שניות בטעינה בטלפון). כשהמצלמה נעצרת בזום אחר, הטקסטים שעל המסך נצבעים מחדש */
const texts = new Set<VNode>();
const pow2 = (v: number) => Math.min(16, Math.max(.25, 2 ** Math.ceil(Math.log2(Math.max(v, 1e-3)))));
/** רזולוציית הטקסט הדרושה: כמה פיקסלים של המסך יש ליחידה של הטקסט (כולל הזום וצפיפות המסך) */
// הגודל על המסך מחושב במדויק (גם לפני הציור הראשון, כשהמיקום השמור עוד לא עודכן – אחרת כל השלטים נצבעו פעמיים)
const TM = new Matrix(), textNeed = (n: VNode, dpr: number) => pow2(Math.abs(n.c.getGlobalTransform(TM, false).a) * dpr);
/** נקרא כשהמצלמה עומדת: טקסט נראה שהרזולוציה שלו רחוקה מהדרוש (פי 2) – נצבע מחדש */
export function refreshTextResolution(dpr: number) {
  let changed = 0;
  for (const n of texts) {
    if (!n.c.visible || !n.c.parent) continue;
    const want = textNeed(n, dpr);
    if (want !== n.textRes) { n.textRes = want; dirty.add(n); changed++; }
  }
  return changed;
}
export const TEXT_DPR = { v: 1 };
let defsRoot: Element | null = null;
export const setDefs = (e: Element) => { defsRoot = e; };

/* ───────── צבעים ───────── */
const colorCache = new Map<string, [number, number] | null>();
function parseColor(c: string): [number, number] | null {
  let r = colorCache.get(c);
  if (r !== undefined) return r;
  r = null;
  const s = c.trim().toLowerCase();
  if (s[0] === '#') {
    let h = s.slice(1); if (h.length === 3) h = h.replace(/./g, x => x + x);
    if (h.length === 6) r = [parseInt(h, 16), 1];
  } else if (s.startsWith('rgb')) {
    const v = s.slice(s.indexOf('(') + 1, -1).split(',').map(Number);
    r = [(v[0] << 16) | (v[1] << 8) | v[2], v.length > 3 ? v[3] : 1];
  } else if (s === 'white') r = [0xffffff, 1];
  else if (s === 'black') r = [0, 1];
  colorCache.set(c, r);
  return r;
}

/* ───────── מסלולי SVG: מכפילים את כל המספרים פי S (חוץ מסיבוב ודגלים בקשתות) ───────── */
const pathCache = new Map<string, string>();
function scalePath(d: string) {
  let out = pathCache.get(d);
  if (out) return out;
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  const res: string[] = []; let cmd = '', idx = 0;
  for (const t of toks) {
    if (/[a-zA-Z]/.test(t)) { cmd = t; idx = 0; res.push(t); continue; }
    let v = +t;
    if (cmd === 'A' || cmd === 'a') { const k = idx % 7; if (k !== 2 && k !== 3 && k !== 4) v *= S; }
    else v *= S;
    idx++; res.push(String(+v.toFixed(3)));
  }
  out = res.join(' ');
  if (pathCache.size > 4000) pathCache.clear();
  pathCache.set(d, out);
  return out;
}

/* ───────── מטריצות transform ───────── */
function parseTransform(t: string): Matrix {
  // מפענח ידני (בלי ביטויים רגולריים, בלי מטריצות ביניים ובלי מטמון): נקרא בכל פריים לכל דבר שזז, והמחרוזות כמעט תמיד חדשות
  let a = 1, b = 0, c = 0, d = 1, e = 0, f = 0, i = 0;
  const n = t.length, v: number[] = [];
  while (i < n) {
    while (i < n && !isLetter(t.charCodeAt(i))) i++;
    const s0 = i; while (i < n && isLetter(t.charCodeAt(i))) i++;
    const op = t.slice(s0, i);
    while (i < n && t.charCodeAt(i) !== 40) i++;   // '('
    i++; v.length = 0;
    while (i < n && t.charCodeAt(i) !== 41) {     // ')'
      const ch = t.charCodeAt(i);
      if (ch === 32 || ch === 44 || ch === 9 || ch === 10) { i++; continue; }   // רווח, פסיק
      const s1 = i; i++;
      while (i < n) { const q = t.charCodeAt(i); if ((q >= 48 && q <= 57) || q === 46 || ((q === 45 || q === 43) && (t.charCodeAt(i - 1) | 32) === 101) || (q | 32) === 101) i++; else break; }
      v.push(+t.slice(s1, i));
    }
    i++;
    if (!op) break;
    let oa = 1, ob = 0, oc = 0, od = 1, oe = 0, of = 0;
    if (op === 'matrix') { oa = v[0]; ob = v[1]; oc = v[2]; od = v[3]; oe = v[4]; of = v[5]; }
    else if (op === 'translate') { oe = v[0] || 0; of = v[1] || 0; }
    else if (op === 'scale') { oa = v[0]; od = v.length > 1 ? v[1] : v[0]; }
    else if (op === 'rotate') {
      const r = v[0] * Math.PI / 180, cx = v[1] || 0, cy = v[2] || 0, co = Math.cos(r), si = Math.sin(r);
      oa = co; ob = si; oc = -si; od = co; oe = cx - co * cx + si * cy; of = cy - si * cx - co * cy;
    } else if (op === 'skewX') oc = Math.tan(v[0] * Math.PI / 180);
    else if (op === 'skewY') ob = Math.tan(v[0] * Math.PI / 180);
    else continue;
    // M = M · O (כמו append של Pixi)
    const a1 = a, b1 = b, c1 = c, d1 = d;
    a = oa * a1 + ob * c1; b = oa * b1 + ob * d1; c = oc * a1 + od * c1; d = oc * b1 + od * d1;
    e = oe * a1 + of * c1 + e; f = oe * b1 + of * d1 + f;
  }
  return new Matrix(a, b, c, d, e, f);
}
const isLetter = (q: number) => (q >= 65 && q <= 90) || (q >= 97 && q <= 122);

/* ───────── גרדיאנט רדיאלי (זוהר המדורה) כטקסטורה ───────── */
const gradTex = new Map<string, Texture>();
function gradientTexture(id: string): Texture | null {
  if (gradTex.has(id)) return gradTex.get(id);
  const g = defsRoot?.querySelector('#' + id);
  if (!g) return null;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), grd = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const s of [...g.children]) {
    const col = parseColor(s.getAttribute('stop-color') || '#000') || [0, 1], a = +(s.getAttribute('stop-opacity') ?? 1);
    grd.addColorStop(parseFloat(s.getAttribute('offset')) / 100, `rgba(${col[0] >> 16},${(col[0] >> 8) & 255},${col[0] & 255},${a})`);
  }
  x.fillStyle = grd; x.fillRect(0, 0, 128, 128);
  const t = Texture.from(c); gradTex.set(id, t);
  return t;
}

export class VNode {
  tag: string; attrs: Record<string, string> = {}; kids: VNode[] = []; parentNode: VNode | null = null;
  c = new Container(); gfx: Graphics | Text | Sprite | null = null; textRes = 0;
  dataset: Record<string, any> = {}; private _text = '';
  constructor(tag: string) {
    this.tag = tag;
    if (SHAPES.has(tag) || tag === 'text') dirty.add(this);
  }
  get firstChild() { return this.kids[0] || null; }
  get nextSibling() { const p = this.parentNode; if (!p) return null; const i = p.kids.indexOf(this); return p.kids[i + 1] || null; }
  get children() { return this.kids; }
  get textContent() { return this._text; }
  set textContent(v: string) { this._text = String(v); dirty.add(this); }
  getAttribute(k: string) { return this.attrs[k] ?? null; }
  /** מיקום וגודל ישירות (בלי מחרוזת transform לפענוח) – לאפקטים שמתעדכנים בכל פריים */
  setTS(tx: number, ty: number, s: number) {
    if (this.attrs.transform !== undefined) { delete this.attrs.transform; this.c.rotation = 0; this.c.skew.set(0, 0); this.c.pivot.set(0, 0); }
    this.c.position.set(tx, ty); this.c.scale.set(s, s);
  }
  removeAttribute(k: string) { delete this.attrs[k]; this.setAttribute(k, null); }
  setAttribute(k: string, v: any) {
    if (v === null || v === undefined) { if (!(k in this.attrs)) return; delete this.attrs[k]; }
    else { const s = String(v); if (this.attrs[k] === s) return; this.attrs[k] = s; }   // אותו ערך: אין מה לעשות
    const s = this.attrs[k];
    if (k === 'transform') { if (s) this.c.setFromMatrix(parseTransform(s)); else this.c.setFromMatrix(new Matrix()); }
    else if (k === 'opacity') this.c.alpha = s === undefined ? 1 : +s;
    else if (k === 'display') this.c.visible = s !== 'none';
    else if (k === 'clip-path') this.applyClip(s);
    else if (GEOM.has(k) || STYLE.has(k)) { if (this.gfx || SHAPES.has(this.tag) || this.tag === 'text') dirty.add(this); else this.markKids(); }
  }
  /** סגנון שעובר בירושה מקבוצה (fill על g) */
  private markKids() { for (const k of this.kids) { if (SHAPES.has(k.tag) || k.tag === 'text') dirty.add(k); else k.markKids(); } }
  private style(k: string) {
    for (let n: VNode | null = this; n; n = n.parentNode) if (n.attrs[k] !== undefined) return n.attrs[k];
    return undefined;
  }
  appendChild(n: VNode) { return this.insertBefore(n, null); }
  insertBefore(n: VNode, ref: VNode | null) {
    // כבר במקום (מיון עומק שלא שינה סדר): בלי להוציא ולהכניס, שזה מכריח לבנות מחדש את רשימת הציור
    if (n.parentNode === this && (n === ref || n.nextSibling === ref)) return n;
    if (n.parentNode) n.parentNode.detach(n);
    const i = ref ? this.kids.indexOf(ref) : -1, at = i < 0 ? this.kids.length : i;
    this.kids.splice(at, 0, n); n.parentNode = this;
    this.c.addChildAt(n.c, Math.min(at, this.c.children.length));
    if (INHERIT.some(k => this.style(k) !== undefined)) n.markKids();
    return n;
  }
  private detach(n: VNode) { const i = this.kids.indexOf(n); if (i >= 0) this.kids.splice(i, 1); n.c.parent?.removeChild(n.c); n.parentNode = null; }
  remove() { this.parentNode?.detach(this); dirty.delete(this); }
  querySelectorAll(_sel: string) { const out: VNode[] = []; const walk = (n: VNode) => { for (const k of n.kids) { out.push(k); walk(k); } }; walk(this); return out; }
  get classList() { return { add() {}, remove() {}, toggle() {}, contains: () => false }; }

  private applyClip(v: string | undefined) {
    if (this.c.mask) { const m = this.c.mask as Graphics; this.c.mask = null; m.destroy(); }
    const id = v && /url\(#([^)]+)\)/.exec(v)?.[1], cp = id && defsRoot?.querySelector('#' + id);
    if (!cp) return;
    const m = new Graphics();
    for (const r of [...cp.children]) {
      const n = (a: string) => +(r.getAttribute(a) || 0);
      if (r.tagName === 'rect') m.roundRect(n('x'), n('y'), n('width'), n('height'), n('rx')).fill(0xffffff);
    }
    this.c.addChild(m); this.c.mask = m;
  }

  /** בונה מחדש את הצורה לפי התכונות הנוכחיות */
  build() {
    const a = this.attrs, num = (k: string) => +(a[k] || 0);
    if (this.tag === 'text') {
      const fill = parseColor(this.style('fill') || '#000') || [0, 1], size = +(this.style('font-size') || 12), anchor = this.style('text-anchor');
      if (!(this.gfx instanceof Text)) { this.gfx?.destroy(); this.gfx = new Text({ text: '', style: { fontFamily: 'Rubik, system-ui, sans-serif' } }); this.c.addChildAt(this.gfx, 0); texts.add(this); }
      const t = this.gfx as Text;
      if (!this.textRes) this.textRes = textNeed(this, TEXT_DPR.v);   // לפי הזום עכשיו
      t.resolution = this.textRes;
      t.text = this._text;
      t.style.fontSize = size; t.style.fontWeight = (this.style('font-weight') || '400') as any; t.style.fill = fill[0];
      t.style.fontFamily = this.style('font-family') || 'Rubik, system-ui, sans-serif';
      t.style.fontStyle = (this.style('font-style') || 'normal') as any;
      // קו מתאר לטקסט (הילה סביב האותיות), רק אם הוגדר על הטקסט עצמו
      const sc = a.stroke && parseColor(a.stroke);
      t.style.stroke = sc ? { color: sc[0], alpha: sc[1], width: +(a['stroke-width'] || 1), join: 'round' } : undefined as any;
      t.alpha = fill[1]; t.scale.set(1);
      t.anchor.set(anchor === 'middle' ? .5 : anchor === 'end' ? 1 : 0, .78);   // y של SVG הוא קו הבסיס
      t.position.set(num('x'), num('y'));
      return;
    }
    const fillS = this.style('fill') ?? '#000';
    if (fillS.startsWith('url(')) {           // גרדיאנט: ספרייט רך במקום צורה
      const tex = gradientTexture(/url\(#([^)]+)\)/.exec(fillS)?.[1] || '');
      if (!(this.gfx instanceof Sprite)) { this.gfx?.destroy(); this.gfx = new Sprite(tex || Texture.WHITE); this.c.addChildAt(this.gfx, 0); }
      const r = this.tag === 'circle' ? num('r') : num('rx'), ry = this.tag === 'circle' ? r : num('ry') || r;
      const sp = this.gfx as Sprite; sp.anchor.set(.5); sp.position.set(num('cx'), num('cy')); sp.width = 2 * r; sp.height = 2 * ry;
      return;
    }
    if (!(this.gfx instanceof Graphics)) { this.gfx?.destroy(); this.gfx = new Graphics(); this.gfx.scale.set(1 / S); this.c.addChildAt(this.gfx, 0); }
    const g = this.gfx as Graphics;
    g.clear();
    switch (this.tag) {
      case 'path': { const d = a.d; if (!d) return; g.path(new GraphicsPath(scalePath(d))); break; }
      case 'rect': {
        const w = num('width') * S, h = num('height') * S; if (!(w > 0 && h > 0)) return;
        const rx = Math.min(+(a.rx ?? a.ry ?? 0) * S, w / 2, h / 2);
        if (rx > 0) g.roundRect(num('x') * S, num('y') * S, w, h, rx); else g.rect(num('x') * S, num('y') * S, w, h);
        break;
      }
      case 'circle': if (!(num('r') > 0)) return; g.circle(num('cx') * S, num('cy') * S, num('r') * S); break;
      case 'ellipse': if (!(num('rx') > 0 && num('ry') > 0)) return; g.ellipse(num('cx') * S, num('cy') * S, num('rx') * S, num('ry') * S); break;
      case 'line': g.moveTo(num('x1') * S, num('y1') * S).lineTo(num('x2') * S, num('y2') * S); break;
      case 'polygon': case 'polyline': {
        const p = (a.points || '').trim().split(/[\s,]+/).map(v => +v * S); if (p.length < 4) return;
        g.poly(p, this.tag === 'polygon'); break;
      }
    }
    if (fillS !== 'none' && fillS !== 'transparent') {
      const f = parseColor(fillS); if (f) g.fill({ color: f[0], alpha: f[1] * +(a['fill-opacity'] ?? 1) });
    }
    const st = this.style('stroke');
    if (st && st !== 'none' && st !== 'transparent') {
      const f = parseColor(st), w = +(this.style('stroke-width') ?? 1);
      if (f && w > 0) g.stroke({ color: f[0], alpha: f[1] * +(a['stroke-opacity'] ?? 1), width: w * S,
        cap: (this.style('stroke-linecap') || 'butt') as any, join: (this.style('stroke-linejoin') || 'miter') as any });
    }
  }
}

/* צורה "חמה" (נבנית מחדש שוב ושוב: רגלי כלב, רצועה, חצאית) מצוירת לבד, מחוץ לאצווה.
   אחרת כל שינוי בה מכריח את Pixi לבנות מחדש את רשימת הציור של כל השכבה שלה, בכל פריים. */
const HOT = 3, NEAR = 30;   // 3 בניות, כל אחת עד 30 פריימים אחרי הקודמת (החלפת פלטה לא נחשבת)
const rebuilds = new WeakMap<VNode, [number, number]>();   // [מספר בניות ברצף, פריים אחרון]
function markHot(n: VNode) {
  const r = rebuilds.get(n), f = vstats.flushes, c = r && f - r[1] <= NEAR ? r[0] + 1 : 1;
  rebuilds.set(n, [c, f]);
  if (c === HOT && n.gfx instanceof Graphics) { n.gfx.context.batchMode = 'no-batch'; vstats.hot++; }
}

/** בונה מחדש את כל הצורות שהשתנו מאז הפריים הקודם (נקרא ממש לפני הציור) */
export function flushVNodes() {
  if (!dirty.size) return;
  for (const n of dirty) if (n.parentNode) { n.build(); markHot(n); dirty.delete(n); vstats.built++; }
  vstats.flushes++;   // מה שעוד לא חובר לעץ נשאר לפעם הבאה
}
export const vstats = { built: 0, flushes: 0, hot: 0 };
export const isVNode = (x: any): x is VNode => x instanceof VNode;
