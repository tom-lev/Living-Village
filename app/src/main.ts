/* נקודת הכניסה: בונה את העולם מ-world.json, מפעיל את מנוע האריחים, את הדמויות ואת המצלמה */
import './styles.css';
import worldJson from './world/world.json';
import type { WorldData } from './world/types';
import { buildScene } from './scene/build';
import { initTiles, tileStats } from './render/tiles';
import { buildActors, followables } from './actors';
import { initCamera, cameraTick, loopState, zoomAt, animateTo } from './camera/camera';
import { view } from './camera/view';

const world = worldJson as unknown as WorldData;
const stage = document.getElementById('stage');
const svgS = document.getElementById('mapS') as unknown as SVGSVGElement;
const svgD = document.getElementById('mapD') as unknown as SVGSVGElement;

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

// פריים ראשון, כדי שגם במצב "פחות תנועה" הדמויות יופיעו
actors.update(.016, 0);
setRunning(!matchMedia('(prefers-reduced-motion: reduce)').matches);

// לבדיקות אוטומטיות
(window as any).__village = { cam: view.cam, walkers: actors.walkers, followables, zoomAt, animateTo, startFollow, setRunning, fitK: () => view.fitK, items, tileStats };
