/* שמות של אובייקטים, כמו על מפה מאוירת: כתב סריף נטוי בגוון חום עם הילה בהירה, מעל האובייקט,
   ורק בזום קרוב (מ-×4.5 בערך). התווית נשארת באותו גודל על המסך בכל זום.
   השם בא מהשדה name ב-world.json. לחיצה על תווית פותחת חלון לשינוי השם: השינוי נשמר במכשיר
   (localStorage) ומופיע מיד; "העתק שינויים" מעתיק אותם כדי להכניס אותם לקובץ העולם לכולם. */
import { el, n2, clamp } from '../core/util';
import { ctx } from './context';
import { view } from '../camera/view';
import { VNode } from '../render/vnode';
import { requestStatic } from '../render/tiles';

const FS = 10, PX = 15;                 // גודל הגופן ביחידות עולם, והגודל הרצוי על המסך בפיקסלים
const SHOW_FROM = 4.2, FULL_AT = 5;     // יחס לזום הבית: מתחילים להופיע, ונראים במלואם
/* סוגים שבהם x,y הוא הפינה השמאלית העליונה של מלבן (ולא המרכז או קו הקרקע) */
const TOP_LEFT = new Set(['vegGarden', 'field', 'footballPitch', 'pier']);
const STORE = 'village-names';

interface Label { o: any; key: string; original: string; x: number; y: number; inner: any; text: any }
const labels: Label[] = [];
let lastK = -1, alpha = 0;

let saved: Record<string, string> = {};
try { saved = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch {}
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch {} };

/** מרכז אופקי ונקודה עליונה של האובייקט. top: הקצה העליון של מה שהאובייקט חסם (מחושב בבנייה) */
function anchorOf(o: any, top?: number): number[] | null {
  if (o.labelAt) return o.labelAt;
  let x: number, y: number;
  if (TOP_LEFT.has(o.type)) { x = o.x + (o.w ?? 0) / 2; y = o.y; }
  else if (o.cx !== undefined) { x = o.cx; y = o.cy - (o.ry ?? o.r ?? 0); }
  else if (o.x0 !== undefined) { x = (o.x0 + o.x1) / 2; y = o.y0; }
  else if (o.a && o.b) { x = (o.a[0] + o.b[0]) / 2; y = Math.min(o.a[1], o.b[1]); }
  else if (o.x !== undefined) { x = o.x; y = o.y - 30; }
  else return null;
  return [x, top !== undefined ? Math.min(y, top) : y];
}
const keyOf = (o: any, p: number[]) => `${o.type}@${Math.round(p[0])},${Math.round(p[1])}`;

export function addLabel(o: any, top?: number) {
  const p = anchorOf(o, top); if (!p || !o.name) return;
  const key = keyOf(o, p), name = saved[key] ?? o.name;
  const g = el('g', { transform: `translate(${n2(p[0])},${n2(p[1] - 4)})` }, ctx.L.labels), inner = el('g', null, g);
  const text = el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-size': FS, 'font-weight': 700, 'font-style': 'italic',
    'font-family': 'Georgia, "Times New Roman", serif', fill: '#5b4630', stroke: '#fffaf0', 'stroke-width': 2.6 }, inner);
  text.textContent = name;
  labels.push({ o, key, original: o.name, x: p[0], y: p[1] - 4, inner, text });
}

/** בכל פריים: שקיפות לפי הזום, וקנה מידה הפוך כדי שהתווית תישאר באותו גודל על המסך */
export function updateLabels() {
  const k = view.cam.k;
  if (k === lastK) return;
  lastK = k;
  const L = ctx.L.labels; alpha = clamp((k / view.fitK - SHOW_FROM) / (FULL_AT - SHOW_FROM), 0, 1);
  L.setAttribute('display', alpha > 0 ? 'inline' : 'none');
  if (!alpha) return;
  L.setAttribute('opacity', alpha.toFixed(2));
  const s = PX / (FS * k);
  for (const l of labels) {
    if (l.inner instanceof VNode) l.inner.c.scale.set(s, s);
    else l.inner.setAttribute('transform', `scale(${s.toFixed(4)})`);
  }
}

/** איזו תווית נמצאת בנקודה הזאת על המסך (רק כשהתוויות נראות) */
export function pickLabel(sx: number, sy: number): Label | null {
  if (alpha < .5) return null;
  const { k, x: cx, y: cy } = view.cam;
  for (const l of labels) {
    const px = l.x * k + cx, py = l.y * k + cy, w = (l.text.textContent.length * .56 * PX) / 2 + 8;
    if (Math.abs(sx - px) < w && sy > py - PX * 1.3 && sy < py + 6) return l;
  }
  return null;
}

/* ───────── חלון שינוי שם ───────── */
let dlg: HTMLDivElement | null = null;
export function openRename(l: Label) {
  dlg?.remove();
  dlg = document.createElement('div');
  dlg.dir = 'rtl';
  dlg.style.cssText = 'position:fixed;inset-inline:16px;top:16px;margin-inline:auto;max-width:360px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;z-index:20;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.15)';
  const changed = Object.keys(saved).length;
  dlg.innerHTML = `<div style="margin-bottom:8px">שם המקום</div>
    <input dir="ltr" style="width:100%;box-sizing:border-box;font-size:16px;padding:6px 8px;border:1px solid var(--line);border-radius:8px">
    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
      <button data-a="save">שמירה</button><button data-a="reset">שם מקורי</button><button data-a="cancel">ביטול</button>
      <button data-a="copy" style="margin-inline-start:auto">העתק שינויים (${changed})</button>
    </div>
    <div data-a="note" style="margin-top:8px;font-size:12px;opacity:.75">השינוי נשמר במכשיר הזה. כדי שיופיע לכולם: "העתק שינויים" ושלח לי.</div>`;
  document.body.appendChild(dlg);
  const input = dlg.querySelector('input') as HTMLInputElement;
  input.value = l.text.textContent; input.focus(); input.select();
  const close = () => { dlg?.remove(); dlg = null; };
  const apply = (name: string) => {
    if (name && name !== l.original) saved[l.key] = name; else delete saved[l.key];
    persist(); l.text.textContent = name || l.original; close(); requestStatic();
  };
  dlg.querySelectorAll('button').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'save') apply(input.value.trim());
    else if (a === 'reset') apply('');
    else if (a === 'cancel') close();
    else if (a === 'copy') {
      const list = labels.filter(x => saved[x.key]).map(x => ({ type: x.o.type, at: [Math.round(x.x), Math.round(x.y + 4)], from: x.original, to: saved[x.key] }));
      const txt = JSON.stringify(list, null, 1);
      navigator.clipboard?.writeText(txt).then(() => { (dlg!.querySelector('[data-a=note]') as HTMLElement).textContent = 'הועתק. אפשר להדביק ולשלוח לי.'; }, () => prompt('העתק את הטקסט:', txt));
    }
  });
  input.onkeydown = e => { if (e.key === 'Enter') apply(input.value.trim()); if (e.key === 'Escape') close(); };
}
