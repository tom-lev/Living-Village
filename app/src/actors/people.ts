/* אנשים ובני לוויה: הולכים על רשת הדרכים, כלב עם רצועה, בלון, יושבים */
import { el, n2, P, clamp, shade } from '../core/util';
import { rand, pick, R } from '../core/rng';
import { ctx } from '../world/context';
import { geo, edgeAt } from '../world/geometry';
import type { Look } from '../world/types';
import { Figure, PR, walkPose, sitPose, type View } from './figure';

/* כל מה שזז ונמיין לפי עומק, וכל מה שאפשר ללחוץ עליו כדי לעקוב */
export const dynamics: any[] = [];
export const followables: any[] = [];
function followable(o: any, g: any) { followables.push(o); g.dataset.f = followables.length - 1; }

/** ממיין את הדמויות לפי y, ומזיז ב-DOM רק מה שלא במקום */
export function sortDepth() {
  dynamics.sort((a, b) => a.y - b.y);
  let prev = null;
  for (const d of dynamics) {
    const want = prev ? prev.el.nextSibling : ctx.L.actors.firstChild;
    if (d.el !== want) ctx.L.actors.insertBefore(d.el, want);
    prev = d;
  }
}

/** מניע על גרף הדרכים: מתקדם לפי מרחק, ובצומת בוחר המשך אקראי (בלי לחזור אחורה) */
class Rover {
  constructor(public e: number, public dir: number, public s: number) {}
  get E() { return geo.EDGES[this.e]; }
  endNode() { return this.dir > 0 ? this.E.b : this.E.a; }
  remaining() { return this.E.len - this.s; }
  at(lane: number) {
    const E = this.E, p = edgeAt(E, this.dir > 0 ? this.s : E.len - this.s), tx = p.tx * this.dir, ty = p.ty * this.dir;
    return [p.x - ty * lane, p.y + tx * lane];      // lane>0 = צד ימין של כיוון ההליכה
  }
  /** מחזיר true בהגעה למבוי סתום */
  advance(ds: number) {
    this.s += ds;
    while (this.s >= this.E.len) {
      const over = this.s - this.E.len, opts = geo.ADJ[this.endNode()].filter(o => o.e !== this.e);
      if (!opts.length) { this.s = this.E.len; return true; }
      const nx = pick(opts);
      this.e = nx.e; this.dir = nx.dir; this.s = over;
    }
    return false;
  }
  turnAround() { this.dir = -this.dir; this.s = this.E.len - this.s; }
}

/** הולך רגל: צעדים לפי מרחק, מבט מהצד/מלפנים/מאחור, ובמבוי סתום עוצר ומסתובב */
export class Walker {
  [k: string]: any;
  constructor(look: Look, speed: number) {
    this.look = look; this.name = look.name; this.speed = speed;
    const ei = Math.floor(R() * geo.EDGES.length);
    this.rv = new Rover(ei, R() < .5 ? 1 : -1, rand(0, geo.EDGES[ei].len));
    this.lane = look.hold === 'leash' ? 18 : (R() < .5 ? 1 : -1) * rand(14, 20);
    this.fig = new Figure(ctx.L.actors, look); this.el = this.fig.g;
    const p = this.rv.at(this.lane);
    this.x = p[0]; this.y = p[1]; this.hx = 1; this.hy = 0;
    this.view = 'side' as View; this.pend = 0; this.flip = 1;
    this.phase = R(); this.amp = 1; this.sf = 1; this.state = 'walk'; this.wait = 0; this.alpha = 1;
    this.trail = [[this.x, this.y, 0]]; this.dist = 0;
    dynamics.push(this); followable(this, this.fig.g);
  }
  update(dt: number, t: number) {
    if (this.state === 'walk') {
      const rem = this.rv.remaining(), dead = geo.ADJ[this.rv.endNode()].length === 1;
      const mul = dead ? clamp(rem / 26, .12, 1) : 1;   // מאטים לאט לפני מבוי סתום
      this.sf = Math.min(1, this.sf + dt * 1.1);
      if (this.rv.advance(this.speed * Math.min(mul, this.sf) * dt)) { this.state = 'idle'; this.wait = rand(2.5, 6); }
    } else {
      this.wait -= dt;
      if (this.wait <= 0) { this.rv.turnAround(); this.state = 'walk'; this.sf = .15; }
    }
    const tgt = this.rv.at(this.lane), k = 1 - Math.exp(-dt * 7);
    const nx = this.x + (tgt[0] - this.x) * k, ny = this.y + (tgt[1] - this.y) * k;
    const dx = nx - this.x, dy = ny - this.y, ds = Math.hypot(dx, dy);
    this.x = nx; this.y = ny;
    if (ds > 1e-4) {
      const m = Math.min(1, ds / 5);
      this.hx += (dx / ds - this.hx) * m; this.hy += (dy / ds - this.hy) * m;
      const hl = Math.hypot(this.hx, this.hy) || 1; this.hx /= hl; this.hy /= hl;
      this.dist += ds; this.trail.push([this.x, this.y, this.dist]);
      while (this.trail.length > 2 && this.dist - this.trail[1][2] > 80) this.trail.shift();
    }
    // מבט: מחליפים רק אחרי 9 יחידות בכיוון החדש (בלי ריצוד בפניות)
    const want: View = Math.abs(this.hy) <= Math.abs(this.hx) * 1.15 ? 'side' : this.hy > 0 ? 'front' : 'back';
    if (want !== this.view) { this.pend += ds; if (this.pend > 9) { this.view = want; this.pend = 0; if (want === 'side') this.flip = this.hx >= 0 ? 1 : -1; } }
    else this.pend = 0;
    if (this.view === 'side' && Math.abs(this.hx) > .2) this.flip += ((this.hx > 0 ? 1 : -1) - this.flip) * Math.min(1, dt * 14);
    // צעדים לפי מרחק: כף הרגל שעל הקרקע נשארת במקום
    this.amp += ((this.state === 'walk' ? .35 + .65 * this.sf : 0) - this.amp) * Math.min(1, dt * 6);
    const A = PR.A * this.look.h * Math.max(this.amp, .35);
    this.phase += this.view === 'side' ? ds * Math.abs(this.hx) / (4 * A) : ds * Math.abs(this.hy) / (4 * A * PR.KF);
    this.fig.render(walkPose(this.look, this.view, this.phase, this.amp, t), this.x, this.y, this.flip, this.alpha);
  }
  /** נקודה על המסלול שעבר, back יחידות אחורה (לכלב) */
  pointBack(back: number) {
    const target = this.dist - back, tr = this.trail;
    for (let i = tr.length - 1; i > 0; i--) if (tr[i - 1][2] <= target) {
      const a = tr[i - 1], b = tr[i], f = (target - a[2]) / ((b[2] - a[2]) || 1);
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    return [tr[0][0], tr[0][1]];
  }
}

/** כלב שהולך במסלול של הבעלים, בטרוט */
export class Dog {
  [k: string]: any;
  constructor(owner: Walker, color: string, name: string) {
    this.owner = owner; this.name = `${name}, הכלב של ${owner.name}`;
    this.g = el('g', { class: 'who' }, ctx.L.actors); this.el = this.g;
    el('ellipse', { rx: 10, ry: 2.6, fill: 'rgba(40,70,20,.25)' }, this.g);
    this.b = el('g', null, this.g);
    const dk = shade(color, -.22), S = (c: string) => el('path', { stroke: c, 'stroke-width': 2.3, 'stroke-linecap': 'round', fill: 'none' }, this.b);
    this.legsFar = [S(dk), S(dk)];
    this.tail = el('path', { d: 'M0,0q-3,-3 -4,-7', stroke: color, 'stroke-width': 2.2, 'stroke-linecap': 'round', fill: 'none' }, this.b);
    el('ellipse', { cx: 0, cy: -9, rx: 8.5, ry: 4.4, fill: color }, this.b);
    el('ellipse', { cx: -1, cy: -7.6, rx: 6, ry: 2.2, fill: shade(color, .25) }, this.b);
    this.legsNear = [S(color), S(color)];
    const hd = el('g', null, this.b);
    el('circle', { cx: 9, cy: -13, r: 3.9, fill: color }, hd);
    el('ellipse', { cx: 12.4, cy: -12, rx: 2.6, ry: 1.7, fill: shade(color, .3) }, hd);
    el('circle', { cx: 14.6, cy: -12.4, r: .9, fill: '#2b2220' }, hd);
    el('circle', { cx: 10, cy: -14.2, r: .55, fill: '#2b2220' }, hd);
    el('path', { d: 'M7,-15.6q-2.4,1 -1.6,5.6q2,-1 3,-4z', fill: dk }, hd);
    el('path', { d: 'M5.2,-11.4l1,2.6', stroke: '#e2574c', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, this.b);
    el('rect', { x: -14, y: -22, width: 30, height: 24, fill: 'transparent' }, this.g);
    const p = owner.pointBack(24); this.x = p[0]; this.y = p[1]; this.flip = 1; this.phase = 0; this.amp = 1; this.hx = 1;
    dynamics.push(this); followable(this, this.g);
  }
  update(dt: number, t: number) {
    const tgt = this.owner.pointBack(26), k = 1 - Math.exp(-dt * 8);
    const nx = this.x + (tgt[0] - this.x) * k, ny = this.y + (tgt[1] - this.y) * k, dx = nx - this.x, ds = Math.hypot(dx, ny - this.y);
    this.x = nx; this.y = ny;
    if (ds > 1e-4) this.hx += (dx / ds - this.hx) * Math.min(1, ds / 4);
    if (Math.abs(this.hx) > .25) this.flip += ((this.hx > 0 ? 1 : -1) - this.flip) * Math.min(1, dt * 12);
    const moving = ds / dt > 3;
    this.amp += ((moving ? 1 : 0) - this.amp) * Math.min(1, dt * 5);
    this.phase += ds / 13;
    // טרוט: רגל קדמית ואחורית אלכסונית זזות יחד
    const leg = (pe: any, hx: number, off: number) => {
      const q = (this.phase + off) * Math.PI * 2, fx = hx + Math.sin(q) * 2.6 * this.amp, fy = -Math.max(0, Math.cos(q)) * 1.8 * this.amp;
      pe.setAttribute('d', `M${n2(hx)},-7.5L${n2(fx)},${n2(fy)}`);
    };
    leg(this.legsNear[0], 6, 0); leg(this.legsNear[1], -6, .5); leg(this.legsFar[0], 4.5, .5); leg(this.legsFar[1], -7.5, 0);
    this.tail.setAttribute('transform', `translate(-8,-10) rotate(${(Math.sin(t * (moving ? 7 : 4)) * 16).toFixed(1)})`);
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y)})`);
    this.g.setAttribute('opacity', this.owner.alpha.toFixed(2));
    this.b.setAttribute('transform', `scale(${this.flip.toFixed(3)},1)`);
    this.collar = [this.x + 5.6 * this.flip, this.y - 10.5];
  }
}

/* התנהגויות של יושבים: איפה הידיים בכל רגע */
const SIT_BEHAVIORS: Record<string, (t: number, h: number) => number[][]> = {
  feedPigeons: (t, h) => {   // מפזר פירורים ליונים מדי פעם
    const toss = Math.max(0, Math.sin(t * .9)) ** 6;
    return [[.2 * h + toss * .12 * h, -.33 * h - toss * .1 * h], [.17 * h, -.32 * h]];
  },
  warmHands: (t, h) => {     // מחממת ידיים מול המדורה
    const w = Math.sin(t * 2.2) * .02 * h;
    return [[.32 * h + w, -.42 * h], [.3 * h - w, -.4 * h]];
  },
};
export class Sitter {
  [k: string]: any;
  constructor(look: Look, x: number, y: number, seat: number, flip: number, behavior: string) {
    this.look = look; this.x = x; this.y = y; this.seat = seat * look.h; this.flip = flip; this.hands = SIT_BEHAVIORS[behavior];
    this.fig = new Figure(ctx.L.actors, look); this.el = this.fig.g; this.name = look.name;
    dynamics.push(this); followable(this, this.fig.g);
  }
  update(dt: number, t: number) { this.fig.render(sitPose(this.look, this.seat, this.hands(t, this.look.h), t), this.x, this.y, this.flip); }
}

/** בלון: קפיץ מרוסן שקשור ליד */
export class Balloon {
  [k: string]: any;
  constructor(owner: Walker, color: string) {
    this.owner = owner; this.len = 30;
    this.str = el('path', { fill: 'none', stroke: '#6b5a4a', 'stroke-width': .7 }, ctx.L.air);
    this.g = el('g', null, ctx.L.air);
    el('ellipse', { cx: 0, cy: 0, rx: 6.4, ry: 7.8, fill: color }, this.g);
    el('ellipse', { cx: -2.2, cy: -3, rx: 1.6, ry: 2.4, fill: '#fff', opacity: .55 }, this.g);
    el('path', { d: 'M-1.4,8.4l1.4,-1.2l1.4,1.2z', fill: shade(color, -.2) }, this.g);
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.init = false;
  }
  update(dt: number, t: number) {
    const h = this.owner.fig.hand; if (!h) return;
    if (!this.init) { this.x = h[0]; this.y = h[1] - this.len; this.init = true; }
    const tx = h[0] + Math.sin(t * .9) * 5 - this.owner.hx * 6, ty = h[1] - this.len;
    this.vx += ((tx - this.x) * 9 - this.vx * 3.2) * dt; this.vy += ((ty - this.y) * 9 - this.vy * 3.2) * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    const dx = this.x - h[0], dy = this.y - h[1], d = Math.hypot(dx, dy);
    if (d > this.len) { this.x = h[0] + dx / d * this.len; this.y = h[1] + dy / d * this.len; }
    const by = this.y + 8.4, mx = (h[0] + this.x) / 2 + Math.sin(t * 2) * 2, my = (h[1] + by) / 2;
    this.str.setAttribute('d', `M${P(h)}Q${n2(mx)},${n2(my)} ${n2(this.x)},${n2(by)}`);
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y)}) rotate(${clamp(dx * 1.4, -20, 20).toFixed(1)})`);
    const a = this.owner.alpha.toFixed(2); this.g.setAttribute('opacity', a); this.str.setAttribute('opacity', a);
  }
}

/** רצועה בין היד של הבעלים לקולר של הכלב */
export class Leash {
  [k: string]: any;
  constructor(owner: Walker, dog: Dog) { this.owner = owner; this.dog = dog; this.p = el('path', { fill: 'none', stroke: '#c0392b', 'stroke-width': .9 }, ctx.L.air); }
  update() {
    const a = this.owner.fig.hand, b = this.dog.collar; if (!a || !b) return;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), sag = Math.max(0, 30 - d) * .35 + 2;
    this.p.setAttribute('d', `M${P(a)}Q${n2((a[0] + b[0]) / 2)},${n2((a[1] + b[1]) / 2 + sag)} ${P(b)}`);
    this.p.setAttribute('opacity', this.owner.alpha.toFixed(2));
  }
}
