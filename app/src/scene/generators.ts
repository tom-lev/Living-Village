/* מחוללים: רצים אחרי שכל האובייקטים הונחו (כי הם צריכים לדעת איפה כבר יש מבנים) */
import { el, n2, circ, blob } from '../core/util';
import { rand, pick, R, rngAt } from '../core/rng';
import { ctx, prop, NO_TREE, inWater } from '../world/context';
import { geo, edgeAt, treeOk } from '../world/geometry';
import { pine, roundTree } from '../prefabs/nature';
import { PREFABS } from '../prefabs/registry';
import { placeOk } from '../world/walk';

const inRects = (x: number, y: number, rects: number[][]) => rects.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1);

export const GENERATORS: Record<string, (o: any) => void> = {
  /** אבנים פזורות בפס */
  rocks(o) {
    const { B } = ctx;
    for (let i = 0; i < o.count; i++) {
      const x = rand(B.x0 + 20, B.x1 - 20), y = rand(o.y0, o.y1);
      el('path', { d: blob(x, y, rand(7, 16), rand(5, 9), 6, .15, rand(0, 6)), fill: pick(['#a9b2b7', '#9aa3a8', '#b5bdc1']), stroke: '#8a9398', 'stroke-width': .8 }, ctx.L.groundProps);
    }
  },

  /** פנסי רחוב לאורך דרכי הכפר, לסירוגין משני הצדדים.
   *  9. רק בכפר (בקשת הבעלים): לא ביער ולא בדרכים שיוצאות ממנו, לא על שביל, ולא צמוד לפנס אחר (צמתים) */
  streetLamps(o) {
    const { spacing = 150, offset = 31 } = o, { home } = ctx, M = 40, lamps: number[][] = [];
    for (const E of geo.EDGES) {
      for (let s = 40; s < E.len - 30; s += spacing) {
        const p = edgeAt(E, s), side = (Math.round(s / spacing) % 2 ? 1 : -1), x = p.x - p.ty * offset * side, y = p.y + p.tx * offset * side;
        if (NO_TREE.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 - 10 && y < y1 + 30) || inWater(x, y, 10)) continue;
        if (x < home.x0 - M || x > home.x1 + M || y < home.y0 - M || y > home.y1 + M) continue;
        if (!placeOk(x - 3, y - 3, x + 3, y + 1) || lamps.some(q => Math.hypot(q[0] - x, q[1] - y) < spacing * .55)) continue;
        lamps.push([x, y]);
        // הזרוע של הפנס פונה אל הדרך, כדי שהאור ייפול עליה (ליד דרך אופקית, שהפנס מעליה או מתחתיה: לכיוון ההמשך של הדרך)
        PREFABS.lamp({ type: 'lamp', x, y, flip: Math.abs(p.x - x) > 4 ? (p.x > x ? 1 : -1) : (p.tx >= 0 ? 1 : -1) });
      }
    }
  },

  /** עמודי חשמל מעץ עם חוטים לאורך אחת הדרכים החיצוניות */
  powerLine(o) {
    const E = geo.OUTER[o.road], tops: number[][] = [], { spacing = 120, offset = 40 } = o;
    for (let s = 60; s < E.len; s += spacing) {
      const p = edgeAt(E, s), x = p.x + p.ty * offset, y = p.y - p.tx * offset, g = prop(y);
      el('path', { d: `M${n2(x)},${n2(y)}v-52M${n2(x - 9)},${n2(y - 46)}h18`, stroke: '#7a4f2a', 'stroke-width': 2.2 }, g);
      el('path', { d: circ(x - 7, y - 48, 1.4) + circ(x, y - 48, 1.4) + circ(x + 7, y - 48, 1.4), fill: '#cfd6da' }, g);
      tops.push([x, y - 48]);
    }
    let d = '';
    for (let i = 0; i < tops.length - 1; i++) for (const off of [-7, 0, 7]) {
      const a = tops[i], b = tops[i + 1];
      d += `M${n2(a[0] + off)},${n2(a[1])}Q${n2((a[0] + b[0]) / 2 + off)},${n2((a[1] + b[1]) / 2 + 9)} ${n2(b[0] + off)},${n2(b[1])}`;
    }
    el('path', { d, fill: 'none', stroke: '#4a4a55', 'stroke-width': .7, opacity: .8 }, prop(1e6));
  },

  /** יער: שתילה אקראית עם צפיפות לפי אזורים, בלי עצים על דרכים, מים או מבנים */
  forest(o) {
    const { B, home } = ctx, trees: number[][] = [];
    const inHome = (x: number, y: number) => x > home.x0 && x < home.x1 && y > home.y0 && y < home.y1;
    const dense = (x: number, y: number) => !inHome(x, y) || inRects(x, y, o.villageForest);
    const grid = new Map<string, number[][]>(), cell = 30;
    const near = (x: number, y: number) => {
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      for (let i = -1; i <= 1; i++) for (let j = -2; j <= 2; j++)
        for (const t of grid.get((cx + i) + ',' + (cy + j)) || []) if ((t[0] - x) ** 2 + ((t[1] - y) * 1.4) ** 2 < 30 * 30) return true;
      return false;
    };
    const dens = o.density;
    for (let i = 0; i < o.attempts && trees.length < o.max; i++) {
      const x = rand(B.x0, B.x1), y = rand(B.y0, B.y1);
      if (R() > (dense(x, y) ? (inHome(x, y) ? dens.village : dens.forest) : dens.open)) continue;
      if (!treeOk(x, y, o.noBands) || near(x, y)) continue;
      trees.push([x, y]);
      const k = Math.floor(x / cell) + ',' + Math.floor(y / cell); (grid.get(k) || grid.set(k, []).get(k)).push([x, y]);
    }
    // סוג העץ וגודלו נקבעים לפי המיקום שלו (rngAt), לא לפי הסדר: כך הוספה או הסרה של עצים (קרחת, אובייקט חדש) לא משנה את שאר היער
    for (const [x, y] of trees) {
      const v = rngAt(x, y, 7);
      inRects(x, y, o.pineZones) || v.r() < o.pineChance ? pine(x, y, v.rand(1.5, 2.1), y < o.snowLine) : roundTree(x, y, v.rand(1.3, 1.75));
    }
  },
};
