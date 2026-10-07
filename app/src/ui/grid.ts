/* רשת בלוקים מעל המפה (כפתור #): בלוק = 100 יחידות עולם, בערך הרוחב של שני בתים עם הגינות.
   עמודות ממוספרות מ-1 משמאל, שורות מ-1 מלמעלה, כדי שאפשר יהיה להגיד "יער מעמודה 20 עד 26, שורות 10 עד 14".
   נצבעת על קנבס נפרד מעל המפה, רק כשהמצלמה זזה.
   סימון: לחיצה על משבצת מסמנת אותה (המספרים של השורה והעמודה מודגשים, וכרטיס למעלה מראה אותם);
   לחיצה על משבצת שנייה מסמנת מלבן ביניהן; ✕ בכרטיס מנקה. */
import { ctx } from '../world/context';
import { view } from '../camera/view';

const BLOCK = 100, KEY = 'village-grid';
let on = false, cv: HTMLCanvasElement, g: CanvasRenderingContext2D, last = '';
let selA: number[] | null = null, selB: number[] | null = null, card: HTMLDivElement;

export function initGrid() {
  cv = document.createElement('canvas'); cv.id = 'gridC';
  document.getElementById('stage')!.appendChild(cv);
  g = cv.getContext('2d')!;
  const btn = document.getElementById('grid') as HTMLButtonElement;
  const set = (v: boolean) => {
    on = v; cv.hidden = !v; last = ''; if (!v) { selA = selB = null; showCard(); }
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

/** טווח הסימון: [עמודה ראשונה, אחרונה, שורה ראשונה, אחרונה] (מ-0) */
function selRange() {
  if (!selA) return null;
  const b = selB || selA;
  return [Math.min(selA[0], b[0]), Math.max(selA[0], b[0]), Math.min(selA[1], b[1]), Math.max(selA[1], b[1])];
}
function showCard() {
  const r = selRange();
  if (!r) { card.hidden = true; return; }
  const cols = r[0] === r[1] ? `Column ${r[0] + 1}` : `Columns ${r[0] + 1}–${r[1] + 1}`, rows = r[2] === r[3] ? `Row ${r[2] + 1}` : `Rows ${r[2] + 1}–${r[3] + 1}`;
  const size = r[0] === r[1] && r[2] === r[3] ? '' : ` · ${r[1] - r[0] + 1}×${r[3] - r[2] + 1} blocks`;
  card.innerHTML = `<span>${cols} · ${rows}${size}</span><button aria-label="Clear selection">✕</button>`;
  card.hidden = false;
  (card.querySelector('button') as HTMLButtonElement).onclick = () => { selA = selB = null; showCard(); last = ''; drawGrid(); };
}
/** לחיצה על המפה כשהרשת פתוחה: מסמנים משבצת (או מלבן). מחזיר true אם הלחיצה טופלה */
export function gridTap(sx: number, sy: number) {
  if (!on) return false;
  const { cam } = view, { B } = ctx, i = Math.floor(((sx - cam.x) / cam.k - B.x0) / BLOCK), j = Math.floor(((sy - cam.y) / cam.k - B.y0) / BLOCK);
  if (!selA || selB) { selA = [i, j]; selB = null; }      // סימון חדש
  else if (selA[0] === i && selA[1] === j) selA = null;     // אותה משבצת שוב: מבטלים
  else selB = [i, j];                                       // משבצת שנייה: מלבן
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
  const r = selRange();
  if (r) {
    const x0 = sx(r[0]), x1 = sx(r[1] + 1), y0 = sy(r[2]), y1 = sy(r[3] + 1);
    g.fillStyle = 'rgba(217,112,92,.18)'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = 'rgba(200,80,60,.9)'; g.lineWidth = 2; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // פסים עדינים מהסימון אל המספרים בקצוות, כדי שיהיה קל לראות לאיזו שורה ועמודה הוא שייך
    g.fillStyle = 'rgba(217,112,92,.07)'; g.fillRect(x0, 0, x1 - x0, y0); g.fillRect(x1, y0, vw - x1, y1 - y0);
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
  const hotC = (i: number) => !!r && i >= r[0] && i <= r[1], hotR = (j: number) => !!r && j >= r[2] && j <= r[3];
  for (let i = 0; i < nx; i++) { if ((i + 1) % lab && lab > 1 && !hotC(i)) continue; const x = (sx(i) + sx(i + 1)) / 2; if (x > 10 && x < vw - 10) tag(String(i + 1), x, 14, hotC(i)); }
  for (let j = 0; j < ny; j++) { if ((j + 1) % lab && lab > 1 && !hotR(j)) continue; const y = (sy(j) + sy(j + 1)) / 2; if (y > 30 && y < vh - 50) tag(String(j + 1), vw - 18, y, hotR(j)); }
}
