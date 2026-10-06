/* שמות של אובייקטים, כמו על מפה מאוירת: כתב סריף נטוי בגוון חום עם הילה בהירה, ממש מעל האובייקט,
   ורק בזום קרוב (מ-×4.5 בערך). התווית נשארת באותו גודל על המסך בכל זום.
   השם בא מהשדה name ב-world.json, ושינויים מהדפדפן נשמרים ב-names.json המשותף (namesStore.ts).
   לחיצה על תווית פותחת חלון לשינוי השם, אבל רק במכשיר שיש בו מפתח GitHub (או בכתובת עם ?edit, כדי להזין אותו). */
import { el, n2, clamp } from '../core/util';
import { ctx } from './context';
import { view } from '../camera/view';
import { VNode } from '../render/vnode';
import { requestStatic } from '../render/tiles';
import { loadNames, saveName, getToken, setToken } from './namesStore';

const FS = 10, PX = 26;                 // גודל הגופן ביחידות עולם, והגודל הרצוי על המסך בפיקסלים
const SHOW_FROM = 4.2, FULL_AT = 5;     // יחס לזום הבית: מתחילים להופיע, ונראים במלואם
/* סוגים שבהם x,y הוא הפינה השמאלית העליונה של מלבן (ולא המרכז או קו הקרקע) */
const TOP_LEFT = new Set(['vegGarden', 'field', 'footballPitch', 'pier']);
const PENDING = 'village-names-pending';   // שינויים שנשמרו אבל עוד לא הגיעו לאתר שנפרס

interface Label { o: any; key: string; original: string; x: number; y: number; inner: any; text: any }
const labels: Label[] = [];
let lastK = -1, alpha = 0;

let pending: Record<string, string> = {};
try { pending = JSON.parse(localStorage.getItem(PENDING) || '{}'); } catch {}
const persist = () => { try { localStorage.setItem(PENDING, JSON.stringify(pending)); } catch {} };
const canEdit = () => !!getToken() || new URLSearchParams(location.search).has('edit');

/** מרכז אופקי ונקודה עליונה של האובייקט. top: הקצה העליון של מה שצויר (מחושב בבנייה), אם יש */
function anchorOf(o: any, top?: number): number[] | null {
  if (o.labelAt) return o.labelAt;
  let x: number, y: number;
  if (TOP_LEFT.has(o.type)) { x = o.x + (o.w ?? 0) / 2; y = o.y; }
  else if (o.cx !== undefined) { x = o.cx; y = o.cy - (o.ry ?? o.r ?? 0); }
  else if (o.x0 !== undefined) { x = (o.x0 + o.x1) / 2; y = o.y0; }
  else if (o.a && o.b) { x = (o.a[0] + o.b[0]) / 2; y = Math.min(o.a[1], o.b[1]); }
  else if (o.x !== undefined) { x = o.x; y = o.y - 30; }
  else return null;
  return [x, top ?? y];
}

export function addLabel(o: any, top?: number) {
  const p = anchorOf(o, top); if (!p || !o.name) return;
  const key = o.name, name = pending[key] || o.name;   // המפתח: השם המקורי (ייחודי ויציב)
  const g = el('g', { transform: `translate(${n2(p[0])},${n2(p[1] - 2)})` }, ctx.L.labels), inner = el('g', null, g);
  const text = el('text', { x: 0, y: 0, 'text-anchor': 'middle', 'font-size': FS, 'font-weight': 700, 'font-style': 'italic',
    'font-family': 'Georgia, "Times New Roman", serif', fill: '#5b4630', stroke: '#fffaf0', 'stroke-width': 3 }, inner);
  text.textContent = name;
  labels.push({ o, key, original: o.name, x: p[0], y: p[1] - 2, inner, text });
}

/** השמות המשותפים: נטענים פעם אחת בכניסה. שינוי מקומי שכבר הגיע לאתר נמחק מהרשימה המקומית */
export async function applySharedNames() {
  const remote = await loadNames();
  for (const k of Object.keys(pending)) if ((remote[k] ?? '') === pending[k]) delete pending[k];
  persist();
  for (const l of labels) {
    const n = l.key in pending ? pending[l.key] : remote[l.key];
    if (n !== undefined) l.text.textContent = n || l.original;
  }
  requestStatic();
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

/** איזו תווית נמצאת בנקודה הזאת על המסך (רק כשהתוויות נראות, ורק במכשיר שמותר בו לערוך) */
export function pickLabel(sx: number, sy: number): Label | null {
  if (alpha < .5 || !canEdit()) return null;
  const { k, x: cx, y: cy } = view.cam;
  for (const l of labels) {
    const px = l.x * k + cx, py = l.y * k + cy, w = (l.text.textContent.length * .56 * PX) / 2 + 8;
    if (Math.abs(sx - px) < w && sy > py - PX * 1.3 && sy < py + 6) return l;
  }
  return null;
}

/* ───────── חלון שינוי שם ───────── */
let dlg: HTMLDivElement | null = null;
const BOX = 'position:fixed;inset-inline:16px;top:16px;margin-inline:auto;max-width:380px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px;z-index:20;font-size:14px;box-shadow:0 6px 24px rgba(0,0,0,.15)';
const FIELD = 'width:100%;box-sizing:border-box;font-size:16px;padding:6px 8px;border:1px solid var(--line);border-radius:8px';

export function openRename(l: Label) {
  dlg?.remove();
  dlg = document.createElement('div'); dlg.dir = 'rtl'; dlg.style.cssText = BOX;
  document.body.appendChild(dlg);
  const close = () => { dlg?.remove(); dlg = null; };
  if (!getToken()) {
    // פעם ראשונה במכשיר הזה: מדביקים את מפתח GitHub
    dlg.innerHTML = `<div style="margin-bottom:8px">כדי לשנות שמות, הדבק את מפתח GitHub (פעם אחת במכשיר הזה):</div>
      <input dir="ltr" type="password" placeholder="github_pat_..." style="${FIELD}">
      <div style="display:flex;gap:6px;margin-top:10px"><button data-a="ok">שמירת המפתח</button><button data-a="cancel">ביטול</button></div>
      <div style="margin-top:8px;font-size:12px;opacity:.75">המפתח נשמר רק במכשיר הזה, ונשלח רק ל-GitHub.</div>`;
    const input = dlg.querySelector('input') as HTMLInputElement; input.focus();
    const ok = () => { const t = input.value.trim(); if (!t) return; setToken(t); close(); openRename(l); };
    (dlg.querySelector('[data-a=ok]') as HTMLButtonElement).onclick = ok;
    (dlg.querySelector('[data-a=cancel]') as HTMLButtonElement).onclick = close;
    input.onkeydown = e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') close(); };
    return;
  }
  dlg.innerHTML = `<div style="margin-bottom:8px">שם המקום</div>
    <input dir="ltr" style="${FIELD}">
    <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap">
      <button data-a="save">שמירה</button><button data-a="reset">שם מקורי</button><button data-a="cancel">ביטול</button>
      <button data-a="key" style="margin-inline-start:auto;font-size:12px">החלפת מפתח</button>
    </div>
    <div data-a="note" style="margin-top:8px;font-size:12px;opacity:.75">השם החדש יופיע אצל כולם תוך דקה-שתיים.</div>`;
  const input = dlg.querySelector('input') as HTMLInputElement, note = dlg.querySelector('[data-a=note]') as HTMLElement;
  input.value = l.text.textContent; input.focus(); input.select();
  const apply = async (name: string) => {
    const value = name && name !== l.original ? name : '';
    note.textContent = 'שומר…';
    try {
      await saveName(l.key, value);
      pending[l.key] = value; persist();
      l.text.textContent = value || l.original; requestStatic();
      note.textContent = 'נשמר. אצל כולם השם יתעדכן תוך דקה-שתיים.';
      setTimeout(close, 1400);
    } catch (e: any) {
      note.textContent = e?.message || 'השמירה נכשלה';
      if (/מפתח/.test(note.textContent || '')) setToken('');
    }
  };
  dlg.querySelectorAll('button').forEach(b => b.onclick = () => {
    const a = (b as HTMLButtonElement).dataset.a;
    if (a === 'save') apply(input.value.trim());
    else if (a === 'reset') apply('');
    else if (a === 'cancel') close();
    else if (a === 'key') { setToken(''); close(); openRename(l); }
  });
  input.onkeydown = e => { if (e.key === 'Enter') apply(input.value.trim()); if (e.key === 'Escape') close(); };
}
