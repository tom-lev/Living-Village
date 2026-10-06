/* בונה את כל מה שזז מתוך קובץ העולם, ומחזיר פונקציית עדכון אחת לכל פריים */
import { ctx, FX } from '../world/context';
import { Walker, Dog, Sitter, Balloon, Leash, sortDepth } from './people';
import { Horse, Sheep, ducks, fish, butterflies } from './animals';
import { clouds, flock } from './ambient';
import { updateSeen } from '../camera/view';
import { updateLabels } from '../world/labels';
import { assignHomes } from './agenda';
import { rngAt } from '../core/rng';

export { followables } from './people';

export function buildActors(A: Record<string, any>) {
  const updates: ((dt: number, T: number) => void)[] = [];
  const walkers = (A.walkers || []).map((w: any) => new Walker(w.look, w.speed));
  const sitters: any[] = [];   // היושבים (סבא משה, תמר) גרים גם הם בבית בכפר: ממנו שם המשפחה שלהם
  assignHomes(walkers, rngAt(1, 1, 91));   // לכל דמות בית
  for (const w of walkers) w.start();
  for (const c of A.companions || []) {
    const owner = walkers[c.owner];
    if (c.type === 'dog') { const d = new Dog(owner, c.color, c.name); const l = new Leash(owner, d); updates.push((dt, T) => { d.update(dt, T); l.update(); }); }
    if (c.type === 'balloon') { const b = new Balloon(owner, c.color); updates.push((dt, T) => b.update(dt, T)); }
  }
  // הבלון והרצועה מתעדכנים אחרי שהבעלים זזו
  const walkerUpdate = (dt: number, T: number) => { for (const w of walkers) w.update(dt, T); };
  updates.unshift(walkerUpdate);
  for (const s of A.sitters || []) { const st = new Sitter(s.look, s.x, s.y, s.seat, s.flip, s.behavior); sitters.push(st); updates.push((dt, T) => st.update(dt, T)); }
  assignHomes([...walkers, ...sitters], rngAt(1, 1, 91));   // שוב עם היושבים: אותו סדר, כך שלהולכים נשארים אותם בתים
  const horses = (A.horses || []).map((h: any) => new Horse(h));
  updates.push(dt => { for (const h of horses) h.update(dt); });
  if (A.sheep) {
    const area = ctx.named[A.sheep.area], flockS = A.sheep.positions.map(([x, y]: number[]) => new Sheep(x, y, area, A.sheep.scale ?? 1));
    let f = 0;
    updates.push(dt => {
      for (const s of flockS) s.update(dt);
      if (++f % 8 === 0) {
        // מזיזים רק אם הסדר באמת השתנה (כל הזזה מכריחה לבנות מחדש את רשימת הציור)
        const sorted = flockS.slice().sort((a: any, b: any) => a.y - b.y);
        if (sorted.some((s: any, i: number) => s !== flockS[i])) { for (const s of sorted) ctx.L.pad.appendChild(s.g); flockS.splice(0, flockS.length, ...sorted); }
      }
    });
  }
  if (A.ducks) updates.push(ducks(A.ducks));
  if (A.fish) updates.push(fish(A.fish));
  if (A.butterflies) updates.push(butterflies(A.butterflies));
  if (A.clouds) updates.push(clouds(A.clouds));
  if (A.flock) updates.push(flock(A.flock));
  let frame = 0;
  return {
    walkers,
    update(dt: number, T: number) {
      updateSeen();   // מה רואים בפריים הזה: מה שמחוץ למסך לא מצויר
      updateLabels(); // שמות האובייקטים: מופיעים בזום קרוב
      for (const f of FX) f(T, dt);
      for (const u of updates) u(dt, T);
      if (++frame % 6 === 0) sortDepth();
    },
  };
}
