/* עולם בדיקה גדול (משימה 30, שלב 6): העולם הנוכחי ועוד N-1 עותקים שלו מזרחה (דרכים, שבילים, אובייקטים),
   היער ממלא את כל השטח לבד, וחיות הבר, הציפורים, הלטאות והעננים מוכפלים. הנהר, האגם וההרים לא מועתקים
   (הם חלק מהקרקע של העולם כולו). זה עולם למדידה בלבד – לא לפרסום.
   שימוש: node tools/scaleworld.mjs <קובץ פלט> [N=5] */
import { readFileSync, writeFileSync } from 'node:fs';

const out = process.argv[2], N = +(process.argv[3] || 5);
if (!out) { console.error('usage: node tools/scaleworld.mjs <out.json> [N]'); process.exit(1); }
const w = JSON.parse(readFileSync(new URL('../src/world/world.json', import.meta.url), 'utf8'));
const W = w.bounds[2] - w.bounds[0];

/** מזיז עותק של אובייקט: כל שדה x (וגם x0, x1, cx) וכל נקודה [x, y] ברשימות; חוץ מהיסטים יחסיים (האבן של העשב הגבוה) */
const XKEYS = new Set(['x', 'x0', 'x1', 'cx']), RELATIVE = new Set(['rock', 'swim']);
function shift(v, dx, key = '') {
  if (RELATIVE.has(key)) return v;
  if (Array.isArray(v)) {
    if (v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number') return [v[0] + dx, v[1]];
    return v.map(q => shift(q, dx));
  }
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, q]) => [k, typeof q === 'number' && XKEYS.has(k) ? q + dx : shift(q, dx, k)]));
  return v;
}

const objects = [...w.objects], trails = [...w.trails], nodes = { ...w.roads.nodes }, edges = [...w.roads.edges], outer = [...w.roads.outer];
for (let k = 1; k < N; k++) {
  const dx = k * W, id = (n) => `${n}_${k}`;
  for (const o of w.objects) objects.push(shift(o, dx));
  for (const t of w.trails) trails.push(t.map(p => [p[0] + dx, p[1]]));
  for (const [n, p] of Object.entries(w.roads.nodes)) nodes[id(n)] = [p[0] + dx, p[1]];
  // קטע דרך: [מ, אל, x1, y1, x2, y2] (נקודות הבקרה של העקומה)
  for (const e of w.roads.edges) edges.push([id(e[0]), id(e[1]), e[2] + dx, e[3], e[4] + dx, e[5], ...e.slice(6)]);
  // דרך חיצונית: [[x, y], x1, y1, x2, y2, [x, y]]
  for (const o of w.roads.outer) outer.push([[o[0][0] + dx, o[0][1]], o[1] + dx, o[2], o[3] + dx, o[4], [o[5][0] + dx, o[5][1]]]);
}
const A = w.actors, times = (n) => Math.round(n * N);
const big = {
  ...w,
  bounds: [w.bounds[0], w.bounds[1], w.bounds[2] + (N - 1) * W, w.bounds[3]],
  roads: { ...w.roads, nodes, edges, outer },
  trails, objects,
  terrain: { ...w.terrain, mountains: w.terrain.mountains.map(m => ({ ...m, end: undefined })) },
  actors: {
    ...A,
    birds: Object.fromEntries(Object.entries(A.birds).map(([k, v]) => [k, times(v)])),
    bluebirds: { ...A.bluebirds, count: times(A.bluebirds.count) },
    wildlife: Object.fromEntries(Object.entries(A.wildlife).map(([k, v]) => [k, times(v)])),
    lizards: { ...A.lizards, count: times(A.lizards.count) },
    clouds: { ...A.clouds, random: times(A.clouds.random) },
  },
};
writeFileSync(out, JSON.stringify(big, null, 1));
console.log(`world ×${N}: ${big.bounds.join(',')} (${objects.length} objects, ${trails.length} trails, ${Object.keys(nodes).length} road nodes)`);
