/* שמות של אובייקטים: תווית קטנה מתחת לאובייקט, שמופיעה בהדרגה כשמתקרבים (מזום ×3 בערך).
   התווית נשארת באותו גודל על המסך בכל זום: היא קטנה ולא מסתירה את האיור.
   השם בא מהשדה name של האובייקט ב-world.json (גם משמש אותנו כשמדברים על תיקונים). */
import { el, n2, clamp } from '../core/util';
import { ctx } from './context';
import { view } from '../camera/view';
import { VNode } from '../render/vnode';

const FS = 10, PX = 11;            // גודל הגופן ביחידות עולם, והגודל הרצוי על המסך בפיקסלים
const SHOW_FROM = 2.7, FULL_AT = 3.4;   // יחס לזום הבית: מתחילים להופיע, ונראים במלואם
/* סוגים שבהם x,y הוא הפינה השמאלית העליונה של מלבן (ולא המרכז או קו הקרקע) */
const TOP_LEFT = new Set(['vegGarden', 'field', 'footballPitch', 'pier']);

const labels: any[] = [];
let lastK = -1;

/** איפה התווית: מתחת לאובייקט, לפי סוג הקואורדינטות שלו (או labelAt מהנתונים) */
function anchorOf(o: any): number[] | null {
  if (o.labelAt) return o.labelAt;
  if (TOP_LEFT.has(o.type)) return [o.x + (o.w ?? 0) / 2, o.y + (o.h ?? 0) + 8];
  if (o.cx !== undefined) return [o.cx, o.cy + (o.ry ?? o.r ?? 0) + 8];
  if (o.x0 !== undefined) return [(o.x0 + o.x1) / 2, o.y1 + 8];
  if (o.a && o.b) return [(o.a[0] + o.b[0]) / 2, (o.a[1] + o.b[1]) / 2 + 8];
  if (o.x !== undefined) return [o.x, o.y + 10];
  return null;
}

export function addLabel(o: any) {
  const p = anchorOf(o); if (!p || !o.name) return;
  const g = el('g', { transform: `translate(${n2(p[0])},${n2(p[1])})` }, ctx.L.labels), inner = el('g', null, g);
  const w = o.name.length * FS * .56 + 8;
  el('rect', { x: -w / 2, y: 0, width: w, height: FS + 5, rx: (FS + 5) / 2, fill: '#fffdf6', opacity: .82 }, inner);
  const t = el('text', { x: 0, y: FS + .5, 'text-anchor': 'middle', 'font-size': FS, 'font-weight': 600, fill: '#4a4a55' }, inner);
  t.textContent = o.name;
  labels.push(inner);
}

/** בכל פריים: שקיפות לפי הזום, וקנה מידה הפוך כדי שהתווית תישאר באותו גודל על המסך */
export function updateLabels() {
  const k = view.cam.k;
  if (k === lastK) return;
  lastK = k;
  const L = ctx.L.labels, a = clamp((k / view.fitK - SHOW_FROM) / (FULL_AT - SHOW_FROM), 0, 1);
  L.setAttribute('display', a > 0 ? 'inline' : 'none');
  if (!a) return;
  L.setAttribute('opacity', a.toFixed(2));
  const s = PX / (FS * k);
  for (const e of labels) {
    if (e instanceof VNode) e.c.scale.set(s, s);
    else e.setAttribute('transform', `scale(${s.toFixed(4)})`);
  }
}
