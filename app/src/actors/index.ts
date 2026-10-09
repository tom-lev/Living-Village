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
    updates.push((dt, T) => { for (const w of walkers) w.update(dt, T); }, ...comp);
    for (const s of A.sitters || []) {
      const m = relocated.find(r => r.type === 'bench' && Math.hypot(r.from[0] - s.x, r.from[1] - s.y) < 25);   // הספסל זז? היושב זז איתו
      const sx = m ? s.x + m.to[0] - m.from[0] : s.x, sy = m ? s.y + m.to[1] - m.from[1] : s.y;
      // יושב על ספסל בפרופיל: יושב לכיוון של הספסל ובמרכז המושב
      const bench = (ctx.world.objects as any[]).find(o => o.type === 'bench' && Math.hypot(o.x - sx, o.y - sy) < 30);
      const side = bench && (bench.facing === 'e' || bench.facing === 'w');
      const st = new Sitter(s.look, side ? bench.x : sx, side ? bench.y - 6 : sy, s.seat, side ? (bench.facing === 'e' ? 1 : -1) : s.flip, s.behavior); sitters.push(st); updates.push((dt, T) => st.update(dt, T)); }
    assignHomes(sitters, rngAt(2, 2, 91), walkers);   // ליושבים: בתים שעוד אין בהם דיירים (בלי לשנות את הבתים של ההולכים)
    for (const st of sitters) { const b = places.find(p => p.kind === 'sit' && p.seat && Math.hypot(p.seat[0] - st.x, p.seat[1] - st.y) < 25); if (b) b.busy = st; }   // הספסל של משה תפוס
  }]);
  steps.push(['paddock', () => {
    const horses = (A.horses || []).map((h: any) => new Horse(h));
    updates.push(dt => { for (const h of horses) h.update(dt); });
    (window as any).__horses = horses;   // לבדיקת התנועה (tools/motion.mjs)
    if (A.sheep) {
      const area = ctx.named[A.sheep.area], flockS = A.sheep.positions.map(([x, y]: number[]) => new Sheep(x, y, area, A.sheep.scale ?? 1));
      (window as any).__sheep = flockS;   // לבדיקת התנועה (tools/motion.mjs)
      // הסוסים והכבשים במכלאה ממוינים יחד לפי עומק: מי שקרוב לצופה מצויר מעל
      const herd: any[] = [...horses, ...flockS];
      let f = 0;
      updates.push(dt => {
        for (const s of flockS) s.update(dt);
        if (++f % 8 === 0) {
          // מזיזים רק אם הסדר באמת השתנה (כל הזזה מכריחה לבנות מחדש את רשימת הציור)
          const sorted = herd.slice().sort((a: any, b: any) => a.y - b.y);
          if (sorted.some((s: any, i: number) => s !== herd[i])) { for (const s of sorted) ctx.L.pad.appendChild(s.g); herd.splice(0, herd.length, ...sorted); }
        }
      });
    }
  }]);
  const group = (name: string, make: ((o: any) => (dt: number, T: number) => void) | undefined) => { if (A[name] && make) steps.push([name, () => { updates.push(make(A[name])); }]); };
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

  let buildSeed = seedNow(), frame = 0, si = 0;
  const times: Record<string, number> = {};
  const out = {
    walkers,
    times,
    /** בונה שלבים עד שנגמר הזמן (במילישניות); מחזיר true כשהכול בנוי */
    build(budget: number) {
      const t0 = performance.now();
      while (si < steps.length) {
        const [name, f] = steps[si++], q = performance.now();
        buildSeed = withSeed(buildSeed, f);
        times[name] = performance.now() - q;
        if (performance.now() - t0 >= budget) break;
      }
      return si >= steps.length;
    },
    get done() { return si >= steps.length; },
    update(dt: number, T: number) {
      updateSeen();   // מה רואים בפריים הזה: מה שמחוץ למסך לא מצויר
      updateLabels(); // שמות האובייקטים: מופיעים בזום קרוב
      for (const f of FX) f(T, dt);
      for (const u of updates) u(dt, T);
      if (++frame % 6 === 0) sortDepth();
    },
  };
  return out;
}
