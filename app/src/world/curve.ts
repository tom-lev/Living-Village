/* ───────── מקור אמת אחד לצורה (כלל תשתית 2) ─────────
   שבילים, הנהר והפלג הם עקומות Catmull-Rom דרך נקודות הנתונים. הציור (smoothOpen ב-core/util), מפת ההליכה,
   רשת הניווט, הגשרים, הצמתים וכללי ההנחה – כולם עובדים על אותה עקומה, דרך הפונקציות כאן.
   אף קוד לא מחשב מרחק או חצייה מול הקווים הישרים שבין נקודות הנתונים. */

/** נקודות הבקרה של קטע i (בזייה מעוקבת), בדיוק כמו ב-smoothOpen */
function seg(P: number[][], i: number) {
  const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
  return [p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2];
}
const bez = (b: number[][], s: number) => {
  const u = 1 - s;
  return [u * u * u * b[0][0] + 3 * u * u * s * b[1][0] + 3 * u * s * s * b[2][0] + s * s * s * b[3][0], u * u * u * b[0][1] + 3 * u * u * s * b[1][1] + 3 * u * s * s * b[2][1] + s * s * s * b[3][1]];
};

/** העקומה המצוירת, דגומה בערך כל step יחידות. seg[k] = מספר קטע הנתונים שהנקודה k שייכת לו */
export function curveWithSegs(P: number[][], step = 4) {
  const out: number[][] = [], segs: number[] = [];
  if (P.length < 2) return { out: P.map(p => [p[0], p[1]]), segs: P.map(() => 0) };
  for (let i = 0; i < P.length - 1; i++) {
    const b = seg(P, i), n = Math.max(2, Math.ceil(Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]) / step));
    for (let k = 0; k < n; k++) { out.push(bez(b, k / n)); segs.push(i); }
  }
  out.push([P[P.length - 1][0], P[P.length - 1][1]]); segs.push(P.length - 2);
  return { out, segs };
}
/** העקומה המצוירת, דגומה בערך כל step יחידות */
export const curvePts = (P: number[][], step = 4) => curveWithSegs(P, step).out;
/** אותה עקומה עם מספר קבוע של דגימות לכל קטע (לנהר: מספר הדגימות קובע כמה מספרים אקראיים נצרכים, אז הוא לא משתנה) */
export function curveFixed(P: number[][], perSeg: number, last = false) {
  const out: number[][] = [];
  for (let i = 0; i < P.length - 1; i++) { const b = seg(P, i); for (let k = 0; k < perSeg; k++) out.push(bez(b, k / perSeg)); }
  if (last) out.push([P[P.length - 1][0], P[P.length - 1][1]]);
  return out;
}
