/* מנוע אריחים לשכבה הסטטית
   כמו באפליקציות מפה: כל הנוף הקבוע עובר פעם אחת לרשימת ציור, ו-Web Worker מצייר ממנה אריחי bitmap
   של 256 פיקסלים בכמה רמות זום, ברקע. בכל פריים רק מרכיבים את האריחים המוכנים על קנבס,
   כך שקצב הפריימים לא תלוי בכמות התוכן. אריח שעדיין לא מוכן מוחלף זמנית באריח מרמה אחרת. */
import { el, clamp, rrect, circ } from '../core/util';
import { grade, rawColor } from '../core/palette';
import { ctx } from '../world/context';
import { DETAIL_GROUPS } from '../scene/terrain';
import { view } from '../camera/view';
import { createPainter, type DLItem } from './tilePainter';
import { createGpuTiles, type GpuTiles } from './gpu';

const TILE = 256, BASE = 1 / 8, LMAX = 10, TILE_CAP = 300;
const tileScale = (l: number) => BASE * 2 ** l;   // פיקסלים של המסך ליחידת עולם

/** הופך את ה-SVG הסטטי לרשימת ציור (מסלול, צבעים, מטריצה ותיבה תוחמת לכל צורה) */
function extractDisplayList(): DLItem[] {
  const DL: DLItem[] = [], { worldS, svgS, L } = ctx;
  worldS.removeAttribute('transform');
  const DETAIL = new Set(DETAIL_GROUPS);
  const KEYS = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'font-size', 'font-weight', 'text-anchor'];
  const walk = (node: Element, inh: Record<string, string>, alpha: number, detail: boolean) => {
    for (const e of [...node.children] as any[]) {
      const st = { ...inh };
      for (const k of KEYS) { const v = rawColor(e, k) ?? e.getAttribute(k); if (v !== null) st[k] = v; }   // צבע מקורי; הפלטה מוחלת בצייר
      const a = alpha * (e.hasAttribute('opacity') ? +e.getAttribute('opacity') : 1), det = detail || DETAIL.has(e), tag = e.tagName;
      if (tag === 'g') { walk(e, st, a, det); continue; }
      const num = (k: string) => +e.getAttribute(k) || 0;
      const m = e.getCTM();
      if (tag === 'text') {
        // טקסט עובר לשכבה הדינמית כ-SVG רגיל (חד בכל זום, ובלי צורך בגופן בתוך ה-Worker)
        const t = el('text', { x: num('x'), y: num('y'), 'font-size': st['font-size'] || 12, 'font-weight': st['font-weight'] || 400,
          'text-anchor': st['text-anchor'] || 'start', fill: st.fill || '#000', transform: `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})` }, L.fx);
        t.textContent = e.textContent; continue;
      }
      let d: string;
      if (tag === 'path') d = e.getAttribute('d') || '';
      else if (tag === 'rect') { const rx = Math.min(num('rx'), num('width') / 2, num('height') / 2); d = rx > 0 ? rrect(num('x'), num('y'), num('width'), num('height'), rx) : `M${num('x')},${num('y')}h${num('width')}v${num('height')}h${-num('width')}z`; }
      else if (tag === 'circle') d = circ(num('cx'), num('cy'), num('r'));
      else if (tag === 'ellipse') { const cx = num('cx'), cy = num('cy'), rx = num('rx'), ry = num('ry'); d = `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${2 * rx},0a${rx},${ry} 0 1,0 ${-2 * rx},0`; }
      else continue;
      const bb = e.getBBox(), sw = st.stroke && st.stroke !== 'none' ? +(st['stroke-width'] || 1) : 0, pad = sw / 2 + 2;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [px, py] of [[bb.x - pad, bb.y - pad], [bb.x + bb.width + pad, bb.y - pad], [bb.x - pad, bb.y + bb.height + pad], [bb.x + bb.width + pad, bb.y + bb.height + pad]]) {
        const X = m.a * px + m.c * py + m.e, Y = m.b * px + m.d * py + m.f;
        x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
      }
      const fill = st.fill === undefined ? '#000' : st.fill;
      DL.push({ d, m: [m.a, m.b, m.c, m.d, m.e, m.f], a, det, bb: [x0, y0, x1, y1],
        fill: fill === 'none' || fill === 'transparent' ? null : fill, stroke: sw ? st.stroke : null, sw,
        cap: st['stroke-linecap'] || 'butt', join: st['stroke-linejoin'] || 'miter',
        dash: st['stroke-dasharray'] ? st['stroke-dasharray'].split(/[\s,]+/).map(Number) : null });
    }
  };
  walk(worldS, {}, 1, false);
  svgS.remove();   // ה-SVG הסטטי שימש רק לבנייה
  return DL;
}

/* ───────── מטמון אריחים (LRU; רמה 0 נשמרת תמיד) ───────── */
const tiles = new Map<string, any>();
const tkey = (l: number, x: number, y: number) => l + '/' + x + '/' + y;
function getTile(l: number, x: number, y: number) {
  const k = tkey(l, x, y), t = tiles.get(k);
  if (t && l > 0) { tiles.delete(k); tiles.set(k, t); }
  return t;
}
function putTile(l: number, x: number, y: number, bmp: any) {
  const key = tkey(l, x, y);
  tiles.set(key, bmp);
  if (gpu) { const t = TILE / tileScale(l); gpu.add(key, l, ctx.B.x0 + x * t, ctx.B.y0 + y * t, t, bmp); }
  for (const [k, v] of tiles) {
    if (tiles.size <= cap) break;
    if (!k.startsWith('0/') && !wanted.has(k)) { tiles.delete(k); gpu?.remove(k); v.close?.(); }
  }
}

let painters: { postMessage(m: any): void }[] = [];
let gen = 0, colors: string[] = [];
const colorMap = () => Object.fromEntries(colors.map(c => [c, grade(c)]));
let cvS: HTMLCanvasElement, cs: CanvasRenderingContext2D;
// מצב ההרכבה: כרטיס גרפי (WebGL), או קנבס דו-ממדי כגיבוי בדפדפן בלי WebGL
let gpu: GpuTiles | null = null, mode: 'pending' | 'gpu' | '2d' = 'pending';
const L0_KEYS: number[][] = [];
export const tileStats = { missing: 0, painted: 0, mode: '' };
let sDirty = true, sRaf = 0, lastNeed = '';
let wanted = new Set<string>();   // האריחים שהתצוגה הנוכחית צריכה או מכינה מראש: לא נזרקים מהמטמון
let cap = TILE_CAP;               // גודל המטמון: גדל במסכים גדולים, כדי שכל האריחים שעל המסך תמיד ייכנסו

/** מנסה להפעיל את הכרטיס הגרפי. נקרא לפני בניית העולם, כדי לדעת איפה הדמויות יחיו.
 *  מחזיר את הקנבס לשימוש (קנבס חדש ונקי אם WebGL נכשל) */
export async function prepareGpu(canvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  try {
    gpu = await createGpuTiles(canvas, innerWidth, innerHeight, Math.min(devicePixelRatio || 1, 2), '#a6cc80', LMAX);
    mode = 'gpu'; tileStats.mode = mode;
    return canvas;
  } catch (err) {
    console.warn('אין WebGL בכרטיס גרפי, עוברים לקנבס רגיל', err);
    const c = document.createElement('canvas'); c.id = canvas.id; canvas.replaceWith(c);   // קנבס נקי (בלי הקשר WebGL שנכשל)
    mode = '2d'; tileStats.mode = mode;
    return c;
  }
}
export const gpuOverlay = (c: any) => gpu?.overlay(c);
/** ציור פריים עכשיו (בכרטיס הגרפי: אריחים + דמויות ביחד) */
export function renderNow() { sDirty = false; drawStatic(); }

export function initTiles(canvas: HTMLCanvasElement) {
  cvS = canvas;
  if (mode === '2d') cs = canvas.getContext('2d');
  gpu?.setBackground(grade('#9cd162'));
  const DL = extractDisplayList();
  const onTile = (m: any) => { if (m.type === 'tile' && m.gen === gen) { tileStats.painted++; putTile(m.l, m.i, m.j, m.bmp); requestStatic(); } };
  try {
    if (typeof OffscreenCanvas === 'undefined' || !('transferToImageBitmap' in OffscreenCanvas.prototype)) throw 0;
    // כמה ציירים במקביל: אריחים של רמת זום חדשה מוכנים מהר יותר
    const n = clamp(Math.floor((navigator.hardwareConcurrency || 4) / 3), 1, 2);   // בטלפון: מעט ליבות חזקות, לא להתחרות בציור הפריימים
    for (let q = 0; q < n; q++) {
      const w = new Worker(new URL('./tileWorker.ts', import.meta.url), { type: 'module' });
      w.onmessage = e => onTile(e.data);
      painters.push(w);
    }
  } catch {
    // דפדפן ישן: אותו צייר רץ בדף עצמו (איטי יותר, אבל עובד)
    const handle = createPainter(m => setTimeout(() => onTile(m), 0));
    painters = [{ postMessage: m => handle(m) }];
  }
  colors = [...new Set(DL.flatMap(it => [it.fill, it.stroke]).filter(Boolean))];
  for (const p of painters) { p.postMessage({ type: 'init', items: DL, B: ctx.B, TILE, BASE }); p.postMessage({ type: 'palette', cmap: colorMap(), gen }); }
  const { B } = ctx, tw0 = TILE / tileScale(0);
  for (let j = 0; j < Math.ceil((B.y1 - B.y0) / tw0); j++) for (let i = 0; i < Math.ceil((B.x1 - B.x0) / tw0); i++) L0_KEYS.push([0, i, j]);
  return DL.length;
}

/* צפיפות הציור של השכבה הסטטית: עד פי 2. במסכי פי 3 זה חוסך יותר ממחצית העבודה,
   וההבדל באיור רך כמעט לא נראה (הדמויות בשכבה הדינמית נשארות בצפיפות המלאה) */
const sdpr = () => Math.min(view.dpr, 2);
export function resizeCanvas() {
  if (gpu) gpu.resize(view.vw, view.vh, sdpr());
  else if (mode === '2d') { cvS.width = Math.round(view.vw * sdpr()); cvS.height = Math.round(view.vh * sdpr()); }
}

const levelFor = (k: number) => clamp(Math.ceil(Math.log2(k * sdpr() / BASE) - .15), 0, LMAX);

/** מרכיב את האריחים המוכנים על הקנבס, ומבקש מה-Worker את החסרים (הקרובים למרכז קודם) */
function drawStatic() {
  const { B } = ctx, { cam, vw, vh } = view, dpr = sdpr(), flat = mode === '2d';
  if (flat) { cs.setTransform(1, 0, 0, 1, 0, 0); cs.fillStyle = grade('#9cd162'); cs.fillRect(0, 0, cvS.width, cvS.height); }
  const l = levelFor(cam.k), tw = TILE / tileScale(l);
  const nx = Math.ceil((B.x1 - B.x0) / tw), ny = Math.ceil((B.y1 - B.y0) / tw);
  const wx0 = -cam.x / cam.k, wy0 = -cam.y / cam.k, wx1 = (vw - cam.x) / cam.k, wy1 = (vh - cam.y) / cam.k;
  const ix0 = clamp(Math.floor((wx0 - B.x0) / tw), 0, nx - 1), ix1 = clamp(Math.floor((wx1 - B.x0) / tw), 0, nx - 1);
  const iy0 = clamp(Math.floor((wy0 - B.y0) / tw), 0, ny - 1), iy1 = clamp(Math.floor((wy1 - B.y0) / tw), 0, ny - 1);
  const sx = (i: number) => Math.round(((B.x0 + i * tw) * cam.k + cam.x) * dpr), sy = (j: number) => Math.round(((B.y0 + j * tw) * cam.k + cam.y) * dpr);
  const need: number[][] = [], ccx = (wx0 + wx1) / 2, ccy = (wy0 + wy1) / 2;
  if (flat) { cs.imageSmoothingEnabled = true; cs.imageSmoothingQuality = 'low'; }   // האריחים כמעט בגודל טבעי; איכות גבוהה רק מאטה
  for (let j = iy0; j <= iy1; j++) for (let i = ix0; i <= ix1; i++) {
    const t = getTile(l, i, j);
    if (!t) need.push([l, i, j, (B.x0 + (i + .5) * tw - ccx) ** 2 + (B.y0 + (j + .5) * tw - ccy) ** 2]);
    if (!flat) continue;
    const X = sx(i), Y = sy(j), Wd = sx(i + 1) - X, Ht = sy(j + 1) - Y;
    if (t) cs.drawImage(t, X, Y, Wd, Ht); else standIn(l, i, j, X, Y, Wd, Ht);
  }
  // בכרטיס הגרפי: רק מטריצה אחת ורשימת אריחים נראים
  if (gpu) gpu.compose(l, { ix0, ix1, iy0, iy1 }, cam);
  tileStats.missing = need.length;
  // את רשימת ההכנה בונים מחדש רק כשהאזור הנראה משתנה (לא בכל פריים של גרירה)
  const key = `${l}|${ix0}|${ix1}|${iy0}|${iy1}|${Math.round(ccx / tw * 2)}|${Math.round(ccy / tw * 2)}`;
  if (key === lastNeed) return;
  lastNeed = key;
  // לפי סדר חשיבות: המסך, טבעת סביבו, רמה אחת ושתיים פנימה (במרכז), אחת ושתיים החוצה (על שטח רחב).
  // הכול נחתך לתקציב שנכנס במטמון, אחרת אריחים נזרקים ומצוירים שוב בלי סוף.
  const want: number[][] = [];
  for (let j = iy0; j <= iy1; j++) for (let i = ix0; i <= ix1; i++)
    want.push([l, i, j, (B.x0 + (i + .5) * tw - ccx) ** 2 + (B.y0 + (j + .5) * tw - ccy) ** 2]);
  want.sort((a, b) => a[3] - b[3]);
  const vwW = wx1 - wx0, vhW = wy1 - wy0;
  const around = (lv: number, f: number) => {
    if (lv < 0 || lv > LMAX) return;
    const t = TILE / tileScale(lv), mx = Math.ceil((B.x1 - B.x0) / t), my = Math.ceil((B.y1 - B.y0) / t), hx = vwW * f / 2, hy = vhW * f / 2;
    const a0 = clamp(Math.floor((ccx - hx - B.x0) / t), 0, mx - 1), a1 = clamp(Math.floor((ccx + hx - B.x0) / t), 0, mx - 1);
    const b0 = clamp(Math.floor((ccy - hy - B.y0) / t), 0, my - 1), b1 = clamp(Math.floor((ccy + hy - B.y0) / t), 0, my - 1);
    const q: number[][] = [];
    for (let j = b0; j <= b1; j++) for (let i = a0; i <= a1; i++)
      if (lv !== l || i < ix0 || i > ix1 || j < iy0 || j > iy1) q.push([lv, i, j, (B.x0 + (i + .5) * t - ccx) ** 2 + (B.y0 + (j + .5) * t - ccy) ** 2]);
    q.sort((x, y) => x[3] - y[3]); for (const e of q) want.push(e);
  };
  around(l, 1 + 2 * tw / Math.min(vwW, vhW));   // טבעת של אריח סביב המסך
  around(l - 1, 2); around(l + 1, .7); around(l - 2, 4); around(l + 2, .3);
  // במסך גדול בצפיפות כפולה יש יותר מ-300 משבצות על המסך: קודם נחתכו מהרשימה גם אריחים נראים בקצוות, והם לא צוירו אף פעם
  const nVis = (ix1 - ix0 + 1) * (iy1 - iy0 + 1);
  cap = Math.max(TILE_CAP, Math.ceil(nVis * 1.6) + L0_KEYS.length + 16);
  const budget = cap - L0_KEYS.length - 16;
  if (want.length > budget) want.length = budget;
  wanted = new Set(want.map(q => tkey(q[0], q[1], q[2])));
  const list = want.filter(q => !tiles.has(tkey(q[0], q[1], q[2]))).map(q => q.slice(0, 3));
  for (const k of L0_KEYS) if (!tiles.has(tkey(k[0], k[1], k[2]))) list.push(k);   // תמיד גם סקירה של כל העולם
  // כל אריח שייך תמיד לאותו צייר, כדי שלא יצויר פעמיים
  const parts: number[][][] = painters.map(() => []);
  for (const q of list) parts[(q[1] * 7 + q[2] * 13 + q[0]) % painters.length].push(q);
  painters.forEach((p, n) => p.postMessage({ type: 'need', list: parts[n] }));
}

/** ממלא זמנית מקום של אריח חסר: מאריח של רמה גסה יותר, או מארבעה של רמה חדה יותר */
function standIn(l: number, i: number, j: number, X: number, Y: number, Wd: number, Ht: number) {
  if (l < LMAX) {                                         // ארבעה אריחים חדים יותר, אם כולם מוכנים (אחרי התרחקות)
    const kids = [0, 1, 2, 3].map(q => tiles.get(tkey(l + 1, 2 * i + (q & 1), 2 * j + (q >> 1))));
    if (kids.every(Boolean)) { kids.forEach((c, q) => cs.drawImage(c, X + (q & 1) * Wd / 2, Y + (q >> 1) * Ht / 2, Wd / 2, Ht / 2)); return; }
  }
  for (let pl = l - 1; pl >= 0; pl--) {
    const f = 2 ** (l - pl), p = getTile(pl, Math.floor(i / f), Math.floor(j / f));
    if (p) { const sub = TILE / f; cs.drawImage(p, (i % f) * sub, (j % f) * sub, sub, sub, X, Y, Wd, Ht); return; }
  }
  if (l < LMAX)
    for (let q = 0; q < 4; q++) { const c = getTile(l + 1, 2 * i + (q & 1), 2 * j + (q >> 1)); if (c) cs.drawImage(c, X + (q & 1) * Wd / 2, Y + (q >> 1) * Ht / 2, Wd / 2, Ht / 2); }
}

function staticFrame() { sRaf = 0; if (sDirty) { sDirty = false; drawStatic(); } }
/** בקשה לצייר מחדש את השכבה הסטטית בפריים הבא (זול: רק הרכבת אריחים) */
export function requestStatic() {
  sDirty = true;
  if (gpu && view.live) return;   // הלולאה כבר מציירת פריים משותף בכל פעם
  if (!sRaf) sRaf = requestAnimationFrame(staticFrame);
}

/** אחרי החלפת פלטה: זורקים את כל האריחים ומבקשים אותם מחדש בצבעים החדשים */
export function repaintTiles() {
  gen++; const cmap = colorMap();
  gpu?.clear(); gpu?.setBackground(grade('#9cd162'));
  for (const v of tiles.values()) v.close?.();
  tiles.clear(); lastNeed = '';
  for (const p of painters) p.postMessage({ type: 'palette', cmap, gen });
  requestStatic();
}
