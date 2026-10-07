/* רשת בלוקים מעל המפה (כפתור #): בלוק = 100 יחידות עולם, בערך הרוחב של שני בתים עם הגינות.
   עמודות ממוספרות מ-1 משמאל, שורות מ-1 מלמעלה, כדי שאפשר יהיה להגיד "יער מעמודה 20 עד 26, שורות 10 עד 14".
   נצבעת על קנבס נפרד מעל המפה, רק כשהמצלמה זזה.
   סימון: כל לחיצה על משבצת מוסיפה או מורידה אותה (כמה שרוצים). המספרים של השורות והעמודות המסומנות
   מודגשים, וכרטיס למעלה מראה כמה משבצות ואיפה, עם כפתור Copy שמעתיק תיאור מסודר לשלוח. ✕ מנקה. */
import { ctx } from '../world/context';
import { view } from '../camera/view';

const BLOCK = 100, KEY = 'village-grid';
let on = false, cv: HTMLCanvasElement, g: CanvasRenderingContext2D, last = '';
const sel = new Set<string>();   // "עמודה,שורה" (מ-0)
let card: HTMLDivElement;

export function initGrid() {
  cv = document.createElement('canvas'); cv.id = 'gridC';
  document.getElementById('stage')!.appendChild(cv);
  g = cv.getContext('2d')!;
  const btn = document.getElementById('grid') as HTMLButtonElement;
  const set = (v: boolean) => {
    on = v; cv.hidden = !v; last = ''; if (!v) { sel.clear(); showCard(); }
    btn.setAttribute('aria-pressed', String(v)); btn.classList.toggle('on', v);
    try { localStorage.setItem(KEY, v ? '1' : ''); } catch {}
    drawGrid();
  };
  btn.onclick = () => set(!on);
  card = document.createElement('div'); card.className = 'gridCard'; card.hidden = true;
  document.body.appendChild(card);
  let saved = false; try { saved = localStorage.getItem(KEY) === '1'; } catch {}
  set(saved);
}

const cellsOf = () => [...sel].map(k => k.split(',').map(Number));
/** תיאור הסימון: כמה משבצות, טווח העמודות והשורות, ולכל שורה אילו עמודות (רצפים מקובצים) */
function describe() {
  const c = cellsOf(); if (!c.length) return '';
  const cols = c.map(x => x[0]), rows = c.map(x => x[1]);
  const byRow = new Map<number, number[]>();
  for (const [i, j] of c) (byRow.get(j) || byRow.set(j, []).get(j))!.push(i);
  const runs = (a: number[]) => { a.sort((p, q) => p - q); const out: string[] = []; let s0 = a[0], p = a[0]; for (const v of [...a.slice(1), NaN]) { if (v === p + 1) { p = v; continue; } out.push(s0 === p ? `${s0 + 1}` : `${s0 + 1}–${p + 1}`); s0 = p = v; } return out.join(', '); };
  const lines = [...byRow].sort((p, q) => p[0] - q[0]).map(([j, is]) => `row ${j + 1}: columns ${runs(is)}`);
  return `Living Village area: ${c.length} block${c.length > 1 ? 's' : ''}, columns ${Math.min(...cols) + 1}–${Math.max(...cols) + 1}, rows ${Math.min(...rows) + 1}–${Math.max(...rows) + 1}.\n${lines.join('\n')}`;
}
function showCard() {
  const c = cellsOf();
  if (!c.length) { card.hidden = true; return; }
  const cols = c.map(x => x[0]), rows = c.map(x => x[1]);
  const span = (a: number[]) => Math.min(...a) === Math.max(...a) ? `${Math.min(...a) + 1}` : `${Math.min(...a) + 1}–${Math.max(...a) + 1}`;
  card.innerHTML = `<span>${c.length} block${c.length > 1 ? 's' : ''} · columns ${span(cols)} · rows ${span(rows)}</span><button data-a="copy" aria-label="Copy the selection">Copy</button><button data-a="clear" aria-label="Clear selection">✕</button>`;
  card.hidden = false;
  (card.querySelector('[data-a=clear]') as HTMLButtonElement).onclick = () => { sel.clear(); showCard(); last = ''; drawGrid(); };
  const cp = card.querySelector('[data-a=copy]') as HTMLButtonElement;
  cp.onclick = () => { const t = describe(); navigator.clipboard?.writeText(t).then(() => { cp.textContent = 'Copied'; setTimeout(() => cp.textContent = 'Copy', 1500); }, () => prompt('Copy this:', t)); };
}
/** לחיצה על המפה כשהרשת פתוחה: מוסיפים או מורידים משבצת. מחזיר true אם הלחיצה טופלה */
export function gridTap(sx: number, sy: number) {
  if (!on) return false;
  const { cam } = view, { B } = ctx, i = Math.floor(((sx - cam.x) / cam.k - B.x0) / BLOCK), j = Math.floor(((sy - cam.y) / cam.k - B.y0) / BLOCK), k = `${i},${j}`;
  if (sel.has(k)) sel.delete(k); else sel.add(k);
  showCard(); last = ''; drawGrid();
  return true;
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
  const cells = cellsOf(), hotCols = new Set(cells.map(c => c[0])), hotRows = new Set(cells.map(c => c[1]));
  for (const [i, j] of cells) {
    const x0 = sx(i), x1 = sx(i + 1), y0 = sy(j), y1 = sy(j + 1);
    g.fillStyle = 'rgba(217,112,92,.22)'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = 'rgba(200,80,60,.9)'; g.lineWidth = 1.5; g.strokeRect(x0 + .75, y0 + .75, x1 - x0 - 1.5, y1 - y0 - 1.5);
  }
  // מספרים: עמודות לאורך הקצה העליון, שורות לאורך הקצה הימני (משמאל יש כפתורים)
  const lab = px >= 22 ? 1 : px >= 5 ? 5 : 10;
  g.font = '600 11px Rubik, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const tag = (t: string, x: number, y: number, hot = false) => {
    g.font = hot ? '700 12px Rubik, system-ui, sans-serif' : '600 11px Rubik, system-ui, sans-serif';
    const w = g.measureText(t).width + 8;
    g.fillStyle = hot ? '#d9705c' : 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(x - w / 2, y - 8, w, 16, 8); g.fill();
    g.fillStyle = hot ? '#ffffff' : '#3b2f25'; g.fillText(t, x, y + .5);
  };
  const hotC = (i: number) => hotCols.has(i), hotR = (j: number) => hotRows.has(j);
  for (let i = 0; i < nx; i++) { if ((i + 1) % lab && lab > 1 && !hotC(i)) continue; const x = (sx(i) + sx(i + 1)) / 2; if (x > 10 && x < vw - 10) tag(String(i + 1), x, 14, hotC(i)); }
  for (let j = 0; j < ny; j++) { if ((j + 1) % lab && lab > 1 && !hotR(j)) continue; const y = (sy(j) + sy(j + 1)) / 2; if (y > 30 && y < vh - 50) tag(String(j + 1), vw - 18, y, hotR(j)); }
}
