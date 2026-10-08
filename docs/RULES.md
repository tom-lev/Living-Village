# Living Village: world rules

_Generated from `app/src/world/rules.ts` by `npm run rules`. Do not edit by hand: change the code, then regenerate._

Every rule says where in the code it is enforced and how it is verified: **check** = the world check (`npm run check`), **motion** = the motion check (`npm run motion`), **built** = it holds by construction.

## Walking (everyone who moves)

| Rule | Enforced in | Verified by |
|---|---|---|
| **no-water**: No walking on water, except swimming in the shallow beach zone | `world/walk.ts okCell (WATER, SWIM)` | motion (forbidden) |
| **doors-only**: No walking through buildings or roofs; buildings are entered only by the door | `scene/build.ts markObject (solidBase), actors/agenda.ts routeTo` | motion (forbidden) |
| **no-fields**: No walking on fields, beds or gardens | `scene/build.ts markObject (SOFT)` | motion (forbidden) |
| **gates**: Walled yards (the paddock, the Old Stone Farm) are entered only through their gate | `prefabs/areas.ts paddock, prefabs/buildings.ts stoneFarm` | motion (forbidden) |
| **private**: A house plot is entered only by the people who live there | `prefabs/village.ts plot (markPrivate), actors/people.ts rules.priv` | motion (forbidden) |
| **detour**: Walk around trees, benches and lamps | `scene/build.ts (SOFT bases of statics)` | motion (forbidden) |
| **rail-crossing**: Cross the railway only where a road or trail crosses it | `scene/build.ts markObject railway (SOFT band), markPath` | motion (forbidden) |
| **no-mountains**: No climbing mountains, entering deep water or walking on the frozen lake | `scene/mountains.ts (DANGER), scene/build.ts lakes` | motion (forbidden) |
| **one-per-bench**: One person per bench | `actors/people.ts go (place.busy)` | built |
| **children-near**: Children do not go far alone: no hikes, trains or swimming, and at most 700 units from home | `actors/agenda.ts chooseNext` | built |
| **animals-apart**: People never enter the paddock; the dog never enters shops | `scene/build.ts paddock SOLID, actors/people.ts Dog.waiting` | built |
| **on-ground**: Everyone stays on the ground and fades in or out at doors | `actors/people.ts Walker states` | motion (jump) |
| **calm**: Calm movement: personal space, step aside when meeting, slow down behind a slower walker; no sudden jumps or flicker | `actors/people.ts update` | motion (jump, flicker, stuck) |
| **wild-apart**: Forest animals stay in the forest, far from houses, off paths and water, and never behind trees or buildings | `actors/wildlife.ts spotOk, pathClear, hidden` | check `wildlife` |

## Layout (how the world is built)

| Rule | Enforced in | Verified by |
|---|---|---|
| **prop-place**: A small prop (bench, table, signpost, mailbox, bike, haybale, well, beehives) never stands on a path, water, a building or a private plot, and never straddles a plaza edge | `scene/build.ts placeSmall, world/decl.ts foot` | check `prop` |
| **trail-joins**: A trail end meets a road or another trail exactly on its drawn curve, at a natural angle, with rounded corners; a trail may end in nothing but never starts from nowhere | `world/geometry.ts joinTrails` | check `trail-end` |
| **bridges**: Roads and trails cross water only on a bridge placed exactly at the crossing; every bridge has a name | `scene/build.ts alignBridges, scene/mountains.ts autoBridges` | check `water` |
| **trails-off-water**: Trails stay away from river and creek banks, never enter lakes, and cross running water close to perpendicular | `world/geometry.ts trailRules` | check `trail-water` |
| **no-parallel**: No two trails run side by side | `world/geometry.ts trailRules` | check `parallel` |
| **junction-gap**: Junctions are not crowded: at least 40 apart, at most 4 branches | `world/geometry.ts joinTrails (roadJ, trailJ)` | check `junctions` |
| **gentle-curves**: Trails have no sharp corners | `world/geometry.ts trailRules (rule 7)` | check `curves` |
| **connected**: Every building connects to the network, and every named place can be reached on foot from the village | `world/geometry.ts trailRules (door paths), actors/agenda.ts connects` | check `reach` |
| **door-path**: A house's paved path leaves the door straight ahead to the road or trail in front and reaches its edge; only with nothing in front does it go around to the street behind | `prefabs/village.ts plot, pathAcross` | check `plot-path` |
| **gardens**: Every house has a real garden: about 32 of lawn on each side and a front yard; plots never overlap and no road crosses them | `tools/history/spread_plots.py, prefabs/village.ts plot` | check `gardens` |
| **no-fences**: House plots have no fences; the only walled yard is the Old Stone Farm | `prefabs/village.ts plot` | built |
| **labels**: Place names never overlap | `world/labels.ts layoutLabels` | check `labels` |
| **lamps**: Street lamps only in the village, never on a road or trail, not crowded, arm toward the road | `scene/generators.ts streetLamps` | check `lamps` |
| **benches-face**: A bench faces what there is to see: water, a square, or the nearest path | `scene/build.ts orientBench` | check `bench` |
| **level-crossings**: Wherever a road or trail crosses the railway there is a level crossing | `prefabs/areas.ts railway` | built |
| **stable-forest**: Adding or removing content never moves the rest of the forest | `scene/generators.ts forest (rngAt per tree), scene/build.ts drawAway (removed: true)` | built |
| **no-bands**: Nothing beyond the edge of the world is ever shown, on any screen shape | `camera/camera.ts measure (cover zoom)` | built |

## Proportions

| Rule | Enforced in | Verified by |
|---|---|---|
| **real-size**: People, animals, vehicles and small props have their real size (an adult is 1.70 m = 33 units) | `world/scale.ts REAL_H, REAL_DYN; scene/build.ts auto-scale; actors (fitScale)` | check `scale` |
| **map-scale**: Trees are at least twice a person; landmarks are clearly taller than houses | `world/scale.ts TREE_MIN, MAP_MIN; prefabs/nature.ts` | check `scale` |

## Infrastructure

| Rule | Enforced in | Verified by |
|---|---|---|
| **one-shape**: Drawing, walking, bridges, junctions and checks all use the same drawn curve | `world/curve.ts` | built |
| **build-order**: The world is built in a fixed order of stages; nothing runs before what it needs | `world/issues.ts STAGES, need(); scene/build.ts buildScene` | check `order` |
| **declared**: Every object type declares its footprint, door, kind and label in one table | `world/decl.ts DECL` | check `undeclared` |
| **perf-budget**: Performance budget: no single object too heavy to draw, the whole static map within its point budget, moving things within their per-frame time and count | `world/budget.ts BUDGET; core/util.ts drawCost; main.ts FRAME` | check `perf` |
| **overlap**: Plots and buildings do not overlap each other | `tools/history/spread_plots.py` | check `overlap` |

