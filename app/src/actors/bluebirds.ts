/* ציפורי כחלי (Eastern Bluebird) בעצים סביב Bluebird Pond (בקשת הבעלים).
   עיצוב: גב, ראש וכנפיים כחול עז, חזה כתום־חלודה, בטן לבנה, מקור כהה קטן, עין שחורה עם ברק.
   התנהגות (מכונת מצבים לכל ציפור):
   - perch: יושבת על ענף בצמרת. מסובבת ראש, מנפנפת בזנב, מנקה נוצות, שרה (המקור נפתח ותו קטן עולה), נושמת.
   - hop: קפיצה קצרה לענף אחר באותו עץ, עם נפנוף כנפיים קצר.
   - fly: מעוף לעץ אחר במסלול קשתי, במעוף "גלי" של כחלי: פרצי נפנופים וגלישה, ונחיתה רכה עם כנפיים פרושות.
   - drink: יורדת לחוף הבריכה, מקפצת, טובלת מקור כמה פעמים, וחוזרת לעץ.
   בגודל אמיתי לפי טבלת הפרופורציות (world/scale.ts). ההיגיון רץ תמיד, הציור רק כשהציפור על המסך. */
import { el, n2, circ, show } from '../core/util';
import { rngAt, type LocalRng } from '../core/rng';
import { ctx } from '../world/context';
import { inView } from '../camera/view';
import { TREES } from '../scene/generators';
import { REAL_DYN, fitScale } from '../world/scale';
import { dynamics } from './people';

const BLUE = '#3d7fd9', BLUE_D = '#2c62b5', BLUE_L = '#6aa3ec', RUST = '#e98a46', WHITE = '#fbf6ee', INK = '#2e2622';
const NATURAL_H = 19;   // גובה הציור לפני ההקטנה (מכפות הרגליים עד קודקוד הראש)

type Perch = { x: number; y: number; ground: number; tree: number };

/** ציור הציפור (מבט מהצד, פונה ימינה, כפות הרגליים ב-0,0). מחזיר את החלקים שזזים */
function drawBird(g: any) {
  const farWing = el('g', { opacity: 0 }, g);   // כנף רחוקה (במעוף), מאחורי הגוף
  el('path', { d: 'M1,-12C-2,-19 -8,-22 -13,-21.5C-11,-19 -8,-16 -3.5,-12Z', fill: BLUE_D }, farWing);
  const legs = el('path', { d: 'M-1,-4L-1.6,0M1.2,-4L1.2,0M-2.6,0h2.2M.2,0h2.2', stroke: INK, 'stroke-width': .8, 'stroke-linecap': 'round', fill: 'none' }, g);
  const tail = el('g', null, g);
  el('path', { d: 'M-4.5,-8.5L-13,-6.2L-12.6,-4L-4.5,-5.6Z', fill: BLUE_D }, tail);
  el('path', { d: 'M-12.9,-5.9L-12.6,-4.1', stroke: '#1f4f99', 'stroke-width': .6 }, tail);
  const body = el('g', null, g);
  el('path', { d: 'M-6,-8.2C-6,-13 -1,-15 3,-14.2C7.2,-13.2 8,-9 6.2,-6.2C4.2,-3.2 -3.2,-3.4 -6,-8.2Z', fill: BLUE }, body);
  el('path', { d: 'M-3.4,-4.6C0,-2.9 4.4,-3.4 5.8,-6.2C4.2,-5.6 0,-5.1 -3.4,-4.6Z', fill: WHITE }, body);                // בטן
  el('path', { d: 'M2.2,-12.7C6,-12.3 7.6,-9.2 6.1,-6.3C4.1,-4.8 .2,-4.6 -2,-5.1C1,-6.2 2.6,-9.2 2.2,-12.7Z', fill: RUST }, body);   // חזה
  // כנף מקופלת עם קצות נוצות כהים ופס בהיר
  const wing = el('g', null, body);
  el('path', { d: 'M-4,-12.4C.2,-13.4 3.2,-11.4 2.6,-8.6C.2,-7.1 -4,-7 -7.4,-7.6Z', fill: '#3473ca' }, wing);
  el('path', { d: 'M-7.4,-7.6L-9.4,-7.1M-6.4,-8.4L-8.6,-8M-5.2,-9.3L-7.4,-9', stroke: BLUE_D, 'stroke-width': .7, 'stroke-linecap': 'round' }, wing);
  el('path', { d: 'M-3.2,-11.4C-.4,-11.9 1.6,-10.8 1.6,-9.6', fill: 'none', stroke: BLUE_L, 'stroke-width': .5 }, wing);
  // ראש (מסתובב סביב הצוואר)
  const head = el('g', null, g);
  el('circle', { cx: 4.6, cy: -15.4, r: 3.6, fill: BLUE }, head);
  el('path', { d: 'M3,-17.8C4.4,-18.9 6.6,-18.6 7.6,-17.3', fill: 'none', stroke: BLUE_L, 'stroke-width': .5 }, head);   // ברק על הכיפה
  el('circle', { cx: 6, cy: -16, r: .78, fill: INK }, head);
  el('circle', { cx: 6.25, cy: -16.25, r: .26, fill: '#fff' }, head);
  el('path', { d: 'M7.8,-16.1L9.7,-15.6L7.8,-15.1Z', fill: INK }, head);   // מקור עליון
  const jaw = el('path', { d: 'M7.8,-15.2L9.4,-15L7.8,-14.6Z', fill: '#4a3d36' }, head);   // מקור תחתון (נפתח בשירה)
  const nearWing = el('g', { opacity: 0 }, g);   // כנף קרובה (במעוף), מעל הגוף
  el('path', { d: 'M1,-12C-2,-20 -8.5,-23 -14,-22.4C-11.4,-19.4 -8,-16 -3.4,-11.6Z', fill: BLUE }, nearWing);
  el('path', { d: 'M-14,-22.4L-11.6,-19.6M-12.4,-22.6L-10,-19.2M-10.6,-22.4L-8.6,-18.8', stroke: BLUE_D, 'stroke-width': .8, 'stroke-linecap': 'round' }, nearWing);
  el('path', { d: 'M-1,-13.6C-4,-17.6 -7,-19.4 -9.6,-19.8', fill: 'none', stroke: BLUE_L, 'stroke-width': .6 }, nearWing);
  const note = el('path', { d: circ(10.5, -21, 1.1) + 'M11.5,-21v-4.6l2.2,.8', fill: INK, stroke: INK, 'stroke-width': .5, opacity: 0 }, g);
  return { farWing, nearWing, wing, tail, head, jaw, legs, body, note };
}

class Bluebird {
  [k: string]: any;
  constructor(i: number, perches: Perch[], shore: number[][], rg: LocalRng) {
    this.perches = perches; this.shore = shore; this.rg = rg;
    this.at = perches[Math.floor(rg.r() * perches.length)];
    this.x = this.at.x; this.alt = this.at.y; this.y = this.at.ground; this.face = rg.chance(.5) ? 1 : -1; this.flip = this.face;
    this.state = 'perch'; this.timer = rg.rand(2, 8); this.act = 'idle'; this.actT = rg.rand(.5, 2); this.look = 0; this.lookT = 0;
    this.k = fitScale(NATURAL_H, REAL_DYN.bluebird);
    this.g = el('g', null, ctx.L.actors); this.el = this.g; this.f = el('g', null, this.g); this.s = el('g', { transform: `scale(${this.k.toFixed(3)})` }, this.f);
    this.p = drawBird(this.s);
    this.ph = rg.rand(0, 6); this.i = i;
    dynamics.push(this);
  }
  /** לאן לטוס: ענף בעץ אחר (או באותו עץ, לקפיצה), או החוף לשתייה */
  next() {
    const r = this.rg.r(), here = this.at;
    if (r < .38) {
      const same = this.perches.filter(p => p.tree === here.tree && p !== here);
      if (same.length) { this.go(same[Math.floor(this.rg.r() * same.length)], 'hop'); return; }
    }
    if (r > .84 && this.shore.length) {
      const s = this.shore[Math.floor(this.rg.r() * this.shore.length)];
      this.go({ x: s[0], y: s[1], ground: s[1], tree: -1 }, 'fly'); this.drinkNext = true; return;
    }
    const near = this.perches.filter(p => p.tree !== here.tree && Math.hypot(p.x - here.x, p.y - here.y) < 260);
    const list = near.length ? near : this.perches;
    this.go(list[Math.floor(this.rg.r() * list.length)], 'fly');
  }
  go(to: Perch, how: 'hop' | 'fly') {
    this.from = { x: this.x, y: this.alt, ground: this.y }; this.to = to; this.state = how; this.t = 0;
    const d = Math.hypot(to.x - this.x, to.y - this.alt);
    this.dur = how === 'hop' ? .38 + d / 90 : .6 + d / 62;
    this.lift = how === 'hop' ? 4 + d * .25 : Math.min(46, 14 + d * .22);   // גובה הקשת
    if (Math.abs(to.x - this.x) > 1) this.face = to.x > this.x ? 1 : -1;
  }
  update(dt: number, t: number) {
    const P = this.p;
    this.timer -= dt;
    let wings = 0, flap = 0, headA = 0, beak = 0, tailA = 0, lean = 0;
    if (this.state === 'perch' || this.state === 'drink') {
      // פעולות קטנות בזמן הישיבה
      this.actT -= dt;
      if (this.actT <= 0) {
        const r = this.rg.r();
        this.act = this.state === 'drink' ? (r < .7 ? 'dip' : 'idle') : r < .3 ? 'look' : r < .5 ? 'preen' : r < .7 ? 'sing' : r < .85 ? 'flick' : 'turn';
        this.actT = this.act === 'preen' ? 1.4 : this.act === 'sing' ? 1.6 : this.act === 'dip' ? .9 : this.rg.rand(.6, 1.8);
        if (this.act === 'look') this.look = this.rg.rand(-24, 18);
        if (this.act === 'turn') this.face = -this.face;
        this.actStart = t;
      }
      const u = t - (this.actStart ?? 0);
      if (this.act === 'look') headA = this.look;
      if (this.act === 'preen') { headA = 62 + Math.sin(u * 14) * 6; }
      if (this.act === 'sing') { beak = Math.max(0, Math.sin(u * 13)) * 18; headA = -14; }
      if (this.act === 'flick') tailA = Math.max(0, Math.sin(u * 16)) * -18;
      if (this.act === 'dip') headA = Math.max(0, Math.sin(u * Math.PI / .9)) * 70;
      P.note.setAttribute('opacity', this.act === 'sing' && u < 1.4 ? (.9 * (1 - u / 1.4)).toFixed(2) : '0');
      P.note.setAttribute('transform', `translate(${n2(u * 2)},${n2(-u * 6)})`);
      if (this.timer <= 0) {
        if (this.state === 'drink') { this.state = 'perch'; this.at = { x: this.x, y: this.alt, ground: this.y, tree: -1 }; this.next(); this.drinkNext = false; }
        else { this.next(); }
        this.timer = this.rg.rand(3, 10);
      }
    } else {
      // מעוף או קפיצה לאורך קשת: פרצי נפנופים וגלישה (מעוף גלי), הנחיתה רכה
      this.t += dt;
      const s = Math.min(1, this.t / this.dur), e = s < .5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s);
      const a = this.from, b = this.to;
      this.x = a.x + (b.x - a.x) * e;
      const bob = this.state === 'fly' ? Math.sin(s * Math.PI * 4) * 2.2 * (1 - Math.abs(2 * s - 1)) : 0;
      this.alt = a.y + (b.y - a.y) * e - Math.sin(Math.PI * s) * this.lift + bob;
      this.y = a.ground + (b.ground - a.ground) * e;
      if (this.state === 'fly') {
        const burst = (this.t * 1.6 + this.ph) % 1 < .62;
        wings = s > .86 ? 1 : burst || s < .2 ? 1 : .55;
        flap = s > .86 ? .15 + .1 * Math.sin(t * 30) : burst || s < .2 ? Math.sin(t * 46) : .35;
        lean = (b.y - a.y) * .2 > 0 ? 8 : -8;
      } else { wings = s < .5 ? .7 : 0; flap = Math.sin(t * 40); }
      if (s >= 1) {
        this.at = b; this.state = this.drinkNext ? 'drink' : 'perch'; this.timer = this.state === 'drink' ? this.rg.rand(3, 5) : this.rg.rand(3, 11);
        this.actT = 0; this.act = 'idle';
      }
    }
    this.flip = this.face;   // ציפור מסתובבת בקפיצה מהירה: היפוך מיידי, בלי להתכווץ על הציר
    const on = inView(this.x, this.alt, 30); show(this.g, on);
    if (!on) return;
    // נשימה קטנה בגוף, ראש, מקור, זנב וכנפיים
    const breathe = 1 + Math.sin(t * 3.1 + this.ph) * .025;
    P.body.setAttribute('transform', `translate(0,-8) scale(1,${breathe.toFixed(3)}) translate(0,8)`);
    P.head.setAttribute('transform', `rotate(${headA.toFixed(1)} 4 -13)`);
    P.jaw.setAttribute('transform', `rotate(${beak.toFixed(1)} 7.8 -15.2)`);
    P.tail.setAttribute('transform', `rotate(${(tailA + Math.sin(t * 2 + this.ph) * 2).toFixed(1)} -4.5 -7)`);
    const fl = wings > 0;
    P.nearWing.setAttribute('opacity', fl ? '1' : '0'); P.farWing.setAttribute('opacity', fl ? '1' : '0'); P.wing.setAttribute('opacity', fl ? '0' : '1');
    P.legs.setAttribute('opacity', this.state === 'fly' && this.t / this.dur > .12 && this.t / this.dur < .88 ? '0' : '1');   // במעוף הרגליים מקופלות
    if (fl) {
      const sy = (.15 + .85 * (flap * .5 + .5)) * (flap < 0 ? -1 : 1) * wings;
      P.nearWing.setAttribute('transform', `translate(1,-12) scale(1,${sy.toFixed(2)}) translate(-1,12)`);
      P.farWing.setAttribute('transform', `translate(1,-12) scale(.86,${(sy * .9).toFixed(2)}) translate(-1,12)`);
    }
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.alt)})`);
    this.f.setAttribute('transform', `scale(${this.flip.toFixed(3)},1) rotate(${(lean * this.flip).toFixed(1)})`);
  }
}

/** הלהקה: כמה ציפורים, על העצים שסביב הבריכה (לפי שם, או הבריכה הראשונה מסוג fishingPond) */
export function bluebirds(o: { pond?: string; count: number }) {
  const pond = (ctx.world.objects as any[]).find(q => q.type === 'fishingPond' && (!o.pond || q.name === o.pond)) ?? (ctx.world.objects as any[]).find(q => q.type === 'fishingPond');
  if (!pond) return () => {};
  const { cx, cy, rx, ry } = pond, rg = rngAt(cx, cy, 91), perches: Perch[] = [];
  const trees = TREES.map((t, i) => ({ ...t, i })).filter(t => {
    const d = Math.hypot((t.x - cx) / (rx + 230), (t.y - cy) / (ry + 200));
    return d < 1 && ((t.x - cx) / (rx + 20)) ** 2 + ((t.y - cy) / (ry + 20)) ** 2 > 1;
  });
  for (const t of trees) {
    const w = t.x1 - t.x0, h = t.y - t.top, n = t.pine ? 2 : 3;
    for (let k = 0; k < n; k++) {
      const v = rngAt(t.x, t.y + k, 92), fy = v.rand(.16, .42), side = v.chance(.5) ? 1 : -1;
      const narrow = t.pine ? fy * .9 : 1 - Math.abs(fy - .35) * 1.6;   // באורן הצמרת צרה למעלה
      perches.push({ x: (t.x0 + t.x1) / 2 + side * w * v.rand(.12, .32) * narrow, y: t.top + h * fy, ground: t.y + .5, tree: t.i });
    }
  }
  // נקודות שתייה על החוף הדרומי של הבריכה (גלוי לצופה)
  const shore: number[][] = [];
  for (let a = .15; a < .85; a += .1) shore.push([cx + Math.cos(a * Math.PI) * (rx + 3), cy + Math.sin(a * Math.PI) * (ry + 3)]);
  if (!perches.length) return () => {};
  const birds = Array.from({ length: o.count }, (_, i) => new Bluebird(i, perches, shore, rngAt(cx + i, cy, 93)));
  (window as any).__bluebirds = birds;   // לבדיקות
  return (dt: number, t: number) => { for (const b of birds) b.update(dt, t); };
}
