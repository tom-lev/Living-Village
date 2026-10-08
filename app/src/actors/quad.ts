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
  /** רגל מלאה (דוב): עובי בירך, בברך ובקרסול; בלעדיו – קו עגול בעובי w */
  shape?: number[];
  /** כף רגל רחבה עם טפרים, באורך הזה קדימה מהקרסול (כף רגל שטוחה של דוב) */
  paw?: number;
  /** לאיזה צד המפרק האמצעי בולט: 1 קדימה, 1- אחורה (ברירת מחדל: קדמית קדימה, אחורית אחורה) */
  bend?: number;
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
    this.els = specs.map(s => s.shape
      ? el('path', { fill: s.color, stroke: s.color, 'stroke-width': .6, 'stroke-linejoin': 'round' }, s.far ? groups.far : groups.near)
      : el('path', { stroke: s.color, 'stroke-width': s.w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, s.far ? groups.far : groups.near));
    this.hoofs = specs.map(s => !s.hoof ? null : s.paw !== undefined
      ? el('path', { fill: s.hoof }, s.far ? groups.far : groups.near)
      : el('path', { stroke: s.hoof, 'stroke-width': s.w * 1.05, 'stroke-linecap': 'round', fill: 'none' }, s.far ? groups.far : groups.near));
    // היסט השלב של כל רגל: [אחורית קרובה, קדמית קרובה, אחורית רחוקה, קדמית רחוקה] לפי הסדר שבו הוגדרו
    this.off = specs.map(s => gait === 'trot' ? ((s.front !== s.far) ? 0 : .5) : (s.far ? .5 : 0) + (s.front ? .25 : 0));
  }
  /** אורך מחזור צעדים במרחק: במחצית המחזור הרגל על הקרקע וזזה אחורה 2A, בדיוק כמו הגוף */
  get cycle() { return 4 * this.A; }
  /** מציב את הרגליים. phase: שלב (מתקדם לפי המרחק), amp: 0 בעמידה עד 1 בהליכה. מחזיר את התנודה האנכית של הגוף */
  /** rear (0..1): התרוממות על הרגליים האחוריות (דוב). הגוף מסתובב סביב pivot בזווית rearA, הירכיים עולות מעט,
   *  הרגליים האחוריות מתיישרות מתחת לגוף והקדמיות עוזבות את הקרקע בהדרגה ונתלות לפני הבטן. בלי שום קפיצה בין תנוחות */
  rear = 0; rearA = 0; pivot: number[] = [0, 0]; rearLift = 0;
  /** נקודה בגוף אחרי ההתרוממות (סיבוב סביב הציר והרמה) */
  reared(p: number[]) {
    const a = this.rearA * Math.PI / 180, x = p[0] - this.pivot[0], y = p[1] - this.pivot[1];
    return [this.pivot[0] + x * Math.cos(a) - y * Math.sin(a), this.pivot[1] - this.rearLift + x * Math.sin(a) + y * Math.cos(a)];
  }
  pose(phase: number, amp: number, bodyDy = 0) {
    const R = this.rear, e = R * R * (3 - 2 * R);
    this.specs.forEach((s, i) => {
      const q = ((phase + this.off[i]) % 1 + 1) % 1, A = this.A * amp;
      let fx: number, fy: number;
      if (q < .5) { fx = A - 4 * A * q; fy = 0; }                       // על הקרקע: זזה אחורה בקצב הגוף
      else { const u = (q - .5) / .5; fx = -A + 2 * A * (1 - Math.cos(Math.PI * u)) / 2; fy = -this.lift * amp * Math.sin(Math.PI * u); }   // באוויר: קשת קדימה
      let hip = [s.hip[0], s.hip[1] + bodyDy], foot = [s.hip[0] + fx + (s.front ? .4 : -.4), fy];
      if (R > 0) {
        if (s.front) {
          // הכתף עולה עם הגוף; הכף עוזבת את הקרקע ונתלית לפני הבטן
          hip = this.reared(hip);
          const hang = [hip[0] + 4.5, hip[1] + (s.l1 + s.l2) * .62];
          foot = [foot[0] + (hang[0] - foot[0]) * e, foot[1] + (hang[1] - foot[1]) * e];
        } else { hip = [hip[0], hip[1] - this.rearLift]; foot = [foot[0] + (hip[0] + 1.6 - foot[0]) * e, foot[1]]; }
      }
      // כמו אצל בעלי חיים אמיתיים: ברגל הקדמית המפרק הנראה (ה"ברך", שורש כף היד) בולט קדימה,
      // ברגל האחורית המפרק הנראה (העקב) בולט אחורה. הפוך מזה – כל צעד נראה כאילו הוא הולך אחורה
      const knee = ik2(hip, foot, s.l1, s.l2, s.bend ?? (s.front ? 1 : -1));
      if (s.shape) {
        // רגל מלאה: מתאר שמתחדד מהירך דרך הברך אל הקרסול
        const P = [hip, knee, foot], L: string[] = [], R: string[] = [];
        P.forEach((p, j) => {
          const a = P[Math.max(0, j - 1)], b = P[Math.min(2, j + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = s.shape![j] / 2;
          L.push(`${n2(p[0] - dy / d * w)},${n2(p[1] + dx / d * w)}`); R.unshift(`${n2(p[0] + dy / d * w)},${n2(p[1] - dx / d * w)}`);
        });
        this.els[i].setAttribute('d', `M${L.join('L')}L${R.join('L')}Z`);
      } else this.els[i].setAttribute('d', `M${n2(hip[0])},${n2(hip[1])}L${n2(knee[0])},${n2(knee[1])}L${n2(foot[0])},${n2(foot[1])}`);
      if (this.hoofs[i] && s.paw !== undefined) {
        // כף רגל רחבה ושטוחה, עם שלושה טפרים קטנים בקצה
        const w = (s.shape ? s.shape[2] : s.w) / 2, x0 = foot[0] - w - .3, x1 = foot[0] + w + s.paw, y1 = foot[1], y0 = y1 - 2.3;
        let d = `M${n2(x0)},${n2(y1)}L${n2(x0)},${n2(y0 + .8)}Q${n2(x0)},${n2(y0)} ${n2(x0 + 1)},${n2(y0)}L${n2(x1 - 1.2)},${n2(y0 + .3)}Q${n2(x1)},${n2(y0 + .6)} ${n2(x1)},${n2(y1 - .4)}L${n2(x1)},${n2(y1)}Z`;
        for (let k = 0; k < 3; k++) d += `M${n2(x1 - .2)},${n2(y1 - .5 - k * .6)}l1.1,.45l-1.1,.15Z`;
        this.hoofs[i].setAttribute('d', d);
      } else if (this.hoofs[i]) this.hoofs[i].setAttribute('d', `M${n2(foot[0] - .2)},${n2(foot[1] - s.w * .45)}L${n2(foot[0] + s.w * .25)},${n2(foot[1])}`);
    });
    // הגוף עולה ויורד מעט: פעמיים בכל מחזור (בכל פעם שזוג רגליים עובר מתחת לגוף)
    return -Math.abs(Math.sin(phase * Math.PI * 2)) * .06 * this.lift * amp;
  }
}
