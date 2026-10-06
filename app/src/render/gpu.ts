/* הרכבת האריחים בכרטיס הגרפי (WebGL דרך PixiJS).
   כל אריח שמגיע מהציירים הופך לטקסטורה שעולה לכרטיס מיד, ובכל פריים רק משנים מטריצה אחת:
   גרירה וזום כמעט לא עולים כלום, בלי קשר לכמות התוכן.
   הרמות הגסות יותר מצוירות מתחת לרמה החדה, כך שאף פעם אין חורים בזמן שאריח חדש בדרך. */
import { Application, Container, Sprite, Texture } from 'pixi.js';

export interface GpuTiles {
  add(key: string, l: number, x: number, y: number, size: number, bmp: ImageBitmap): void;
  remove(key: string): void;
  clear(): void;
  compose(l: number, view: { x0: number; y0: number; x1: number; y1: number }, cam: { k: number; x: number; y: number }): void;
  resize(w: number, h: number, res: number): void;
  setBackground(color: string): void;
}

interface Entry { s: Sprite; l: number; x0: number; y0: number; x1: number; y1: number }

export async function createGpuTiles(canvas: HTMLCanvasElement, w: number, h: number, res: number, bg: string, LMAX: number): Promise<GpuTiles> {
  const app = new Application();
  await app.init({ canvas, width: w, height: h, resolution: res, autoDensity: false, antialias: false, background: bg,
    preference: 'webgl', autoStart: false, sharedTicker: false, powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: true });   // WebGL בתוכנה (בלי כרטיס גרפי) איטי יותר מהקנבס הרגיל: עדיף לסרב
  // רק כרטיס גרפי אמיתי; אם Pixi נפל למצייר משלו בלי WebGL, משתמשים בקנבס הרגיל שלנו
  if ((app.renderer as any).type !== 1 /* RendererType.WEBGL */) { app.destroy(); throw new Error('no hardware WebGL'); }
  app.ticker?.stop();
  const world = new Container();
  app.stage.addChild(world);
  // מכל רמה מיכל משלה; הסדר נקבע בכל פריים: גסות למטה, הרמה הבאה (החדה יותר) מעליהן, והרמה הנוכחית למעלה
  const levels: Container[] = [];
  for (let l = 0; l <= LMAX; l++) { const c = new Container(); levels.push(c); world.addChild(c); }
  const entries = new Map<string, Entry>();
  let shown: Entry[] = [];
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
      for (const e of shown) e.s.visible = false;
      shown = [];
      for (const e of entries.values()) {
        if (e.l > l + 1 || e.x1 < v.x0 || e.x0 > v.x1 || e.y1 < v.y0 || e.y0 > v.y1) continue;
        e.s.visible = true; shown.push(e);
      }
      levels.forEach((c, i) => { c.zIndex = i === l ? LMAX + 2 : i === l + 1 ? LMAX + 1 : i; });
      world.sortChildren();
      world.scale.set(cam.k); world.position.set(cam.x, cam.y);
      app.renderer.render(app.stage);
    },
    resize(w, h, res) { app.renderer.resize(w, h, res); },
    setBackground(color) { app.renderer.background.color = color; },
  };
}
