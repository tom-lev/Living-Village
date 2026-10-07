/* הפרות שנרשמות בזמן הבנייה (לבדיקת העולם, world/check.ts), וסדר שלבי הבנייה (כלל תשתית 3).
   מודול בלי תלויות, כדי שכל קוד אחר יוכל לרשום הפרה או לדרוש שלב בלי מעגלי ייבוא. */

export interface Issue { rule: string; msg: string; x: number; y: number }
export const issues: Issue[] = [];
/** רושם הפרה. אובייקט עם allow: ['rule'] בנתונים מסומן כחריג מכוון ולא נרשם */
export function note(rule: string, msg: string, x: number, y: number, o?: any) {
  if (o?.allow?.includes(rule)) return;
  issues.push({ rule, msg, x: Math.round(x), y: Math.round(y) });
}

/* ───────── שלבי הבנייה, בסדר קבוע ─────────
   setup → geometry (דרכים, דגימת מים, כללי שבילים, צמתים) → terrain (ציור פני השטח, סימון מים/דרכים/שבילים במפת ההליכה)
   → water (אגמים ובריכות מסומנים כמים) → bridges (גשרים מהנתונים במקום החצייה) → objects (חפצים: כיוון, הנחה, ציור, מקום, תווית)
   → generators (פנסים, יער...) → obstacles (בסיסים של עצים וחפצים, אגמים סופיים, גשרים אוטומטיים) → ready.
   כל קוד שתלוי בשלב שכבר הסתיים קורא ל-need(stage): אם הוא רץ מוקדם מדי, זו הפרה ("order") */
export const STAGES = ['setup', 'geometry', 'terrain', 'water', 'bridges', 'objects', 'generators', 'obstacles', 'ready'] as const;
export type Stage = typeof STAGES[number];
const done = new Set<Stage>();
export function finish(stage: Stage) { done.add(stage); }
export function need(stage: Stage, who: string) {
  if (!done.has(stage)) note('order', `${who} ran before stage "${stage}" was finished`, 0, 0);
}
export function resetStages() { done.clear(); issues.length = 0; }
