/* צייר האריחים: מקבל את רשימת הציור פעם אחת, ואז מצייר אריחי bitmap לפי בקשה.
   רץ בתוך Web Worker; בדפדפן בלי OffscreenCanvas אותו קוד רץ בדף עצמו. */
import { pathBox, boxThrough, type M6 } from './snode';

export interface DLItem {
  d: string; m: number[]; a: number; det: boolean; bb: number[] | null; pad?: number; z: number;
  /** צורה ענקית (הרבה חלקים על שטח גדול): כל חלק עם הגבולות שלו, כדי לצייר באריח רק את החלקים שנופלים בו */
  parts?: { d: string; bb: number[] }[];
  fill: string | null; stroke: string | null; sw: number; cap: string; join: string; dash: number[] | null;
  p?: Path2D;
}
/** רשימת ציור ארוזה למעבר מהיר ל-Worker: מחרוזת אחת לכל המסלולים, ומערכים מספריים שמועברים בלי העתקה
 *  (העברה של עשרות אלפי אובייקטים נפרדים עלתה יותר משנייה) */
export interface PackedDL {
  d: Uint8Array; dLen: Int32Array; z: Float64Array; m: Float64Array; a: Float32Array; pad: Float32Array; sw: Float32Array; det: Uint8Array; sty: Int32Array;
  styles: [string | null, string | null, string, string, number[] | null][];
}
export function packDL(DL: DLItem[]): { pk: PackedDL; transfer: ArrayBuffer[] } {
  const n = DL.length, z = new Float64Array(n), dLen = new Int32Array(n), m = new Float64Array(n * 6), a = new Float32Array(n), pad = new Float32Array(n), sw = new Float32Array(n), det = new Uint8Array(n), sty = new Int32Array(n);
  const styles: PackedDL['styles'] = [], sIdx = new Map<string, number>(), ds: string[] = [];
  DL.forEach((it, i) => {
    ds.push(it.d); dLen[i] = it.d.length; z[i] = it.z; m.set(it.m, i * 6); a[i] = it.a; pad[i] = it.pad ?? 2; sw[i] = it.sw; det[i] = it.det ? 1 : 0;
    const key = `${it.fill}|${it.stroke}|${it.cap}|${it.join}|${it.dash}`;
    let k = sIdx.get(key); if (k === undefined) { k = styles.length; sIdx.set(key, k); styles.push([it.fill, it.stroke, it.cap, it.join, it.dash]); }
    sty[i] = k;
  });
  // המחרוזת הופכת לבתים (העברה בלי העתקה; מחרוזת גדולה הועתקה לצייר רק כשהדף התפנה, ועיכבה אותו בשניות)
  return { pk: { d: new TextEncoder().encode(ds.join('')), dLen, z, m, a, pad, sw, det, sty, styles }, transfer: [z.buffer, dLen.buffer, m.buffer, a.buffer, pad.buffer, sw.buffer, det.buffer, sty.buffer] };
}
function unpackDL(pk: PackedDL): DLItem[] {
  const out: DLItem[] = [], all = new TextDecoder().decode(pk.d); let o = 0;
  for (let i = 0; i < pk.dLen.length; i++) {
    const st = pk.styles[pk.sty[i]], d = all.substr(o, pk.dLen[i]); o += pk.dLen[i];
    out.push({ d, z: pk.z[i], m: Array.from(pk.m.subarray(i * 6, i * 6 + 6)), a: pk.a[i], det: !!pk.det[i], bb: null, pad: pk.pad[i], fill: st[0], stroke: st[1], sw: pk.sw[i], cap: st[2], join: st[3], dash: st[4] });
  }
  return out;
}

export interface TileMsg { type: 'tile'; l: number; i: number; j: number; bmp: any; gen: number; ms?: number; n?: number }

const DLC = 160;   // גודל תא באינדקס המרחבי
const BIG = 3000;  // מסלול ארוך מזה (תווים) שמכסה שטח גדול: מפרקים לחלקים

/** מפרק מסלול לחלקים (כל M מוחלט מתחיל חלק), כל אחד עם הגבולות שלו, ומחזיר את הגבולות של כולו.
 *  אם יש חלק שמתחיל ב-m יחסי – לא מפרקים (המיקום שלו תלוי בקודם) */
function splitParts(it: DLItem): number[] | null {
  const d = it.d, starts: number[] = [];
  for (let i = 0; i < d.length; i++) { const c = d.charCodeAt(i); if (c === 77) starts.push(i); else if (c === 109) return null; }
  if (starts.length < 24) return null;
  const p = it.pad ?? 2, parts: { d: string; bb: number[] }[] = [], all = [Infinity, Infinity, -Infinity, -Infinity];
  for (let k = 0; k < starts.length; k++) {
    const sd = d.slice(starts[k], starts[k + 1] ?? d.length), b = pathBox(sd);
    if (!(b[0] <= b[2])) continue;
    const q = boxThrough(it.m as M6, [b[0] - p, b[1] - p, b[2] + p, b[3] + p]);
    parts.push({ d: sd, bb: q });
    all[0] = Math.min(all[0], q[0]); all[1] = Math.min(all[1], q[1]); all[2] = Math.max(all[2], q[2]); all[3] = Math.max(all[3], q[3]);
  }
  it.parts = parts;
  return all;
}
/** מפתח מספרי לתא באינדקס (מהיר יותר ממחרוזת) */
const ck = (cx: number, cy: number) => (cx + 4096) * 8192 + (cy + 4096);
const WIDE = 64;   // צורה שמכסה יותר תאים מזה (רקע של כל העולם) נשמרת ברשימה נפרדת שנבדקת בכל אריח

export function createPainter(post: (m: TileMsg, transfer?: any[]) => void) {
  let items: DLItem[] = [], grid = new Map<number, number[]>(), wide: number[] = [], B: any, TILE = 256, BASE = 1 / 8;
  let queue: number[][] = [], busy = false, stamp = 1, seen: Uint32Array, drawn = 0;
  let cmap: Record<string, string> = {}, gen = 0;   // צבע מקורי → צבע אחרי הפלטה
  let cvR: any = null, cR: any = null;
  const mk = (n: number): any => typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(n, n) : Object.assign(document.createElement('canvas'), { width: n, height: n });

  function render(l: number, tx: number, ty: number) {
    const sc = BASE * 2 ** l, tw = TILE / sc, x0 = B.x0 + tx * tw, y0 = B.y0 + ty * tw, x1 = x0 + tw, y1 = y0 + tw;
    // קנבס אחד לכל האריחים (יצירת קנבס חדש לכל אריח עלתה עשרות אלפיות שנייה, בציור הראשון עליו)
    if (!cvR || cvR.width !== TILE) { cvR = mk(TILE); cR = cvR.getContext('2d', { willReadFrequently: true }); }
    const cv = cvR, c = cR, ids: number[] = []; stamp++; drawn = 0;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, TILE, TILE);
    for (let cy = Math.floor(y0 / DLC); cy <= Math.floor(y1 / DLC); cy++)
      for (let cx = Math.floor(x0 / DLC); cx <= Math.floor(x1 / DLC); cx++)
        for (const id of grid.get(ck(cx, cy)) || []) if (seen[id] !== stamp) { seen[id] = stamp; ids.push(id); }
    for (const id of wide) ids.push(id);
    ids.sort((a, b) => items[a].z - items[b].z || a - b);   // סדר הציור: לפי מפתח הסדר (שכבה, ואז y של הדבר העומד)
    for (const id of ids) {
      const it = items[id], b = it.bb;
      if (b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1) continue;
      if (it.det && sc < .6) continue;                                 // דשא: רק כשקרובים
      if (Math.max(b[2] - b[0], b[3] - b[1]) * sc < .4) continue;      // קטן מפיקסל: מדלגים
      const m = it.m;
      c.setTransform(sc * m[0], sc * m[1], sc * m[2], sc * m[3], sc * (m[4] - x0), sc * (m[5] - y0));
      c.globalAlpha = it.a;
      let p: Path2D;
      if (it.parts) {
        // רק החלקים שנוגעים באריח, כמסלול אחד (אותה תוצאה בדיוק, בחלק מהעבודה)
        let sub = '';
        for (const q of it.parts) { const qb = q.bb; if (qb[2] >= x0 && qb[0] <= x1 && qb[3] >= y0 && qb[1] <= y1) sub += q.d; }
        if (!sub) continue;
        p = new Path2D(sub);
      } else p = it.p || (it.p = new Path2D(it.d));
      drawn++;
      if (it.fill) { c.fillStyle = cmap[it.fill] || it.fill; c.fill(p); }
      if (it.stroke) { c.strokeStyle = cmap[it.stroke] || it.stroke; c.lineWidth = it.sw; c.lineCap = it.cap; c.lineJoin = it.join; c.setLineDash(it.dash || []); c.stroke(p); }
    }
    // הקנבס נשאר שלנו (בלי הקצאה מחדש לכל אריח): קוראים את הפיקסלים, ומהם יוצרים תמונה
    return typeof createImageBitmap !== 'undefined' && cv.transferToImageBitmap ? createImageBitmap(c.getImageData(0, 0, TILE, TILE)) : Promise.resolve(cv);
  }

  /** מוסיף לאינדקס המרחבי את הצורות מ-from והלאה (בהתחלה כולן; אחר כך אזורים שמתווספים) */
  function index(from: number) {
    items.forEach((it, id) => { if (id < from) return;
        // הגבולות של הצורה בעולם (מחושבים כאן ברקע, לא בדף): מהמסלול, עם מרווח לעובי הקו, דרך המטריצה.
        // מסלול ארוך מפורק לחלקים, והגבולות שלו הם האיחוד של החלקים (מפענחים אותו פעם אחת)
        if (!it.bb) {
          const sp = it.d.length > BIG ? splitParts(it) : null;
          if (sp) it.bb = sp;
          else { const b = pathBox(it.d), p = it.pad ?? 2; it.bb = b[0] <= b[2] ? boxThrough(it.m as M6, [b[0] - p, b[1] - p, b[2] + p, b[3] + p]) : [0, 0, -1, -1]; }
        }
        const b = it.bb, cx0 = Math.floor(b[0] / DLC), cx1 = Math.floor(b[2] / DLC), cy0 = Math.floor(b[1] / DLC), cy1 = Math.floor(b[3] / DLC);
        if (cx1 < cx0 || cy1 < cy0) return;
        if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > WIDE) { wide.push(id); return; }
        for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const k = ck(cx, cy); (grid.get(k) || grid.set(k, []).get(k)!).push(id); }
      });
  }

  async function pump() {
    busy = false;
    if (!queue.length) return;
    const t0 = performance.now(), [l, i, j] = queue.shift(), bmp = await render(l, i, j);
    post({ type: 'tile', l, i, j, bmp, gen, ms: performance.now() - t0, n: drawn} as any, bmp.close ? [bmp] : undefined);
    busy = true; setTimeout(pump, 0);
  }

  return (m: any) => {
    if (m.type === 'init') {
      const ti0 = performance.now();
      ({ B, TILE, BASE } = m); items = m.packed ? unpackDL(m.packed) : m.items; seen = new Uint32Array(items.length);
      index(0);
      (post as any)({ type: 'ready', ms: performance.now() - ti0, n: items.length, sent: m.sent, wStart: performance.timeOrigin + ti0, wEnd: performance.timeOrigin + performance.now(), wBoot: performance.timeOrigin });
    } else if (m.type === 'add') {
      // אזור שצויר מאוחר יותר: מצטרף לרשימה ולאינדקס
      const from = items.length, add = unpackDL(m.packed);
      for (const it of add) items.push(it);
      const s2 = new Uint32Array(items.length); s2.set(seen); seen = s2;
      index(from);
    } else if (m.type === 'palette') {
      cmap = m.cmap; if (m.keep) return;   // צבע חדש (מאזור שנוסף): בלי לזרוק את התור
      gen = m.gen; queue = [];
    } else if (m.type === 'need') {
      queue = m.list;                     // התור מתחלף בכל בקשה: תמיד מה שרלוונטי עכשיו
      if (!busy) { busy = true; setTimeout(pump, 0); }
    }
  };
}
