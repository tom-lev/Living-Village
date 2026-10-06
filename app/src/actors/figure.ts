/* דמות אדם וקטורית: תנוחות הליכה וישיבה, וציור שמתעדכן בכל פריים */
import { el, n2, P, circ, rrect, shade, wrap1 } from '../core/util';
import { grade } from '../core/palette';
import type { Look } from '../world/types';

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

/** דמות: רשימת צורות SVG שמתעדכנות בכל פריים. הכול וקטורי, אז היא חדה בכל זום */
export class Figure {
  [k: string]: any;
  constructor(parent: any, look: Look) {
    this.look = look; const h = look.h;
    this.g = el('g', { class: 'who' }, parent);
    this.shadow = el('ellipse', { rx: n2(h * .2), ry: n2(h * .055), fill: 'rgba(40,70,20,.25)' }, this.g);
    this.body = el('g', null, this.g);
    const S = (c: string, w: number) => el('path', { fill: 'none', stroke: c, 'stroke-width': n2(w * h), 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, this.body);
    const dk = (c: string) => shade(c, -.16);
    this.armBu = S(dk(look.shirt), .062); this.armBf = S(dk(look.skin), .052);
    this.legB = S(dk(look.pants), .074); this.shoeB = S('#3b2f2a', .052);
    this.legA = S(look.pants, .074); this.shoeA = S('#4a3b33', .052);
    this.skirt = look.skirt ? el('path', { fill: look.skirt, stroke: look.skirt, 'stroke-width': n2(.035 * h), 'stroke-linejoin': 'round' }, this.body) : null;
    this.torso = S(look.shirt, .165);
    this.armAu = S(look.shirt, .062); this.armAf = S(look.skin, .052);
    this.hairB = el('path', { fill: look.hair }, this.body);
    this.head = el('circle', { r: n2(look.headR * h), fill: look.skin }, this.body);
    this.face = el('path', { fill: '#3b2f2a' }, this.body);
    this.hairF = el('path', { fill: look.hat || look.hair }, this.body);
    el('rect', { x: n2(-h * .4), y: n2(-h * 1.2), width: n2(h * .8), height: n2(h * 1.32), fill: 'transparent' }, this.g);   // אזור לחיצה
    this.view = null;
  }
  render(p: Pose, x: number, y: number, flip: number, opacity?: number) {
    const { look } = this, h = look.h;
    this.g.setAttribute('transform', `translate(${n2(x)},${n2(y)})`);
    this.body.setAttribute('transform', p.view === 'side' ? `scale(${flip.toFixed(3)},1)` : '');
    if (opacity !== undefined) this.g.setAttribute('opacity', opacity.toFixed(2));
    if (p.view !== this.view) {
      this.view = p.view;
      this.torso.setAttribute('stroke-width', n2((p.view === 'side' ? .165 : .205) * h));
      this.head.setAttribute('fill', grade(p.view === 'back' && !look.hat ? look.hair : look.skin));
    }
    // בצד: 0 קרוב (A), 1 רחוק (B). מלפנים/מאחור: 0 שמאל (B), 1 ימין (A)
    const [iA, iB] = p.view === 'side' ? [0, 1] : [1, 0];
    const leg = (pe: any, se: any, L: any) => { pe.setAttribute('d', `M${P(L.hip)}L${P(L.knee)}L${P(L.ank)}`); se.setAttribute('d', `M${P(L.heel)}L${P(L.toe)}`); };
    leg(this.legA, this.shoeA, p.legs[iA]); leg(this.legB, this.shoeB, p.legs[iB]);
    const arm = (ue: any, fe: any, A: any) => {
      const mid = [A.sh[0] + (A.elb[0] - A.sh[0]) * .7, A.sh[1] + (A.elb[1] - A.sh[1]) * .7];
      ue.setAttribute('d', `M${P(A.sh)}L${P(mid)}`); fe.setAttribute('d', `M${P(mid)}L${P(A.elb)}L${P(A.hand)}`);
    };
    arm(this.armAu, this.armAf, p.arms[iA]); arm(this.armBu, this.armBf, p.arms[iB]);
    this.torso.setAttribute('d', `M${P(p.torso[0])}L${P(p.torso[1])}`);
    if (this.skirt) this.skirt.setAttribute('d', 'M' + p.skirt.map(P).join('L') + 'Z');
    const [cx, cy] = p.head, r = look.headR * h;
    this.head.setAttribute('cx', n2(cx)); this.head.setAttribute('cy', n2(cy));
    let hb = '', hf = '', face = '';
    const hs = look.hairStyle;
    if (p.view === 'side') {
      hb = circ(cx - .14 * r, cy - .14 * r, 1.07 * r);
      if (hs === 'long') hb += rrect(cx - 1.08 * r, cy - .3 * r, .95 * r, 1.65 * r, .45 * r);
      if (hs === 'bun') hb += circ(cx - .95 * r, cy - .6 * r, .42 * r);
      if (hs === 'pony') hb += rrect(cx - 1.55 * r, cy - .55 * r, .7 * r, 1.2 * r, .35 * r);
      face = circ(cx + .5 * r, cy - .02 * r, .1 * r);
      if (look.hat) hf = `M${n2(cx - 1.06 * r)},${n2(cy - .12 * r)}A${n2(1.06 * r)},${n2(1.06 * r)} 0 0 1 ${n2(cx + 1.06 * r)},${n2(cy - .12 * r)}Z` + rrect(cx + .2 * r, cy - .3 * r, 1.25 * r, .26 * r, .12 * r);
    } else if (p.view === 'front') {
      hb = circ(cx, cy - .16 * r, 1.07 * r);
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
    // נקודת היד המחזיקה, בקואורדינטות עולם (לבלון ולרצועה)
    const holdI = p.view === 'side' ? 0 : (p.view === 'front' ? 1 : 0), hp = p.arms[holdI].hand;
    this.hand = [x + (p.view === 'side' ? hp[0] * flip : hp[0]), y + hp[1]];
  }
}
