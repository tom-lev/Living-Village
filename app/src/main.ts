/* נקודת הכניסה: בונה את העולם מ-world.json, מפעיל את מנוע האריחים, את הדמויות ואת המצלמה */
import { geo } from './world/geometry';
import './styles.css';
import worldJson from './world/world.json';
import type { WorldData } from './world/types';
import { buildScene } from './scene/build';
import { warmUp, bakeTile, tileGrid, bakeRegions, bakeStatic, manifestP, inlineStatic, initTilesFromRegions, initTiles, startPainters, paintersLoaded, tileStats, repaintTiles, prepareGpu, gpuOverlay, renderNow, onStaticFrame, requestStatic, addChunkItems, flushCoarseTiles } from './render/tiles';
import { CULL } from './render/gpu';
import { chunksIn, buildChunk, buildDetail, nextChunk, pendingCount, allChunks } from './scene/chunks';
import { ctx, STATIC_BB } from './world/context';
import { STATIC } from './core/util';
import { RNG_REPLAY, seedNow } from './core/rng';
import { FRAME } from './world/budget';
import { vstats, refreshTextResolution, TEXT_DPR } from './render/vnode';
import { setPalette, regrade, grade, currentPalette } from './core/palette';
import { buildActors, followables } from './actors';
import { initCamera, cameraTick, loopState, zoomAt, animateTo, camMoved } from './camera/camera';
import { view } from './camera/view';
import { applySharedNames } from './world/labels';
import { initGrid, drawGrid } from './ui/grid';
import { places } from './world/places';
import * as walkMap from './world/walk';
import { TREES } from './scene/generators';
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
  startPainters();   // הציירים שברקע מתחילים להיטען מיד, במקביל להכנת הכרטיס הגרפי
  const canvas = await prepareGpu(document.getElementById('mapC') as HTMLCanvasElement);
  view.gpu = ctx.gpuDyn = tileStats.mode === 'gpu';
  const tm: Record<string, number> = {}, t0 = performance.now();   // זמני הטעינה (window.__boot), למדידה
  TEXT_DPR.v = Math.min(devicePixelRatio || 1, 3);   // טקסטים נצבעים לפי צפיפות המסך (ולא פי 8 תמיד)
  startPainters();   // הציירים שברקע נטענים קודם (הטעינה שלהם צריכה דף פנוי), ואז בונים
  // האתר המפורסם (משימה 30, שלב 3): הנוף הקבוע מגיע מוכן (אריחים וקבצי אזורים), אז לא בונים אותו – רק את ההיגיון.
  // המידות של הדברים העומדים והשלטים מגיעים מקובץ שנאפה (static.bin, static.json)
  const [man] = await Promise.all([manifestP, paintersLoaded()]);
  // קודם נותנים לדפדפן להציג את התמונה המיידית (עד 1.5 שניות): בזמן הבנייה הכבדה הוא לא יכול לצייר כלום על המסך
  await new Promise<void>(res => {
    const s0 = performance.now(), box = document.getElementById('instant');
    const f = () => (!box?.firstChild || (window as any).__instantAt || performance.now() - s0 > 1500)
      ? requestAnimationFrame(() => setTimeout(res, 0)) : setTimeout(f, 30);
    f();
  });
  let staticJson: any = null;
  if (man?.regions) {
    try {
      const inl = inlineStatic(), b64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
      const [bin, js] = inl ? [b64(inl.bin), inl.json] : await Promise.all([fetch('tiles/static.bin').then(r => r.ok ? r.arrayBuffer() : null), fetch('tiles/static.json').then(r => r.ok ? r.json() : null)]);
      if (bin && js) { STATIC_BB.arr = new Float32Array(bin); STATIC.off = true; staticJson = js; RNG_REPLAY.marks = js.rng ?? null; }
    } catch {}
  }
  buildScene(world, svgS, svgD);
  // בדיקה: המחולל הכללי בסוף הבנייה – באתר המפורסם (בלי ציור) חייב להיות זהה למה שנאפה (אחרת ההיגיון לא תואם לנוף)
  (globalThis as any).__seedEnd = seedNow();
  if (STATIC.off && staticJson?.seedEnd !== undefined && staticJson.seedEnd !== seedNow()) { console.warn('the world logic differs from the baked scenery'); (window as any).__rngMismatch = true; }
  // בנייה לפי אזורים (scene/chunks.ts): רק האזורים של המבט הראשון מצוירים עכשיו; השאר ברקע אחרי שהמפה מוצגת
  {
    const r = document.getElementById('stage').getBoundingClientRect(), { B, home } = ctx, hw = home.x1 - home.x0, hh = home.y1 - home.y0;
    const c = Math.min(r.width / hw, r.height / hh), v = Math.max(r.width / hw, r.height / hh);
    const k = Math.max(v / c < 1.2 ? v : c, Math.max(r.width / (B.x1 - B.x0), r.height / (B.y1 - B.y0)));
    const cx = (home.x0 + home.x1) / 2, cy = (home.y0 + home.y1) / 2, ex = r.width / 2 / k * 1.15, ey = r.height / 2 / k * 1.15;
    if (!STATIC.off) for (const ch of chunksIn(cx - ex, cy - ey, cx + ex, cy + ey)) {
      tm.bootChunks = (tm.bootChunks || 0) + 1;
      const out = buildChunk(ch);
      if (out) for (const [layer, nodes] of Object.entries(out.layers)) for (const n of nodes) ctx.L[layer].appendChild(n);
    }
  }
  tm.scene = performance.now() - t0;
  // קודם רשימת הציור לציירים (הם מתחילים לעבד אותה ברקע), ורק אחר כך הדמויות
  const items = STATIC.off ? initTilesFromRegions(canvas, staticJson) : initTiles(canvas); tm.tiles = performance.now() - t0 - tm.scene;
  // המצלמה והבקשה הראשונה לאריחים לפני הדמויות: הציירים מציירים את המפה בזמן שהדף בונה את הדמויות
  if (view.gpu) { gpuOverlay(ctx.worldD.c); document.getElementById('dWrap').style.display = 'none'; CULL.layers = [ctx.L.fx.c, ctx.L.air.c]; }
  const { startFollow } = initCamera(followables);
  let q0 = performance.now();
  if (view.gpu) renderNow(); else requestStatic();
  tm.firstRender = performance.now() - q0; q0 = performance.now();
  await new Promise(r => setTimeout(r, 0));   // הפסקה קצרה: ההודעות לציירים יוצאות עכשיו, לא אחרי כל הבנייה
  tm.yield = performance.now() - q0; q0 = performance.now();
  const actors = buildActors(world.actors); tm.buildActors = performance.now() - q0; tm.actors = performance.now() - t0 - tm.scene - tm.tiles;
  (window as any).__boot = tm;

  let instantEl: HTMLElement | null = document.getElementById('instant'), textAt = 0;
  // טקסטים ברזולוציה של הזום הנוכחי: מתעדכנים רק כשהמצלמה עומדת (לא באמצע זום), לכל היותר 3 פעמים בשנייה; גם בהשהיה
  const textRefresh = () => {
    const now = performance.now();
    if (!view.gpu || now - textAt < 330 || now - camMoved.at < 250) { if (view.gpu && !loopState.running && now - camMoved.at < 600) setTimeout(requestStatic, 300); return 0; }
    textAt = now; TEXT_DPR.v = Math.min(view.dpr, 3); return refreshTextResolution(TEXT_DPR.v);
  };
  /* ───────── לולאת האנימציה ───────── */
  let last = 0, T = 0;
  const playBtn = document.getElementById('play');
  function tick(now: number) {
    if (!loopState.running) return;
    // חותמת הזמן של הפריים יכולה להיות מוקדמת מרגע ההפעלה: זמן שלילי מותח את הצעדים, אז מתייחסים אליו כאפס
    const raw = (now - last) / 1000, dt = raw > 0 ? Math.min(.05, raw) : 0; last = Math.max(last, now); T += dt;
    const u0 = performance.now();
    actors.update(dt, T);
    FRAME.add(performance.now() - u0);   // תקציב ביצועים: זמן העדכון של כל מה שזז
    cameraTick(now, dt);
    const r0 = performance.now();
    if (view.gpu) renderNow();   // פריים אחד משותף: אריחים ודמויות
    if (tm.first === undefined) tm.first = performance.now() - r0;   // הפריים הראשון
    // טקסטים ברזולוציה של הזום הנוכחי: מתעדכנים רק כשהמצלמה עומדת (לא באמצע זום), לכל היותר 3 פעמים בשנייה
    textRefresh();
    // זמן הטעינה כפי שמרגישים אותו: מתחילת טעינת הדף עד שכל האריחים שעל המסך צוירו (תקציב bootMs)
    if (tm.ready === undefined && tileStats.painted > 0 && tileStats.missing === 0) { tm.ready = performance.now(); setTimeout(warmUp, 300); }
    // התמונה המיידית יורדת כשהמפה החיה מוכנה (הן זהות), או כבר בתנועה הראשונה של המצלמה (אחרת התמונה הייתה נשארת במקום)
    if (instantEl && (tm.ready !== undefined || camMoved.at)) { instantEl.remove(); instantEl = null; }
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
  onStaticFrame(() => { if (!loopState.running) { actors.update(0, T); if (textRefresh()) requestStatic(); } drawGrid(); });
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

  /* שאר העולם נבנה ברקע, אזור אחרי אזור, הקרוב למבט קודם (כל צעד קצר, כדי שהדף יישאר חלק).
     כשמתקרבים בזום לאזור – קודם הפרטים הקטנים שלו (שרכים, פטריות). window.__built: כל האזורים נבנו */
  let builtResolve: () => void = () => {};
  const built = new Promise<void>(r => { builtResolve = r; });
  (window as any).__built = false;
  const chunkStep = () => {
    if (STATIC.off) { (window as any).__built = true; builtResolve(); return; }   // הכול מוכן מראש
    // בזמן זום או גרירה לא בונים (בנייה של אזור לוקחת כמה עשרות אלפיות שנייה, והפריים היה מתעכב – קפיצה במסך)
    if (performance.now() - camMoved.at < 350) { setTimeout(chunkStep, 120); return; }
    const { cam, vw, vh } = view, x0 = -cam.x / cam.k, y0 = -cam.y / cam.k, x1 = (vw - cam.x) / cam.k, y1 = (vh - cam.y) / cam.k;
    if (cam.k * Math.min(view.dpr, 2) >= .5)
      for (const c of chunksIn(x0, y0, x1, y1)) { const out = buildDetail(c); if (out) { addChunkItems(out.layers, out.rect); setTimeout(chunkStep, 0); return; } }
    const c = nextChunk((x0 + x1) / 2, (y0 + y1) / 2);
    if (c) { const out = buildChunk(c); if (out) addChunkItems(out.layers, out.rect, pendingCount() === 0); setTimeout(chunkStep, 0); return; }
    if (!(window as any).__built) { (window as any).__built = true; flushCoarseTiles(); builtResolve(); }
    setTimeout(chunkStep, 250);   // מכאן רק פרטים, כשמתקרבים
  };
  setTimeout(chunkStep, 200);
  /** לבדיקות: כל העולם, כולל כל הפרטים */
  const buildEverything = async () => { await built; for (const c of allChunks()) { const out = buildDetail(c); if (out) addChunkItems(out.layers, out.rect); } flushCoarseTiles(); };
  // שרת הבנייה (tools/site.mjs, ?bake=tiles): העולם כולו, ואז ציור של כל אריח מוכן מראש
  // (העולם עוצר בזמן האפייה: רק ציור האריחים רץ, בלי דמויות ואנימציה שמתחרות עליו)
  if (location.search.includes('bake=tiles')) (window as any).__tileBake = { ready: buildEverything().then(() => setRunning(false)), bakeTile, tileGrid, bakeRegions, bakeStatic, pals: world.palettes.map((p: any) => p.name), meta: { B: world.bounds, home: world.home, def: world.palette } };

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
    let issueText = '';
    // זמן הטעינה האמיתי במכשיר: מתחילת טעינת הדף עד שכל האריחים שעל המסך צוירו (שלב 0 במשימה 30)
    // pic: התמונה המיידית מוצגת; live: המפה החיה צוירה כולה
    const pic = () => (window as any).__instantAt ? ` · pic ${((window as any).__instantAt / 1000).toFixed(1)}s` : '';
    const load = () => pic() + (tm.ready !== undefined ? ` · live ${(tm.ready / 1000).toFixed(1)}s` : ' · loading…');
    const upd = (t: number) => { n++; if (t - t0 > 1000) { d.textContent = `${tileStats.mode || '…'} · ${n} fps${load()}${issueText}`; n = 0; t0 = t; } requestAnimationFrame(upd); };
    requestAnimationFrame(upd);
    // בדיקת העולם (נטענת רק כאן, אז למבקרים רגילים היא לא עולה כלום): מספר ההפרות בתג, ולחיצה פותחת רשימה
    // בדיקת העולם רצה על העולם כולו: מחכים שכל האזורים (וכל הפרטים) ייבנו
    Promise.all([import('./world/check'), buildEverything()]).then(([{ runChecks }]) => {
      const run = () => runChecks();
      (window as any).__check = run;
      setTimeout(() => {
        const list = run();
        issueText = ` · ${list.length} issue${list.length === 1 ? '' : 's'}`;
        d.style.cursor = 'pointer';
        d.onclick = () => {
          let panel = document.getElementById('issues');
          if (panel) { panel.remove(); return; }
          panel = document.createElement('div'); panel.id = 'issues';
          panel.style.cssText = 'position:fixed;top:36px;right:8px;max-width:min(420px,calc(100vw - 32px));max-height:60vh;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:8px;font-size:12px;z-index:9';
          panel.innerHTML = list.length ? '' : '<div style="padding:8px">No issues</div>';
          for (const it of list) {
            const row = document.createElement('div');
            row.style.cssText = 'padding:6px 8px;border-bottom:1px solid var(--line);cursor:pointer';
            row.textContent = `${it.rule}: ${it.msg} (${it.x}, ${it.y})`;
            row.onclick = () => animateTo(view.fitK * 6, it.x, it.y, 900);
            panel.appendChild(row);
          }
          document.body.appendChild(panel);
        };
      }, 1500);
    });
  }

  // דף דוגמאות לאישור הבעלים לפני שמפזרים בעולם: ?sample=animals או ?sample=trains
  const sample = new URLSearchParams(location.search).get('sample');
  if (sample) import('./actors/samples').then(m => m.showSample(sample));
  applySharedNames();   // השמות ששונו מהדפדפן (names.json המשותף)

  // לבדיקות אוטומטיות
  (window as any).__places = places;   // לבדיקות: כל היעדים
  (window as any).__walk = walkMap;     // לבדיקות: מפת המעבר
  (window as any).__trees = TREES;      // לבדיקות: הבסיס והצמרת של כל עץ ביער
  (window as any).__ctx = ctx;           // לבדיקות: השכבות (כמה דברים יש בשכבה הדינמית)
  (window as any).__geo = geo;          // לבדיקות: חיבורי שבילים וגשרים
  (window as any).__trails = ctx.world.trails;   // לבדיקות: השבילים אחרי כל הכללים
  (window as any).__world = ctx.world;   // לבדיקות: כל העולם (כולל _bb: המלבן שכל אובייקט צייר)
  (window as any).__routeTo = routeTo;
  (window as any).__navParts = components;
  (window as any).__compOf = compOf;
  (window as any).__relocated = relocated;   // לבדיקות: חפצים שהוזזו בגלל כלל המיקום
  (window as any).__village = { cam: view.cam, walkers: actors.walkers, followables, zoomAt, animateTo, startFollow, setRunning, fitK: () => view.fitK, items, tileStats, applyPalette, vstats };
}
boot();
