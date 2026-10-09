/* עוד שלושה סוגי ציפורים (משימה 18), כל אחד במקום ובהתנהגות שלו:
   - דרור הבית (sparrow): להקות קטנות בכיכרות הכפר. מקפצים על הקרקע, מנקרים, מסתכלים סביב, ובבהלה עפים יחד קצת הלאה.
   - אנפה אפורה (heron): בשולי האגמים והבריכות. הולכת לאט על רגליים ארוכות, קופאת, דוקרת במקור למים, ולפעמים עפה
     בנפנופים איטיים (צוואר מקופל, רגליים נגררות מאחור) לנקודה אחרת על החוף.
   - עפרוני (lark): בערבה. מקפץ בין העשב, ולפעמים מתרומם ב"מעוף שירה": עולה גבוה, מרחף ומנפנף, ויורד לאט.
   מבט מהצד, פונה ימינה, כפות הרגליים ב-0,0. גודל לפי טבלת הפרופורציות (ציפורים קטנות בקנה מידה של מפה, כמו הכחלי).
   ההיגיון רץ תמיד, הציור רק כשהציפור על המסך. */
import { el, n2, circ, show, shade } from '../core/util';
import { rngAt, type LocalRng } from '../core/rng';
import { ctx } from '../world/context';
import { inView, updateFar, view } from '../camera/view';
import { REAL_DYN, fitScale } from '../world/scale';
import { lakeShore } from '../scene/terrain';
import { dynamics } from './people';

type Kind = 'sparrow' | 'heron' | 'lark';
const NATURAL_H: Record<Kind, number> = { sparrow: 12, lark: 12.5, heron: 31 };

/* ───── ציורים ───── */
function wingPair(g: any, c: string, dk: string, span: number, sh: number[]) {
  const far = el('g', { opacity: 0 }, g), near = el('g', { opacity: 0 }, g);
  const d = (k: number) => `M${sh[0]},${sh[1]}C${n2(sh[0] - span * .25)},${n2(sh[1] - span * .7 * k)} ${n2(sh[0] - span * .8)},${n2(sh[1] - span * .8 * k)} ${n2(sh[0] - span)},${n2(sh[1] - span * .62 * k)}C${n2(sh[0] - span * .7)},${n2(sh[1] - span * .32 * k)} ${n2(sh[0] - span * .35)},${n2(sh[1] - span * .1)} ${n2(sh[0] - span * .1)},${n2(sh[1] + span * .08)}Z`;
  el('path', { d: d(1), fill: dk }, far);
  el('path', { d: d(1.05), fill: c, stroke: dk, 'stroke-width': .4 }, near);
  return { far, near };
}
function sparrow(g: any, v: LocalRng) {
  const male = v.chance(.5), brown = v.pick(['#a8825a', '#b08a62', '#9c7a56']), dk = shade(brown, -.3);
  const legs = el('path', { d: 'M-.6,-2.6L-1,0M.8,-2.6L.8,0', stroke: '#b0846a', 'stroke-width': .6, 'stroke-linecap': 'round', fill: 'none' }, g);
  const tail = el('path', { d: 'M-3.6,-4.8L-8,-3.8L-7.6,-2.6L-3.6,-3.8Z', fill: dk }, g);
  const W = wingPair(g, brown, dk, 9, [1, -7]);
  el('path', { d: 'M-4,-4.6C-4,-7.6 -1,-8.6 2,-8.2C4.6,-7.8 5.4,-5.6 4.4,-3.8C3,-2.2 -2,-2.2 -4,-4.6Z', fill: brown }, g);
  el('path', { d: 'M-2,-3C0,-2.2 3,-2.4 4.4,-3.8C4.8,-5.6 3.6,-6.8 2.4,-6.4C1.6,-4.6 -.2,-3.6 -2,-3Z', fill: '#e8dccb' }, g);   // בטן
  const wing = el('g', null, g);
  el('path', { d: 'M-3.6,-6.4C-1,-7.8 1.6,-7 2,-5.2C0,-4.4 -2.6,-4.4 -4.6,-5Z', fill: shade(brown, -.12) }, wing);
  el('path', { d: 'M-3,-6.2l1,.8M-1.6,-6.6l1,.9M-.2,-6.6l.9,.9', stroke: '#3b2a1e', 'stroke-width': .5, 'stroke-linecap': 'round' }, wing);
  el('path', { d: 'M-2.4,-5.2h2.6', stroke: '#f4ecdc', 'stroke-width': .5 }, wing);   // פס לבן בכנף
  const head = el('g', null, g);
  el('circle', { cx: 3.8, cy: -9, r: 2.8, fill: brown }, head);
  el('path', { d: 'M1.4,-10C2.4,-12.2 5,-12.2 6.2,-10.4C5,-10.8 3,-10.8 1.4,-10Z', fill: male ? '#8c8a86' : brown }, head);   // כיפה אפורה
  el('ellipse', { cx: 4.4, cy: -8.2, rx: 1.6, ry: 1, fill: '#efe7d8' }, head);   // לחי
  if (male) el('path', { d: 'M5.4,-7.6C5.2,-6.2 4.4,-5.6 3.6,-5.8C4.4,-6.6 4.8,-7.2 4.8,-7.8Z', fill: '#2b2420' }, head);   // סינר שחור
  el('circle', { cx: 4.9, cy: -9.4, r: .55, fill: '#1f1a17' }, head);
  el('path', { d: 'M6.2,-9.6L8,-9.1L6.2,-8.6Z', fill: '#3b302a' }, head);
  return { legs, tail, wing, head, W, sh: [1, -7], neck: [3.6, -7.4] };
}
function lark(g: any, v: LocalRng) {
  const c = v.pick(['#a88c62', '#b39770', '#9e8460']), dk = shade(c, -.3);
  const legs = el('path', { d: 'M-.4,-2.6L-.8,0M.9,-2.6L.9,0', stroke: '#c49a7a', 'stroke-width': .55, 'stroke-linecap': 'round', fill: 'none' }, g);
  const tail = el('g', null, g);
  el('path', { d: 'M-3.8,-4.6L-9.4,-3.8L-9.2,-2.4L-3.8,-3.6Z', fill: dk }, tail);
  el('path', { d: 'M-9.4,-3.8L-9.2,-2.4', stroke: '#f4ecdc', 'stroke-width': .7 }, tail);   // שוליים לבנים בזנב
  const W = wingPair(g, c, dk, 11, [1, -7]);
  el('path', { d: 'M-4.2,-4.6C-4.2,-7.4 -1.2,-8.4 1.8,-8C4.4,-7.6 5.2,-5.6 4.2,-3.8C2.8,-2.2 -2.2,-2.2 -4.2,-4.6Z', fill: c }, g);
  el('path', { d: 'M-1.6,-3C.4,-2.3 3,-2.4 4.2,-3.8C4.6,-5.2 3.8,-6.2 2.8,-6C2,-4.6 .4,-3.6 -1.6,-3Z', fill: '#efe4cf' }, g);
  el('path', { d: circ(1.8, -5, .35) + circ(3, -4.4, .35) + circ(2.4, -3.6, .3) + circ(3.4, -5.6, .3), fill: dk }, g);   // פסים בחזה
  const wing = el('g', null, g);
  el('path', { d: 'M-3.8,-6.4C-1,-7.8 1.6,-7 2,-5.2C0,-4.4 -2.6,-4.4 -4.8,-5Z', fill: shade(c, -.1) }, wing);
  el('path', { d: 'M-3.2,-6.2l1.2,.7M-1.8,-6.6l1.2,.8M-.4,-6.6l1,.8M-2.6,-5.4l1,.6', stroke: dk, 'stroke-width': .45, 'stroke-linecap': 'round' }, wing);
  const head = el('g', null, g);
  el('circle', { cx: 3.6, cy: -9, r: 2.6, fill: c }, head);
  el('path', { d: 'M1.6,-10.4L.6,-13L3,-11.2Z', fill: dk }, head);   // ציצית
  el('path', { d: 'M2.8,-9.6C3.6,-10 4.8,-10 5.6,-9.6', fill: 'none', stroke: '#efe4cf', 'stroke-width': .5 }, head);   // גבה בהירה
  el('circle', { cx: 4.6, cy: -9.2, r: .5, fill: '#1f1a17' }, head);
  el('path', { d: 'M5.9,-9.3L7.6,-8.9L5.9,-8.4Z', fill: '#5a4a3e' }, head);
  return { legs, tail, wing, head, W, sh: [1, -7], neck: [3.4, -7.4] };
}
function heron(g: any) {
  const grey = '#9aa3aa', dk = '#6e767d';
  const legs = el('path', { stroke: '#c9b26a', 'stroke-width': 1, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, g);
  const W = wingPair(g, '#8a939a', '#5e666c', 26, [2, -19]);
  const tail = el('path', { d: 'M-8,-17.4L-11.6,-15.6L-8.4,-15.2Z', fill: dk }, g);
  el('path', { d: 'M-8.6,-17C-8.6,-21 -4,-23 1,-22.6C5,-22.2 7,-20 6.4,-17.4C5.6,-14.8 1,-13.6 -3,-13.8C-6.6,-14 -8.6,-15 -8.6,-17Z', fill: grey }, g);
  const wing = el('g', null, g);
  el('path', { d: 'M-7.6,-18.6C-4,-21.6 2,-21.4 4.6,-19.2C2,-16.4 -3,-15.6 -8.4,-16.2Z', fill: '#8a939a' }, wing);
  el('path', { d: 'M-8.4,-16.2C-6,-15.4 -3,-15.6 -.6,-16.2', fill: 'none', stroke: '#2e3236', 'stroke-width': .9 }, wing);   // שוליים שחורים
  el('path', { d: 'M-6.4,-17.6l3,-.4M-4.6,-18.8l3.2,-.2', stroke: '#b9c0c5', 'stroke-width': .4 }, wing);
  // צוואר וראש (מסתובבים יחד מבסיס הצוואר): S לבן עם פס שחור, ראש קטן עם נוצת ציצה שחורה, מקור צהוב ארוך
  const head = el('g', null, g);
  el('path', { d: 'M4.4,-20.6C6.6,-22.4 4,-25.4 5.4,-28.4C6.4,-30.4 8.4,-30.8 9.4,-30', fill: 'none', stroke: '#f2f2ee', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, head);
  el('path', { d: 'M5.6,-22.4C6,-24 5,-25.6 5.8,-27.6', fill: 'none', stroke: '#2e3236', 'stroke-width': .55, 'stroke-dasharray': '.9 .8' }, head);
  el('ellipse', { cx: 9.6, cy: -30.6, rx: 2, ry: 1.5, fill: '#f6f6f2' }, head);
  el('path', { d: 'M8.4,-31.6C6.6,-32.4 4.8,-32.4 3.4,-31.6', fill: 'none', stroke: '#2e3236', 'stroke-width': .7, 'stroke-linecap': 'round' }, head);   // ציצה
  el('path', { d: 'M11.2,-31L17.8,-30.2L11.2,-29.6Z', fill: '#e2b13c' }, head);
  el('circle', { cx: 10.2, cy: -31, r: .45, fill: '#1f1a17' }, head);
  return { legs, tail, wing, head, W, sh: [2, -19], neck: [4.6, -20.4] };
}

/* ───── התנהגות ───── */
class Bird {
  [k: string]: any;
  constructor(kind: Kind, spots: number[][], home: number[], rg: LocalRng, start?: number) {
    this.kind = kind; this.spots = spots; this.rg = rg;
    const s0 = spots[start !== undefined ? start % spots.length : Math.floor(rg.r() * spots.length)];
    this.x = s0[0]; this.y = s0[1]; this.alt = 0; this.home = home;
    this.face = rg.chance(.5) ? 1 : -1; this.flip = this.face; this.state = 'stand'; this.timer = rg.rand(1, 6); this.act = 'idle'; this.actT = 0;
    this.k = fitScale(NATURAL_H[kind], REAL_DYN[kind]);
    this.g = el('g', null, ctx.L.actors); this.el = this.g; this.f = el('g', null, this.g); this.s = el('g', { transform: `scale(${this.k.toFixed(3)})` }, this.f);
    el('ellipse', { cx: 0, cy: .5, rx: kind === 'heron' ? 7 : 3.4, ry: kind === 'heron' ? 1.5 : .8, fill: 'rgba(40,70,20,.2)' }, this.s);
    this.p = kind === 'sparrow' ? sparrow(this.s, rg) : kind === 'lark' ? lark(this.s, rg) : heron(this.s);
    this.ph = rg.rand(0, 6); this.legPh = 0;
    if (kind === 'sparrow') { this.sq = home; this.hops = 0; this.dir = rg.rand(0, 6.28); }
    dynamics.push(this);
  }
  get name() { return { sparrow: 'A sparrow', heron: 'A heron', lark: 'A skylark' }[this.kind as Kind]; }
  /** לאן עכשיו: מקום קרוב (קפיצה או הליכה), או רחוק יותר (מעוף); לעפרוני לפעמים מעוף שירה במקום */
  next() {
    const r = this.rg.r();
    if (this.kind === 'lark' && r < .22) { this.state = 'song'; this.t = 0; this.dur = this.rg.rand(9, 15); this.alt0 = 0; return; }
    const near = this.spots.filter(s => Math.hypot(s[0] - this.x, s[1] - this.y) < (this.kind === 'heron' ? 120 : 40));
    const far = r < (this.kind === 'heron' ? .25 : .3);
    const list = far || !near.length ? this.spots : near, s = list[Math.floor(this.rg.r() * list.length)];
    this.from = [this.x, this.y]; this.to = [s[0] + this.rg.rand(-6, 6), s[1] + this.rg.rand(-3, 3)]; this.t = 0;
    const d = Math.hypot(this.to[0] - this.x, this.to[1] - this.y);
    if (far) { this.state = 'fly'; this.dur = .8 + d / (this.kind === 'heron' ? 40 : 70); this.lift = Math.min(this.kind === 'heron' ? 70 : 30, 10 + d * .25); }
    else if (this.kind === 'heron') { this.state = 'walk'; this.dur = d / 7 + .5; }
    else { this.state = 'hop'; this.dur = .25 + d / 50; this.lift = 2.2; }
    if (Math.abs(this.to[0] - this.x) > 1) this.face = this.to[0] > this.x ? 1 : -1;
  }
  /* ── דרורים: מקפצים בשרשראות של קפיצות קטנות בתוך הכיכר, ומדי פעם עפים קצת ── */
  inSq(x: number, y: number) {
    const [cx, cy, rx, ry, rmin = 0] = this.sq, n = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    return n <= 1 && n >= rmin * rmin;
  }
  /** קפיצה קטנה אחת (שתי הרגליים יחד), בכיוון שמשתנה מעט; ליד השוליים פונים פנימה */
  startHop() {
    let tx = this.x, ty = this.y;
    for (let k = 0; k < 10; k++) {
      if (k > 0) { const s = this.spots[Math.floor(this.rg.r() * this.spots.length)]; this.dir = Math.atan2(s[1] - this.y, s[0] - this.x); }
      else this.dir += this.rg.rand(-.6, .6);
      const len = this.rg.rand(2.4, 4.4);
      tx = this.x + Math.cos(this.dir) * len; ty = this.y + Math.sin(this.dir) * len * .7;
      if (this.inSq(tx, ty)) break;
    }
    if (!this.inSq(tx, ty)) { tx = this.x; ty = this.y; }
    this.from = [this.x, this.y]; this.to = [tx, ty]; this.t = 0; this.state = 'hop'; this.dur = .16; this.lift = 1.8;
    if (Math.abs(tx - this.x) > .3) this.face = tx > this.x ? 1 : -1;
  }
  /** מעוף קצר נמוך לנקודה אחרת בכיכר; בבהלה – הרחק ממי שהתקרב */
  shortFlight(threat?: any) {
    let best: number[] | null = null, bs = -1;
    for (let k = 0; k < 12; k++) {
      const a = this.rg.rand(0, 6.28), d = this.rg.rand(threat ? 30 : 16, threat ? 70 : 45), p = [this.x + Math.cos(a) * d, this.y + Math.sin(a) * d * .7];
      if (!this.inSq(p[0], p[1])) continue;
      const sc = threat ? Math.hypot(p[0] - threat.x, p[1] - threat.y) : 1;
      if (sc > bs) { bs = sc; best = p; } if (!threat) break;
    }
    if (!best) { const s = this.spots[Math.floor(this.rg.r() * this.spots.length)]; best = [s[0], s[1]]; }
    const d = Math.hypot(best[0] - this.x, best[1] - this.y);
    this.from = [this.x, this.y]; this.to = best; this.t = 0; this.state = 'fly'; this.dur = .45 + d / 75; this.lift = 5 + d * .18; this.hops = 0;
    if (Math.abs(best[0] - this.x) > 1) this.face = best[0] > this.x ? 1 : -1;
  }
  sparrowNext() {
    if (this.rg.r() < .12) this.shortFlight();
    else { this.hops = 2 + Math.floor(this.rg.r() * 6); this.startHop(); }
  }
  update(dt: number, t: number) {
    const P = this.p;
    this.timer -= dt;
    let wings = 0, flap = 0, headA = 0, lean = 0;
    // בהלה: מישהו עובר קרוב → עפים (דרורים יחד, כי כולם רואים אותו)
    if (this.state === 'stand' || this.state === 'walk' || this.state === 'hop') {
      const scare = this.kind === 'heron' ? 50 : 34;
      const th = dynamics.find(o => o.first && o.alpha > 0 && Math.hypot(o.x - this.x, o.y - this.y) < scare);
      if (th) { this.state = 'stand'; this.timer = 0; this.scared = true; this.threat = th; }
    }
    if (this.state === 'stand') {
      this.actT -= dt;
      if (this.actT <= 0) {
        const r = this.rg.r();
        this.act = this.kind === 'heron' ? (r < .35 ? 'strike' : r < .6 ? 'look' : 'still') : r < .45 ? 'peck' : r < .75 ? 'look' : r < .9 ? 'preen' : 'idle';
        this.actT = this.act === 'strike' ? 1.2 : this.act === 'still' ? this.rg.rand(3, 7) : this.rg.rand(.6, 2);
        if (this.act === 'look') this.look = this.rg.rand(-20, 15);
        this.actS = t;
      }
      const u = t - (this.actS ?? 0);
      if (this.act === 'peck') headA = Math.max(0, Math.sin(u * 9)) * 48;
      if (this.act === 'look') headA = this.look;
      if (this.act === 'preen') headA = -120 + Math.sin(u * 12) * 8;
      if (this.act === 'strike') headA = u < .5 ? -10 * u / .5 : u < .65 ? 70 : Math.max(0, 70 - (u - .65) * 140);   // נסוג, דוקר מהר, וחוזר לאט
      if (this.timer <= 0 && this.kind === 'sparrow') {
        if (this.scared) { this.scared = false; this.shortFlight(this.threat); }
        else if (this.hops > 0) this.startHop();
        else this.sparrowNext();
      } else if (this.timer <= 0) {
        if (this.scared) { this.scared = false; const s = this.spots[Math.floor(this.rg.r() * this.spots.length)]; this.from = [this.x, this.y]; this.to = s; this.t = 0; const d = Math.hypot(s[0] - this.x, s[1] - this.y); this.state = 'fly'; this.dur = .8 + d / 60; this.lift = Math.min(40, 10 + d * .25); if (Math.abs(s[0] - this.x) > 1) this.face = s[0] > this.x ? 1 : -1; }
        else this.next();
        this.timer = this.kind === 'heron' ? this.rg.rand(6, 16) : this.rg.rand(1.5, 6);
      }
    } else if (this.state === 'song') {
      // מעוף שירה של עפרוני: עולה בהדרגה גבוה, מרחף ומנפנף, ויורד לאט חזרה
      this.t += dt; const u = this.t / this.dur;
      this.alt = u < .3 ? 80 * (u / .3) : u < .75 ? 80 + Math.sin(t * 1.3) * 4 : 80 * (1 - (u - .75) / .25);
      wings = 1; flap = u > .75 ? .3 + .1 * Math.sin(t * 20) : Math.sin(t * 40); lean = -25;
      if (u >= 1) { this.alt = 0; this.state = 'stand'; this.timer = this.rg.rand(2, 6); }
    } else {
      this.t += dt;
      const s = Math.min(1, this.t / this.dur), e = this.state === 'walk' ? s : s < .5 ? 2 * s * s : 1 - 2 * (1 - s) * (1 - s);
      this.x = this.from[0] + (this.to[0] - this.from[0]) * e; this.y = this.from[1] + (this.to[1] - this.from[1]) * e;
      if (this.state === 'walk') { this.legPh += dt * 1.6; headA = Math.sin(this.legPh * Math.PI * 2) * 4; }
      else {
        this.alt = Math.sin(Math.PI * s) * this.lift;
        if (this.state === 'fly') { wings = 1; flap = this.kind === 'heron' ? Math.sin(t * 7) : (this.t * 2 + this.ph) % 1 < .6 ? Math.sin(t * 44) : .3; lean = this.kind === 'heron' ? 0 : -6; }
      }
      if (this.kind === 'sparrow' && this.state === 'hop') lean = -10 * Math.sin(Math.PI * s);
      if (s >= 1) {
        this.alt = 0; this.actT = 0;
        if (this.kind === 'sparrow' && this.state === 'hop' && --this.hops > 0) {
          // בין קפיצה לקפיצה: הפסקה קצרצרה, ולפעמים ניקור
          this.state = 'stand'; this.timer = this.rg.rand(.05, .22); this.act = 'idle'; this.actT = this.timer;
          if (this.rg.chance(.3)) { this.act = 'peck'; this.actS = t; this.timer += .45; this.actT = this.timer; }
        } else { this.state = 'stand'; this.timer = this.kind === 'heron' ? this.rg.rand(6, 16) : this.rg.rand(1, 4.5); }
      }
    }
    this.flip = this.face;   // ציפור מסתובבת בקפיצה מהירה: היפוך מיידי, בלי להתכווץ על הציר
    const on = inView(this.x, this.y - this.alt - 10, 40); show(this.g, on);
    if (!on) return;
    // ציפור זעירה על המסך (פחות מ-10 פיקסלים, למשל דרורים כשרואים את כל הכפר): התנוחה מתעדכנת כל פריים שני, המיקום – תמיד
    if (NATURAL_H[this.kind] * this.k * view.cam.k < 10 && (this.tk = (this.tk ?? 0) ^ 1)) { this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y - this.alt)})`); return; }
    const fl = wings > 0;
    P.W.near.setAttribute('opacity', fl ? '1' : '0'); P.W.far.setAttribute('opacity', fl ? '1' : '0'); P.wing.setAttribute('opacity', fl ? '0' : '1');
    if (fl) {
      const sy = (.15 + .85 * (flap * .5 + .5)) * (flap < 0 ? -1 : 1);
      const [sx, sY] = P.sh;
      P.W.near.setAttribute('transform', `translate(${sx},${sY}) scale(1,${sy.toFixed(2)}) translate(${-sx},${-sY})`);
      P.W.far.setAttribute('transform', `translate(${sx},${sY}) scale(.85,${(sy * .9).toFixed(2)}) translate(${-sx},${-sY})`);
    }
    P.head.setAttribute('transform', `rotate(${headA.toFixed(1)} ${P.neck[0]} ${P.neck[1]})`);
    P.tail.setAttribute('transform', `rotate(${(Math.sin(t * 2.3 + this.ph) * 4).toFixed(1)} -4 -4)`);
    if (this.kind === 'heron') {
      // רגליים: עמידה – שתיהן ישרות; הליכה – אחת מורמת וכפופה קדימה לסירוגין; מעוף – נגררות ישר מאחור
      const q = this.legPh % 1, up = this.state === 'walk' ? Math.max(0, Math.sin(q * Math.PI * 2)) : 0, up2 = this.state === 'walk' ? Math.max(0, -Math.sin(q * Math.PI * 2)) : 0;
      const leg = (dx: number, u: number) => `M${dx},-14L${n2(dx + 1.6 * u)},${n2(-7 - 2.4 * u)}L${n2(dx + 3.2 * u)},${n2(-1.6 * u)}`;
      P.legs.setAttribute('d', fl ? 'M-6,-15L-14,-14.6M-6,-14.4L-14,-13.6' : leg(-1.4, up) + leg(.8, up2));
      if (fl) P.head.setAttribute('transform', `translate(-3,6) rotate(-10 ${P.neck[0]} ${P.neck[1]})`);   // במעוף הצוואר מקופל
    } else P.legs.setAttribute('opacity', this.state === 'fly' || this.state === 'song' ? '0' : '1');
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y - this.alt)})`);
    this.f.setAttribute('transform', `scale(${this.flip.toFixed(3)},1) rotate(${(lean * this.flip).toFixed(1)})`);
  }
}

/** מפזר את הציפורים: דרורים בכיכרות הכפר, אנפות בשולי האגמים והבריכות, עפרונים בערבה */
export function birds(o: { sparrows?: number; herons?: number; larks?: number }) {
  const w = ctx.world, all: Bird[] = [], T = w.terrain;
  // דרורים: על הרחבה המרוצפת של הכנסייה ועל הכיכר
  const squares = (w.objects as any[]).filter(q => q.type === 'plaza' || q.type === 'roundabout').map(q => q.type === 'plaza' ? [q.x, q.y, q.rx * .9, q.ry * .8, 0] : [q.x, q.y, (q.r ?? 40) + 36, (q.r ?? 40) + 36, .45]);
  squares.forEach((sq, si) => {
    const spots: number[][] = [];
    for (let a = 0; a < 18; a++) { const v = rngAt(sq[0] + a, sq[1], 95), r = v.rand(.45, 1), th = v.rand(0, Math.PI * 2); spots.push([sq[0] + Math.cos(th) * sq[2] * r, sq[1] + Math.sin(th) * sq[3] * r]); }
    const n = Math.round((o.sparrows ?? 0) / squares.length);
    for (let i = 0; i < n; i++) all.push(new Bird('sparrow', spots, sq, rngAt(sq[0] + i, sq[1] + si, 96)));
  });
  // אנפות: על החוף של אגמי המים והבריכות, וחוף האגם הדרומי
  const waters = (w.objects as any[]).filter(q => q.type === 'lake' || q.type === 'fishingPond');
  const shores: number[][][] = waters.map(q => Array.from({ length: 16 }, (_, k) => { const th = k / 16 * Math.PI * 2; return [q.cx + Math.cos(th) * (q.rx + 4), q.cy + Math.sin(th) * (q.ry + 4)]; }).filter(p => p[1] > q.cy - q.ry * .3));
  const L = lakeShore(T);
  if (L) { const s: number[][] = []; for (let x = L.Wx(T.sea.y) + 80; x < L.Ex(T.sea.y) - 80; x += 60) if (Math.abs(x - 420) > 140) s.push([x, T.sea.y + 6]); shores.push(s); }
  // כל אנפה מתחילה במקום אחר על החוף (שתיים באותו אגם – בצדדים שונים)
  for (let i = 0; i < (o.herons ?? 0); i++) { const s = shores[i % shores.length]; if (s.length) all.push(new Bird('heron', s, s[0], rngAt(i * 13 + 5, 7, 97), Math.floor(i / shores.length) * Math.ceil(s.length / 2) + i)); }
  // עפרונים: בערבה, כל אחד באזור משלו
  const P = T.prairie;
  if (P) for (let i = 0; i < (o.larks ?? 0); i++) {
    const v = rngAt(i, 11, 98), cx = v.rand(ctx.B.x0 + 300, ctx.B.x1 - 300), cy = v.rand(ctx.B.y0 + 200, P.full - 100), spots: number[][] = [];
    for (let k = 0; k < 14; k++) spots.push([cx + v.rand(-120, 120), cy + v.rand(-70, 70)]);
    all.push(new Bird('lark', spots, [cx, cy], v));
  }
  (window as any).__birds = all;   // לבדיקות
  return updateFar(all);   // רחוק מהמבט: פחות עדכונים (camera/view.ts farDt)
}
