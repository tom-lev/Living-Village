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
  tiles.set(tkey(l, x, y), bmp);
  for (const [k, v] of tiles) { if (tiles.size <= TILE_CAP) break; if (!k.startsWith('0/')) { tiles.delete(k); v.close?.(); } }
}

let painters: { postMessage(m: any): void }[] = [];
let gen = 0, colors: string[] = [];
const colorMap = () => Object.fromEntries(colors.map(c => [c, grade(c)]));
let cvS: HTMLCanvasElement, cs: CanvasRenderingContext2D;
const L0_KEYS: number[][] = [];
export const tileStats = { missing: 0 };
let sDirty = true, sRaf = 0, lastNeed = '';

export function initTiles(canvas: HTMLCanvasElement) {
  cvS = canvas; cs = canvas.getContext('2d');
  const DL = extractDisplayList();
  const onTile = (m: any) => { if (m.type === 'tile' && m.gen === gen) { putTile(m.l, m.i, m.j, m.bmp); requestStatic(); } };
  try {
    if (typeof OffscreenCanvas === 'undefined' || !('transferToImageBitmap' in OffscreenCanvas.prototype)) throw 0;
    // כמה ציירים במקביל: אריחים של רמת זום חדשה מוכנים מהר יותר
    const n = clamp(Math.floor((navigator.hardwareConcurrency || 4) / 2), 1, 3);
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

export function resizeCanvas() {
  cvS.width = Math.round(view.vw * view.dpr); cvS.height = Math.round(view.vh * view.dpr);
}

const levelFor = (k: number) => clamp(Math.ceil(Math.log2(k * view.dpr / BASE) - .15), 0, LMAX);

/** מרכיב את האריחים המוכנים על הקנבס, ומבקש מה-Worker את החסרים (הקרובים למרכז קודם) */
function drawStatic() {
  const { B } = ctx, { cam, vw, vh, dpr } = view;
  cs.setTransform(1, 0, 0, 1, 0, 0);
  cs.fillStyle = grade('#9cd162'); cs.fillRect(0, 0, cvS.width, cvS.height);
  const l = levelFor(cam.k), tw = TILE / tileScale(l);
  const nx = Math.ceil((B.x1 - B.x0) / tw), ny = Math.ceil((B.y1 - B.y0) / tw);
  const wx0 = -cam.x / cam.k, wy0 = -cam.y / cam.k, wx1 = (vw - cam.x) / cam.k, wy1 = (vh - cam.y) / cam.k;
  const ix0 = clamp(Math.floor((wx0 - B.x0) / tw), 0, nx - 1), ix1 = clamp(Math.floor((wx1 - B.x0) / tw), 0, nx - 1);
  const iy0 = clamp(Math.floor((wy0 - B.y0) / tw), 0, ny - 1), iy1 = clamp(Math.floor((wy1 - B.y0) / tw), 0, ny - 1);
  const sx = (i: number) => Math.round(((B.x0 + i * tw) * cam.k + cam.x) * dpr), sy = (j: number) => Math.round(((B.y0 + j * tw) * cam.k + cam.y) * dpr);
  const need: number[][] = [], ccx = (wx0 + wx1) / 2, ccy = (wy0 + wy1) / 2;
  cs.imageSmoothingEnabled = true; cs.imageSmoothingQuality = 'low';   // האריחים כמעט בגודל טבעי; איכות גבוהה רק מאטה
  for (let j = iy0; j <= iy1; j++) for (let i = ix0; i <= ix1; i++) {
    const X = sx(i), Y = sy(j), Wd = sx(i + 1) - X, Ht = sy(j + 1) - Y;
    const t = getTile(l, i, j);
    if (t) { cs.drawImage(t, X, Y, Wd, Ht); continue; }
    need.push([l, i, j, (B.x0 + (i + .5) * tw - ccx) ** 2 + (B.y0 + (j + .5) * tw - ccy) ** 2]);
    standIn(l, i, j, X, Y, Wd, Ht);
  }
  tileStats.missing = need.length;
  need.sort((a, b) => a[3] - b[3]);
  // מראש: טבעת סביב המסך, ואותו אזור ברמה גסה יותר (להתרחקות חלקה)
  const list = need.map(q => q.slice(0, 3));
  if (l < LMAX) {                                         // הרמה הבאה למרכז המסך: התקרבות מוצאת אריחים חדים מוכנים
    const tw2 = tw / 2, hx = (wx1 - wx0) * .3, hy = (wy1 - wy0) * .3, nx2 = nx * 2, ny2 = ny * 2;
    const a0 = clamp(Math.floor((ccx - hx - B.x0) / tw2), 0, nx2 - 1), a1 = clamp(Math.floor((ccx + hx - B.x0) / tw2), 0, nx2 - 1);
    const b0 = clamp(Math.floor((ccy - hy - B.y0) / tw2), 0, ny2 - 1), b1 = clamp(Math.floor((ccy + hy - B.y0) / tw2), 0, ny2 - 1);
    for (let j = b0; j <= b1; j++) for (let i = a0; i <= a1; i++) if (!tiles.has(tkey(l + 1, i, j))) list.push([l + 1, i, j]);
  }
  for (let j = iy0 - 1; j <= iy1 + 1; j++) for (let i = ix0 - 1; i <= ix1 + 1; i++)
    if (i >= 0 && j >= 0 && i < nx && j < ny && (i < ix0 || i > ix1 || j < iy0 || j > iy1) && !tiles.has(tkey(l, i, j))) list.push([l, i, j]);
  if (l > 0) {                                            // הרמה הגסה יותר על שטח כפול מהמסך: התרחקות מוצאת אריחים מוכנים
    const tw1 = tw * 2, nx1 = Math.ceil(nx / 2), ny1 = Math.ceil(ny / 2), hx = (wx1 - wx0), hy = (wy1 - wy0);
    const a0 = clamp(Math.floor((ccx - hx - B.x0) / tw1), 0, nx1 - 1), a1 = clamp(Math.floor((ccx + hx - B.x0) / tw1), 0, nx1 - 1);
    const b0 = clamp(Math.floor((ccy - hy - B.y0) / tw1), 0, ny1 - 1), b1 = clamp(Math.floor((ccy + hy - B.y0) / tw1), 0, ny1 - 1);
    const ring: number[][] = [];
    for (let j = b0; j <= b1; j++) for (let i = a0; i <= a1; i++) if (!tiles.has(tkey(l - 1, i, j)))
      ring.push([l - 1, i, j, (B.x0 + (i + .5) * tw1 - ccx) ** 2 + (B.y0 + (j + .5) * tw1 - ccy) ** 2]);
    ring.sort((a, b) => a[3] - b[3]); for (const q of ring) list.push(q.slice(0, 3));
  }
  for (const k of L0_KEYS) if (!tiles.has(tkey(k[0], k[1], k[2]))) list.push(k);   // תמיד גם סקירה של כל העולם
  const sig = list.map(q => q.join('/')).join(' ');
  if (sig !== lastNeed) {
    lastNeed = sig;
    // כל אריח שייך תמיד לאותו צייר, כדי שלא יצויר פעמיים
    const parts: number[][][] = painters.map(() => []);
    for (const q of list) parts[(q[1] * 7 + q[2] * 13 + q[0]) % painters.length].push(q);
    painters.forEach((p, n) => p.postMessage({ type: 'need', list: parts[n] }));
  }
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
export function requestStatic() { sDirty = true; if (!sRaf) sRaf = requestAnimationFrame(staticFrame); }

/** אחרי החלפת פלטה: זורקים את כל האריחים ומבקשים אותם מחדש בצבעים החדשים */
export function repaintTiles() {
  gen++; const cmap = colorMap();
  for (const v of tiles.values()) v.close?.();
  tiles.clear(); lastNeed = '';
  for (const p of painters) p.postMessage({ type: 'palette', cmap, gen });
  requestStatic();
}
