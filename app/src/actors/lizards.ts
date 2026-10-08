/* לטאות בעשב הגבוה של הערבה. לכל לטאה כתם עשב גבוה ואבן שטוחה משלה (tallGrass ב-world.json).
   מבט מלמעלה (כמו הנמלים): גוף בצורת S שמתפתל בריצה, ארבע רגליים פשוקות לצדדים שזזות באלכסון
   (קדמית שמאל עם אחורית ימין), זנב ארוך, פס גב וכתמים, עיניים ולשון שיוצאת לרגע.
   התנהגות: מתחבאת בעשב (לא נראית), יוצאת בזהירות בריצות קצרות עם עצירות, משתזפת על האבן (מסובבת ראש, לשון),
   חוזרת לעשב. אם מישהו מתקרב – בורחת מהר לעשב.
   ההיגיון רץ תמיד, הציור נבנה מחדש רק כשהלטאה על המסך וזזה. */
import { el, n2, circ, show, shade } from '../core/util';
import { rngAt, type LocalRng } from '../core/rng';
import { ctx } from '../world/context';
import { inView } from '../camera/view';
import { REAL_DYN, fitScale } from '../world/scale';
import { GRASS_RX, GRASS_RY } from '../prefabs/tallgrass';
import { dynamics } from './people';

const LEN = 10;   // אורך הלטאה כפי שהיא מצוירת (מהחוטם לקצה הזנב)
const SQ = .75;   // הקרקע נראית בזווית: הציר האנכי מכווץ

/* צורת הגוף: רוחב לפי המקום לאורך עמוד השדרה (s: 4.6 בחוטם עד 5.4- בקצה הזנב) */
function width(s: number) {
  if (s > 3.6) return .95 * (4.6 - s) ** .6;
  if (s > 2.6) return .65 + .3 * (s - 2.6);
  if (s > -1.8) return 1.15 - .12 * Math.abs(s - .2);
  if (s > -2.4) return .75;
  return Math.max(0, .6 * (5.4 + s) / 3);
}

class Lizard {
  [k: string]: any;
  constructor(home: any, rg: LocalRng) {
    this.rg = rg; this.cx = home.x; this.cy = home.y;
    const rk = home.rock ?? [26, 22]; this.rock = [home.x + rk[0], home.y + rk[1] - 1];
    this.x = this.cx; this.y = this.cy; this.h = rg.rand(0, 6.28); this.alpha = 0; this.z = 0;
    this.state = 'hide'; this.timer = rg.rand(.5, 4); this.phase = 0; this.turn = 0; this.tongue = 0; this.curl = rg.rand(-1, 1);
    this.k = fitScale(LEN, REAL_DYN.lizard);
    const c = rg.pick(['#7bb05a', '#8fae5a', '#a59468', '#6f9c62']), dk = shade(c, -.35);
    this.g = el('g', { opacity: 0 }, ctx.L.actors); this.el = this.g;
    this.sh = el('ellipse', { cx: .6, cy: .9, rx: 5, ry: 1.6, fill: 'rgba(40,60,20,.18)' }, this.g);
    this.b = el('g', null, this.g);
    this.legs = el('path', { fill: 'none', stroke: dk, 'stroke-width': .55, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.b);
    this.body = el('path', { fill: c, stroke: dk, 'stroke-width': .3 }, this.b);
    this.stripe = el('path', { fill: 'none', stroke: shade(c, -.2), 'stroke-width': .45, 'stroke-linecap': 'round' }, this.b);
    this.spots = el('path', { fill: shade(c, .35) }, this.b);
    this.eyes = el('path', { fill: '#1f1a17' }, this.b);
    this.tng = el('path', { fill: 'none', stroke: '#d8505a', 'stroke-width': .3, 'stroke-linecap': 'round' }, this.b);
    this.dirty = true;
    dynamics.push(this);
  }
  get name() { return 'A lizard'; }
  norm(x: number, y: number) { return ((x - this.cx) / GRASS_RX) ** 2 + ((y - this.cy) / GRASS_RY) ** 2; }
  /** נקודה פתוחה לא רחוקה מהעשב, תמיד מדרום לו או לצדו (לא מאחוריו) */
  openSpot() {
    const a = this.rg.rand(.15, Math.PI - .15), r = this.rg.rand(1.25, 2.1);
    return [this.cx + Math.cos(a) * GRASS_RX * r, this.cy + Math.sin(a) * GRASS_RY * r + 6];
  }
  go(to: number[], fast = false, then = 'pause') {
    this.to = to; this.fast = fast; this.then = then; this.state = 'move'; this.burst = this.rg.rand(5, 13);
  }
  update(dt: number, t: number) {
    const rg = this.rg;
    // מישהו מתקרב: בורחת לעשב
    if (this.state !== 'hide' && !(this.state === 'move' && this.then === 'hide') && dynamics.some(o => o.first && o.alpha > 0 && Math.hypot(o.x - this.x, o.y - this.y) < 45))
      this.go([this.cx + rg.rand(-8, 8), this.cy + rg.rand(-2, 3)], true, 'hide');
    this.timer -= dt;
    let moved = false;
    if (this.state === 'hide') {
      this.alpha = Math.max(0, this.alpha - dt / .35);
      if (this.timer <= 0) {
        // יוצאת: מתחילה בשולי העשב (בצד הדרומי) ורצה החוצה
        const a = rg.rand(.3, Math.PI - .3);
        this.x = this.cx + Math.cos(a) * GRASS_RX * .75; this.y = this.cy + Math.sin(a) * GRASS_RY * .75;
        this.h = Math.atan2(Math.sin(a), Math.cos(a)); this.dirty = true;
        this.go(rg.chance(.55) ? this.rock : this.openSpot(), false, 'pause');
        if (this.to === this.rock) this.then = 'bask';
      }
    } else if (this.state === 'move') {
      if (this.norm(this.x, this.y) > .8 || this.then !== 'hide') this.alpha = Math.min(1, this.alpha + dt / .35);
      const dx = this.to[0] - this.x, dy = this.to[1] - this.y, d = Math.hypot(dx, dy);
      // פונה אל היעד (מהר, כמו לטאה), ורצה בפרצים קצרים
      const want = Math.atan2(dy, dx); let dh = want - this.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      this.h += Math.sign(dh) * Math.min(Math.abs(dh), dt * 9);
      if (Math.abs(dh) < .9) {
        const v = this.fast ? 42 : 26, ds = Math.min(d, v * dt);
        this.x += Math.cos(this.h) * ds; this.y += Math.sin(this.h) * ds; this.phase += ds / 4.2; this.burst -= ds; moved = true;
      }
      if (this.then === 'hide' && this.norm(this.x, this.y) < .8) this.alpha = Math.max(0, this.alpha - dt / .3);
      if (d < 1.2) {
        this.state = this.then === 'hide' ? 'hide' : this.then; this.fast = false;
        this.timer = this.state === 'hide' ? rg.rand(3, 9) : this.state === 'bask' ? rg.rand(7, 16) : rg.rand(.8, 3);   // רוב הזמן בחוץ, כדי שיהיה אפשר לראות אותן
      } else if (this.burst <= 0 && !this.fast) { this.state = 'stop'; this.timer = rg.rand(.4, 1.6); }
    } else if (this.state === 'stop') {
      if (this.timer <= 0) { this.state = 'move'; this.burst = rg.rand(5, 13); }
    } else {   // pause / bask: עומדת, מסובבת ראש, לשון
      if (this.timer <= 0) {
        const r = rg.r();
        if (r < .3) this.go([this.cx + rg.rand(-10, 10), this.cy + rg.rand(-3, 3)], false, 'hide');
        else if (r < .7 && this.state !== 'bask') this.go(this.rock, false, 'bask');
        else this.go(this.openSpot(), false, 'pause');
      }
    }
    // על האבן: מורמת מעט
    const onRock = ((this.x - this.rock[0]) / 9) ** 2 + ((this.y - this.rock[1]) / 4) ** 2 < 1;
    this.z += ((onRock ? 2.4 : 0) - this.z) * Math.min(1, dt * 10);
    const still = this.state === 'pause' || this.state === 'bask' || this.state === 'stop';
    const turn = still ? Math.sin(t * .7 + this.cx) * .5 * (Math.sin(t * .23 + this.cy) > .2 ? 1 : 0) : 0;
    this.tongue = still && ((t * .5 + this.cx * .013) % 3.2 + 3.2) % 3.2 < .18 ? 1 : 0;   // לשון לרגע, כל כמה שניות
    if (Math.abs(turn - this.turn) > .02 || moved || this.tongue !== this.lastTongue) { this.turn = turn; this.dirty = true; }
    const on = this.alpha > 0 && inView(this.x, this.y, 20); show(this.g, on);
    if (!on) return;
    this.g.setAttribute('opacity', this.alpha.toFixed(2));
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y - this.z)}) scale(${this.k.toFixed(3)},${(this.k * SQ).toFixed(3)})`);
    this.b.setAttribute('transform', `rotate(${(this.h * 180 / Math.PI).toFixed(1)})`);
    if (this.dirty) { this.draw(moved || this.state === 'move'); this.dirty = false; this.lastTongue = this.tongue; }
  }
  /** בונה את הגוף מחדש: גל לאורך עמוד השדרה (בריצה), ראש מסתובב, זנב מתעקל במנוחה */
  draw(running: boolean) {
    const ph = this.phase * Math.PI * 2, amp = running ? .55 : 0, curl = running ? 0 : this.curl * .5;
    const lat = (s: number) => amp * Math.sin(1.05 * s + ph) * (s < 0 ? 1 + -s * .22 : .45)
      + (s < -1.6 ? curl * ((-s - 1.6) / 3.8) ** 2 * 3 : 0) + (s > 2.4 ? this.turn * (s - 2.4) : 0);
    const S: number[] = []; for (let s = 4.6; s >= -5.4; s -= .5) S.push(s);
    const L = S.map(s => `${n2(s)},${n2(lat(s) + width(s))}`), R = S.slice().reverse().map(s => `${n2(s)},${n2(lat(s) - width(s))}`);
    this.body.setAttribute('d', `M${L.join('L')}L${R.join('L')}Z`);
    this.stripe.setAttribute('d', 'M' + S.filter(s => s < 3.2 && s > -3.4).map(s => `${n2(s)},${n2(lat(s))}`).join('L'));
    this.spots.setAttribute('d', [1.6, .6, -.4, -1.2].map((s, i) => circ(s, lat(s) + (i % 2 ? .55 : -.55), .22)).join(''));
    this.eyes.setAttribute('d', circ(3.75, lat(3.75) + .55, .2) + circ(3.75, lat(3.75) - .55, .2));
    this.tng.setAttribute('d', this.tongue ? `M4.6,${n2(lat(4.6))}h1.1l.5,.35M5.7,${n2(lat(4.6))}l.5,-.35` : '');
    // רגליים: יוצאות לצדדים עם מרפק, כף הרגל זזה קדימה ואחורה; זוגות אלכסוניים
    let d = '';
    for (const [s0, side, off, front] of [[1.6, 1, 0, 1], [1.6, -1, .5, 1], [-1.9, 1, .5, 0], [-1.9, -1, 0, 0]]) {
      const fo = running ? 1.1 * Math.cos(ph + off * Math.PI * 2) : front ? .7 : -.5, y0 = lat(s0), w = width(s0);
      const ex = s0 + fo * .35 + (front ? .3 : -.3), ey = y0 + side * (w + 1.1), fx = s0 + fo + (front ? .5 : -.5), fy = y0 + side * (w + 1.7);
      d += `M${n2(s0)},${n2(y0 + side * w * .6)}L${n2(ex)},${n2(ey)}L${n2(fx)},${n2(fy)}`;
      d += `M${n2(fx)},${n2(fy)}l${front ? .45 : -.45},${n2(side * .25)}M${n2(fx)},${n2(fy)}l${front ? .5 : -.5},${n2(-side * .1)}`;   // אצבעות
    }
    this.legs.setAttribute('d', d);
  }
}

export function lizards(o: { count?: number }) {
  const homes = (ctx.world.objects as any[]).filter(q => q.type === 'tallGrass').slice(0, o.count ?? 99);
  const all = homes.map((h, i) => new Lizard(h, rngAt(h.x, h.y, 62 + i)));
  (window as any).__lizards = all;   // לבדיקות
  return (dt: number, t: number) => { for (const l of all) l.update(dt, t); };
}
