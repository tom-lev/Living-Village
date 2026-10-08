/* חיות היער (משימה 9): ארנבות, סנאים, ינשופים, שועלים ודובים, רחוק מהבתים.
   כל חיה מקבלת בית קבוע ביער (נבחר לפי מיקום, rngAt), ומשוטטת סביבו לאט: עומדת, מרחרחת, וזזה למקום קרוב.
   הן לא דורכות על שבילים, מים או מבנים, לא מתקרבות לבתים, ומתרחקות מעוברים ושבים.
   ארנבת מקפצת, סנאי זריז, שועל בטרוט, דוב הולך לאט. ינשוף יושב על גדם ומסובב את הראש.
   ההיגיון רץ תמיד (זול), הציור רק כשהחיה על המסך. אין שתי חיות זהות (הגוון והגודל לפי המיקום). */
import { el, n2, show } from '../core/util';
import { rngAt } from '../core/rng';
import { ctx } from '../world/context';
import { inView } from '../camera/view';
import { walkable, flagsAt, clearLine, PATH, WATER } from '../world/walk';
import { places } from '../world/places';
import { WILD, setLeg, type WildKind, type Parts } from './wildlife-art';
import { dynamics } from './people';

/** מהירות, מרחק שיטוט, זמני מנוחה ומרחק מינימלי מבתים, לכל סוג */
const KIND: Record<WildKind, { speed: number; roam: number; rest: [number, number]; homeGap: number; stride: number; hop?: boolean; still?: boolean }> = {
  rabbit: { speed: 26, roam: 90, rest: [2, 7], homeGap: 260, stride: 1.4, hop: true },
  squirrel: { speed: 24, roam: 70, rest: [1.5, 5], homeGap: 240, stride: 1.2, hop: true },
  owl: { speed: 0, roam: 0, rest: [3, 9], homeGap: 300, stride: 0, still: true },
  fox: { speed: 16, roam: 160, rest: [3, 9], homeGap: 360, stride: 2 },
  bear: { speed: 7, roam: 200, rest: [6, 16], homeGap: 800, stride: 3 },
};

/** מקום טבעי ביער: על הקרקע, לא על שביל או מים (גם לא קרוב), רחוק מבתים, מתחת לרכס ומעל החוף */
function spotOk(x: number, y: number, gap: number, homes: number[][]) {
  const { B } = ctx, T = ctx.world.terrain;
  if (x < B.x0 + 60 || x > B.x1 - 60 || y < T.snow.line + 60 || y > T.beach.y - 80) return false;
  if (!walkable(x, y)) return false;
  for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; if (flagsAt(x + Math.cos(t) * 22, y + Math.sin(t) * 22) & (PATH | WATER)) return false; }
  return !homes.some(h => Math.hypot(h[0] - x, h[1] - y) < gap);
}

class Animal {
  [k: string]: any;
  constructor(kind: WildKind, x: number, y: number, homes: number[][]) {
    this.kind = kind; this.K = KIND[kind]; this.x = this.hx = x; this.y = this.hy = y; this.homes = homes;
    this.rg = rngAt(x, y, 83); this.flip = this.rg.chance(.5) ? 1 : -1; this.face = this.flip;
    this.state = 'rest'; this.timer = this.rg.rand(...this.K.rest); this.phase = 0; this.amp = 0; this.look = 0;
    this.g = el('g', null, ctx.L.actors); this.el = this.g; this.f = el('g', null, this.g);
    this.p = WILD[kind](this.f, rngAt(x, y, 81)) as Parts;
    this.legsStill();
    dynamics.push(this);   // נכנסים למיון העומק יחד עם האנשים
  }
  legsStill() { this.p.legs.forEach((l, j) => setLeg(l, this.p.legBase[j], j * .5, 0, this.K.stride)); }
  /** יעד חדש קרוב לבית של החיה, בקו ישר פנוי */
  pick() {
    for (let i = 0; i < 8; i++) {
      const a = this.rg.rand(0, Math.PI * 2), r = this.rg.rand(.3, 1) * this.K.roam, tx = this.hx + Math.cos(a) * r, ty = this.hy + Math.sin(a) * r * .7;
      if (spotOk(tx, ty, this.K.homeGap, this.homes) && clearLine([this.x, this.y], [tx, ty])) return [tx, ty];
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
        if (spotOk(tx, ty, K.homeGap * .8, this.homes) && clearLine([this.x, this.y], [tx, ty])) { this.tx = tx; this.ty = ty; this.state = 'move'; this.flee = 1.6; }
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
        }
      }
    } else if (this.timer <= 0) { this.look = this.rg.rand(-1, 1); this.timer = this.rg.rand(...K.rest); }   // ינשוף: מסובב את הראש
    this.flip += (this.face - this.flip) * Math.min(1, dt * 8);
    this.amp += ((this.state === 'move' ? 1 : 0) - this.amp) * Math.min(1, dt * 6);
    this.phase += ds / (K.hop ? 7 : 9);
    this.shown = inView(this.x, this.y - 10, 40); show(this.g, this.shown);
    if (!this.shown) return;
    // קפיצה של ארנבת או סנאי: קשת קטנה מעל הקרקע בכל צעד
    const lift = K.hop ? Math.abs(Math.sin(this.phase * Math.PI)) * 3.2 * this.amp : 0;
    if (K.hop) this.p.legs.forEach((l, j) => setLeg(l, this.p.legBase[j], this.phase + j * .25, this.amp * .6, K.stride));
    else this.p.legs.forEach((l, j) => setLeg(l, this.p.legBase[j], this.phase + [0, .5, .5, 0][j], this.amp, K.stride));
    if (this.p.tail && this.kind !== 'squirrel') this.p.tail.setAttribute('transform', `rotate(${(Math.sin(t * 2 + this.hx) * 6).toFixed(1)})`);
    if (this.p.head) {
      const a = K.still ? this.look * 30 : this.state === 'rest' ? Math.sin(t * 1.3 + this.hy) * 6 : 0;   // מרחרחים או מסתכלים סביב
      this.p.head.setAttribute('transform', K.still ? `translate(${n2(this.look * 1.2)},0)` : `rotate(${a.toFixed(1)})`);
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
      if (!spotOk(x, y, K.homeGap, homes) || all.some(a => Math.hypot(a.x - x, a.y - y) < 120)) continue;
      all.push(new Animal(kind, x, y, homes)); n++;
    }
  }
  (window as any).__wildlife = all;   // לבדיקות
  return (dt: number, t: number) => { for (const a of all) a.update(dt, t); };
}
