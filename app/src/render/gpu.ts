/* הרכבת האריחים בכרטיס הגרפי (WebGL דרך PixiJS).
   כל אריח שמגיע מהציירים הופך לטקסטורה שעולה לכרטיס מיד, ובכל פריים רק משנים מטריצה אחת:
   גרירה וזום כמעט לא עולים כלום, בלי קשר לכמות התוכן.
   איפה שאריח חד עוד בדרך מוצג במקומו אריח מרמה אחרת, כך שאף פעם אין חורים. */
import { Application, Container, Sprite, Texture } from 'pixi.js';
import { flushVNodes } from './vnode';

export interface GpuTiles {
  add(key: string, l: number, x: number, y: number, size: number, bmp: ImageBitmap): void;
  remove(key: string): void;
  clear(): void;
  compose(l: number, r: { ix0: number; ix1: number; iy0: number; iy1: number }, cam: { k: number; x: number; y: number }): void;
  resize(w: number, h: number, res: number): void;
  setBackground(color: string): void;
  overlay(c: Container): void;   // הדמויות והאפקטים, מעל האריחים ובאותה מצלמה
}

interface Entry { s: Sprite; l: number }

export async function createGpuTiles(canvas: HTMLCanvasElement, w: number, h: number, res: number, bg: string, LMAX: number): Promise<GpuTiles> {
  const app = new Application();
  await app.init({ canvas, width: w, height: h, resolution: res, autoDensity: false, antialias: false, background: bg,
    preference: 'webgl', autoStart: false, sharedTicker: false, powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: !location.search.includes('forcegpu') });   // forcegpu: לבדיקות בלבד   // WebGL בתוכנה (בלי כרטיס גרפי) איטי יותר מהקנבס הרגיל: עדיף לסרב
  // רק כרטיס גרפי אמיתי; אם Pixi נפל למצייר משלו בלי WebGL, משתמשים בקנבס הרגיל שלנו
  if ((app.renderer as any).type !== 1 /* RendererType.WEBGL */) { app.destroy(); throw new Error('no hardware WebGL'); }
  app.ticker?.stop();
  /* תיקון ל-Pixi: הבדיקה המקורית ("האם הצורה הייתה באצווה") תמיד חיובית, ולכן גם צורה שמצוירת לבד
     (batchMode 'no-batch', ראו vnode.ts) גורמת לבניית רשימת הציור של כל השכבה מחדש בכל שינוי. */
  const gpipe = (app.renderer as any).renderPipes.graphics, gctx = (app.renderer as any).graphicsContext;
  gpipe.validateRenderable = (g: any) => {
    const batchable = gctx.updateGpuContext(g.context).isBatchable, was = g._lvBatched;
    g._lvBatched = batchable;
    return batchable || was !== batchable;
  };
  const world = new Container(), tilesC = new Container();
  app.stage.addChild(world); world.addChild(tilesC);
  tilesC.isRenderGroup = true;   // קבוצת ציור נפרדת: שינוי בדמויות לא בונה מחדש את האריחים
  // מכל רמה מיכל משלה; הסדר נקבע בכל פריים: גסות למטה, הרמה הבאה (החדה יותר) מעליהן, והרמה הנוכחית למעלה
  const levels: Container[] = [];
  for (let l = 0; l <= LMAX; l++) { const c = new Container(); levels.push(c); tilesC.addChild(c); }
  const entries = new Map<string, Entry>();
  let shown = new Set<Entry>(), lastL = -1, lastRange = '', dirty = true;
  const upload = (tex: Texture) => { try { (app.renderer as any).texture?.initSource?.(tex.source); } catch { /* יעלה בציור הראשון */ } };
  const get = (l: number, i: number, j: number) => entries.get(l + '/' + i + '/' + j);

  /* לכל משבצת במסך מציגים אריח אחד בלבד: החד אם מוכן, אחרת ארבעה חדים יותר או אריח גס אחד.
     כך כל פיקסל נצבע פעם אחת (קודם כל הרמות הגסות צוירו זו מעל זו על כל המסך,
     וזה העמיס על כרטיס גרפי חלש יותר מכל השאר יחד). */
  function pick(l: number, r: { ix0: number; ix1: number; iy0: number; iy1: number }) {
    const want = new Set<Entry>();
    for (let j = r.iy0; j <= r.iy1; j++) for (let i = r.ix0; i <= r.ix1; i++) {
      const e = get(l, i, j);
      if (e) { want.add(e); continue; }
      const kids = l < LMAX ? [0, 1, 2, 3].map(q => get(l + 1, 2 * i + (q & 1), 2 * j + (q >> 1))) : [];
      if (kids.length && kids.every(Boolean)) { kids.forEach(k => want.add(k)); continue; }
      let found = false;
      for (let pl = l - 1; pl >= 0 && !found; pl--) {
        const f = 2 ** (l - pl), p = get(pl, Math.floor(i / f), Math.floor(j / f));
        if (p) { want.add(p); found = true; }
      }
      if (!found) for (const k of kids) if (k) want.add(k);
    }
    // משנים נראות רק למה שבאמת השתנה (כל שינוי כזה מחייב את Pixi לבנות מחדש את רשימת הציור)
    for (const e of shown) if (!want.has(e)) e.s.visible = false;
    for (const e of want) if (!e.s.visible) e.s.visible = true;
    shown = want;
  }

  return {
    add(key, l, x, y, size, bmp) {
      const old = entries.get(key); if (old) this.remove(key);
      const tex = Texture.from(bmp);
      upload(tex);                                     // העלאה לכרטיס עכשיו, לא באמצע פריים של גרירה
      const s = new Sprite(tex);
      s.x = x; s.y = y; s.width = size; s.height = size; s.visible = false;
      levels[l].addChild(s);
      entries.set(key, { s, l });
      dirty = true;
    },
    remove(key) {
      const e = entries.get(key); if (!e) return;
      entries.delete(key); shown.delete(e); dirty = true;
      e.s.parent?.removeChild(e.s);
      e.s.texture.destroy(true); e.s.destroy();
    },
    clear() { for (const k of [...entries.keys()]) this.remove(k); shown.clear(); },
    compose(l, r, cam) {
      // בוחרים מחדש רק כשמשבצות נכנסות או יוצאות מהמסך, או כשאריח הגיע או נזרק
      const rk = `${l}|${r.ix0}|${r.ix1}|${r.iy0}|${r.iy1}`;
      if (dirty || rk !== lastRange) { dirty = false; lastRange = rk; pick(l, r); }
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
