/* מקומות שאפשר ללכת אליהם: כל אובייקט מצהיר בזמן הציור מה יש בו (בית, חנות, תחנה, אגם, שדה...).
   כך כל בית, חנות או ספסל שיתווספו בעתיד הופכים ליעד בלי עבודה נוספת.
   הדמויות בוחרות יעד לפי "סוג" המקום ולפי האופי שלהן (actors/agenda.ts). */
import { declOf, doorX } from './decl';
export type Pt = number[];

/** מה עושים בכל סוג מקום: נכנסים ונעלמים בפנים, או נשארים ומביטים (התנוחות יגיעו בשלב 2) */
export const KINDS: Record<string, { enter?: boolean; dur: [number, number]; label: string }> = {
  home:    { enter: true, dur: [30, 80], label: 'at home' },
  shop:    { enter: true, dur: [10, 25], label: 'shopping' },
  church:  { enter: true, dur: [20, 45], label: 'at church' },
  train:   { enter: true, dur: [45, 100], label: 'on the train' },
  workIn:  { enter: true, dur: [25, 55], label: 'working inside' },
  swim:    { dur: [25, 50], label: 'swimming' },
  work:    { dur: [20, 45], label: 'working' },
  view:    { dur: [8, 18], label: 'enjoying the view' },
  shore:   { dur: [10, 25], label: 'by the water' },
  hike:    { dur: [6, 14], label: 'hiking' },
  play:    { dur: [15, 30], label: 'playing' },
  animals: { dur: [10, 20], label: 'with the animals' },
  stroll:  { dur: [8, 16], label: 'strolling' },
  rest:    { dur: [15, 30], label: 'resting' },
  visit:   { dur: [8, 18], label: 'visiting' },
  sit:     { dur: [20, 45], label: 'sitting on a bench' },
};

/** נקרא אחרי שכל אובייקט צויר: אם האובייקט לא רשם מקום בעצמו, רושמים לו מקום לפי הסוג שלו */
export function autoPlace(o: any) {
  const D = declOf(o.type);   // מה הסוג הצהיר על עצמו (world/decl.ts)
  if (D.scenery) return;
  const kind = D.kind ?? (o.name ? 'visit' : null);
  if (!kind) return;
  // נקודת הגעה: הדלת (קו הקרקע במרכז), או נקודה קצת לפני האובייקט
  let x: number, y: number;
  if (D.topLeft) { x = o.x + (o.w ?? 0) / 2; y = o.y + (o.h ?? 0) + 8; }
  else if (o.cx !== undefined) { x = o.cx; y = o.cy + (o.ry ?? o.r ?? 0) + 12; }
  else if (o.x0 !== undefined) { x = (o.x0 + o.x1) / 2; y = o.y1 + 10; }
  else if (o.a && o.b) { x = o.a[0]; y = o.a[1] + 10; }
  else if (o.x !== undefined) { x = doorX(o); y = o.y; }
  else return;
  const spot = D.spot?.(o); if (spot) { x = spot[0]; y = spot[1]; }
  const enter = KINDS[kind].enter;
  // אובייקט שעומד על נקודה (x,y הוא קו הקרקע שלו): עומדים קצת לפניו, לא בתוכו
  const standOff = o.x !== undefined && o.cx === undefined && !D.topLeft && !spot ? 14 : 0;
  addPlace({ kind, name: o.name, door: enter ? [x, y] : undefined, at: enter ? undefined : [x, y + standOff], vertical: o.type === 'house', seat: o.type === 'bench' ? [x, y - (o.facing === 'e' || o.facing === 'w' ? 6 : 0)] : undefined, face: o.type === 'bench' ? (o.facing === 'e' ? 1 : o.facing === 'w' ? -1 : 0) : undefined, ...(o.type === 'bench' && !o.name ? { name: 'a bench' } : {}) });
}

export interface Place {
  kind: string;
  name?: string;      // השם של האובייקט (מוצג במעקב אחרי דמות)
  door?: Pt;          // דלת: נכנסים כאן ונעלמים
  at?: Pt;            // נקודת עמידה במקום פתוח
  vertical?: boolean; // מגיעים לדלת בשביל ישר מהרחוב (מגרש של בית)
  trade?: string;     // לחנות: מה מוכרים בה
  face?: number;      // ספסל בפרופיל: לאן היושבים מסתכלים (1 ימינה, -1 שמאלה)
  seat?: Pt;          // לספסל: איפה יושבים (את נקודת ההגעה at מגיעים מלפנים)
  busy?: any;         // מי שתופס את המקום עכשיו (ספסל: אדם אחד)
  id: number;
}
export const places: Place[] = [];
export function addPlace(p: Omit<Place, 'id'>) { const q = { ...p, id: places.length } as Place; places.push(q); return q; }
/** הנקודה שאליה הולכים: הדלת או נקודת העמידה */
export const spotOf = (p: Place) => (p.door || p.at)!;
