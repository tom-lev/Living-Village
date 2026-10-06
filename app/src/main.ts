/* נקודת הכניסה: בונה את העולם מ-world.json, מפעיל את מנוע האריחים, את הדמויות ואת המצלמה */
import './styles.css';
import worldJson from './world/world.json';
import type { WorldData } from './world/types';
import { buildScene } from './scene/build';
import { initTiles, tileStats, repaintTiles } from './render/tiles';
import { setPalette, regrade, grade, currentPalette } from './core/palette';
import { buildActors, followables } from './actors';
import { initCamera, cameraTick, loopState, zoomAt, animateTo } from './camera/camera';
import { view } from './camera/view';

const world = worldJson as unknown as WorldData;
const stage = document.getElementById('stage');
const svgS = document.getElementById('mapS') as unknown as SVGSVGElement;
const svgD = document.getElementById('mapD') as unknown as SVGSVGElement;

// הפלטה שנבחרה בפעם הקודמת (אם יש)
const PAL_KEY = 'village-palette';
try { const p = localStorage.getItem(PAL_KEY); if (world.palettes?.some(x => x.name === p)) world.palette = p; } catch {}
buildScene(world, svgS, svgD);
const actors = buildActors(world.actors);
const items = initTiles(document.getElementById('mapC') as HTMLCanvasElement);
const { startFollow } = initCamera(followables);

/* ───────── לולאת האנימציה ───────── */
let last = 0, T = 0;
const playBtn = document.getElementById('play');
function tick(now: number) {
  if (!loopState.running) return;
  const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; T += dt;
  actors.update(dt, T);
  cameraTick(now, dt);
  requestAnimationFrame(tick);
}
function setRunning(on: boolean) {
  loopState.running = on;
  stage.classList.toggle('paused', !on);
  playBtn.textContent = on ? '❚❚' : '▶';
  playBtn.setAttribute('aria-label', on ? 'עצירה' : 'הפעלה');
  if (on) { last = performance.now(); requestAnimationFrame(tick); }
}
playBtn.onclick = () => setRunning(!loopState.running);

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
  regrade(svgD); repaintTiles();
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
setRunning(!matchMedia('(prefers-reduced-motion: reduce)').matches);

// לבדיקות אוטומטיות
(window as any).__village = { cam: view.cam, walkers: actors.walkers, followables, zoomAt, animateTo, startFollow, setRunning, fitK: () => view.fitK, items, tileStats, applyPalette };
