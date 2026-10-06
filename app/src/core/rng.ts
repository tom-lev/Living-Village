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

/** מחולל אקראי מקומי לפי מקום (למשל לכל בית אופי משלו): קבוע בין טעינות, ולא מזיז את הרצף של שאר העולם */
export function rngAt(x: number, y: number, salt = 0) {
  let s = (Math.imul(Math.round(x * 10) | 0, 73856093) ^ Math.imul(Math.round(y * 10) | 0, 19349663) ^ Math.imul(salt + 1, 83492791)) | 0;
  const r = () => {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  return {
    r,
    rand: (a: number, b: number) => a + (b - a) * r(),
    pick: <T>(arr: T[]): T => arr[Math.floor(r() * arr.length)],
    chance: (p: number) => r() < p,
  };
}
export type LocalRng = ReturnType<typeof rngAt>;
