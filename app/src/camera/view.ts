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
