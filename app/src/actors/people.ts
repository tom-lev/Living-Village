/* אנשים ובני לוויה: הולכים על רשת הדרכים, כלב עם רצועה, בלון, יושבים */
import { REAL_DYN, fitScale } from '../world/scale';
import { el, n2, P, clamp, shade, show, circ } from '../core/util';
import { inView, view } from '../camera/view';
import { R, rngAt } from '../core/rng';
import { KINDS, type Place } from '../world/places';
import { roleOf, routeTo, routeAt, chooseNext, durOf, surnameOf, actOf, prependRoute } from './agenda';
import { ripple } from '../world/context';
import { plotOfDoor } from '../prefabs/village';
import { STATION } from './station';
import { lakeShore } from '../scene/terrain';
let LAKE: ReturnType<typeof lakeShore> | undefined;
import { walkable } from '../world/walk';
import { ctx } from '../world/context';
import type { Look } from '../world/types';
import { Figure, PR, walkPose, sitPose, actPose, type View } from './figure';

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

/** הולך רגל עם אג'נדה: הולך ליעד (בית, חנות, שדה, יער, ים...), נכנס ונעלם או נשאר שם, ואחר כך ממשיך.
 *  מצבים: walk → (enter → inside → exit) או stay → walk ... ; צעדים לפי מרחק, מבט מהצד/מלפנים/מאחור */
export class Walker {
  [k: string]: any;
  constructor(look: Look, speed: number) {
    this.look = look; this.first = look.name; this.speed = speed; this.role = roleOf(look);
    this.rg = rngAt(look.h * 97, speed * 13, 23);
    this.laneOff = look.hold === 'leash' ? 6 : (this.rg.chance(.5) ? 1 : -1) * this.rg.rand(3, 8);   // צד קבוע בתוך הדרך
    this.fig = new Figure(ctx.L.actors, look); this.el = this.fig.g;
    this.x = 0; this.y = 0; this.hx = 1; this.hy = 0;
    this.view = 'side' as View; this.pend = 0; this.flip = 1;
    this.phase = R(); this.amp = 1; this.sf = 1; this.alpha = 1;
    this.trail = [[0, 0, 0]]; this.dist = 0;
    this.cullR = 50; this.shown = true;   // רדיוס לבדיקת "נראה" (גדל כשיש כלב או בלון)
    this.state = 'inside'; this.timer = 0; this.place = null; this.route = null; this.s = 0;
    this.recent = [] as number[]; this.outings = 0;
    dynamics.push(this); followable(this, this.fig.g);
  }
  /** התחלה: חלק מהדמויות בבית (יוצאות בהדרגה), וחלק כבר בדרך למקום כלשהו */
  start() {
    this.rules = { priv: plotOfDoor(this.home?.door) };   // מותר להיכנס רק למגרש של הבית שלי
    const d = this.home.door;
    this.place = this.home; this.x = d[0]; this.y = d[1];
    if (this.rg.chance(.4)) { this.state = 'inside'; this.alpha = 0; this.timer = this.rg.rand(0, 25); }
    else {
      this.go(chooseNext(this, this.rg), this.home);
      if (this.state === 'walk') { this.s = this.rg.rand(0, this.route.len * .7); const p = routeAt(this.route, this.s); this.x = p.x; this.y = p.y; }
    }
    this.trail = [[this.x, this.y, 0]];
  }
  /** יוצאים ליעד: מסלול מהמקום הנוכחי (מהדלת, אם יוצאים ממבנה) */
  go(to: Place, from: Place | null) {
    if (this.place?.busy === this) this.place.busy = null;   // קמים מהספסל
    this.platform = null;   // עוזבים את הרציף
    if (to.kind === 'sit') to.busy = this;                   // שומרים את הספסל
    const wasSwimming = this.act === 'swim';
    this.act = null; this.fig.setSwim(false);
    // הכללים של הדמות: מותר לה להיכנס רק למגרש של הבית שלה
    this.rules = this.rules || { priv: plotOfDoor(this.home?.door) };
    this.bad = this.bad || new Set<number>();
    // יוצאים מבניין מהדלת; יוצאים מהמים קודם אל החוף (בתוך המים אסור ללכת, רק לשחות)
    const swimOut = wasSwimming && this.place?.at, start = from?.door ? from.door : swimOut ? this.place.at : [this.x, this.y];
    let route = routeTo(start, to, this.rules);
    for (let k = 0; !route && k < 6; k++) { this.bad.add(to.id); to = chooseNext(this, this.rg); route = routeTo(start, to, this.rules); }
    if (!route) { this.place = to; this.state = 'stay'; this.timer = 5; this.act = 'look'; return; }   // אין לאן: מחכים רגע ומנסים שוב
    this.route = swimOut ? prependRoute(route, [this.x, this.y]) : route;
    this.place = to; this.s = 0; this.state = 'walk'; this.sf = .2;
    this.recent.push(to.id); if (this.recent.length > 4) this.recent.shift();
    if (to !== this.home) this.outings++;
  }
  /** שם מלא: השם הפרטי ושם המשפחה של הבית (משתנה אם שם הבית משתנה) */
  get name() { const s = surnameOf(this.home); return s ? `${this.first} ${s}` : this.first; }
  /** לאן הדמות הולכת / מה היא עושה (מוצג כשעוקבים אחריה) */
  get status() {
    const p = this.place, n = p?.name ? ` (${p.name})` : '';
    if (!p) return this.name;
    if (this.state === 'walk' || this.state === 'exit') return `${this.name} · ${p === this.home ? 'walking home' : 'on the way to ' + (p.name || KINDS[p.kind].label)}`;
    if (this.platform) return `${this.name} · waiting for the train`;
    if (this.state === 'board' || this.state === 'away' || this.state === 'alight') return `${this.name} · on the train`;
    return `${this.name} · ${p === this.home ? 'at home' : KINDS[p.kind].label}${p === this.home ? '' : n}`;
  }
  update(dt: number, t: number) {
    let tx = this.x, ty = this.y, walking = false;
    if (this.state === 'walk') {
      const left = this.route.len - this.s;
      this.sf = Math.min(1, this.sf + dt * 1.1);
      this.s = Math.min(this.route.len, this.s + this.speed * Math.min(this.sf, clamp(left / 24, .15, 1)) * dt);   // מאטים לפני היעד
      const p = routeAt(this.route, this.s), tunnel = p.lane < -.3, off = tunnel ? 0 : this.laneOff * Math.max(0, p.lane);
      tx = p.x - p.ty * off; ty = p.y + p.tx * off; walking = true;
      // במנהרה: נעלמים בכניסה ומופיעים ביציאה
      this.alpha = tunnel ? Math.max(0, this.alpha - dt / .6) : Math.min(1, this.alpha + dt / .6);
      if (left < .5) {
        // תחנת רכבת: לא נעלמים בדלת, אלא מחכים על הרציף לרכבת הבאה (ומוותרים אחרי 150 שניות)
        if (this.place.kind === 'train' && this.place.door) { const d = this.place.door; this.platform = [d[0] + this.rg.rand(-45, 45), d[1] + 9]; this.state = 'stay'; this.act = 'look'; this.actPh = this.rg.rand(0, 6); this.timer = 150; }
        else if (KINDS[this.place.kind].enter) this.state = 'enter';
        else { this.state = 'stay'; this.timer = durOf(this.place, this.rg); this.act = actOf(this.place, this.rg); this.actPh = this.rg.rand(0, 6); }
      }
    } else if (this.state === 'enter') {
      this.alpha = Math.max(0, this.alpha - dt / .8);
      if (!this.alpha) { this.state = 'inside'; this.timer = durOf(this.place, this.rg); }
    } else if (this.state === 'inside') {
      this.timer -= dt;
      if (this.timer <= 0) {
        const from = this.place; this.state = 'exit';
        const d = from.door; this.x = d[0]; this.y = d[1];
        this.go(chooseNext(this, this.rg), from); this.state = 'exit';
      }
    } else if (this.state === 'board') {
      // עולים לרכבת: צעד אל הקרון ונעלמים
      tx = this.x; ty = STATION.stopped ? STATION.stopped.y - 7 : this.y; walking = Math.abs(ty - this.y) > 2;
      this.alpha = Math.max(0, this.alpha - dt / .8);
      if (!this.alpha) { this.state = 'away'; this.timer = durOf(this.place, this.rg); this.platform = null; }
    } else if (this.state === 'away') {
      // בנסיעה: חוזרים ברכבת שעוצרת בתחנה אחרי שהזמן עבר
      this.timer -= dt;
      const st = STATION.stopped, d = this.place.door;
      if (this.timer <= 0 && st && d) {
        this.x = clamp(d[0] + this.rg.rand(-50, 50), st.x0 + 12, st.x1 - 12); this.y = st.y - 7; this.state = 'alight';
      }
    } else if (this.state === 'alight') {
      // יורדים מהרכבת אל הרציף, ומשם ממשיכים
      const d = this.place.door; tx = this.x; ty = d[1] + 9; walking = Math.abs(ty - this.y) > 1;
      this.alpha = Math.min(1, this.alpha + dt / .8);
      if (this.alpha >= 1 && !walking) this.go(chooseNext(this, this.rg), null);
    } else if (this.state === 'exit') {
      this.alpha = Math.min(1, this.alpha + dt / .8);
      if (this.alpha >= 1) this.state = 'walk';
    } else if (this.state === 'stay') {
      if (this.act === 'sit' && this.place.seat) { tx = this.place.seat[0]; ty = this.place.seat[1]; }
      if (this.platform) {
        // מחכים על הרציף; כשרכבת עומדת בתחנה ממול – עולים
        tx = this.platform[0]; ty = this.platform[1];
        const st = STATION.stopped;
        if (st && this.x > st.x0 + 8 && this.x < st.x1 - 8 && Math.hypot(tx - this.x, ty - this.y) < 4) { this.state = 'board'; this.act = null; }
      }
      if (this.act === 'swim') {
        // שוחים בכל האגם: מהחוף אל נקודות רחוקות במים, בשחייה איטית, ובסוף חוזרים אל המקום שממנו נכנסו
        const a = this.place.at, sea = ctx.world.terrain.sea.y, L = LAKE ??= lakeShore(ctx.world.terrain);
        if (!L) { tx = a[0] + Math.sin(t * .12 + this.actPh) * 45; ty = sea + 34 + Math.sin(t * .2 + this.actPh) * 8; }
        else {
          const home = [a[0], sea + 30];
          if (this.timer <= 8) this.swimTo = home;   // הזמן נגמר: שוחים בחזרה לחוף
          else if (!this.swimTo || Math.hypot(this.swimTo[0] - this.x, this.swimTo[1] - this.y) < 6) {
            for (let k = 0; k < 12; k++) {
              const ang = this.rg.rand(0, Math.PI * 2), r = this.rg.rand(60, 380), q = [this.x + Math.cos(ang) * r, this.y + Math.abs(Math.sin(ang)) * r * .8];
              if (L.inside(q[0], q[1], 30)) { this.swimTo = q; break; }
            }
          }
          const g = this.swimTo || home, d = Math.hypot(g[0] - this.x, g[1] - this.y) || 1, step = Math.min(d, this.speed * .55 * dt * 8);
          tx = this.x + (g[0] - this.x) / d * step; ty = this.y + (g[1] - this.y) / d * step;
        }
        if (this.y > sea + 6 && (this.rip = (this.rip || 0) - dt) <= 0) { this.rip = 1.5; ripple(this.x, this.y, 9, 3); }
      }
      walking = Math.hypot(tx - this.x, ty - this.y) > 3;   // הולכים אל הספסל או אל המים בצעדים, לא מחליקים
      this.timer -= dt;
      // שחייה: יוצאים מהמים רק כשחזרו לחוף (לא "הולכים" על המים)
      if (this.timer <= 0 && !(this.act === 'swim' && Math.hypot(this.x - this.place.at[0], this.y - ctx.world.terrain.sea.y - 30) > 14)) { this.swimTo = null; this.go(chooseNext(this, this.rg), null); }
    }
    // מרחב אישי: מתרחקים קצת מאנשים קרובים; מי שבא מולך עובר מימין, מי שהולך לפניך לאט — מאטים
    if (this.alpha > 0 && this.act !== 'sit' && this.act !== 'swim') {
      let px = 0, py = 0;
      for (const o of dynamics) {
        if (o === this || !(o.alpha > 0) || o.dogName) continue;
        const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
        if (d > 15 || d < 1e-3) continue;
        const push = (15 - d) / 15;
        px += dx / d * push * 7; py += dy / d * push * 4;
        if (walking && o.hx !== undefined) {
          const facing = this.hx * o.hx + this.hy * o.hy;
          if (facing < -.3) { px += -this.hy * push * 9; py += this.hx * push * 6; }                       // נפגשים: כל אחד זז לימינו
          else if (facing > .5 && (o.x - this.x) * this.hx + (o.y - this.y) * this.hy > 0) this.s -= this.speed * dt * push * .8;   // הולך לפני: מאטים
        }
      }
      if ((px || py) && walkable(tx + px, ty + py, this.rules)) { tx += px; ty += py; }
    }
    const k = 1 - Math.exp(-dt * 7);
    let nx = this.x + (tx - this.x) * k, ny = this.y + (ty - this.y) * k;
    // במקום (אל הספסל, אל המים): הולכים במהירות ההליכה הרגילה, לא "מחליקים" מהר כשהיעד רחוק
    if (this.state === 'stay' && walking) {
      const st = Math.hypot(nx - this.x, ny - this.y), mx = this.speed * dt * 1.1;
      if (st > mx) { nx = this.x + (nx - this.x) * mx / st; ny = this.y + (ny - this.y) * mx / st; }
    }
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
    this.amp += ((walking ? .35 + .65 * this.sf : 0) - this.amp) * Math.min(1, dt * 6);
    const A = PR.A * this.look.h * Math.max(this.amp, .35);
    this.phase += this.view === 'side' ? ds * Math.abs(this.hx) / (4 * A) : ds * Math.abs(this.hy) / (4 * A * PR.KF);
    // מחוץ למסך (או בפנים) ממשיכים לחיות, רק לא מציירים את השלד
    this.shown = this.alpha > 0 && inView(this.x, this.y - 16, this.cullR); show(this.el, this.shown);
    if (!this.shown) return;
    // דמות קטנה על המסך (פחות מ-30 פיקסלים): התנוחה מתעדכנת בכל פריים שני, וההזזה בכל פריים. ההבדל לא נראה, והחיסכון כפול
    this.tick = (this.tick || 0) + 1;
    if (this.look.h * view.cam.k < 30 && this.alpha >= 1 && (this.tick & 1)) { this.fig.move(this.x, this.y); return; }
    const swimming = this.act === 'swim' && this.y > ctx.world.terrain.sea.y + 6;
    this.fig.setSwim(swimming);
    const settled = this.state === 'stay' && ds < .08;   // הגיעו למקום ולא זזים: תנוחת הפעילות
    const pose = swimming ? actPose(this.look, 'swim', t, this.actPh)
      : settled && this.act === 'sit' ? sitPose(this.look, .3 * this.look.h, [[.2 * this.look.h, -.33 * this.look.h], [.17 * this.look.h, -.32 * this.look.h]], t)
      : settled && this.act ? actPose(this.look, this.act, t, this.actPh)
      : walkPose(this.look, this.view, this.phase, this.amp, t);
    // תנוחות פעילות מצוירות מהצד: הכיוון מתייצב על שמאל או ימין (אחרי הליכה ישר למטה הוא יכול להישאר באמצע ולמעוך את הדמות)
    if (pose.view === 'side' && !(this.state === 'walk' && this.view === 'side')) { const sgn = settled && this.act === 'sit' && this.place?.face ? this.place.face : this.flip >= 0 ? 1 : -1; this.flip += (sgn - this.flip) * Math.min(1, dt * 8 + .02); }
    this.fig.render(pose, this.x, this.y, this.flip, this.alpha);
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
    this.owner = owner; this.dogName = name;
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
    /* מבט מלפנים (הולך אל הצופה) ומאחור (הולך הלאה ממנו). שלושת המבטים מצוירים פעם אחת, ובכל רגע רק אחד נראה;
       במעבר יש דהייה קצרה ביניהם */
    const view = () => el('g', { opacity: 0 }, this.g);
    const legs = (g: any) => [dk, dk, color, color].map(c => el('path', { stroke: c, 'stroke-width': 2.3, 'stroke-linecap': 'round', fill: 'none' }, g));
    this.front = view();
    this.legsFront = legs(this.front);
    el('ellipse', { cx: 0, cy: -8.5, rx: 5.6, ry: 5, fill: color }, this.front);
    el('ellipse', { cx: 0, cy: -7.6, rx: 3, ry: 3, fill: shade(color, .25) }, this.front);
    el('path', { d: 'M-2.6,-11h5.2', stroke: '#e2574c', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, this.front);
    el('path', { d: 'M-3.6,-17.2q-3.2,.6 -2.6,5.4q2,-.8 2.8,-3.6zM3.6,-17.2q3.2,.6 2.6,5.4q-2,-.8 -2.8,-3.6z', fill: dk }, this.front);
    el('circle', { cx: 0, cy: -14.6, r: 4.1, fill: color }, this.front);
    el('ellipse', { cx: 0, cy: -12.6, rx: 2.3, ry: 1.7, fill: shade(color, .3) }, this.front);
    el('circle', { cx: 0, cy: -13.3, r: .85, fill: '#2b2220' }, this.front);
    el('path', { d: circ(-1.6, -15.4, .55) + circ(1.6, -15.4, .55), fill: '#2b2220' }, this.front);
    this.back = view();
    this.legsBack = legs(this.back);
    el('circle', { cx: 0, cy: -15.4, r: 3.8, fill: shade(color, -.05) }, this.back);
    el('path', { d: 'M-3.4,-17.6q-3,.8 -2.4,5q1.8,-.8 2.6,-3.4zM3.4,-17.6q3,.8 2.4,5q-1.8,-.8 -2.6,-3.4z', fill: dk }, this.back);
    el('path', { d: 'M-2.6,-12.4h5.2', stroke: '#e2574c', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, this.back);
    el('ellipse', { cx: 0, cy: -8.5, rx: 5.6, ry: 5, fill: color }, this.back);
    this.tailBack = el('path', { d: 'M0,0q1.5,-3.5 0,-7', stroke: color, 'stroke-width': 2.2, 'stroke-linecap': 'round', fill: 'none' }, this.back);
    this.vis = { side: 1, front: 0, back: 0 }; this.view = 'side';
    el('rect', { x: -14, y: -22, width: 30, height: 24, fill: 'transparent' }, this.g);
    owner.cullR = 90;   // הכלב והרצועה נראים יחד עם הבעלים
    const p = owner.pointBack(24); this.x = p[0]; this.y = p[1]; this.flip = 1; this.phase = 0; this.amp = 1; this.hx = 1;
    this.k = fitScale(17.8, REAL_DYN.dog);   // גודל לפי טבלת הפרופורציות (הציור גבוה 17.8 עד קצה הראש)
    dynamics.push(this); followable(this, this.g);
  }
  get name() { return `${this.dogName} (${this.owner.name}'s dog)`; }
  update(dt: number, t: number) {
    const o = this.owner, k = 1 - Math.exp(-dt * 8);
    // הבעלים בתוך מבנה שאינו הבית (חנות, כנסייה): הכלב מחכה בחוץ ליד הדלת. בבית: נכנס איתו
    const inside = o.state === 'enter' || o.state === 'inside' || o.state === 'exit' || o.state === 'board' || o.state === 'away' || o.state === 'alight';
    this.waiting = inside && o.place !== o.home && !!o.place?.door;
    this.alpha = this.waiting ? 1 : o.alpha;
    let tgt = this.waiting ? [o.place.door[0] + 16, o.place.door[1] + 9] : o.pointBack(26);
    // לא עוברים דרך הבעלים (למשל כשהוא מסתובב במבוי סתום): קרוב מדי → עוקפים אותו מהצד
    const ox = this.x - o.x, oy = this.y - o.y, od = Math.hypot(ox, oy) || 1;
    if (od < 18) {
      const push = 18 - od, px = -o.hy, py = o.hx, side = ox * px + oy * py >= 0 ? 1 : -1;
      tgt = [tgt[0] + (ox / od + px * side) * push, tgt[1] + (oy / od + py * side) * push * .6];
    }
    const nx = this.x + (tgt[0] - this.x) * k, ny = this.y + (tgt[1] - this.y) * k, dx = nx - this.x, ds = Math.hypot(dx, ny - this.y);
    this.x = nx; this.y = ny;
    const moving = dt > 0 && ds / dt > 3;
    // לאן פונים: בזמן תנועה – לכיוון התנועה; בעמידה – אל הבעלים. לרוחב: מבט צד; למטה (אל הצופה): מלפנים; למעלה: מאחור.
    // מחליפים מבט רק כשהכיוון השתנה בבירור (פי 1.4), כדי שלא יהבהב באלכסון
    const dy = ny - (this.py ?? ny); this.py = ny;
    const vx = moving ? dx : o.x - this.x, vy = moving ? dy : o.y - this.y;
    if (moving || Math.hypot(vx, vy) > 6) {
      if (Math.abs(vx) > Math.abs(vy) * 1.4) this.view = 'side';
      else if (Math.abs(vy) > Math.abs(vx) * 1.4) this.view = vy > 0 ? 'front' : 'back';
    }
    if (Math.abs(vx) > 2) this.face = vx > 0 ? 1 : -1;
    this.flip += ((this.face ?? 1) - this.flip) * Math.min(1, dt * 9);
    this.amp += ((moving ? 1 : 0) - this.amp) * Math.min(1, dt * 5);
    this.phase += ds / (13 * this.k);
    const sk = this.k;
    this.collar = this.view === 'side' ? [this.x + 5.6 * this.flip * sk, this.y - 10.5 * sk] : [this.x, this.y - (this.view === 'front' ? 11 : 12.4) * sk];
    const vis = this.waiting ? this.alpha > 0 && inView(this.x, this.y - 10, 30) : this.owner.shown && this.alpha > 0;
    show(this.g, vis);
    if (!vis) return;
    // טרוט: רגל קדמית ואחורית אלכסונית זזות יחד
    const leg = (pe: any, hx: number, off: number) => {
      const q = (this.phase + off) * Math.PI * 2, fx = hx + Math.sin(q) * 2.6 * this.amp, fy = -Math.max(0, Math.cos(q)) * 1.8 * this.amp;
      pe.setAttribute('d', `M${n2(hx)},-7.5L${n2(fx)},${n2(fy)}`);
    };
    leg(this.legsNear[0], 6, 0); leg(this.legsNear[1], -6, .5); leg(this.legsFar[0], 4.5, .5); leg(this.legsFar[1], -7.5, 0);
    // מלפנים ומאחור: הרגליים לא זזות לרוחב, רק מתרוממות לסירוגין (טרוט)
    const lift = (pe: any, lx: number, off: number, top: number) => {
      const q = (this.phase + off) * Math.PI * 2, fy = -Math.max(0, Math.cos(q)) * 1.8 * this.amp;
      pe.setAttribute('d', `M${n2(lx)},${top}L${n2(lx)},${n2(fy)}`);
    };
    for (const L of [this.legsFront, this.legsBack]) {
      lift(L[0], -4.2, .5, -6); lift(L[1], 4.2, 0, -6);     // הזוג הרחוק (כהה)
      lift(L[2], -2.6, 0, -5.5); lift(L[3], 2.6, .5, -5.5);  // הזוג הקרוב
    }
    this.tailBack.setAttribute('transform', `translate(0,-11) rotate(${(Math.sin(t * (moving ? 7 : 4)) * 22).toFixed(1)})`);
    // דהייה קצרה בין המבטים
    for (const v of ['side', 'front', 'back']) this.vis[v] += ((this.view === v ? 1 : 0) - this.vis[v]) * Math.min(1, dt * 12);
    this.b.setAttribute('opacity', this.vis.side.toFixed(2)); this.front.setAttribute('opacity', this.vis.front.toFixed(2)); this.back.setAttribute('opacity', this.vis.back.toFixed(2));
    this.tail.setAttribute('transform', `translate(-8,-10) rotate(${(Math.sin(t * (moving ? 7 : 4)) * 16).toFixed(1)})`);
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y)}) scale(${sk.toFixed(3)})`);
    this.g.setAttribute('opacity', this.alpha.toFixed(2));
    this.b.setAttribute('transform', `scale(${this.flip.toFixed(3)},1)`);
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
    this.look = look; this.first = look.name; this.role = roleOf(look); this.x = x; this.y = y; this.seat = seat * look.h; this.flip = flip; this.hands = SIT_BEHAVIORS[behavior];
    this.fig = new Figure(ctx.L.actors, look); this.el = this.fig.g;
    dynamics.push(this); followable(this, this.fig.g);
  }
  get name() { const s = surnameOf(this.home); return s ? `${this.first} ${s}` : this.first; }
  update(dt: number, t: number) {
    const on = inView(this.x, this.y - 16, 50); show(this.el, on);
    if (on) this.fig.render(sitPose(this.look, this.seat, this.hands(t, this.look.h), t), this.x, this.y, this.flip);
  }
}

/** בלון: קפיץ מרוסן שקשור ליד */
export class Balloon {
  [k: string]: any;
  constructor(owner: Walker, color: string) {
    this.owner = owner; this.len = 30; owner.cullR = 80;
    this.str = el('path', { fill: 'none', stroke: '#6b5a4a', 'stroke-width': .7 }, ctx.L.air);
    this.g = el('g', null, ctx.L.air);
    el('ellipse', { cx: 0, cy: 0, rx: 6.4, ry: 7.8, fill: color }, this.g);
    el('ellipse', { cx: -2.2, cy: -3, rx: 1.6, ry: 2.4, fill: '#fff', opacity: .55 }, this.g);
    el('path', { d: 'M-1.4,8.4l1.4,-1.2l1.4,1.2z', fill: shade(color, -.2) }, this.g);
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.init = false;
  }
  update(dt: number, t: number) {
    // הבלון נראה יחד עם הבעלים; בחזרה למסך הוא מתחיל שוב מעל היד
    const on = this.owner.shown; show(this.g, on); show(this.str, on);
    if (!on) { this.init = false; return; }
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
    const on = this.owner.shown && !this.dog.waiting && this.owner.alpha > 0; show(this.p, on); if (!on) return;
    const a = this.owner.fig.hand, b = this.dog.collar; if (!a || !b) return;
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), sag = Math.max(0, 30 - d) * .35 + 2;
    this.p.setAttribute('d', `M${P(a)}Q${n2((a[0] + b[0]) / 2)},${n2((a[1] + b[1]) / 2 + sag)} ${P(b)}`);
    this.p.setAttribute('opacity', this.owner.alpha.toFixed(2));
  }
}
