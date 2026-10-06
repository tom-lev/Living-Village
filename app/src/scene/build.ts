/* בניית הסצנה מקובץ העולם: גאומטריה → פני שטח → אובייקטים → מחוללים */
import { setSeed } from '../core/rng';
import { setPalette } from '../core/palette';
import { ctx, initLayers, sortStatics, NO_TREE, statics } from '../world/context';
import { buildGeometry } from '../world/geometry';
import type { WorldData } from '../world/types';
import { PREFABS } from '../prefabs/registry';
import '../prefabs/nature';
import '../prefabs/buildings';
import '../prefabs/props';
import '../prefabs/areas';
import '../prefabs/village';
import { buildTerrain } from './terrain';
import { GENERATORS } from './generators';
import { addLabel } from '../world/labels';

const rect = ([x0, y0, x1, y1]: number[]) => ({ x0, y0, x1, y1 });

export function buildScene(w: WorldData, svgS: SVGSVGElement, svgD: SVGSVGElement) {
  ctx.world = w; ctx.B = rect(w.bounds); ctx.home = rect(w.home);
  setSeed(w.seed);
  setPalette(w.palettes?.find(p => p.name === w.palette), w.palettes);
  initLayers(svgS, svgD);
  buildGeometry(w);
  buildTerrain(w);
  for (const o of w.objects) {
    const f = PREFABS[o.type];
    if (!f) { console.warn('אין prefab בשם', o.type, o); continue; }
    if (o.id) ctx.named[o.id] = o;
    const n0 = NO_TREE.length, s0 = statics.length;
    f(o);
    // התווית יושבת ממש מעל האובייקט: הקצה העליון של החלק הגדול שצויר (גג, ארובה). אם אין ציור גבוה, השטח שהאובייקט חסם
    let top: number | undefined;
    if (o.name) {
      // החלק הגדול ביותר שצויר (הבית עצמו, לא עץ או לול בחצר)
      let area = 0;
      for (const st of statics.slice(s0)) { try { const bb = st.el.getBBox(); if (bb.width * bb.height > area) { area = bb.width * bb.height; top = bb.y; } } catch {} }
      if (top === undefined && NO_TREE.length > n0) top = Math.min(...NO_TREE.slice(n0).map(r => r[1])) + 8;
    }
    if (o.name && o.type !== 'shop' && o.type !== 'station') addLabel(o, top);   // לחנות ולתחנה כבר יש שלט עם השם
  }
  for (const g of w.generators) {
    const f = GENERATORS[g.type];
    if (!f) { console.warn('אין מחולל בשם', g.type, g); continue; }
    f(g);
  }
  sortStatics();
}
