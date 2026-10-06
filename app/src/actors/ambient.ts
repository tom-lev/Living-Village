/* אווירה: עננים שנודדים לאט עם צל על הקרקע, ולהקת ציפורים שחוצה מדי פעם */
import { el, n2, circ, show } from '../core/util';
import { inView } from '../camera/view';
import { rand } from '../core/rng';
import { ctx } from '../world/context';

export function clouds(o: any) {
  const { B, L } = ctx;
  const spots = [...o.fixed, ...Array.from({ length: o.random }, () => [rand(B.x0, B.x1), rand(B.y0 + 200, B.y1 - 300), rand(.9, 1.3)])];
  const list = spots.map(([x, y, s]) => {
    const d = circ(0, 0, 26 * s) + circ(-26 * s, 8 * s, 17 * s) + circ(26 * s, 7 * s, 19 * s) + circ(-8 * s, 14 * s, 18 * s) + circ(12 * s, 14 * s, 17 * s);
    const sh = el('path', { d, fill: '#2f5a1a', opacity: .08 }, L.cloudShadows);
    const c = el('g', null, L.clouds);
    el('path', { d, fill: '#ffffff', opacity: .92 }, c);
    el('path', { d: circ(-6 * s, -6 * s, 14 * s), fill: '#fff' }, c);
    return { sh, c, x, y, r: 60 * s, v: rand(o.speedMin, o.speedMax) };
  });
  return (dt: number) => {
    for (const c of list) {
      c.x += c.v * dt; if (c.x > B.x1 + 160) c.x = B.x0 - 160;
      // ענן וצל נבדקים לחוד (הצל רחוק מהענן)
      const on = inView(c.x, c.y, c.r), onS = inView(c.x + 40, c.y + 110, c.r);
      show(c.c, on); show(c.sh, onS);
      if (on) c.c.setAttribute('transform', `translate(${n2(c.x)},${n2(c.y)})`);
      if (onS) c.sh.setAttribute('transform', `translate(${n2(c.x + 40)},${n2(c.y + 110)})`);
    }
  };
}

export function flock(o: any) {
  const { B, L } = ctx, F: any = { g: el('g', { display: 'none' }, L.clouds), birds: [], on: false, x: -100, y: 300, wait: o.firstWait ?? 6 };
  const shape = [[0, 0], [-14, -9], [-14, 9], [-28, -2]];
  for (let i = 0; i < o.birds; i++) F.birds.push([el('path', { fill: 'none', stroke: '#3b2f25', 'stroke-width': 1.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, F.g), shape[i % 4], rand(0, 6)]);
  return (dt: number, T: number) => {
    // F.on: הלהקה בדרך (גם כשהיא מחוץ למסך); מוצגת רק כשהיא גם נראית
    if (F.x > B.x1 + 80 || !F.on) {
      F.wait -= dt;
      if (F.wait <= 0) { F.x = B.x0 - 60; F.y = rand(B.y0 + 300, B.y1 - 400); F.wait = rand(o.waitMin, o.waitMax); F.on = true; }
      else if (F.x > B.x1 + 80) F.on = false;
    }
    const vis = F.on && inView(F.x - 14, F.y, 30);
    show(F.g, vis);
    if (!F.on) return;
    F.x += o.speed * dt; F.y -= 6 * dt;
    if (vis) for (const [p, [ox, oy], ph] of F.birds) {
      const f = Math.sin(T * 9 + ph) * 4, x = F.x + ox, y = F.y + oy + Math.sin(T * 1.5 + ph) * 2;
      p.setAttribute('d', `M${n2(x - 6)},${n2(y + f * .3)}Q${n2(x - 3)},${n2(y - f)} ${n2(x)},${n2(y)}Q${n2(x + 3)},${n2(y - f)} ${n2(x + 6)},${n2(y + f * .3)}`);
    }
  };
}
