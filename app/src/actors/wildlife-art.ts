/* חיות היער (משימה 9): ציור בסגנון השטוח של שאר המפה, מבט מהצד, פונות ימינה (השיקוף לשמאל בטרנספורם).
   קו הקרקע ב-y=0. אין שתי חיות זהות: כל ציור מקבל rng מקומי (rngAt לפי המיקום) לגוון, גודל ופרטים קטנים.
   מחזירות את החלקים שזזים (רגליים, ראש, זנב), כדי שהתנועה תוכל להזיז רק אותם. */
import { el, n2, circ, shade } from '../core/util';
import type { LocalRng } from '../core/rng';

export interface Parts { body: any; head?: any; tail?: any; legs: any[]; legBase: number[][]; size: number; c?: string; s?: number; wings?: any[]; lids?: any }
const shadow = (g: any, rx: number) => el('ellipse', { cx: 0, cy: .8, rx, ry: rx * .22, fill: 'rgba(40,70,20,.22)' }, g);
const leg = (g: any, c: string, w: number) => el('path', { stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', fill: 'none' }, g);

/** ארנבת: גוף עגול, אוזניים ארוכות, זנב פומפון לבן */
export function rabbit(g: any, v: LocalRng): Parts {
  const c = v.pick(['#b49a7c', '#a8896a', '#c4ab8c', '#9c8a78', '#d8cbb8']), s = v.rand(.9, 1.1), d = shade(c, -.2);
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 6);
  const legs = [leg(b, d, 1.8), leg(b, c, 2)];
  el('ellipse', { cx: -1, cy: -4.2, rx: 5, ry: 3.6, fill: c }, b);
  el('circle', { cx: -5.6, cy: -4.6, r: 1.7, fill: '#fffaf0' }, b);
  const head = el('g', null, b);
  el('path', { d: 'M3.2,-8.2q-.6,-5 .8,-6.4q1.2,1.6 .6,6.2zM4.8,-8q.6,-4.6 2.4,-5.4q.6,1.8 -1,5.6z', fill: c, stroke: d, 'stroke-width': .4 }, head);
  el('path', { d: 'M3.9,-9.6q0,-3 .5,-3.8M5.5,-9.4q.6,-2.6 1.4,-3.2', stroke: '#e8b7b0', 'stroke-width': .6, fill: 'none' }, head);
  el('circle', { cx: 4.6, cy: -6.4, r: 2.6, fill: c }, head);
  el('circle', { cx: 5.8, cy: -6.8, r: .55, fill: '#2b2220' }, head);
  el('circle', { cx: 7.1, cy: -6, r: .45, fill: '#d98a8a' }, head);
  return { body: b, head, legs, legBase: [[-3, -2], [2, -2]], size: 6 * s, c, s };
}

/** סנאי: זנב גדול ומסולסל, אוזניים מחודדות, צבע חלודה או אפור */
export function squirrel(g: any, v: LocalRng): Parts {
  const c = v.pick(['#b8642e', '#a95a2a', '#c27136', '#8f8a84']), s = v.rand(.9, 1.1), d = shade(c, -.22);
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 5);
  const tail = el('path', { d: 'M-3,-3q-6,-1 -6,-7q0,-5 4,-5q2.4,0 2.4,2.4q0,2 -2,2', fill: 'none', stroke: c, 'stroke-width': 3.6, 'stroke-linecap': 'round' }, b);
  const legs = [leg(b, d, 1.5), leg(b, c, 1.6)];
  el('ellipse', { cx: 0, cy: -4, rx: 3.6, ry: 2.8, fill: c }, b);
  el('ellipse', { cx: .8, cy: -3.4, rx: 2, ry: 1.6, fill: shade(c, .35) }, b);
  const head = el('g', null, b);
  el('circle', { cx: 3.6, cy: -6.6, r: 2.2, fill: c }, head);
  el('path', { d: 'M2.6,-8.2l.2,-2l1,1.4zM3.8,-8.6l.6,-1.8l.7,1.6z', fill: c }, head);
  el('circle', { cx: 4.4, cy: -7, r: .5, fill: '#2b2220' }, head);
  return { body: b, head, tail, legs, legBase: [[-2, -2], [2, -2]], size: 5 * s, c, s };
}

/** ינשוף: יושב על גדם, עיניים גדולות, גוף עגול עם נקודות */
export function owl(g: any, v: LocalRng): Parts {
  const c = v.pick(['#9a7a58', '#8a6c4c', '#b0926e', '#7d7468']), s = v.rand(.9, 1.1);
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 6);
  el('path', { d: 'M-5,0v-6q0,-1.4 1.4,-1.4h7.2q1.4,0 1.4,1.4v6z', fill: '#8a5f39' }, b);   // הגדם
  el('ellipse', { cx: 0, cy: -7.6, rx: 4.6, ry: 1.2, fill: '#c9a77d' }, b);
  const body = el('g', null, b);
  // כנפיים (מוסתרות כשהינשוף יושב): נפרשות ומנופפות במעוף
  const wings = [-1, 1].map(sd => el('path', { d: `M${sd * 3},-14q${sd * 9},-6 ${sd * 13},-1q${sd * -5},-1 ${sd * -6},3q${sd * -3},-1 ${sd * -7},1z`, fill: shade(c, -.08), stroke: shade(c, -.25), 'stroke-width': .4, opacity: 0 }, body));
  el('ellipse', { cx: 0, cy: -12.6, rx: 4.4, ry: 5.2, fill: c }, body);
  el('ellipse', { cx: 0, cy: -11.4, rx: 2.8, ry: 3.4, fill: shade(c, .3) }, body);
  el('path', { d: circ(-1.2, -11, .35) + circ(1, -10, .35) + circ(-.4, -9, .35) + circ(1.3, -12.2, .35), fill: shade(c, -.2) }, body);
  const head = el('g', null, body);
  el('path', { d: 'M-3.8,-16.6l-.8,-2.4l2,1.4zM3.8,-16.6l.8,-2.4l-2,1.4z', fill: c }, head);
  el('path', { d: circ(-1.6, -15.2, 1.5) + circ(1.6, -15.2, 1.5), fill: '#fff3c4' }, head);
  el('path', { d: circ(-1.5, -15.1, .7) + circ(1.5, -15.1, .7), fill: '#2b2220' }, head);
  el('path', { d: 'M-.5,-14l.5,1.2l.5,-1.2z', fill: '#e2a13a' }, head);
  const lids = el('path', { d: circ(-1.6, -15.2, 1.6) + circ(1.6, -15.2, 1.6), fill: c, opacity: 0 }, head);   // עפעפיים (מצמוץ)
  return { body, head, legs: [], legBase: [], size: 6 * s, c, s, wings, lids };
}

/** שועל: כתום עם חזה ושפיץ זנב לבנים, רגליים כהות */
export function fox(g: any, v: LocalRng): Parts {
  const c = v.pick(['#d9742e', '#c96a2a', '#e08442', '#b8622c']), s = v.rand(.92, 1.08), d = '#4a3326';
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 11);
  const tail = el('g', null, b);
  el('path', { d: 'M-8,-8q-7,0 -9,4q4,2 9,-1z', fill: c }, tail);
  el('path', { d: 'M-17,-4q1.4,.9 2.8,1.1q-1.5,-1.6 -2.8,-1.1z', fill: '#fffaf0' }, tail);
  const legs = [leg(b, d, 1.7), leg(b, d, 1.7), leg(b, d, 1.9), leg(b, d, 1.9)];
  el('ellipse', { cx: 0, cy: -8.6, rx: 8.8, ry: 3.6, fill: c }, b);
  el('ellipse', { cx: 2, cy: -7.2, rx: 5, ry: 1.6, fill: '#fff3e2' }, b);
  const head = el('g', null, b);
  el('path', { d: 'M7,-10l2,-6l4.6,3.4l4.4,1.6l-1.6,1.8l-5.4,1.2z', fill: c }, head);
  el('path', { d: 'M8.2,-14.6l.6,-3.6l2.2,2.6zM10.2,-14l1.2,-3.2l1.4,2.8z', fill: shade(c, -.15) }, head);
  el('path', { d: 'M12,-9.6l4.6,-1.6l1.4,-.6l-1.6,1.8z', fill: '#fff3e2' }, head);
  el('circle', { cx: 18, cy: -11.6, r: .6, fill: '#2b2220' }, head);
  el('circle', { cx: 12.4, cy: -12.8, r: .55, fill: '#2b2220' }, head);
  return { body: b, head, tail, legs, legBase: [[-6, -6.6], [-4, -6.6], [5, -6.6], [7, -6.6]], size: 11 * s, c, s };
}

/** דוב: גדול, חום כהה, גבנון בכתפיים, אוזניים עגולות. ממשיך לאט על ארבע */
export function bear(g: any, v: LocalRng): Parts {
  const c = v.pick(['#6b4a32', '#7a553a', '#5c4030', '#8a6444']), s = v.rand(.92, 1.06), d = shade(c, -.25);
  const b = el('g', { transform: `scale(${n2(s)})` }, g);
  shadow(b, 20);
  const legs = [leg(b, d, 5), leg(b, d, 5), leg(b, c, 5.4), leg(b, c, 5.4)];
  el('path', { d: 'M-17,-12q-1,-9 9,-11q10,-3 18,2q5,3 4,10q-2,6 -14,6q-15,0 -17,-7z', fill: c }, b);
  el('path', { d: 'M-12,-17q8,-5 18,-3', stroke: shade(c, .15), 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, b);
  const head = el('g', null, b);
  el('ellipse', { cx: 16, cy: -15, rx: 6, ry: 5, fill: c }, head);
  el('path', { d: circ(13.4, -19.6, 1.9) + circ(17.4, -19.8, 1.9), fill: c }, head);
  el('path', { d: circ(13.4, -19.6, .9) + circ(17.4, -19.8, .9), fill: shade(c, -.2) }, head);
  el('ellipse', { cx: 21, cy: -13.4, rx: 2.8, ry: 2.2, fill: shade(c, .3) }, head);
  el('circle', { cx: 22.8, cy: -14, r: .9, fill: '#2b2220' }, head);
  el('circle', { cx: 17.8, cy: -16.4, r: .7, fill: '#2b2220' }, head);
  return { body: b, head, legs, legBase: [[-12, -6], [-7, -6], [5, -6], [10, -6]], size: 20 * s, c, s };
}

export const WILD = { rabbit, squirrel, owl, fox, bear };
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
