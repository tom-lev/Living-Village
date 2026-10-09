/* הקשר משותף לבניית הסצנה: שכבות, אזורים חסומים, גופי מים ואפקטים */
import { el, wrap1, n2, at } from '../core/util';
import type { Rect, WorldData } from './types';
import { VNode, setDefs } from '../render/vnode';
import { SNode } from '../render/snode';
import { inView, view } from '../camera/view';

export interface Bounds { x0: number; y0: number; x1: number; y1: number }
export interface Ellipse { cx: number; cy: number; rx: number; ry: number }

export const ctx = {
  firstView: null as number[] | null,   // המבט הראשון בעולם (x0, y0, x1, y1), עם שוליים
  world: null as WorldData,
  B: null as Bounds,           // גבולות העולם
  home: null as Bounds,        // תצוגת הבית (הכפר)
  svgS: null as SVGSVGElement, // (לא בשימוש לבנייה: הנוף הקבוע נבנה מ-SNode בזיכרון והופך ישירות לאריחים)
  svgD: null as SVGSVGElement, // SVG דינמי: דמויות ואפקטים
  worldS: null as any, worldD: null as any, defs: null as any,
  L: {} as Record<string, any>,
  named: {} as Record<string, any>,   // אובייקטים עם id
  gpuDyn: false,                       // הדמויות והאפקטים בכרטיס הגרפי (VNode) במקום SVG
};

/* ───────── שכבות ───────── */
export function initLayers(svgS: SVGSVGElement, svgD: SVGSVGElement) {
  ctx.svgS = svgS; ctx.svgD = svgD;
  ctx.defs = el('defs', null, svgD);
  setDefs(ctx.defs);
  ctx.worldS = new SNode('g'); ctx.worldD = ctx.gpuDyn ? new VNode('g') : el('g', null, svgD);
  for (const n of ['ground', 'roads', 'groundProps', 'water', 'props']) ctx.L[n] = el('g', { 'data-layer': n }, ctx.worldS);
  for (const n of ['waterFx', 'cloudShadows', 'pad', 'fx', 'actors', 'air', 'clouds', 'labels']) ctx.L[n] = el('g', { 'data-layer': n }, ctx.worldD);
  const g = el('radialGradient', { id: 'fireGlow' }, ctx.defs);
  el('stop', { offset: '0%', 'stop-color': '#ffcf6b', 'stop-opacity': .9 }, g);
  el('stop', { offset: '100%', 'stop-color': '#ffcf6b', 'stop-opacity': 0 }, g);
}

/* ───────── אובייקטים נייחים: ממוינים לפי y (מה שלמטה במסך מצויר מעל) ───────── */
export const statics: { el: any; y: number; bb?: number[]; idx?: number; cid?: number }[] = [];
/** מספר יצירה לכל דבר עומד (אותו סדר בכל בנייה). באתר המפורסם המידות שלהם מגיעות מקובץ שנאפה (static.bin), לפי המספר */
let CID = 0;
export const STATIC_BB: { arr: Float64Array | null } = { arr: null };
export const cidCount = () => CID;
export const setCid = (n: number) => { CID = n; };
/** ציור נדחה (בנייה לפי אזורים, scene/chunks.ts): בזמן שהדבר מצויר, prop() מחזיר את הקבוצה שכבר שמורה לו ברשימה */
let deferTarget: any = null;
export function drawInto(g: any, f: () => void) { const k = deferTarget; deferTarget = g; try { f(); } finally { deferTarget = k; } }
/** המלבן המצויר של דבר עומד: [x, y, רוחב, גובה]. נמדד פעם אחת וזוכרים אותו (כל מדידה מכריחה את הדפדפן לחשב פריסה מחדש,
 *  ומדידות לסירוגין עם ציור עלו שניות בטעינה). קוראים לזה רק אחרי שהציור של הדבר סופי */
export function bboxOf(st: { el: any; bb?: number[] }) {
  if (!st.bb) { try { const b = st.el.getBBox(); st.bb = [b.x, b.y, b.width, b.height]; } catch { st.bb = [0, 0, 0, 0]; } }
  return st.bb;
}
export function prop(y: number, parent?: any) {
  if (deferTarget && !parent) { const g = deferTarget; deferTarget = null; return g; }
  const g = el('g', null, parent || ctx.L.props);
  if (!parent) {
    const st: any = { el: g, y, cid: CID++ }, a = STATIC_BB.arr, i = st.cid * 4;
    if (a && i + 3 < a.length && a[i + 2] > 0) st.bb = [a[i], a[i + 1], a[i + 2], a[i + 3]];
    statics.push(st); g.st = st;
  }
  return g;
}
export function sortStatics() {
  statics.sort((a, b) => a.y - b.y);
  // מספר סידורי אחרי המיון: סדר הציור של דברים באותו גובה (גם אלה שיצוירו מאוחר יותר, לפי אזורים)
  statics.forEach((s, i) => { s.idx = i; if (s.el) ctx.L.props.appendChild(s.el); });
}

/* ───────── אזורים שבהם לא שותלים עצים (בתים, שדות, מבנים) ───────── */
export const NO_TREE: Rect[] = [];
/** עבודות רקע של הבנייה באתר המפורסם (משימה 30): רצות אחרי שהמפה מוצגת, בחלקים, לפני החיות; כל קריאה מחזירה true כשסיימה */
export const BG_JOBS: (() => boolean)[] = [];
export const block = (x0: number, y0: number, x1: number, y1: number) => { NO_TREE.push([x0, y0, x1, y1]); };

/* ───────── גופי מים (לא שותלים בהם ולא מציירים עליהם דשא) ───────── */
export const WATERS: Ellipse[] = [];
export const inWater = (x: number, y: number, m = 0) =>
  WATERS.some(w => ((x - w.cx) / (w.rx + m)) ** 2 + ((y - w.cy) / (w.ry + m)) ** 2 < 1);

/* ───────── אפקטים קטנים: מונפשים מ-JS (אנימציית CSS על SVG מתפקסלת בזום) ───────── */
export type FxFn = (t: number, dt: number) => void;
export const FX: FxFn[] = [];
/** אפקט במקום קבוע: רץ רק כשהעיגול (x, y, r) נראה. האפקטים תלויים רק בזמן, אז בחזרה למסך הם מיד במצב הנכון */
// (אפקט שקטן על המסך – size: הגודל של מה שזז, למשל נשיפת עשן – מתעדכן פחות: מתחת ל-8 פיקסלים כל פריים שלישי,
//  מתחת ל-24 כל פריים שני, לסירוגין בין האפקטים. האפקטים תלויים בזמן, אז התנועה לא משתנה – רק נחסכת עבודה
//  שאי אפשר לראות. מקרוב – כל פריים)
let fxN = 0;
export const fxAt = (x: number, y: number, r: number, f: FxFn, size = r) => {
  let acc = 0, n = fxN++;
  FX.push((t, dt) => {
    if (!inView(x, y, r)) { acc = 0; return; }
    acc += dt; n++;
    const px = size * view.cam.k, every = px < 8 ? 3 : px < 24 ? 2 : 1;
    if (n % every) return;
    f(t, acc); acc = 0;
  });
};
export function smokeFx(e: any, cx: number, cy: number, delay: number, dur = 4.8, dx = 16, dy = -52) {
  fxAt(cx + dx / 2, cy + dy / 2, 40 + Math.hypot(dx, dy) / 2, t => {
    const p = wrap1((t + delay) / dur), s = .35 + 1.25 * p;
    // גדל סביב (cx, cy) ועולה: בכרטיס הגרפי ישירות, בלי מחרוזת (נקרא לכל נשיפה בכל פריים)
    if (e.setTS) e.setTS(cx + dx * p - s * cx, cy + dy * p - s * cy, s);
    else e.setAttribute('transform', `translate(${n2(dx * p)},${n2(dy * p)}) ` + at(cx, cy, s, s));
    e.setAttribute('opacity', (p < .12 ? p / .12 * .8 : .8 * (1 - (p - .12) / .88)).toFixed(2));
  }, 10);
}

/* אדוות שנוצרות ונעלמות (ברווזים, דג) */
const RIPPLES: { e: any; x: number; y: number; age: number }[] = [];
export function ripple(x: number, y: number, rx: number, ry: number, parent?: any) {
  if (!inView(x, y, 2 * rx) || rx * view.cam.k < 2) return;   // מחוץ למסך, או זעירה מדי (פחות מ-2 פיקסלים): אף אחד לא יראה אותה
  RIPPLES.push({ e: el('ellipse', { cx: n2(x), cy: n2(y), rx, ry, fill: 'none', stroke: '#e8f8fd', 'stroke-width': 1.2 }, parent || ctx.L.waterFx), x, y, age: 0 });
}
FX.push((t, dt) => {
  for (let i = RIPPLES.length - 1; i >= 0; i--) {
    const r = RIPPLES[i]; r.age += dt;
    const p = r.age / 1.8;
    if (p >= 1) { r.e.remove(); RIPPLES.splice(i, 1); continue; }
    const q = 1 - (1 - p) ** 2, s = .25 + 1.45 * q;
    r.e.setAttribute('transform', at(r.x, r.y, s, s)); r.e.setAttribute('opacity', (.9 * (1 - q)).toFixed(2));
  }
});
