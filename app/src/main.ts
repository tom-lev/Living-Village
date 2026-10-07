/* נקודת הכניסה: בונה את העולם מ-world.json, מפעיל את מנוע האריחים, את הדמויות ואת המצלמה */
import { geo } from './world/geometry';
import './styles.css';
import worldJson from './world/world.json';
import type { WorldData } from './world/types';
import { buildScene } from './scene/build';
import { initTiles, tileStats, repaintTiles, prepareGpu, gpuOverlay, renderNow, onStaticFrame } from './render/tiles';
import { ctx } from './world/context';
import { vstats } from './render/vnode';
import { setPalette, regrade, grade, currentPalette } from './core/palette';
import { buildActors, followables } from './actors';
import { initCamera, cameraTick, loopState, zoomAt, animateTo } from './camera/camera';
import { view } from './camera/view';
import { applySharedNames } from './world/labels';
import { initGrid, drawGrid } from './ui/grid';
import { places } from './world/places';
import * as walkMap from './world/walk';
import { routeTo } from './actors/agenda';
import { components, compOf } from './world/nav';
import { relocated } from './scene/build';

const world = worldJson as unknown as WorldData;
const stage = document.getElementById('stage');
const svgS = document.getElementById('mapS') as unknown as SVGSVGElement;
const svgD = document.getElementById('mapD') as unknown as SVGSVGElement;

// הפלטה שנבחרה בפעם הקודמת (אם יש)
const PAL_KEY = 'village-palette';
try { const p = localStorage.getItem(PAL_KEY); if (world.palettes?.some(x => x.name === p)) world.palette = p; } catch {}
async function boot() {
  // קודם הכרטיס הגרפי: אם הוא זמין, גם הדמויות והאפקטים יחיו בו
  const canvas = await prepareGpu(document.getElementById('mapC') as HTMLCanvasElement);
  view.gpu = ctx.gpuDyn = tileStats.mode === 'gpu';
  buildScene(world, svgS, svgD);
  const actors = buildActors(world.actors);
  const items = initTiles(canvas);
  if (view.gpu) { gpuOverlay(ctx.worldD.c); document.getElementById('dWrap').style.display = 'none'; }
  const { startFollow } = initCamera(followables);

  /* ───────── לולאת האנימציה ───────── */
  let last = 0, T = 0;
  const playBtn = document.getElementById('play');
  function tick(now: number) {
    if (!loopState.running) return;
    // חותמת הזמן של הפריים יכולה להיות מוקדמת מרגע ההפעלה: זמן שלילי מותח את הצעדים, אז מתייחסים אליו כאפס
    const raw = (now - last) / 1000, dt = raw > 0 ? Math.min(.05, raw) : 0; last = Math.max(last, now); T += dt;
    actors.update(dt, T);
    cameraTick(now, dt);
    if (view.gpu) renderNow();   // פריים אחד משותף: אריחים ודמויות
    drawGrid();
    requestAnimationFrame(tick);
  }
  function setRunning(on: boolean) {
    loopState.running = on; view.live = on && view.gpu;
    stage.classList.toggle('paused', !on);
    playBtn.textContent = on ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    if (on) { last = performance.now(); requestAnimationFrame(tick); }
  }
  playBtn.onclick = () => setRunning(!loopState.running);
  // בהשהיה: גרירה מציירת בלי לקדם זמן, אבל מה שנכנס למסך צריך להופיע (מחוץ למסך הוא מוסתר)
  onStaticFrame(() => { if (!loopState.running) actors.update(0, T); drawGrid(); });
  initGrid();

  /* ───────── בחירת סכימת צבעים ───────── */
  const palBtn = document.getElementById('pal'), palMenu = document.getElementById('palMenu'), grainEl = document.getElementById('grain');
  const SWATCH = ['#9cd162', '#5ec6e8', '#e2574c', '#f6d4b2', '#3d9bd9'];   // דשא, מים, גג, דרך, גג

  /** גרעון פילם: אריח רעש רך שנוצר פעם אחת וחוזר על כל המסך (סטטי, בלי ריצוד) */
  function grainTexture() {
    const n = 192, c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'), img = g.createImageData(n, n);
    // כל גרגר בהיר או כהה, עם שקיפות לפי עוצמתו: מיזוג רגיל וזול גם בטלפון
    for (let i = 0; i < n * n; i++) {
      const v = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v > 0 ? 255 : 30; img.data[i * 4 + 3] = Math.min(255, Math.abs(v) * 340);
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL();
  }
  let grainURL = '';
  function applyGrain(amount: number) {
    if (amount > 0 && !grainURL) { grainURL = grainTexture(); grainEl.style.backgroundImage = `url(${grainURL})`; }
    grainEl.style.opacity = String(amount);
    grainEl.hidden = !(amount > 0);
  }

  function applyPalette(name: string) {
    const spec = world.palettes.find(p => p.name === name);
    setPalette(spec, world.palettes); world.palette = name;
    regrade(view.gpu ? ctx.worldD : svgD); repaintTiles();
    document.documentElement.style.setProperty('--bg', grade('#9cd162'));
    applyGrain(currentPalette().grain);
    try { localStorage.setItem(PAL_KEY, name); } catch {}
    renderMenu();
  }
  function renderMenu() {
    palMenu.innerHTML = '';
    const cur = world.palette;
    for (const p of world.palettes) {
      setPalette(p, world.palettes);                       // מחשבים דוגמיות לכל פלטה
      const b = document.createElement('button');
      b.className = 'palItem' + (p.name === cur ? ' on' : '');
      b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', String(p.name === cur));
      b.innerHTML = `<span class="sw">${SWATCH.map(c => `<i style="background:${grade(c)}"></i>`).join('')}</span><span>${p.name}</span>`;
      b.onclick = () => { if (p.name !== world.palette) applyPalette(p.name); closeMenu(); };
      palMenu.appendChild(b);
    }
    setPalette(world.palettes.find(p => p.name === cur), world.palettes);
  }
  const closeMenu = () => { palMenu.hidden = true; palBtn.setAttribute('aria-expanded', 'false'); };
  palBtn.onclick = e => {
    e.stopPropagation();
    if (palMenu.hidden) { renderMenu(); palMenu.hidden = false; palBtn.setAttribute('aria-expanded', 'true'); } else closeMenu();
  };
  document.addEventListener('pointerdown', e => { if (!palMenu.hidden && !palMenu.contains(e.target as Node) && e.target !== palBtn) closeMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.documentElement.style.setProperty('--bg', grade('#9cd162'));
  applyGrain(currentPalette().grain);

  // פריים ראשון, כדי שגם במצב "פחות תנועה" הדמויות יופיעו
  actors.update(.016, 0);
  if (view.gpu) renderNow();
  setRunning(!matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ?debug בכתובת: מציג באיזה מסלול הציור רץ (gpu = כרטיס גרפי, 2d = גיבוי)
  if (new URLSearchParams(location.search).has('debug')) {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:8px;right:8px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:3px 8px;font-size:12px;z-index:9';
    document.body.appendChild(d);
    let n = 0, t0 = performance.now();
    const upd = (t: number) => { n++; if (t - t0 > 1000) { d.textContent = `${tileStats.mode || '…'} · ${n} fps`; n = 0; t0 = t; } requestAnimationFrame(upd); };
    requestAnimationFrame(upd);
  }

  applySharedNames();   // השמות ששונו מהדפדפן (names.json המשותף)

  // לבדיקות אוטומטיות
  (window as any).__places = places;   // לבדיקות: כל היעדים
  (window as any).__walk = walkMap;     // לבדיקות: מפת המעבר
  (window as any).__geo = geo;          // לבדיקות: חיבורי שבילים וגשרים
  (window as any).__routeTo = routeTo;
  (window as any).__navParts = components;
  (window as any).__compOf = compOf;
  (window as any).__relocated = relocated;   // לבדיקות: חפצים שהוזזו בגלל כלל המיקום
  (window as any).__village = { cam: view.cam, walkers: actors.walkers, followables, zoomAt, animateTo, startFollow, setRunning, fitK: () => view.fitK, items, tileStats, applyPalette, vstats };
}
boot();
