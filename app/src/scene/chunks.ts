/* בנייה לפי אזורים (זמן טעינה שלא תלוי בגודל העולם).
   העולם מחולק לריבועים של CH יחידות. דברים רבים ושטחיים (עצי היער, רצפת היער העתיק) לא מצוירים בטעינה:
   בטעינה רק מתכננים אותם (מקום, סוג ומידות – בלי לצייר), כך שכל מה שתלוי בהם (מפת ההליכה, החיות, הציפורים) כבר יודע עליהם.
   הציור עצמו קורה לפי אזורים: האזור של המבט הראשון מיד, והשאר ברקע אחרי שהמפה מוצגת – הקרוב למבט קודם.
   פרטים קטנים (שרכים, פטריות) הם רמה שנייה: מצוירים רק כשמתקרבים לאזור בזום (רמת פירוט, LOD).
   כל ציור הוא דטרמיניסטי לפי המקום, אז אזור שמצויר מאוחר נראה בדיוק אותו דבר בכל פעם. */
import { el } from '../core/util';
import { ctx, drawInto, statics } from '../world/context';
import { drawCost } from '../core/util';
import { STATIC_COST } from '../world/budget';
import { SNode } from '../render/snode';

export const CH = 800;
type Job = { st?: any; layer: string; draw: (g: any) => void; detail?: boolean };
interface Chunk { key: number; cx: number; cy: number; base: Job[]; detail: Job[]; built: boolean; detailBuilt: boolean; rect: number[] }
const chunks = new Map<number, Chunk>();
const ckey = (cx: number, cy: number) => (cx + 512) * 1024 + (cy + 512);
function chunkAt(x: number, y: number) {
  const cx = Math.floor(x / CH), cy = Math.floor(y / CH), k = ckey(cx, cy);
  let c = chunks.get(k);
  if (!c) { c = { key: k, cx, cy, base: [], detail: [], built: false, detailBuilt: false, rect: [cx * CH, cy * CH, (cx + 1) * CH, (cy + 1) * CH] }; chunks.set(k, c); }
  return c;
}
const grow = (c: Chunk, bb?: number[]) => { if (bb) { c.rect[0] = Math.min(c.rect[0], bb[0]); c.rect[1] = Math.min(c.rect[1], bb[1]); c.rect[2] = Math.max(c.rect[2], bb[0] + bb[2]); c.rect[3] = Math.max(c.rect[3], bb[1] + bb[3]); } };

/** דבר עומד שיצויר מאוחר יותר: st כבר ברשימת הדברים העומדים (עם המידות שלו), draw מצייר אותו לתוך הקבוצה שלו */
export function deferStatic(x: number, y: number, st: any, draw: () => void) {
  const c = chunkAt(x, y); c.base.push({ st, layer: 'props', draw: () => draw() }); grow(c, st.bb);
}
/** ציור שטוח של אזור (למשל טחב על רצפת היער) בשכבה מסוימת; detail: רק כשמתקרבים */
export function deferArea(x: number, y: number, layer: string, draw: (g: any) => void, detail = false) {
  const c = chunkAt(x, y); (detail ? c.detail : c.base).push({ layer, draw, detail });
}

/** מצייר את האזור (או את רמת הפירוט שלו) לתוך עצים זמניים לפי שכבה, ומחזיר אותם לחילוץ לרשימת הציור */
export type ChunkOut = { layers: Record<string, any[]>; rect: number[]; cost: { els: number; pts: number } };
function drawJobs(c: Chunk, jobs: Job[]): ChunkOut {
  const e0 = drawCost.els, p0 = drawCost.pts, layers: Record<string, any[]> = {};
  for (const j of jobs) {
    if (j.st) {
      // דבר עומד: הקבוצה שלו נוצרת עכשיו, נשמרת ברשימה, והציור נכנס אליה
      const g = new SNode('g'); (g as any).st = j.st; j.st.el = g;
      drawInto(g, () => j.draw(g));
      (layers.props ||= []).push(g);
    } else {
      const holder = new SNode('g');
      const keep = ctx.L[j.layer]; ctx.L[j.layer] = holder;
      try { j.draw(holder); } finally { ctx.L[j.layer] = keep; }
      (layers[j.layer] ||= []).push(holder);
    }
  }
  const cost = { els: drawCost.els - e0, pts: drawCost.pts - p0 };
  STATIC_COST.els += cost.els; STATIC_COST.pts += Math.round(cost.pts);
  return { layers, rect: c.rect, cost };
}
export function buildChunk(c: Chunk): ChunkOut | null { if (c.built) return null; c.built = true; return drawJobs(c, c.base); }
export function buildDetail(c: Chunk): ChunkOut | null { if (c.detailBuilt || !c.detail.length) { c.detailBuilt = true; return null; } c.detailBuilt = true; return drawJobs(c, c.detail); }

/** האזורים שנוגעים במלבן, הקרובים למרכז קודם */
export function chunksIn(x0: number, y0: number, x1: number, y1: number) {
  const out: Chunk[] = [];
  for (const c of chunks.values()) if (c.rect[2] >= x0 && c.rect[0] <= x1 && c.rect[3] >= y0 && c.rect[1] <= y1) out.push(c);
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return out.sort((a, b) => Math.hypot((a.cx + .5) * CH - mx, (a.cy + .5) * CH - my) - Math.hypot((b.cx + .5) * CH - mx, (b.cy + .5) * CH - my));
}
/** האזור הבא לבנייה ברקע: הקרוב ביותר לנקודה, שעוד לא נבנה */
export function nextChunk(x: number, y: number): Chunk | null {
  let best: Chunk | null = null, bd = Infinity;
  for (const c of chunks.values()) if (!c.built) { const d = Math.hypot((c.cx + .5) * CH - x, (c.cy + .5) * CH - y); if (d < bd) { bd = d; best = c; } }
  return best;
}
export const pendingCount = () => { let n = 0; for (const c of chunks.values()) if (!c.built) n++; return n; };
export const allChunks = () => [...chunks.values()];
void el; void statics;
