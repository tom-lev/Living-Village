/* דמות אדם וקטורית: תנוחות הליכה וישיבה, וציור שמתעדכן בכל פריים */
import { el, n2, P, circ, rrect, shade, wrap1 } from '../core/util';
import { grade, rememberColor } from '../core/palette';
import type { Look } from '../world/types';
import { VNode } from '../render/vnode';

/* פרופורציות (×גובה), כמו בסעיף 3 במדריך */
export const PR = { thigh: .255, shin: .235, torso: .295, foot: .085, ua: .16, fa: .15, gap: .03, A: .13, lift: .075, KF: .6 };

/** מסלול כף הרגל: חצי מחזור על הקרקע בקצב קבוע, חצי מחזור באוויר בקשת */
function footPath(q: number, A: number, lift: number) {
  if (q < .5) return [A - 2 * A * (q / .5), 0, 0];
  const u = (q - .5) / .5;
  return [-A + 2 * A * (1 - Math.cos(Math.PI * u)) / 2, lift * Math.sin(Math.PI * u), Math.sin(Math.PI * u)];
}
/** קינמטיקה הפוכה של שני מקטעים: sgn=1 ברך קדימה, sgn=-1 מרפק אחורה */
function ik(a: number[], b: number[], l1: number, l2: number, sgn: number) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dd = Math.hypot(dx, dy) || 1e-6, d = Math.min(dd, l1 + l2 - 1e-3);
  const ux = dx / dd, uy = dy / dd, m = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - m * m));
  return [a[0] + ux * m + sgn * uy * h, a[1] + uy * m - sgn * ux * h];
}
const rot = (o: number[], th: number, x: number, y: number) => [o[0] + x * Math.cos(th) - y * Math.sin(th), o[1] + x * Math.sin(th) + y * Math.cos(th)];

/** מחזור של שחיית חזה, בשניות */
export const SWIM_PERIOD = 2.2;
export type View = 'side' | 'front' | 'back';
export interface Pose { view: View; h: number; legs: any[]; arms: any[]; torso?: number[][]; head?: number[]; skirt?: number[][] }

/** תנוחת הליכה. אינדקס 0 = רגל ויד קרובות (בצד) או שמאל (מלפנים) */
export function walkPose(look: Look, view: View, ph: number, amp: number, t: number): Pose {
  const h = look.h, A = PR.A * h * amp, lift = PR.lift * h * amp, Lt = PR.thigh * h, Ls = PR.shin * h, gap = PR.gap * h;
  const f = [footPath(wrap1(ph), A, lift), footPath(wrap1(ph + .5), A, lift)];
  const st = f[0][2] === 0 ? f[0] : f[1];
  const hipH = Math.sqrt((.985 * (Lt + Ls)) ** 2 - st[0] ** 2) + gap;
  const sw = f[0][0] / (PR.A * h);                    // נדנוד בין -amp ל-amp
  const breath = Math.sin(t * 1.75) * .008 * h * (1 - amp);
  const out: Pose = { view, h, legs: [], arms: [] };
  const holdA = look.hold;                           // יד קרובה מחזיקה משהו (בלון או רצועה)
  if (view === 'side') {
    const lean = .03 + .06 * amp, hip = [0, -hipH];
    for (let k = 0; k < 2; k++) {
      const ank = [f[k][0], -f[k][1] - gap], knee = ik(hip, ank, Lt, Ls, 1), th = .35 * f[k][2];
      out.legs.push({ hip, knee, ank, heel: rot(ank, th, -.02 * h, gap * .6), toe: rot(ank, th, .075 * h, gap * .6) });
    }
    const sh = [hip[0] + Math.sin(lean) * PR.torso * h, hip[1] - Math.cos(lean) * PR.torso * h + breath];
    out.torso = [hip, sh];
    out.head = [sh[0] + Math.sin(lean) * .12 * h + .01 * h, sh[1] - .115 * h];
    for (let k = 0; k < 2; k++) {
      let a = (k === 0 ? -1 : 1) * .42 * sw;
      if (k === 0 && holdA === 'balloon') a = .95 + .08 * sw;
      if (k === 0 && holdA === 'leash') a = .45 + .1 * sw;
      const elb = [sh[0] + Math.sin(a) * PR.ua * h, sh[1] + Math.cos(a) * PR.ua * h];
      const a2 = a + .14 + Math.max(0, -a) * .55 + (k === 0 && holdA ? .35 : 0);
      out.arms.push({ sh, elb, hand: [elb[0] + Math.sin(a2) * PR.fa * h, elb[1] + Math.cos(a2) * PR.fa * h] });
    }
    if (look.skirt) {
      const kx = [out.legs[0].knee[0], out.legs[1].knee[0]], ky = Math.max(out.legs[0].knee[1], out.legs[1].knee[1]) - .02 * h;
      out.skirt = [[hip[0] - .07 * h, hip[1] - .07 * h], [hip[0] + .08 * h, hip[1] - .07 * h], [Math.max(...kx) + .05 * h, ky], [Math.min(...kx) - .06 * h, ky]];
    }
  } else {
    const sgn = view === 'front' ? 1 : -1, sway = Math.sin(ph * Math.PI * 2) * .012 * h * amp;
    const hip = [sway, -hipH];
    for (let k = 0; k < 2; k++) {
      const lx = (k ? 1 : -1) * .05 * h, ank = [lx * 1.05, f[k][0] * PR.KF * sgn - f[k][1] - gap];
      const hj = [hip[0] + lx * .9, hip[1]], knee = [(hj[0] + ank[0]) / 2 + lx * .12, (hj[1] + ank[1]) / 2];
      out.legs.push({ hip: hj, knee, ank, heel: [ank[0] - .02 * h, ank[1] + gap * .7], toe: [ank[0] + .02 * h, ank[1] + gap * .7] });
    }
    const sh = [sway * .4, hip[1] - PR.torso * h + breath];
    out.torso = [hip, sh];
    out.head = [sh[0], sh[1] - .125 * h];
    for (let k = 0; k < 2; k++) {
      const side = k ? 1 : -1, s0 = [sh[0] + side * .1 * h, sh[1] + .025 * h];
      let a = (k === 1 ? -1 : 1) * .42 * sw;
      const holding = holdA && ((sgn > 0) === (k === 1));   // מלפנים: יד ימין של המסך; מאחור: שמאל
      if (holding && holdA === 'balloon') a = .95;
      if (holding && holdA === 'leash') a = .45;
      const ua = PR.ua * h, fa = PR.fa * h;
      const elb = [s0[0] + side * .015 * h, s0[1] + Math.cos(a) * ua + Math.sin(a) * ua * PR.KF * sgn * .35];
      const a2 = a + .14 + Math.max(0, -a) * .55 + (holding ? .35 : 0);
      out.arms.push({ sh: s0, elb, hand: [elb[0] + side * (.012 + (holding ? .03 : 0)) * h, elb[1] + Math.cos(a2) * fa + Math.sin(a2) * fa * PR.KF * sgn * .35] });
    }
    if (look.skirt) {
      const ky = Math.max(out.legs[0].knee[1], out.legs[1].knee[1]) - .01 * h;
      out.skirt = [[hip[0] - .085 * h, hip[1] - .07 * h], [hip[0] + .085 * h, hip[1] - .07 * h], [hip[0] + .14 * h, ky], [hip[0] - .14 * h, ky]];
    }
  }
  return out;
}

/** תנוחת ישיבה (מבט צד), עם ידיים שמכוונות לנקודה */
export function sitPose(look: Look, seatH: number, hands: number[][], t: number): Pose {
  const h = look.h, gap = PR.gap * h, breath = Math.sin(t * 1.6) * .01 * h;
  const out: Pose = { view: 'side', h, legs: [], arms: [] };
  for (let k = 0; k < 2; k++) {
    const dx = k ? -.035 * h : 0, hip = [dx, -seatH], ank = [.25 * h + dx, -gap], knee = ik(hip, ank, PR.thigh * h, PR.shin * h, 1);
    out.legs.push({ hip, knee, ank, heel: [ank[0] - .02 * h, -gap * .4], toe: [ank[0] + .075 * h, -gap * .4] });
  }
  const lean = .14, hip = [0, -seatH], sh = [Math.sin(lean) * PR.torso * h, -seatH - Math.cos(lean) * PR.torso * h + breath];
  out.torso = [hip, sh];
  out.head = [sh[0] + .03 * h, sh[1] - .115 * h];
  for (let k = 0; k < 2; k++) out.arms.push({ sh, elb: ik(sh, hands[k], PR.ua * h, PR.fa * h, -1), hand: hands[k] });
  if (look.skirt) out.skirt = [[-.07 * h, -seatH - .07 * h], [.08 * h, -seatH - .07 * h], [out.legs[0].knee[0] + .04 * h, out.legs[0].knee[1] - .04 * h], [-.08 * h, -seatH + .02 * h]];
  return out;
}

/** תנוחות של פעילות במקום (מבט מהצד). act: look (עמידה ומבט, לפעמים יד מעל העיניים), work (כפיפה וניכוש),
 *  feed (זריקת אוכל לברווזים/סוסים), play (קפיצות קטנות), swim (רק ראש וידיים שחותרות). ph: היסט אישי, כדי שלא יזוזו יחד */
export function actPose(look: Look, act: string, t: number, ph: number): Pose {
  const h = look.h, gap = PR.gap * h, Lt = PR.thigh * h, Ls = PR.shin * h, T = PR.torso * h;
  const out: Pose = { view: 'side', h, legs: [], arms: [] };
  const breath = Math.sin(t * 1.6 + ph) * .008 * h;
  if (act === 'swim') {
    // שחיית חזה רגועה: רק הראש מעל המים. הוא עולה מעט בכל חתירה ונוטה קדימה בגלישה.
    // הידיים, הגוף והרגליים מתחת למים מצוירים בנפרד, שקופים למחצה (swimOverlay ב-people.ts)
    const q = ((t / SWIM_PERIOD + ph / 6.28) % 1 + 1) % 1, rise = Math.sin(Math.PI * Math.min(1, q / .45)) * .03 * h;
    const sh = [0, -.07 * h];
    out.torso = [[0, 0], sh]; out.head = [.04 * h, -.14 * h - rise];
    for (let k = 0; k < 2; k++) out.arms.push({ sh, elb: sh, hand: sh });
    out.legs = [0, 1].map(() => ({ hip: [0, 0], knee: [0, 0], ank: [0, 0], heel: [0, 0], toe: [.01, 0] }));
    return out;
  }
  let crouch = 0, lean = .04, lift = 0;
  if (act === 'work') { crouch = .23 * h; lean = .9 + .06 * Math.sin(t * 2.2 + ph); }   // כורעים (ברכיים כפופות עמוק) ומתכופפים קדימה: הידיים מגיעות לקרקע בלי להימתח
  if (act === 'play') lift = Math.max(0, Math.sin(t * 4.6 + ph)) * .09 * h;
  const hip = [-.03 * h * lean, -(.985 * (Lt + Ls) - crouch + gap) - lift];
  for (const ax of [.05 * h, -.04 * h]) {
    const ank = [ax, -gap - lift], knee = ik(hip, ank, Lt, Ls, 1);
    out.legs.push({ hip, knee, ank, heel: [ank[0] - .02 * h, ank[1] + gap * .6], toe: [ank[0] + .075 * h, ank[1] + gap * .6] });
  }
  const sh = [hip[0] + Math.sin(lean) * T, hip[1] - Math.cos(lean) * T + breath];
  out.torso = [hip, sh];
  out.head = [sh[0] + Math.sin(lean) * .12 * h + .01 * h, sh[1] - Math.cos(lean) * .115 * h];
  const rest = (dx: number) => [sh[0] + dx, sh[1] + .29 * h];
  let hands: number[][];
  if (act === 'work') {
    // שתי הידיים עוקרות עשבים לסירוגין: אחת יורדת לקרקע לפני כפות הרגליים, השנייה עולה מעט עם העשב
    const u = Math.sin(t * 2.2 + ph), d0 = Math.max(0, u), d1 = Math.max(0, -u);
    hands = [[sh[0] + .1 * h + .02 * h * u, -gap - .05 * h - .07 * h * d1], [sh[0] + .05 * h - .02 * h * u, -gap - .05 * h - .07 * h * d0]];
  } else if (act === 'feed') {
    const toss = Math.max(0, Math.sin(t * .9 + ph)) ** 6;
    hands = [[sh[0] + .17 * h + toss * .14 * h, sh[1] + .14 * h - toss * .2 * h], rest(-.02 * h)];
  } else if (act === 'play') {
    const u = Math.sin(t * 4.6 + ph);
    hands = [[sh[0] + .08 * h, sh[1] - .2 * h - .08 * h * u], [sh[0] - .05 * h, sh[1] - .18 * h + .08 * h * u]];
  } else {
    // מבט: לפעמים יד מעל העיניים, כמו מי שמסתכל רחוק
    const shade = Math.sin(t * .35 + ph) > .55;
    hands = [shade ? [out.head[0] + .07 * h, out.head[1] + .03 * h] : rest(.03 * h), rest(-.02 * h)];
  }
  for (let hd of hands) {
    // יד לא נמתחת מעבר לאורך הזרוע (אחרת הזרוע נראית כמו מקל ישר)
    const L = (PR.ua + PR.fa) * h * .96, dx = hd[0] - sh[0], dy = hd[1] - sh[1], d = Math.hypot(dx, dy);
    if (d > L) hd = [sh[0] + dx * L / d, sh[1] + dy * L / d];
    out.arms.push({ sh, elb: ik(sh, hd, PR.ua * h, PR.fa * h, -1), hand: hd });
  }
  if (look.skirt) {
    const ky = Math.max(out.legs[0].knee[1], out.legs[1].knee[1]) - .02 * h;
    out.skirt = [[hip[0] - .07 * h, hip[1] - .07 * h], [hip[0] + .08 * h, hip[1] - .07 * h], [Math.max(out.legs[0].knee[0], out.legs[1].knee[0]) + .05 * h, ky], [Math.min(out.legs[0].knee[0], out.legs[1].knee[0]) - .06 * h, ky]];
  }
  return out;
}

/* שלד: כל קטע גפה הוא "קפסולה" שנבנית פעם אחת לאורכה, ובכל פריים רק מזיזים ומסובבים אותה.
   בכרטיס הגרפי זה כמעט חינם (מטריצה בלבד); ב-SVG זה transform אחד במקום מסלול חדש */
const L0 = new WeakMap<any, number>();
function place(e: any, x: number, y: number, ang = 0, sx = 1) {
  if (e instanceof VNode) { e.c.position.set(x, y); e.c.rotation = ang; e.c.scale.set(sx, 1); }
  else e.setAttribute('transform', `translate(${n2(x)},${n2(y)}) rotate(${(ang * 180 / Math.PI).toFixed(2)}) scale(${sx.toFixed(4)},1)`);
}
function bone(e: any, a: number[], b: number[]) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1e-3;
  let l0 = L0.get(e);
  if (!l0) { l0 = len; L0.set(e, len); e.setAttribute('d', `M0,0L${n2(len)},0`); }
  place(e, a[0], a[1], Math.atan2(dy, dx), len / l0);
}

/** דמות: שלד של קפסולות וראש. הכול וקטורי, אז היא חדה בכל זום */
export class Figure {
  [k: string]: any;
  constructor(parent: any, look: Look) {
    this.look = look; const h = look.h;
    this.g = el('g', { class: 'who' }, parent);
    this.shadow = el('ellipse', { rx: n2(h * .2), ry: n2(h * .055), fill: 'rgba(40,70,20,.25)' }, this.g);
    this.body = el('g', null, this.g);
    const S = (c: string, w: number) => el('path', { fill: 'none', stroke: c, 'stroke-width': n2(w * h), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.body);
    const dk = (c: string) => shade(c, -.16);
    // סדר הציור: יד ורגל רחוקות, רגל קרובה, חצאית, גוף, יד קרובה, ראש
    this.armBu = S(dk(look.shirt), .062); this.armBf1 = S(dk(look.skin), .052); this.armBf2 = S(dk(look.skin), .052);
    this.legB1 = S(dk(look.pants), .074); this.legB2 = S(dk(look.pants), .074); this.shoeB = S('#3b2f2a', .052);
    this.legA1 = S(look.pants, .074); this.legA2 = S(look.pants, .074); this.shoeA = S('#4a3b33', .052);
    this.skirt = look.skirt ? el('path', { fill: look.skirt, stroke: look.skirt, 'stroke-width': n2(.035 * h), 'stroke-linejoin': 'round' }, this.body) : null;
    // פלג גוף: צורה מלאה (לא קפסולה), כדי שלא ייראה ככדור במותניים. מתחתיה מותניים בצבע המכנסיים שמחברות לרגליים
    this.hips = el('path', { fill: look.skirt || look.pants }, this.body);
    this.torso = el('path', { fill: look.shirt }, this.body);
    this.armAu = S(look.shirt, .062); this.armAf1 = S(look.skin, .052); this.armAf2 = S(look.skin, .052);
    this.hairB = el('path', { fill: look.hair }, this.body);
    this.head = el('circle', { r: n2(look.headR * h), fill: look.skin }, this.body);
    this.face = el('path', { fill: '#3b2f2a' }, this.body);
    this.hairF = el('path', { fill: look.hat || look.hair }, this.body);
    el('rect', { x: n2(-h * .4), y: n2(-h * 1.2), width: n2(h * .8), height: n2(h * 1.32), fill: 'transparent' }, this.g);   // אזור לחיצה
    this.view = null;
  }
  /** צורת פלג הגוף והמותניים, לאורך ציר x מהירך (0) לכתף (T0). מבט מהצד צר יותר ממבט מלפנים/מאחור */
  private bodyShape(view: View) {
    const h = this.look.h, T = PR.torso * h, w = (view === 'side' ? .15 : .19) * h, ws = w * 1.05, r = w * .45;
    // חולצה: מתחילה קצת מעל הירך, כתפיים מעוגלות למעלה, תחתית ישרה כמעט
    const b = T * .16;
    this.torso.setAttribute('d', `M${n2(b)},${n2(-w / 2)}L${n2(T - r)},${n2(-ws / 2)}Q${n2(T + r * .25)},${n2(-ws / 2)} ${n2(T + r * .25)},0Q${n2(T + r * .25)},${n2(ws / 2)} ${n2(T - r)},${n2(ws / 2)}L${n2(b)},${n2(w / 2)}Q${n2(b - 1)},0 ${n2(b)},${n2(-w / 2)}Z`);
    // מותניים: מעט מתחת לירך (מכסות את ראש הרגליים) עד מתחת לחולצה
    const hw = w * .96;
    this.hips.setAttribute('d', `M${n2(-T * .07)},${n2(-hw / 2)}L${n2(b + 2)},${n2(-hw / 2)}L${n2(b + 2)},${n2(hw / 2)}L${n2(-T * .07)},${n2(hw / 2)}Q${n2(-T * .12)},0 ${n2(-T * .07)},${n2(-hw / 2)}Z`);
  }
  /** שיער, כובע ופנים סביב מרכז הראש (0,0), לפי כיוון המבט. נבנה רק כשהכיוון משתנה */
  private headShapes(view: View) {
    const { look } = this, r = look.headR * look.h, hs = look.hairStyle, cx = 0, cy = 0;
    let hb = '', hf = '', face = '';
    if (view === 'side') {
      hb = look.hat ? circ(cx - .62 * r, cy + .12 * r, .48 * r) : circ(cx - .14 * r, cy - .14 * r, 1.07 * r);
      if (hs === 'long') hb += rrect(cx - 1.08 * r, cy - .3 * r, .95 * r, 1.65 * r, .45 * r);
      if (hs === 'bun') hb += circ(cx - .95 * r, cy - .6 * r, .42 * r);
      if (hs === 'pony') hb += rrect(cx - 1.55 * r, cy - .55 * r, .7 * r, 1.2 * r, .35 * r);
      face = circ(cx + .5 * r, cy - .02 * r, .1 * r);
      if (look.hat) hf = `M${n2(cx - 1.06 * r)},${n2(cy - .12 * r)}A${n2(1.06 * r)},${n2(1.06 * r)} 0 0 1 ${n2(cx + 1.06 * r)},${n2(cy - .12 * r)}Z` + rrect(cx + .2 * r, cy - .3 * r, 1.25 * r, .26 * r, .12 * r);
    } else if (view === 'front') {
      hb = look.hat ? circ(cx - .78 * r, cy + .05 * r, .32 * r) + circ(cx + .78 * r, cy + .05 * r, .32 * r) : circ(cx, cy - .16 * r, 1.07 * r);
      if (hs === 'long') hb += rrect(cx - 1.12 * r, cy - .3 * r, 2.24 * r, 1.65 * r, .5 * r);
      if (hs === 'bun') hb += circ(cx, cy - 1.15 * r, .42 * r);
      if (hs === 'pony') hb += circ(cx + 1.05 * r, cy - .3 * r, .38 * r);
      face = circ(cx - .36 * r, cy + .05 * r, .1 * r) + circ(cx + .36 * r, cy + .05 * r, .1 * r);
      if (look.hat) hf = `M${n2(cx - 1.06 * r)},${n2(cy - .2 * r)}A${n2(1.06 * r)},${n2(1.06 * r)} 0 0 1 ${n2(cx + 1.06 * r)},${n2(cy - .2 * r)}Z` + rrect(cx - 1.3 * r, cy - .3 * r, 2.6 * r, .24 * r, .12 * r);
    } else {
      if (look.hat) hf = `M${n2(cx - 1.06 * r)},${n2(cy - .2 * r)}A${n2(1.06 * r)},${n2(1.06 * r)} 0 0 1 ${n2(cx + 1.06 * r)},${n2(cy - .2 * r)}Z`;
      else {
        if (hs === 'long') hf += rrect(cx - 1.08 * r, cy - .2 * r, 2.16 * r, 1.6 * r, .5 * r);
        if (hs === 'bun') hf += circ(cx, cy - 1.1 * r, .42 * r);
        if (hs === 'pony') hf += rrect(cx - .3 * r, cy - .1 * r, .6 * r, 1.4 * r, .3 * r);
      }
    }
    this.hairB.setAttribute('d', hb); this.hairF.setAttribute('d', hf); this.face.setAttribute('d', face);
  }
  /** מצב שחייה: רואים רק ראש וידיים */
  setSwim(on: boolean) {
    if (this.swim === on) return; this.swim = on;
    for (const e of [this.shadow, this.legA1, this.legA2, this.legB1, this.legB2, this.shoeA, this.shoeB, this.hips, this.torso, this.skirt, this.armAu, this.armAf1, this.armAf2, this.armBu, this.armBf1, this.armBf2]) if (e) e.setAttribute('display', on ? 'none' : 'inline');
  }
  render(p: Pose, x: number, y: number, flip: number, opacity?: number) {
    const { look } = this, h = look.h;
    place(this.g, x, y);
    if (this.body instanceof VNode) { this.body.c.scale.set(p.view === 'side' ? flip : 1, 1); }
    else this.body.setAttribute('transform', p.view === 'side' ? `scale(${flip.toFixed(3)},1)` : '');
    if (opacity !== undefined) this.g.setAttribute('opacity', opacity.toFixed(2));
    if (p.view !== this.view) {
      this.view = p.view;
      this.bodyShape(p.view);
      const hc = p.view === 'back' && !look.hat ? look.hair : look.skin;
      rememberColor(this.head, 'fill', hc); this.head.setAttribute('fill', grade(hc));
      this.headShapes(p.view);
    }
    // בצד: 0 קרוב (A), 1 רחוק (B). מלפנים/מאחור: 0 שמאל (B), 1 ימין (A)
    const [iA, iB] = p.view === 'side' ? [0, 1] : [1, 0];
    const leg = (t: any, s: any, sh: any, L: any) => { bone(t, L.hip, L.knee); bone(s, L.knee, L.ank); bone(sh, L.heel, L.toe); };
    leg(this.legA1, this.legA2, this.shoeA, p.legs[iA]); leg(this.legB1, this.legB2, this.shoeB, p.legs[iB]);
    const arm = (u: any, f1: any, f2: any, A: any) => {
      const mid = [A.sh[0] + (A.elb[0] - A.sh[0]) * .7, A.sh[1] + (A.elb[1] - A.sh[1]) * .7];
      bone(u, A.sh, mid); bone(f1, mid, A.elb); bone(f2, A.elb, A.hand);
    };
    arm(this.armAu, this.armAf1, this.armAf2, p.arms[iA]); arm(this.armBu, this.armBf1, this.armBf2, p.arms[iB]);
    // פלג הגוף והמותניים נמתחים יחד לאורך הקו מהירך לכתף
    const [hp0, sp0] = p.torso, tl = Math.hypot(sp0[0] - hp0[0], sp0[1] - hp0[1]), ta = Math.atan2(sp0[1] - hp0[1], sp0[0] - hp0[0]), T0 = PR.torso * h;
    place(this.torso, hp0[0], hp0[1], ta, tl / T0); place(this.hips, hp0[0], hp0[1], ta, tl / T0);
    if (this.skirt && p.skirt) this.skirt.setAttribute('d', 'M' + p.skirt.map(P).join('L') + 'Z');
    const [cx, cy] = p.head;
    for (const e of [this.hairB, this.head, this.face, this.hairF]) place(e, cx, cy);
    // נקודת היד המחזיקה, בקואורדינטות עולם (לבלון ולרצועה)
    const holdI = p.view === 'side' ? 0 : (p.view === 'front' ? 1 : 0), hp = p.arms[holdI].hand;
    this.hand = [x + (p.view === 'side' ? hp[0] * flip : hp[0]), y + hp[1]];
    this.handRel = [this.hand[0] - x, this.hand[1] - y];
  }
  /** רק הזזה של כל הדמות, בלי לעדכן את התנוחה (לדמויות קטנות על המסך, בכל פריים שני) */
  move(x: number, y: number) {
    place(this.g, x, y);
    if (this.handRel) this.hand = [x + this.handRel[0], y + this.handRel[1]];
  }
}
