/* מחולל אקראי עם זרע קבוע: אותו עולם בכל טעינה */
let seed = 1;
export function setSeed(s: number) { seed = s | 0; }
export function R() {
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
export const rand = (a: number, b: number) => a + (b - a) * R();
export const pick = <T>(arr: T[]): T => arr[Math.floor(R() * arr.length)];
