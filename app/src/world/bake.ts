/* חישוב מראש בזמן ההעלאה (כלל baked-fresh): תוצאות שתלויות רק בנתוני העולם ובקוד – כללי השבילים והחיבורים שלהם –
   נאפות לקובץ (src/world/baked.json, בעזרת npm run bake), ובטעינה רק נקראות ממנו במקום להיות מחושבות מחדש.
   הקובץ משמש רק אם טביעת האצבע שלו (נתוני העולם + קוד הגיאומטריה) תואמת; אחרת מחשבים כרגיל.
   הבנייה (npm run build) נכשלת אם הקובץ לא מעודכן, כך שלאתר לעולם לא מגיעה תוצאה ישנה. */
import baked from './baked.json';

declare const __GEO_CODE_HASH__: string;
export function fnv(s: string) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
/** טביעת האצבע של הקלט: העולם כפי שנטען (לפני שינויים) וקוד הגיאומטריה */
export const geoHash = (worldText: string) => fnv(worldText + '|' + __GEO_CODE_HASH__);
export const BAKED: any = baked;
/** נתוני העולם כטקסט לטביעת האצבע, בלי הפלטה (כל מבקר יכול לבחור פלטה אחרת, והיא לא משפיעה על הגיאומטריה) */
export const worldKey = (w: any) => JSON.stringify(w, (k, v) => k === 'palette' || k === 'palettes' ? undefined : v);
