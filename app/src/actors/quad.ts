/* הליכה של בעלי ארבע רגליים (סוס, צבי, כבשה, שועל, דוב, כלב): רגליים עם מפרקים, צעדים לפי מרחק.
   כמו אצל האנשים: שלב הצעד מתקדם לפי המרחק שהגוף עבר (phase += ds / cycle), אז כף הרגל שעל הקרקע נשארת במקומה
   ולא "מחליקה", בכל מהירות. כל רגל: ירך (נקודה על הגוף), עצם עליונה, עצם תחתונה, וכף רגל/פרסה; הברך מחושבת ב-IK.
   הליכות: walk – ארבע פעימות (אחורית, קדמית באותו צד, אחורית שנייה, קדמית שנייה); trot – רגליים אלכסוניות יחד.
   הרגליים הרחוקות מצוירות כהות יותר ומאחורי הגוף, הקרובות לפניו (הקורא מחליט איפה כל קבוצה). */
import { el, n2 } from '../core/util';

export interface LegSpec {
  hip: number[];      // מקום הירך על הגוף (מבט מהצד, פונה ימינה)
  l1: number; l2: number;
  front: boolean;     // רגל קדמית (הברך מתכופפת אחורה) או אחורית (העקב מאחור)
  far: boolean;       // הרגל הרחוקה (מאחורי הגוף)
  w: number;          // עובי
  color: string;
  hoof?: string;      // צבע הפרסה / כף הרגל
}
export type Gait = 'walk' | 'trot';

/** IK של שני מקטעים: הברך בין הירך לכף הרגל. sgn קובע לאיזה צד הברך מתכופפת */
export function ik2(a: number[], b: number[], l1: number, l2: number, sgn: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dd = Math.hypot(dx, dy) || 1e-6, d = Math.min(dd, l1 + l2 - 1e-3);
  const ux = dx / dd, uy = dy / dd, m = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - m * m));
  return [a[0] + ux * m + sgn * uy * h, a[1] + uy * m - sgn * ux * h];
}

export class Legs {
  specs: LegSpec[]; els: any[]; hoofs: any[]; gait: Gait; A: number; lift: number; off: number[];
  /** g: לכל רגל, הקבוצה שאליה היא נכנסת (רחוקה – מאחורי הגוף, קרובה – לפניו). A: חצי אורך צעד. lift: גובה הרמת הרגל */
  constructor(specs: LegSpec[], groups: { far: any; near: any }, gait: Gait, A: number, lift: number) {
    this.specs = specs; this.gait = gait; this.A = A; this.lift = lift;
    this.els = specs.map(s => el('path', { stroke: s.color, 'stroke-width': s.w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, s.far ? groups.far : groups.near));
    this.hoofs = specs.map(s => s.hoof ? el('path', { stroke: s.hoof, 'stroke-width': s.w * 1.05, 'stroke-linecap': 'round', fill: 'none' }, s.far ? groups.far : groups.near) : null);
    // היסט השלב של כל רגל: [אחורית קרובה, קדמית קרובה, אחורית רחוקה, קדמית רחוקה] לפי הסדר שבו הוגדרו
    this.off = specs.map(s => gait === 'trot' ? ((s.front !== s.far) ? 0 : .5) : (s.far ? .5 : 0) + (s.front ? .25 : 0));
  }
  /** אורך מחזור צעדים במרחק: במחצית המחזור הרגל על הקרקע וזזה אחורה 2A, בדיוק כמו הגוף */
  get cycle() { return 4 * this.A; }
  /** מציב את הרגליים. phase: שלב (מתקדם לפי המרחק), amp: 0 בעמידה עד 1 בהליכה. מחזיר את התנודה האנכית של הגוף */
  pose(phase: number, amp: number, bodyDy = 0) {
    this.specs.forEach((s, i) => {
      const q = ((phase + this.off[i]) % 1 + 1) % 1, A = this.A * amp;
      let fx: number, fy: number;
      if (q < .5) { fx = A - 4 * A * q; fy = 0; }                       // על הקרקע: זזה אחורה בקצב הגוף
      else { const u = (q - .5) / .5; fx = -A + 2 * A * (1 - Math.cos(Math.PI * u)) / 2; fy = -this.lift * amp * Math.sin(Math.PI * u); }   // באוויר: קשת קדימה
      const hip = [s.hip[0], s.hip[1] + bodyDy], foot = [s.hip[0] + fx + (s.front ? .4 : -.4), fy];
      // ברך קדמית מתכופפת אחורה (sgn 1 כשפונים ימינה), עקב אחורי מתכופף קדימה במבט, כמו אצל סוס
      const knee = ik2(hip, foot, s.l1, s.l2, s.front ? -1 : 1);
      this.els[i].setAttribute('d', `M${n2(hip[0])},${n2(hip[1])}L${n2(knee[0])},${n2(knee[1])}L${n2(foot[0])},${n2(foot[1])}`);
      if (this.hoofs[i]) this.hoofs[i].setAttribute('d', `M${n2(foot[0] - .2)},${n2(foot[1] - s.w * .45)}L${n2(foot[0] + s.w * .25)},${n2(foot[1])}`);
    });
    // הגוף עולה ויורד מעט: פעמיים בכל מחזור (בכל פעם שזוג רגליים עובר מתחת לגוף)
    return -Math.abs(Math.sin(phase * Math.PI * 2)) * .06 * this.lift * amp;
  }
}
