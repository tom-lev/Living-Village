/* בקתת עץ מבודדת ביער המערבי (forestCabin): בקתה מפורטת בקרחת יער.
   מבט שלושת-רבעי: חזית עם גמלון וקיר צד שנסוג לאחור. קורות עגולות עם מילוי (טיח) ביניהן וקצות קורות בפינות,
   יסוד אבן, גג רעפי עץ עם טחב, ארובת אבן עם עשן, מרפסת עם גגון, עמודים ומדרגות, דלת קרשים עם צירי ברזל,
   חלון עם אור חם, וילונות, תריסים ואדנית, פנס, קרני צבי, כיסא נדנדה, חבית מי גשם,
   ומסביב: ערימת עצי הסקה, גדם ביקוע עם גרזן, מדורה עם ספסל קורה, ערוגת ירקות, גדמים ושרכים.
   x: מרכז החזית, y: קו הקרקע של הקיר הקדמי. כל הפרטים מאקראיות מקומית (rngAt), לא משנים את שאר העולם. */
import { el, n2, circ, shade, blob, ST } from '../core/util';
import { rngAt } from '../core/rng';
import { ctx, prop, block } from '../world/context';
import { register } from './registry';
import { markRect, SOLID } from '../world/walk';
import { chimneySmoke, roofTexture, spanAt, poly, P2, type Pt } from './house';

const LOG = '#a8693c', CHINK = '#e2d2ae', ROOF = '#6e4b33', STONE = '#c9bea9', WARM = '#ffe6a0';

function forestCabin(o: any) {
  const { x, y } = o, rg = rngAt(x, y, 33), G = ctx.L.groundProps;
  const W = 50, H = 46, GH = 44, D: Pt = [42, -17];   // חצי רוחב החזית, גובה הקירות, גובה הגמלון, וקטור העומק
  const L = (a: Pt, b: Pt) => `M${P2(a)}L${P2(b)}`;

  /* ── הקרקע: קרחת יער, חצר אדמה מהודקת, שרכים, פרחים ── */
  el('path', { d: blob(x + 6, y + 8, 160, 70, 14, .08, 1), fill: '#c9d98f', opacity: .45 }, G);
  el('path', { d: blob(x + 4, y + 12, 92, 30, 12, .1, 3), fill: '#d9c79c', opacity: .7 }, G);
  let tufts = '';
  for (let i = 0; i < 46; i++) {
    const a = rg.rand(0, Math.PI * 2), r = rg.rand(.75, 1.05), tx = x + 6 + Math.cos(a) * 150 * r, ty = y + 8 + Math.sin(a) * 64 * r;
    tufts += `M${n2(tx - 2)},${n2(ty)}l1,-4M${n2(tx)},${n2(ty)}v-5M${n2(tx + 2)},${n2(ty)}l-1,-4`;
  }
  el('path', { d: tufts, stroke: '#6f9a4a', 'stroke-width': .9, 'stroke-linecap': 'round', fill: 'none' }, G);
  let fern = '';
  for (const [fx, fy] of [[x - 132, y + 2], [x + 128, y - 18], [x - 60, y + 66], [x + 150, y + 40], [x - 150, y - 34], [x + 40, y + 74]]) {
    for (let k = -3; k <= 3; k++) {
      const a = -Math.PI / 2 + k * .38, l = 11 - Math.abs(k) * 1.4, ex = fx + Math.cos(a) * l, ey = fy + Math.sin(a) * l * .8;
      fern += `M${n2(fx)},${n2(fy)}Q${n2(fx + Math.cos(a) * l * .4)},${n2(fy + Math.sin(a) * l * .7 - 2)} ${n2(ex)},${n2(ey)}`;
    }
  }
  el('path', { d: fern, stroke: '#4f8a46', 'stroke-width': 1.6, 'stroke-linecap': 'round', fill: 'none' }, G);
  let fl = '';
  for (let i = 0; i < 16; i++) fl += circ(x - 120 + rg.rand(-26, 26), y + 40 + rg.rand(-12, 14), rg.rand(1, 1.6));
  el('path', { d: fl, fill: '#f3f0e6' }, G);
  fl = '';
  for (let i = 0; i < 10; i++) fl += circ(x + 120 + rg.rand(-20, 20), y + 58 + rg.rand(-10, 10), rg.rand(1, 1.5));
  el('path', { d: fl, fill: '#b48ad6' }, G);

  // ערוגת ירקות מוגבהת משמאל לבקתה
  const vx = x - 118, vy = y - 22;
  el('rect', { x: vx - 26, y: vy - 12, width: 52, height: 24, rx: 2, fill: '#8a5a32', ...ST }, G);
  el('rect', { x: vx - 23, y: vy - 9, width: 46, height: 18, fill: '#6b4a2e' }, G);
  let veg = '', veg2 = '';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) (r === 1 ? (veg2 += circ(vx - 19 + c * 7.6, vy - 5 + r * 5.4, 2.1)) : (veg += circ(vx - 19 + c * 7.6, vy - 5 + r * 5.4, 2.3)));
  el('path', { d: veg, fill: '#6fae4f' }, G);
  el('path', { d: veg2, fill: '#e07a3a' }, G);

  // מדורה: טבעת אבנים, גחלים, וספסל קורה
  const fx = x - 84, fy = y + 46;
  let ring = '';
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ring += blob(fx + Math.cos(a) * 11, fy + Math.sin(a) * 6, 2.8, 2, 6, .15, i); }
  el('ellipse', { cx: fx, cy: fy, rx: 9, ry: 4.6, fill: '#4a3f38' }, G);
  el('path', { d: `M${fx - 5},${fy + 1}l9,-3M${fx - 4},${fy - 2}l8,3`, stroke: '#6b4a2e', 'stroke-width': 2, 'stroke-linecap': 'round' }, G);
  el('path', { d: ring, fill: '#bdb3a1', stroke: '#8f8573', 'stroke-width': .5 }, G);
  const seat = prop(fy + 20);
  el('path', { d: `M${fx - 20},${fy + 18}h36`, stroke: '#8a5a32', 'stroke-width': 6, 'stroke-linecap': 'round' }, seat);
  el('path', { d: `M${fx - 20},${fy + 16.4}h36`, stroke: '#b07a4a', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, seat);
  el('path', { d: circ(fx + 19, fy + 18, 3), fill: '#d8a66e', stroke: '#8a5a32', 'stroke-width': .6 }, seat);

  // גדמים בשולי הקרחת
  for (const [sx, sy, sr] of [[x - 150, y + 20, 6], [x + 160, y + 6, 5], [x + 70, y + 72, 4.5]] as number[][]) {
    const s = prop(sy);
    el('path', { d: `M${sx - sr},${sy}v${-sr}a${sr},${sr * .45} 0 0 1 ${2 * sr},0v${sr}a${sr},${sr * .45} 0 0 1 ${-2 * sr},0Z`, fill: '#7a4f2e', ...ST }, s);
    el('ellipse', { cx: sx, cy: sy - sr, rx: sr, ry: sr * .45, fill: '#d8a66e', stroke: '#8a5a32', 'stroke-width': .5 }, s);
    el('path', { d: blob(sx - sr * .5, sy - 1, sr * .6, 1.6, 6, .2, sx), fill: '#7fae5a' }, s);
  }

  // גדם ביקוע עם גרזן ובולי עץ מבוקעים
  const cx0 = x + 96, cy0 = y + 16, cb = prop(cy0);
  el('path', { d: `M${cx0 - 7},${cy0}v-8a7,3 0 0 1 14,0v8a7,3 0 0 1 -14,0Z`, fill: '#7a4f2e', ...ST }, cb);
  el('ellipse', { cx: cx0, cy: cy0 - 8, rx: 7, ry: 3, fill: '#d8a66e', stroke: '#8a5a32', 'stroke-width': .5 }, cb);
  el('path', { d: `M${cx0 - 2},${cy0 - 9}l6,-12`, stroke: '#9a6b3e', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, cb);   // ידית
  el('path', { d: `M${cx0 - 4.4},${cy0 - 10.6}l4.6,2.2l1.2,-3.4l-3.8,-1.8Z`, fill: '#8d939a', stroke: '#5c6268', 'stroke-width': .5 }, cb);   // להב
  el('path', { d: `M${cx0 + 10},${cy0 + 2}l7,-3l2,4l-7,2ZM${cx0 - 16},${cy0 + 3}l6,-1l1,4l-7,0Z`, fill: '#d8a66e', stroke: '#8a5a32', 'stroke-width': .5 }, cb);

  /* ── הבקתה ── */
  const g = prop(y);
  el('ellipse', { cx: x + 22, cy: y + 4, rx: W + 40, ry: 9, fill: 'rgba(40,60,20,.22)' }, g);

  // קיר הצד (נסוג לאחור)
  const s0: Pt = [x + W, y], s1: Pt = [x + W + D[0], y + D[1]], s2: Pt = [x + W + D[0], y - H + D[1]], s3: Pt = [x + W, y - H];
  el('path', { d: poly([s0, s1, s2, s3]), fill: shade(CHINK, -.12), ...ST }, g);
  let slog = '', shl = '';
  for (let yy = y - 3.2; yy > y - H; yy -= 6.4) { slog += L([x + W, yy], [x + W + D[0], yy + D[1]]); shl += L([x + W + 1, yy - 1.6], [x + W + D[0] - 1, yy + D[1] - 1.6]); }
  el('path', { d: slog, stroke: shade(LOG, -.18), 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
  el('path', { d: shl, stroke: shade(LOG, -.02), 'stroke-width': 1, 'stroke-linecap': 'round' }, g);
  // חלון בקיר הצד
  const sw = (t: number, h: number): Pt => [x + W + D[0] * t, y - h + D[1] * t];
  el('path', { d: poly([sw(.32, 34), sw(.68, 34), sw(.68, 18), sw(.32, 18)]), fill: shade(WARM, -.08), stroke: '#5b3a22', 'stroke-width': 1.6 }, g);
  el('path', { d: L(sw(.5, 34), sw(.5, 18)) + L(sw(.32, 26), sw(.68, 26)), stroke: '#5b3a22', 'stroke-width': 1 }, g);
  // ערימת עצי הסקה צמודה לקיר הצד
  let ends = '', rings = '';
  for (let r = 0; r < 3; r++) for (let t = .1 + (r % 2) * .045; t < .9; t += .09) {
    const [px, py] = sw(t, 0), ex = px + 3, ey = py - 3 - r * 5.2, rr = rg.rand(2.3, 2.8);
    ends += circ(ex, ey, rr); rings += circ(ex, ey, rr * .45);
  }
  el('path', { d: ends, fill: '#d8a66e', stroke: '#8a5a32', 'stroke-width': .7 }, g);
  el('path', { d: rings, fill: 'none', stroke: '#b98352', 'stroke-width': .5 }, g);
  // יסוד אבן בקיר הצד
  let sst = '';
  for (let t = .03; t < 1; t += .12) { const [px, py] = sw(t, 0); sst += blob(px, py + 1, 3.4, 2, 6, .15, t * 9); }
  el('path', { d: sst, fill: STONE, stroke: '#9c8f78', 'stroke-width': .5 }, g);

  // הגג: המישור הימני, עם רעפי עץ וטחב
  const ov = 8, eaveR: Pt = [x + W + ov, y - H + 6], ridge: Pt = [x, y - H - GH - 3];
  const RP: Pt[] = [ridge, [ridge[0] + D[0], ridge[1] + D[1]], [eaveR[0] + D[0], eaveR[1] + D[1]], eaveR];
  el('path', { d: poly(RP), fill: ROOF, ...ST }, g);
  roofTexture(g, RP, 'shingles', ROOF, ridge[1] + D[1], eaveR[1]);
  el('path', { d: blob(x + 46, y - H - 6, 9, 3, 7, .2, 2) + blob(x + 70, y - H - 20, 6, 2.4, 7, .2, 4) + blob(x + 28, y - H - 26, 5, 2, 7, .2, 6), fill: '#7d9a52', opacity: .85 }, g);

  // ארובת אבן שבוקעת מהגג
  const chx = x + 34, chTop = y - H - GH - 14, chBot = y - H - 10;
  el('rect', { x: chx - 8, y: chTop, width: 16, height: chBot - chTop, fill: STONE, ...ST }, g);
  let cst = '';
  for (let yy = chTop + 3, row = 0; yy < chBot - 1; yy += 4.4, row++) for (let xx = chx - 5.4 + (row % 2) * 2.7; xx < chx + 5.8; xx += 5.4) cst += blob(xx, yy, 2.4, 1.8, 6, .12, xx + yy);
  el('path', { d: cst, fill: '#d6ccb8', stroke: '#9c8f78', 'stroke-width': .5 }, g);
  el('rect', { x: chx - 10, y: chTop - 3, width: 20, height: 4, rx: 1, fill: '#8f8573' }, g);
  el('path', { d: `M${chx - 9},${chBot}h18`, stroke: '#5c6268', 'stroke-width': 2 }, g);
  chimneySmoke(chx, chTop - 4, 1);

  // החזית: קיר וגמלון. מילוי בהיר, ועליו קורות עגולות
  const F: Pt[] = [[x - W, y], [x - W, y - H], [x, y - H - GH], [x + W, y - H], [x + W, y]];
  el('path', { d: poly(F), fill: CHINK, ...ST }, g);
  let logs = '', hl = '', lo = '';
  for (let yy = y - 3.2; yy > y - H - GH + 4; yy -= 6.4) {
    const s = spanAt(F, yy); if (!s) continue;
    const a = s[0] + 2.4, b = s[1] - 2.4; if (b - a < 4) continue;
    logs += `M${n2(a)},${n2(yy)}H${n2(b)}`; hl += `M${n2(a + 1)},${n2(yy - 1.6)}H${n2(b - 1)}`; lo += `M${n2(a + 1)},${n2(yy + 1.9)}H${n2(b - 1)}`;
  }
  el('path', { d: logs, stroke: LOG, 'stroke-width': 5.2, 'stroke-linecap': 'round' }, g);
  el('path', { d: lo, stroke: shade(LOG, -.22), 'stroke-width': 1.1, 'stroke-linecap': 'round' }, g);
  el('path', { d: hl, stroke: shade(LOG, .2), 'stroke-width': 1, 'stroke-linecap': 'round' }, g);
  // קצות הקורות בפינות (שתי הפינות של החזית)
  let le = '', lr = '';
  for (let yy = y - 3.2; yy > y - H; yy -= 6.4) for (const cx of [x - W - 1.5, x + W + 1.5]) { le += circ(cx, yy, 3.2); lr += circ(cx, yy, 1.3); }
  el('path', { d: le, fill: '#d8a66e', stroke: '#8a5a32', 'stroke-width': .7 }, g);
  el('path', { d: lr, fill: 'none', stroke: '#b98352', 'stroke-width': .5 }, g);

  // חלון קטן בגמלון
  el('rect', { x: x - 6, y: y - H - 24, width: 12, height: 12, fill: WARM, stroke: '#5b3a22', 'stroke-width': 1.6 }, g);
  el('path', { d: `M${x},${y - H - 24}v12M${x - 6},${y - H - 18}h12`, stroke: '#5b3a22', 'stroke-width': 1 }, g);

  // מסגרת הגג הקדמית (קרשי שוליים עבים)
  const barge = `M${n2(x - W - ov)},${n2(y - H + 6)}L${n2(ridge[0])},${n2(ridge[1])}L${n2(eaveR[0])},${n2(eaveR[1])}`;
  el('path', { d: barge, fill: 'none', stroke: shade(ROOF, -.25), 'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
  el('path', { d: barge, fill: 'none', stroke: shade(ROOF, .12), 'stroke-width': 1.4, 'stroke-linejoin': 'round', transform: 'translate(0,-2)' }, g);

  // יסוד אבן בחזית
  let fst = '';
  for (let xx = x - W + 2; xx < x + W; xx += rg.rand(6, 8)) fst += blob(xx + 2, y + .5, rg.rand(3.2, 4), rg.rand(1.8, 2.3), 6, .15, xx);
  el('path', { d: fst, fill: STONE, stroke: '#9c8f78', 'stroke-width': .5 }, g);

  // דלת קרשים
  const dx = x - 16, dw = 19, dh = 37;
  el('rect', { x: dx - dw / 2 - 2, y: y - dh - 2, width: dw + 4, height: dh + 2, fill: '#5b3a22' }, g);
  el('rect', { x: dx - dw / 2, y: y - dh, width: dw, height: dh, fill: '#8a5a32' }, g);
  let pl = '';
  for (let k = 1; k < 4; k++) pl += `M${n2(dx - dw / 2 + k * dw / 4)},${y - dh + 1}v${dh - 1}`;
  pl += `M${n2(dx - dw / 2 + 1)},${y - 9}L${n2(dx + dw / 2 - 1)},${y - dh + 9}`;
  el('path', { d: pl, stroke: '#6b4428', 'stroke-width': .8 }, g);
  el('path', { d: `M${n2(dx - dw / 2)},${y - dh + 7}h11M${n2(dx - dw / 2)},${y - 8}h11`, stroke: '#3b3633', 'stroke-width': 1.8, 'stroke-linecap': 'round' }, g);   // צירים
  el('circle', { cx: dx + dw / 2 - 3.5, cy: y - 18, r: 1.2, fill: '#3b3633' }, g);

  // חלון עם אור חם, וילונות, תריסים ואדנית
  const wx = x + 24, wy = y - 34, ww = 20, wh = 19;
  el('rect', { x: wx - ww / 2 - 7, y: wy, width: 6, height: wh, fill: '#5b8c5a', stroke: '#3f6a3e', 'stroke-width': .7 }, g);
  el('rect', { x: wx + ww / 2 + 1, y: wy, width: 6, height: wh, fill: '#5b8c5a', stroke: '#3f6a3e', 'stroke-width': .7 }, g);
  el('path', { d: `M${wx - ww / 2 - 6},${wy + 3}l4,${wh - 6}M${wx + ww / 2 + 2},${wy + 3}l4,${wh - 6}`, stroke: '#3f6a3e', 'stroke-width': .7 }, g);
  el('rect', { x: wx - ww / 2, y: wy, width: ww, height: wh, fill: WARM, stroke: '#5b3a22', 'stroke-width': 1.8 }, g);
  el('path', { d: `M${wx - ww / 2 + 1},${wy + 1}q4,6 1,${wh - 2}h-1ZM${wx + ww / 2 - 1},${wy + 1}q-4,6 -1,${wh - 2}h1Z`, fill: '#c0504d', opacity: .85 }, g);
  el('path', { d: `M${wx},${wy}v${wh}M${wx - ww / 2},${wy + wh / 2}h${ww}`, stroke: '#5b3a22', 'stroke-width': 1.1 }, g);
  el('rect', { x: wx - ww / 2 - 2, y: wy + wh, width: ww + 4, height: 5, fill: '#7a4a2a' }, g);
  let fb = '', fb2 = '';
  for (let k = 0; k < 6; k++) { const c = circ(wx - ww / 2 + 1 + k * 3.6, wy + wh - .5 + (k % 3 === 1 ? -1 : 0), 1.7); if (k % 2) fb2 += c; else fb += c; }
  el('path', { d: circ(wx - 7, wy + wh + .5, 2.2) + circ(wx, wy + wh, 2.4) + circ(wx + 7, wy + wh + .5, 2.2), fill: '#5c9a46' }, g);
  el('path', { d: fb, fill: '#e2574c' }, g);
  el('path', { d: fb2, fill: '#fffaf0' }, g);

  // מרפסת: רצפת קרשים, מדרגות, גגון על עמודים
  el('rect', { x: x - W - 5, y: y - 1, width: 2 * W + 10, height: 9, fill: '#b98352', stroke: '#7a4a2a', 'stroke-width': .8 }, g);
  let deck = '';
  for (let xx = x - W; xx < x + W + 4; xx += 5) deck += `M${xx},${y}v7`;
  el('path', { d: deck, stroke: '#9a6b3e', 'stroke-width': .6 }, g);
  el('rect', { x: dx - 12, y: y + 8, width: 24, height: 4, fill: '#a67446', stroke: '#7a4a2a', 'stroke-width': .7 }, g);
  el('rect', { x: dx - 13, y: y + 12, width: 26, height: 4, fill: '#9a6b3e', stroke: '#7a4a2a', 'stroke-width': .7 }, g);
  const gy0 = y - H + 1;
  const awn: Pt[] = [[x - 40, gy0], [x + 10, gy0], [x + 14, gy0 + 9], [x - 44, gy0 + 9]];
  for (const px of [x - 41, x + 11]) {
    el('path', { d: `M${px},${gy0 + 9}V${y + 6}`, stroke: '#7a4a2a', 'stroke-width': 3.6, 'stroke-linecap': 'round' }, g);
    el('path', { d: `M${px - .8},${gy0 + 10}V${y + 5}`, stroke: '#a8693c', 'stroke-width': 1 }, g);
  }
  el('path', { d: poly(awn), fill: ROOF, ...ST }, g);
  roofTexture(g, awn, 'shingles', ROOF, gy0, gy0 + 9);
  el('path', { d: `M${x - 44},${gy0 + 9}H${x + 14}`, stroke: shade(ROOF, -.25), 'stroke-width': 1.6 }, g);
  // קרני צבי מעל הגגון
  el('path', { d: `M${dx},${gy0 - 4}c-3,-2 -6,-6 -6,-11M${dx - 4},${gy0 - 8}l-4,-2M${dx - 5},${gy0 - 12}l-3,-3M${dx},${gy0 - 4}c3,-2 6,-6 6,-11M${dx + 4},${gy0 - 8}l4,-2M${dx + 5},${gy0 - 12}l3,-3`, fill: 'none', stroke: '#f1e6cc', 'stroke-width': 1.4, 'stroke-linecap': 'round' }, g);
  el('circle', { cx: dx, cy: gy0 - 3.5, r: 2, fill: '#8a5a32' }, g);
  // פנס ליד הדלת, עם הילה רכה
  const lx = x + 2, ly = y - 27;
  el('circle', { cx: lx, cy: ly, r: 9, fill: WARM, opacity: .22 }, g);
  el('path', { d: `M${lx - 2.4},${ly - 4}h4.8l1,7h-6.8Z`, fill: WARM, stroke: '#3b3633', 'stroke-width': 1 }, g);
  el('path', { d: `M${lx - 3.4},${ly - 4}h6.8M${lx},${ly - 4}v-3`, stroke: '#3b3633', 'stroke-width': 1.2 }, g);
  // כיסא נדנדה מתחת לחלון
  const rx0 = x + 28, ry0 = y + 5;
  el('path', { d: `M${rx0 - 8},${ry0}q8,3 16,0M${rx0 - 5},${ry0 - 1}v-8h9v8M${rx0 - 6},${ry0 - 9}l-2,-11M${rx0 - 4},${ry0 - 9}l-2,-11`, fill: 'none', stroke: '#6b4428', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  el('path', { d: `M${rx0 - 5},${ry0 - 10}h9v2h-9Z`, fill: '#c0504d' }, g);
  // חבית מי גשם בפינה השמאלית
  const bx = x - W - 9, by = y + 4;
  el('path', { d: `M${bx - 6},${by}q-1.4,-9 0,-17h12q1.4,8 0,17Z`, fill: '#8a5a32', ...ST }, g);
  el('path', { d: `M${bx - 6.6},${by - 4}h13.2M${bx - 6.6},${by - 13}h13.2`, stroke: '#4a4440', 'stroke-width': 1.2 }, g);
  el('ellipse', { cx: bx, cy: by - 17, rx: 6, ry: 1.8, fill: '#6fa9c4', stroke: '#6b4428', 'stroke-width': .8 }, g);
  el('path', { d: `M${x - W - 2},${y - H + 2}h-6v${H - 18}`, fill: 'none', stroke: '#8d939a', 'stroke-width': 1.6 }, g);   // מרזב

  // השטח: אין עצים בקרחת, הבקתה חוסמת הליכה (המרפסת והחצר פתוחות)
  block(x - 150, y - 120, x + 165, y + 72);
  markRect(x - W - 2, y - 24, x + W + D[0], y - 3, SOLID);
}

register({ forestCabin });
