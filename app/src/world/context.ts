/* הקשר משותף לבניית הסצנה: שכבות, אזורים חסומים, גופי מים ואפקטים */
import { el, wrap1, n2, at } from '../core/util';
import type { Rect, WorldData } from './types';
import { VNode, setDefs } from '../render/vnode';
import { SNode } from '../render/snode';
import { inView } from '../camera/view';

export interface Bounds { x0: number; y0: number; x1: number; y1: number }
export interface Ellipse { cx: number; cy: number; rx: number; ry: number }

export const ctx = {
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
export const statics: { el: any; y: number; bb?: number[] }[] = [];
/** המלבן המצויר של דבר עומד: [x, y, רוחב, גובה]. נמדד פעם אחת וזוכרים אותו (כל מדידה מכריחה את הדפדפן לחשב פריסה מחדש,
 *  ומדידות לסירוגין עם ציור עלו שניות בטעינה). קוראים לזה רק אחרי שהציור של הדבר סופי */
export function bboxOf(st: { el: any; bb?: number[] }) {
  if (!st.bb) { try { const b = st.el.getBBox(); st.bb = [b.x, b.y, b.width, b.height]; } catch { st.bb = [0, 0, 0, 0]; } }
  return st.bb;
}
export function prop(y: number, parent?: any) {
  const g = el('g', null, parent || ctx.L.props);
  if (!parent) statics.push({ el: g, y });
  return g;
}
export function sortStatics() {
  statics.sort((a, b) => a.y - b.y);
  for (const s of statics) ctx.L.props.appendChild(s.el);
}

/* ───────── אזורים שבהם לא שותלים עצים (בתים, שדות, מבנים) ───────── */
export const NO_TREE: Rect[] = [];
export const block = (x0: number, y0: number, x1: number, y1: number) => { NO_TREE.push([x0, y0, x1, y1]); };

/* ───────── גופי מים (לא שותלים בהם ולא מציירים עליהם דשא) ───────── */
export const WATERS: Ellipse[] = [];
export const inWater = (x: number, y: number, m = 0) =>
  WATERS.some(w => ((x - w.cx) / (w.rx + m)) ** 2 + ((y - w.cy) / (w.ry + m)) ** 2 < 1);

/* ───────── אפקטים קטנים: מונפשים מ-JS (אנימציית CSS על SVG מתפקסלת בזום) ───────── */
export type FxFn = (t: number, dt: number) => void;
export const FX: FxFn[] = [];
/** אפקט במקום קבוע: רץ רק כשהעיגול (x, y, r) נראה. האפקטים תלויים רק בזמן, אז בחזרה למסך הם מיד במצב הנכון */
export const fxAt = (x: number, y: number, r: number, f: FxFn) => FX.push((t, dt) => { if (inView(x, y, r)) f(t, dt); });
export function smokeFx(e: any, cx: number, cy: number, delay: number, dur = 4.8, dx = 16, dy = -52) {
  fxAt(cx + dx / 2, cy + dy / 2, 40 + Math.hypot(dx, dy) / 2, t => {
    const p = wrap1((t + delay) / dur), s = .35 + 1.25 * p;
    e.setAttribute('transform', `translate(${n2(dx * p)},${n2(dy * p)}) ` + at(cx, cy, s, s));
    e.setAttribute('opacity', (p < .12 ? p / .12 * .8 : .8 * (1 - (p - .12) / .88)).toFixed(2));
  });
}

/* אדוות שנוצרות ונעלמות (ברווזים, דג) */
const RIPPLES: { e: any; x: number; y: number; age: number }[] = [];
export function ripple(x: number, y: number, rx: number, ry: number, parent?: any) {
  if (!inView(x, y, 2 * rx)) return;   // מחוץ למסך: אף אחד לא יראה אותה
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
