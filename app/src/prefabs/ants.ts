/* קן נמלים (antHill): תלולית עפר עם פתח, שביל נמלים דק אל מקור מזון, ושיירת נמלים קטנטנות שהולכות הלוך וחזור.
   kind: 'forest' – תלולית מחטים גבוהה (ביער), 'soil' – מכתש חול קטן (בערבה ובשולי השדות).
   dir (מעלות) ו-len: הכיוון והאורך של השביל (נבחרו כך שהשביל לא עובר על שביל, מים, עץ או מבנה).
   הנמלים נראות רק מקרוב (מזום 7 ומעלה של מבט הבית), ורק כשהן על המסך (fxAt), אז הן לא עולות כלום כשלא רואים אותן.
   התנועה תלויה רק בזמן: הולכות לאט, נעצרות לרגע ונפגשות; בדרך חזרה חלקן נושאות פיסת עלה ירוקה. */
import { el, n2, circ, blob, show } from '../core/util';
import { rngAt } from '../core/rng';
import { ctx, fxAt } from '../world/context';
import { view } from '../camera/view';
import { register } from './registry';

const ANT = '#3a2a20', SPEED = 3.2, SHOW_FROM = 7, FULL_AT = 9;

function antHill(o: any) {
  const { x, y, dir = 0, len = 48, kind = 'soil' } = o, rg = rngAt(x, y, 47), G = ctx.L.groundProps;
  const forest = kind === 'forest', a = dir * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a) * .6, ul = Math.hypot(ux, uy);
  const E = [x, y - (forest ? 6 : 1.5)], F = [x + ux * len, y + uy * len];
  // השביל: קו מתפתל קל בין הפתח למזון (נקודות לפי אורך, לחיפוש מהיר)
  const nx = -uy / ul, ny = ux / ul, seed = rg.rand(0, 6), P: number[][] = [], S: number[] = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, w = Math.sin(u * Math.PI * 2.3 + seed) * 4 * Math.sin(Math.PI * u);
    P.push([E[0] + (F[0] - E[0]) * u + nx * w, E[1] + (F[1] - E[1]) * u + ny * w]);
    S.push(i ? S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) : 0);
  }
  const L = S[40];
  const at = (s: number) => {
    let i = 1; while (i < 40 && S[i] < s) i++;
    const t = (s - S[i - 1]) / (S[i] - S[i - 1] || 1), p = P[i - 1], q = P[i];
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, q[0] - p[0], q[1] - p[1]];
  };

  // שביל דרוך דק על הקרקע (נראה כבר מזום בינוני)
  el('path', { d: 'M' + P.map(p => `${n2(p[0])},${n2(p[1])}`).join('L'), fill: 'none', stroke: forest ? '#a07c55' : '#c9ad7d', 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: .4 }, G);

  // התלולית
  if (forest) {
    el('ellipse', { cx: x + 2, cy: y + .5, rx: 13, ry: 3.6, fill: 'rgba(40,50,20,.22)' }, G);
    el('path', { d: `M${x - 12},${y}C${x - 10},${y - 6} ${x - 5},${y - 8.5} ${x},${y - 8.5}C${x + 5},${y - 8.5} ${x + 10},${y - 6} ${x + 12},${y}Z`, fill: '#8a6340', stroke: '#6b4a2e', 'stroke-width': .6 }, G);
    let nd = '';
    for (let i = 0; i < 34; i++) {
      const px = x + rg.rand(-10, 10), top = y - 8.5 * (1 - ((px - x) / 12) ** 2), py = rg.rand(top + 1, y - .5), r = rg.rand(0, Math.PI);
      nd += `M${n2(px)},${n2(py)}l${n2(Math.cos(r) * 2.2)},${n2(Math.sin(r) * 1.2)}`;
    }
    el('path', { d: nd, stroke: '#c49a62', 'stroke-width': .5, 'stroke-linecap': 'round' }, G);
    el('ellipse', { cx: E[0], cy: E[1] + .4, rx: 1.8, ry: 1, fill: '#2b1f17' }, G);
  } else {
    el('ellipse', { cx: x, cy: y, rx: 8, ry: 3.4, fill: '#c8a873', stroke: '#a88a58', 'stroke-width': .5 }, G);
    el('ellipse', { cx: x, cy: y - .8, rx: 5, ry: 2.2, fill: '#dcc28e' }, G);
    el('ellipse', { cx: E[0], cy: E[1], rx: 1.7, ry: .9, fill: '#3b2b1d' }, G);
    let gr = '';
    for (let i = 0; i < 14; i++) gr += circ(x + rg.rand(-11, 11), y + rg.rand(-3, 4), rg.rand(.3, .55));
    el('path', { d: gr, fill: '#b8955e' }, G);
  }
  // המזון בקצה השביל: עלה שנשר ביער, זרעים או פרורים בערבה ובשדה
  if (forest) {
    const r = rg.rand(0, 360);
    el('path', { d: `M${n2(F[0] - 4)},${n2(F[1])}Q${n2(F[0])},${n2(F[1] - 3.4)} ${n2(F[0] + 4)},${n2(F[1])}Q${n2(F[0])},${n2(F[1] + 3.4)} ${n2(F[0] - 4)},${n2(F[1])}Z`, fill: '#d9873a', stroke: '#a85f24', 'stroke-width': .4, transform: `rotate(${n2(r)} ${n2(F[0])} ${n2(F[1])})` }, G);
    el('path', { d: `M${n2(F[0] - 4)},${n2(F[1])}H${n2(F[0] + 3.6)}`, stroke: '#a85f24', 'stroke-width': .35, transform: `rotate(${n2(r)} ${n2(F[0])} ${n2(F[1])})` }, G);
  } else {
    let sd = '';
    for (let i = 0; i < 9; i++) sd += blob(F[0] + rg.rand(-3, 3), F[1] + rg.rand(-1.6, 1.6), .7, .45, 5, .1, i);
    el('path', { d: sd, fill: '#e6cf8f', stroke: '#b8955e', 'stroke-width': .25 }, G);
  }

  // הנמלים: נתיב אחד לכולן (צורה אחת שנבנית מחדש רק כשרואים אותה מקרוב)
  const g = el('g', null, ctx.L.fx), body = el('path', { fill: ANT }, g), leaf = el('path', { fill: '#7cc05a' }, g);
  const N = Math.max(6, Math.round(L / 5)), wander = 3, ph = rg.rand(0, 100);
  let shown = true, lastA = -1;
  const ant = (px: number, py: number, hx: number, hy: number) => {
    const h = Math.hypot(hx, hy) || 1, cx = hx / h, cy = hy / h * .8;
    return circ(px - cx * .8, py - cy * .8, .55) + circ(px, py, .32) + circ(px + cx * .6, py + cy * .6, .38);
  };
  fxAt((x + F[0]) / 2, (y + F[1]) / 2, len / 2 + 16, t => {
    const z = view.cam.k / view.fitK, alpha = Math.min(1, Math.max(0, (z - SHOW_FROM) / (FULL_AT - SHOW_FROM)));
    if (alpha <= 0) { if (shown) { show(g, false); shown = false; } return; }
    if (!shown) { show(g, true); shown = true; }
    if (Math.abs(alpha - lastA) > .02) { g.setAttribute('opacity', alpha.toFixed(2)); lastA = alpha; }
    let d = '', lv = '';
    const T = t + ph;
    for (let i = 0; i < N; i++) {
      // כל נמלה: הלוך (צד אחד של השביל) וחזור (הצד השני); עצירות קטנות לפי הזמן
      let s = (T * SPEED + i * 2 * L / N + 2.2 * Math.sin(T * .7 + i * 1.3)) % (2 * L);
      const back = s > L; if (back) s = 2 * L - s;
      if (s < 1.6) continue;   // בתוך הקן
      const [px, py, hx, hy] = at(s), side = back ? -.9 : .9, hh = Math.hypot(hx, hy) || 1;
      const qx = px - hy / hh * side, qy = py + hx / hh * side;
      d += back ? ant(qx, qy, -hx, -hy) : ant(qx, qy, hx, hy);
      if (back && i % 2 === 0) lv += circ(qx - hx / hh * 1.05, qy - hy / hh * .85 - .45, .7);
    }
    // כמה נמלים מסתובבות סביב הפתח
    for (let i = 0; i < wander; i++) {
      const an = T * .35 * (i % 2 ? 1 : -1) + i * 2.1 + Math.sin(T * .5 + i) * .8, r = 5 + i * 1.6;
      const px = E[0] + Math.cos(an) * r, py = E[1] + 2 + Math.sin(an) * r * .45;
      d += ant(px, py, -Math.sin(an) * (i % 2 ? 1 : -1), Math.cos(an) * (i % 2 ? 1 : -1));
    }
    body.setAttribute('d', d); leaf.setAttribute('d', lv);
  });
}

register({ antHill });
