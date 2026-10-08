/* חיות: סוסים וכבשים במכלאה, ברווזים ודג באגם, פרפרים מעל השדה */
import { el, n2, circ, rrect, shade, wrap1, clamp, show } from '../core/util';
import { inView } from '../camera/view';
import { rand, pick } from '../core/rng';
import { ctx, fxAt, ripple } from '../world/context';
import { Legs, type LegSpec } from './quad';

/** סוס: רועה, מרים ראש, ומדי פעם הולך לאט למקום אחר במכלאה, בהליכה של ארבע פעימות עם רגליים מפרקיות (actors/quad.ts).
 *  הזנב מתנופף, הרעמה זזה עם הראש, הראש מהנהן בהליכה. מבט מהצד: הולכים בעיקר לרוחב, כדי שהמבט יתאים לכיוון */
export class Horse {
  [k: string]: any;
  constructor(o: any) {
    const { x, y, color, mane, flip = 1, scale = 1 } = o;
    this.x = x; this.y = y; this.scale = scale; this.face = flip; this.flip = flip; this.area = ctx.named.paddock;
    this.g = el('g', null, ctx.L.pad); this.f = el('g', null, this.g);
    const g = this.f, dk = shade(color, -.2), hoof = '#3b2f2a';
    el('ellipse', { cx: 0, cy: 1, rx: 30, ry: 5, fill: 'rgba(60,40,10,.22)' }, g);
    const far = el('g', null, g);
    const tail = el('g', { transform: 'translate(-24,-42)' }, g); this.tail = el('g', null, tail);
    el('path', { d: 'M0,0C-6,4 -9,14 -7,26C-4,20 -1,12 1,4Z', fill: mane }, this.tail);
    el('path', { d: 'M-2,3C-5,9 -6,16 -5.4,22', fill: 'none', stroke: shade(mane, .2), 'stroke-width': .8 }, this.tail);
    this.body = el('g', null, g);
    el('path', { d: 'M-26,-38C-26,-45 -20,-48 -10,-48C0,-48.4 10,-48 18,-47C25,-46 27,-41 25,-35C23,-30 16,-28 8,-28C-2,-27.6 -12,-27.8 -19,-28.6C-24,-29.4 -26,-33 -26,-38Z', fill: color }, this.body);
    el('path', { d: 'M-21,-30C-8,-27.8 8,-27.8 21,-30.4C18,-28.6 12,-28 4,-28C-6,-27.8 -15,-28.4 -21,-30Z', fill: shade(color, -.1) }, this.body);   // צל בבטן
    el('path', { d: 'M-18,-46C-6,-47.6 8,-47.6 16,-46.4', fill: 'none', stroke: shade(color, .14), 'stroke-width': 1.4, 'stroke-linecap': 'round' }, this.body);
    const near = el('g', null, g);
    // צוואר וראש: מסתובבים יחד סביב נקודה בתוך הכתף; הכתף מצוירת מעל, כך שהמפרק לא נראה
    this.neck = el('g', { transform: 'translate(16,-40)' }, g);
    el('path', { d: 'M-7,6C-6,-6 -1,-18 4,-26L13,-23C11,-12 10,-2 9,6Z', fill: color }, this.neck);
    this.maneEl = el('path', { d: 'M-6,2C-5,-8 -1,-18 3,-27L7,-27C3,-18 0,-8 -1,2Z', fill: mane }, this.neck);
    el('path', { d: 'M2,-30C6,-34 14,-33 24,-26C28,-23 28,-18 24,-17C17,-17 10,-19 4,-21C0,-23 -1,-28 2,-30Z', fill: color }, this.neck);
    el('path', { d: 'M19,-25C24,-24 27,-21 25,-18C22,-17 19,-18 18,-19Z', fill: shade(color, -.18) }, this.neck);
    el('path', { d: 'M4,-30l1,-6l4,5z', fill: dk }, this.neck);
    el('path', { d: 'M3.4,-31.4l3,-1l-.6,2.6z', fill: mane }, this.neck);   // בלורית
    el('circle', { cx: 9, cy: -27, r: 1.2, fill: '#2b2220' }, this.neck);
    el('circle', { cx: 9.3, cy: -27.3, r: .35, fill: '#fff' }, this.neck);
    el('circle', { cx: 24.5, cy: -20.5, r: .8, fill: shade(color, -.45) }, this.neck);
    el('ellipse', { cx: 15, cy: -38, rx: 9, ry: 8, fill: color }, g);   // כתף
    const spec = (hx: number, front: boolean, far: boolean): LegSpec => ({ hip: [hx, far ? -33 : -32], l1: 15.6, l2: 16.8, front, far, w: far ? 4.4 : 5, color: far ? dk : color, hoof });
    this.Q = new Legs([spec(-19, false, false), spec(15, true, false), spec(-16, false, true), spec(18, true, true)], { far, near }, 'walk', 5.2, 4);
    this.Q.pose(0, 0);
    this.state = 'rest'; this.timer = rand(2, 6); this.a = 0; this.graze = true; this.gTimer = rand(1, 4); this.phase = 0; this.amp = 0; this.ph = rand(0, 6);
  }
  update(dt: number) {
    const A = this.area;
    this.timer -= dt; this.gTimer -= dt;
    let ds = 0;
    if (this.state === 'rest') {
      if (this.gTimer <= 0) { this.graze = !this.graze; this.gTimer = this.graze ? rand(5, 11) : rand(2, 4); }
      if (this.timer <= 0 && A) {
        // הולכים למקום אחר במכלאה, בעיקר לרוחב
        const dx = rand(40, 90) * (rand(0, 1) < .5 ? -1 : 1);
        this.tx = clamp(this.x + dx, A.x0 + 40, A.x1 - 34); this.ty = clamp(this.y + rand(-.4, .4) * Math.abs(dx), A.y0 + 60, A.y1 - 8);
        if (Math.abs(this.tx - this.x) > 20) { this.state = 'move'; this.graze = false; } else this.timer = rand(1, 3);
      }
    } else {
      const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
      if (d < 1) { this.state = 'rest'; this.timer = rand(4, 10); this.gTimer = rand(1, 3); }
      else { ds = Math.min(d, 9 * dt * Math.min(1, d / 10 + .3)); this.x += dx / d * ds; this.y += dy / d * ds; this.face = dx > 0 ? 1 : -1; }
    }
    this.amp += ((this.state === 'move' ? 1 : 0) - this.amp) * Math.min(1, dt * 3);
    this.phase += ds / (this.scale * this.Q.cycle);
    this.flip += (this.face - this.flip) * Math.min(1, dt * 10);   // סיבוב מהיר: באמצע הסיבוב הסוס נראה צר
    this.a += ((this.graze ? 112 : 0) - this.a) * Math.min(1, dt * 2.2);
    if (!inView(this.x, this.y - 30, 60)) return;
    const bob = this.Q.pose(this.phase, this.amp), nod = Math.sin(this.phase * Math.PI * 4) * 2.4 * this.amp, T = performance.now() / 1000;
    this.body.setAttribute('transform', `translate(0,${n2(bob)})`);
    this.neck.setAttribute('transform', `translate(16,${n2(-40 + bob)}) rotate(${(this.a + nod).toFixed(1)})`);
    this.tail.setAttribute('transform', `rotate(${(1 - 9 * Math.cos(T * 2.4 + this.ph) + Math.sin(this.phase * Math.PI * 4) * 4 * this.amp).toFixed(1)})`);
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y)}) scale(${this.scale},${this.scale})`);
    this.f.setAttribute('transform', `scale(${this.flip.toFixed(3)},1)`);
  }
}

/** כבשה: צמר מתולתל, ראש ורגליים כהים, אוזניים. רועה, ומדי פעם הולכת לאט לנקודה אחרת במכלאה (בעיקר לרוחב),
 *  ברגליים מפרקיות בהליכה של ארבע פעימות */
export class Sheep {
  [k: string]: any;
  constructor(x: number, y: number, area: any, scale = 1) {
    this.x = x; this.y = y; this.area = area; this.scale = scale; this.flip = 1; this.state = 'graze'; this.timer = rand(1, 5); this.phase = 0; this.head = 0; this.amp = 0;
    this.g = el('g', null, ctx.L.pad);
    el('ellipse', { cx: 0, cy: 1, rx: 12, ry: 3, fill: 'rgba(60,40,10,.22)' }, this.g);
    this.b = el('g', null, this.g);
    const far = el('g', null, this.b), ink = '#3b3633';
    this.body = el('g', null, this.b);
    const wool = '#fbf8f2', edge = '#e5ddcf';
    el('path', { d: circ(-7, -11, 4.6) + circ(-2.6, -13.6, 5) + circ(2.6, -13.6, 5) + circ(6.6, -11.4, 4.4) + circ(-4, -7.6, 4.4) + circ(1, -7, 4.6) + circ(5.6, -8, 4) + circ(-8, -7.6, 3.6), fill: wool, stroke: edge, 'stroke-width': .9 }, this.body);
    el('path', { d: circ(-7, -11, 4.6) + circ(-2.6, -13.6, 5) + circ(2.6, -13.6, 5) + circ(6.6, -11.4, 4.4) + circ(-4, -7.6, 4.4) + circ(1, -7, 4.6) + circ(5.6, -8, 4) + circ(-8, -7.6, 3.6), fill: wool }, this.body);
    let curls = '';
    for (const [cx, cy] of [[-5, -12], [-1, -14], [3, -12.6], [-2.4, -9.2], [2.4, -8.6], [6, -10.4], [-7, -8.6]]) curls += `M${cx - 1.2},${cy}q1.2,-1.4 2.4,0`;
    el('path', { d: curls, fill: 'none', stroke: edge, 'stroke-width': .6, 'stroke-linecap': 'round' }, this.body);
    const near = el('g', null, this.b);
    this.hg = el('g', null, this.b);
    el('path', { d: 'M8,-14.6C10,-16 13.6,-15 14.4,-12C15,-9.6 13.6,-7.6 11.6,-7.8C9.4,-8 7.6,-10.4 8,-14.6Z', fill: ink }, this.hg);
    el('ellipse', { cx: 8.6, cy: -13.4, rx: 2.6, ry: 1.1, fill: ink, transform: 'rotate(-28 8.6 -13.4)' }, this.hg);   // אוזן
    el('path', { d: circ(9.6, -15.4, 1.6) + circ(11.6, -15.6, 1.4), fill: wool }, this.hg);   // תלתל על המצח
    el('circle', { cx: 12, cy: -12.2, r: .7, fill: '#fff' }, this.hg);
    el('circle', { cx: 12.1, cy: -12.2, r: .38, fill: '#1f1a17' }, this.hg);
    const spec = (hx: number, front: boolean, isFar: boolean): LegSpec => ({ hip: [hx, -6.4], l1: 3.2, l2: 3.4, front, far: isFar, w: isFar ? 1.6 : 1.8, color: isFar ? '#2b2724' : ink });
    this.Q = new Legs([spec(-6, false, false), spec(6, true, false), spec(-4.4, false, true), spec(7.6, true, true)], { far, near }, 'walk', 1.6, 1.4);
    this.Q.pose(0, 0);
  }
  update(dt: number) {
    this.timer -= dt; let ds = 0; const A = this.area;
    if (this.state === 'graze' && this.timer <= 0) {
      const dx = rand(30, 80) * (rand(0, 1) < .5 ? -1 : 1);
      this.state = 'walk'; this.tx = clamp(this.x + dx, A.x0 + 40, A.x1 - 40); this.ty = clamp(this.y + rand(-.4, .4) * Math.abs(dx), A.y0 + 50, A.y1 - 30);
    }
    if (this.state === 'walk') {
      const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
      if (d < 1) { this.state = 'graze'; this.timer = rand(2, 6); }
      else { ds = Math.min(d, 9 * dt); this.x += dx / d * ds; this.y += dy / d * ds; if (Math.abs(dx) > 2) this.fd = dx > 0 ? 1 : -1; }
    }
    if (this.fd) this.flip += (this.fd - this.flip) * Math.min(1, dt * 10);
    this.amp += ((this.state === 'walk' ? 1 : 0) - this.amp) * Math.min(1, dt * 5);
    this.phase += ds / (this.scale * this.Q.cycle);
    this.head += ((this.state === 'graze' ? 1 : 0) - this.head) * Math.min(1, dt * 3);
    const on = inView(this.x, this.y - 8, 30); show(this.g, on);
    if (!on) return;
    const bob = this.Q.pose(this.phase, this.amp), chew = this.head > .8 ? Math.sin(performance.now() / 160) * 1.5 : 0;
    this.body.setAttribute('transform', `translate(0,${n2(bob)})`);
    this.hg.setAttribute('transform', `translate(0,${n2(bob + this.head * 3)}) rotate(${(this.head * 40 + chew).toFixed(1)} 9 -11)`);
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y)}) scale(${this.scale})`);
    this.b.setAttribute('transform', `scale(${this.flip.toFixed(3)},1)`);
  }
}

/** ברווזה וברווזונים ששטים בעקבותיה סביב האגם.
 *  עיצוב: גוף בצורת טיפה עם זנב מורם, כנף מקופלת עם נוצות, ראש עגול, מקור כתום, עין עם ברק, וקו מים שהגוף שקוע בו מעט.
 *  תנועה: מתנדנדים על המים, מסובבים ראש, מותירים שובל V; הברווזה מדי פעם טובלת (זנב למעלה, ראש מתחת למים),
 *  והברווזונים מנסים להדביק אותה (מאיצים ומאטים) */
export function ducks(o: any) {
  const lake = ctx.named[o.lake], waterFx = ctx.L.waterFx;
  const list = o.family.map(({ scale, color: body }: any, i: number) => {
    const g = el('g', null, waterFx), wake = el('path', { fill: 'none', stroke: '#e8f8fd', 'stroke-width': .8, 'stroke-linecap': 'round', opacity: .7 }, g);
    const b = el('g', { transform: `scale(${scale})` }, g), mother = i === 0, dk = shade(body, mother ? -.16 : -.22);
    const tilt = el('g', null, b);   // נוטה קדימה בטבילה
    el('path', { d: 'M-9,-3.6C-9.6,-6 -8,-7.6 -5,-7.8C-1,-8.2 4,-8 6.4,-6.4C8,-5.2 8,-2.6 6.2,-1.2L-6.4,-1.2C-8.4,-1.6 -8.8,-2.6 -9,-3.6Z', fill: body, stroke: dk, 'stroke-width': .5 }, tilt);
    el('path', { d: 'M-8.4,-5L-12,-7.6L-11,-4.2Z', fill: body, stroke: dk, 'stroke-width': .5 }, tilt);   // זנב מורם
    el('path', { d: 'M-6,-6.4C-2,-7.6 2,-7 3.4,-4.8C1,-3.6 -3,-3.4 -6.6,-4.2Z', fill: shade(body, -.06) }, tilt);   // כנף
    el('path', { d: 'M-5.6,-4.6l-1.8,.2M-4.2,-4.2l-1.8,.4M-2.6,-4l-1.6,.5', stroke: dk, 'stroke-width': .45, 'stroke-linecap': 'round' }, tilt);
    const head = el('g', null, tilt);
    el('path', { d: 'M3.6,-6.6C3.4,-8.6 3.8,-10 4.6,-10.6L7.2,-9.6C7,-8.4 6.6,-7.2 6.4,-6Z', fill: body }, head);   // צוואר
    el('circle', { cx: 5.6, cy: -11.2, r: 3.2, fill: body, stroke: dk, 'stroke-width': .5 }, head);
    el('path', { d: 'M8.2,-12C9.6,-12 11.4,-11.4 11.8,-10.6C11.2,-10.2 9.6,-10.2 8.4,-10.4Z', fill: '#f29e38' }, head);
    el('circle', { cx: 6.6, cy: -12, r: .62, fill: '#1f1a17' }, head);
    el('circle', { cx: 6.8, cy: -12.2, r: .2, fill: '#fff' }, head);
    el('path', { d: 'M-8,-1.2C-3,.2 3,.2 7,-1.2', fill: 'none', stroke: '#9fdcf0', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: .9 }, b);   // קו המים
    return { g, b, tilt, head, wake, scale, flip: 1, mother, lag: 0, ph: i * 1.7 };
  });
  const path = (th: number) => { const r = 1 + .1 * Math.sin(3 * th); return [lake.cx + Math.cos(th) * o.rx * r, lake.cy + Math.sin(th) * o.ry * r]; };
  let frame = 0, dive = -1, diveIn = 14;
  (window as any).__ducks = { list, path: (T: number) => path(T * o.speed), dive: () => { dive = 0; } };   // לבדיקות
  return (dt: number, T: number) => {
    frame++;
    diveIn -= dt; if (diveIn <= 0 && dive < 0) dive = 0;
    if (dive >= 0) { dive += dt; if (dive > 3.2) { dive = -1; diveIn = rand(12, 26); } }
    list.forEach((d: any, i: number) => {
      // הברווזונים מפגרים ומדביקים בגלים קטנים
      const catchUp = i ? Math.sin(T * .9 + d.ph) * .02 : 0;
      const th = T * o.speed - i * .2 - (i ? .06 : 0) + catchUp, p = path(th), q = path(th + .01), f = q[0] >= p[0] ? 1 : -1;
      d.flip += (f - d.flip) * Math.min(1, dt * 6);
      const on = inView(p[0], p[1], 15); show(d.g, on);
      if (!on) return;
      const bob = Math.sin(T * (i ? 4.2 : 2.6) + d.ph) * (i ? .5 : .7);
      // טבילה (רק הברווזה): נוטה קדימה עד שהזנב למעלה והראש מתחת למים, ואז חוזרת
      const dip = d.mother && dive >= 0 ? Math.sin(Math.min(1, dive / 3.2) * Math.PI) : 0;
      d.tilt.setAttribute('transform', `translate(0,${n2(dip * 2.4)}) rotate(${(dip * 38).toFixed(1)} 2 -2)`);
      d.head.setAttribute('transform', `rotate(${(Math.sin(T * .7 + d.ph) * 10 * (1 - dip) + dip * 30).toFixed(1)} 5 -7)`);
      d.head.setAttribute('opacity', (1 - Math.max(0, Math.min(1, (dip - .45) / .25))).toFixed(2));   // הראש נעלם מתחת למים
      // שובל V מאחור
      const w = (d.mother ? 6 : 3.4) + Math.sin(T * 3 + d.ph) * .8;
      d.wake.setAttribute('d', `M${n2(-9 * f * d.scale)},${n2(-.6)}l${n2(-w * f)},${n2(-w * .35)}M${n2(-9 * f * d.scale)},${n2(.2)}l${n2(-w * f)},${n2(w * .3)}`);
      d.g.setAttribute('transform', `translate(${n2(p[0])},${n2(p[1] + bob)})`);
      d.b.setAttribute('transform', `scale(${(d.flip * d.scale).toFixed(3)},${d.scale})`);
      if (i === 0 && frame % 50 === 0) ripple(p[0] - f * 8, p[1], 9, 3);
      if (d.mother && dive > 1 && dive < 1.05) ripple(p[0] + f * 8, p[1], 7, 2.4);
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

/** פרפרים מעל שדה הפרחים.
 *  עיצוב: כנף קדמית וכנף אחורית לכל צד, כתמים ושוליים כהים, גוף עם מחושים.
 *  תנועה: רפרוף (פרץ נפנופים מהיר) ורחיפה (כנפיים פתוחות כמעט בלי תנועה), במסלול מתפתל;
 *  מדי פעם נוחתים על פרח: הכנפיים נסגרות למעלה ונפתחות לאט, ואז ממריאים שוב */
export function butterflies(o: any) {
  const list = o.colors.map((c: string, i: number) => {
    const g = el('g', null, ctx.L.air), dk = shade(c, -.45), wl = el('g', null, g), wr = el('g', null, g);
    for (const [w, sd] of [[wl, -1], [wr, 1]] as [any, number][]) {
      el('path', { d: `M0,-.4C${2.6 * sd},-5.6 ${6.4 * sd},-5.2 ${6 * sd},-2.2C${5.6 * sd},-.6 ${2.6 * sd},.2 0,0Z`, fill: c, stroke: dk, 'stroke-width': .45 }, w);   // כנף קדמית
      el('path', { d: `M0,.2C${3.6 * sd},.2 ${4.8 * sd},2.6 ${3.4 * sd},4.2C${2 * sd},5 ${.4 * sd},3 0,.6Z`, fill: shade(c, -.08), stroke: dk, 'stroke-width': .45 }, w);   // כנף אחורית
      el('path', { d: circ(4.4 * sd, -3, .7) + circ(2.6 * sd, 2.4, .5), fill: '#fffaf0', opacity: .85 }, w);
      el('path', { d: `M${5.6 * sd},-3.6C${6.2 * sd},-2.6 ${5.8 * sd},-1.4 ${5 * sd},-.9`, fill: 'none', stroke: dk, 'stroke-width': .7, 'stroke-linecap': 'round' }, w);
    }
    el('path', { d: 'M0,-2.4v5.6', stroke: '#3b2f25', 'stroke-width': 1, 'stroke-linecap': 'round' }, g);
    el('path', { d: 'M0,-2.4C-.6,-3.8 -1.2,-4.4 -1.8,-4.8M0,-2.4C.6,-3.8 1.2,-4.4 1.8,-4.8', fill: 'none', stroke: '#3b2f25', 'stroke-width': .35 }, g);
    return { g, wl, wr, cx: o.x + i * o.dx, cy: o.y, s: rand(0, 100), rest: -1, restIn: rand(6, 16), rx: 0, ry: 0 };
  });
  return (dt: number, T: number) => {
    for (const b of list) {
      // נחיתה על פרח מדי פעם
      b.restIn -= dt;
      if (b.rest < 0 && b.restIn <= 0) { b.rest = rand(3, 7); b.rx = b.cx + rand(-60, 60); b.ry = b.cy + rand(-20, 30); }
      if (b.rest >= 0) { b.rest -= dt; if (b.rest < 0) b.restIn = rand(8, 18); }
      const s = b.s + T;
      let x = b.cx + Math.sin(s * .37) * 60 + Math.sin(s * 1.3) * 14, y = b.cy + Math.sin(s * .53) * 45 + Math.cos(s * 1.7) * 8 - 10;
      const landing = b.rest >= 0 ? Math.min(1, (b.rest > 1 ? 1 : b.rest)) : 0;   // עוברים בהדרגה לנקודת הנחיתה ובחזרה
      x += (b.rx - x) * landing; y += (b.ry - y) * landing;
      const on = inView(x, y, 10); show(b.g, on);
      if (!on) continue;
      // רפרוף וריחוף: פרץ נפנופים, אחריו כנפיים כמעט פתוחות; על פרח – כנפיים סגורות שנפתחות לאט
      const burst = (s * .9) % 1 < .6;
      let flap = burst ? Math.abs(Math.sin(s * 22)) * .85 + .15 : .9 + Math.sin(s * 6) * .08;
      if (landing > .9) flap = .15 + Math.max(0, Math.sin(T * 1.2 + b.s)) * .6;
      b.g.setAttribute('transform', `translate(${n2(x)},${n2(y)}) rotate(${(Math.sin(s * 1.3) * 12).toFixed(1)})`);
      b.wl.setAttribute('transform', `scale(${flap.toFixed(2)},1)`); b.wr.setAttribute('transform', `scale(${flap.toFixed(2)},1)`);
    }
  };
}
