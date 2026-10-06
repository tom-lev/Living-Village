/* מקומות שאפשר ללכת אליהם: כל אובייקט מצהיר בזמן הציור מה יש בו (בית, חנות, תחנה, אגם, שדה...).
   כך כל בית, חנות או ספסל שיתווספו בעתיד הופכים ליעד בלי עבודה נוספת.
   הדמויות בוחרות יעד לפי "סוג" המקום ולפי האופי שלהן (actors/agenda.ts). */
export type Pt = number[];

/** מה עושים בכל סוג מקום: נכנסים ונעלמים בפנים, או נשארים ומביטים (התנוחות יגיעו בשלב 2) */
export const KINDS: Record<string, { enter?: boolean; dur: [number, number]; label: string }> = {
  home:    { enter: true, dur: [30, 80], label: 'at home' },
  shop:    { enter: true, dur: [10, 25], label: 'shopping' },
  church:  { enter: true, dur: [20, 45], label: 'at church' },
  train:   { enter: true, dur: [45, 100], label: 'on the train' },
  workIn:  { enter: true, dur: [25, 55], label: 'working inside' },
  swim:    { enter: true, dur: [20, 45], label: 'swimming' },
  work:    { dur: [20, 45], label: 'working' },
  view:    { dur: [8, 18], label: 'enjoying the view' },
  shore:   { dur: [10, 25], label: 'by the water' },
  hike:    { dur: [6, 14], label: 'hiking' },
  play:    { dur: [15, 30], label: 'playing' },
  animals: { dur: [10, 20], label: 'with the animals' },
  stroll:  { dur: [8, 16], label: 'strolling' },
  rest:    { dur: [15, 30], label: 'resting' },
  visit:   { dur: [8, 18], label: 'visiting' },
};

/** לאיזה סוג מקום שייך כל סוג אובייקט. סוג שלא מופיע כאן עדיין יעד ("visit": באים, עומדים ומביטים).
 *  כדי לתת לסוג חדש התנהגות עשירה יותר, מוסיפים לו שורה כאן. */
const KIND_OF_TYPE: Record<string, string> = {
  house: 'home', modernHouse: 'home', chalet: 'home', logCabin: 'home',
  church: 'church', chapel: 'church', station: 'train', barn: 'workIn', windmill: 'workIn',
  vegGarden: 'work', field: 'work', orchard: 'work', vineyard: 'work', greenhouse: 'work', sunflowerField: 'work', beehives: 'work',
  playground: 'play', footballPitch: 'play', paddock: 'animals',
  lake: 'shore', fishingPond: 'shore', mountainLake: 'shore', frozenLake: 'shore', hotSpring: 'shore', pier: 'shore',
  plaza: 'stroll', fountain: 'stroll', flowerField: 'stroll', maze: 'stroll', ruins: 'stroll',
  lookoutTower: 'view', lighthouse: 'view', observatory: 'view', cave: 'view', cableCar: 'view', skiSlope: 'view',
  campfire: 'rest', picnicTable: 'rest', picnicBlanket: 'rest', tent: 'rest',
};
/* נוף בלבד: לא יעד (עצים, פנסים, שלטים, חלקים של אובייקט אחר) */
const SCENERY = new Set(['pine', 'roundTree', 'palm', 'deer', 'plot', 'noTrees', 'lamp', 'signpost', 'bike', 'pigeon', 'mailbox', 'haybale', 'buoy', 'umbrella',
  'snowman', 'skater', 'iceHut', 'footbridge', 'stoneBridge', 'tunnelPortal', 'train', 'turbine', 'roundabout', 'railway', 'bench', 'well', 'scarecrow', 'sailboat', 'ship', 'island', 'rockIslet', 'igloo']);
const TOP_LEFT = new Set(['vegGarden', 'field', 'footballPitch', 'pier']);

/** נקרא אחרי שכל אובייקט צויר: אם האובייקט לא רשם מקום בעצמו, רושמים לו מקום לפי הסוג שלו */
export function autoPlace(o: any) {
  if (SCENERY.has(o.type)) return;
  const kind = KIND_OF_TYPE[o.type] ?? (o.name ? 'visit' : null);
  if (!kind) return;
  // נקודת הגעה: הדלת (קו הקרקע במרכז), או נקודה קצת לפני האובייקט
  let x: number, y: number;
  if (TOP_LEFT.has(o.type)) { x = o.x + (o.w ?? 0) / 2; y = o.y + (o.h ?? 0) + 8; }
  else if (o.cx !== undefined) { x = o.cx; y = o.cy + (o.ry ?? o.r ?? 0) + 12; }
  else if (o.x0 !== undefined) { x = (o.x0 + o.x1) / 2; y = o.y1 + 10; }
  else if (o.a && o.b) { x = o.a[0]; y = o.a[1] + 10; }
  else if (o.x !== undefined) { x = o.x; y = o.y; }
  else return;
  const enter = KINDS[kind].enter;
  // אובייקט שעומד על נקודה (x,y הוא קו הקרקע שלו): עומדים קצת לפניו, לא בתוכו
  const standOff = o.x !== undefined && o.cx === undefined && !TOP_LEFT.has(o.type) ? 14 : 0;
  addPlace({ kind, name: o.name, door: enter ? [x, y] : undefined, at: enter ? undefined : [x, y + standOff], vertical: o.type === 'house' });
}

export interface Place {
  kind: string;
  name?: string;      // השם של האובייקט (מוצג במעקב אחרי דמות)
  door?: Pt;          // דלת: נכנסים כאן ונעלמים
  at?: Pt;            // נקודת עמידה במקום פתוח
  vertical?: boolean; // מגיעים לדלת בשביל ישר מהרחוב (מגרש של בית)
  trade?: string;     // לחנות: מה מוכרים בה
  id: number;
}
export const places: Place[] = [];
export function addPlace(p: Omit<Place, 'id'>) { const q = { ...p, id: places.length } as Place; places.push(q); return q; }
/** הנקודה שאליה הולכים: הדלת או נקודת העמידה */
export const spotOf = (p: Place) => (p.door || p.at)!;
