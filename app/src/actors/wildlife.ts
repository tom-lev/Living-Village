/* חיות היער (משימה 9): ארנבות, סנאים, ינשופים, שועלים ודובים, רחוק מהבתים.
   כל חיה מקבלת בית קבוע ביער (נבחר לפי מיקום, rngAt), ומשוטטת סביבו לאט: עומדת, מרחרחת, וזזה למקום קרוב.
   הן לא דורכות על שבילים, מים או מבנים, לא מתקרבות לבתים, ומתרחקות מעוברים ושבים.
   ארנבת מקפצת, סנאי זריז, שועל בטרוט, דוב הולך לאט. ינשוף יושב על גדם ומסובב את הראש.
   ההיגיון רץ תמיד (זול), הציור רק כשהחיה על המסך. אין שתי חיות זהות (הגוון והגודל לפי המיקום). */
import { REAL_DYN, fitScale } from '../world/scale';
import { el, n2, show } from '../core/util';
import { rngAt } from '../core/rng';
import { ctx, statics, bboxOf } from '../world/context';
import { inView } from '../camera/view';
import { walkable, flagsAt, clearLine, PATH, WATER } from '../world/walk';
import { places } from '../world/places';
import { WILD, setLeg, frontBack, type WildKind, type Parts } from './wildlife-art';
import { dynamics } from './people';

/** הגובה הטבעי של כל ציור (יחידות, בלי הגדלה): ממנו ומהגובה האמיתי נקבע הגודל */
const NATURAL_H: Record<WildKind, number> = { rabbit: 14.6, squirrel: 15, owl: 12.4, fox: 18, bear: 25 };

/** השטח (רוחב לכל צד, גובה) שכל חיה תופסת בגודלה האמיתי */
const SPAWN_BOX: Record<WildKind, number[]> = { rabbit: [8, 14], squirrel: [8, 14], owl: [9, 16], fox: [15, 19], bear: [27, 30] };

/** מהירות, מרחק שיטוט, זמני מנוחה ומרחק מינימלי מבתים, לכל סוג */
const KIND: Record<WildKind, { speed: number; roam: number; rest: [number, number]; homeGap: number; stride: number; hop?: boolean; still?: boolean }> = {
  rabbit: { speed: 26, roam: 90, rest: [2, 7], homeGap: 260, stride: 1.4, hop: true },
  squirrel: { speed: 24, roam: 70, rest: [1.5, 5], homeGap: 240, stride: 1.2, hop: true },
  owl: { speed: 0, roam: 0, rest: [3, 9], homeGap: 300, stride: 0, still: true },
  fox: { speed: 16, roam: 160, rest: [3, 9], homeGap: 360, stride: 2 },
  bear: { speed: 7, roam: 200, rest: [6, 16], homeGap: 800, stride: 3 },
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
    // מבט מלפנים ומאחור (לא לינשוף, שיושב פנים אל הצופה): נבחרים לפי כיוון התנועה, עם דהייה קצרה
    if (kind !== 'owl') {
      this.frontW = el('g', { opacity: 0 }, this.sc); this.backW = el('g', { opacity: 0 }, this.sc);
      this.front = frontBack(kind, this.frontW, this.p.c!, this.p.s!, true);
      this.back = frontBack(kind, this.backW, this.p.c!, this.p.s!, false);
    }
    this.view = 'side'; this.vis = { side: 1, front: 0, back: 0 };
    this.legsStill();
    dynamics.push(this);   // נכנסים למיון העומק יחד עם האנשים
  }
  legsStill() { this.p.legs.forEach((l, j) => setLeg(l, this.p.legBase[j], j * .5, 0, this.K.stride)); }
  /** יעד חדש קרוב לבית של החיה, בקו ישר פנוי */
  pick() {
    for (let i = 0; i < 8; i++) {
      const a = this.rg.rand(0, Math.PI * 2), r = this.rg.rand(.3, 1) * this.K.roam, tx = this.hx + Math.cos(a) * r, ty = this.hy + Math.sin(a) * r * .7;
      if (spotOk(tx, ty, this.K.homeGap, this.homes, this.W, this.H) && pathClear([this.x, this.y], [tx, ty], this.W, this.H)) return [tx, ty];
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
      if (near && this.state === 'rest') {
        const dx = this.x - near.x, dy = this.y - near.y, d = Math.hypot(dx, dy) || 1, tx = this.x + dx / d * 50, ty = this.y + dy / d * 35;
        if (spotOk(tx, ty, K.homeGap * .8, this.homes, this.W, this.H) && pathClear([this.x, this.y], [tx, ty], this.W, this.H)) { this.tx = tx; this.ty = ty; this.state = 'move'; this.flee = 1.6; }
      }
      if (this.state === 'rest' && this.timer <= 0) {
        const tg = this.pick();
        if (tg) { [this.tx, this.ty] = tg; this.state = 'move'; this.flee = 1; } else this.timer = this.rg.rand(...K.rest);
      }
      if (this.state === 'move') {
        const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
        if (d < 1) { this.state = 'rest'; this.timer = this.rg.rand(...K.rest); }
        else {
          ds = Math.min(d, K.speed * this.flee * dt);
          this.x += dx / d * ds; this.y += dy / d * ds;
          if (Math.abs(dx) > 1) this.face = dx > 0 ? 1 : -1;
          // לאן פונים: לרוחב – מהצד; כשהולכים בעיקר למטה (אל הצופה) – מלפנים, למעלה – מאחור. מחליפים רק כשהכיוון ברור
          if (Math.abs(dx) > Math.abs(dy) * 1.3) this.view = 'side';
          else if (Math.abs(dy) > Math.abs(dx) * 1.3) this.view = dy > 0 ? 'front' : 'back';
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
    this.flip += (this.face - this.flip) * Math.min(1, dt * 8);
    this.amp += ((this.state === 'move' ? 1 : 0) - this.amp) * Math.min(1, dt * 6);
    this.phase += ds / ((K.hop ? 7 : 9) * this.k);
    this.shown = inView(this.x, this.y - 10, 40); show(this.g, this.shown);
    if (!this.shown) return;
    // קפיצה של ארנבת או סנאי: קשת קטנה מעל הקרקע בכל צעד
    const lift = K.hop ? Math.abs(Math.sin(this.phase * Math.PI)) * 3.2 * this.amp * this.k : 0;
    if (this.front) {
      for (const v of ['side', 'front', 'back']) this.vis[v] += ((this.view === v ? 1 : 0) - this.vis[v]) * Math.min(1, dt * 10);
      this.f.setAttribute('opacity', this.vis.side.toFixed(2));
      for (const [V, Wr, o] of [[this.front, this.frontW, this.vis.front], [this.back, this.backW, this.vis.back]] as [any, any, number][]) {
        Wr.setAttribute('opacity', o.toFixed(2));
        if (o > .01) V.legs.forEach((l: any, j: number) => {   // מלפנים ומאחור: הרגליים מתרוממות לסירוגין
          const q = (this.phase + j * .5) * Math.PI * 2, fy = -Math.max(0, Math.cos(q)) * K.stride * .7 * this.amp;
          l.setAttribute('d', `M${n2(V.base[j][0])},${V.base[j][1]}L${n2(V.base[j][0])},${n2(fy)}`);
        });
      }
    }
    if (K.hop) this.p.legs.forEach((l, j) => setLeg(l, this.p.legBase[j], this.phase + j * .25, this.amp * .6, K.stride));
    else this.p.legs.forEach((l, j) => setLeg(l, this.p.legBase[j], this.phase + [0, .5, .5, 0][j], this.amp, K.stride));
    if (this.p.tail && this.kind !== 'squirrel') this.p.tail.setAttribute('transform', `rotate(${(Math.sin(t * 2 + this.hx) * 6).toFixed(1)})`);
    if (this.p.head && !K.still) {
      const a = this.state === 'rest' ? Math.sin(t * 1.3 + this.hy) * 6 : 0;   // מרחרחים
      this.p.head.setAttribute('transform', `rotate(${a.toFixed(1)})`);
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
    this.g.setAttribute('transform', `translate(${n2(this.x)},${n2(this.y - lift)})`);
    this.f.setAttribute('transform', `scale(${this.flip.toFixed(3)},1)`);
  }
}

/** מפזר את החיות לפי world.json (actors.wildlife: כמה מכל סוג). המיקומים נבחרים לפי סדר קבוע (rngAt), אז הם יציבים בין טעינות */
export function wildlife(counts: Partial<Record<WildKind, number>>) {
  const homes = places.filter(p => p.kind === 'home' && p.door).map(p => p.door!);
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
  return (dt: number, t: number) => { for (const a of all) a.update(dt, t); };
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
