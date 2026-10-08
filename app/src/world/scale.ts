/* ───────── פרופורציות (בקשת הבעלים): טבלה אחת, נאכפת אוטומטית ─────────
   הבסיס: אדם מבוגר בגובה 33 יחידות = 1.70 מטר, כלומר מטר אחד ≈ 19.4 יחידות.
   כל דבר בגודל אמיתי (אנשים, חיות, כלי רכב, חפצים קטנים) מצהיר כאן על הגובה האמיתי שלו במטרים – עד הנקודה הגבוהה
   ביותר שמצוירת (משענת, אוזניים, תורן). בזמן הבנייה מודדים את הציור; אם הוא סוטה ביותר מ-TOL, הוא מוקטן או מוגדל
   אוטומטית סביב נקודת הקרקע שלו (scene/build.ts), ובדיקת העולם מוודאת שהכול בטווח (כלל "scale").
   דבר חדש בגודל אמיתי? מוסיפים לו שורה כאן, וזהו. */

export const PERSON = 33, PERSON_M = 1.7, M = PERSON / PERSON_M;   // יחידות במטר
export const TOL = .3;

/* ───── קנה מידה של מפה (מבנים ועצים): לא גודל אמיתי מלא, אבל יחסים נכונים ─────
   בית רגיל בכפר גבוה בערך 83 יחידות (4.3 מטר). מבני ציון גבוהים ממנו בבירור, ועצים לפחות פי 2 מאדם */
export const HOUSE_H = 83;
export const TREE_MIN = 2 * PERSON;
/** גובה מינימלי של מבני ציון, ביחס לבית רגיל */
export const MAP_MIN: Record<string, number> = {
  chapel: 1.5, lookoutTower: 1.5, church: 2, windmill: 2, waterTower: 2, lighthouse: 2.5, turbine: 3,
};

/** גובה אמיתי במטרים של חפצים נייחים בגודל אמיתי (לפי סוג האובייקט ב-world.json) */
export const REAL_H: Record<string, number> = {
  picnicTable: .8, mailbox: 1.2, bike: 1.0, signpost: 1.9, haybale: 1.2,
  scarecrow: 1.85, snowman: 1.6, igloo: 2.0, iceHut: 2.4, tent: 2.1, sailboat: 6.5, buoy: 1.2,
  deer: 1.8, skater: 1.65, well: 2.0, lamp: 3.4,
};

/** גובה אמיתי במטרים של דברים שזזים (לבדיקה ולגודל הציור שלהם) */
export const REAL_DYN: Record<string, number> = {
  dog: .7,          // כלב בינוני, עד קצה הראש
  rabbit: .35,      // כולל אוזניים
  squirrel: .32,    // כולל זנב מורם
  owl: .5,          // הינשוף עצמו (בלי הגדם)
  fox: .6,          // עד קצות האוזניים
  bear: 1.3,        // על ארבע, עד קצה הראש
  bluebird: .45,    // ציפור כחלי: קנה מידה של מפה (פי 2.5 מהאמיתי, 18 ס"מ), כמו העצים – אחרת היא נקודה גם בזום המקסימלי
  carriage: 3.4,    // קרון רכבת
};

/** כמה צריך להגדיל או להקטין ציור בגובה drawnH (ביחידות) כדי שיתאים לגובה אמיתי realM. 1 = בטווח, אין צורך */
export function fitScale(drawnH: number, realM: number) {
  const want = realM * M, r = want / drawnH;
  return Math.abs(r - 1) <= TOL ? 1 : r;
}
