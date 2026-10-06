/* חיות: סוסים וכבשים במכלאה, ברווזים ודג באגם, פרפרים מעל השדה */
import { el, n2, circ, rrect, shade, wrap1, clamp, show } from '../core/util';
import { inView } from '../camera/view';
import { rand, pick } from '../core/rng';
import { ctx, fxAt, ripple } from '../world/context';

/** סוס: רועה ומרים ראש מדי פעם; הזנב מתנופף לאט */
export class Horse {
  [k: string]: any;
  constructor(o: any) {
    const { x, y, color, mane, flip = 1, scale = 1 } = o;
    const g = el('g', { transform: `translate(${x},${y}) scale(${flip * scale},${scale})` }, ctx.L.pad);
    this.g = g; this.x = x; this.y = y;
    el('ellipse', { cx: 0, cy: 1, rx: 30, ry: 5, fill: 'rgba(60,40,10,.22)' }, g);
    const dk = shade(color, -.2);   // בלי קווי מתאר: הצוואר, הראש והגוף מתמזגים לצורה אחת
    const tail = el('g', { transform: 'translate(-24,-34)' }, g), tl = el('g', null, tail), d0 = rand(0, 2.6);
    fxAt(x, y - 30, 50, t => tl.setAttribute('transform', `rotate(${(1 - 9 * Math.cos(wrap1((t + d0) / 2.6) * Math.PI * 2)).toFixed(1)})`));
    el('path', { d: 'M0,0q-8,6 -6,22q4,-8 6,-14z', fill: mane }, tl);
    el('path', { d: 'M-18,-30v28M14,-30v28', stroke: dk, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M-18,-1h3M14,-1h3', stroke: '#3b2f2a', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    el('path', { d: rrect(-26, -46, 50, 20, 10), fill: color }, g);
    el('path', { d: 'M-22,-30q22,7 42,0v1a10,10 0 0 1 -6,3h-30a10,10 0 0 1 -6,-3z', fill: shade(color, -.08) }, g);   // צל עדין בבטן
    el('path', { d: 'M-14,-28v27M20,-28v27', stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M-14,-1h3M20,-1h3', stroke: '#3b2f2a', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    // צוואר וראש: מסתובבים יחד סביב נקודה קבועה בתוך הכתף; הכתף מצוירת מעל, כך שהמפרק לא נראה
    this.neck = el('g', { transform: 'translate(16,-38)' }, g);
    el('path', { d: 'M-7,6C-6,-6 -1,-18 4,-26L13,-23C11,-12 10,-2 9,6Z', fill: color }, this.neck);
    el('path', { d: 'M-6,2C-5,-8 -1,-18 3,-27L7,-27C3,-18 0,-8 -1,2Z', fill: mane }, this.neck);
    // ראש: מוארך, עם לוע כהה יותר, אוזן ועין
    el('path', { d: 'M2,-30C6,-34 14,-33 24,-26C28,-23 28,-18 24,-17C17,-17 10,-19 4,-21C0,-23 -1,-28 2,-30Z', fill: color }, this.neck);
    el('path', { d: 'M19,-25C24,-24 27,-21 25,-18C22,-17 19,-18 18,-19Z', fill: shade(color, -.18) }, this.neck);
    el('path', { d: 'M4,-30l1,-6l4,5z', fill: dk }, this.neck);
    el('circle', { cx: 9, cy: -27, r: 1.2, fill: '#2b2220' }, this.neck);
    el('circle', { cx: 24.5, cy: -20.5, r: .8, fill: shade(color, -.45) }, this.neck);
    el('ellipse', { cx: 15, cy: -36, rx: 9, ry: 8, fill: color }, g);   // כתף: מכסה את בסיס הצוואר
    this.a = 0; this.timer = rand(1, 4); this.graze = true;
  }
  update(dt: number) {
    this.timer -= dt;
    if (this.timer <= 0) { this.graze = !this.graze; this.timer = this.graze ? rand(5, 11) : rand(2, 4); }
    this.a += ((this.graze ? 112 : 0) - this.a) * Math.min(1, dt * 2.2);
    if (!inView(this.x, this.y - 30, 50)) return;   // הסוס לא זז ממקומו: מספיק לא לעדכן את הצוואר
    this.neck.setAttribute('transform', `translate(16,-38) rotate(${this.a.toFixed(1)})`);
  }
}

/** כבשה: רועה, ומדי פעם הולכת לאט לנקודה אחרת בתוך המכלאה */
export class Sheep {
  [k: string]: any;
  constructor(x: number, y: number, area: any, scale = 1) {
    this.x = x; this.y = y; this.area = area; this.scale = scale; this.flip = 1; this.state = 'graze'; this.timer = rand(1, 5); this.phase = 0; this.head = 0;
    this.g = el('g', null, ctx.L.pad);
    el('ellipse', { cx: 0, cy: 1, rx: 12, ry: 3, fill: 'rgba(60,40,10,.22)' }, this.g);
    this.b = el('g', null, this.g);
    this.legs = [0, 1, 2, 3].map(() => el('path', { stroke: '#3b3633', 'stroke-width': 2, 'stroke-linecap': 'round' }, this.b));
    el('path', { d: circ(-6, -11, 5) + circ(0, -13, 6) + circ(6, -11, 5) + circ(-3, -7, 5) + circ(4, -7, 5) + circ(-8, -7, 4), fill: '#fbf8f2', stroke: '#e5ddcf', 'stroke-width': .8 }, this.b);
    this.hg = el('g', null, this.b);
    el('ellipse', { cx: 11, cy: -11, rx: 3.6, ry: 4.6, fill: '#3b3633' }, this.hg);
    el('ellipse', { cx: 9, cy: -14, rx: 2.4, ry: 1.2, fill: '#3b3633', transform: 'rotate(-25 9 -14)' }, this.hg);
    el('circle', { cx: 12.6, cy: -12, r: .7, fill: '#fff' }, this.hg);
  }
  update(dt: number) {
    this.timer -= dt; let ds = 0; const A = this.area;
    if (this.state === 'graze' && this.timer <= 0) {
      this.state = 'walk'; this.tx = clamp(this.x + rand(-80, 80), A.x0 + 40, A.x1 - 40); this.ty = clamp(this.y + rand(-50, 50), A.y0 + 50, A.y1 - 30);
    }
    if (this.state === 'walk') {
      const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
      if (d < 1) { this.state = 'graze'; this.timer = rand(3, 9); }
      else { ds = Math.min(d, 9 * dt); this.x += dx / d * ds; this.y += dy / d * ds; if (Math.abs(dx) > 2) this.fd = dx > 0 ? 1 : -1; }
    }
    if (this.fd) this.flip += (this.fd - this.flip) * Math.min(1, dt * 6);
    this.phase += ds / 6;
    this.head += ((this.state === 'graze' ? 1 : 0) - this.head) * Math.min(1, dt * 3);
    const on = inView(this.x, this.y - 8, 30); show(this.g, on);
    if (!on) return;
    const hx = [-7, -4, 4, 7], off = [0, .5, .5, 0];
    this.legs.forEach((l: any, i: number) => {
      const s = Math.sin((this.phase + off[i]) * Math.PI * 2) * 1.6 * (this.state === 'walk' ? 1 : 0);
      l.setAttribute('d', `M${hx[i]},-6L${n2(hx[i] + s)},0`);
    });
    this.hg.setAttribute('transform', `rotate(${(this.head * 40).toFixed(1)} 8 -11) translate(0,${(this.head * 3).toFixed(1)})`);
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y)}) scale(${this.scale})`);
    this.b.setAttribute('transform', `scale(${this.flip.toFixed(3)},1)`);
  }
}

/** ברווזה וברווזונים ששטים במעגל רך סביב מרכז האגם */
export function ducks(o: any) {
  const lake = ctx.named[o.lake], waterFx = ctx.L.waterFx;
  const list = o.family.map(({ scale, color: body }: any) => {
    const g = el('g', null, waterFx), b = el('g', { transform: `scale(${scale})` }, g);
    el('ellipse', { cx: 0, cy: 0, rx: 8, ry: 3, fill: '#4fb5da', opacity: .6 }, b);
    el('path', { d: 'M-8,-3q2,-7 10,-6q4,0 5,4l-1,5h-12q-3,0 -2,-3z', fill: body, stroke: shade(body, -.15), 'stroke-width': .6 }, b);
    el('path', { d: 'M-9,-5l-3,-2l1,4z', fill: body }, b);
    el('circle', { cx: 5, cy: -9, r: 3.4, fill: body, stroke: shade(body, -.15), 'stroke-width': .6 }, b);
    el('path', { d: 'M8,-9.5l3.4,1l-3.4,1z', fill: '#f29e38' }, b);
    el('circle', { cx: 6, cy: -10, r: .6, fill: '#222' }, b);
    return { g, flip: 1 };
  });
  const path = (th: number) => { const r = 1 + .1 * Math.sin(3 * th); return [lake.cx + Math.cos(th) * o.rx * r, lake.cy + Math.sin(th) * o.ry * r]; };
  let frame = 0;
  return (dt: number, T: number) => {
    frame++;
    list.forEach((d: any, i: number) => {
      const th = T * o.speed - i * .085 - (i ? .05 : 0), p = path(th), q = path(th + .01), f = q[0] >= p[0] ? 1 : -1;
      d.flip += (f - d.flip) * Math.min(1, dt * 4);
      const on = inView(p[0], p[1], 15); show(d.g, on);
      if (!on) return;
      d.g.setAttribute('transform', `translate(${n2(p[0])},${n2(p[1] + Math.sin(T * 3 + i) * .6)}) scale(${d.flip.toFixed(3)},1)`);
      if (i === 0 && frame % 50 === 0) ripple(p[0] - f * 8, p[1], 9, 3);
    });
  };
}

/** דג שקופץ מהאגם מדי פעם (לעתים רחוקות, בקשת איטית) */
export function fish(o: any) {
  const lake = ctx.named[o.lake], g = el('g', { display: 'none' }, ctx.L.waterFx), f = el('g', { transform: 'scale(1.1)' }, g);
  el('path', { d: 'M-8,0q8,-7 16,0q-8,7 -16,0z', fill: '#f2709c' }, f);
  el('path', { d: 'M-7,0l-5,-4v8z', fill: '#e2577f' }, f);
  el('circle', { cx: 4.5, cy: -1, r: .9, fill: '#222' }, f);
  const S: any = { t: -1, wait: 3 };
  return (dt: number) => {
    if (S.t < 0) {
      S.wait -= dt;
      if (S.wait <= 0) {
        const a = rand(0, 6.28), r = rand(.2, .6), x = lake.cx + Math.cos(a) * lake.rx * r, y = lake.cy + Math.sin(a) * lake.ry * r;
        Object.assign(S, { t: 0, x, y, dx: pick([-1, 1]) * rand(30, 44) }); ripple(x, y, 9, 3.5);
      }
    } else {
      S.t += dt / 1.5;
      const u = Math.min(1, S.t), x = S.x + S.dx * u, y = S.y - 34 * 4 * u * (1 - u), vy = -34 * 4 * (1 - 2 * u);
      const on = u < 1 && inView(x, y, 20); show(g, on);
      if (on) g.setAttribute('transform', `translate(${n2(x)},${n2(y)}) scale(${S.dx > 0 ? 1 : -1},1) rotate(${(Math.atan2(vy, Math.abs(S.dx)) * 180 / Math.PI).toFixed(1)})`);
      if (u >= 1) { S.t = -1; S.wait = rand(o.waitMin, o.waitMax); ripple(x, S.y, 10, 3.5); ripple(x, S.y, 5, 2); }
    }
  };
}

/** פרפרים שמרחפים מעל שדה הפרחים */
export function butterflies(o: any) {
  const list = o.colors.map((c: string, i: number) => {
    const g = el('g', null, ctx.L.air), wl = el('g', null, g), wr = el('g', null, g);
    el('ellipse', { cx: -2.6, cy: -1, rx: 2.8, ry: 2.2, fill: c, stroke: shade(c, -.3), 'stroke-width': .4 }, wl);
    el('ellipse', { cx: 2.6, cy: -1, rx: 2.8, ry: 2.2, fill: c, stroke: shade(c, -.3), 'stroke-width': .4 }, wr);
    el('rect', { x: -.5, y: -3, width: 1, height: 5, rx: .5, fill: '#3b2f25' }, g);
    return { g, wl, wr, cx: o.x + i * o.dx, cy: o.y, s: rand(0, 100) };
  });
  return (dt: number, T: number) => {
    for (const b of list) {
      const s = b.s + T, x = b.cx + Math.sin(s * .37) * 60 + Math.sin(s * 1.3) * 14, y = b.cy + Math.sin(s * .53) * 45 + Math.cos(s * 1.7) * 8 - 10;
      const on = inView(x, y, 10); show(b.g, on);
      if (!on) continue;
      const flap = (Math.abs(Math.sin(s * 8)) * .8 + .2).toFixed(2);
      b.g.setAttribute('transform', `translate(${n2(x)},${n2(y)})`);
      b.wl.setAttribute('transform', `scale(${flap},1)`); b.wr.setAttribute('transform', `scale(${flap},1)`);
    }
  };
}
