/* טבע: עצים, דקלים, צבאים */
import { TREE_MIN } from '../world/scale';
import { el, n2, circ, shade } from '../core/util';
import { rand, pick, R, rngAt } from '../core/rng';
import { prop, block } from '../world/context';
import { register } from './registry';

export function pine(x: number, y: number, s: number, snowy = false) {
  s = Math.max(s * 1.35, TREE_MIN / 29);   // פרופורציות: עץ לפחות פי 2 מגובה אדם (הציור גבוה כ-29·s)
  // מעט צורות לכל עץ (גוף אחד והדגשה אחת לכל שלוש הקומות)
  // כל עץ קצת אחר (אקראיות מקומית, כדי לא להזיז את שאר העולם): רוחב, גובה, הטיה, גוון, גזע
  const v = rngAt(x, y, 3), wf = v.rand(.88, 1.12), hf = v.rand(.9, 1.12), lean = v.rand(-.06, .06) * s, trunk = v.rand(5, 7.5);
  const g = prop(y);
  el('ellipse', { cx: x + 2 * s, cy: y, rx: 9 * s * wf, ry: 2.6 * s, fill: 'rgba(40,70,20,.22)' }, g);
  el('rect', { x: x - 1.4 * s, y: y - trunk * s, width: 2.8 * s, height: (trunk + .5) * s, rx: .8 * s, fill: shade('#8b5a2b', v.rand(-.08, .08)) }, g);
  const tiers = [[5, 10.5, 14], [12, 8.5, 12], [18.5, 6.2, 10.5]].map(([dy, hw, th], i) => [(dy + trunk - 6) * hf, hw * wf * v.rand(.92, 1.08), th * hf * v.rand(.94, 1.06), lean * (i + 1) * 4]);
  const c = shade(pick(['#3f9150', '#3a8a4c', '#459a55']), v.rand(-.06, .06));
  let body = '', hl = '';
  for (const [dy, hw, th, lx] of tiers) {
    const by = y - dy * s, tx = x + lx;
    body += `M${n2(x - hw * s)},${n2(by)}L${n2(tx)},${n2(by - th * s)}L${n2(x + hw * s)},${n2(by)}Z`;
    hl += `M${n2(tx)},${n2(by - th * s)}L${n2(x + hw * s)},${n2(by)}L${n2(x + 1)},${n2(by)}Z`;
  }
  el('path', { d: body, fill: c, 'stroke-linejoin': 'round', stroke: c, 'stroke-width': 1.5 }, g);
  el('path', { d: hl, fill: shade(c, .12) }, g);
  if (snowy) {
    let sn = '';
    for (const [dy, hw, th, lx] of tiers) {
      const by = y - dy * s, ty = by - th * s, tx = x + lx;
      sn += `M${n2(tx - hw * s * .45)},${n2(ty + th * s * .45)}L${n2(tx)},${n2(ty)}L${n2(tx + hw * s * .45)},${n2(ty + th * s * .45)}l${n2(-hw * s * .15)},${n2(-th * s * .08)}l${n2(-hw * s * .15)},${n2(th * s * .1)}l${n2(-hw * s * .15)},${n2(-th * s * .1)}Z`;
    }
    el('path', { d: sn, fill: '#ffffff' }, g);
  }
}

export function roundTree(x: number, y: number, s: number, fruit = false) {
  s = Math.max(s * 1.4, TREE_MIN / 33);   // פרופורציות (world/scale.ts): עץ לפחות פי 2 מגובה אדם (הציור גבוה כ-33·s עד 37·s)
  // כל עץ קצת אחר: גובה הגזע, גודל ומיקום הגושים בצמרת, וגוון
  const v = rngAt(x, y, 5), tk = v.rand(12.5, 15.5), cr = v.rand(.9, 1.1), sx = v.rand(-1.2, 1.2) * s;
  const g = prop(y);
  el('ellipse', { cx: x + 2 * s, cy: y, rx: 10 * s * cr, ry: 3 * s, fill: 'rgba(40,70,20,.22)' }, g);
  el('path', { d: `M${n2(x - 1.6 * s)},${n2(y)}L${n2(x - 1 + sx * .3)},${n2(y - tk * s)}L${n2(x + 1 + sx * .3)},${n2(y - tk * s)}L${n2(x + 1.6 * s)},${n2(y)}Z`, fill: shade('#8b5a2b', v.rand(-.08, .08)) }, g);
  const c = shade(pick(['#5db85a', '#63bd5c', '#55ad55', '#7cc35a']), v.rand(-.05, .05)), dy = (tk - 14) * s;
  let crown = circ(x + sx, y - 22 * s - dy, 10.5 * s * cr) + circ(x - 6.5 * s * cr + sx, y - 16.5 * s - dy + v.rand(-1, 1) * s, 7 * s * v.rand(.88, 1.1)) + circ(x + 6.5 * s * cr + sx, y - 17 * s - dy + v.rand(-1, 1) * s, 7.5 * s * v.rand(.88, 1.1));
  if (v.chance(.35)) crown += circ(x + sx + v.rand(-4, 4) * s, y - 29 * s - dy, 5.5 * s * v.rand(.8, 1.1));   // לפעמים גוש נוסף למעלה
  el('path', { d: crown, fill: c }, g);
  el('path', { d: circ(x - 3 * s + sx, y - 26 * s - dy, 4.2 * s), fill: shade(c, .2) }, g);
  let ticks = '';
  for (let i = 0; i < 3; i++) { const tx = x + rand(-6, 6) * s, ty = y - rand(14, 27) * s; ticks += `M${n2(tx)},${n2(ty)}q${n2(1.6 * s)},${n2(-1 * s)} ${n2(1.8 * s)},${n2(1 * s)}`; }
  el('path', { d: ticks, fill: 'none', stroke: shade(c, -.25), 'stroke-width': .9, 'stroke-linecap': 'round' }, g);
  if (fruit || R() < .22) {
    let fr = '';
    for (let i = 0; i < 5; i++) fr += circ(x + rand(-9, 9) * s, y - rand(15, 28) * s, 1.3 * s);
    el('path', { d: fr, fill: '#e8513f' }, g);
  }
}

export function palm(x: number, y: number, s: number) {
  const g = prop(y);
  el('ellipse', { cx: x + 6 * s, cy: y + 1, rx: 12 * s, ry: 3 * s, fill: 'rgba(120,90,40,.2)' }, g);
  el('path', { d: `M${x},${y}Q${x + 6 * s},${y - 20 * s} ${x + 2 * s},${y - 40 * s}`, stroke: '#a0643a', 'stroke-width': 4 * s, fill: 'none', 'stroke-linecap': 'round' }, g);
  let lv = ''; const tx = x + 2 * s, ty = y - 40 * s;
  for (const a of [-160, -120, -60, -20, 30, 150]) {
    const r = a * Math.PI / 180, ex = tx + Math.cos(r) * 20 * s, ey = ty + Math.sin(r) * 12 * s + 6 * s;
    lv += `M${n2(tx)},${n2(ty)}Q${n2((tx + ex) / 2)},${n2((ty + ey) / 2 - 8 * s)} ${n2(ex)},${n2(ey)}`;
  }
  el('path', { d: lv, stroke: '#3f9a4a', 'stroke-width': 4.5 * s, fill: 'none', 'stroke-linecap': 'round' }, g);
  el('path', { d: circ(tx - 2 * s, ty + 3 * s, 2 * s) + circ(tx + 2 * s, ty + 4 * s, 2 * s), fill: '#7a4a24' }, g);
}

export function deer(x: number, y: number, f: number, antlers: boolean) {
  const g = prop(y), b = el('g', { transform: `translate(${x},${y}) scale(${f},1)` }, g), c = '#b5733a';
  el('ellipse', { cx: 0, cy: 1, rx: 13, ry: 3, fill: 'rgba(40,70,20,.22)' }, b);
  el('path', { d: 'M-8,-10v10M-4,-10v10M6,-10v10M9,-10v10', stroke: shade(c, -.25), 'stroke-width': 1.8, 'stroke-linecap': 'round' }, b);
  el('ellipse', { cx: 0, cy: -13, rx: 12, ry: 5.5, fill: c }, b);
  el('path', { d: circ(-3, -14, 1) + circ(3, -15, 1) + circ(-7, -12, .9), fill: '#fff3d6' }, b);
  el('path', { d: 'M8,-15l5,-12l4,1l-3,12z', fill: c }, b);
  el('ellipse', { cx: 17, cy: -27, rx: 5, ry: 3.2, fill: c, transform: 'rotate(15 17 -27)' }, b);
  el('circle', { cx: 18, cy: -28, r: .7, fill: '#2b2220' }, b);
  el('path', { d: 'M12,-30l-3,-3', stroke: c, 'stroke-width': 2, 'stroke-linecap': 'round' }, b);
  if (antlers) el('path', { d: 'M14,-30l-2,-9l-3,-3M12,-37l3,-3M16,-30l2,-9l3,-2M18,-36l-3,-3', fill: 'none', stroke: '#8a5a35', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, b);
  el('path', { d: 'M-12,-15l-3,-2', stroke: '#fff3d6', 'stroke-width': 2, 'stroke-linecap': 'round' }, b);
  block(x - 20, y - 45, x + 25, y + 8);
}

register({
  pine: o => pine(o.x, o.y, o.s ?? 1.8, !!o.snowy),
  roundTree: o => roundTree(o.x, o.y, o.s ?? 1.5, !!o.fruit),
  palm: o => palm(o.x, o.y, o.s ?? 1),
  deer: o => deer(o.x, o.y, o.flip ?? 1, !!o.antlers),
});
