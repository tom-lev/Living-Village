/* ───────── כללי העולם: מקור האמת היחיד (בקשת הבעלים) ─────────
   כל כלל מוגדר כאן פעם אחת: מזהה, שם, למה הוא קיים, איפה בקוד הוא נאכף, ואיך מוודאים שהוא מתקיים.
   - check: מזהה הבדיקה בבדיקת העולם (world/check.ts). כל בדיקה שם חייבת להופיע כאן, וכל כלל עם check חייב בדיקה
     (אחרת בדיקת העולם עצמה מדווחת "rules").
   - motion: הכלל נבדק בבדיקת התנועה (tools/motion.mjs), כי הוא על דמויות שזזות.
   - built: הכלל מתקיים מעצם הבנייה (אין מצב שבו הוא יכול להיות מופר), והקוד שאוכף אותו כתוב ב-where.
   docs/RULES.md נוצר מהקובץ הזה (npm run rules). כלל חדש נכתב כאן, לא רק בתיעוד. */

export interface Rule {
  id: string;
  group: 'walking' | 'layout' | 'proportions' | 'infrastructure';
  title: string;
  why?: string;
  /** איפה בקוד הכלל נאכף */
  where: string;
  check?: string;
  motion?: string;
  built?: true;
}

export const RULES: Rule[] = [
  // ── הליכה: חלים על כל מי שזז ──
  { id: 'no-water', group: 'walking', title: 'No walking on water, except swimming in the shallow beach zone', where: 'world/walk.ts okCell (WATER, SWIM)', motion: 'forbidden' },
  { id: 'doors-only', group: 'walking', title: 'No walking through buildings or roofs; buildings are entered only by the door', where: 'scene/build.ts markObject (solidBase), actors/agenda.ts routeTo', motion: 'forbidden' },
  { id: 'no-fields', group: 'walking', title: 'No walking on fields, beds or gardens', where: 'scene/build.ts markObject (SOFT)', motion: 'forbidden' },
  { id: 'gates', group: 'walking', title: 'Walled yards (the paddock, the Old Stone Farm) are entered only through their gate', where: 'prefabs/areas.ts paddock, prefabs/buildings.ts stoneFarm', motion: 'forbidden' },
  { id: 'private', group: 'walking', title: 'A house plot is entered only by the people who live there', where: 'prefabs/village.ts plot (markPrivate), actors/people.ts rules.priv', motion: 'forbidden' },
  { id: 'detour', group: 'walking', title: 'Walk around trees, benches and lamps', where: 'scene/build.ts (SOFT bases of statics)', motion: 'forbidden' },
  { id: 'rail-crossing', group: 'walking', title: 'Cross the railway only where a road or trail crosses it', where: 'scene/build.ts markObject railway (SOFT band), markPath', motion: 'forbidden' },
  { id: 'no-mountains', group: 'walking', title: 'No climbing mountains, entering deep water or walking on the frozen lake', where: 'scene/mountains.ts (DANGER), scene/build.ts lakes', motion: 'forbidden' },
  { id: 'one-per-bench', group: 'walking', title: 'One person per bench', where: 'actors/people.ts go (place.busy)', built: true },
  { id: 'children-near', group: 'walking', title: 'Children do not go far alone: no hikes, trains or swimming, and at most 700 units from home', where: 'actors/agenda.ts chooseNext', built: true },
  { id: 'animals-apart', group: 'walking', title: 'People never enter the paddock; the dog never enters shops', where: 'scene/build.ts paddock SOLID, actors/people.ts Dog.waiting', built: true },
  { id: 'on-ground', group: 'walking', title: 'Everyone stays on the ground and fades in or out at doors', where: 'actors/people.ts Walker states', motion: 'jump' },
  { id: 'calm', group: 'walking', title: 'Calm movement: personal space, step aside when meeting, slow down behind a slower walker; no sudden jumps or flicker', where: 'actors/people.ts update', motion: 'jump, flicker, stuck' },
  { id: 'animals-360', group: 'walking', title: 'Animals walk in any direction (360°), always exactly where they face, and turn gradually in an arc or in place; never flipped on an axis, never sliding like on a conveyor belt', why: 'Owner rule 2026-10-08', where: 'actors/heading.ts Heading (wildlife, dog, horses, sheep); birds and ducks turn with an instant flip', built: true },
  { id: 'no-animal-fades', group: 'walking', title: 'No fades in animal behaviour: views change instantly like animation frames, every change of pose is continuous motion (a bear rears up step by step), and animals disappear only by really going somewhere (a lizard into its burrow)', why: 'Owner rule 2026-10-08', where: 'actors/heading.ts views; actors/quad.ts rear; actors/lizards.ts burrow', built: true },
  { id: 'wild-apart', group: 'walking', title: 'Forest animals stay in the forest, far from houses, off paths and water, and never behind trees or buildings', where: 'actors/wildlife.ts spotOk, pathClear, hidden', check: 'wildlife' },

  // ── פריסה: איך העולם נבנה ──
  { id: 'prop-place', group: 'layout', title: 'A small prop (bench, table, signpost, mailbox, bike, haybale, well, beehives) never stands on a path, water, a building or a private plot, and never straddles a plaza edge', where: 'scene/build.ts placeSmall, world/decl.ts foot', check: 'prop' },
  { id: 'trail-joins', group: 'layout', title: 'A trail end meets a road or another trail exactly on its drawn curve, at a natural angle, with rounded corners; a trail may end in nothing but never starts from nowhere', where: 'world/geometry.ts joinTrails', check: 'trail-end' },
  { id: 'bridges', group: 'layout', title: 'Roads and trails cross water only on a bridge placed exactly at the crossing; every bridge has a name', where: 'scene/build.ts alignBridges, scene/mountains.ts autoBridges', check: 'water' },
  { id: 'trails-off-water', group: 'layout', title: 'Trails stay away from river and creek banks, never enter lakes, and cross running water close to perpendicular', where: 'world/geometry.ts trailRules', check: 'trail-water' },
  { id: 'no-parallel', group: 'layout', title: 'No two trails run side by side', where: 'world/geometry.ts trailRules', check: 'parallel' },
  { id: 'junction-gap', group: 'layout', title: 'Junctions are not crowded: at least 40 apart, at most 4 branches', where: 'world/geometry.ts joinTrails (roadJ, trailJ)', check: 'junctions' },
  { id: 'gentle-curves', group: 'layout', title: 'Trails have no sharp corners', where: 'world/geometry.ts trailRules (rule 7)', check: 'curves' },
  { id: 'connected', group: 'layout', title: 'Every building connects to the network, and every named place can be reached on foot from the village', where: 'world/geometry.ts trailRules (door paths), actors/agenda.ts connects', check: 'reach' },
  { id: 'door-path', group: 'layout', title: "A house's paved path leaves the door straight ahead to the road or trail in front and reaches its edge; only with nothing in front does it go around to the street behind", where: 'prefabs/village.ts plot, pathAcross', check: 'plot-path' },
  { id: 'gardens', group: 'layout', title: 'Every house has a real garden: about 32 of lawn on each side and a front yard; plots never overlap and no road crosses them', where: 'tools/history/spread_plots.py, prefabs/village.ts plot', check: 'gardens' },
  { id: 'no-fences', group: 'layout', title: 'House plots have no fences; the only walled yard is the Old Stone Farm', where: 'prefabs/village.ts plot', built: true },
  { id: 'labels', group: 'layout', title: 'Place names never overlap', where: 'world/labels.ts layoutLabels', check: 'labels' },
  { id: 'lamps', group: 'layout', title: 'Street lamps only in the village, never on a road or trail, not crowded, arm toward the road', where: 'scene/generators.ts streetLamps', check: 'lamps' },
  { id: 'benches-face', group: 'layout', title: 'A bench faces what there is to see: water, a square, or the nearest path', where: 'scene/build.ts orientBench', check: 'bench' },
  { id: 'level-crossings', group: 'layout', title: 'Wherever a road or trail crosses the railway there is a level crossing', where: 'prefabs/areas.ts railway', built: true },
  { id: 'stable-forest', group: 'layout', title: 'Adding or removing content never moves the rest of the forest', where: 'scene/generators.ts forest (position grid with rngAt), world/walk.ts initWalk (grid anchored to world coordinates)', built: true },
  { id: 'no-bands', group: 'layout', title: 'Nothing beyond the edge of the world is ever shown, on any screen shape', where: 'camera/camera.ts measure (cover zoom)', built: true },

  // ── פרופורציות ──
  { id: 'real-size', group: 'proportions', title: 'People, animals, vehicles and small props have their real size (an adult is 1.70 m = 33 units)', where: 'world/scale.ts REAL_H, REAL_DYN; scene/build.ts auto-scale; actors (fitScale)', check: 'scale' },
  { id: 'map-scale', group: 'proportions', title: 'Trees are at least twice a person; landmarks are clearly taller than houses', where: 'world/scale.ts TREE_MIN, MAP_MIN; prefabs/nature.ts', check: 'scale' },

  // ── תשתית ──
  { id: 'one-shape', group: 'infrastructure', title: 'Drawing, walking, bridges, junctions and checks all use the same drawn curve', where: 'world/curve.ts', built: true },
  { id: 'build-order', group: 'infrastructure', title: 'The world is built in a fixed order of stages; nothing runs before what it needs', where: 'world/issues.ts STAGES, need(); scene/build.ts buildScene', check: 'order' },
  { id: 'declared', group: 'infrastructure', title: 'Every object type declares its footprint, door, kind and label in one table', where: 'world/decl.ts DECL', check: 'undeclared' },
  { id: 'perf-budget', group: 'infrastructure', title: 'Performance budget: no single object too heavy to draw, the whole static map within its point budget, moving things within their per-frame time and count', why: 'The site must stay smooth on a phone however much content is added', where: 'world/budget.ts BUDGET; core/util.ts drawCost; main.ts FRAME', check: 'perf' },
  { id: 'overlap', group: 'infrastructure', title: 'Plots and buildings do not overlap each other', where: 'tools/history/spread_plots.py', check: 'overlap' },
];

export const ruleOfCheck = (check: string) => RULES.find(r => r.check === check);
