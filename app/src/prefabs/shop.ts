/* חנות: נבנית מחלקים, כך שאין שתי חנויות זהות (גם חנויות שיתווספו בעתיד).
   - צורת המבנה: קוטג', בית עירוני גבוה, ביתן עם גג חרוט, או חנות עם חזית זכוכית
   - חזית: חומר קיר, גגון, סוג שלט, חלון ראווה ודלת
   - "ערכת מקצוע" (variant): מה רואים בחלון, מה עומד בחוץ, והאייקון בשלט.
     מקצוע בלי ערכה (למשל 'books') מקבל תצוגה כללית של מדפים וארגזים.
   הבחירות קבועות לפי מקום החנות (אקראיות מקומית), ואפשר לקבוע כל אחת מהנתונים:
   { form, awning, sign, door: 'left' | 'right' } */
import { el, n2, circ, shade, wrap1, ST } from '../core/util';
import { rngAt, type LocalRng } from '../core/rng';
import { ctx, prop, block, fxAt, smokeFx } from '../world/context';
import { poly, roofTexture, wallTexture, windowAt, doorAt, FLOWERS, type Pt } from './house';

interface Front { x0: number; x1: number; top: number; y: number }   // חלון הראווה
interface Kit {
  icon?: (g: any, cx: number, cy: number, c: string) => void;
  display?: (g: any, f: Front, c: string, rg: LocalRng) => void;
  outside?: (g: any, x: number, y: number, side: number, w: number, c: string, rg: LocalRng) => void;
  extra?: (g: any, x: number, y: number, top: number, w: number, c: string, rg: LocalRng) => void;
}

/* ───────── ערכות מקצוע ───────── */
const loaf = (g: any, x: number, y: number, s = 1) => {
  el('ellipse', { cx: x, cy: y, rx: 5 * s, ry: 2.6 * s, fill: '#d9984a', stroke: '#a8652a', 'stroke-width': .6 }, g);
  el('path', { d: `M${n2(x - 2.4 * s)},${n2(y - 1)}l1.2,1.6M${n2(x)},${n2(y - 1.4)}l1.2,1.6M${n2(x + 2.4 * s)},${n2(y - 1)}l1.2,1.6`, stroke: '#f2d39b', 'stroke-width': .6 }, g);
};
const pot = (g: any, x: number, y: number, c: string, s = 1) => {
  el('path', { d: `M${n2(x - 3 * s)},${n2(y)}l${n2(.8 * s)},${n2(-5 * s)}h${n2(4.4 * s)}l${n2(.8 * s)},${n2(5 * s)}z`, fill: '#c46a3a' }, g);
  el('path', { d: circ(x, y - 7 * s, 3 * s), fill: '#5c9e4a' }, g);
  el('path', { d: circ(x - 1.2 * s, y - 8 * s, 1.5 * s) + circ(x + 1.4 * s, y - 7.4 * s, 1.4 * s) + circ(x, y - 9.6 * s, 1.3 * s), fill: c }, g);
};
const KITS: Record<string, Kit> = {
  bakery: {
    icon: (g, cx, cy) => loaf(g, cx, cy, .9),
    display: (g, f) => {
      const sy = f.y - 3; el('path', { d: `M${n2(f.x0 + 1)},${n2(sy)}H${n2(f.x1 - 1)}`, stroke: '#a8652a', 'stroke-width': 1 }, g);
      for (let x = f.x0 + 6; x < f.x1 - 4; x += 10) loaf(g, x, sy - 2.6, .8);
      const cx = (f.x0 + f.x1) / 2;   // עוגה על מעמד
      el('path', { d: `M${n2(cx - 5)},${n2(sy - 9)}h10v-5h-10z`, fill: '#fff4e6', stroke: '#e48aa5', 'stroke-width': .8 }, g);
      el('circle', { cx, cy: sy - 15.5, r: 1.3, fill: '#e2574c' }, g);
    },
    outside: (g, x, y, side, w) => {
      // לוח גיר ועגלת לחמים
      const bx = x + side * (w / 2 + 9);
      el('path', { d: `M${n2(bx - 6)},${n2(y)}l3,-15h6l3,15`, fill: 'none', stroke: '#7a4f2a', 'stroke-width': 1 }, g);
      el('rect', { x: bx - 5, y: y - 14, width: 10, height: 9, fill: '#3b3f3a', stroke: '#7a4f2a', 'stroke-width': .8 }, g);
      el('path', { d: `M${n2(bx - 3)},${n2(y - 11)}h6M${n2(bx - 3)},${n2(y - 8.5)}h4`, stroke: '#f4f1ea', 'stroke-width': .6 }, g);
      const cx = x - side * (w / 2 + 10);
      el('rect', { x: cx - 8, y: y - 9, width: 16, height: 6, rx: 1, fill: '#b98552', stroke: '#8a5f39', 'stroke-width': .8 }, g);
      el('path', { d: `M${n2(cx - 6)},${n2(y - 3)}v3M${n2(cx + 6)},${n2(y - 3)}v3`, stroke: '#8a5f39', 'stroke-width': 1 }, g);
      loaf(g, cx - 3, y - 10, .7); loaf(g, cx + 3, y - 10.5, .7);
    },
    extra: (g, x, y, top, w, c, rg) => {
      // תנור לבנים בולט מהצד, עם עשן
      if (!rg.chance(.6)) return;
      const s = rg.chance(.5) ? -1 : 1, ox = x + s * (w / 2 + 2), oy = y - 2;
      el('path', { d: `M${n2(ox)},${n2(oy)}v-16a${12},${12} 0 0 ${s > 0 ? 1 : 0} ${n2(s * 14)},14z`, fill: '#c97b5a', ...ST }, g);
      el('rect', { x: ox + s * 6 - 2.5, y: oy - 30, width: 5, height: 14, fill: '#b5654a', ...ST }, g);
      const sx = ox + s * 6;
      for (let i = 0; i < 3; i++) smokeFx(el('circle', { cx: sx, cy: oy - 34, r: 3.5, fill: '#f4f1ea', opacity: 0 }, ctx.L.air), sx, oy - 34, i * 1.6 + rg.rand(0, 1));
    },
  },
  flowers: {
    icon: (g, cx, cy, c) => { el('path', { d: circ(cx - 2, cy - 1, 2) + circ(cx + 2, cy - 1, 2) + circ(cx, cy - 3, 2) + circ(cx, cy + 1, 2), fill: '#e48aa5' }, g); el('circle', { cx, cy: cy - 1, r: 1.3, fill: '#f6d05a' }, g); },
    display: (g, f, c, rg) => { for (let x = f.x0 + 5; x < f.x1 - 3; x += 7) pot(g, x, f.y - 2, rg.pick(FLOWERS), .75); },
    outside: (g, x, y, side, w, c, rg) => {
      // מדף מדורג עם עציצים, ודליים עם זרים
      const sx = x + side * (w / 2 + 12);
      el('path', { d: `M${n2(sx - 10)},${n2(y)}V${n2(y - 6)}h20V${n2(y)}M${n2(sx - 7)},${n2(y - 6)}v-6h14v6`, fill: '#b98552', stroke: '#8a5f39', 'stroke-width': .8 }, g);
      for (const [dx, dy] of [[-7, 6], [0, 6], [7, 6], [-3.5, 12], [3.5, 12]]) pot(g, sx + dx, y - dy, rg.pick(FLOWERS), .7);
      const bx = x - side * (w / 2 + 9);
      for (const dx of [-4, 4]) {
        el('path', { d: `M${n2(bx + dx - 3)},${n2(y)}l-.6,-6h7.2l-.6,6z`, fill: '#9aa8b3' }, g);
        el('path', { d: circ(bx + dx - 1.5, y - 8, 1.8) + circ(bx + dx + 1.5, y - 8.5, 1.8) + circ(bx + dx, y - 10.5, 1.7), fill: rg.pick(FLOWERS) }, g);
      }
    },
    extra: (g, x, y, top, w) => {
      // אדניות תלויות
      for (const s of [-1, 1]) { const hx = x + s * w * .36; el('path', { d: `M${n2(hx)},${n2(top + 4)}v5`, stroke: '#5b3a22', 'stroke-width': .6 }, g); el('path', { d: circ(hx, top + 11, 3.2), fill: '#5c9e4a' }, g); el('path', { d: circ(hx - 1.5, top + 11, 1.2) + circ(hx + 1.6, top + 12, 1.2), fill: '#e48aa5' }, g); }
    },
  },
  barber: {
    icon: (g, cx, cy) => {   // מספריים
      el('path', { d: `M${n2(cx - 4)},${n2(cy - 3)}L${n2(cx + 4)},${n2(cy + 2)}M${n2(cx - 4)},${n2(cy + 2)}L${n2(cx + 4)},${n2(cy - 3)}`, stroke: '#3b3b46', 'stroke-width': 1 }, g);
      el('path', { d: circ(cx - 5, cy - 3.6, 1.4) + circ(cx - 5, cy + 2.6, 1.4), fill: 'none', stroke: '#3b3b46', 'stroke-width': .8 }, g);
    },
    display: (g, f) => {
      // מראה וכיסא
      const cx = (f.x0 + f.x1) / 2;
      el('rect', { x: cx - 7, y: f.top + 3, width: 14, height: 9, rx: 1.5, fill: '#e8f6fc', stroke: '#9aa8b3', 'stroke-width': .8 }, g);
      el('path', { d: `M${n2(cx - 5)},${n2(f.y - 2)}v-5h10v5M${n2(cx - 5)},${n2(f.y - 7)}v-6h2v6M${n2(cx - 6)},${n2(f.y - 7)}h12`, fill: '#4a4a55', stroke: '#4a4a55', 'stroke-width': 1.2 }, g);
    },
    outside: (g, x, y, side, w, c, rg) => {
      // עמוד מספרה מסתובב (בשכבה הדינמית), וספסל המתנה
      const px = x + side * (w / 2 + 5), id = `poleClip${Math.round(x)}_${Math.round(y)}`, cp = el('clipPath', { id }, ctx.defs);
      el('rect', { x: px - 3, y: y - 34, width: 6, height: 24, rx: 3 }, cp);
      el('rect', { x: px - 3, y: y - 34, width: 6, height: 24, rx: 3, fill: '#fff', stroke: '#9aa', 'stroke-width': .8 }, g);
      const sg = el('g', { 'clip-path': `url(#${id})` }, ctx.L.fx), sp = el('g', null, sg);
      fxAt(px, y - 22, 30, t => sp.setAttribute('transform', `translate(0,${n2(-8 * wrap1(t / 2.6))})`));
      let d = ''; for (let k = -2; k < 6; k++) d += `M${px - 4},${y - 30 + k * 8}l8,-5v3l-8,5z`;
      el('path', { d, fill: '#e2574c' }, sp);
      el('circle', { cx: px, cy: y - 36, r: 3, fill: c }, g);
      el('path', { d: `M${n2(px)},${n2(y - 10)}V${n2(y)}`, stroke: '#9aa', 'stroke-width': 1.4 }, g);
      if (rg.chance(.7)) {
        const bx = x - side * (w / 2 + 12);
        el('rect', { x: bx - 9, y: y - 8, width: 18, height: 3, rx: 1, fill: '#a0643a' }, g);
        el('path', { d: `M${n2(bx - 7)},${n2(y - 5)}v5M${n2(bx + 7)},${n2(y - 5)}v5`, stroke: '#5b3a22', 'stroke-width': 1.2 }, g);
      }
    },
  },
  icecream: {
    icon: (g, cx, cy) => { el('path', { d: `M${n2(cx - 2.5)},${n2(cy - 1)}l2.5,6l2.5,-6z`, fill: '#e3a857' }, g); el('path', { d: circ(cx, cy - 2.2, 2.6), fill: '#ffd1e3' }, g); },
    display: (g, f) => {
      const cols = ['#ffd1e3', '#fff3c4', '#c9a07a', '#c7ecd4', '#f7a8a8'];
      let i = 0; for (let x = f.x0 + 5; x < f.x1 - 3; x += 7) { el('path', { d: `M${n2(x - 3)},${n2(f.y - 3)}a3,2.6 0 0 1 6,0z`, fill: cols[i++ % cols.length] }, g); }
      el('path', { d: `M${n2(f.x0 + 1)},${n2(f.y - 3)}H${n2(f.x1 - 1)}`, stroke: '#9aa8b3', 'stroke-width': .9 }, g);
    },
    outside: (g, x, y, side, w, c) => {
      // שולחן קטן עם שמשייה
      const tx = x + side * (w / 2 + 16);
      el('ellipse', { cx: tx, cy: y - 7, rx: 6, ry: 1.6, fill: '#ffffff', stroke: '#c9b9a0', 'stroke-width': .6 }, g);
      el('path', { d: `M${n2(tx)},${n2(y - 7)}V${n2(y)}M${n2(tx)},${n2(y - 7)}V${n2(y - 22)}`, stroke: '#8a8f96', 'stroke-width': .9 }, g);
      el('path', { d: `M${n2(tx - 11)},${n2(y - 19)}Q${n2(tx)},${n2(y - 29)} ${n2(tx + 11)},${n2(y - 19)}Z`, fill: c, stroke: shade(c, -.2), 'stroke-width': .6 }, g);
      el('path', { d: `M${n2(tx - 4)},${n2(y - 24.5)}L${n2(tx - 4.5)},${n2(y - 19)}M${n2(tx + 4)},${n2(y - 24.5)}L${n2(tx + 4.5)},${n2(y - 19)}`, stroke: '#ffffff', 'stroke-width': 1.4 }, g);
      for (const s of [-1, 1]) el('path', { d: `M${n2(tx + s * 9)},${n2(y)}v-6h${n2(-s * 3)}`, fill: 'none', stroke: '#8a8f96', 'stroke-width': .9 }, g);
    },
    extra: (g, x, y, top) => {
      // גביע גלידה גדול על הגג
      el('path', { d: `M${n2(x - 5)},${n2(top - 4)}l5,14l5,-14z`, fill: '#e3a857', stroke: '#b97a2f', 'stroke-width': 1 }, g);
      el('path', { d: circ(x, top - 7, 5.5), fill: '#ffd1e3' }, g);
      el('path', { d: circ(x + 2, top - 11, 3.5), fill: '#8b5a2b' }, g);
    },
  },
};
/** מקצוע בלי ערכה: מדפים עם קופסאות, וארגזים בחוץ */
const GENERIC: Kit = {
  display: (g, f, c, rg) => {
    for (const sy of [f.y - 3, f.y - 11]) {
      el('path', { d: `M${n2(f.x0 + 1)},${n2(sy)}H${n2(f.x1 - 1)}`, stroke: '#8a5f39', 'stroke-width': .8 }, g);
      for (let x = f.x0 + 3; x < f.x1 - 5; x += rg.rand(5, 8)) el('rect', { x, y: sy - rg.rand(3, 6), width: 3.6, height: 6, fill: rg.pick(['#e2574c', '#3d9bd9', '#f6d05a', '#5c9e4a', '#f2a65a', '#b48ad6']) }, g);
    }
  },
  outside: (g, x, y, side, w) => {
    const bx = x + side * (w / 2 + 9);
    el('rect', { x: bx - 6, y: y - 8, width: 12, height: 8, fill: '#b98552', stroke: '#8a5f39', 'stroke-width': .8 }, g);
    el('rect', { x: bx - 4, y: y - 14, width: 9, height: 6, fill: '#c9a27a', stroke: '#8a5f39', 'stroke-width': .8 }, g);
  },
};

/* ───────── שלט: כמו שלט של חנות אמיתית ───────── */
const SERIF = 'Georgia, "Times New Roman", serif';
/** style: 'fascia' (לוח עץ על החזית), 'painted' (אותיות צבועות על הקיר), 'hanging' (לוח קטן תלוי) */
function shopSign(g: any, cx: number, cy: number, text: string, kit: Kit, style: string, c: string, rg: LocalRng, maxW: number) {
  const italic = rg.chance(.35), small = style === 'hanging';
  let fs = small ? 7.5 : 9;
  const iconW = kit.icon && style !== 'painted' ? 11 : 0;
  fs = Math.min(fs, (maxW - 16 - iconW) / (text.length * .6));
  const tw = text.length * fs * .6 + iconW;
  const label = (fill: string, x: number) => {
    const t = el('text', { x, y: cy + fs * .36, 'text-anchor': 'middle', 'font-size': n2(fs), 'font-weight': 700, 'font-family': SERIF, 'font-style': italic ? 'italic' : 'normal', fill }, g);
    t.textContent = text;
  };
  if (style === 'painted') {
    // אותיות צבועות ישר על הקיר, עם קו קישוט עדין מתחת
    const ink = shade(c, -.42);
    label(ink, cx);
    el('path', { d: `M${n2(cx - tw * .32)},${n2(cy + fs * .75)}q${n2(tw * .32)},2 ${n2(tw * .64)},0`, fill: 'none', stroke: ink, 'stroke-width': .7, 'stroke-linecap': 'round' }, g);
    return;
  }
  // לוח עץ (כהה או צבוע) עם מסגרת פנימית, מסמרים, אייקון וכיתוב בצבע שמנת/זהב
  const wood = rg.pick(['#7a5232', '#5d4030', '#2f4a3a', '#2c3e50', shade(c, -.38)]), ink = rg.pick(['#f4e3b5', '#fdf6e3', '#e8c66a']);
  const bw = tw + 14, bh = fs + 7, x0 = cx - bw / 2, y0 = cy - bh / 2;
  if (small && rg.chance(.5)) el('path', { d: `M${n2(x0)},${n2(y0 + 3)}q${n2(bw / 2)},-5 ${n2(bw)},0v${n2(bh - 3)}h${n2(-bw)}z`, fill: wood, stroke: shade(wood, -.3), 'stroke-width': .9 }, g);
  else el('rect', { x: x0, y: y0, width: bw, height: bh, rx: 1.5, fill: wood, stroke: shade(wood, -.3), 'stroke-width': .9 }, g);
  el('rect', { x: x0 + 1.8, y: y0 + 1.8, width: bw - 3.6, height: bh - 3.6, rx: 1, fill: 'none', stroke: shade(wood, .25), 'stroke-width': .5, opacity: .7 }, g);
  if (!small) el('path', { d: circ(x0 + 3.2, y0 + 3.2, .6) + circ(x0 + bw - 3.2, y0 + 3.2, .6) + circ(x0 + 3.2, y0 + bh - 3.2, .6) + circ(x0 + bw - 3.2, y0 + bh - 3.2, .6), fill: '#c9b58a' }, g);
  if (iconW) kit.icon!(g, x0 + 9, cy, ink);
  label(ink, cx + iconW / 2);
}

/* ───────── גגון ───────── */
function awning(g: any, x0: number, x1: number, ay: number, style: string, c: string) {
  const w = x1 - x0;
  if (style === 'scallop' || style === 'stripes') {
    const n = Math.max(3, Math.round(w / 11)), sw = w / n;
    for (let i = 0; i < n; i++) {
      const ax = x0 + i * sw, fill = i % 2 ? '#fffaf0' : c;
      el('path', { d: style === 'scallop' ? `M${n2(ax)},${n2(ay)}h${n2(sw)}v9a${n2(sw / 2)},${n2(sw / 2.6)} 0 0 1 ${n2(-sw)},0Z` : `M${n2(ax)},${n2(ay)}h${n2(sw)}l1.5,10h${n2(-sw)}Z`, fill }, g);
    }
    el('path', { d: `M${n2(x0)},${n2(ay)}H${n2(x1)}`, stroke: shade(c, -.25), 'stroke-width': 1.4 }, g);
  } else if (style === 'plain') {
    el('path', { d: `M${n2(x0)},${n2(ay)}H${n2(x1)}l2,9H${n2(x0 - 2)}Z`, fill: c, stroke: shade(c, -.2), 'stroke-width': .8 }, g);
    let d = ''; for (let xx = x0; xx <= x1; xx += 5) d += `M${n2(xx)},${n2(ay + 9)}q1.25,2 2.5,0`;
    el('path', { d, fill: 'none', stroke: shade(c, -.2), 'stroke-width': .8 }, g);
  } else if (style === 'pergola') {
    // קורות עץ עם צמחייה מטפסת
    let d = `M${n2(x0 - 2)},${n2(ay)}H${n2(x1 + 2)}`; for (let xx = x0; xx <= x1; xx += 6) d += `M${n2(xx)},${n2(ay - 2)}v4`;
    el('path', { d, stroke: '#8a5a35', 'stroke-width': 1.6 }, g);
    let v = ''; for (let xx = x0 + 2; xx < x1; xx += 4.5) v += circ(xx, ay + 1.5 + Math.sin(xx) * 1.2, 2.2);
    el('path', { d: v, fill: '#5c9e4a' }, g);
  }
}

export function shop(o: any) {
  const { x, y, color: c, wall: wall0, name } = o;
  const rg = rngAt(x, y, 11), kit = KITS[o.variant] || GENERIC;
  const form: string = o.form ?? rg.pick(['cottage', 'townhouse', 'pavilion', 'glassfront']);
  const wall = shade(wall0, rg.rand(-.04, .02)), wallTex: string = rg.pick(['plaster', 'plaster', 'brick', 'boards', 'stone']);
  const roofC = rg.pick(['#b5654a', '#8e5a3c', '#5f6b78', '#7a8c6a', shade(c, -.25)]);
  const g = prop(y);
  const w = form === 'townhouse' ? rg.rand(62, 72) : form === 'pavilion' ? rg.rand(66, 76) : rg.rand(78, 92);
  const gh = rg.rand(40, 46);                         // גובה קומת החנות
  const H = form === 'townhouse' ? gh + rg.rand(26, 32) : gh + (form === 'glassfront' ? 4 : 0);
  const x0 = x - w / 2, x1 = x + w / 2, top = y - H;
  el('ellipse', { cx: x + 4, cy: y + 1, rx: w * .64, ry: 5, fill: 'rgba(40,70,20,.2)' }, g);

  kit.extra && o.variant === 'bakery' && kit.extra(g, x, y, top, w, c, rg);   // תנור: מאחורי הבניין

  // גוף הבניין
  el('rect', { x: x0, y: top, width: w, height: H, fill: wall, ...ST }, g);
  wallTexture(g, x0, top, w, H, wallTex, wall, rg);
  let roofTop = top;
  if (form === 'cottage') {
    const rh = rg.rand(22, 30), hip = rg.chance(.5), b = top + 2;
    const P: Pt[] = hip ? [[x0 - 5, b], [x - w * .22, b - rh], [x + w * .22, b - rh], [x1 + 5, b]] : [[x0 - 5, b], [x, b - rh * 1.15], [x1 + 5, b]];
    el('path', { d: poly(P), fill: roofC, ...ST }, g);
    roofTexture(g, P, rg.pick(['tiles', 'shingles', 'slate']), roofC, b - rh * 1.15, b);
    roofTop = b - rh * 1.15;
  } else if (form === 'townhouse') {
    // קומה עליונה: חלונות, ובראש גמלון מדורג, גג מנסרד או כרכוב שטוח
    const up = top + (H - gh) / 2 + 2, ws = rg.pick(['tall', 'arched', 'cross']);
    for (const wx of [x - w * .25, x + w * .25]) windowAt(g, wx, up, 9, ws === 'tall' ? 14 : 10, ws, '#ffffff', null, rg.chance(.6) ? rg.pick(FLOWERS) : null);
    el('path', { d: `M${n2(x0)},${n2(y - gh)}H${n2(x1)}`, stroke: shade(wall, -.2), 'stroke-width': 1.6 }, g);
    const crown = rg.pick(['stepped', 'mansard', 'cornice']);
    if (crown === 'stepped') {
      const s = w / 6, P: Pt[] = [[x0, top], [x0, top - 5], [x0 + s, top - 5], [x0 + s, top - 11], [x0 + 2 * s, top - 11], [x0 + 2 * s, top - 17], [x1 - 2 * s, top - 17], [x1 - 2 * s, top - 11], [x1 - s, top - 11], [x1 - s, top - 5], [x1, top - 5], [x1, top]];
      el('path', { d: poly(P), fill: wall, ...ST }, g);
      el('circle', { cx: x, cy: top - 9, r: 3, fill: '#bfe6fb', stroke: '#ffffff', 'stroke-width': 1 }, g);
      roofTop = top - 17;
    } else if (crown === 'mansard') {
      const P: Pt[] = [[x0 - 3, top + 1], [x0 + 6, top - 16], [x1 - 6, top - 16], [x1 + 3, top + 1]];
      el('path', { d: poly(P), fill: '#5f6b78', ...ST }, g);
      roofTexture(g, P, 'slate', '#5f6b78', top - 16, top + 1);
      el('rect', { x: x - 5, y: top - 13, width: 10, height: 10, fill: wall, ...ST }, g);
      el('rect', { x: x - 3, y: top - 11, width: 6, height: 7, fill: '#bfe6fb' }, g);
      roofTop = top - 16;
    } else {
      el('rect', { x: x0 - 3, y: top - 4, width: w + 6, height: 5, fill: shade(wall, -.12), ...ST }, g);
      roofTop = top - 4;
    }
  } else if (form === 'pavilion') {
    // גג חרוט מפוספס עם שוליים מסולסלים ודגל
    const rh = rg.rand(26, 34), b = top + 3, n = 8;
    for (let i = 0; i < n; i++) {
      const a0 = x0 - 6 + i * (w + 12) / n, a1 = a0 + (w + 12) / n;
      el('path', { d: poly([[a0, b], [x, b - rh], [a1, b]]), fill: i % 2 ? '#fffaf0' : c, stroke: shade(c, -.2), 'stroke-width': .5 }, g);
    }
    let sc = ''; for (let i = 0; i < n; i++) { const a0 = x0 - 6 + i * (w + 12) / n; sc += `M${n2(a0)},${n2(b)}a${n2((w + 12) / n / 2)},3.5 0 0 0 ${n2((w + 12) / n)},0`; }
    el('path', { d: sc, fill: c, stroke: shade(c, -.2), 'stroke-width': .6 }, g);
    el('path', { d: `M${n2(x)},${n2(b - rh)}v-9`, stroke: '#6b4a2f', 'stroke-width': 1 }, g);
    el('path', { d: `M${n2(x)},${n2(b - rh - 9)}l8,2.5l-8,2.5z`, fill: shade(c, -.1) }, g);
    roofTop = b - rh - 9;
  } else {
    // חזית זכוכית: גג משופע מאחור וגג זכוכית קדמי
    const rh = rg.rand(18, 24);
    el('path', { d: poly([[x0 - 4, top + 2], [x0 + 8, top - rh], [x1 - 8, top - rh], [x1 + 4, top + 2]]), fill: roofC, ...ST }, g);
    roofTop = top - rh;
  }

  // חזית החנות: דלת בצד אחד וחלון ראווה בשאר
  const side = o.door === 'left' ? -1 : o.door === 'right' ? 1 : (rg.chance(.5) ? -1 : 1), dw = 14, dh = rg.rand(25, 28);
  const dx = x + side * (w / 2 - dw / 2 - (form === 'pavilion' ? 10 : 7));
  const fx0 = side > 0 ? x0 + 6 : dx + dw / 2 + 5, fx1 = side > 0 ? dx - dw / 2 - 5 : x1 - 6;
  const ftop = y - gh + (form === 'glassfront' ? 8 : 14), fr: Front = { x0: fx0, x1: fx1, top: ftop, y: y - 4 };
  const frameC = shade(c, -.3);
  if (form === 'glassfront') {
    // כל החזית זכוכית עם מסגרת עץ צבועה
    el('rect', { x: x0 + 3, y: ftop - 2, width: w - 6, height: y - ftop + 2, fill: '#cfeefb', stroke: frameC, 'stroke-width': 1.8 }, g);
    let m = ''; for (let xx = x0 + 3 + (w - 6) / 4; xx < x1 - 4; xx += (w - 6) / 4) m += `M${n2(xx)},${n2(ftop - 2)}V${n2(y)}`;
    el('path', { d: m + `M${n2(x0 + 3)},${n2(ftop + 9)}H${n2(x1 - 3)}`, stroke: frameC, 'stroke-width': 1 }, g);
  } else {
    el('rect', { x: fx0, y: ftop, width: fx1 - fx0, height: y - 4 - ftop, rx: 1, fill: '#cfeefb', stroke: frameC, 'stroke-width': 1.6 }, g);
    el('rect', { x: fx0 - 1.5, y: y - 4, width: fx1 - fx0 + 3, height: 4, fill: shade(wall, -.15) }, g);
    const panes = rg.pick([2, 3, 4]); let m = '';
    for (let i = 1; i < panes; i++) m += `M${n2(fx0 + (fx1 - fx0) * i / panes)},${n2(ftop)}V${n2(y - 4)}`;
    if (rg.chance(.5)) m += `M${n2(fx0)},${n2(ftop + 6)}H${n2(fx1)}`;
    el('path', { d: m, stroke: frameC, 'stroke-width': .9 }, g);
  }
  (kit.display || GENERIC.display)!(g, fr, c, rg);
  doorAt(g, dx, y, dw, dh, rg.pick(['glass', 'glass', 'panel', 'round']), shade(c, rg.rand(-.2, 0)));
  // גגון מעל החלון (לפעמים גם מעל הדלת)
  const aw: string = o.awning ?? (form === 'pavilion' ? 'none' : rg.pick(['scallop', 'stripes', 'plain', 'pergola', 'none']));
  const ay = ftop - 4;
  if (aw !== 'none') rg.chance(.5) ? awning(g, x0 + 2, x1 - 2, ay, aw, c) : awning(g, fx0 - 2, fx1 + 2, ay, aw, c);
  // שלט: לוח עץ על החזית, אותיות צבועות על הקיר, או שלט קטן תלוי על זרוע ברזל
  const sign: string = o.sign ?? rg.pick(['fascia', 'fascia', 'painted', 'hanging']);
  if (sign === 'hanging') {
    // זרוע ברזל מסולסלת שבולטת מהקיר, ושתי שרשראות קצרות
    const wx = x - side * (w / 2), dir = -side, hy = y - gh + 6, bx = wx + dir * 17;
    el('path', { d: `M${n2(wx)},${n2(hy)}H${n2(wx + dir * 30)}M${n2(wx)},${n2(hy + 8)}L${n2(wx + dir * 12)},${n2(hy)}`, fill: 'none', stroke: '#3b3b46', 'stroke-width': 1.1, 'stroke-linecap': 'round' }, g);
    el('path', { d: `M${n2(wx + dir * 30)},${n2(hy)}a2,2 0 1 ${dir > 0 ? 1 : 0} ${n2(-dir * 2)},2.5`, fill: 'none', stroke: '#3b3b46', 'stroke-width': .9 }, g);
    el('path', { d: `M${n2(bx - 9)},${n2(hy)}v4M${n2(bx + 9)},${n2(hy)}v4`, stroke: '#55555f', 'stroke-width': .6, 'stroke-dasharray': '1 .6' }, g);
    shopSign(g, bx, hy + 11, name, kit, 'hanging', c, rg, 46);
  } else {
    const cy = form === 'townhouse' ? y - gh - 7 : top + 7.5;
    shopSign(g, x, cy, name, kit, sign === 'painted' ? 'painted' : 'fascia', c, rg, w - 4);
  }

  if (kit.extra && o.variant !== 'bakery') kit.extra(g, x, y, roofTop, w, c, rg);
  (kit.outside || GENERIC.outside)!(g, x, y, side, w, c, rg);
  block(x0 - 30, roofTop - 24, x1 + 30, y + 14);
}
