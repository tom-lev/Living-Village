/* בניית הסצנה מקובץ העולם: גאומטריה → פני שטח → אובייקטים → מחוללים */
import { setSeed } from '../core/rng';
import { setPalette } from '../core/palette';
import { ctx, initLayers, sortStatics, NO_TREE, statics } from '../world/context';
import { buildGeometry } from '../world/geometry';
import type { WorldData } from '../world/types';
import { PREFABS } from '../prefabs/registry';
import '../prefabs/nature';
import '../prefabs/buildings';
import '../prefabs/props';
import '../prefabs/areas';
import '../prefabs/village';
import { buildTerrain } from './terrain';
import { GENERATORS } from './generators';
import { addLabel } from '../world/labels';
import { places, autoPlace } from '../world/places';
import { initWalk, markRect, markEllipse, markLine, markPath, clearPathIn, placeOk, findPlace, WATER, SWIM, SOFT, SOLID, PATH, BRIDGE, LANE, PLAZA } from '../world/walk';
import { geo, ROAD_W } from '../world/geometry';
import { catmull } from '../world/nav';
import { autoBridges } from './mountains';
import { WATERS } from '../world/context';

const rect = ([x0, y0, x1, y1]: number[]) => ({ x0, y0, x1, y1 });

export function buildScene(w: WorldData, svgS: SVGSVGElement, svgD: SVGSVGElement) {
  ctx.world = w; ctx.B = rect(w.bounds); ctx.home = rect(w.home);
  setSeed(w.seed);
  setPalette(w.palettes?.find(p => p.name === w.palette), w.palettes);
  initLayers(svgS, svgD);
  buildGeometry(w);
  initWalk();   // מפת מעבר: מסמנים תוך כדי בנייה מה מותר לדרוך עליו
  buildTerrain(w);
  markTerrain(w);
  alignBridges(w);   // גשר מהנתונים: בדיוק איפה שהדרך או השביל חוצים את המים, בכיוון שלהם
  for (const o of w.objects) {
    const f = PREFABS[o.type];
    if (!f) { console.warn('אין prefab בשם', o.type, o); continue; }
    if (o.id) ctx.named[o.id] = o;
    placeSmall(o);                             // כלל המיקום: חפץ לא עומד על שביל, על מים או על שפת רחבה
    const n0 = NO_TREE.length, s0 = statics.length, p0 = places.length;
    f(o);
    if (places.length === p0) autoPlace(o);   // כל אובייקט (גם עתידי) הוא יעד, אלא אם הוא נוף בלבד
    markObject(o, s0);                         // ומה אסור לדרוך עליו (מבנה, שדה, מבוך...)
    // התווית יושבת ממש מעל האובייקט: הקצה העליון של החלק הגדול שצויר (גג, ארובה). אם אין ציור גבוה, השטח שהאובייקט חסם
    let top: number | undefined;
    if (o.name) {
      // החלק הגדול ביותר שצויר (הבית עצמו, לא עץ או לול בחצר)
      let area = 0;
      for (const st of statics.slice(s0)) { try { const bb = st.el.getBBox(); if (bb.width * bb.height > area) { area = bb.width * bb.height; top = bb.y; } } catch {} }
      if (top === undefined && NO_TREE.length > n0) top = Math.min(...NO_TREE.slice(n0).map(r => r[1])) + 8;
    }
    if (o.name && o.type !== 'shop' && o.type !== 'station') addLabel(o, top);   // לחנות ולתחנה כבר יש שלט עם השם
  }
  for (const g of w.generators) {
    const f = GENERATORS[g.type];
    if (!f) { console.warn('אין מחולל בשם', g.type, g); continue; }
    f(g);
  }
  sortStatics();
  // מכשולים קטנים: כל דבר שעומד על הקרקע (עצים, ספסלים, פנסים, חביות) חוסם רק את הבסיס שלו (גזע, רגליים), לא את הצמרת
  for (const st of statics) { try { const bb = st.el.getBBox(); if (bb.width > 0) markEllipse(bb.x + bb.width / 2, st.y - 2, Math.min(bb.width / 2, 4.5), 3, SOFT); } catch {} }
  for (const W of WATERS) markEllipse(W.cx, W.cy, W.rx, W.ry, WATER);   // אגמים
  // גשרים אוטומטיים מעל הנהר, איפה שדרך או שביל חוצים אותו ואין שם גשר מהנתונים
  autoBridges(geo.RIVER_SAMPLES, w.trails.map(t => catmull(t)), 34, w.objects.filter(o => o.type === 'stoneBridge' || o.type === 'footbridge').map(o => [o.x, o.y]));
  for (const W of WATERS) clearPathIn(W.cx, W.cy, W.rx, W.ry);   // אגם: הדרך או השביל לא חוצים אותו (חוץ מגשר)
}

/* כלל המיקום של חפצים קטנים: כל השטח המצויר של החפץ, כולל הגובה שלו (גוף הכוורת, משענת הספסל),
   כי חלק גבוה שעומד מול שביל מסתיר אותו ונראה כאילו השביל נכנס לתוכו */
const FOOT: Record<string, (o: any) => number[]> = {
  bench: o => [o.x - 22, o.y - 24, o.x + 22, o.y + 4],
  picnicTable: o => [o.x - 20, o.y - 18, o.x + 20, o.y + 4],
  picnicBlanket: o => [o.x - 22, o.y - 16, o.x + 22, o.y + 16],
  haybale: o => [o.x - 9, o.y - 9, o.x + 9, o.y + 9],
  mailbox: o => [o.x - 8, o.y - 26, o.x + 8, o.y + 2],
  bike: o => [o.x - 11, o.y - 16, o.x + 11, o.y + 2],
  well: o => [o.x - 18, o.y - 38, o.x + 18, o.y + 7],
  beehives: o => [o.x - 13, o.y - 32, o.x + (Math.min(o.count ?? 5, 3) - 1) * 32 + 13, o.y + (Math.ceil((o.count ?? 5) / 3) - 1) * 34 + 4],
};
/** חפצים שהוזזו בבנייה בגלל כלל המיקום (מי שקשור אליהם זז איתם: יושב על ספסל, יונים) */
export const relocated: { type: string; from: number[]; to: number[] }[] = [];
function placeSmall(o: any) {
  const f0 = FOOT[o.type]?.(o), fp = f0 && [f0[0] - 4, f0[1] - 4, f0[2] + 4, f0[3] + 4];   // מרווח קטן: לא נוגע בשביל ממש בקצה
  if (fp && !placeOk(fp[0], fp[1], fp[2], fp[3])) {
    const d = findPlace(fp);
    if (d) { relocated.push({ type: o.type, from: [o.x, o.y], to: [o.x + d[0], o.y + d[1]] }); o.x += d[0]; o.y += d[1]; }
    return;
  }
  // יונה ליד ספסל שזז: זזה איתו
  if (o.type === 'pigeon') { const m = relocated.find(r => r.type === 'bench' && Math.hypot(r.from[0] - o.x, r.from[1] - o.y) < 50); if (m) { o.x += m.to[0] - m.from[0]; o.y += m.to[1] - m.from[1]; } }
}

/* כלל לגשרים שבנתונים (גם עתידיים): הגשר זז לנקודה שבה הדרך או השביל באמת חוצים את הנהר או הפלג,
   מסתובב בכיוון של הדרך, ואורכו מספיק כדי לעבור את כל רוחב המים גם כשהחצייה באלכסון */
function alignBridges(w: WorldData) {
  const waters = [{ C: geo.RIVER_SAMPLES, half: 22 }, { C: geo.CREEK_SAMPLES, half: 10 }];
  const lines = [...[...geo.EDGES, ...geo.OUTER].map(E => ({ P: E.pts, road: true })), ...w.trails.map(t => ({ P: catmull(t), road: false }))];
  for (const o of w.objects) {
    if (o.type !== 'footbridge' && o.type !== 'stoneBridge') continue;
    let best: any = null, bd = 90;
    for (const { C, half } of waters) for (const { P, road } of lines) {
      if (road !== (o.type === 'stoneBridge')) continue;
      for (let i = 0; i < P.length - 1; i++) for (let j = 0; j < C.length - 1; j++) {
        const [ax, ay] = P[i], [bx, by] = P[i + 1], [cx, cy] = C[j], [dx, dy] = C[j + 1];
        const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx); if (!den) continue;
        const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den, u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
        if (t < 0 || t > 1 || u < 0 || u > 1) continue;
        const x = ax + t * (bx - ax), y = ay + t * (by - ay), d = Math.hypot(x - o.x, y - o.y);
        if (d >= bd) continue;
        // הכיוון של הדרך (ממוצע על קטע קצר, כדי שלא יקפוץ), והזווית בינה לבין המים
        const p0 = P[Math.max(0, i - 2)], p1 = P[Math.min(P.length - 1, i + 3)], pa = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
        const wa = Math.atan2(dy - cy, dx - cx), sin = Math.max(.45, Math.abs(Math.sin(pa - wa)));
        bd = d; best = { x, y, angle: pa * 180 / Math.PI, len: Math.max(40, (half + 9) / sin + 6) };
      }
    }
    if (best) { o.x = Math.round(best.x); o.y = Math.round(best.y); o.angle = Math.round(best.angle); if (o.type === 'footbridge') o.len = Math.round(best.len); }
  }
}

/** מים, ים (עם אזור שחייה רדוד ליד החוף), דרכים ושבילים */
function markTerrain(w: WorldData) {
  const { B } = ctx, T = w.terrain;
  markLine(geo.RIVER_SAMPLES, 24, WATER);
  markLine(geo.CREEK_SAMPLES, 9, WATER);
  markRect(B.x0, T.sea.y + 2, B.x1, B.y1, WATER);
  markRect(B.x0, T.sea.y, B.x1, T.sea.y + 70, SWIM);
  // דרכים ושבילים: מותרים, אבל לא מעל מים (שם רק גשר)
  for (const E of [...geo.EDGES, ...geo.OUTER]) markPath(E.pts, ROAD_W / 2);
  for (const t of w.trails) markPath(catmull(t), 6);
}

/* מבנים: חוסמים את הבסיס (כמה יחידות מעל קו הקרקע, בכל הרוחב). שטחים: שדות וערוגות לא דורכים; מבוך, מכלאה, מזרקה: חסומים לגמרי */
const BUILDINGS = new Set(['modernHouse', 'chalet', 'logCabin', 'church', 'chapel', 'barn', 'windmill', 'station', 'lighthouse', 'waterTower',
  'greenhouse', 'observatory', 'lookoutTower', 'stoneFarm', 'well', 'tent', 'igloo', 'iceHut', 'turbine']);   // פתחי מנהרה ומערה: הדרך עוברת דרכם, לא חוסמים
function markObject(o: any, s0: number) {
  if (BUILDINGS.has(o.type)) {
    // החלק הגדול שצויר הוא המבנה עצמו; הבסיס שלו חוסם (הדלת בקו הקרקע נשארת פתוחה)
    let best: any = null, area = 0;
    for (const st of statics.slice(s0)) { try { const bb = st.el.getBBox(); if (bb.width * bb.height > area) { area = bb.width * bb.height; best = { bb, y: st.y }; } } catch {} }
    if (best) markRect(best.bb.x + 3, best.y - 30, best.bb.x + best.bb.width - 3, best.y - 3, SOLID);
    return;
  }
  switch (o.type) {
    case 'field': case 'vegGarden': markRect(o.x, o.y, o.x + o.w, o.y + o.h, SOFT); break;
    case 'sunflowerField': markRect(o.x, o.y, o.x + (o.w ?? 340), o.y + (o.h ?? 250), SOFT); break;
    case 'vineyard': markRect(o.x0, o.y0, o.x1, o.y1, SOFT); break;
    case 'orchard': markRect(o.x - 10, o.y - 30, o.x + o.cols * (o.dx ?? 46) + 10, o.y + o.rows * (o.dy ?? 48), SOFT); break;
    case 'flowerField': markEllipse(o.x, o.y, o.rx, o.ry, SOFT); break;
    case 'maze': markRect(o.x, o.y, o.x + (o.n ?? 9) * (o.cell ?? 18), o.y + (o.n ?? 9) * (o.cell ?? 18), SOLID); break;
    case 'paddock': markRect(o.x0 - 4, o.y0 - 4, o.x1 + 4, o.y1 + 4, SOLID); break;   // רק מעבר לגדר (מאכילים מבחוץ)
    case 'fountain': markEllipse(o.x, o.y, 36, 16, SOLID); break;
    case 'roundabout': markEllipse(o.x, o.y, (o.r ?? 40) + 42, (o.r ?? 40) + 42, PATH | PLAZA); markEllipse(o.x, o.y + 5, 46, 22, SOLID); break;   // כיכר מרוצפת להליכה; רק המזרקה והפרחים במרכז חסומים
    case 'campfire': markEllipse(o.x, o.y, 16, 8, SOLID); break;
    case 'railway': markRect(ctx.B.x0, o.y - 12, ctx.B.x1, o.y + 12, SOFT); break;   // חוצים רק במעבר (שביל או דרך)
    case 'plaza': markEllipse(o.x, o.y, o.rx, o.ry, PATH | PLAZA); break;
    case 'pier': markRect(o.x, o.y, o.x + (o.w ?? 44), o.y + (o.h ?? 200), PATH); break;
    case 'footbridge': case 'stoneBridge': {   // משטח הגשר: עוברים עליו מעל המים
      const a = (o.angle ?? 0) * Math.PI / 180, L = (o.len ?? 40) + 2, c = Math.cos(a) * L, s = Math.sin(a) * L;
      markLine([[o.x - c, o.y - s], [o.x + c, o.y + s]], o.type === 'footbridge' ? 9 : ROAD_W / 2 + 2, PATH | BRIDGE | LANE); break;
    }
  }
}
