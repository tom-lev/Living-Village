/* היגיון לפי אזורים (משימה 30, שלב 6, סעיף 2: עולם ענק). נתוני ההיגיון האפויים מחולקים לאזורים של S×S יחידות:
   לכל אזור קובץ (tiles/logic/<rx>_<ry>.json) עם האובייקטים שבו (מה שנרשם בבנייה המלאה: מצב המחולל, מספר היצירה,
   השינויים בנתונים, המידות), המקומות שהם יצרו, המידות של הדברים העומדים שלהם, העצים שנבחרו, הגזעים שנפלו,
   והחלק שלו במפת המעבר. בטעינה יורדים רק הליבה (קטנה, בתוך הדף) והאזורים שליד המבט הראשון והכפר;
   השאר ברקע, מהקרוב לרחוק. כך ההורדה והעבודה בטעינה לא גדלות עם העולם. */
import { places } from './places';
import { STATIC_BB } from './context';
import { walkRect, walkGrid } from './walk';
import { rle16, unrle16 } from './lbake';

export interface RegionData {
  objs: [number, any][];          // [מספר האובייקט, הרישום שלו]
  places: [number, any][];        // [מספר המקום, המקום]
  sb: number[][];                 // [cid, x, y, w, h]: מידות הדברים העומדים
  forest: number[];               // מספרי המועמדים של העצים שנבחרו (ci)
  logs: number[][];               // [gx, gy, cid]: גזעים שנפלו ביער העתיק
  walk: { rect: number[]; f: number[]; p: number[] };   // התאים של האזור במפת המעבר [c0, r0, c1, r1), דחוסים
}

export const LREG = {
  core: null as any,                         // הליבה: נתונים כלליים קטנים (null בבנייה המלאה)
  loaded: new Set<string>(),
  objRec: new Map<number, any>(),            // אובייקט → הרישום שלו (מאזורים שנטענו)
  forest: [] as number[],                    // עצים מאזורים שנטענו, שעוד לא תוכננו
  logs: [] as number[][],                    // גזעים מאזורים שנטענו, שעוד לא נבנו
  newObjs: [] as number[],                   // אובייקטים מאזורים שנטענו אחרי הבנייה (לבנייה ברקע)
  boot: [] as [string, RegionData][],        // האזורים של הטעינה: נכתבים למפה בתחילת הבנייה (אחרי שהמפה הוקצתה)
  get S(): number { return this.core?.S ?? 2048; },
  get all(): boolean { return !!this.core && this.loaded.size >= this.core.regions.length; },
};
export const regionKey = (x: number, y: number) => `${Math.floor(x / LREG.S)}_${Math.floor(y / LREG.S)}`;
/** האזורים שהמלבן נוגע בהם (רק כאלה שקיימים בעולם) */
export function regionsIn(x0: number, y0: number, x1: number, y1: number): string[] {
  const S = LREG.S, out: string[] = [], have = new Set(LREG.core?.regions ?? []);
  for (let ry = Math.floor(y0 / S); ry <= Math.floor(y1 / S); ry++) for (let rx = Math.floor(x0 / S); rx <= Math.floor(x1 / S); rx++) { const k = rx + '_' + ry; if (have.has(k)) out.push(k); }
  return out;
}

/** אזור שהגיע: הנתונים שלו נכנסים למבנים הרגילים (מפת המעבר, המקומות, המידות), והאובייקטים והעצים שלו – לתור */
export function applyRegion(key: string, d: RegionData, booting: boolean) {
  if (LREG.loaded.has(key)) return;
  LREG.loaded.add(key);
  for (const [id, p] of d.places) places[id] = p;
  const a = STATIC_BB.arr!;
  for (const [cid, x, y, w, h] of d.sb) a.set([x, y, w, h], cid * 4);
  walkRect(d.walk.rect, Int32Array.from(d.walk.f), Int32Array.from(d.walk.p));
  for (const [i, r] of d.objs) { LREG.objRec.set(i, r); if (!booting) LREG.newObjs.push(i); }
  LREG.forest.push(...d.forest);
  LREG.logs.push(...d.logs);
}

/* ───── האפייה (בבנייה המלאה, דרך tools/site.mjs): חלוקת כל נתוני ההיגיון לאזורים ───── */
export function splitRegions(S: number, B: { x0: number; y0: number; x1: number; y1: number }, inp: {
  rec: any; objXY: (i: number) => number[] | null; sb: (cid: number) => number[] | null; cidTotal: number;
  forest: number[][]; logs: number[][]; firstObjPlace: number;
}) {
  const { rec } = inp, regions = new Map<string, RegionData>();
  const R = (k: string) => { let r = regions.get(k); if (!r) regions.set(k, r = { objs: [], places: [], sb: [], forest: [], logs: [], walk: { rect: [], f: [], p: [] } }); return r; };
  const keyOf = (x: number, y: number) => `${Math.floor(x / S)}_${Math.floor(y / S)}`;
  for (let ry = Math.floor(B.y0 / S); ry <= Math.floor((B.y1 - 1e-6) / S); ry++) for (let rx = Math.floor(B.x0 / S); rx <= Math.floor((B.x1 - 1e-6) / S); rx++) R(rx + '_' + ry);
  const n = rec.seed.length, objCid = new Set<number>();
  for (let i = 0; i < n; i++) {
    const xy = inp.objXY(i); if (!xy) continue;
    const r = R(keyOf(xy[0], xy[1]));
    const c0 = rec.cid[i], c1 = i + 1 < n ? rec.cid[i + 1] : rec.cidAfter, p0 = rec.p0[i], p1 = i + 1 < n ? rec.p0[i + 1] : rec.places.length;
    r.objs.push([i, { seed: rec.seed[i], cid: c0, p0, d1: rec.d1[i], d2: rec.d2[i], bb: rec.bb[i], k: rec.k[i], plot: rec.plot[i] }]);
    for (let p = p0; p < p1; p++) r.places.push([p, rec.places[p]]);
    for (let c = c0; c < c1; c++) { objCid.add(c); const b = inp.sb(c); if (b) r.sb.push([c, ...b]); }
  }
  for (const [ci, x, y] of inp.forest) R(keyOf(x, y)).forest.push(ci);
  const logCid = new Set<number>();
  for (const [gx, gy, cid, x, y] of inp.logs) { R(keyOf(x, y)).logs.push([gx, gy, cid]); logCid.add(cid); const b = inp.sb(cid); if (b) R(keyOf(x, y)).sb.push([cid, ...b]); }
  // מפת המעבר: כל תא שייך לאזור אחד בדיוק
  const g = walkGrid();
  for (const [k, r] of regions) {
    const [rx, ry] = k.split('_').map(Number), cl = (v: number, m: number) => Math.max(0, Math.min(m, v));
    const c0 = cl(Math.floor((rx * S - g.X0) / g.C), g.W), c1 = cl(Math.floor(((rx + 1) * S - g.X0) / g.C), g.W);
    const r0 = cl(Math.floor((ry * S - g.Y0) / g.C), g.H), r1 = cl(Math.floor(((ry + 1) * S - g.Y0) / g.C), g.H);
    const f = new Uint16Array((c1 - c0) * (r1 - r0)), p = new Uint16Array(f.length);
    for (let j = r0; j < r1; j++) { f.set(g.F.subarray(j * g.W + c0, j * g.W + c1), (j - r0) * (c1 - c0)); p.set(g.P.subarray(j * g.W + c0, j * g.W + c1), (j - r0) * (c1 - c0)); }
    r.walk = { rect: [c0, r0, c1, r1], f: Array.from(rle16(f)), p: Array.from(rle16(p)) };
  }
  // הליבה: המקומות שנוצרו לפני האובייקטים (חוף), ומידות הדברים העומדים של המחוללים (פנסים, עמודי חשמל)
  const core = {
    S, regions: [...regions.keys()], seedAfter: rec.seedAfter, cidAfter: rec.cidAfter, cidTotal: inp.cidTotal,
    relocated: rec.relocated, plotDoors: rec.plotDoors, nPlaces: rec.places.length,
    places: rec.places.slice(0, inp.firstObjPlace).map((p: any, id: number) => [id, p]),
    sb: [] as number[][],
  };
  for (let c = rec.cidAfter; c < inp.cidTotal; c++) if (!logCid.has(c)) { const b = inp.sb(c); if (b) core.sb.push([c, ...b]); }
  return { core, regions: Object.fromEntries(regions) };
}
export { unrle16 };
