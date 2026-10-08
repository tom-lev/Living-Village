/* רכבות קיטור (משימה 10): חמישה סוגי קטרים, כל אחד עם קרונות בצבעים שמתאימים לו.
   מבט מהצד, הקטר פונה ימינה, קו הפסים ב-y=0. מחזירות את הגלגלים (מסתובבים בנסיעה) ואת פי הארובה (משם יוצא העשן). */
import { el, n2, circ, shade } from '../core/util';

export interface Wheel { g: any; x: number; r: number }
export interface TrainParts { wheels: Wheel[]; chimney: number[]; length: number }
export const LOCOS = ['american', 'tank', 'redStar', 'express', 'forest'] as const;
export type Loco = typeof LOCOS[number];

const wheel = (g: any, x: number, r: number, c: string, out: any[]) => {
  const w = el('g', { transform: `translate(${n2(x)},${n2(-r)})` }, g);
  el('circle', { cx: 0, cy: 0, r, fill: c, stroke: shade(c, -.35), 'stroke-width': .8 }, w);
  el('path', { d: `M${-r * .75},0h${r * 1.5}M0,${-r * .75}v${r * 1.5}`, stroke: shade(c, .35), 'stroke-width': .7 }, w);
  el('circle', { cx: 0, cy: 0, r: r * .22, fill: shade(c, .3) }, w);
  out.push({ g: w, x, r });   // הגלגל מסתובב בנסיעה: translate(x,-r) rotate(...)
};

/** קטר. x0: הקצה האחורי שלו. מחזיר את אורכו */
export function loco(g: any, kind: Loco, x0 = 0): TrainParts {
  const W: any[] = [], G = el('g', { transform: `translate(${n2(x0)},0)` }, g);
  const sh = (len: number) => el('ellipse', { cx: len / 2, cy: 1, rx: len / 2 + 4, ry: 2.4, fill: 'rgba(40,40,30,.22)' }, G);
  if (kind === 'american') {
    const body = '#2f2f36', trim = '#c23a2e', brass = '#d8a943';
    sh(70);
    el('rect', { x: 0, y: -30, width: 20, height: 22, rx: 2, fill: trim, stroke: shade(trim, -.3), 'stroke-width': .8 }, G);          // קבינה
    el('rect', { x: 3, y: -26, width: 14, height: 8, rx: 1.5, fill: '#f7e6b8' }, G);
    el('rect', { x: -2, y: -33, width: 24, height: 4, rx: 1.5, fill: body }, G);
    el('rect', { x: 20, y: -22, width: 40, height: 14, rx: 6, fill: body }, G);                                                       // הדוד
    el('path', { d: 'M26,-22v14M36,-22v14M46,-22v14', stroke: brass, 'stroke-width': 1 }, G);
    el('path', { d: 'M50,-22l-2,-8h-3l6,-6h8l-3,6h-3l-1,8z', fill: body }, G);                                                       // ארובת משפך
    el('rect', { x: 36, y: -27, width: 6, height: 5, rx: 2, fill: brass }, G);                                                       // כיפת הקיטור
    el('path', { d: 'M60,-8l10,8h-14z', fill: trim }, G);                                                                             // מגן פרות
    el('circle', { cx: 60, cy: -18, r: 2.4, fill: '#fff3c4', stroke: brass, 'stroke-width': .8 }, G);
    wheel(G, 10, 6, trim, W); wheel(G, 28, 7, trim, W); wheel(G, 44, 7, trim, W); wheel(G, 57, 3.6, trim, W);
    el('path', { d: 'M28,-7h16', stroke: '#9aa0a6', 'stroke-width': 1.6 }, G);
    return { wheels: W, chimney: [x0 + 52, -36], length: 70 };
  }
  if (kind === 'tank') {
    const body = '#3f7d4f', trim = '#2b2b30', brass = '#d8a943';
    sh(52);
    el('rect', { x: 0, y: -28, width: 16, height: 20, rx: 2, fill: body }, G);
    el('rect', { x: 3, y: -25, width: 10, height: 7, rx: 1.5, fill: '#f7e6b8' }, G);
    el('path', { d: 'M-1,-28q9,-6 18,0z', fill: trim }, G);
    el('rect', { x: 16, y: -20, width: 32, height: 12, rx: 5, fill: body }, G);
    el('rect', { x: 18, y: -21, width: 22, height: 11, rx: 2, fill: shade(body, .1), stroke: shade(body, -.25), 'stroke-width': .6 }, G);   // מיכל המים בצד
    el('rect', { x: 40, y: -30, width: 5, height: 10, fill: trim }, G);
    el('rect', { x: 38.6, y: -32, width: 7.8, height: 2.4, rx: 1, fill: brass }, G);
    el('rect', { x: 47, y: -14, width: 4, height: 4, fill: '#c23a2e' }, G);
    wheel(G, 12, 5.5, trim, W); wheel(G, 25, 5.5, trim, W); wheel(G, 38, 5.5, trim, W);
    return { wheels: W, chimney: [x0 + 42.5, -33], length: 52 };
  }
  if (kind === 'redStar') {
    const body = '#b8392f', trim = '#2b2b30', brass = '#e2b84f';
    sh(66);
    el('rect', { x: 0, y: -31, width: 18, height: 23, rx: 2, fill: body }, G);
    el('rect', { x: 3, y: -27, width: 12, height: 8, rx: 4, fill: '#f7e6b8' }, G);
    el('rect', { x: -2, y: -34, width: 22, height: 4, rx: 2, fill: trim }, G);
    el('rect', { x: 18, y: -23, width: 42, height: 15, rx: 7, fill: body }, G);
    el('path', { d: 'M24,-23v15M34,-23v15M44,-23v15', stroke: brass, 'stroke-width': 1.2 }, G);
    el('rect', { x: 49, y: -38, width: 6, height: 15, rx: 1, fill: trim }, G);                                                        // ארובה גבוהה
    el('rect', { x: 47.4, y: -40, width: 9.2, height: 3, rx: 1.2, fill: brass }, G);
    el('path', { d: 'M30,-23a4,4 0 0 1 8,0z', fill: brass }, G);
    el('circle', { cx: 60, cy: -15.5, r: 4.4, fill: shade(body, -.2), stroke: brass, 'stroke-width': .9 }, G);
    el('path', { d: 'M60,-18.2l.8,1.8h1.8l-1.4,1.2l.6,1.8l-1.8,-1.1l-1.8,1.1l.6,-1.8l-1.4,-1.2h1.8z', fill: brass }, G);              // כוכב על החזית
    wheel(G, 9, 5.6, trim, W); wheel(G, 26, 7.4, body, W); wheel(G, 43, 7.4, body, W); wheel(G, 56, 4, trim, W);
    return { wheels: W, chimney: [x0 + 52, -41], length: 66 };
  }
  if (kind === 'express') {
    const body = '#2f5f9e', stripe = '#f2c94c', trim = '#23232a';
    sh(78);
    el('path', { d: 'M0,-31h52q22,0 26,18v5h-78z', fill: body }, G);                                                                // גוף מוזרם
    el('path', { d: 'M0,-14h76', stroke: stripe, 'stroke-width': 2.4 }, G);
    el('rect', { x: 4, y: -27, width: 12, height: 8, rx: 2, fill: '#f7e6b8' }, G);
    el('path', { d: 'M62,-27q10,3 13,11h-13z', fill: shade(body, .2) }, G);
    el('rect', { x: 46, y: -35, width: 7, height: 4, rx: 1.5, fill: trim }, G);
    el('rect', { x: 0, y: -10, width: 78, height: 3, fill: trim }, G);
    wheel(G, 12, 6.4, trim, W); wheel(G, 30, 7.2, '#d8d8d8', W); wheel(G, 47, 7.2, '#d8d8d8', W); wheel(G, 66, 4.6, trim, W);
    return { wheels: W, chimney: [x0 + 49.5, -36], length: 78 };
  }
  // forest: קטר יער קטן ומסילה צרה, צהוב עם גג אדום וארובת "בלון" נגד ניצוצות
  const body = '#e8b93c', trim = '#3b3330', roof = '#b8392f';
  sh(44);
  el('rect', { x: 0, y: -26, width: 15, height: 18, rx: 2, fill: body }, G);
  el('rect', { x: 2.5, y: -23, width: 10, height: 7, rx: 1.5, fill: '#f7e6b8' }, G);
  el('path', { d: 'M-2,-26q9,-5 19,0z', fill: roof }, G);
  el('rect', { x: 15, y: -18, width: 25, height: 10, rx: 4.5, fill: body }, G);
  el('path', { d: 'M31,-18v-5q-4,-1 -4,-5q0,-3 7,-3t7,3q0,4 -4,5v5z', fill: trim }, G);                                           // ארובת בלון
  el('rect', { x: 38, y: -12, width: 5, height: 4, fill: roof }, G);
  wheel(G, 10, 4.4, trim, W); wheel(G, 22, 4.4, trim, W); wheel(G, 33, 4.4, trim, W);
  return { wheels: W, chimney: [x0 + 34, -31], length: 44 };
}

/** קרון. x0: הקצה האחורי. kind קובע את הצבעים (לפי הקטר), i מגוון קרון נוסעים / משא */
export function car(g: any, kind: Loco, x0: number, i: number) {
  const W: any[] = [], G = el('g', { transform: `translate(${n2(x0)},0)` }, g);
  const pal: Record<Loco, string[]> = { american: ['#7a3b2e', '#d8a943'], tank: ['#3f7d4f', '#f2e6c8'], redStar: ['#8a2f28', '#e2b84f'], express: ['#2f5f9e', '#f2c94c'], forest: ['#8a6a44', '#e8b93c'] };
  const [c, acc] = pal[kind], len = kind === 'forest' ? 34 : 56, h = kind === 'forest' ? 15 : 20;
  el('ellipse', { cx: len / 2, cy: 1, rx: len / 2 + 2, ry: 2.2, fill: 'rgba(40,40,30,.2)' }, G);
  if (kind === 'forest' && i % 2) {
    // קרון עצים: בולי עץ
    el('rect', { x: 0, y: -10, width: len, height: 3, fill: '#5a4030' }, G);
    el('path', { d: circ(6, -13, 3) + circ(12, -13, 3) + circ(18, -13, 3) + circ(24, -13, 3) + circ(9, -18, 3) + circ(15, -18, 3) + circ(21, -18, 3), fill: '#b08a5a', stroke: '#7a5a3a', 'stroke-width': .6 }, G);
  } else {
    el('rect', { x: 0, y: -h - 8, width: len, height: h, rx: 3, fill: c, stroke: shade(c, -.3), 'stroke-width': .8 }, G);
    el('path', { d: `M-1,${-h - 8}q${len / 2 + 1},-5 ${len + 2},0z`, fill: shade(c, -.25) }, G);
    let win = ''; for (let x = 5; x < len - 8; x += 11) win += `M${x},${-h - 3}h7v${h * .4}h-7z`;
    el('path', { d: win, fill: '#f7e6b8' }, G);
    el('path', { d: `M0,${-10.5}h${len}`, stroke: acc, 'stroke-width': 1.4 }, G);
  }
  const r = kind === 'forest' ? 3.4 : 4;
  wheel(G, 8, r, '#2b2b30', W); wheel(G, len - 8, r, '#2b2b30', W);
  return { wheels: W, length: len };
}
