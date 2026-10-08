/* דף דוגמאות (?sample=animals / ?sample=trains): מציג את כל הסוגים והגוונים זה לצד זה, בשטח פתוח ליד הכפר,
   כדי שהבעלים יאשר את המראה לפני שהם מתפזרים בעולם */
import { el, n2 } from '../core/util';
import { rngAt } from '../core/rng';
import { ctx } from '../world/context';
import { animateTo } from '../camera/camera';
import { view } from '../camera/view';
import { WILD, setLeg, type WildKind } from './wildlife-art';
import { loco, car, LOCOS } from './train-art';

export function showSample(kind: string) {
  const X = 600, Y = 380, L = ctx.L.actors;
  if (kind === 'animals') {
    const kinds = Object.keys(WILD) as WildKind[];
    kinds.forEach((k, row) => {
      for (let i = 0; i < 4; i++) {
        const x = X + i * (k === 'bear' ? 56 : 36), y = Y + row * 34 + (k === 'bear' ? 14 : 0);
        const g = el('g', { transform: `translate(${n2(x)},${n2(y)}) scale(${i % 2 ? -1 : 1},1)` }, L);
        const p = WILD[k](g, rngAt(x, y, 81));
        p.legs.forEach((lg, j) => setLeg(lg, p.legBase[j] ?? [0, -2], i * .17 + j * .5, i === 3 ? 1 : 0, k === 'bear' ? 3 : 1.6));
      }
    });
    animateTo(view.fitK * 7, X + 60, Y + 70, 1);
  } else if (kind === 'trains') {
    LOCOS.forEach((k, row) => {
      const y = Y - 40 + row * 46, g = el('g', { transform: `translate(${n2(X - 120)},${n2(y)})` }, L);
      el('path', { d: `M-10,0h330`, stroke: '#7d868b', 'stroke-width': 1.6 }, g);
      let x = 0;
      for (let i = 0; i < 3; i++) x += car(g, k, x, i).length + 4;
      loco(g, k, x);
    });
    animateTo(view.fitK * 4.6, X + 40, Y + 50, 1);
  }
}
