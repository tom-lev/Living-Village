/* מצלמה: זום וגרירה, צביטה, אנימציית מעבר ומעקב אחרי דמות.
   השכבה הסטטית מורכבת מאריחים (זול בכל פריים). השכבה הדינמית מוזזת ב-CSS בזמן מחווה,
   ומצוירת מחדש וחדה כשהאצבע עוזבת. */
import { clamp } from '../core/util';
import { ctx } from '../world/context';
import { requestStatic, resizeCanvas } from '../render/tiles';
import { view } from './view';

const { cam } = view;
let stage: HTMLElement, dWrap: HTMLElement, zoomLbl: HTMLElement, followEl: HTMLElement;
let M = 0, dcam = { k: 1, x: 0, y: 0 };
let gesturing = false, gestureMoved = false, wheelTimer: any = 0;
export let anim: ((now: number) => void) | null = null;
export let following: any = null;
export const loopState = { running: false };
const ptrs = new Map<number, number[]>();
let down: any = null, pinch: any = null;

function measure() {
  const r = stage.getBoundingClientRect(), { B, home } = ctx;
  view.vw = r.width; view.vh = r.height;
  const { vw, vh } = view;
  // בטלפון לאורך הכפר ממלא את המסך (כיסוי); במסך רחב רואים את כולו
  const fit = (w: number, h: number) => { const c = Math.min(vw / w, vh / h), v = Math.max(vw / w, vh / h); return v / c < 1.2 ? v : c; };
  view.fitK = fit(home.x1 - home.x0, home.y1 - home.y0);
  view.minK = Math.min(view.fitK, Math.max(vw / (B.x1 - B.x0), vh / (B.y1 - B.y0)));   // הכי רחוק: העולם ממלא את המסך
  // השכבה הדינמית גדולה מהמסך בשוליים M, כדי שבזמן גרירה לא ייחשפו חורים
  M = Math.round(Math.max(vw, vh) * .3);
  const svgD = ctx.svgD;
  view.dpr = Math.min(devicePixelRatio || 1, 3);
  if (view.gpu) { resizeCanvas(); return; }
  svgD.setAttribute('width', String(vw + 2 * M)); svgD.setAttribute('height', String(vh + 2 * M));
  svgD.style.left = -M + 'px'; svgD.style.top = -M + 'px';
  view.dpr = Math.min(devicePixelRatio || 1, 3);
  resizeCanvas();
}
const camMatrix = (c: typeof cam) => `matrix(${c.k} 0 0 ${c.k} ${(c.x + M).toFixed(2)} ${(c.y + M).toFixed(2)})`;
function commitD() {
  if (view.gpu) { ctx.L.clouds.setAttribute('opacity', clamp((4 - cam.k / view.fitK) / 2.5, 0, 1).toFixed(2)); return; }
  dcam = { ...cam };
  ctx.worldD.setAttribute('transform', camMatrix(cam));
  dWrap.style.transform = '';
  ctx.L.clouds.setAttribute('opacity', clamp((4 - cam.k / view.fitK) / 2.5, 0, 1).toFixed(2));   // בזום עמוק העננים מתפוגגים
}
/** מזיז את השכבה הדינמית ב-CSS בלבד. false אם השוליים כבר לא מכסים את המסך */
function cssMove(wrap: HTMLElement, base: typeof cam) {
  const { vw, vh } = view, s = cam.k / base.k, tx = cam.x - s * base.x, ty = cam.y - s * base.y;
  if (tx - s * M > 0 || ty - s * M > 0 || tx + s * (vw + M) < vw || ty + s * (vh + M) < vh) return false;
  wrap.style.transform = `matrix(${s.toFixed(5)},0,0,${s.toFixed(5)},${tx.toFixed(2)},${ty.toFixed(2)})`;
  return true;
}
function clampCam() {
  const { B } = ctx, { vw, vh, minK, fitK } = view;
  cam.k = clamp(cam.k, minK, fitK * 24);
  const bw = (B.x1 - B.x0) * cam.k, bh = (B.y1 - B.y0) * cam.k;
  cam.x = bw <= vw ? vw / 2 - (B.x0 + B.x1) / 2 * cam.k : clamp(cam.x, vw - B.x1 * cam.k, -B.x0 * cam.k);
  cam.y = bh <= vh ? vh / 2 - (B.y0 + B.y1) / 2 * cam.k : clamp(cam.y, vh - B.y1 * cam.k, -B.y0 * cam.k);
}
export function applyCam() {
  clampCam();
  if (gesturing && !view.gpu) { gestureMoved = true; if (!cssMove(dWrap, dcam)) commitD(); }
  else commitD();
  requestStatic();
  zoomLbl.textContent = '×' + (cam.k / view.fitK).toFixed(1);
}
function beginGesture() { if (!gesturing) { gesturing = true; gestureMoved = false; } }
function endGesture() {
  if (!gesturing || ptrs.size || anim || wheelTimer) return;
  gesturing = false;
  if (gestureMoved) { requestStatic(); commitD(); }
}
export function zoomAt(sx: number, sy: number, f: number) {
  const nk = clamp(cam.k * f, view.minK, view.fitK * 24), wx = (sx - cam.x) / cam.k, wy = (sy - cam.y) / cam.k;
  cam.k = nk; cam.x = sx - wx * nk; cam.y = sy - wy * nk; applyCam();
}
/** מעבר חלק: (wx, wy) בעולם יהיו במרכז המסך */
export function animateTo(k: number, wx: number, wy: number, ms = 420) {
  beginGesture();
  const { vw, vh } = view, s = { ...cam }, e = { k, x: vw / 2 - wx * k, y: vh / 2 - wy * k }, t0 = performance.now();
  anim = (now: number) => {
    const u = Math.min(1, (now - t0) / ms), q = u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    cam.k = s.k * Math.pow(e.k / s.k, q);   // אינטרפולציה לוגריתמית בזום
    const cx = (vw / 2 - s.x) / s.k + ((vw / 2 - e.x) / e.k - (vw / 2 - s.x) / s.k) * q;
    const cy = (vh / 2 - s.y) / s.k + ((vh / 2 - e.y) / e.k - (vh / 2 - s.y) / s.k) * q;
    cam.x = vw / 2 - cx * cam.k; cam.y = vh / 2 - cy * cam.k; applyCam();
    if (u >= 1) { anim = null; endGesture(); }
  };
  if (!loopState.running) requestAnimationFrame(function step(n) { if (anim) { anim(n); requestAnimationFrame(step); } });
}
/** נקרא מלולאת האנימציה: אנימציית מעבר, או מעקב חלק אחרי דמות */
export function cameraTick(now: number, dt: number) {
  if (anim) anim(now);
  else if (following) {
    const { vw, vh } = view, k = 1 - Math.exp(-dt * 4), tx = vw / 2 - following.x * cam.k, ty = vh / 2 - (following.y - 15) * cam.k;
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; applyCam();
  }
}
const center = () => [(view.vw / 2 - cam.x) / cam.k, (view.vh / 2 - cam.y) / cam.k];
function goHome() { const { home } = ctx; measure(); animateTo(view.fitK, (home.x0 + home.x1) / 2, (home.y0 + home.y1) / 2); }

/** בכרטיס הגרפי אין אלמנטים ללחוץ עליהם: מחפשים דמות לפי המיקום (הרגליים ב-x,y, הגוף מעליהן) */
let followList: any[] = [];
function pick(sx: number, sy: number) {
  const r = stage.getBoundingClientRect(), wx = (sx - r.left - cam.x) / cam.k, wy = (sy - r.top - cam.y) / cam.k;
  const slack = 8 / cam.k;   // לפחות 8 פיקסלים של מסך, כדי שגם דמות קטנה תהיה לחיצה
  let best = null, bd = 1e9;
  followList.forEach((f, i) => {
    const h = f.look?.h || 18, dx = Math.abs(wx - f.x), top = f.y - h * 1.15 - slack, bot = f.y + 4 + slack;
    if (dx > h * .45 + slack || wy < top || wy > bot) return;
    const d = dx + Math.abs(wy - (f.y - h / 2)) * .5; if (d < bd) { bd = d; best = i; }
  });
  return best;
}

export function initCamera(followables: any[]) {
  followList = followables;
  stage = document.getElementById('stage'); dWrap = document.getElementById('dWrap');
  zoomLbl = document.getElementById('zoomLbl'); followEl = document.getElementById('follow');
  const startFollow = (f: any) => {
    following = f;
    document.getElementById('followName').textContent = 'עוקבים אחרי ' + f.name;
    followEl.classList.add('on');
    if (cam.k < view.fitK * 4) animateTo(view.fitK * 5, f.x, f.y - 15, 650);
  };
  const stopFollow = () => { following = null; followEl.classList.remove('on'); };

  stage.addEventListener('wheel', e => {
    e.preventDefault(); anim = null; beginGesture();
    const r = stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? .012 : .0018)));
    clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { wheelTimer = 0; endGesture(); }, 180);
  }, { passive: false });
  stage.addEventListener('pointerdown', e => {
    stage.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) {
      const f = view.gpu ? null : (e.target as Element).closest('[data-f]') as any;
      down = { x: e.clientX, y: e.clientY, f: f ? +f.dataset.f : view.gpu ? pick(e.clientX, e.clientY) : null, moved: false };
    }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), c: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; if (down) down.moved = true; }
    anim = null; stage.classList.add('drag'); beginGesture();
  });
  stage.addEventListener('pointermove', e => {
    if (!ptrs.has(e.pointerId)) return;
    const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const r = stage.getBoundingClientRect();
    if (ptrs.size === 1) {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
      if (down && down.moved) { cam.x += e.clientX - prev[0]; cam.y += e.clientY - prev[1]; if (following) stopFollow(); applyCam(); }
    } else if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      cam.x += c[0] - pinch.c[0]; cam.y += c[1] - pinch.c[1];
      zoomAt(c[0] - r.left, c[1] - r.top, d / pinch.d);
      pinch = { d, c };
    }
  });
  const endPtr = (e: PointerEvent) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0) {
      stage.classList.remove('drag');
      if (down && !down.moved && down.f !== null) startFollow(followables[down.f]);
      down = null;
      endGesture();
    }
  };
  stage.addEventListener('pointerup', endPtr);
  stage.addEventListener('pointercancel', endPtr);
  stage.addEventListener('dblclick', e => {
    const r = stage.getBoundingClientRect();
    animateTo(Math.min(cam.k * 2, view.fitK * 24), (e.clientX - r.left - cam.x) / cam.k, (e.clientY - r.top - cam.y) / cam.k);
  });
  document.getElementById('unfollow').onclick = stopFollow;
  document.getElementById('zin').onclick = () => { const c = center(); animateTo(Math.min(cam.k * 1.8, view.fitK * 24), c[0], c[1], 300); };
  document.getElementById('zout').onclick = () => { const c = center(); animateTo(Math.max(cam.k / 1.8, view.minK), c[0], c[1], 300); };
  document.getElementById('zfit').onclick = () => { stopFollow(); goHome(); };
  addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') document.getElementById('zin').click();
    if (e.key === '-') document.getElementById('zout').click();
    if (e.key === '0') document.getElementById('zfit').click();
  });
  addEventListener('resize', () => {
    const c = center(), z = cam.k / view.fitK; measure();
    cam.k = view.fitK * z; cam.x = view.vw / 2 - c[0] * cam.k; cam.y = view.vh / 2 - c[1] * cam.k; applyCam();
  });

  // מתחילים בתצוגת הבית: הכפר ממלא את המסך
  measure();
  const { home } = ctx;
  cam.k = view.fitK; cam.x = view.vw / 2 - (home.x0 + home.x1) / 2 * cam.k; cam.y = view.vh / 2 - (home.y0 + home.y1) / 2 * cam.k;
  applyCam();
  return { startFollow };
}
