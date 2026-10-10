/* חיות היער (משימה 9): ארנבות, סנאים, ינשופים, שועלים ודובים, רחוק מהבתים.
   כל חיה מקבלת בית קבוע ביער (נבחר לפי מיקום, rngAt), ומשוטטת סביבו לאט: עומדת, מרחרחת, וזזה למקום קרוב.
   הן לא דורכות על שבילים, מים או מבנים, לא מתקרבות לבתים, ומתרחקות מעוברים ושבים.
   ארנבת מקפצת, סנאי זריז, שועל בטרוט, דוב הולך לאט. ינשוף יושב על גדם ומסובב את הראש.
   ההיגיון רץ תמיד (זול), הציור רק כשהחיה על המסך. אין שתי חיות זהות (הגוון והגודל לפי המיקום). */
import { REAL_DYN, fitScale } from '../world/scale';
import { el, n2, show } from '../core/util';
import { rngAt } from '../core/rng';
import { ctx, statics, bboxOf } from '../world/context';
import { inView, updateFar, view } from '../camera/view';
import { walkable, flagsAt, clearLine, PATH, WATER } from '../world/walk';
import { places } from '../world/places';
import { WILD, setLeg, frontBack, type WildKind, type Parts } from './wildlife-art';
import { Heading, wrapA } from './heading';
import { TREES } from '../scene/generators';
import { Legs } from './quad';
import { dynamics } from './people';

/** הגובה הטבעי של כל ציור (יחידות, בלי הגדלה): ממנו ומהגובה האמיתי נקבע הגודל */
const NATURAL_H: Record<WildKind, number> = { rabbit: 14.6, squirrel: 15, owl: 12.4, fox: 18, bear: 25, deer: 37 };

/** השטח (רוחב לכל צד, גובה) שכל חיה תופסת בגודלה האמיתי */
const SPAWN_BOX: Record<WildKind, number[]> = { rabbit: [8, 14], squirrel: [8, 14], owl: [9, 16], fox: [15, 19], bear: [27, 30], deer: [16, 38] };

/** מהירות, מרחק שיטוט, זמני מנוחה ומרחק מינימלי מבתים, לכל סוג */
/** כמה מהר כל חיה מסתובבת (רדיאנים לשנייה), ורדיוס הצעדים בסיבוב במקום (כדי שהרגליים יצעדו גם כשמסתובבים) */
const TURN: Record<WildKind, [number, number]> = { rabbit: [3.2, 3], squirrel: [4, 2.4], owl: [0, 0], fox: [2.4, 5], bear: [1.3, 10], deer: [1.4, 9] };
const KIND: Record<WildKind, { speed: number; roam: number; rest: [number, number]; homeGap: number; stride: number; hop?: boolean; still?: boolean }> = {
  rabbit: { speed: 13, roam: 90, rest: [2, 6], homeGap: 260, stride: 1.4, hop: true },     // רגועים: קפיצות ארוכות ואיטיות, עם עצירות
  squirrel: { speed: 14, roam: 70, rest: [1.5, 5], homeGap: 240, stride: 1.2, hop: true },
  owl: { speed: 0, roam: 0, rest: [3, 9], homeGap: 300, stride: 0, still: true },
  fox: { speed: 11, roam: 160, rest: [2, 6], homeGap: 360, stride: 2 },
  bear: { speed: 7, roam: 200, rest: [3, 9], homeGap: 800, stride: 3 },
  deer: { speed: 9, roam: 220, rest: [4, 10], homeGap: 320, stride: 3 },
};

/* מה מסתיר מה: העצים, הבתים והחפצים הם חלק מהרקע (אריחים), והחיות מצוירות מעליהם. לכן חיה לא נכנסת אף פעם לשטח
   שדבר עומד שלפניה (קרוב יותר לצופה, y גדול יותר) מכסה – אחרת היא נראית כאילו היא הולכת על העץ.
   רשת חיפוש של המלבנים המצוירים של כל הדברים העומדים, נבנית פעם אחת */
const CELL = 64;
let occ: Map<number, number[][]> | null = null;
const key = (i: number, j: number) => i * 100003 + j;
function buildOcc() {
  occ = new Map();
  for (const st of statics) {
    const q = bboxOf(st), bb = { x: q[0], y: q[1], width: q[2], height: q[3] };
    if (bb.width <= 0) continue;
    const r = [bb.x - 3, bb.y - 3, bb.x + bb.width + 3, Math.max(st.y, bb.y + bb.height) + 2, st.y];
    for (let i = Math.floor(r[0] / CELL); i <= Math.floor(r[2] / CELL); i++) for (let j = Math.floor(r[1] / CELL); j <= Math.floor(r[3] / CELL); j++)
      (occ.get(key(i, j)) || occ.set(key(i, j), []).get(key(i, j))!).push(r);
  }
}
/** חיה בגובה h שעומדת ב-(x,y): האם משהו שלפניה מסתיר אותה */
function hidden(x: number, y: number, w: number, h: number) {
  if (!occ) buildOcc();
  for (const r of occ!.get(key(Math.floor(x / CELL), Math.floor(y / CELL))) || [])
    if (r[4] > y + 1 && x + w > r[0] && x - w < r[2] && y > r[1] && y - h < r[3]) return true;
  return false;
}
/** הדרך מנקודה לנקודה פנויה: לא עוברת על מכשול ולא מאחורי שום דבר */
function pathClear(a: number[], b: number[], w: number, h: number) {
  if (!clearLine(a, b)) return false;
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 6);
  for (let k = 1; k <= n; k++) if (hidden(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, w, h)) return false;
  return true;
}

/** מקום טבעי ביער: על הקרקע, לא על שביל או מים (גם לא קרוב), רחוק מבתים, מתחת לרכס ומעל החוף, ולא מאחורי עץ */
function spotOk(x: number, y: number, gap: number, homes: number[][], w = 8, h = 12) {
  const { B } = ctx, T = ctx.world.terrain;
  if (x < B.x0 + 60 || x > B.x1 - 60 || y < T.snow.line + 60 || y > T.beach.y - 80) return false;
  if (!walkable(x, y) || flagsAt(x, y) & (PATH | WATER) || hidden(x, y, w, h)) return false;
  for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; if (flagsAt(x + Math.cos(t) * 22, y + Math.sin(t) * 22) & (PATH | WATER)) return false; }
  return !homes.some(h => Math.hypot(h[0] - x, h[1] - y) < gap);
}

class Animal {
  [k: string]: any;
  constructor(kind: WildKind, x: number, y: number, homes: number[][]) {
    this.kind = kind; this.K = KIND[kind]; this.x = this.hx = x; this.y = this.hy = y; this.homes = homes;
    this.rg = rngAt(x, y, 83); this.flip = this.rg.chance(.5) ? 1 : -1; this.face = this.flip;
    this.state = 'rest'; this.timer = this.rg.rand(...this.K.rest); this.phase = 0; this.amp = 0; this.look = 0;
    // גודל לפי טבלת הפרופורציות (world/scale.ts): הגובה הטבעי של הציור מול הגובה האמיתי של החיה
    this.k = fitScale(NATURAL_H[kind], REAL_DYN[kind]);
    this.g = el('g', null, ctx.L.actors); this.el = this.g; this.sc = el('g', { transform: `scale(${this.k.toFixed(3)})` }, this.g); this.f = el('g', null, this.sc);
    this.p = WILD[kind](this.f, rngAt(x, y, 81)) as Parts;
    this.W = this.p.size * 1.2 * this.k; this.H = this.p.size * (kind === 'bear' ? 1.3 : 2) * this.k;   // השטח שהחיה תופסת (לבדיקת הסתרה)
    // כיוון ב-360 מעלות ומבט מלפנים ומאחור (לא לינשוף, שיושב פנים אל הצופה). המבט מתחלף מיד לפי הכיוון, בלי דהייה
    if (kind !== 'owl') {
      this.Hd = new Heading(this.flip > 0 ? 0 : Math.PI, TURN[kind][0]);
      this.frontW = el('g', { display: 'none' }, this.sc); this.backW = el('g', { display: 'none' }, this.sc);
      this.front = frontBack(kind, this.frontW, this.p.c!, this.p.s!, true);
      this.back = frontBack(kind, this.backW, this.p.c!, this.p.s!, false);
    }
    this.shownView = 'side';
    // רגליים עם מפרקים (שועל, דוב): צעדים לפי מרחק (actors/quad.ts)
    if (this.p.quad) { const q = this.p.quad; this.Q = new Legs(q.specs, { far: q.far, near: q.near }, q.gait, q.A, q.lift); this.Q.pose(0, 0); }
    if (kind === 'bear') this.Q.pivot = [-10.7, -15];   // הדוב מתרומם סביב הירכיים האחוריות
    this.hopH = 0; this.sit = 0; this.sitWant = 0;
    this.legsStill();
    dynamics.push(this);   // נכנסים למיון העומק יחד עם האנשים
  }
  get name() { return { rabbit: 'A rabbit', squirrel: 'A squirrel', owl: 'An owl', fox: 'A fox', bear: 'A bear', deer: 'A deer' }[this.kind as string] ?? 'An animal'; }
  legsStill() { this.p.legs.forEach((l, j) => setLeg(l, this.p.legBase[j], j * .5, 0, this.K.stride)); }
  /** יעד חדש קרוב לבית של החיה, בקו ישר פנוי */
  pick() {
    // ביער צפוף רוב היעדים מוסתרים מאחורי עצים, אז מנסים הרבה; חצי מהניסיונות קרובים למקום הנוכחי (צעד קצר תמיד אפשרי יותר)
    for (let i = 0; i < 28; i++) {
      const near = i % 2 === 1, a = this.rg.rand(0, Math.PI * 2), r = this.rg.rand(near ? .12 : .3, near ? .45 : 1) * this.K.roam;
      const cx = near ? this.x : this.hx, cy = near ? this.y : this.hy, tx = cx + Math.cos(a) * r, ty = cy + Math.sin(a) * r * .7;
      if (Math.hypot(tx - this.hx, ty - this.hy) > this.K.roam * 1.1) continue;
      if (spotOk(tx, ty, this.K.homeGap, this.homes, this.W, this.H) && pathClear([this.x, this.y], [tx, ty], this.W, this.H)) return [tx, ty];
    }
    return null;
  }
  /** דוב: עץ קרוב לבית שאפשר לעמוד מולו עם הגב לגזע (המקום פנוי, לא מאחורי שום דבר, והדרך אליו פנויה) */
  pickTree() {
    const c: any[] = [];
    for (const tr of TREES) if (Math.hypot(tr.x - this.hx, tr.y - this.hy) < this.K.roam && Math.hypot(tr.x - this.x, tr.y - this.y) < 180) c.push(tr);
    for (let i = 0; i < 12 && c.length; i++) {
      const tr = c[Math.floor(this.rg.r() * c.length)], side = this.rg.chance(.5) ? 1 : -1, tx = tr.x + side * 20 * this.k, ty = tr.y + 2.5;
      if (spotOk(tx, ty, this.K.homeGap, this.homes, this.W, this.H * 1.8) && pathClear([this.x, this.y], [tx, ty], this.W, this.H)) return { at: [tx, ty], side };
    }
    return null;
  }
  update(dt: number, t: number) {
    const K = this.K;
    this.timer -= dt;
    let ds = 0;
    if (!K.still) {
      // מישהו עובר קרוב (פחות מ-60): בורחים קצת הלאה ממנו
      const near = dynamics.find(o => o !== this && !o.kind && o.alpha > 0 && Math.hypot(o.x - this.x, o.y - this.y) < 60);
      if (near && (this.state === 'rest' || this.state === 'scratch' || this.state === 'orient' || this.state === 'down')) {
        const dx = this.x - near.x, dy = this.y - near.y, d = Math.hypot(dx, dy) || 1, tx = this.x + dx / d * 50, ty = this.y + dy / d * 35;
        if (spotOk(tx, ty, K.homeGap * .8, this.homes, this.W, this.H) && pathClear([this.x, this.y], [tx, ty], this.W, this.H)) { this.tx = tx; this.ty = ty; this.state = 'move'; this.flee = 1.3; this.then = null; this.moveT = 0; }
      }
      // דוב: מדי פעם הולך לעץ ומתגרד בגב
      if (this.state === 'rest' && this.timer <= 0 && this.kind === 'bear' && this.rg.chance(.3)) {
        const tr = this.pickTree();
        if (tr) { [this.tx, this.ty] = tr.at; this.state = 'move'; this.flee = 1; this.then = 'scratch'; this.scratchSide = tr.side; this.moveT = 0; }
      }
      // מתגרד: עומד על שתיים; בסוף יורד לאט חזרה על ארבע
      if (this.state === 'scratch' && this.timer <= 0) this.state = 'down';
      if (this.state === 'down' && this.Q.rear <= .001) { this.state = 'rest'; this.timer = this.rg.rand(1, 3); }
      // מסתובב במקום עד שהגב אל הגזע, ורק אז מתחיל להתרומם
      if (this.state === 'orient') {
        const want = this.scratchSide > 0 ? 0 : Math.PI;
        this.Hd.turnTo(want, dt);
        if (Math.abs(wrapA(want - this.Hd.h)) < .02) { this.state = 'scratch'; this.timer = this.rg.rand(7, 13); this.scratchT = t; }
      }
      if (this.state === 'rest' && this.timer <= 0) {
        const tg = this.pick();
        if (tg) { [this.tx, this.ty] = tg; this.state = 'move'; this.flee = 1; this.sitWant = 0; this.moveT = 0; } else this.timer = this.rg.rand(.4, 1.2);   // לא נמצא יעד: מנסים שוב בקרוב
      }
      if (this.state === 'move' && this.Q?.rear > .001) { /* דוב שעומד על שתיים: קודם יורד על ארבע */ }
      else if (this.state === 'move') {
        const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
        this.moveT = (this.moveT ?? 0) + dt;
        const arrived = d < 2 || this.moveT > 40;   // (ביטחון: לא מסתובבים סביב היעד לנצח)
        if (arrived && this.then === 'scratch') {
          // הגיע לעץ: עוצר, מסתובב עם הגב לגזע, ואז מתרומם
          this.then = null; this.state = 'orient';
        } else if (arrived) {
          // לפעמים ממשיכים מיד הלאה (טיול), אחרת עוצרים לנוח
          this.state = 'rest'; this.timer = this.rg.chance(.35) ? this.rg.rand(.3, 1) : this.rg.rand(...K.rest);
          // ארנבת וסנאי: לפעמים מתיישבים על הרגליים האחוריות (ארנבת מסתכלת סביב, סנאי מכרסם אגוז)
          if (K.hop) this.sitWant = this.rg.chance(.45) ? 1 : 0;
        }
        else {
          // פונים בהדרגה אל היעד והולכים תמיד בדיוק לכיוון שאליו פונים (בפנייה חדה – מסתובבים במקום)
          this.pauseT = (this.pauseT ?? 0) - dt;
          const sp = this.pauseT > 0 ? 0 : this.Hd.steer(dx, dy, dt);
          ds = Math.min(d, K.speed * this.flee * dt * sp);
          this.x += Math.cos(this.Hd.h) * ds; this.y += Math.sin(this.Hd.h) * ds;
        }
      }
    } else {
      // ינשוף: מסובב את הראש לאט מצד לצד, ממצמץ, ומדי פעם עושה סיבוב מעוף קצר וחוזר לגדם שלו
      if (this.timer <= 0) { this.look = this.rg.rand(-1, 1); this.timer = this.rg.rand(...K.rest); }
      this.lookS = (this.lookS ?? 0) + (this.look - (this.lookS ?? 0)) * Math.min(1, dt * 2.5);
      this.blink = (this.blink ?? this.rg.rand(2, 5)) - dt;
      if (this.blink < -.16) this.blink = this.rg.rand(2.5, 6);
      this.flyIn = (this.flyIn ?? this.rg.rand(20, 45)) - dt;
      if (this.flyIn <= 0 && this.fly === undefined) this.fly = 0;
      if (this.fly !== undefined) { this.fly += dt; if (this.fly > 7) { this.fly = undefined; this.flyIn = this.rg.rand(30, 60); } }
    }
    // סיבוב במקום הוא גם צעדים: הרגליים זזות לפי הסיבוב
    const turnStep = this.Hd ? this.Hd.turned * TURN[this.kind as WildKind][1] * this.k : 0;
    if (this.Hd) this.Hd.turned = 0;
    const stepping = (this.state === 'move' && this.Q?.rear <= .001) || turnStep > 0;
    this.amp += ((stepping ? 1 : 0) - this.amp) * Math.min(1, dt * 6);
    const unit = this.k * (this.p.s ?? 1);   // יחידת ציור אחת בעולם
    if (this.Q && this.kind === 'bear') {
      // התרוממות והורדה הדרגתיות (כשנייה וחצי), בלי שום קפיצה בין תנוחות
      const want = this.state === 'scratch' ? 1 : 0;
      this.Q.rear += Math.max(-dt * .7, Math.min(dt * .7, want - this.Q.rear));
    }
    if (this.Q) this.phase += (ds + turnStep) / (unit * this.Q.cycle);
    else this.phase += ds / ((K.hop ? 7 : 9) * this.k);
    if (K.hop) {
      this.hopH += (ds + turnStep) / (unit * (this.kind === 'rabbit' ? 13 : 10));
      if (this.state !== 'move') this.hopH = Math.ceil(this.hopH - .02);   // עומדים: מסיימים את הקפיצה
      // אחרי קפיצה, לפעמים עוצרים לרגע ומסתכלים סביב (רגוע, לא קופצים ברצף)
      if (Math.floor(this.hopH) !== this.lastHop) { this.lastHop = Math.floor(this.hopH); if (this.state === 'move' && this.rg.chance(.4)) this.pauseT = this.rg.rand(.5, 1.6); }
    }
    this.sit += (this.sitWant - this.sit) * Math.min(1, dt * 3);
    this.shown = inView(this.x, this.y - 10, 40); show(this.g, this.shown);
    if (!this.shown) return;
    // חיה זעירה על המסך (פחות מ-8 פיקסלים): התנוחה מתעדכנת כל פריים שני, המיקום – תמיד (הקפיצה של ארנבת רק מקרוב נראית)
    if (this.H * view.cam.k < 8 && (this.tk = (this.tk ?? 0) ^ 1)) { this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y - (this.lastLift ?? 0))})`); return; }
    // קפיצה של ארנבת או סנאי: דחיפה ברגליים האחוריות, תעופה בקשת, נחיתה על הכפות הקדמיות
    const lift = K.hop ? hopPose(this.p.hop, this.kind, this.hopH, this.amp, this.sit, t, this.hx) * unit : 0;
    if (this.front) {
      // המבט מתחלף מיד (כמו פריים באנימציה), לפי הכיוון; ההיפוך מתחלף רק כשהמבט לא מהצד
      const v = this.Hd.view;
      if (v !== this.shownView) {
        show(this.f, v === 'side'); show(this.frontW, v === 'front'); show(this.backW, v === 'back'); this.shownView = v;
      }
      for (const [V, on] of [[this.front, v === 'front'], [this.back, v === 'back']] as [any, boolean][]) {
        if (on) V.legs.forEach((l: any, j: number) => {   // מלפנים ומאחור: הרגליים מתרוממות לסירוגין
          const q = (this.phase + j * .5) * Math.PI * 2, fy = -Math.max(0, Math.cos(q)) * K.stride * .7 * this.amp;
          l.setAttribute('d', `M${n2(V.base[j][0])},${V.base[j][1]}L${n2(V.base[j][0])},${n2(fy)}`);
        });
      }
    }
    let bob = 0;
    if (this.Q) {
      // רגליים עם מפרקים; הגוף עולה ויורד עם הצעדים, הדוב מגלגל את הכתפיים, הראש מהנהן בהליכה
      let rearT = '';
      if (this.kind === 'bear') {
        // עומד על שתיים: הגוף מסתובב סביב הירכיים; כשהוא למעלה – מתחכך בגזע (עולה ויורד ומתנדנד מעט)
        const R = this.Q.rear, e = R * R * (3 - 2 * R), rub = R > .97 ? Math.sin((t - (this.scratchT ?? 0)) * 2.6) : 0;
        this.Q.rearA = -74 * e + rub * 2.5; this.Q.rearLift = 2.2 * e + rub * 1.2;
        if (R > 0) rearT = `translate(0,${n2(-this.Q.rearLift)}) rotate(${this.Q.rearA.toFixed(2)} ${this.Q.pivot[0]} ${this.Q.pivot[1]}) `;
        this.p.lids!.setAttribute('opacity', R > .97 && Math.sin((t - (this.scratchT ?? 0)) * .9) > -.3 ? '1' : '0');   // עיניים עצומות בהנאה
      }
      bob = this.Q.pose(this.phase, this.amp);
      const roll = this.kind === 'bear' ? Math.sin(this.phase * Math.PI * 2) * 1.6 * this.amp : 0;
      this.p.quad!.bodyG.setAttribute('transform', `${rearT}translate(0,${n2(bob)}) rotate(${roll.toFixed(2)} 0 -14)`);
      this.rearT = rearT;
      this.p.quad!.near.setAttribute('transform', '');
    }
    if (this.p.tail && this.kind !== 'squirrel' && this.kind !== 'deer') this.p.tail.setAttribute('transform', `translate(0,${n2(bob)}) rotate(${(Math.sin(t * 2 + this.hx) * 6 + Math.sin(this.phase * Math.PI * 4) * 4 * this.amp).toFixed(1)} -8 -8)`);
    if (this.kind === 'deer') {
      // צבי: רועה (הצוואר יורד לקרקע) רוב זמן המנוחה, מרים ראש ומקשיב מדי פעם; אוזניים וזנב מתנפנפים
      this.graze = (this.graze ?? 0) + (((this.state === 'rest' && Math.sin(t * .23 + this.hx) > -.3) ? 1 : 0) - (this.graze ?? 0)) * Math.min(1, dt * 1.6);
      const chew = this.graze > .8 ? Math.sin(t * 5) * 2 : 0, nod = Math.sin(this.phase * Math.PI * 4) * .6 * this.amp;
      this.p.head.setAttribute('transform', `translate(0,${n2(bob + nod)}) rotate(${(this.graze * 88 + chew).toFixed(1)} 7.6 -20.6)`);
      const flick = Math.max(0, Math.sin(t * 1.1 + this.hy)) ** 18;
      this.p.ears!.setAttribute('transform', `rotate(${(flick * -22).toFixed(1)} 11 -32)`);
      this.p.tail!.setAttribute('transform', `translate(0,${n2(bob)}) rotate(${(Math.max(0, Math.sin(t * 1.7 + this.hx)) ** 10 * -40).toFixed(1)} -10.8 -21.4)`);
    } else if (this.kind === 'bear') {
      // בהליכה הראש נמוך ומתנדנד עם כל צעד קדמי; בעמידה מדי פעם מוריד את האף לקרקע ומרחרח
      this.sniff = (this.sniff ?? 0) + (((this.state === 'rest' && Math.sin(t * .31 + this.hx) > .2) ? 1 : 0) - (this.sniff ?? 0)) * Math.min(1, dt * 1.5);
      const step = Math.sin(this.phase * Math.PI * 4), sway = this.amp * (4 + step * 3), sn = this.sniff * (24 + Math.sin(t * 6) * 2);
      const up = this.Q.rear * 48;   // כשעומד – הראש מתיישר קדימה ומעט למעלה
      this.p.head.setAttribute('transform', `${this.rearT}translate(0,${n2(bob + this.amp * (.6 + step * .5))}) rotate(${(sway + sn * (1 - this.Q.rear) + up).toFixed(1)} 12 -19)`);
    } else if (this.p.head && !K.still && !K.hop) {
      const a = this.state === 'rest' ? Math.sin(t * 1.3 + this.hy) * 6 : 0, nod = Math.sin(this.phase * Math.PI * 4) * .5 * this.amp;   // מרחרחים, ומהנהנים בהליכה
      this.p.head.setAttribute('transform', `translate(0,${n2(bob + nod)}) rotate(${a.toFixed(1)} 10 -12)`);
    }
    if (K.still) {
      this.p.head.setAttribute('transform', `translate(${n2(this.lookS * 2.2)},0) rotate(${(this.lookS * 8).toFixed(1)} 0 -15)`);
      this.p.lids.setAttribute('opacity', this.blink < 0 ? '1' : '0');
      // מעוף: לולאה קטנה מעל הגדם (למעלה, הצידה, וחזרה), כנפיים פרושות ומנופפות
      if (this.fly !== undefined) {
        const u = this.fly / 7, R = 46, up = Math.sin(Math.PI * Math.min(1, u * 1.15)) * 34;
        const fx = Math.sin(2 * Math.PI * u) * R, fy = -(1 - Math.cos(2 * Math.PI * u)) * R * .35 - up, flap = Math.sin(t * 14) * .5 + .5;
        this.p.body.setAttribute('transform', `translate(${n2(fx)},${n2(fy)})`);
        this.p.folded.setAttribute('opacity', '0');
        this.p.wings.forEach((wg: any, i: number) => { wg.setAttribute('opacity', '1'); wg.setAttribute('transform', `translate(0,-13) scale(1,${(.4 + .8 * flap).toFixed(2)}) translate(0,13)`); void i; });
      } else {
        this.p.body.setAttribute('transform', '');
        this.p.wings.forEach((wg: any) => wg.setAttribute('opacity', '0'));
        this.p.folded.setAttribute('opacity', '1');
      }
    }
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y - lift)})`); this.lastLift = lift;
    this.f.setAttribute('transform', `scale(${(this.Hd ? this.Hd.sx : this.flip).toFixed(3)},1)`);
  }
}

/** מפזר את החיות לפי world.json (actors.wildlife: כמה מכל סוג). המיקומים נבחרים לפי סדר קבוע (rngAt), אז הם יציבים בין טעינות */
export function wildlife(counts: Partial<Record<WildKind, number>>) {
  const homes = places.filter(p => p && p.kind === 'home' && p.door).map(p => p.door!);
  const { B } = ctx, all: Animal[] = [];
  for (const kind of Object.keys(counts) as WildKind[]) {
    const v = rngAt(kind.length * 97, 13, 84), K = KIND[kind];
    for (let n = 0, tries = 0; n < (counts[kind] ?? 0) && tries < 4000; tries++) {
      const x = v.rand(B.x0, B.x1), y = v.rand(ctx.world.terrain.snow.line, ctx.world.terrain.beach.y);
      const [sw, sh] = SPAWN_BOX[kind];   // השטח שהחיה תופסת (כדי שלא תתחיל מאחורי עץ)
      if (!spotOk(x, y, K.homeGap, homes, sw, sh) || all.some(a => Math.hypot(a.x - x, a.y - y) < 120)) continue;
      all.push(new Animal(kind, x, y, homes)); n++;
    }
  }
  (window as any).__wildlife = all;   // לבדיקות
  WILD_ALL.splice(0, WILD_ALL.length, ...all);
  return updateFar(all);   // רחוק מהמבט: פחות עדכונים (camera/view.ts farDt)
}

/** כל החיות (לבדיקת העולם, כלל wild-apart) */
export const WILD_ALL: any[] = [];
/** בדיקת העולם: חיה שעומדת על שביל או מים, מאחורי עץ או מבנה, או קרוב מדי לבית */
export function wildIssues() {
  const out: { msg: string; x: number; y: number }[] = [];
  for (const a of WILD_ALL) {
    if (a.state === 'move') continue;   // בתנועה היא בדרך בין שתי נקודות שנבדקו
    const f = flagsAt(a.x, a.y);
    if (f & (PATH | WATER)) out.push({ msg: `A ${a.kind} stands on a path or water`, x: a.x, y: a.y });
    if (a.kind !== 'owl' && hidden(a.x, a.y, a.W, a.H)) out.push({ msg: `A ${a.kind} is behind a tree or building`, x: a.x, y: a.y });
    if (a.homes.some((h: number[]) => Math.hypot(h[0] - a.x, h[1] - a.y) < a.K.homeGap * .75)) out.push({ msg: `A ${a.kind} is too close to a house`, x: a.x, y: a.y });
  }
  return out;
}

/* ───── קפיצה של ארנבת וסנאי ─────
   h: שלב הקפיצה (מתקדם לפי המרחק). 0–.3 דחיפה (הגוף מתמתח קדימה, הרגליים האחוריות נפשטות), .3–.7 באוויר
   (הכפות הקדמיות נשלחות קדימה, האוזניים נשכבות), .7–1 נחיתה על הקדמיות ואיסוף האחוריות. מחזיר את הגובה מעל הקרקע.
   sit: 0..1 – יושבים על האחוריות (הגוף מזדקף; ארנבת מזיזה אף ואוזניים, סנאי מכרסם אגוז בכפות) */
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const GEO = {
  rabbit: { H: [-5, -4.8], J: [-3.2, -3.1], fold: [[-4.8, -.5], [-.8, -.4]], ext: [[-8.6, -2.4], [-11.6, -1.6]], chest: [2.2, -3.2], rest: [2.8, -.3], reach: [5.8, -1.3], tuck: [1.6, -1.8], ear: [3.8, -8.6], hip: [-3, -3.4], air: 3.6 },
  squirrel: { H: [-2.6, -3.4], J: [-1.5, -2.2], fold: [[-2.8, -.4], [-.2, -.3]], ext: [[-5, -1.6], [-7, -1.1]], chest: [2, -3], rest: [2.5, -.3], reach: [4.6, -1], tuck: [1.4, -1.4], ear: [3.2, -8.6], hip: [-1.6, -2.6], air: 2.6 },
} as const;
export function hopPose(P: any, kind: string, h: number, amp: number, sit: number, t: number, seed: number) {
  const G = (GEO as any)[kind], u = ((h % 1) + 1) % 1;
  let a = 0, e = 0, r = 0, tuck = 0;
  if (u < .3) { a = -14 * u / .3; e = u / .3; tuck = u / .3; }
  else if (u < .7) { const k = (u - .3) / .4; a = lerp(-14, 10, k); e = lerp(1, .25, k); r = k; tuck = 1 - k; }
  else { const k = (u - .7) / .3; a = lerp(10, 0, k); e = lerp(.25, 0, k); r = 1 - k; }
  a *= amp; e *= amp; r *= amp; tuck *= amp;
  // ישיבה: מזדקפים (הגוף מסתובב אחורה סביב הירכיים)
  a = lerp(a, -32, sit);
  const heel = [lerp(G.fold[0][0], G.ext[0][0], e), lerp(G.fold[0][1], G.ext[0][1], e)], toe = [lerp(G.fold[1][0], G.ext[1][0], e), lerp(G.fold[1][1], G.ext[1][1], e)];
  const H = G.H, J = G.J;
  const leg = (dx: number, dy: number) => `M${n2(H[0] + dx)},${n2(H[1] + dy)}C${n2(H[0] - 2 + dx)},${n2(H[1] + 1.6 + dy)} ${n2(heel[0] - 1.2 + dx)},${n2(heel[1] - .6 + dy)} ${n2(heel[0] + dx)},${n2(heel[1] + dy)}L${n2(toe[0] + dx)},${n2(toe[1] + dy)}C${n2(toe[0] + .2 + dx)},${n2(toe[1] - .8 + dy)} ${n2(J[0] + 1.2 + dx)},${n2(J[1] + 1 + dy)} ${n2(J[0] + dx)},${n2(J[1] + dy)}Z`;
  P.hind.setAttribute('d', leg(0, 0)); P.hindFar.setAttribute('d', leg(1.1, -.2));
  // כפות קדמיות: במנוחה על הקרקע, בדחיפה מקופלות, באוויר נשלחות קדימה; בישיבה – מורמות לחזה (הסנאי מחזיק אגוז)
  const sitPaw = kind === 'squirrel' ? [3.8, -5.6] : [3, -2.6];
  let px = G.rest[0] + (G.reach[0] - G.rest[0]) * r + (G.tuck[0] - G.rest[0]) * tuck, py = G.rest[1] + (G.reach[1] - G.rest[1]) * r + (G.tuck[1] - G.rest[1]) * tuck;
  px = lerp(px, sitPaw[0], sit); py = lerp(py, sitPaw[1], sit);
  const c = G.chest;
  P.front.setAttribute('d', `M${n2(c[0])},${n2(c[1])}L${n2(px)},${n2(py)}M${n2(c[0] + .9)},${n2(c[1])}L${n2(px + .9)},${n2(py)}`);
  P.bodyG.setAttribute('transform', `rotate(${a.toFixed(1)} ${G.hip[0]} ${G.hip[1]})`);
  // אוזניים: נשכבות לאחור באוויר, מתעוותות במנוחה; אף מתנועע
  const air = u > .3 && u < .7 ? Math.sin((u - .3) / .4 * Math.PI) : 0, twitch = Math.max(0, Math.sin(t * .8 + seed)) ** 16 * 12;
  P.ears.setAttribute('transform', `rotate(${(-30 * air * amp + twitch).toFixed(1)} ${G.ear[0]} ${G.ear[1]})`);
  P.nose.setAttribute('transform', `translate(0,${n2(Math.max(0, Math.sin(t * 2.2 + seed)) ** 3 * Math.sin(t * 9) * .14 * (1 - amp))})`);   // רחרוח: סדרות קצרות, לא כל הזמן
  if (kind === 'squirrel') {
    // זנב: גל לאורך הזנב בריצה, נפנוף רך במנוחה
    const w = Math.sin(h * Math.PI * 2) * 1.2 * amp + Math.sin(t * 1.1 + seed) * .4;
    const T2 = `M-2.6,${n2(-2.2 + w)}C-6,${n2(-2.2 + w)} -8.4,${n2(-5 + w)} -7.4,-8.6C-6.8,-10.8 -4.4,${n2(-11.6 + w * .6)} -3.6,-9.2`;
    P.tail.setAttribute('d', T2);
    P.tailHi.setAttribute('d', `M-6.4,${n2(-4 + w)}C-7.4,${n2(-6 + w * .5)} -7,-8.6 -5.6,-9.8`);
    P.nut.setAttribute('opacity', sit > .6 ? '1' : '0');
    if (sit > .6) P.head.setAttribute('transform', `rotate(${(Math.max(0, Math.sin(t * 9)) * 7).toFixed(1)} 3 -6)`);   // מכרסם
    else P.head.setAttribute('transform', '');
  }
  return Math.sin(Math.PI * Math.max(0, Math.min(1, (u - .1) / .75))) * G.air * amp;
}
