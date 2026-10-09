/* תוצאות היגיון אפויות (משימה 30, שלב 4): חישובים כבדים של בניית העולם שהתוצאה שלהם תלויה רק בעולם
   (איזה מקומות נבחרו לעצים, סימוני המים והדרכים במפת המעבר). בבנייה המלאה (ובאפייה בשרת) כל חישוב כזה רץ
   ושומר את התוצאה שלו כאן (out); באתר המפורסם התוצאה מגיעה מוכנה בתוך הדף (in) והחישוב לא רץ.
   ההעלאה בודקת שהאתר בונה בדיוק את אותו היגיון (tools/site.mjs) */
export const LBAKE: { in: Record<string, string> | null; out: Record<string, string> } = { in: null, out: {} };

const b64 = (u8: Uint8Array) => { let s = ''; for (let q = 0; q < u8.length; q += 0x8000) s += String.fromCharCode(...u8.subarray(q, q + 0x8000)); return btoa(s); };
const unb64 = (s: string) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };

/** מספרים שלמים (32 ביט): התוצאה האפויה בשם הזה, או – אם אין – מחשבים ושומרים */
export function bakedInts(name: string, compute: () => Int32Array): Int32Array {
  const s = LBAKE.in?.[name];
  if (s !== undefined) { const u = unb64(s); return new Int32Array(u.buffer, 0, u.length >> 2); }
  const v = compute(); LBAKE.out[name] = b64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); return v;
}
/** מספרים ממשיים (64 ביט, בדיוק): כמו bakedInts */
export function bakedF64(name: string, compute: () => Float64Array): Float64Array {
  const s = LBAKE.in?.[name];
  if (s !== undefined) { const u = unb64(s); return new Float64Array(u.buffer, 0, u.length >> 3); }
  const v = compute(); LBAKE.out[name] = b64(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)); return v;
}
/** מערך של 16 ביט, דחוס ברצפים (ערך, אורך) – למפות גדולות שרובן ריקות */
export function rle16(a: Uint16Array): Int32Array {
  const out: number[] = [];
  for (let i = 0; i < a.length;) { const v = a[i]; let n = 1; while (i + n < a.length && a[i + n] === v) n++; out.push(v, n); i += n; }
  return Int32Array.from(out);
}
export function unrle16(r: Int32Array, into: Uint16Array) {
  let o = 0; for (let k = 0; k < r.length; k += 2) { into.fill(r[k], o, o + r[k + 1]); o += r[k + 1]; }
}
