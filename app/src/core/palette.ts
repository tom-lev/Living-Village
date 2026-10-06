/* פלטת צבעים: כל צבע בעולם עובר כאן לפני שהוא מצויר.
   קודם החלפות מדויקות (map), ואחר כך תיקון כללי: הורדת רוויה, ריכוך ניגודיות וגוון חם.
   ההגדרות מגיעות מ-world.json (palette), כך שאפשר לשנות אווירה בלי לגעת בקוד. */
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

export interface PaletteSpec {
  name?: string;
  base?: string;           // פלטה שעליה נשענים (מעבדים קודם אותה)
  saturation?: number;   // מכפיל רוויה (1 = בלי שינוי)
  contrast?: number;     // דחיסת בהירות סביב האמצע (1 = בלי שינוי)
  lift?: number;         // הבהרה כללית
  tint?: string;         // גוון לערבוב
  tintAmount?: number;   // כמה מהגוון לערבב
  map?: Record<string, string>;
  blackPoint?: number;      // הבהרת השחורים (0-255): הכהה ביותר הופך לאפור רך
  highlightTint?: string;   // גוון לטונים הבהירים (פילם: זהוב)
  shadowTint?: string;      // גוון לטונים הכהים (פילם: ירקרק-כחלחל)
  splitAmount?: number;     // עוצמת הגוונים
  grain?: number;           // גרעון פילם מעל המפה (0 = בלי)
}

const DEFAULTS: Required<PaletteSpec> = { name: '', base: '', saturation: 1, contrast: 1, lift: 0, tint: '#ffffff', tintAmount: 0, map: {},
  blackPoint: 0, highlightTint: '#ffffff', shadowTint: '#000000', splitAmount: 0, grain: 0 };
/** שלב עיבוד אחד: הגדרות מלאות + גוונים מפוענחים */
interface Stage { sp: Required<PaletteSpec>; tint: number[]; hi: number[]; sh: number[] }
let stages: Stage[] = [];      // מהבסיס ועד הפלטה הנבחרת
let spec = DEFAULTS;           // הפלטה הנבחרת (לגרעון ולתצוגה)
const cache = new Map<string, string>();

function stage(p: PaletteSpec): Stage {
  const sp = { ...DEFAULTS, ...p, map: {} as Record<string, string> };
  for (const [k, v] of Object.entries(p.map || {})) sp.map[k.toLowerCase()] = v;
  const rgb = (c: string, d: number[]) => parseColor(c)?.slice(0, 3) || d;
  return { sp, tint: rgb(sp.tint, [255, 255, 255]), hi: rgb(sp.highlightTint, [255, 255, 255]), sh: rgb(sp.shadowTint, [0, 0, 0]) };
}

/** בוחר פלטה. palette יכולה להישען על פלטה אחרת (base): קודם הבסיס, אחר כך היא */
export function setPalette(p: PaletteSpec | undefined, all: PaletteSpec[] = []) {
  stages = [];
  for (let q = p, n = 0; q && n < 5; q = all.find(x => x.name === q.base), n++) stages.unshift(stage(q));
  spec = stages.length ? stages[stages.length - 1].sp : DEFAULTS;
  cache.clear();
}

function parseColor(c: string): number[] | null {
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h.replace(/./g, x => x + x);
    if (h.length !== 6) return null;
    const n = parseInt(h, 16);
    return [n >> 16, (n >> 8) & 255, n & 255, 1];
  }
  const m = /^rgba?\(([^)]+)\)$/.exec(c);
  if (!m) return null;
  const v = m[1].split(',').map(Number);
  return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1];
}

function rgb2hsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hsl2rgb(h: number, s: number, l: number) {
  if (!s) return [l, l, l].map(v => v * 255);
  const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map(v => v * 255);
}

const hex = (c: number[]) => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

function applyStage(st: Stage, c: string): string {
  const { sp } = st, key = c.toLowerCase().replace(/\s+/g, '');
  if (sp.map[key]) return sp.map[key];
  const p = parseColor(key);
  if (!p) return c;
  const [h, s, l] = rgb2hsl(p[0], p[1], p[2]);
  const l2 = clamp(.5 + (l - .5) * sp.contrast + sp.lift, 0, 1);
  const t = sp.tintAmount, sa = sp.splitAmount, bp = sp.blackPoint;
  // גוון בהירים / כהים לפי הבהירות (split toning), ואז נקודת שחור מורמת
  const wHi = sa * clamp((l2 - .45) / .55, 0, 1) ** 1.5, wSh = sa * clamp((.6 - l2) / .6, 0, 1) ** 1.2;
  const rgb = hsl2rgb(h, s * sp.saturation, l2).map((v, i) => {
    v = v * (1 - t) + st.tint[i] * t;
    v = v * (1 - wHi) + st.hi[i] * wHi; v = v * (1 - wSh) + st.sh[i] * wSh;
    return bp + v * (1 - bp / 255);
  });
  return p[3] < 1 ? `rgba(${rgb.map(Math.round).join(',')},${p[3]})` : hex(rgb);
}

/** מחזיר את הצבע אחרי הפלטה. ערכים שאינם צבע (none, url(...)) עוברים כמו שהם */
export function grade(c: string): string {
  if (typeof c !== 'string') return c;
  const hit = cache.get(c);
  if (hit) return hit;
  let out = c;
  for (const st of stages) out = applyStage(st, out);
  cache.set(c, out);
  return out;
}

export const COLOR_ATTRS = new Set(['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color']);

/* הצבע המקורי של כל אלמנט נשמר, כדי שאפשר יהיה להחליף פלטה בלי לבנות את העולם מחדש */
const raw = new WeakMap<Element, Record<string, string>>();
export function rememberColor(e: Element, k: string, v: string) {
  const r = raw.get(e); if (r) r[k] = v; else raw.set(e, { [k]: v });
}
export const rawColor = (e: Element, k: string) => raw.get(e)?.[k];
/** צובע מחדש את כל האלמנטים תחת root לפי הפלטה הנוכחית */
export function regrade(root: Element) {
  for (const e of root.querySelectorAll('*')) { const r = raw.get(e); if (r) for (const k in r) e.setAttribute(k, grade(r[k])); }
}

export const currentPalette = () => spec;
