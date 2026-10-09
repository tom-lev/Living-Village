/* לטאות בעשב הגבוה של הערבה. לכל לטאה כתם עשב גבוה, אבן שטוחה ומחילה משלה (tallGrass ב-world.json).
   מבט מלמעלה (כמו הנמלים): גוף בצורת S שמתפתל בריצה, ארבע רגליים פשוקות לצדדים שזזות באלכסון
   (קדמית שמאל עם אחורית ימין), זנב ארוך, פס גב וכתמים, עיניים ולשון שיוצאת לרגע.
   התנהגות: נחה בתוך המחילה (לא נראית), יוצאת ממנה ראש קודם – החלק שעדיין בפנים לא מצויר, ריצות קצרות עם עצירות,
   משתזפת על האבן (מסובבת ראש, לשון), וחוזרת למחילה ראש קודם. אם מישהו מתקרב – בורחת מהר למחילה.
   בלי שום דהייה (כלל של הבעלים): היא נעלמת רק כי היא נכנסת לחור.
   תמיד רצה לכיוון שאליו היא פונה, ופונה בהדרגה.
   ההיגיון רץ תמיד, הציור נבנה מחדש רק כשהלטאה על המסך וזזה. */
import { el, n2, circ, show, shade } from '../core/util';
import { rngAt, type LocalRng } from '../core/rng';
import { ctx } from '../world/context';
import { inView, updateFar } from '../camera/view';
import { REAL_DYN, fitScale } from '../world/scale';
import { GRASS_RX, GRASS_RY, holeOf } from '../prefabs/tallgrass';
import { dynamics } from './people';
import { wrapA } from './heading';

const LEN = 10;   // אורך הלטאה כפי שהיא מצוירת (מהחוטם לקצה הזנב)
const HEAD = 4.6, TAIL = -5.4;   // קצות עמוד השדרה
const SQ = .75;   // הקרקע נראית בזווית: הציר האנכי מכווץ

/* צורת הגוף: רוחב לפי המקום לאורך עמוד השדרה (s: 4.6 בחוטם עד 5.4- בקצה הזנב) */
function width(s: number) {
  if (s > 3.6) return .95 * Math.max(0, 4.6 - s) ** .6;
  if (s > 2.6) return .65 + .3 * (s - 2.6);
  if (s > -1.8) return 1.15 - .12 * Math.abs(s - .2);
  if (s > -2.4) return .75;
  return Math.max(0, .6 * (5.4 + s) / 3);
}

class Lizard {
  [k: string]: any;
  constructor(home: any, rg: LocalRng) {
    this.rg = rg; this.cx = home.x; this.cy = home.y; this.hole = holeOf(home);
    const rk = home.rock ?? [26, 22]; this.rock = [home.x + rk[0], home.y + rk[1] - 1];
    this.x = this.hole[0]; this.y = this.hole[1]; this.h = Math.PI / 2; this.z = 0;
    this.state = 'hide'; this.timer = rg.rand(.5, 4); this.phase = 0; this.turn = 0; this.tongue = 0; this.curl = rg.rand(-1, 1);
    this.k = fitScale(LEN, REAL_DYN.lizard);
    this.cutLo = TAIL; this.cutHi = HEAD;   // החלק הנראה של הגוף (השאר בתוך המחילה)
    const c = rg.pick(['#7bb05a', '#8fae5a', '#a59468', '#6f9c62']), dk = shade(c, -.35);
    this.g = el('g', null, ctx.L.actors); this.el = this.g;
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
  /** נקודה פתוחה לא רחוקה מהעשב, תמיד מדרום לו או לצדו (לא מאחוריו) */
  openSpot() {
    const a = this.rg.rand(.15, Math.PI - .15), r = this.rg.rand(1.25, 2.1);
    return [this.cx + Math.cos(a) * GRASS_RX * r, this.cy + Math.sin(a) * GRASS_RY * r + 6];
  }
  go(to: number[], fast = false, then = 'pause') { this.to = to; this.fast = fast; this.then = then; this.state = 'move'; this.burst = this.rg.rand(5, 13); }
  /** מיקום המחילה לאורך עמוד השדרה (ביחידות הציור): מה שמעבר לה – בפנים */
  holeS() { return ((this.hole[0] - this.x) * Math.cos(this.h) + (this.hole[1] - this.y) * Math.sin(this.h)) / this.k; }
  update(dt: number, t: number) {
    const rg = this.rg, out = this.state !== 'hide' && this.state !== 'emerge' && this.state !== 'enter';
    // מישהו מתקרב: בורחת למחילה
    if (out && !(this.state === 'move' && this.then === 'hide') && dynamics.some(o => o.first && o.alpha > 0 && Math.hypot(o.x - this.x, o.y - this.y) < 45))
      this.go(this.hole, true, 'hide');
    this.timer -= dt;
    let moved = false;
    const step = (v: number) => { const ds = v * dt; this.x += Math.cos(this.h) * ds; this.y += Math.sin(this.h) * ds; this.phase += ds / 4.2; moved = true; };
    if (this.state === 'hide') {
      if (this.timer <= 0) {
        // יוצאת מהמחילה, ראש קודם, לכיוון דרום (לא אל העשב)
        this.h = rg.rand(.35, Math.PI - .35);
        this.x = this.hole[0] - Math.cos(this.h) * HEAD * this.k; this.y = this.hole[1] - Math.sin(this.h) * HEAD * this.k;
        this.state = 'emerge'; this.dirty = true;
      }
    } else if (this.state === 'emerge') {
      step(14);
      const sh = this.holeS(); this.cutLo = sh; this.cutHi = HEAD;
      if (sh < TAIL) {
        this.cutLo = TAIL;
        this.go(rg.chance(.55) ? this.rock : this.openSpot(), false, 'pause');
        if (this.to === this.rock) this.then = 'bask';
      }
    } else if (this.state === 'enter') {
      // נכנסת למחילה ראש קודם: מה שעבר את החור כבר בפנים
      step(this.fast ? 30 : 16);
      const sh = this.holeS(); this.cutHi = Math.min(HEAD, sh); this.cutLo = TAIL;
      if (sh < TAIL) { this.state = 'hide'; this.cutHi = HEAD; this.timer = rg.rand(3, 9); this.fast = false; }
    } else if (this.state === 'move') {
      const dx = this.to[0] - this.x, dy = this.to[1] - this.y, d = Math.hypot(dx, dy);
      // פונה אל היעד (מהר, כמו לטאה) ורצה רק לכיוון שאליו היא פונה, בפרצים קצרים
      const want = Math.atan2(dy, dx), dh = wrapA(want - this.h);
      this.h += Math.sign(dh) * Math.min(Math.abs(dh), dt * 9);
      if (Math.abs(dh) < .9 && dt > 0) step(Math.min(d / dt, this.fast ? 42 : 26));
      if (this.then === 'hide' && d < HEAD * this.k + 1.5 && Math.abs(dh) < .2) { this.state = 'enter'; this.h = want; }
      else if (d < 1.2) { this.state = this.then; this.fast = false; this.timer = this.state === 'bask' ? rg.rand(7, 16) : rg.rand(.8, 3); }
      else if (this.burst <= 0 && !this.fast) { this.state = 'stop'; this.timer = rg.rand(.4, 1.6); }
      if (moved) this.burst -= 26 * dt;
    } else if (this.state === 'stop') {
      if (this.timer <= 0) { this.state = 'move'; this.burst = rg.rand(5, 13); }
    } else {   // pause / bask: עומדת, מסובבת ראש, לשון
      if (this.timer <= 0) {
        const r = rg.r();
        if (r < .3) this.go(this.hole, false, 'hide');
        else if (r < .6 && this.state !== 'bask') this.go(this.rock, false, 'bask');
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
    const on = this.state !== 'hide' && inView(this.x, this.y, 20); show(this.g, on);
    if (!on) return;
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y - this.z)}) scale(${this.k.toFixed(3)},${(this.k * SQ).toFixed(3)})`);
    this.b.setAttribute('transform', `rotate(${(this.h * 180 / Math.PI).toFixed(1)})`);
    if (this.dirty) { this.draw(moved); this.dirty = false; this.lastTongue = this.tongue; }
  }
  /** בונה את הגוף מחדש: גל לאורך עמוד השדרה (בריצה), ראש מסתובב, זנב מתעקל במנוחה; רק החלק שמחוץ למחילה */
  draw(running: boolean) {
    const ph = this.phase * Math.PI * 2, amp = running ? .55 : 0, curl = running ? 0 : this.curl * .5;
    const lo = Math.max(TAIL, this.cutLo), hi = Math.min(HEAD, this.cutHi), vis = (s: number) => s >= lo && s <= hi;
    const lat = (s: number) => amp * Math.sin(1.05 * s + ph) * (s < 0 ? 1 + -s * .22 : .45)
      + (s < -1.6 ? curl * ((-s - 1.6) / 3.8) ** 2 * 3 : 0) + (s > 2.4 ? this.turn * (s - 2.4) : 0);
    if (hi - lo < .1) { for (const e of [this.body, this.stripe, this.spots, this.eyes, this.tng, this.legs]) e.setAttribute('d', ''); return; }
    const S: number[] = [hi]; for (let s = Math.floor(hi * 2) / 2; s > lo; s -= .5) if (s < hi) S.push(s); S.push(lo);
    const L = S.map(s => `${n2(s)},${n2(lat(s) + width(s))}`), R = S.slice().reverse().map(s => `${n2(s)},${n2(lat(s) - width(s))}`);
    this.body.setAttribute('d', `M${L.join('L')}L${R.join('L')}Z`);
    const st = S.filter(s => s < 3.2 && s > -3.4);
    this.stripe.setAttribute('d', st.length > 1 ? 'M' + st.map(s => `${n2(s)},${n2(lat(s))}`).join('L') : '');
    this.spots.setAttribute('d', [1.6, .6, -.4, -1.2].filter(vis).map((s, i) => circ(s, lat(s) + (i % 2 ? .55 : -.55), .22)).join(''));
    this.eyes.setAttribute('d', vis(3.75) ? circ(3.75, lat(3.75) + .55, .2) + circ(3.75, lat(3.75) - .55, .2) : '');
    this.tng.setAttribute('d', this.tongue && vis(HEAD) ? `M4.6,${n2(lat(4.6))}h1.1l.5,.35M5.7,${n2(lat(4.6))}l.5,-.35` : '');
    // רגליים: יוצאות לצדדים עם מרפק, כף הרגל זזה קדימה ואחורה; זוגות אלכסוניים
    let d = '';
    for (const [s0, side, off, front] of [[1.6, 1, 0, 1], [1.6, -1, .5, 1], [-1.9, 1, .5, 0], [-1.9, -1, 0, 0]]) {
      if (!vis(s0)) continue;
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
  return updateFar(all);   // רחוק מהמבט: פחות עדכונים (camera/view.ts farDt)
}
