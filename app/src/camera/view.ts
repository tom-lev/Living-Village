/* מצב המצלמה, משותף למנוע האריחים, לשכבה הדינמית ולמחוות */
export const view = {
  cam: { k: 1, x: 0, y: 0 },   // מסך = עולם * k + (x, y)
  vw: 0, vh: 0, dpr: 1,
  fitK: 1,                     // זום של תצוגת הבית
  minK: 1,                     // הכי רחוק
  gpu: false,                  // הכול בכרטיס הגרפי (בלי שכבת SVG שמוזזת ב-CSS)
  live: false,                 // לולאת האנימציה רצה (ואז היא זו שמציירת)
};

/* ───────── מה רואים עכשיו (לדילוג על מה שמחוץ למסך) ───────── */
/** האזור הנראה בקואורדינטות עולם, עם שוליים. מתעדכן פעם בפריים */
export const seen = { x0: 0, y0: 0, x1: 0, y1: 0 };
export function updateSeen() {
  const { cam, vw, vh } = view;
  // שוליים: כדי שדבר לא "יקפוץ" לחיים בדיוק בקצה. בגיבוי ה-SVG זז ב-CSS עוד 30% מהמסך בזמן מחווה
  const m = (80 + (view.gpu ? 0 : Math.max(vw, vh) * .3)) / cam.k;
  seen.x0 = -cam.x / cam.k - m; seen.y0 = -cam.y / cam.k - m;
  seen.x1 = (vw - cam.x) / cam.k + m; seen.y1 = (vh - cam.y) / cam.k + m;
}
/** האם עיגול ברדיוס r סביב (x, y) נוגע באזור הנראה */
export const inView = (x: number, y: number, r = 0) => x + r > seen.x0 && x - r < seen.x1 && y + r > seen.y0 && y - r < seen.y1;

/* סימולציה לפי מרחק (משימה 30, שלב 5): חיה רחוקה מהמבט (מעבר ל-FAR יחידות מהמסך) מתעדכנת רק פעם ב-EVERY פריימים,
   עם כל הזמן שעבר מאז (לכל היותר MAXDT): היא מגיעה לאותם מקומות, רק בצעדים גדולים יותר שאף אחד לא רואה.
   החיות מפוזרות על הפריימים (כל אחת בתור שלה), כדי שהעבודה לא תתרכז בפריים אחד. ליד המבט – כל פריים, כרגיל */
const FAR = 250, EVERY = 4, MAXDT = .25;
let lodN = 0;
export function farDt(o: { x: number; y: number; _lodAcc?: number; _lodI?: number }, dt: number): number {
  const acc = (o._lodAcc ?? 0) + dt;
  if (inView(o.x, o.y, FAR)) { o._lodAcc = 0; return Math.min(acc, MAXDT); }
  o._lodI = ((o._lodI ?? lodN++ % EVERY) + 1) % EVERY;
  if (o._lodI) { o._lodAcc = acc; return 0; }
  o._lodAcc = 0; return Math.min(acc, MAXDT);
}
/** עדכון של קבוצת חיות לפי מרחק */
export const updateFar = (all: any[]) => (dt: number, t: number) => { for (const a of all) { const d = farDt(a, dt); if (d > 0) a.update(d, t); } };
