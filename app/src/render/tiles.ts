/* מנוע אריחים לשכבה הסטטית
   כמו באפליקציות מפה: כל הנוף הקבוע עובר פעם אחת לרשימת ציור, ו-Web Worker מצייר ממנה אריחי bitmap
   של 256 פיקסלים בכמה רמות זום, ברקע. בכל פריים רק מרכיבים את האריחים המוכנים על קנבס,
   כך שקצב הפריימים לא תלוי בכמות התוכן. אריח שעדיין לא מוכן מוחלף זמנית באריח מרמה אחרת. */
import { el, clamp, rrect, circ } from '../core/util';
import { grade, rawColor, setPalette } from '../core/palette';
import { ctx, bboxOf } from '../world/context';
import { DETAIL_GROUPS } from '../scene/terrain';
import { view } from '../camera/view';
import { createPainter, packDL, encodeRegion, type DLItem } from './tilePainter';
import { RNG_MARKS } from '../core/rng';
import { SNode, mul, parseTransform, pathBox, boxThrough, type M6 } from './snode';
import { statics, cidCount } from '../world/context';
import { createGpuTiles, type GpuTiles } from './gpu';

const TILE = 256, BASE = 1 / 8, LMAX = 10, TILE_CAP = 300;
const tileScale = (l: number) => BASE * 2 ** l;   // פיקסלים של המסך ליחידת עולם

/* סדר הציור: לכל צורה מפתח z. קודם לפי שכבה (קרקע, דרכים, פרטי קרקע, מים, חפצים), ובשכבת החפצים לפי ה-y של הדבר העומד
   (מה שלמטה במסך מצויר מעל), ואז לפי המספר הסידורי שלו ולפי הסדר בתוכו. כך גם דברים שמצוירים מאוחר יותר (לפי אזורים)
   נכנסים בדיוק למקום הנכון בין השכנים שלהם */
const LAYERS = ['ground', 'roads', 'groundProps', 'water', 'props'];
let zSeq = 0;
const KEYS = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'font-size', 'font-weight', 'font-family', 'font-style', 'text-anchor'];
const zOfStatic = (st: any) => (st.y + 1e5) * 1e8 + (st.idx ?? 0) * 1e3;

/** חילוץ של צמתים (עם הצאצאים שלהם) לרשימת ציור, בשכבה נתונה */
function extractNodes(nodes: SNode[], layer: string, DL: DLItem[]) {
  const rank = LAYERS.indexOf(layer) * 1e15, DETAIL = new Set(DETAIL_GROUPS), L = ctx.L;
  const one = (e: SNode, inh: Record<string, string>, alpha: number, detail: boolean, pm: M6, zb: number | null, zc: { n: number }) => {
    const st = { ...inh }, at = e.attrs;
    for (const k of KEYS) { const v = rawColor(e as any, k) ?? at[k]; if (v !== undefined) st[k] = v; }   // צבע מקורי; הפלטה מוחלת בצייר
    const a = alpha * ('opacity' in at ? +at.opacity : 1), det = detail || DETAIL.has(e), tag = e.tagName;
    const m = at.transform ? mul(pm, parseTransform(at.transform)) : pm;
    if (tag === 'g') { for (const k of e.kids) one(k, st, a, det, m, zb, zc); return; }
    const num = (k: string) => +at[k] || 0;
    if (tag === 'text') {
      // טקסט עובר לשכבה הדינמית כ-SVG רגיל (חד בכל זום, ובלי צורך בגופן בתוך ה-Worker)
      const ta: Record<string, any> = { x: num('x'), y: num('y'), 'font-size': st['font-size'] || 12, 'font-weight': st['font-weight'] || 400,
        'text-anchor': st['text-anchor'] || 'start', fill: st.fill || '#000', transform: `matrix(${m[0]} ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]})` };
      for (const k of ['font-family', 'font-style', 'stroke', 'stroke-width']) if (st[k] !== undefined) ta[k] = st[k];
      const t = el('text', ta, L.fx);
      t.textContent = e.textContent;
      if (BAKE) allTexts.push({ ta, text: e.textContent });
      return;
    }
    let d: string;
    if (tag === 'path') d = at.d || '';
    else if (tag === 'rect') { const rx = Math.min(num('rx'), num('width') / 2, num('height') / 2); d = rx > 0 ? rrect(num('x'), num('y'), num('width'), num('height'), rx) : `M${num('x')},${num('y')}h${num('width')}v${num('height')}h${-num('width')}z`; }
    else if (tag === 'circle') d = circ(num('cx'), num('cy'), num('r'));
    else if (tag === 'ellipse') { const cx = num('cx'), cy = num('cy'), rx = num('rx'), ry = num('ry'); d = `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${2 * rx},0a${rx},${ry} 0 1,0 ${-2 * rx},0`; }
    else return;
    // הגבולות של כל צורה מחושבים בציירים שברקע (Workers), לא כאן: הדף לא מחכה לפענוח של כל המסלולים
    const sw = st.stroke && st.stroke !== 'none' ? +(st['stroke-width'] || 1) : 0, pad = sw / 2 + 2;
    const fill = st.fill === undefined ? '#000' : st.fill;
    const z = rank + (zb === null ? ++zSeq : zb + Math.min(999, zc.n++));
    DL.push({ d, m: [...m], a, det, bb: null, pad, z,
      fill: fill === 'none' || fill === 'transparent' ? null : fill, stroke: sw ? st.stroke : null, sw,
      cap: st['stroke-linecap'] || 'butt', join: st['stroke-linejoin'] || 'miter',
      dash: st['stroke-dasharray'] ? st['stroke-dasharray'].split(/[\s,]+/).map(Number) : null });
  };
  for (const n of nodes) {
    // בשכבת החפצים: כל דבר עומד (קבוצה עם st) מקבל מפתח לפי ה-y שלו; צורות אחרות לפי הסדר
    const sto = layer === 'props' ? (n as any).st : null;
    one(n, {}, 1, false, [1, 0, 0, 1, 0, 0], sto ? zOfStatic(sto) : layer === 'props' ? 0 : null, { n: 0 });
  }
}

/** הופך את הנוף הקבוע (עץ של SNode בזיכרון) לרשימת ציור: מסלול, צבעים, מטריצה, מפתח סדר ותיבה תוחמת לכל צורה.
 *  בלי אלמנטים של הדפדפן ובלי למדוד אותם: המטריצות והגבולות מחושבים בעצמנו (render/snode.ts) */
function extractDisplayList(): DLItem[] {
  const DL: DLItem[] = [], { svgS, L } = ctx;
  for (const layer of LAYERS) extractNodes([...(L[layer] as SNode).kids], layer, DL);
  svgS.remove();   // ה-SVG הסטטי של הדף כבר לא משמש
  return DL;
}

/** אזור שצויר עכשיו (scene/chunks.ts): הצורות שלו נשלחות לציירים, והאריחים שכבר צוירו באזור נזרקים ומצוירים מחדש */
export function addChunkItems(layers: Record<string, any[]>, rect: number[], coarseNow = false) {
  const DL: DLItem[] = [];
  for (const layer of LAYERS) if (layers[layer]) extractNodes(layers[layer], layer, DL);
  if (!DL.length) return;
  if (BAKE) allDL.push(...DL);
  for (const it of DL) { if (it.fill) addColor(it.fill); if (it.stroke) addColor(it.stroke); }
  const { pk } = packDL(DL), KEYS2 = ['d', 'dLen', 'm', 'a', 'pad', 'sw', 'det', 'sty', 'z'];
  const packs: any[] = painters.map((_, q) => q === 0 ? pk : { ...pk, ...Object.fromEntries(KEYS2.map(k => [k, (pk as any)[k].slice()])) });
  painters.forEach((p, q) => (p as any).postMessage({ type: 'add', packed: packs[q] }, KEYS2.map(k => packs[q][k].buffer)));
  // אריחים שכבר צוירו ונוגעים באזור – מחדש (עם מרווח לצמרות שמעל לבסיס)
  const x0 = rect[0] - 40, y0 = rect[1] - 40, x1 = rect[2] + 40, y1 = rect[3] + 40, { B } = ctx;
  for (const k of [...tiles.keys()]) {
    const [l, i, j] = k.split('/').map(Number), t = TILE / tileScale(l), tx = B.x0 + i * t, ty = B.y0 + j * t;
    if (tx > x1 || tx + t < x0 || ty > y1 || ty + t < y0) continue;
    if (isBaked(l)) continue;   // אריח מוכן מראש כבר כולל את כל העולם
    // האריחים הגסים (מבט מרחוק) מכסים הרבה אזורים: לא מציירים אותם מחדש אחרי כל אזור, אלא פעם אחת בסוף (או מדי פעם)
    if (l <= 1 && !coarseNow) { coarseDirty.add(k); continue; }
    stale.add(k);
  }
  if (coarseNow || performance.now() - coarseAt > 2500) flushCoarseTiles();
  lastNeed = ''; requestStatic();
}
const coarseDirty = new Set<string>(); let coarseAt = 0;
/* אריח שצריך לצייר מחדש (אזור שנוסף) לא נזרק: הוא נשאר על המסך עד שהאריח החדש מגיע ומחליף אותו במקום.
   (זריקה מיידית השאירה לרגע אריח מטושטש מרמה אחרת – זה נראה כמו קפיצה של המסך, בעיקר בזום מהיר) */
const stale = new Set<string>();
/** מצייר מחדש את האריחים הגסים שהשתנו (אחרי שאזורים נוספו) */
export function flushCoarseTiles() {
  coarseAt = performance.now();
  for (const k of coarseDirty) if (!isBaked(+k.split('/')[0])) stale.add(k);
  coarseDirty.clear(); lastNeed = ''; requestStatic();
}
let colorSet = new Set<string>();
/** המבט הראשון מוכן: מכאן גם מכינים מראש אריחים של רמות זום אחרות */
let warm = false;
export function warmUp() { if (!warm) { warm = true; lastNeed = ''; requestStatic(); } }
const addColor = (c: string) => { if (!colorSet.has(c)) { colorSet.add(c); colors.push(c); for (const p of painters) p.postMessage({ type: 'palette', cmap: colorMap(), gen, keep: true }); } };

/* ───────── אריחים מוכנים מראש (משימה 30, שלב 2) ─────────
   בזמן ההעלאה (tools/site.mjs) שרת הבנייה מצייר את כל האריחים של הרמות הרחוקות והבינוניות (0..maxL), לכל פלטה,
   באותו צייר בדיוק ומהעולם הבנוי כולו, ושומר אותם כתמונות (tiles/p<פלטה>/<רמה>/<i>_<j>.webp, ו-manifest.json).
   באתר: אריח ברמות האלה נטען כתמונה מוכנה במקום להיות מצויר, והוא לא מצויר מחדש כשאזור נוסף (הוא כבר כולל את כל העולם).
   בלי manifest (שרת פיתוח, או בנייה מקומית) – הכול מצויר כרגיל. */
const BAKE = typeof location !== 'undefined' && location.search.includes('bake=tiles');
const allDL: DLItem[] = [];   // רק במצב אפייה: כל רשימת הציור (גם של אזורים שנוספו)
const allTexts: { ta: any; text: string }[] = [];   // ושלטי הטקסט שעוברים לשכבה הדינמית
let baked: { maxL: number; pals: string[]; regions?: { RS: number } } | null = null;
/** רשימת האריחים המוכנים (נטענת בתחילת הטעינה; בלי – null) */
// באתר המפורסם הנתונים האלה כתובים בתוך הדף עצמו (window.__BAKED, נכתב בהעלאה): בלי הורדה נוספת לפני הבנייה,
// שבטלפון עלתה כמה מאות אלפיות שנייה לכל הלוך-חזור. בלי – מנסים להוריד (ובשרת פיתוח אין, וזה בסדר)
const INLINE = typeof window !== 'undefined' ? (window as any).__BAKED : null;
export const manifestP: Promise<any> = typeof fetch === 'undefined' || BAKE ? Promise.resolve(null)
  : (INLINE ? Promise.resolve(INLINE.manifest) : fetch('tiles/manifest.json').then(r => r.ok ? r.json() : null)).then(m => { if (m) { baked = m; lastNeed = ''; requestStatic(); } return m; }).catch(() => null);
export const inlineStatic = () => INLINE?.static ?? null;
const bakedPal = () => baked && ctx.world ? baked.pals.indexOf(ctx.world.palette) : -1;
/** האריח הזה מגיע מוכן (ולא צריך לצייר אותו, גם לא מחדש) */
const isBaked = (l: number) => bakedPal() >= 0 && l <= baked!.maxL;
const inflight = new Set<string>(), failed = new Set<string>();
function fetchTile(l: number, i: number, j: number) {
  const k = tkey(l, i, j), g0 = gen, pi = bakedPal();
  if (inflight.has(k)) return; inflight.add(k);
  // אם התמונה המיידית כבר הציגה את האריח הזה – לוקחים אותו ממנה (כבר הורד ופוענח), בלי הורדה נוספת
  const path = `tiles/p${pi}/${l}/${i}_${j}.webp`, im = document.querySelector<HTMLImageElement>(`#instant img[src="${path}"]`);
  (im?.complete && im.naturalWidth ? createImageBitmap(im) : fetch(path).then(r => { if (!r.ok) throw 0; return r.blob(); }).then(b => createImageBitmap(b))).then(bmp => {
    inflight.delete(k);
    if (g0 !== gen) { bmp.close(); return; }   // הפלטה התחלפה בינתיים
    tileStats.painted++; putTile(l, i, j, bmp); requestStatic();
  }).catch(() => { inflight.delete(k); failed.add(k); lastNeed = ''; requestStatic(); });
}

/** לשרת הבנייה: מצייר אריח אחד בפלטה נתונה ומחזיר אותו כתמונת webp (base64) */
let bp: any = null, bgen = 0, waitTile: ((m: any) => void) | null = null;
export async function bakeTile(pal: string, l: number, i: number, j: number) {
  if (!bp) {
    bp = createPainter(m => { if (m.type === 'tile') waitTile?.(m); });
    bp({ type: 'init', items: allDL.map(it => ({ ...it, bb: null, parts: undefined, p: undefined })), B: ctx.B, TILE, BASE });
  }
  const keep = ctx.world.palette, spec = ctx.world.palettes.find((p: any) => p.name === pal);
  setPalette(spec, ctx.world.palettes); const cmap = colorMap();
  setPalette(ctx.world.palettes.find((p: any) => p.name === keep), ctx.world.palettes);
  bp({ type: 'palette', cmap, gen: ++bgen });
  const m: any = await new Promise(r => { waitTile = r; bp({ type: 'need', list: [[l, i, j]] }); });
  const c = new OffscreenCanvas(TILE, TILE); c.getContext('2d')!.drawImage(m.bmp, 0, 0);
  const blob = await c.convertToBlob({ type: 'image/webp', quality: .86 });
  const u8 = new Uint8Array(await blob.arrayBuffer()); let bin = '';
  for (let q = 0; q < u8.length; q += 0x8000) bin += String.fromCharCode(...u8.subarray(q, q + 0x8000));
  return btoa(bin);
}
/** לשרת הבנייה: קבצי האזורים. כל צורה נכנסת לכל אזור שהיא נוגעת בו (הצייר טוען אותה פעם אחת),
 *  וצורות ענקיות (רקע, צורות שמכסות הרבה אזורים) – לקובץ אחד, global, שנטען תמיד */
export function bakeRegions(RS: number) {
  const reg = new Map<string, number[]>(), G: number[] = [];
  allDL.forEach((it, id) => {
    const b = pathBox(it.d), p = it.pad ?? 2; if (!(b[0] <= b[2])) return;
    const q = boxThrough(it.m as M6, [b[0] - p, b[1] - p, b[2] + p, b[3] + p]);
    const cx0 = Math.floor(q[0] / RS), cx1 = Math.floor(q[2] / RS), cy0 = Math.floor(q[1] / RS), cy1 = Math.floor(q[3] / RS);
    if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > 6) { G.push(id); return; }
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const k = cx + '_' + cy; (reg.get(k) || reg.set(k, []).get(k)!).push(id); }
  });
  const b64 = (u8: Uint8Array) => { let bin = ''; for (let q = 0; q < u8.length; q += 0x8000) bin += String.fromCharCode(...u8.subarray(q, q + 0x8000)); return btoa(bin); };
  const files: Record<string, string> = { global: b64(encodeRegion(G.map(i => allDL[i]), G)) };
  for (const [k, ids] of reg) files[k] = b64(encodeRegion(ids.map(i => allDL[i]), ids));
  return files;
}
/** לשרת הבנייה: המידות של כל דבר עומד לפי מספר היצירה שלו (static.bin), השלטים והצבעים (static.json) */
export function bakeStatic() {
  const n = cidCount(), a = new Float32Array(n * 4);
  for (const st of statics) if (st.cid !== undefined) { const b = (st as any).bb0 ?? bboxOf(st); a.set(b, st.cid * 4); }   // המידה לפני התאמת הגודל
  const u8 = new Uint8Array(a.buffer); let bin = ''; for (let q = 0; q < u8.length; q += 0x8000) bin += String.fromCharCode(...u8.subarray(q, q + 0x8000));
  // ומצבי המחולל הכללי בסוף כל קטע ציור (drawOnly), והמצב בסוף הבנייה – לבדיקה שהאתר בנה את אותו עולם
  return { bin: btoa(bin), json: JSON.stringify({ texts: allTexts, colors, rng: RNG_MARKS, seedEnd: (globalThis as any).__seedEnd }) };
}
/** האתר המפורסם: במקום רשימת ציור מהדף – הציירים טוענים בעצמם את קבצי האזורים */
export function initTilesFromRegions(canvas: HTMLCanvasElement, st: { texts: any[]; colors: string[] }) {
  cvS = canvas;
  if (mode === '2d') cs = canvas.getContext('2d');
  gpu?.setBackground(grade('#9cd162'));
  startPainters();
  onTileFn = (m: any) => { if (m.type === 'tile' && m.gen === gen) { tileStats.painted++; putTile(m.l, m.i, m.j, m.bmp); requestStatic(); } };
  if (!painters.length) { const handle = createPainter(m => setTimeout(() => onTileFn(m), 0)); painters = [{ postMessage: m => handle(m) }]; }
  colors = st.colors.slice(); colorSet = new Set(colors);
  const base = new URL('regions/', location.href).href;
  for (const p of painters) { p.postMessage({ type: 'regions', base, RS: baked!.regions!.RS, B: ctx.B, TILE, BASE }); p.postMessage({ type: 'palette', cmap: colorMap(), gen }); }
  // שלטים: הטקסטים של הנוף הקבוע, בשכבה הדינמית (כמו בחילוץ הרגיל)
  for (const { ta, text } of st.texts) el('text', ta, ctx.L.fx).textContent = text;
  const { B } = ctx, tw0 = TILE / tileScale(0);
  for (let j = 0; j < Math.ceil((B.y1 - B.y0) / tw0); j++) for (let i = 0; i < Math.ceil((B.x1 - B.x0) / tw0); i++) L0_KEYS.push([0, i, j]);
  ctx.svgS.remove();
  return 0;
}

/** לשרת הבנייה: כמה אריחים יש בכל רמה */
export const tileGrid = (l: number) => { const t = TILE / tileScale(l), { B } = ctx; return [Math.ceil((B.x1 - B.x0) / t), Math.ceil((B.y1 - B.y0) / t)]; };

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
  const old = tiles.get(key); if (old && old !== bmp) old.close?.();
  stale.delete(key);
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
export const tileStats = { missing: 0, painted: 0, mode: '', log: [] as number[][] };
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

let onTileFn: (m: any) => void = () => {};
/** מפעיל את הציירים שברקע. נקרא בתחילת הטעינה, לפני בניית העולם: הפעלה של Worker צריכה שהדף יהיה פנוי,
 *  ואם מחכים לסוף הבנייה הוא מתחיל לרוץ רק אחרי שהדף מסיים הכול (זה עיכב את האריחים הראשונים ביותר משנייה וחצי) */
let hiWait: Promise<void> = Promise.resolve();
/** מחכה שהציירים ייטענו (לכל היותר max אלפיות שנייה), כדי שלא יחכו לסוף הבנייה של הדף */
export const paintersLoaded = (max = 400) => Promise.race([hiWait, new Promise<void>(r => setTimeout(r, max))]);
export function startPainters() {
  if (painters.length) return;
  let left = 0, done: () => void = () => {};
  hiWait = new Promise<void>(r => { done = r; });
  try {
    if (typeof OffscreenCanvas === 'undefined' || !('transferToImageBitmap' in OffscreenCanvas.prototype)) throw 0;
    // כמה ציירים במקביל: אריחים של רמת זום חדשה מוכנים מהר יותר
    const n = clamp(Math.floor((navigator.hardwareConcurrency || 4) / 3), 1, 2);   // בטלפון: מעט ליבות חזקות, לא להתחרות בציור הפריימים
    for (let q = 0; q < n; q++) {
      const w = new Worker(new URL('./tileWorker.ts', import.meta.url), { type: 'module' });
      left++;
      w.onmessage = e => { if (e.data?.type === 'hi') { if (--left === 0) done(); return; } onTileFn(e.data); };
      painters.push(w);
    }
  } catch { painters = []; done(); }
}

export function initTiles(canvas: HTMLCanvasElement) {
  cvS = canvas;
  if (mode === '2d') cs = canvas.getContext('2d');
  gpu?.setBackground(grade('#9cd162'));
  const DL = extractDisplayList();
  if (BAKE) allDL.push(...DL);
  startPainters();
  const onTile = (m: any) => { if (m.type === 'ready') { tileStats.log.push([performance.now(), -1, m.ms, m.n, { lag: performance.now() - m.sent, sentAbs: performance.timeOrigin + m.sent, wBoot: m.wBoot, wStart: m.wStart, wEnd: m.wEnd, recvAbs: performance.timeOrigin + performance.now(), origin: performance.timeOrigin }]); return; } if (m.type === 'tile' && m.gen === gen) { tileStats.painted++; if (tileStats.log.length < 400) tileStats.log.push([performance.now(), m.l, m.ms, m.n, m.dbg]); putTile(m.l, m.i, m.j, m.bmp); requestStatic(); } };
  onTileFn = onTile;
  if (!painters.length) {
    // דפדפן ישן: אותו צייר רץ בדף עצמו (איטי יותר, אבל עובד)
    const handle = createPainter(m => setTimeout(() => onTile(m), 0));
    painters = [{ postMessage: m => handle(m) }];
  }
  colors = [...new Set(DL.flatMap(it => [it.fill, it.stroke]).filter(Boolean))]; colorSet = new Set(colors);
    // ארוז פעם אחת: מחרוזת אחת ומערכים מספריים שמועברים בלי העתקה (לכל צייר נוסף – עותק של המערכים)
  const { pk } = packDL(DL), KEYS = ['d', 'dLen', 'm', 'a', 'pad', 'sw', 'det', 'sty', 'z'];
  // קודם מכינים עותק לכל צייר (אחרי ההעברה המערכים של המקור כבר לא שלנו), ואז שולחים
  const packs: any[] = painters.map((_, q) => q === 0 ? pk : { ...pk, ...Object.fromEntries(KEYS.map(k => [k, (pk as any)[k].slice()])) });
  painters.forEach((p, q) => {
    (p as any).postMessage({ type: 'init', packed: packs[q], B: ctx.B, TILE, BASE, sent: performance.now() }, KEYS.map(k => packs[q][k].buffer));
    p.postMessage({ type: 'palette', cmap: colorMap(), gen });
  });
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
  tileStats.missing = need.length;
  // קודם הבקשות לציירים, ורק אחר כך ההרכבה בכרטיס הגרפי: ההרכבה הראשונה כבדה, והציירים לא צריכים לחכות לה
  requestTiles(l, tw, ix0, ix1, iy0, iy1, wx0, wy0, wx1, wy1, ccx, ccy);
  // בכרטיס הגרפי: רק מטריצה אחת ורשימת אריחים נראים
  if (gpu) gpu.compose(l, { ix0, ix1, iy0, iy1 }, cam);
}

function requestTiles(l: number, tw: number, ix0: number, ix1: number, iy0: number, iy1: number, wx0: number, wy0: number, wx1: number, wy1: number, ccx: number, ccy: number) {
  const { B } = ctx;
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
  // הכנה מראש של רמות אחרות – רק אחרי שהמבט הראשון מוכן: בטעינה הן התחרו ברשת (קבצי אזורים) באריחים שעל המסך
  if (warm) { around(l - 1, 2); around(l + 1, .7); around(l - 2, 4); around(l + 2, .3); }
  // במסך גדול בצפיפות כפולה יש יותר מ-300 משבצות על המסך: קודם נחתכו מהרשימה גם אריחים נראים בקצוות, והם לא צוירו אף פעם
  const nVis = (ix1 - ix0 + 1) * (iy1 - iy0 + 1);
  cap = Math.max(TILE_CAP, Math.ceil(nVis * 1.6) + L0_KEYS.length + 16);
  const budget = cap - L0_KEYS.length - 16;
  if (want.length > budget) want.length = budget;
  wanted = new Set(want.map(q => tkey(q[0], q[1], q[2])));
  const need = (q: number[]) => { const k = tkey(q[0], q[1], q[2]); return !tiles.has(k) || stale.has(k); };
  const list = want.filter(need).map(q => q.slice(0, 3));
  if (warm) for (const k of L0_KEYS) if (need(k)) list.push(k);   // תמיד גם סקירה של כל העולם (אחרי שהמבט הראשון מוכן)
  // אריח מוכן מראש – נטען כתמונה (אם הטעינה נכשלה – מצייר אותו)
  const toPaint = list.filter(q => { if (isBaked(q[0]) && !failed.has(tkey(q[0], q[1], q[2]))) { fetchTile(q[0], q[1], q[2]); return false; } return true; });
  // כל אריח שייך תמיד לאותו צייר, כדי שלא יצויר פעמיים
  const parts: number[][][] = painters.map(() => []);
  for (const q of toPaint) parts[(q[1] * 7 + q[2] * 13 + q[0]) % painters.length].push(q);
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

let beforeStatic: () => void = () => {};
/** נקרא לפני ציור כשהלולאה עצורה (מעדכן מה נראה, כדי שדמויות שנכנסות למסך יופיעו גם בהשהיה) */
export const onStaticFrame = (f: () => void) => { beforeStatic = f; };
function staticFrame() { sRaf = 0; if (sDirty) { sDirty = false; beforeStatic(); drawStatic(); } }
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
