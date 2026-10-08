/* רכבות קיטור (משימה 10): מדי פעם (כל 45–90 שניות) רכבת אחת נכנסת מקצה העולם, נוסעת לאט לאורך המסילה,
   מאטה ועוצרת בתחנה לכמה שניות, וממשיכה עד הקצה השני. חמשת סוגי הקטרים מגיעים בתורם, ובשני הכיוונים.
   עשן עולה מהארובה (יותר בנסיעה, מעט בעמידה), הגלגלים מסתובבים. ההיגיון רץ תמיד, הציור רק כשהרכבת על המסך */
import { el, n2, show } from '../core/util';
import { rngAt } from '../core/rng';
import { ctx } from '../world/context';
import { inView } from '../camera/view';
import { loco, car, LOCOS, type Wheel } from './train-art';
import { dynamics } from './people';

export function trains(o: { every: [number, number]; speed: number; stopAt: number; stop: number }) {
  const rail = (ctx.world.objects as any[]).find(r => r.type === 'railway');
  if (!rail) return () => {};
  const { B } = ctx, Y = rail.y, rg = rngAt(Y, 5, 86);
  let n = 0, wait = rg.rand(8, 20), cur: any = null;
  // עשן: מאגר קבוע של עננים קטנים בשכבת האוויר (בלי ליצור ולמחוק אלמנטים בכל רגע)
  const puffs = Array.from({ length: 14 }, () => ({ e: el('circle', { r: 4, fill: '#f4f1ec', opacity: 0 }, ctx.L.air), age: 9, x: 0, y: 0, dx: 0 }));
  let puffT = 0;

  function spawn() {
    const kind = LOCOS[n % LOCOS.length], dir = n % 2 ? -1 : 1; n++;
    const g = el('g', null, ctx.L.actors), body = el('g', null, g), wheels: Wheel[] = [];
    let x = 0;
    const cars = kind === 'express' ? 4 : 3;
    // מיקום הגלגל יחסי לקרון או לקטר שלו (שכבר מוזז למקומו ברכבת)
    for (let i = 0; i < cars; i++) { const c = car(body, kind, x, i); wheels.push(...c.wheels); x += c.length + 4; }
    const L = loco(body, kind, x); wheels.push(...L.wheels);
    const len = x + L.length;
    // הרכבת פונה לכיוון הנסיעה (הקטר מקדימה): בנסיעה שמאלה משקפים את כל הרכבת
    body.setAttribute('transform', dir > 0 ? `translate(${-len},0)` : `scale(-1,1) translate(${-len},0)`);
    cur = { g, el: g, y: Y + 2, dir, len, head: dir > 0 ? B.x0 - 40 : B.x1 + 40, speed: 0, stopped: 0, served: false, wheels, chimney: L.chimney, rot: 0, kind };
    dynamics.push(cur);   // מיון עומק יחד עם האנשים
  }

  (window as any).__train = () => cur;   // לבדיקות
  return (dt: number) => {
    if (!cur) { wait -= dt; if (wait <= 0) spawn(); }
    if (cur) {
      const c = cur, target = o.speed;
      // מאטים לפני התחנה, עומדים בה, ומאיצים לאט אחריה (ראש הרכבת עוצר קצת אחרי התחנה)
      const stopX = o.stopAt + c.dir * 60, toStop = (stopX - c.head) * c.dir;
      let want = target;
      if (!c.served) want = toStop > 0 ? Math.min(target, Math.max(4, toStop * .35)) : 0;
      if (!c.served && toStop <= .5) { c.stopped += dt; want = 0; if (c.stopped > o.stop) c.served = true; }
      c.speed += (want - c.speed) * Math.min(1, dt * (want > c.speed ? .5 : 1.5));
      c.head += c.dir * c.speed * dt;
      c.rot += c.speed * dt;
      const tail = c.head - c.dir * c.len, mid = (c.head + tail) / 2;
      if ((c.dir > 0 && tail > B.x1 + 40) || (c.dir < 0 && tail < B.x0 - 40)) {
        c.g.remove(); dynamics.splice(dynamics.indexOf(c), 1); cur = null; wait = rg.rand(o.every[0], o.every[1]);
      } else {
        // עשן מהארובה: נקודת הארובה בעולם (הקטר מקדימה)
        const cx = c.head - c.dir * (c.len - c.chimney[0]), cy = Y + c.chimney[1];
        puffT -= dt;
        if (puffT <= 0) {
          puffT = c.speed > 3 ? .45 : 1.4;
          const p = puffs.reduce((a, b) => a.age > b.age ? a : b);
          p.age = 0; p.x = cx; p.y = cy; p.dx = -c.dir * c.speed * .25 + (rg.r() - .5) * 4;
        }
        const on = inView(mid, Y - 20, c.len / 2 + 60);
        show(c.g, on);
        if (on) {
          c.g.setAttribute('transform', `translate(${n2(c.head)},${n2(Y)})`);
          const a = (c.rot * 180 / Math.PI / 6).toFixed(1);
          for (const w of c.wheels) w.g.setAttribute('transform', `translate(${n2(w.x)},${n2(-w.r)}) rotate(${a})`);
        }
      }
    }
    for (const p of puffs) {
      if (p.age > 3) { if (p.age < 9) { p.age = 9; p.e.setAttribute('opacity', '0'); } continue; }
      p.age += dt;
      const u = p.age / 3, x = p.x + p.dx * p.age, y = p.y - 26 * p.age;
      if (!inView(x, y, 30)) continue;
      p.e.setAttribute('cx', n2(x)); p.e.setAttribute('cy', n2(y)); p.e.setAttribute('r', n2(3 + 9 * u));
      p.e.setAttribute('opacity', ((u < .1 ? u / .1 : 1 - u) * .75).toFixed(2));
    }
  };
}
