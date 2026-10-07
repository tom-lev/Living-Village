/* גדרות למגרשים: לכל בית גדר משלו (בקשת הבעלים).
   עשרה סגנונות, ובכל סגנון גוונים ופרטים שנבחרים לפי המיקום (rngAt), כך שאין שתי גדרות זהות.
   סגנון שכבר יש לשכן קרוב לא נבחר שוב (plot ב-village.ts זוכר מה צויר).
   הצלעות האופקיות (למעלה ולמטה) מצוירות "עומדות" – עמודים, כלונסאות, אבנים; הצלעות הצדדיות דקות יותר, כמו במבט מלמעלה.
   בצלע של הרחוב יש פתח בשער (gx ± 9). */
import { el, n2, circ, shade } from '../core/util';
import { rngAt } from '../core/rng';

export const FENCE_STYLES = ['hedge', 'picket', 'splitRail', 'stoneWall', 'brick', 'wattle', 'iron', 'flowerHedge', 'lavender', 'bamboo'] as const;
export type FenceStyle = typeof FENCE_STYLES[number];

type Seg = { a: number[]; b: number[]; h: boolean };   // h: צלע אופקית (עומדת)

/** הצלעות של המגרש, בלי הפתח שבשער */
function sides(x0: number, y0: number, x1: number, y1: number, gateY: number, gx: number): Seg[] {
  const S: Seg[] = [], G = 9;
  for (const y of [y0, y1]) {
    if (y === gateY && gx > x0 + G && gx < x1 - G) { S.push({ a: [x0, y], b: [gx - G, y], h: true }, { a: [gx + G, y], b: [x1, y], h: true }); }
    else S.push({ a: [x0, y], b: [x1, y], h: true });
  }
  S.push({ a: [x0, y0], b: [x0, y1], h: false }, { a: [x1, y0], b: [x1, y1], h: false });
  return S;
}
const line = (s: Seg) => `M${n2(s.a[0])},${n2(s.a[1])}L${n2(s.b[0])},${n2(s.b[1])}`;
/** נקודות לאורך צלע במרווח קבוע (כולל הקצוות) */
function along(s: Seg, step: number) {
  const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]), n = Math.max(1, Math.round(L / step)), out: number[][] = [];
  for (let i = 0; i <= n; i++) out.push([s.a[0] + (s.b[0] - s.a[0]) * i / n, s.a[1] + (s.b[1] - s.a[1]) * i / n]);
  return out;
}

export function drawFence(G: any, style: FenceStyle, x0: number, y0: number, x1: number, y1: number, gateY: number, gx: number) {
  const v = rngAt(x0, y0, 71), S = sides(x0, y0, x1, y1, gateY, gx);
  const H = S.filter(s => s.h), V = S.filter(s => !s.h);
  switch (style) {
    case 'hedge': {   // משוכה גזומה: רצועה עבה עם "כריות" עגולות ואור עליון
      const c = v.pick(['#6f9f52', '#5f9449', '#7aa85a', '#679c4f']);
      el('path', { d: S.map(line).join(''), fill: 'none', stroke: shade(c, -.12), 'stroke-width': 6, 'stroke-linecap': 'round' }, G);
      let b = '';
      for (const s of S) for (const p of along(s, 4.2)) b += circ(p[0], p[1] - (s.h ? 1.2 : 0), v.rand(2.4, 3));
      el('path', { d: b, fill: c }, G);
      let hl = ''; for (const s of H) for (const p of along(s, 6)) hl += circ(p[0] - .8, p[1] - 2.4, 1.1);
      el('path', { d: hl, fill: shade(c, .25), opacity: .7 }, G);
      break;
    }
    case 'flowerHedge': {   // משוכה פורחת: כמו משוכה, עם פרחים קטנים בשניים-שלושה צבעים
      const c = v.pick(['#5f9449', '#6aa04f']), cols = [v.pick(['#f4a6c0', '#ffffff', '#f6d05a']), v.pick(['#e57aa0', '#b48ad6', '#f2a65a'])];
      el('path', { d: S.map(line).join(''), fill: 'none', stroke: shade(c, -.12), 'stroke-width': 6, 'stroke-linecap': 'round' }, G);
      let b = ''; const f: string[] = ['', ''];
      for (const s of S) for (const p of along(s, 4.4)) {
        b += circ(p[0], p[1] - (s.h ? 1.2 : 0), v.rand(2.4, 3));
        if (v.chance(.55)) { const k = v.chance(.5) ? 0 : 1; f[k] += circ(p[0] + v.rand(-1.6, 1.6), p[1] - v.rand(1, 3), .9); }
      }
      el('path', { d: b, fill: c }, G);
      f.forEach((d, k) => d && el('path', { d, fill: cols[k] }, G));
      break;
    }
    case 'lavender': {   // גבול לבנדר: שורה של שיחים נמוכים סגולים עם גבעולים
      const c = v.pick(['#9b84c9', '#a58fd1', '#8f7bc2']);
      el('path', { d: S.map(line).join(''), fill: 'none', stroke: '#7fa65a', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, G);
      let b = '', st = '';
      for (const s of S) for (const p of along(s, 5)) {
        b += `M${n2(p[0] - 2.6)},${n2(p[1])}a2.6,${s.h ? 3.4 : 2.4} 0 1 1 5.2,0z`;
        if (s.h) st += `M${n2(p[0] - 1.2)},${n2(p[1] - 2)}l-.6,-2.6M${n2(p[0] + 1.2)},${n2(p[1] - 2)}l.6,-2.6`;
      }
      el('path', { d: b, fill: c }, G);
      el('path', { d: st, stroke: shade(c, -.2), 'stroke-width': .8, 'stroke-linecap': 'round' }, G);
      break;
    }
    case 'picket': {   // גדר כלונסאות צבועה עם קצה מחודד
      const c = v.pick(['#fbf7ee', '#dbe9f5', '#e3f1e2', '#f8ecc4', '#f6dfe4']), e = shade(c, -.25), ht = v.rand(6, 7.5);
      el('path', { d: S.map(line).join(''), fill: 'none', stroke: c, 'stroke-width': 1.6 }, G);
      let pk = '';
      for (const s of H) for (const p of along(s, 3.4)) pk += `M${n2(p[0] - .8)},${n2(p[1] + 1)}v${n2(-ht)}l.8,-1.3l.8,1.3v${n2(ht)}z`;
      el('path', { d: pk, fill: c, stroke: e, 'stroke-width': .35 }, G);
      for (const s of H) el('path', { d: `M${n2(s.a[0])},${n2(s.a[1] - ht * .35)}H${n2(s.b[0])}M${n2(s.a[0])},${n2(s.a[1] - ht * .8)}H${n2(s.b[0])}`, stroke: e, 'stroke-width': .5 }, G);
      let tk = ''; for (const s of V) for (const p of along(s, 3.4)) tk += `M${n2(p[0] - 1.4)},${n2(p[1])}h2.8`;
      el('path', { d: tk, stroke: c, 'stroke-width': 1.3 }, G);
      break;
    }
    case 'splitRail': {   // גדר חווה: עמודי עץ ושני קורות
      const c = v.pick(['#9a6a40', '#8a5a35', '#a8784a']), d = shade(c, -.25);
      for (const s of H) el('path', { d: `M${n2(s.a[0])},${n2(s.a[1] - 2.2)}L${n2(s.b[0])},${n2(s.b[1] - 2.2)}M${n2(s.a[0])},${n2(s.a[1] - 5.4)}L${n2(s.b[0])},${n2(s.b[1] - 5.4)}`, stroke: c, 'stroke-width': 1.5, 'stroke-linecap': 'round' }, G);
      for (const s of V) el('path', { d: `M${n2(s.a[0] - 1.3)},${n2(s.a[1])}L${n2(s.b[0] - 1.3)},${n2(s.b[1])}M${n2(s.a[0] + 1.3)},${n2(s.a[1])}L${n2(s.b[0] + 1.3)},${n2(s.b[1])}`, stroke: c, 'stroke-width': 1.1 }, G);
      let po = '';
      for (const s of S) for (const p of along(s, 17)) po += s.h ? `M${n2(p[0] - 1.1)},${n2(p[1] + .8)}h2.2v-8.6h-2.2z` : circ(p[0], p[1], 1.6);
      el('path', { d: po, fill: d }, G);
      break;
    }
    case 'stoneWall': {   // חומת אבן יבשה: אבנים עגולות בגדלים ובגוונים שונים
      const tones = v.pick([['#c9c2b4', '#b8b0a1', '#d6d0c4'], ['#c4b7a3', '#b3a58f', '#d3c8b6'], ['#bfc2bd', '#aeb2ac', '#cfd2cc']]);
      el('path', { d: S.map(line).join(''), fill: 'none', stroke: '#9a9284', 'stroke-width': 5.2, 'stroke-linecap': 'round' }, G);
      const parts: string[] = ['', '', ''];
      for (const s of S) for (const p of along(s, 3.6)) {
        const k = Math.floor(v.r() * 3), w = v.rand(1.8, 2.5), h = s.h ? v.rand(1.6, 2.2) : v.rand(1.5, 2);
        parts[k] += `M${n2(p[0] - w)},${n2(p[1] - (s.h ? 1.4 : 0))}a${n2(w)},${n2(h)} 0 1 0 ${n2(2 * w)},0a${n2(w)},${n2(h)} 0 1 0 ${n2(-2 * w)},0z`;
      }
      parts.forEach((d, k) => el('path', { d, fill: tones[k], stroke: '#8f887b', 'stroke-width': .35 }, G));
      break;
    }
    case 'brick': {   // קיר לבנים נמוך עם כיפות בעמודים
      const c = v.pick(['#c4704f', '#b5654a', '#c97e5a']), m = '#e9d5c0';
      for (const s of H) {
        const L = s.b[0] - s.a[0];
        el('rect', { x: s.a[0], y: s.a[1] - 5, width: L, height: 5.6, fill: c }, G);
        let mo = `M${n2(s.a[0])},${n2(s.a[1] - 2.2)}h${n2(L)}`;
        for (let x = s.a[0] + 3; x < s.b[0]; x += 6) mo += `M${n2(x)},${n2(s.a[1] - 5)}v2.8M${n2(x + 3)},${n2(s.a[1] - 2.2)}v2.8`;
        el('path', { d: mo, stroke: m, 'stroke-width': .45 }, G);
        el('rect', { x: s.a[0], y: s.a[1] - 6, width: L, height: 1.3, fill: shade(c, .25) }, G);
      }
      for (const s of V) el('path', { d: line(s), stroke: c, 'stroke-width': 3.6, 'stroke-linecap': 'square' }, G);
      let cap = ''; for (const s of H) for (const p of along(s, 26)) cap += `M${n2(p[0] - 2.4)},${n2(p[1] + .6)}h4.8v-8h-4.8z`;
      el('path', { d: cap, fill: shade(c, -.1), stroke: shade(c, -.3), 'stroke-width': .4 }, G);
      break;
    }
    case 'wattle': {   // גדר נצרים קלועה: רצועה חומה עם קליעה אלכסונית ועמודים
      const c = v.pick(['#b08a5a', '#a07a4c', '#bd9764']), d = shade(c, -.28);
      for (const s of H) el('rect', { x: s.a[0], y: s.a[1] - 6, width: s.b[0] - s.a[0], height: 6.4, rx: 1.5, fill: c }, G);
      for (const s of V) el('path', { d: line(s), stroke: c, 'stroke-width': 3.2 }, G);
      let wv = '';
      for (const s of H) for (let x = s.a[0] + 1.5, k = 0; x < s.b[0] - 1; x += 2.6, k++) wv += k % 2 ? `M${n2(x)},${n2(s.a[1] - 5.6)}l1.6,2.6M${n2(x)},${n2(s.a[1] - 2.6)}l1.6,2.4` : `M${n2(x)},${n2(s.a[1] - 3)}l1.6,-2.6M${n2(x)},${n2(s.a[1])}l1.6,-2.4`;
      el('path', { d: wv, stroke: d, 'stroke-width': .6, 'stroke-linecap': 'round' }, G);
      let po = ''; for (const s of H) for (const p of along(s, 14)) po += `M${n2(p[0] - .8)},${n2(p[1] + .8)}h1.6v-8.4h-1.6z`;
      el('path', { d: po, fill: d }, G);
      break;
    }
    case 'iron': {   // מעקה ברזל: מוטות דקים עם כדורים קטנים, ועמודי אבן בפינות
      const c = v.pick(['#3b3b46', '#2f4a3f', '#3d3550']), stone = '#d8d1c3';
      for (const s of H) el('path', { d: `M${n2(s.a[0])},${n2(s.a[1] - 1)}H${n2(s.b[0])}M${n2(s.a[0])},${n2(s.a[1] - 6.2)}H${n2(s.b[0])}`, stroke: c, 'stroke-width': .7 }, G);
      for (const s of V) el('path', { d: line(s), stroke: c, 'stroke-width': .9 }, G);
      let bars = '', balls = '';
      for (const s of H) for (const p of along(s, 3)) { bars += `M${n2(p[0])},${n2(p[1])}v-7.4`; balls += circ(p[0], p[1] - 7.8, .55); }
      el('path', { d: bars, stroke: c, 'stroke-width': .55 }, G);
      el('path', { d: balls, fill: c }, G);
      let pil = ''; for (const p of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) pil += `M${n2(p[0] - 2.4)},${n2(p[1] + 1)}h4.8v-9h-4.8z`;
      el('path', { d: pil, fill: stone, stroke: '#b3ab9c', 'stroke-width': .4 }, G);
      break;
    }
    case 'bamboo': {   // גדר במבוק: קנים צמודים עם מפרקים, וקשירה אופקית כהה
      const c = v.pick(['#d6c27a', '#cbbd6e', '#c9b884']), d = shade(c, -.3);
      let cane = '';
      for (const s of H) for (const p of along(s, 2.2)) cane += `M${n2(p[0])},${n2(p[1] + .6)}v${n2(-v.rand(7, 8.4))}`;
      el('path', { d: cane, stroke: c, 'stroke-width': 1.9, 'stroke-linecap': 'round' }, G);
      let nd = ''; for (const s of H) for (const p of along(s, 2.2)) nd += `M${n2(p[0] - .9)},${n2(p[1] - 3.4)}h1.8`;
      el('path', { d: nd, stroke: d, 'stroke-width': .35 }, G);
      for (const s of H) el('path', { d: `M${n2(s.a[0])},${n2(s.a[1] - 4.6)}H${n2(s.b[0])}`, stroke: '#6b4a2f', 'stroke-width': .8 }, G);
      for (const s of V) el('path', { d: line(s), stroke: c, 'stroke-width': 2.6 }, G);
      break;
    }
  }
}

/* לכל מגרש סגנון משלו: הסגנון שנבחר לא חוזר על סגנון של מגרש קרוב (עד 260 יחידות) */
const drawn: { x: number; y: number; style: string }[] = [];
export function pickFence(cx: number, cy: number, wanted?: string): FenceStyle {
  if (wanted && (FENCE_STYLES as readonly string[]).includes(wanted)) { drawn.push({ x: cx, y: cy, style: wanted }); return wanted as FenceStyle; }
  const v = rngAt(cx, cy, 72), order: FenceStyle[] = [...FENCE_STYLES];
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(v.r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const near = new Set(drawn.filter(d => Math.hypot(d.x - cx, d.y - cy) < 260).map(d => d.style));
  const style = order.find(s => !near.has(s)) ?? order[0];
  drawn.push({ x: cx, y: cy, style });
  return style;
}
