/* הרכבת האריחים בכרטיס הגרפי (WebGL דרך PixiJS).
   כל אריח שמגיע מהציירים הופך לטקסטורה שעולה לכרטיס מיד, ובכל פריים רק משנים מטריצה אחת:
   גרירה וזום כמעט לא עולים כלום, בלי קשר לכמות התוכן.
   הרמות הגסות יותר מצוירות מתחת לרמה החדה, כך שאף פעם אין חורים בזמן שאריח חדש בדרך. */
import { Application, Container, Sprite, Texture } from 'pixi.js';
import { flushVNodes } from './vnode';

export interface GpuTiles {
  add(key: string, l: number, x: number, y: number, size: number, bmp: ImageBitmap): void;
  remove(key: string): void;
  clear(): void;
  compose(l: number, view: { x0: number; y0: number; x1: number; y1: number }, cam: { k: number; x: number; y: number }): void;
  resize(w: number, h: number, res: number): void;
  setBackground(color: string): void;
  overlay(c: Container): void;   // הדמויות והאפקטים, מעל האריחים ובאותה מצלמה
}

interface Entry { s: Sprite; l: number; x0: number; y0: number; x1: number; y1: number }

export async function createGpuTiles(canvas: HTMLCanvasElement, w: number, h: number, res: number, bg: string, LMAX: number): Promise<GpuTiles> {
  const app = new Application();
  await app.init({ canvas, width: w, height: h, resolution: res, autoDensity: false, antialias: false, background: bg,
    preference: 'webgl', autoStart: false, sharedTicker: false, powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: !location.search.includes('forcegpu') });   // forcegpu: לבדיקות בלבד   // WebGL בתוכנה (בלי כרטיס גרפי) איטי יותר מהקנבס הרגיל: עדיף לסרב
  // רק כרטיס גרפי אמיתי; אם Pixi נפל למצייר משלו בלי WebGL, משתמשים בקנבס הרגיל שלנו
  if ((app.renderer as any).type !== 1 /* RendererType.WEBGL */) { app.destroy(); throw new Error('no hardware WebGL'); }
  app.ticker?.stop();
  const world = new Container(), tilesC = new Container();
  app.stage.addChild(world); world.addChild(tilesC);
  tilesC.isRenderGroup = true;   // קבוצת ציור נפרדת: שינוי בדמויות לא בונה מחדש את האריחים
  // מכל רמה מיכל משלה; הסדר נקבע בכל פריים: גסות למטה, הרמה הבאה (החדה יותר) מעליהן, והרמה הנוכחית למעלה
  const levels: Container[] = [];
  for (let l = 0; l <= LMAX; l++) { const c = new Container(); levels.push(c); tilesC.addChild(c); }
  const entries = new Map<string, Entry>();
  let shown: Entry[] = [], lastL = -1;
  const upload = (tex: Texture) => { try { (app.renderer as any).texture?.initSource?.(tex.source); } catch { /* יעלה בציור הראשון */ } };

  return {
    add(key, l, x, y, size, bmp) {
      const old = entries.get(key); if (old) this.remove(key);
      const tex = Texture.from(bmp);
      upload(tex);                                     // העלאה לכרטיס עכשיו, לא באמצע פריים של גרירה
      const s = new Sprite(tex);
      s.x = x; s.y = y; s.width = size; s.height = size; s.visible = false;
      levels[l].addChild(s);
      entries.set(key, { s, l, x0: x, y0: y, x1: x + size, y1: y + size });
    },
    remove(key) {
      const e = entries.get(key); if (!e) return;
      entries.delete(key);
      e.s.parent?.removeChild(e.s);
      e.s.texture.destroy(true); e.s.destroy();
    },
    clear() { for (const k of [...entries.keys()]) this.remove(k); shown = []; },
    compose(l, v, cam) {
      // משנים נראות רק למה שבאמת נכנס או יצא מהמסך (כל שינוי כזה מחייב את Pixi לבנות מחדש את רשימת הציור)
      const now: Entry[] = [];
      for (const e of entries.values()) {
        const vis = !(e.l > l + 1 || e.x1 < v.x0 || e.x0 > v.x1 || e.y1 < v.y0 || e.y0 > v.y1);
        if (vis) now.push(e);
        if (e.s.visible !== vis) e.s.visible = vis;
      }
      shown = now;
      if (l !== lastL) { lastL = l; levels.forEach((c, i) => { c.zIndex = i === l ? LMAX + 2 : i === l + 1 ? LMAX + 1 : i; }); tilesC.sortChildren(); }
      world.scale.set(cam.k); world.position.set(cam.x, cam.y);
      flushVNodes();
      app.renderer.render(app.stage);
    },
    resize(w, h, res) { app.renderer.resize(w, h, res); },
    setBackground(color) { app.renderer.background.color = color; },
    overlay(c) {
      world.addChild(c);
      for (const layer of c.children) layer.isRenderGroup = true;   // כל שכבה (דמויות, אפקטים, עננים) קבוצה משלה
    },
  };
}
