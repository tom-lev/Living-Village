/* דף דוגמאות (?sample=animals / ?sample=trains): מציג את כל הסוגים והגוונים זה לצד זה, בשטח פתוח ליד הכפר,
   כדי שהבעלים יאשר את המראה לפני שהם מתפזרים בעולם */
import { el, n2 } from '../core/util';
import { rngAt } from '../core/rng';
import { ctx } from '../world/context';
import { animateTo } from '../camera/camera';
import { view } from '../camera/view';
import { WILD, setLeg, frontBack, type WildKind } from './wildlife-art';
import { Legs } from './quad';
import { hopPose } from './wildlife';
import { loco, car, LOCOS } from './train-art';

export function showSample(kind: string) {
  const X = 600, Y = 380, L = ctx.L.actors;
  if (kind === 'animals') {
    const kinds = Object.keys(WILD) as WildKind[];
    kinds.forEach((k, row) => {
      for (let i = 0; i < 4; i++) {
        const x = X + i * (k === 'bear' ? 56 : k === 'deer' ? 50 : 36), y = Y + row * 34 + (k === 'bear' ? 14 : k === 'deer' ? 30 : 0);
        const g = el('g', { transform: `translate(${n2(x)},${n2(y)}) scale(${i % 2 ? -1 : 1},1)` }, L);
        const p = WILD[k](g, rngAt(x, y, 81));
        // הרגליים בשלבים שונים של הצעד (העמודה האחרונה בהליכה), והארנבת/הסנאי בשלבי קפיצה
        if (p.quad) new Legs(p.quad.specs, { far: p.quad.far, near: p.quad.near }, p.quad.gait, p.quad.A, p.quad.lift).pose(i * .23, i ? 1 : 0);
        if (p.hop) hopPose(p.hop, k, i * .27, i ? 1 : 0, 0, 0, x);
        p.legs.forEach((lg, j) => setLeg(lg, p.legBase[j] ?? [0, -2], i * .17 + j * .5, i === 3 ? 1 : 0, k === 'bear' ? 3 : 1.6));
      }
    });
    animateTo(view.fitK * 7, X + 60, Y + 70, 1);
  } else if (kind === 'bear') {
    // דוב: ארבעה שלבים של צעד, עמידה, מלפנים, מאחור, ועומד על שתיים ומתגרד בעץ
    for (let i = 0; i < 5; i++) {
      const x = X - 60 + i * 56, y = Y + 30, g = el('g', { transform: `translate(${x},${y})` }, L);
      const p = WILD.bear(g, rngAt(X, Y, 81));
      new Legs(p.quad!.specs, { far: p.quad!.far, near: p.quad!.near }, 'walk', p.quad!.A, p.quad!.lift).pose(i * .25, i < 4 ? 1 : 0);
    }
    const p = WILD.bear(el('g', { opacity: 0 }, L), rngAt(X, Y, 81));
    for (const [dx, front] of [[-40, true], [10, false]] as [number, boolean][]) {
      const V = frontBack('bear', el('g', { transform: `translate(${X + dx},${Y + 90})` }, L), p.c!, p.s!, front);
      V.legs.forEach((l: any, j: number) => l.setAttribute('d', `M${V.base[j][0]},${V.base[j][1]}L${V.base[j][0]},0`));
    }
    // מתרומם (באמצע) ועומד על שתיים עם הגב לגזע
    el('rect', { x: X + 108, y: Y + 30, width: 5, height: 60, fill: '#7a5a3a' }, L);
    for (const [dx, r] of [[70, .5], [130, 1]]) {
      const q = WILD.bear(el('g', { transform: `translate(${X + dx},${Y + 90})` }, L), rngAt(X, Y, 81)), Q = new Legs(q.quad!.specs, { far: q.quad!.far, near: q.quad!.near }, 'walk', q.quad!.A, q.quad!.lift);
      const e = r * r * (3 - 2 * r); Q.pivot = [-10.7, -15]; Q.rear = r; Q.rearA = -74 * e; Q.rearLift = 2.2 * e; Q.pose(0, 0);
      const T = `translate(0,${n2(-Q.rearLift)}) rotate(${Q.rearA} -10.7 -15) `;
      q.quad!.bodyG.setAttribute('transform', T); q.head!.setAttribute('transform', `${T}rotate(${r * 48} 12 -19)`);
    }
    animateTo(view.fitK * 9, X + 60, Y + 50, 1);
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
