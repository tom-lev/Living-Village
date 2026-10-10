/* בונה את כל מה שזז מתוך קובץ העולם, ומחזיר פונקציית עדכון אחת לכל פריים */
import { ctx, FX } from '../world/context';
import { Walker, Dog, Sitter, Balloon, Leash, sortDepth } from './people';
import { Horse, Sheep, ducks, fish, butterflies } from './animals';
import { clouds, flock } from './ambient';
import { wildlife } from './wildlife';
import { trains } from './trains';
import { bluebirds } from './bluebirds';
import { birds } from './birds';
import { lizards } from './lizards';
import { updateSeen } from '../camera/view';
import { updateLabels } from '../world/labels';
import { assignHomes } from './agenda';
import { places } from '../world/places';
import { relocated } from '../scene/build';
import { rngAt, seedNow, withSeed } from '../core/rng';

export { followables } from './people';

/** בונה את מה שזז בשלבים (משימה 30, שלב 5): הקבוצה הראשונה מיד, והשאר בפריימים הבאים, אחרי שהמפה כבר מוצגת.
 *  כל שלב בנייה רץ על רצף אקראי משלו (buildSeed), שממשיך משלב לשלב בדיוק כמו בבנייה ברצף אחד –
 *  כך הדמויות יוצאות זהות, גם כשבין השלבים כבר רצים פריימים (שצורכים מספרים מהמחולל הכללי) */
const PROF: Record<string, number> | null = typeof location !== 'undefined' && location.search.includes('debug') ? ((window as any).__updT = {}) : null;
const nm = <F extends Function>(n: string, f: F) => Object.assign(f, { n });

export function buildActors(A: Record<string, any>) {
  const updates: ((dt: number, T: number) => void)[] = [];
  const steps: [string, () => void][] = [];
  let walkers: any[] = [];
  steps.push(['people', () => {
    walkers = (A.walkers || []).map((w: any) => new Walker(w.look, w.speed));
    out.walkers = walkers;
    const sitters: any[] = [];   // היושבים (סבא משה, תמר) גרים גם הם בבית בכפר: ממנו שם המשפחה שלהם
    assignHomes(walkers, rngAt(1, 1, 91));   // לכל דמות בית
    for (const w of walkers) w.start();
    const comp: ((dt: number, T: number) => void)[] = [];
    for (const c of A.companions || []) {
      const owner = walkers[c.owner];
      if (c.type === 'dog') { const d = new Dog(owner, c.color, c.name); const l = new Leash(owner, d); comp.push((dt, T) => { d.update(dt, T); l.update(); }); }
      if (c.type === 'balloon') { const b = new Balloon(owner, c.color); comp.push((dt, T) => b.update(dt, T)); }
    }
    // הבלון והרצועה מתעדכנים אחרי שהבעלים זזו
    updates.push(nm('people', (dt, T) => { for (const w of walkers) w.update(dt, T); }), ...comp.map(f => nm('companions', f)));
    for (const s of A.sitters || []) {
      const m = relocated.find(r => r.type === 'bench' && Math.hypot(r.from[0] - s.x, r.from[1] - s.y) < 25);   // הספסל זז? היושב זז איתו
      const sx = m ? s.x + m.to[0] - m.from[0] : s.x, sy = m ? s.y + m.to[1] - m.from[1] : s.y;
      // יושב על ספסל בפרופיל: יושב לכיוון של הספסל ובמרכז המושב
      const bench = (ctx.world.objects as any[]).find(o => o.type === 'bench' && Math.hypot(o.x - sx, o.y - sy) < 30);
      const side = bench && (bench.facing === 'e' || bench.facing === 'w');
      const st = new Sitter(s.look, side ? bench.x : sx, side ? bench.y - 6 : sy, s.seat, side ? (bench.facing === 'e' ? 1 : -1) : s.flip, s.behavior); sitters.push(st); updates.push(nm('sitters', (dt, T) => st.update(dt, T))); }
    assignHomes(sitters, rngAt(2, 2, 91), walkers);   // ליושבים: בתים שעוד אין בהם דיירים (בלי לשנות את הבתים של ההולכים)
    for (const st of sitters) { const b = places.find(p => p && p.kind === 'sit' && p.seat && Math.hypot(p.seat[0] - st.x, p.seat[1] - st.y) < 25); if (b) b.busy = st; }   // הספסל של משה תפוס
  }]);
  steps.push(['paddock', () => {
    const horses = (A.horses || []).map((h: any) => new Horse(h));
    updates.push(nm('horses', dt => { for (const h of horses) h.update(dt); }));
    (window as any).__horses = horses;   // לבדיקת התנועה (tools/motion.mjs)
    if (A.sheep) {
      const area = ctx.named[A.sheep.area], flockS = A.sheep.positions.map(([x, y]: number[]) => new Sheep(x, y, area, A.sheep.scale ?? 1));
      (window as any).__sheep = flockS;   // לבדיקת התנועה (tools/motion.mjs)
      // הסוסים והכבשים במכלאה ממוינים יחד לפי עומק: מי שקרוב לצופה מצויר מעל
      const herd: any[] = [...horses, ...flockS];
      let f = 0;
      updates.push(nm('sheep', dt => {
        for (const s of flockS) s.update(dt);
        if (++f % 8 === 0) {
          // מזיזים רק אם הסדר באמת השתנה (כל הזזה מכריחה לבנות מחדש את רשימת הציור)
          const sorted = herd.slice().sort((a: any, b: any) => a.y - b.y);
          if (sorted.some((s: any, i: number) => s !== herd[i])) { for (const s of sorted) ctx.L.pad.appendChild(s.g); herd.splice(0, herd.length, ...sorted); }
        }
      }));
    }
  }]);
  // (WHOLE: קבוצות שצריכות את כל העולם – כל הדברים העומדים, העצים ומפת המעבר: באתר המפורסם בעולם גדול הן מחכות לכל האזורים;
//  השאר – למשל המכלאה, הברווזים והעננים – נבנות מיד)
  const WHOLE = new Set(['wildlife', 'bluebirds', 'birds', 'lizards']);
  const group = (name: string, make: ((o: any) => (dt: number, T: number) => void) | undefined) => { if (A[name] && make) steps.push([name, () => { updates.push(nm(name, make(A[name]))); }]); };
  group('wildlife', wildlife);     // חיות היער
  group('trains', trains);         // רכבות קיטור
  group('bluebirds', bluebirds);   // ציפורי כחלי סביב Bluebird Pond
  group('birds', birds);           // דרורים, אנפות ועפרונים
  group('lizards', lizards);       // לטאות בעשב הגבוה של הערבה
  group('ducks', ducks);
  group('fish', fish);
  group('butterflies', butterflies);
  group('clouds', clouds);
  group('flock', flock);

  // לכל שלב רצף אקראי משלו (מהמצב בתחילת הבנייה ומהשם שלו): הסדר שבו השלבים נבנים – שתלוי בקצב ההורדות – לא משנה אותם
  const seed0 = seedNow(), seedOf = (name: string) => { let h = seed0 | 0; for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619); return h | 0; };
  let frame = 0;
  const left = steps.slice();
  const times: Record<string, number> = {};
  const out = {
    walkers,
    times,
    /** בונה שלבים עד שנגמר הזמן (במילישניות); מחזיר true כשהכול בנוי */
    build(budget: number, whole = true) {
      const t0 = performance.now();
      for (let i = 0; i < left.length;) {
        const [name, f] = left[i];
        if (!whole && WHOLE.has(name)) { i++; continue; }   // מחכה לכל העולם
        left.splice(i, 1);
        const q = performance.now(); withSeed(seedOf(name), f); times[name] = performance.now() - q;
        if (performance.now() - t0 >= budget) break;
      }
      return !left.length;
    },
    get done() { return !left.length; },
    update(dt: number, T: number) {
      updateSeen();   // מה רואים בפריים הזה: מה שמחוץ למסך לא מצויר
      updateLabels(); // שמות האובייקטים: מופיעים בזום קרוב
      // (?debug: כמה זמן לוקחת כל קבוצה בפריים – window.__updT, באלפיות שנייה מצטברות)
      if (PROF) {
        let q = performance.now(); for (const f of FX) f(T, dt); PROF.fx = (PROF.fx ?? 0) + performance.now() - q;
        for (const u of updates) { q = performance.now(); u(dt, T); const k = (u as any).n ?? '?'; PROF[k] = (PROF[k] ?? 0) + performance.now() - q; }
        PROF.frames = (PROF.frames ?? 0) + 1;
      } else {
        for (const f of FX) f(T, dt);
        for (const u of updates) u(dt, T);
      }
      if (++frame % 6 === 0) sortDepth();
    },
  };
  return out;
}
