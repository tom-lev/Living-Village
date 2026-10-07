/* רשת בלוקים מעל המפה (כפתור #): בלוק = 100 יחידות עולם, בערך הרוחב של שני בתים עם הגינות.
   עמודות ממוספרות מ-1 משמאל, שורות מ-1 מלמעלה, כדי שאפשר יהיה להגיד "יער מעמודה 20 עד 26, שורות 10 עד 14".
   נצבעת על קנבס נפרד מעל המפה, רק כשהמצלמה זזה. */
import { ctx } from '../world/context';
import { view } from '../camera/view';

const BLOCK = 100, KEY = 'village-grid';
let on = false, cv: HTMLCanvasElement, g: CanvasRenderingContext2D, last = '';

export function initGrid() {
  cv = document.createElement('canvas'); cv.id = 'gridC';
  document.getElementById('stage')!.appendChild(cv);
  g = cv.getContext('2d')!;
  const btn = document.getElementById('grid') as HTMLButtonElement;
  const set = (v: boolean) => {
    on = v; cv.hidden = !v; last = '';
    btn.setAttribute('aria-pressed', String(v)); btn.classList.toggle('on', v);
    try { localStorage.setItem(KEY, v ? '1' : ''); } catch {}
    drawGrid();
  };
  btn.onclick = () => set(!on);
  let saved = false; try { saved = localStorage.getItem(KEY) === '1'; } catch {}
  set(saved);
}

/** נקרא בכל פריים; מצייר מחדש רק כשהמצלמה או גודל המסך השתנו */
export function drawGrid() {
  if (!on || !cv) return;
  const { cam, vw, vh } = view, dpr = Math.min(devicePixelRatio || 1, 2), key = `${cam.k}|${cam.x}|${cam.y}|${vw}|${vh}`;
  if (key === last) return;
  last = key;
  if (cv.width !== Math.round(vw * dpr) || cv.height !== Math.round(vh * dpr)) { cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, vw, vh);
  const { B } = ctx, px = BLOCK * cam.k, every = px < 14 ? 5 : 1;   // רחוק: רק כל קו חמישי
  const nx = Math.ceil((B.x1 - B.x0) / BLOCK), ny = Math.ceil((B.y1 - B.y0) / BLOCK);
  const sx = (i: number) => (B.x0 + i * BLOCK) * cam.k + cam.x, sy = (j: number) => (B.y0 + j * BLOCK) * cam.k + cam.y;
  for (let i = 0; i <= nx; i += every) {
    const x = Math.round(sx(i)) + .5; if (x < 0 || x > vw) continue;
    g.strokeStyle = i % 5 ? 'rgba(40,40,60,.22)' : 'rgba(40,40,60,.45)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, Math.max(0, sy(0))); g.lineTo(x, Math.min(vh, sy(ny))); g.stroke();
  }
  for (let j = 0; j <= ny; j += every) {
    const y = Math.round(sy(j)) + .5; if (y < 0 || y > vh) continue;
    g.strokeStyle = j % 5 ? 'rgba(40,40,60,.22)' : 'rgba(40,40,60,.45)';
    g.beginPath(); g.moveTo(Math.max(0, sx(0)), y); g.lineTo(Math.min(vw, sx(nx)), y); g.stroke();
  }
  // מספרים: עמודות לאורך הקצה העליון, שורות לאורך הקצה הימני (משמאל יש כפתורים)
  const lab = px >= 22 ? 1 : px >= 5 ? 5 : 10;
  g.font = '600 11px Rubik, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const tag = (t: string, x: number, y: number) => {
    const w = g.measureText(t).width + 8;
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(x - w / 2, y - 8, w, 16, 8); g.fill();
    g.fillStyle = '#3b2f25'; g.fillText(t, x, y + .5);
  };
  for (let i = 0; i < nx; i++) { if ((i + 1) % lab && lab > 1) continue; const x = (sx(i) + sx(i + 1)) / 2; if (x > 10 && x < vw - 10) tag(String(i + 1), x, 14); }
  for (let j = 0; j < ny; j++) { if ((j + 1) % lab && lab > 1) continue; const y = (sy(j) + sy(j + 1)) / 2; if (y > 30 && y < vh - 50) tag(String(j + 1), vw - 18, y); }
}
