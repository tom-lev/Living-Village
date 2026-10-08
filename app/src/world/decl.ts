/* ───────── הצהרות: כל סוג אובייקט מצהיר על עצמו במקום אחד (כלל תשתית 4) ─────────
   מה השטח שהוא תופס, איפה הדלת, איזה סוג מקום הוא, האם הוא נוף בלבד, האם יש לו תווית, מים או רחבה שאפשר להביט בהם.
   כל הקוד שצריך לדעת משהו על סוג (הנחה, מקומות, תוויות, ספסלים, שבילי דלת, מפת ההליכה) קורא מכאן.
   סוג חדש בלי שורה כאן מופיע בבדיקת העולם ("undeclared"). */

export interface Decl {
  /** סוג המקום (יעד לדמויות): home, shop, church, train, workIn, work, play, animals, shore, stroll, view, rest, sit */
  kind?: string;
  /** נוף בלבד: לא יעד, גם אם יש לו שם */
  scenery?: true;
  /** x,y הוא הפינה השמאלית העליונה של מלבן ברוחב w וגובה h (ולא המרכז או קו הקרקע) */
  topLeft?: true;
  /** השטח המצויר של חפץ קטן [x0,y0,x1,y1], כולל הגובה שלו. חפץ עם שטח כזה עובר את כלל ההנחה (לא על שביל, מים, מבנה, מגרש) */
  foot?: (o: any) => number[];
  /** מבנה: הבסיס שלו חוסם הליכה (רק הדלת פתוחה) */
  solidBase?: true;
  /** איפה הדלת [x, y] (ברירת מחדל: x, y של האובייקט) */
  door?: (o: any) => number[];
  /** מבנה בודד שמקבל שביל גינה מהדלת אל הרשת (כלל 23) */
  doorPath?: true;
  /** איפה עומדים כשבאים למקום (ברירת מחדל: קצת לפני האובייקט). למשל מעיין: על השפה, לא בתוך המים */
  spot?: (o: any) => number[];
  /** בלי תווית שם (יש לו שלט משלו) */
  noLabel?: true;
  /** מים שאפשר להביט בהם ושאסור ללכת עליהם: אליפסה [cx, cy, rx, ry] */
  water?: (o: any) => number[];
  /** רחבה שספסלים פונים אליה: אליפסה [cx, cy, rx, ry] */
  square?: (o: any) => number[];
}

const sideBench = (o: any) => o.facing === 'e' || o.facing === 'w';
const ell = (o: any) => [o.cx, o.cy, o.rx, o.ry];

export const DECL: Record<string, Decl> = {
  // ── מבנים ──
  house: { kind: 'home', doorPath: true },
  modernHouse: { kind: 'home', solidBase: true, doorPath: true, door: o => [o.x + (o.w ?? 92) * .22 + 6.5, o.y] },
  chalet: { kind: 'home', solidBase: true, doorPath: true },
  logCabin: { kind: 'home', solidBase: true, doorPath: true },
  shop: { kind: 'shop', noLabel: true },
  church: { kind: 'church', solidBase: true },
  chapel: { kind: 'church', solidBase: true, doorPath: true },
  station: { kind: 'train', solidBase: true, noLabel: true },
  barn: { kind: 'workIn', solidBase: true, doorPath: true },
  windmill: { kind: 'workIn', solidBase: true, doorPath: true },
  greenhouse: { kind: 'work', solidBase: true, doorPath: true },
  lighthouse: { kind: 'view', solidBase: true, doorPath: true },
  observatory: { kind: 'view', solidBase: true, doorPath: true },
  lookoutTower: { kind: 'view', solidBase: true, doorPath: true },
  waterTower: { solidBase: true },
  stoneFarm: { solidBase: true },
  tent: { kind: 'rest', solidBase: true },
  igloo: { scenery: true, solidBase: true },
  iceHut: { scenery: true, solidBase: true },
  turbine: { scenery: true, solidBase: true },
  well: { scenery: true, solidBase: true, foot: o => [o.x - 18, o.y - 38, o.x + 18, o.y + 7] },
  tunnelPortal: { scenery: true },
  cave: { kind: 'view' },
  ruins: { kind: 'stroll' },
  // ── חפצים קטנים (עם שטח: כלל ההנחה) ──
  bench: { kind: 'sit', foot: o => sideBench(o) ? [o.x - 12, o.y - 43, o.x + 12, o.y + 4] : [o.x - 22, o.y - 24, o.x + 22, o.y + 4] },
  picnicTable: { kind: 'rest', foot: o => [o.x - 20, o.y - 18, o.x + 20, o.y + 4] },
  picnicBlanket: { kind: 'rest', foot: o => [o.x - 22, o.y - 16, o.x + 22, o.y + 16] },
  haybale: { scenery: true, foot: o => [o.x - 9, o.y - 9, o.x + 9, o.y + 9] },
  mailbox: { scenery: true, foot: o => [o.x - 8, o.y - 26, o.x + 8, o.y + 2] },
  bike: { scenery: true, foot: o => [o.x - 11, o.y - 16, o.x + 11, o.y + 2] },
  signpost: { scenery: true, foot: o => [o.x + 2, o.y - 12, o.x + 28, o.y + 12] },   // מצויר מימין לנקודה שלו
  beehives: { kind: 'work', foot: o => [o.x - 13, o.y - 32, o.x + (Math.min(o.count ?? 5, 3) - 1) * 32 + 13, o.y + (Math.ceil((o.count ?? 5) / 3) - 1) * 34 + 4] },
  lamp: { scenery: true }, pigeon: { scenery: true }, umbrella: { scenery: true }, scarecrow: { scenery: true },
  snowman: { scenery: true }, skater: { scenery: true }, buoy: { scenery: true }, sailboat: { scenery: true }, ship: { scenery: true },
  footbridge: { scenery: true }, stoneBridge: { scenery: true }, noTrees: { scenery: true },
  campfire: { kind: 'rest' },
  // ── טבע ──
  pine: { scenery: true }, roundTree: { scenery: true }, palm: { scenery: true }, deer: { scenery: true },
  island: { scenery: true }, rockIslet: { scenery: true },
  // ── שטחים ──
  plot: { scenery: true },
  roundabout: { scenery: true, square: o => [o.x, o.y, (o.r ?? 40) + 42, (o.r ?? 40) + 42] },
  plaza: { kind: 'stroll', square: o => [o.x, o.y, o.rx, o.ry] },
  fountain: { kind: 'stroll', square: o => [o.x, o.y, 36, 16] },
  lake: { kind: 'shore', water: ell },
  mountainLake: { kind: 'shore', water: ell },
  fishingPond: { kind: 'shore', water: ell },
  frozenLake: { kind: 'shore', water: ell },
  hotSpring: { kind: 'shore', water: o => [o.x, o.y, 60, 30], spot: o => [o.x, o.y + 46] },
  pier: { kind: 'shore', topLeft: true },
  paddock: { kind: 'animals' },
  vegGarden: { kind: 'work', topLeft: true },
  field: { kind: 'work', topLeft: true },
  orchard: { kind: 'work' }, vineyard: { kind: 'work' }, sunflowerField: { kind: 'work' },
  playground: { kind: 'play', square: o => [o.x, o.y, 100, 90] },   // ספסלים לידו פונים אליו (ההורים מסתכלים על הילדים)
  footballPitch: { kind: 'play', topLeft: true },
  flowerField: { kind: 'stroll' }, maze: { kind: 'stroll' },
  cableCar: { kind: 'view' }, skiSlope: { kind: 'view' },
  railway: { scenery: true }, train: { scenery: true },
};

export const declOf = (type: string): Decl => DECL[type] ?? {};
/** איפה הדלת של מבנה (ברוב המבנים x,y; בבית המודרני – בצד ימין של החזית) */
export const doorOf = (o: any) => declOf(o.type).door?.(o) ?? [o.x, o.y];
export const doorX = (o: any) => doorOf(o)[0];
