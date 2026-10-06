/* מבנה קובץ העולם (world.json). כל התוכן של המפה מוגדר שם; הקוד רק יודע איך לצייר ולהניע. */
export type Pt = [number, number];
export type Rect = [number, number, number, number];   // x0, y0, x1, y1

/** קטע דרך: עקומת בזייה אחת (נקודת התחלה, שתי נקודות בקרה, נקודת סוף) */
export type Curve = [Pt, number, number, number, number, Pt];

export interface WorldObject {
  type: string;          // שם ה-prefab (בית, חנות, טירה...)
  id?: string;           // שם לשימוש חוזר (למשל 'lake' לברווזים)
  [k: string]: any;
}

export interface Look {
  name: string; h: number; headR: number; skin: string; hair: string; hairStyle: string;
  shirt: string; pants: string; skirt?: string; hat?: string; hold?: 'leash' | 'balloon';
}

export interface WorldData {
  seed: number;
  /** האזור שמוצג בפתיחה (הכפר) */
  home: Rect;
  /** גבולות העולם כולו */
  bounds: Rect;
  roads: {
    /** צמתים ברשת ההליכה של הכפר */
    nodes: Record<string, Pt>;
    /** קטעים בין צמתים: [מ, אל, c1x, c1y, c2x, c2y] */
    edges: [string, string, number, number, number, number][];
    /** דרכים מחוץ לכפר: רק ציור */
    outer: Curve[];
  };
  /** שבילים צרים להולכי רגל: רשימות נקודות */
  trails: Pt[][];
  /** נהר: נקודות לאורכו */
  river: Pt[];
  terrain: Record<string, any>;
  /** כל האובייקטים הסטטיים, לפי סדר הציור */
  objects: WorldObject[];
  /** מחוללים שרצים אחרי האובייקטים (פנסים, עמודי חשמל, יער) */
  generators: WorldObject[];
  actors: Record<string, any>;
}
