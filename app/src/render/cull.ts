/* דילוג על אפקטים שמחוץ למסך בכרטיס הגרפי (culling).
   בשכבות האפקטים (fx, air: עשן, קני נמלים, פנסים, מזרקות...) כל דבר עומד במקום שלו, ויש כאלה בכל העולם.
   בלי דילוג, מנוע הציור בונה ומעבד את כולם בכל פריים – וזה גדל עם גודל העולם.
   לכל אלמנט עליון בשכבות האלה מודדים פעם אחת את המלבן שלו בעולם (עם מרווח לתנועה הקטנה שלו),
   ובכל פריים מסמנים "מדולג" (culled) את מה שמחוץ למסך. הסימון משתנה רק כשאלמנט נכנס או יוצא מהמסך. */
import type { Container } from 'pixi.js';

const box = new WeakMap<Container, number[]>();
const MARGIN = 90;   // עשן עולה, נדנדות זזות: מרווח סביב המלבן שנמדד

export function cullLayers(layers: Container[], cam: { k: number; x: number; y: number }, vw: number, vh: number) {
  const x0 = -cam.x / cam.k, y0 = -cam.y / cam.k, x1 = (vw - cam.x) / cam.k, y1 = (vh - cam.y) / cam.k;
  for (const L of layers) for (const c of L.children) {
    let b = box.get(c);
    if (!b) {
      // נמדד פעם אחת, כשכבר יש לו צורה (אלמנט ריק – למשל קן נמלים שעוד לא צויר – לא מדלגים עליו)
      if (c.culled) c.culled = false;
      const r = c.getBounds();
      if (!(r.width > 0 && r.height > 0)) continue;
      const ax = (r.x - cam.x) / cam.k, ay = (r.y - cam.y) / cam.k;
      b = [ax - MARGIN, ay - MARGIN, ax + r.width / cam.k + MARGIN, ay + r.height / cam.k + MARGIN];
      box.set(c, b);
    }
    const off = b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1;
    if (c.culled !== off) c.culled = off;
  }
}
