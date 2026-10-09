/* האג'נדה של כל דמות: לאן ללכת עכשיו, ואיך מגיעים לשם.
   כל דמות בוחרת יעד לפי האופי שלה (ילד, מבוגר, מבוגר מאוד, עם כלב), לפי המרחק,
   ובלי לחזור על המקומות האחרונים. אחרי כמה יציאות היא חוזרת הביתה לנוח. */
import { places, KINDS, spotOf, addPlace, type Place, type Pt } from '../world/places';
import { nearestNode, nearNodes, routeNodes, nodeAt, laneScale, deadEnds, trailSpots, compIdOf } from '../world/nav';
import { gridPath, nearestWalkable, type WalkRules } from '../world/walk';
import { geo } from '../world/geometry';
import { ctx } from '../world/context';
import type { LocalRng } from '../core/rng';
import { currentName } from '../world/labels';

/* כמה כל אופי אוהב כל סוג מקום (בית מטופל לחוד: רק הבית של הדמות) */
const LIKES: Record<string, Record<string, number>> = {
  adult: { sit: .6, shop: 3, work: 2.5, workIn: 1.2, church: .8, train: .7, swim: .8, hike: 1.2, view: 1, shore: 1.2, stroll: 1.2, animals: .8, rest: .8, visit: .8, play: .1 },
  elder: { sit: 2.2, shop: 3, church: 2.2, stroll: 2, shore: 1.5, view: .8, rest: 1.6, animals: 1, visit: 1, work: .8, hike: .3, swim: .2, train: .4 },
  child: { sit: .2, play: 4, shop: 1.5, animals: 2.2, shore: 1.5, swim: 1.2, stroll: 1, visit: .7, hike: .4, rest: .5 },
  dog:   { sit: .8, hike: 3, shore: 2, stroll: 2, animals: 1, shop: 1, view: 1.5, visit: .8, swim: .3, rest: .6 },
};
/* יעדים שהולכים אליהם רחוק בכוונה (טיול, רכבת, ים): המרחק כמעט לא מרתיע */
const FAR_OK = new Set(['hike', 'train', 'swim']);
/* בדרך לפנאי מעדיפים שבילים (פארק, נהר, יער) על פני הדרכים, גם אם זה קצת יותר ארוך */
const LEISURE = new Set(['hike', 'stroll', 'view', 'shore', 'sit', 'rest', 'animals', 'visit']);

/** האופי נגזר מהגיל שבנתונים (age): ילד מתחת ל-13, מבוגר מ-65. מי שהולך עם כלב אוהב טיולים ומים */
export function roleOf(look: any): string {
  if (look.role) return look.role;
  if (look.hold === 'leash') return 'dog';
  const age = look.age ?? (look.h < 28 ? 8 : 35);
  return age < 13 ? 'child' : age >= 65 ? 'elder' : 'adult';
}

/* ───────── מסלול: נקודות, רוחב הנתיב בכל נקודה ומרחק מצטבר ───────── */
export interface Route { pts: Pt[]; lane: number[]; acc: number[]; len: number }
function mk(pts: Pt[], lane: number[]): Route {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, lane, acc, len: acc[acc.length - 1] };
}
/** נקודה על המסלול במרחק s: מיקום, כיוון ורוחב הנתיב */
export function routeAt(R: Route, s: number) {
  const { pts, acc, lane } = R;
  if (s <= 0 || pts.length < 2) return { x: pts[0][0], y: pts[0][1], tx: 1, ty: 0, lane: lane[0] };
  let lo = 0, hi = acc.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] <= s) lo = m; else hi = m; }
  const a = pts[lo], b = pts[hi], d = acc[hi] - acc[lo] || 1, f = Math.min(1, (s - acc[lo]) / d);
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, tx: (b[0] - a[0]) / d, ty: (b[1] - a[1]) / d, lane: lane[lo] + (lane[hi] - lane[lo]) * f };
}

/** מוסיף נקודה בתחילת מסלול (למשל: יוצאים קודם מהמים אל החוף) */
export function prependRoute(R: Route, p: Pt): Route { return mk([p, ...R.pts], [0, ...R.lane]); }

/** הדרכים לחבר נקודה (דלת, נקודת עמידה, מיקום נוכחי) לרשת ההליכה, במסלול שמכבד את כללי העולם:
 *  לא דרך מבנים, גדרות, מים או שדות, ומגרש פרטי רק לדייריו. כמה אפשרויות, מהקרובה לרחוקה */
export function connects(p: Pt, rules: WalkRules) {
  const out: { node: number; path: number[][] }[] = [];
  // עד 40 צמתים מהקרוב לרחוק: ליד מכשול (מכלאה, נהר) הקרובים ביותר יכולים להיות כולם מעבר לו, והדרך האמיתית רחוקה קצת יותר
  for (const n of [...new Set([...nearNodes(p[0], p[1], 600, 40), nearestNode(p[0], p[1])])]) {
    const q = nodeAt(n); if (q.lane < 0 || !q.nb.length) continue;   // צומת מבודד (נחתך בתוך מבנה או גדר) לא מוביל לשום מקום: לא מבזבזים עליו את ארבעת החיבורים
    const path = gridPath(p, [q.x, q.y], rules, 120);
    if (path) out.push({ node: n, path });
    if (out.length >= 4) break;
  }
  return out;
}

/** מסלול אל מקום: מהמיקום (או מהדלת) לרשת ההליכה, הדרך הקצרה ברשת, ומשם עד הדלת או נקודת העמידה.
 *  בוחרים צמתים בשני הקצוות ששייכים לאותו חלק של הרשת. מחזיר null אם אי אפשר להגיע בלי לעבור על הכללים */
export function routeTo(from: Pt, to: Place, rules: WalkRules): Route | null {
  const pts: Pt[] = [], lane: number[] = [];
  const add = (p: Pt, l: number) => {
    const q = pts[pts.length - 1];
    if (q && Math.hypot(q[0] - p[0], q[1] - p[1]) < .5) return;
    pts.push(p); lane.push(l);
  };
  const raw = spotOf(to), target = to.door ? raw : nearestWalkable(raw[0], raw[1], rules) || raw;   // יעד שנפל במים או בשדה: הנקודה המותרת הקרובה
  const A = connects(from, rules), Bs = connects(target, rules);
  let a = null, b = null;
  for (const x of A) { b = Bs.find(y => compIdOf(y.node) === compIdOf(x.node)) || null; if (b) { a = x; break; } }
  if (!a || !b) return null;
  const mid = routeNodes(a.node, b.node, LEISURE.has(to.kind) ? .55 : 1);
  if (!mid) return null;
  for (const p of a.path) add(p, 0);
  for (const i of mid) add([nodeAt(i).x, nodeAt(i).y], laneScale(i));
  for (const p of b.path.slice().reverse()) add(p, 0);
  return mk(pts, lane);
}

/* ───────── יעדים לטיול ביער: קצוות של שבילים רחוק מהכפר ───────── */
let hikesReady = false;
function addHikes() {
  if (hikesReady) return; hikesReady = true;
  const H = ctx.home;
  for (const i of deadEnds()) {
    const n = nodeAt(i);
    if (n.x > H.x0 - 200 && n.x < H.x1 + 200 && n.y > H.y0 - 200 && n.y < H.y1 + 200) continue;   // לא בתוך הכפר
    addPlace({ kind: 'hike', name: 'the forest trail', at: [n.x, n.y] });
  }
  // טיול רגלי על שבילי הפארק ולאורך הנהר, ליד הכפר
  const nearRiver = (x: number, y: number) => geo.RIVER_SAMPLES.some(p => Math.hypot(p[0] - x, p[1] - y) < 90);
  for (const i of trailSpots(H.x0 - 300, H.y0 - 200, H.x1 + 300, H.y1 + 300, 260)) {
    const n = nodeAt(i);
    addPlace({ kind: 'stroll', name: nearRiver(n.x, n.y) ? 'the riverside path' : 'the meadow path', at: [n.x, n.y] });
  }
}
/** אפשר להגיע? מקום נכנס לבחירה רק אם יש אליו מסלול מהכפר שמכבד את כללי העולם (נבדק פעם אחת לכל מקום) */
const reachCache = new Map<number, boolean>();
/** מה כבר ידוע על המקום (בלי לחשב): true / false, או undefined אם עוד לא נבדק */
const reachKnown = (p: Place, priv = -1) => reachCache.get(p.id * 1000 + priv + 1);
export function reachable(p: Place, priv = -1) {
  const key = p.id * 1000 + priv + 1;
  let r = reachCache.get(key);
  if (r === undefined) {
    const H = ctx.home, from = nearestWalkable((H.x0 + H.x1) / 2, (H.y0 + H.y1) / 2) || [(H.x0 + H.x1) / 2, (H.y0 + H.y1) / 2];
    r = !!routeTo(from, p, { priv }); reachCache.set(key, r);
  }
  return r;
}

/** שם המשפחה לפי הבית: "Fisher House" → "Fisher"; בית בלי שם משפחה ("Old Stone Farm") → "of Old Stone Farm" */
export function surnameOf(home: Place | null) {
  if (!home?.name) return '';
  const n = currentName(home.name), m = /^(\S+)\s+(House|Lodge|Cottage|Cabin|Home|Villa)$/i.exec(n);
  return m ? m[1] : `of ${n}`;
}

/** הבית של כל דמות: בית בכפר (או לפי שם מהנתונים). לבוגרים בית משלהם; ילדים גרים עם אחד הבוגרים (משפחה) */
export function assignHomes(walkers: any[], rg: LocalRng, others: any[] = []) {
  const H = ctx.home;
  const homes = places.filter(p => p.kind === 'home' && p.door && p.door[0] > H.x0 - 400 && p.door[0] < H.x1 + 400 && p.door[1] > H.y0 && p.door[1] < H.y1 + 200);
  const taken = new Set(others.map(o => o.home)), free = homes.filter(p => !taken.has(p)).sort(() => rg.r() - .5);   // בתים שכבר יש בהם דיירים לא נכנסים
  const grown = walkers.filter(w => w.role !== 'child'), kids = walkers.filter(w => w.role === 'child');
  for (const w of grown) {
    const want = w.look.home && homes.find(p => p.name === w.look.home);
    w.home = want || free.shift() || rg.pick(homes);
    if (want) free.splice(free.indexOf(want), 1);
  }
  const parents = grown.filter(w => w.role === 'adult' || w.role === 'dog');
  for (const k of kids) k.home = (k.look.home && homes.find(p => p.name === k.look.home)) || (parents.length ? rg.pick(parents).home : rg.pick(homes));
}

/** בוחר את היעד הבא לדמות */
export function chooseNext(w: any, rg: LocalRng): Place {
  addHikes();
  // אפשר להגיע? נבדק רק למקום שנבחר (ונשמר), לא לכל המקומות בעולם מראש: אחרת הבחירה הראשונה חישבה מסלול לכל מקום,
  // וזמן הטעינה גדל עם גודל העולם. מקום שאי אפשר להגיע אליו יוצא מהבחירה, ובוחרים שוב
  for (let tries = 0; tries < 12; tries++) {
    const p = chooseOnce(w, rg);
    if (p === w.home || reachable(p)) return p;
  }
  return w.home;
}
function chooseOnce(w: any, rg: LocalRng): Place {
  const like = LIKES[w.role] || LIKES.adult, here = [w.x, w.y];
  // אחרי כמה יציאות חוזרים הביתה לנוח
  if (w.outings >= 2 + Math.floor(rg.r() * 3) && w.home) { w.outings = 0; return w.home; }
  // שני שלבים: קודם סוג הפעילות (לפי האופי), אחר כך מקום מאותו סוג (קרוב עדיף).
  // כך כמות המקומות מכל סוג (למשל עשרות קצוות של שבילים) לא משנה כמה פעמים בוחרים בו
  const byKind = new Map<string, [Place, number][]>();
  for (const p of places) {
    if (p.kind === 'home' || w.recent.includes(p.id) || w.bad?.has(p.id) || reachKnown(p) === false || (p.busy && p.busy !== w)) continue;   // ספסל תפוס: לא
    // ילדים לא הולכים רחוק לבד: לא ליער, לים או לרכבת, ורק קרוב לבית
    if (w.role === 'child' && (FAR_OK.has(p.kind) || (w.home?.door && Math.hypot(spotOf(p)[0] - w.home.door[0], spotOf(p)[1] - w.home.door[1]) > 700))) continue;
    let wt = like[p.kind] ?? 0; if (!wt) continue;
    const s = spotOf(p), d = Math.hypot(s[0] - here[0], s[1] - here[1]);
    let near = 1 / (1 + (d / (FAR_OK.has(p.kind) ? 3000 : 900)) ** 2);
    if (w.role === 'child' && p.trade === 'icecream') near *= 3;
    if (w.role === 'elder' || w.role === 'child') near /= 1 + (d / 1200) ** 2;   // הולכים פחות רחוק
    (byKind.get(p.kind) || byKind.set(p.kind, []).get(p.kind))!.push([p, near]);
  }
  const pickW = <T>(items: [T, number][]) => {
    const total = items.reduce((a, x) => a + x[1], 0); let r = rg.r() * total;
    for (const [x, wt] of items) { r -= wt; if (r <= 0) return x; }
    return items[items.length - 1][0];
  };
  const kinds = [...byKind].map(([k, list]) => [k, like[k] * Math.max(...list.map(x => x[1]))] as [string, number]);
  if (!kinds.length) return w.home;
  return pickW(byKind.get(pickW(kinds))!);
}

/** מה עושים במקום פתוח (התנוחה): עבודה, מבט, האכלה, משחק, שחייה, ישיבה */
export function actOf(p: Place, rg: LocalRng): string {
  switch (p.kind) {
    case 'work': return 'work';
    case 'play': return 'play';
    case 'swim': return 'swim';
    case 'sit': return 'sit';
    case 'animals': return rg.chance(.6) ? 'feed' : 'look';
    case 'shore': return rg.chance(.4) ? 'feed' : 'look';
    default: return 'look';
  }
}

export const durOf = (p: Place, rg: LocalRng) => { const [a, b] = KINDS[p.kind].dur; return rg.rand(a, b); };
