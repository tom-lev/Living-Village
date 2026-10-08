/* חיות היער (משימה 9): ציור בסגנון השטוח של שאר המפה, מבט מהצד, פונות ימינה (השיקוף לשמאל בטרנספורם).
   קו הקרקע ב-y=0. אין שתי חיות זהות: כל ציור מקבל rng מקומי (rngAt לפי המיקום) לגוון, גודל ופרטים קטנים.
   מחזירות את החלקים שזזים (רגליים, ראש, זנב), כדי שהתנועה תוכל להזיז רק אותם. */
import { el, n2, circ, shade } from '../core/util';
import type { LocalRng } from '../core/rng';
import type { LegSpec, Gait } from './quad';

export interface Parts { body: any; head?: any; tail?: any; legs: any[]; legBase: number[][]; size: number; c?: string; s?: number; wings?: any[]; lids?: any; folded?: any; hop?: any; ears?: any; quad?: { specs: LegSpec[]; far: any; near: any; gait: Gait; A: number; lift: number; bodyG: any } }
const shadow = (g: any, rx: number) => el('ellipse', { cx: 0, cy: .8, rx, ry: rx * .22, fill: 'rgba(40,70,20,.22)' }, g);
const leg = (g: any, c: string, w: number) => el('path', { stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', fill: 'none' }, g);

/** ארנבת: גוף עגול שמתמתח בקפיצה, רגליים אחוריות גדולות שדוחפות, כפות קדמיות, אוזניים ארוכות שנשכבות לאחור באוויר,
 *  אף שמתנועע וזנב פומפון לבן. hop: החלקים שזזים בקפיצה (ראו hopPose ב-wildlife.ts) */
export function rabbit(g: any, v: LocalRng): Parts {
  const c = v.pick(['#b49a7c', '#a8896a', '#c4ab8c', '#9c8a78', '#d8cbb8']), s = v.rand(.9, 1.1), d = shade(c, -.2), lt = shade(c, .22);
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 6);
  const bodyG = el('g', null, b);   // מסתובב סביב הירכיים בקפיצה
  const hindFar = el('path', { fill: shade(d, -.1) }, bodyG);
  el('path', { d: 'M-6.2,-4.4C-6.2,-7.6 -3,-9 .4,-8.6C3.4,-8.2 4.6,-6 4.2,-3.6C3.6,-1.2 -1,-.9 -3.6,-1.2C-5.4,-1.5 -6.2,-2.8 -6.2,-4.4Z', fill: c }, bodyG);
  el('path', { d: 'M-4.6,-6.8C-2.6,-8.2 .6,-8.2 2.4,-7.2', fill: 'none', stroke: lt, 'stroke-width': .6, 'stroke-linecap': 'round' }, bodyG);
  el('ellipse', { cx: 1.4, cy: -2.6, rx: 2.4, ry: 1.4, fill: lt }, bodyG);   // בטן
  const tail = el('circle', { cx: -6.4, cy: -4.6, r: 1.6, fill: '#fffaf0' }, bodyG);
  const hind = el('path', { fill: c, stroke: d, 'stroke-width': .35 }, bodyG);       // ירך ורגל אחורית (משתנה בקפיצה)
  const front = el('path', { stroke: d, 'stroke-width': 1.1, 'stroke-linecap': 'round', fill: 'none' }, bodyG);
  const head = el('g', null, bodyG);
  const ears = el('g', null, head);
  el('path', { d: 'M3.2,-8.2q-.6,-5 .8,-6.4q1.2,1.6 .6,6.2zM4.8,-8q.6,-4.6 2.4,-5.4q.6,1.8 -1,5.6z', fill: c, stroke: d, 'stroke-width': .4 }, ears);
  el('path', { d: 'M3.9,-9.6q0,-3 .5,-3.8M5.5,-9.4q.6,-2.6 1.4,-3.2', stroke: '#e8b7b0', 'stroke-width': .6, fill: 'none' }, ears);
  el('path', { d: 'M2,-7.4C2.2,-9.4 4.6,-9.6 6,-8.4C7.4,-7.2 7.4,-5.4 6,-4.8C4.4,-4.2 2,-5.2 2,-7.4Z', fill: c }, head);
  el('circle', { cx: 5.3, cy: -7.4, r: .62, fill: '#2b2220' }, head);
  el('circle', { cx: 5.5, cy: -7.6, r: .2, fill: '#fff' }, head);
  const nose = el('circle', { cx: 7, cy: -5.9, r: .48, fill: '#d98a8a' }, head);
  el('path', { d: 'M6.6,-5.6l1.8,-.5M6.6,-5.4l1.9,.3', stroke: shade(c, -.35), 'stroke-width': .2 }, head);   // שפם
  return { body: b, head, legs: [], legBase: [], size: 6 * s, c, s, hop: { bodyG, hind, hindFar, front, ears, nose, tail } };
}

/** סנאי: זנב גדול ומסולסל שגולי בריצה, אוזניים מחודדות עם ציציות, וכפות קטנות שמחזיקות אגוז בישיבה */
export function squirrel(g: any, v: LocalRng): Parts {
  const c = v.pick(['#b8642e', '#a95a2a', '#c27136', '#8f8a84']), s = v.rand(.9, 1.1), d = shade(c, -.22), lt = shade(c, .4);
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 5);
  const bodyG = el('g', null, b);
  const tail = el('path', { fill: 'none', stroke: c, 'stroke-width': 3.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, bodyG);
  const tailHi = el('path', { fill: 'none', stroke: lt, 'stroke-width': .7, 'stroke-linecap': 'round', opacity: .6 }, bodyG);
  const hindFar = el('path', { fill: shade(d, -.1) }, bodyG);
  el('path', { d: 'M-3.4,-3.6C-3.6,-6 -1.2,-7.2 1,-6.8C3,-6.4 3.8,-4.6 3.2,-2.8C2.4,-1.2 -.8,-1 -2.2,-1.4C-3,-1.8 -3.4,-2.6 -3.4,-3.6Z', fill: c }, bodyG);
  el('ellipse', { cx: 1.2, cy: -3, rx: 1.7, ry: 1.3, fill: lt }, bodyG);
  const hind = el('path', { fill: c, stroke: d, 'stroke-width': .3 }, bodyG);
  const front = el('path', { stroke: d, 'stroke-width': .9, 'stroke-linecap': 'round', fill: 'none' }, bodyG);
  const nut = el('circle', { cx: 4.6, cy: -6.2, r: .75, fill: '#8a5a2c', opacity: 0 }, bodyG);
  const head = el('g', null, bodyG);
  const ears = el('g', null, head);
  el('path', { d: 'M2.6,-8.4l.1,-2.1l1,1.3zM3.8,-8.8l.6,-1.9l.6,1.6z', fill: c, stroke: d, 'stroke-width': .25 }, ears);
  el('path', { d: 'M2,-7C2,-8.6 3.6,-9.2 4.8,-8.6C5.8,-8 6,-6.8 5.2,-6C4.2,-5.2 2,-5.6 2,-7Z', fill: c }, head);
  el('circle', { cx: 4.3, cy: -7.4, r: .52, fill: '#2b2220' }, head);
  el('circle', { cx: 4.45, cy: -7.55, r: .16, fill: '#fff' }, head);
  el('path', { d: 'M3.6,-6.8q.6,.3 1,.1', fill: 'none', stroke: '#fff3e2', 'stroke-width': .5 }, head);
  const nose = el('circle', { cx: 5.6, cy: -6.5, r: .3, fill: '#3b2f2a' }, head);
  return { body: b, head, legs: [], legBase: [], size: 5 * s, c, s, hop: { bodyG, hind, hindFar, front, ears, nose, tail, tailHi, nut, head } };
}

/** צבי: גוף דק על רגליים ארוכות עם מפרקים, צוואר וראש שיורדים לרעות, אוזניים גדולות שמתנועעות, כתם לבן בעכוז
 *  וזנב לבן שמתנפנף. לזכרים יש קרניים מסועפות. הליכה בארבע פעימות */
export function deer(g: any, v: LocalRng): Parts {
  const c = v.pick(['#b5733a', '#a9692f', '#c07e44', '#9e6634']), s = v.rand(.93, 1.06), d = shade(c, -.22), lt = shade(c, .3), buck = v.chance(.4);
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 13);
  const far = el('g', null, b);
  const body = el('g', null, b);
  el('path', { d: 'M-11,-19C-11,-23 -6,-24.4 0,-24C5,-23.6 8.6,-24 10.6,-21.8C12,-19.6 10.8,-16 8,-15.4C2,-14.6 -5,-14.8 -9,-15.8C-10.4,-16.4 -11,-17.6 -11,-19Z', fill: c }, body);
  el('path', { d: 'M-8.4,-15.8C-3,-14.8 3,-14.8 7.6,-15.6C6.8,-16.6 2,-17 -3,-16.8C-6,-16.7 -7.6,-16.4 -8.4,-15.8Z', fill: lt }, body);   // בטן
  el('ellipse', { cx: -9.6, cy: -19.2, rx: 1.8, ry: 2.6, fill: '#fbf6ee' }, body);   // כתם לבן בעכוז
  el('path', { d: 'M-7,-23C-2,-24.2 4,-23.8 8,-23', fill: 'none', stroke: d, 'stroke-width': .6, opacity: .6 }, body);
  const tail = el('g', null, b);
  el('path', { d: 'M-10.6,-21.6C-12.6,-22.6 -13.4,-21 -12.4,-19.6C-11.8,-19.8 -11.2,-20.6 -10.6,-21.6Z', fill: '#fbf6ee', stroke: d, 'stroke-width': .3 }, tail);
  const near = el('g', null, b);
  // צוואר וראש: מסתובבים יחד סביב בסיס הצוואר (לרעייה)
  const head = el('g', null, b);
  el('path', { d: 'M5,-21C6,-25 7.8,-28.6 9.4,-30.8L12.8,-29.8C11.6,-27 10.6,-23.4 10.2,-19.4Z', fill: c }, head);
  el('path', { d: 'M9.4,-31.4C10.8,-33.4 13.8,-33.2 17.4,-30.6C18.8,-29.6 18.6,-28.2 17.4,-28C15,-27.8 12,-28.4 10.2,-29.2C9.2,-29.8 9,-30.6 9.4,-31.4Z', fill: c }, head);
  el('path', { d: 'M14.6,-28.2C15.8,-28 17,-28.1 17.6,-28.6', fill: 'none', stroke: lt, 'stroke-width': .7 }, head);
  const ears = el('g', null, head);
  el('path', { d: 'M10.6,-32C9.4,-34.6 7.6,-35.6 6.6,-35.2C7,-33.6 8.6,-32 10.2,-31.2ZM11.6,-32.4C11.4,-35.2 12.2,-36.8 13.2,-37C13.4,-35.4 12.8,-33.4 12.2,-32.2Z', fill: c, stroke: d, 'stroke-width': .3 }, ears);
  el('path', { d: 'M9.6,-32.2C8.8,-33.6 8,-34.2 7.6,-34.4M12.1,-33.2C12.2,-34.6 12.6,-35.6 12.9,-36', fill: 'none', stroke: '#e8c2a8', 'stroke-width': .5 }, ears);
  if (buck) el('path', { d: 'M11,-32.6C10,-36 10.4,-39 12,-41M10.6,-35.4L8.6,-37.4M11,-37.8L9.6,-40.2M12.4,-32.8C13.6,-35.8 15.6,-37.6 17,-38.2M14.4,-35.4L14.6,-38', fill: 'none', stroke: '#8a6a44', 'stroke-width': .9, 'stroke-linecap': 'round' }, head);
  el('circle', { cx: 13.4, cy: -30.8, r: .7, fill: '#1f1a17' }, head);
  el('circle', { cx: 13.6, cy: -31, r: .2, fill: '#fff' }, head);
  el('circle', { cx: 17.9, cy: -29.2, r: .55, fill: '#1f1a17' }, head);
  const specs: LegSpec[] = [
    { hip: [-8, -17.4], l1: 8.4, l2: 9.4, front: false, far: false, w: 1.9, color: c, hoof: '#3b2f2a' },
    { hip: [7.4, -17.2], l1: 8.2, l2: 9.4, front: true, far: false, w: 1.7, color: c, hoof: '#3b2f2a' },
    { hip: [-6.6, -17.6], l1: 8.4, l2: 9.4, front: false, far: true, w: 1.7, color: d, hoof: '#2b221e' },
    { hip: [8.8, -17.4], l1: 8.2, l2: 9.4, front: true, far: true, w: 1.5, color: d, hoof: '#2b221e' },
  ];
  return { body: b, head, tail, legs: [], legBase: [], size: 13 * s, c, s, ears, quad: { specs, far, near, gait: 'walk', A: 3.4, lift: 2.6, bodyG: body } };
}

/** ינשוף: יושב על גדם. גוף בצורת אגס, פני לב בהירים, עיניים כתומות גדולות, ציציות אוזניים, כנפיים מקופלות עם פסי נוצות,
 *  חזה מנוקד, טפרים על הגדם ונוצות זנב. במעוף: הכנפיים המקופלות נעלמות והכנפיים הפרושות (מעוגלות, עם שפת נוצות) מופיעות */
export function owl(g: any, v: LocalRng): Parts {
  const [c, face, mark] = v.pick([
    ['#8f6c4a', '#efdcc0', '#5e4430'],   // חום (ינשוף יער)
    ['#b58350', '#f6e6c8', '#7a5332'],   // אדמדם
    ['#8a8580', '#ece6dc', '#56524e'],   // אפור
    ['#e9e4da', '#fbf8f2', '#8a8378'],   // לבן מנוקד (ינשוף שלג)
  ]), s = v.rand(.92, 1.08), dk = shade(c, -.22), lt = shade(c, .28);
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 6);
  // הגדם: קליפה עם פסים וטבעות בחיתוך העליון
  el('path', { d: 'M-5,0v-6.2q0,-1.4 1.4,-1.4h7.2q1.4,0 1.4,1.4v6.2z', fill: '#8a5f39' }, b);
  el('path', { d: 'M-3,-.4v-5.6M.4,-.4v-6M3,-.4v-5.4', stroke: '#6e4a2c', 'stroke-width': .5 }, b);
  el('ellipse', { cx: 0, cy: -7.6, rx: 4.6, ry: 1.2, fill: '#c9a77d' }, b);
  el('ellipse', { cx: 0, cy: -7.6, rx: 2.4, ry: .6, fill: 'none', stroke: '#a8865e', 'stroke-width': .4 }, b);
  const body = el('g', null, b);
  // כנפיים פרושות (מעוף): מאחורי הגוף
  const wing = (sd: number) => {
    const P = (x: number, y: number) => `${n2(x * sd)},${n2(y)}`;
    return `M${P(2.6, -16)}C${P(7, -20.6)} ${P(14, -19.6)} ${P(16, -14.6)}Q${P(16.6, -11.6)} ${P(13.8, -11.4)}Q${P(13, -9.2)} ${P(10.8, -9.9)}Q${P(9.8, -8)} ${P(7.6, -9.1)}Q${P(5.8, -7.8)} ${P(3.2, -10.6)}Z`;
  };
  const wings = [-1, 1].map(sd => {
    const wg = el('g', { opacity: 0 }, body);
    el('path', { d: wing(sd), fill: c, stroke: dk, 'stroke-width': .4 }, wg);
    el('path', { d: `M${n2(4.6 * sd)},-15.2Q${n2(9.6 * sd)},-17.2 ${n2(14.2 * sd)},-14.6M${n2(5.4 * sd)},-12.8Q${n2(9.6 * sd)},-14 ${n2(13.4 * sd)},-12.2`, fill: 'none', stroke: mark, 'stroke-width': .5, opacity: .6 }, wg);
    return wg;
  });
  // נוצות זנב וטפרים
  el('path', { d: 'M-1.6,-8.4l-.6,1.6h1.4l.8,-1.4l.8,1.4h1.4l-.6,-1.6z', fill: dk }, body);
  el('path', { d: 'M-2.4,-7.9v.8M-1.6,-7.9v.9M1.6,-7.9v.9M2.4,-7.9v.8', stroke: '#c79a3a', 'stroke-width': .5, 'stroke-linecap': 'round' }, body);
  // הגוף: אגס, בלי צוואר
  el('path', { d: 'M0,-19.4C3.6,-19.4 5.1,-16.2 5.1,-12.8C5.1,-9.6 3,-8 0,-8C-3,-8 -5.1,-9.6 -5.1,-12.8C-5.1,-16.2 -3.6,-19.4 0,-19.4Z', fill: c, stroke: dk, 'stroke-width': .35 }, body);
  // חזה בהיר עם סימני V
  el('ellipse', { cx: 0, cy: -11, rx: 3, ry: 3.1, fill: lt }, body);
  let ch = '';
  for (const [x, y] of [[-1.3, -12.4], [1.2, -12.2], [0, -11.2], [-1.4, -10], [1.3, -9.9], [0, -9]]) ch += `M${n2(x - .5)},${n2(y)}l.5,.45l.5,-.45`;
  el('path', { d: ch, fill: 'none', stroke: mark, 'stroke-width': .4, 'stroke-linecap': 'round' }, body);
  // כנפיים מקופלות בצדדים, עם פסי נוצות
  const folded = el('g', null, body);
  for (const sd of [-1, 1]) {
    el('path', { d: `M${n2(4.9 * sd)},-14.6C${n2(5.6 * sd)},-11.4 ${n2(4.6 * sd)},-9 ${n2(2.4 * sd)},-8.2C${n2(3.3 * sd)},-10.6 ${n2(3.6 * sd)},-12.6 ${n2(3.4 * sd)},-14.8Z`, fill: dk }, folded);
    el('path', { d: `M${n2(4.1 * sd)},-13.2l${n2(.9 * sd)},.6M${n2(4.1 * sd)},-11.6l${n2(.9 * sd)},.6M${n2(3.7 * sd)},-10.1l${n2(.8 * sd)},.6`, stroke: lt, 'stroke-width': .35, 'stroke-linecap': 'round' }, folded);
  }
  // הראש (מסתובב): פני לב, גבות, ציציות אוזניים, עיניים, מקור ועפעפיים
  const head = el('g', null, body);
  el('path', { d: 'M-3.6,-18.4l-1.1,-2.6l2.4,1.5zM3.6,-18.4l1.1,-2.6l-2.4,1.5z', fill: c, stroke: dk, 'stroke-width': .3 }, head);
  el('path', { d: 'M0,-13.2C-2.6,-12.8 -4.1,-14.2 -4.1,-16C-4.1,-17.6 -2.6,-18.6 -1.3,-18.1Q0,-17.6 0,-16.8Q0,-17.6 1.3,-18.1C2.6,-18.6 4.1,-17.6 4.1,-16C4.1,-14.2 2.6,-12.8 0,-13.2Z', fill: face, stroke: shade(face, -.2), 'stroke-width': .35 }, head);
  el('path', { d: 'M-3.3,-17.4Q-1.6,-16.3 0,-16.6Q1.6,-16.3 3.3,-17.4', fill: 'none', stroke: dk, 'stroke-width': .45 }, head);
  el('path', { d: circ(-1.65, -15.5, 1.25) + circ(1.65, -15.5, 1.25), fill: '#f2a43a' }, head);
  el('path', { d: circ(-1.65, -15.5, .62) + circ(1.65, -15.5, .62), fill: '#1f1a17' }, head);
  el('path', { d: circ(-1.35, -15.85, .22) + circ(1.95, -15.85, .22), fill: '#fff' }, head);
  el('path', { d: 'M-.55,-14.6l.55,1.3l.55,-1.3z', fill: '#c99232' }, head);
  const lids = el('path', { d: circ(-1.65, -15.5, 1.35) + circ(1.65, -15.5, 1.35), fill: face, opacity: 0 }, head);   // מצמוץ
  return { body, head, legs: [], legBase: [], size: 6 * s, c, s, wings, lids, folded };
}

/** שועל: גוף כתום ארוך, חזה ולסת לבנים, גרביים כהות, זנב עבות עם קצה לבן. רגליים עם מפרקים (טרוט) */
export function fox(g: any, v: LocalRng): Parts {
  const c = v.pick(['#d9742e', '#c96a2a', '#e08442', '#b8622c']), s = v.rand(.92, 1.08), sock = '#4a3326';
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 11);
  const far = el('g', null, b);
  const tail = el('g', null, b);
  el('path', { d: 'M-8.4,-9.4C-12,-10.6 -16,-9.4 -18,-6.2C-14.8,-5.4 -11,-5.8 -7.6,-7.4Z', fill: c }, tail);
  el('path', { d: 'M-18,-6.2C-17.4,-7.4 -16.2,-8.2 -15,-8.4C-15.4,-7.2 -15.4,-6 -14.6,-5.4C-15.8,-5.4 -17,-5.6 -18,-6.2Z', fill: '#fffaf0' }, tail);
  const body = el('g', null, b);
  el('path', { d: 'M-9,-8.6C-9,-11 -6,-12 0,-11.8C5,-11.6 8.4,-11.2 9.6,-9.2C10.4,-7.6 9,-6 6.6,-5.8C2,-5.4 -4,-5.4 -7,-6C-8.4,-6.4 -9,-7.4 -9,-8.6Z', fill: c }, body);
  el('path', { d: 'M3,-6.2C5.6,-6 8.4,-6.6 9.4,-8.4C9.8,-7 9,-5.8 6.6,-5.6C5,-5.4 3.6,-5.6 3,-6.2Z', fill: '#fff3e2' }, body);   // חזה
  el('path', { d: 'M-6,-11C-2,-12 3,-11.8 6.6,-11', fill: 'none', stroke: shade(c, .18), 'stroke-width': .7, 'stroke-linecap': 'round' }, body);
  const near = el('g', null, b);
  const head = el('g', null, b);
  el('path', { d: 'M7.6,-10.8C8.4,-14 11,-15.6 13.6,-14.8L17.6,-12.6C18.6,-12 18.4,-11 17.4,-10.8L12.6,-10C10.6,-9.6 8.2,-9.4 7.6,-10.8Z', fill: c }, head);
  el('path', { d: 'M12.2,-10.1L17.4,-10.8C17,-10 15.6,-9.6 13.6,-9.4Z', fill: '#fff3e2' }, head);
  el('path', { d: 'M9.4,-14l.4,-3.8l2.2,2.6zM11.6,-14.8l1.2,-3.4l1.3,2.9z', fill: c, stroke: sock, 'stroke-width': .35 }, head);
  el('circle', { cx: 17.9, cy: -11.8, r: .62, fill: '#1f1a17' }, head);
  el('circle', { cx: 13.4, cy: -12.6, r: .55, fill: '#1f1a17' }, head);
  el('circle', { cx: 13.55, cy: -12.75, r: .17, fill: '#fff' }, head);
  const specs: LegSpec[] = [
    { hip: [-5.8, -7.6], l1: 4.1, l2: 4, front: false, far: false, w: 1.7, color: c, hoof: sock },
    { hip: [6, -7.8], l1: 4.1, l2: 4, front: true, far: false, w: 1.6, color: c, hoof: sock },
    // הרגליים הרחוקות: כהות בבירור ומוזזות מעט מהקרובות, כדי שרואים ארבע רגליים
    { hip: [-3.6, -7.9], l1: 4.1, l2: 4, front: false, far: true, w: 1.6, color: '#7a3f1c', hoof: '#2e2018' },
    { hip: [8.2, -8.1], l1: 4.1, l2: 4, front: true, far: true, w: 1.5, color: '#7a3f1c', hoof: '#2e2018' },
  ];
  return { body: b, head, tail, legs: [], legBase: [], size: 11 * s, c, s, quad: { specs, far, near, gait: 'walk', A: 2.3, lift: 2, bodyG: body } };
}

/** דוב: גדול, חום, גבנון בכתפיים, ראש נמוך עם אוזניים עגולות. הליכה איטית בארבע פעימות, הכתפיים מתגלגלות */
export function bear(g: any, v: LocalRng): Parts {
  const c = v.pick(['#6b4a32', '#7a553a', '#5c4030', '#8a6444']), s = v.rand(.92, 1.06), d = shade(c, -.25), lt = shade(c, .15);
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 20);
  const far = el('g', null, b);
  const body = el('g', null, b);
  el('path', { d: 'M-17,-13C-18,-20 -12,-23 -4,-23C1,-23.4 5,-25.6 9,-24.4C13,-23.2 14.4,-19 13.6,-15C12.6,-10.4 6,-9.4 -2,-9.4C-10,-9.4 -16.4,-9.4 -17,-13Z', fill: c }, body);
  el('path', { d: 'M-12,-20.4C-6,-22.6 2,-22.2 8,-23.4', fill: 'none', stroke: lt, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: .8 }, body);
  el('path', { d: 'M-14,-11.4C-8,-10 2,-10.2 10,-11.2', fill: 'none', stroke: d, 'stroke-width': 1, 'stroke-linecap': 'round', opacity: .7 }, body);
  el('circle', { cx: -16.6, cy: -15.6, r: 1.4, fill: d }, body);   // זנב קטן
  const near = el('g', null, b);
  const head = el('g', null, b);
  el('path', { d: 'M10,-19C10.4,-23 14.6,-24.4 18,-22.6C20.4,-21.4 21.4,-19.4 23.6,-18.6C25,-18 24.8,-15.6 23,-15.2C19.4,-14.4 14.6,-14 12,-15C10.6,-15.6 9.8,-17 10,-19Z', fill: c }, head);
  el('path', { d: 'M20.6,-18.8C22.4,-18.4 24.6,-18.2 24.2,-16.2C23.6,-15.2 21.4,-15.2 20.4,-15.8Z', fill: shade(c, .3) }, head);   // לוע
  el('path', { d: circ(12.6, -23, 1.9) + circ(16, -24.2, 1.8), fill: c }, head);
  el('path', { d: circ(12.6, -23, .9) + circ(16, -24.2, .85), fill: d }, head);
  el('circle', { cx: 24.3, cy: -17.2, r: .95, fill: '#1f1a17' }, head);
  el('circle', { cx: 18.4, cy: -19.6, r: .7, fill: '#1f1a17' }, head);
  el('circle', { cx: 18.6, cy: -19.8, r: .2, fill: '#fff' }, head);
  const specs: LegSpec[] = [
    { hip: [-11, -11.4], l1: 6, l2: 5.8, front: false, far: false, w: 5.2, color: c, hoof: d },
    { hip: [6.4, -12], l1: 6.2, l2: 6, front: true, far: false, w: 5, color: c, hoof: d },
    { hip: [-8.6, -11.6], l1: 6, l2: 5.8, front: false, far: true, w: 4.6, color: d, hoof: shade(d, -.2) },
    { hip: [9, -12.2], l1: 6.2, l2: 6, front: true, far: true, w: 4.4, color: d, hoof: shade(d, -.2) },
  ];
  return { body: b, head, legs: [], legBase: [], size: 20 * s, c, s, quad: { specs, far, near, gait: 'walk', A: 3.2, lift: 2.4, bodyG: body } };
}

export const WILD = { rabbit, squirrel, owl, fox, bear, deer };
export type WildKind = keyof typeof WILD;

/** רגל בעמידה או בצעד: מנקודת הבסיס אל הקרקע, עם תנודה קטנה לפי השלב */
export function setLeg(p: any, base: number[], phase: number, amp: number, stride: number) {
  const q = phase * Math.PI * 2, fx = base[0] + Math.sin(q) * stride * amp, fy = -Math.max(0, Math.cos(q)) * stride * .6 * amp;
  p.setAttribute('d', `M${n2(base[0])},${n2(base[1])}L${n2(fx)},${n2(fy)}`);
}

/** מבט מלפנים (front=true, החיה הולכת אל הצופה) או מאחור. אותו צבע וגודל כמו מבט הצד.
 *  מחזיר את הקבוצה ואת הרגליים (מתרוממות לסירוגין בהליכה) עם נקודות הבסיס שלהן */
export function frontBack(kind: WildKind, g: any, c: string, s: number, front: boolean) {
  const b = el('g', { transform: `scale(${n2(s)})` }, g), d = shade(c, -.22), light = shade(c, .3), eye = '#2b2220';
  const legs: any[] = [], base: number[][] = [];
  const L = (x: number, top: number, col: string, w: number) => { legs.push(leg(b, col, w)); base.push([x, top]); };
  if (kind === 'rabbit') {
    shadow(b, 4.5);
    L(-1.8, -2, d, 1.8); L(1.8, -2, d, 1.8);
    el('ellipse', { cx: 0, cy: -4.4, rx: 3.8, ry: 3.6, fill: c }, b);
    if (!front) el('circle', { cx: 0, cy: -2.8, r: 1.6, fill: '#fffaf0' }, b);
    el('path', { d: 'M-2.2,-9.6q-1.4,-5 0,-6.6q1.6,1.6 1,6.4zM2.2,-9.6q1.4,-5 0,-6.6q-1.6,1.6 -1,6.4z', fill: c, stroke: d, 'stroke-width': .4 }, b);
    if (front) el('path', { d: 'M-1.7,-10.6q-.6,-3.4 .2,-4.4M1.7,-10.6q.6,-3.4 -.2,-4.4', stroke: '#e8b7b0', 'stroke-width': .6, fill: 'none' }, b);
    el('circle', { cx: 0, cy: -8.4, r: 2.8, fill: c }, b);
    if (front) { el('path', { d: circ(-1.1, -8.9, .5) + circ(1.1, -8.9, .5), fill: eye }, b); el('circle', { cx: 0, cy: -7.6, r: .45, fill: '#d98a8a' }, b); el('ellipse', { cx: 0, cy: -5, rx: 2, ry: 1.8, fill: shade(c, .25) }, b); }
  } else if (kind === 'squirrel') {
    shadow(b, 4);
    if (front) el('path', { d: 'M2,-3q6,-1 5,-7q-1,-4 -3.4,-3', fill: 'none', stroke: c, 'stroke-width': 3.4, 'stroke-linecap': 'round' }, b);
    L(-1.4, -2, d, 1.5); L(1.4, -2, d, 1.5);
    el('ellipse', { cx: 0, cy: -4.2, rx: 2.8, ry: 3.2, fill: c }, b);
    if (front) el('ellipse', { cx: 0, cy: -3.8, rx: 1.6, ry: 2.2, fill: light }, b);
    el('circle', { cx: 0, cy: -8, r: 2.3, fill: c }, b);
    el('path', { d: 'M-2,-9.4l-.4,-2.2l1.4,1.2zM2,-9.4l.4,-2.2l-1.4,1.2z', fill: c }, b);
    if (front) el('path', { d: circ(-.9, -8.3, .45) + circ(.9, -8.3, .45) + circ(0, -7.3, .35), fill: eye }, b);
    else el('path', { d: 'M0,-2q-5,-2 -4,-8q1,-4 4,-3', fill: 'none', stroke: c, 'stroke-width': 3.6, 'stroke-linecap': 'round' }, b);   // הזנב מכסה את הגב
  } else if (kind === 'fox') {
    shadow(b, 6);
    if (!front) { el('path', { d: 'M0,-7q2,4 1,7', stroke: c, 'stroke-width': 3.6, 'stroke-linecap': 'round', fill: 'none' }, b); el('circle', { cx: 1, cy: -.4, r: 1.6, fill: '#fffaf0' }, b); }
    L(-2.2, -6, '#4a3326', 1.8); L(2.2, -6, '#4a3326', 1.8);
    el('ellipse', { cx: 0, cy: -8.6, rx: 4.6, ry: 4.2, fill: c }, b);
    if (front) el('ellipse', { cx: 0, cy: -8, rx: 2.4, ry: 3.2, fill: '#fff3e2' }, b);
    el('path', { d: 'M-3.6,-12.6l-1,-4.8l3,2.6zM3.6,-12.6l1,-4.8l-3,2.6z', fill: shade(c, -.1) }, b);
    el('path', { d: 'M-4,-14q0,-3 4,-3t4,3q0,2 -4,4.6q-4,-2.6 -4,-4.6z', fill: c }, b);
    if (front) { el('path', { d: 'M-2.4,-12.8q2.4,1.4 4.8,0l-2.4,3.4z', fill: '#fff3e2' }, b); el('path', { d: circ(-1.5, -14.6, .5) + circ(1.5, -14.6, .5) + circ(0, -10.2, .55), fill: eye }, b); }
  } else if (kind === 'deer') {
    shadow(b, 7);
    L(-3, -14, d, 1.6); L(3, -14, d, 1.6); L(-1.8, -14, c, 1.8); L(1.8, -14, c, 1.8);
    el('ellipse', { cx: 0, cy: -17, rx: 6, ry: 4.6, fill: c }, b);
    if (!front) { el('ellipse', { cx: 0, cy: -17.4, rx: 3.2, ry: 3, fill: '#fbf6ee' }, b); el('path', { d: 'M-.8,-20.6h1.6v2.6h-1.6z', fill: '#fbf6ee' }, b); }
    el('path', { d: 'M-1.8,-20C-1.6,-24 -1.2,-27 0,-28.4C1.2,-27 1.6,-24 1.8,-20Z', fill: c }, b);
    el('path', { d: 'M-2.6,-31C-6,-31.4 -7,-33.6 -6.6,-34.4C-5,-34.2 -3.4,-33 -2.2,-31.8ZM2.6,-31C6,-31.4 7,-33.6 6.6,-34.4C5,-34.2 3.4,-33 2.2,-31.8Z', fill: c, stroke: d, 'stroke-width': .3 }, b);
    el('path', { d: 'M-2.4,-32C-2.4,-34 2.4,-34 2.4,-32C2.4,-29.6 1,-27 0,-26.4C-1,-27 -2.4,-29.6 -2.4,-32Z', fill: c }, b);
    if (front) { el('path', { d: circ(-1.2, -31.2, .55) + circ(1.2, -31.2, .55) + circ(0, -27, .6), fill: eye }, b); el('path', { d: 'M-1,-28.6Q0,-28 1,-28.6', fill: 'none', stroke: light, 'stroke-width': .6 }, b); }
  } else {   // bear
    shadow(b, 12);
    L(-5, -7, d, 5); L(5, -7, d, 5);
    el('ellipse', { cx: 0, cy: -11, rx: 10.5, ry: 9, fill: c }, b);
    if (!front) el('circle', { cx: 0, cy: -5.2, r: 1.8, fill: shade(c, -.1) }, b);
    el('path', { d: circ(-4.4, -24.4, 2) + circ(4.4, -24.4, 2), fill: c }, b);
    el('circle', { cx: 0, cy: -19.6, r: 6, fill: c }, b);
    if (front) {
      el('path', { d: circ(-4.4, -24.4, 1) + circ(4.4, -24.4, 1), fill: shade(c, -.2) }, b);
      el('ellipse', { cx: 0, cy: -17.6, rx: 2.8, ry: 2.2, fill: light }, b);
      el('path', { d: circ(-2.2, -21, .8) + circ(2.2, -21, .8) + circ(0, -18.4, .9), fill: eye }, b);
    }
  }
  return { g: b, legs, base };
}
