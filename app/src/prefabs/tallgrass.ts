/* עשב גבוה (tallGrass): כתם של עשב גבוה בערבה, ואבן שטוחה לידו. הבית של לטאה (actors/lizards.ts):
   היא מתחבאת בעשב, יוצאת להשתזף על האבן ובורחת חזרה לעשב.
   x, y: מרכז הכתם (קו הקרקע). rock: [dx, dy] – מקום האבן ביחס למרכז (תמיד מדרום לכתם, כדי שהלטאה לא תיראה "על" העשב). */
import { el, n2, blob } from '../core/util';
import { rngAt } from '../core/rng';
import { ctx, prop, block } from '../world/context';
import { register } from './registry';

export const GRASS_RX = 30, GRASS_RY = 11;

function tallGrass(o: any) {
  const { x, y, rock = [26, 22] } = o, rg = rngAt(x, y, 61), G = ctx.L.groundProps;
  el('path', { d: blob(x, y, GRASS_RX + 6, GRASS_RY + 4, 12, .14, rg.rand(0, 6)), fill: '#7fa04a', opacity: .45 }, G);
  // הגבעולים: מהאחורי לקדמי, שלושה גוונים, חלקם עם שיבולת זרעים
  const g = prop(y + GRASS_RY), cols = ['#6f9a3e', '#86ad4c', '#a3b85a'], d = ['', '', ''];
  let seeds = '';
  const blades: number[][] = [];
  for (let i = 0; i < 70; i++) {
    const a = rg.rand(0, Math.PI * 2), r = Math.sqrt(rg.r());
    blades.push([x + Math.cos(a) * GRASS_RX * r, y + Math.sin(a) * GRASS_RY * r]);
  }
  blades.sort((p, q) => p[1] - q[1]);
  for (const [bx, by] of blades) {
    const h = rg.rand(11, 19), lean = rg.rand(-5, 5), c = Math.floor(rg.r() * 3);
    const tx = bx + lean, ty = by - h;
    d[c] += `M${n2(bx - .7)},${n2(by)}Q${n2(bx + lean * .3)},${n2(by - h * .6)} ${n2(tx)},${n2(ty)}Q${n2(bx + lean * .3 + .6)},${n2(by - h * .55)} ${n2(bx + .7)},${n2(by)}Z`;
    if (rg.chance(.22)) seeds += blob(tx, ty - 1.4, .9, 2.2, 6, .1, bx);
  }
  d.forEach((p, i) => el('path', { d: p, fill: cols[i] }, g));
  el('path', { d: seeds, fill: '#d9c47a' }, g);
  // אבן שטוחה להשתזפות
  const rx = x + rock[0], ry = y + rock[1], s = prop(ry);
  el('ellipse', { cx: rx + 1, cy: ry + 1, rx: 10.5, ry: 3.8, fill: 'rgba(40,60,20,.2)' }, s);
  el('path', { d: blob(rx, ry - 1, 9.5, 4, 9, .1, rg.rand(0, 6)), fill: '#b9b2a2', stroke: '#8f887a', 'stroke-width': .6 }, s);
  el('path', { d: blob(rx - 1, ry - 2.2, 7, 2.6, 8, .1, rg.rand(0, 6)), fill: '#cfc8b8' }, s);
  block(x - GRASS_RX - 6, y - GRASS_RY - 20, x + GRASS_RX + 6, Math.max(y + GRASS_RY, ry + 6) + 4);
}

register({ tallGrass });
