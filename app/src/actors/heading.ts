/* כיוון של חיה ב-360 מעלות (כללי הבעלים): חיה יכולה ללכת בכל זווית, תמיד בדיוק לכיוון שהיא פונה אליו;
   אף פעם לא "מסתובבת על הציר" (מתכווצת לקו ומתהפכת), לא מחליקה כמו על מסוע, ואין דהייה (פייד) בהתנהגות שלה.
   - h: הכיוון (רדיאנים; 0 ימינה, π/2 למטה – אל הצופה, π- /2 למעלה – הלאה ממנו).
   - steer/turnTo: הכיוון משתנה בהדרגה (קצב מוגבל), אז החיה פונה בקשת; בפנייה חדה היא כמעט עוצרת ומסתובבת במקום, בצעדים.
   - המבט נגזר מהכיוון, כמו פריימים של אנימציה: לרוחב – מהצד, למטה – מלפנים, למעלה – מאחור. המעבר מיידי (בלי דהייה),
     עם השהיה קטנה (היסטרזיס) כדי שלא יקפוץ הלוך וחזור באלכסון.
     פנייה מימין לשמאל עוברת דרך מבט מלפנים או מאחור, וההיפוך (המראה) מתחלף רק כשהמבט לא מהצד – אז לא רואים אותו.
   - באלכסון מבט הצד מתקצר מעט (כמו מבט שלושת-רבעי). */
export const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
export type View = 'side' | 'front' | 'back';

export class Heading {
  h: number; flip: number; rate: number; turned = 0; view: View = 'side';
  /** rate: כמה מהר מסתובבים (רדיאנים לשנייה) */
  constructor(h0: number, rate: number) { this.h = h0; this.rate = rate; this.flip = Math.cos(h0) >= 0 ? 1 : -1; this.views(true); }
  /** פונה לעבר זווית; מחזיר כמה מהמהירות מותר עכשיו (0..1): ישר קדימה – הכול, בפנייה חדה – כלום (מסתובבים במקום) */
  turnTo(want: number, dt: number) {
    const d = wrapA(want - this.h), step = Math.max(-this.rate * dt, Math.min(this.rate * dt, d));
    this.h = wrapA(this.h + step); this.turned = Math.abs(step);
    this.views();
    const left = Math.abs(d - step);
    return left > Math.PI / 2 ? 0 : Math.cos(left) ** 2;
  }
  steer(dx: number, dy: number, dt: number) { return Math.hypot(dx, dy) < 1e-6 ? 1 : this.turnTo(Math.atan2(dy, dx), dt); }
  get dir() { return [Math.cos(this.h), Math.sin(this.h)]; }
  /** המבט לפי הכיוון: מעבר מיידי, עם היסטרזיס; ההיפוך מתחלף רק כשלא רואים את מבט הצד */
  views(force = false) {
    const c = Math.abs(Math.cos(this.h)), s = Math.sin(this.h);
    if (force) this.view = c >= .5 ? 'side' : s > 0 ? 'front' : 'back';
    else if (this.view === 'side') { if (c < .42) this.view = s > 0 ? 'front' : 'back'; }
    else if (c > .58) this.view = 'side';
    else if (this.view === 'front' && s < -.2) this.view = 'back';
    else if (this.view === 'back' && s > .2) this.view = 'front';
    if (this.view !== 'side' || force) this.flip = Math.cos(this.h) >= 0 ? 1 : -1;
  }
  /** קנה המידה האופקי של מבט הצד: היפוך, וקיצור קל באלכסון */
  get sx() { return this.flip * (.82 + .18 * Math.min(1, Math.abs(Math.cos(this.h)) / .9)); }
}

/** רגליים במבט מלפנים/מאחור: עמודים שמתרוממים לסירוגין לפי שלב הצעד */
export function liftLegs(legs: any[], base: number[][], phase: number, amp: number, lift: number, n2: (v: number) => number | string) {
  legs.forEach((l, j) => {
    const q = (phase + (j % 2) * .5 + (j >= 2 ? .25 : 0)) * Math.PI * 2, fy = -Math.max(0, Math.cos(q)) * lift * amp;
    l.setAttribute('d', `M${n2(base[j][0])},${n2(base[j][1])}L${n2(base[j][0])},${n2(fy)}`);
  });
}
