# Living Village: full context for Claude

This file is the complete handoff. Work on this project so far happened in one long cloud session; everything needed to continue from exactly that point is here. Read it all before acting.

---

## 1. The owner and how to work with them
- **Language:** the owner writes in **Hebrew**; always answer in Hebrew. Code comments in the repo are Hebrew, commit messages English.
- **Background:** the owner is not a programmer. They judge by eye on their **phone and desktop**, not by reading code.
  - Explain in plain words: what changed, what they should see, and what to check.
  - Measurements are welcome when explained simply.
- **They want visuals:**
  - For design questions, show **images**. Earlier: the three layout sketches, the side-by-side palette comparisons, and screenshots after each change.
  - Render screenshots with Playwright and show them.
- **Proposals before big changes:** they like a short proposal with a recommendation, then they answer (often just "כן" = yes). Small fixes: just do them.
- **Pace and messages:**
  - They send short follow-up messages while you're working; handle them in the same turn.
  - Report concisely; don't narrate.
  - When something can't be verified (for example real-device GPU performance), say so honestly and give them a way to check (the `?debug` badge).
- **Testing on devices:** they test on a phone and on a desktop, through the live site after deploy. On mobile, a cached old version can appear: tell them to hard-refresh or use a private tab.
- **Commits and pushes:**
  - Commit and push after each verified change, so the live site updates and they can test.
  - **Don't open a PR** unless asked.
  - Always run `npm run build` (tsc + vite) before committing.
  - **Run the world check before every push:** `npm run dev`, then `npm run check -- http://localhost:5173/` (or the dev port). It must print `0 issues`. Fix the rule that caused an issue, never the check. See "Infrastructure rules" below.

## 2. The owner's rules and taste for this world (binding)
- Everything **calm, pleasant, no stress and no jitter**: slow, soft motion; soft colors; no flashing; static grain only (no animated noise).
- A mix of old and modern: **no cars**, but electricity exists (street lamps, power lines, solar panels, wind turbines), and modern houses stand next to old ones.
- **Walking is slow.** It was lowered 40% at their request. Per-character `speed` in `world.json`: 8.4–14.4 world units/s.
- **Proportions matter.** People are about 33 units tall (child 24):
  - Horse `scale` 0.62: back ≈ 28, head ≈ 42.
  - Sheep `scale` 0.8.
  - Small house 52×38 with roof 32, so the door is close to a person's height.
- **They will add a lot of content.** Performance must not depend on the amount of content.
- **They disliked, and so we must avoid:**
  - characters **freezing** during zoom or drag;
  - **pixelation** (CSS-animated SVG pixelates when zoomed, so all motion goes through JS FX);
  - **grey/depressing** colors;
  - **strong grain**;
  - a grid-like "diagram" village composition;
  - bands at max zoom-out;
  - any slowdown of the whole device.
- **They liked:**
  - the "village on the river" layout, based on a reference image: curvy streets, houses on garden plots, a roundabout, a river with a park strip. Take the layout logic only, not that image's art style;
  - the soft/balanced palette;
  - full zoom-out showing the whole world, but with no empty bands.
- **UI:**
  - **Everything on the site is English, LTR (owner's request):** buttons, aria labels, the follow pill, palette names (Soft, Balanced), the rename dialog and error messages. Code comments stay Hebrew, and you still talk to the owner in Hebrew.
  - **Object names.** Any object in `world.json` can have a unique English `name`, such as "Carter House", "Duck Lake" or "Old Stone Farm". About 99 initial names exist; houses use surnames and snowy ones are "… Lodge".
    - The label sits **above** the object. Its top comes from the `block()` rects the prefab registered while drawing (computed in `scene/build.ts`). `labelAt: [x, y]` overrides the position.
    - The look: a map-style italic serif, warm brown with a light halo. Labels appear only at about 4.5× the home view and keep a constant screen size (`world/labels.ts`, dynamic layer `labels`).
    - Shops and the station have no label, because their own sign shows the name.
    - **Renaming in the browser, shared with everyone (`world/namesStore.ts`).** Renames are stored in `app/public/names.json` in the repo, served as `names.json`. It maps the original name to the new name, and the original `world.json` name is the stable key.
      - Every visitor loads the file at boot (`applySharedNames`).
      - Only a device that has a GitHub fine-grained token can edit. The token is limited to this repo with Contents: read and write, and is stored only in `localStorage['village-gh-token']`. Open the site once with `?edit` to enter the token.
      - On a device that can edit, tapping a label opens a dialog. Saving writes `names.json` through the GitHub contents API on branch `main`, which triggers the Pages deploy, so everyone sees the new name in about 1–2 minutes. Pending local renames show immediately until the deployed file catches up.
      - From time to time you may fold `names.json` into `world.json` and empty the file.
    - Label position: the top of the largest prop group the prefab drew (via `getBBox` in `scene/build.ts`). If there is none, the top of its `block()` rects is used. Labels are 26 px on screen.
    - Use these names when talking with the owner about fixes.
  - **Text inside the world is English only:** shop signs, the station and character names. A character's full name is the first name from the data plus the surname of their home: "Noa Fisher" lives in Fisher House. A home without a surname gives "Noa of Old Stone Farm". The surname follows renames (`surnameOf` in `actors/agenda.ts`). Children live with an adult, so they share the family name.
  - Bottom-left: ⤢ (home view), ❚❚/▶ (pause), # (block grid toggle), 🎨 (palette menu). There are no +/− buttons, at the owner's request; the keyboard + and − still zoom. Bottom-right: the zoom label.
  - **Block grid (`ui/grid.ts`).** When the grid is on, each tap adds or removes a cell, so the owner can select any shape. The selected rows and columns light up, and a card shows the count and span. **Copy** puts a description on the clipboard for the owner to send you, for example "Living Village area: 5 blocks, columns 18–23, rows 38–43" followed by one line per row. Tapping a character still follows it.
  - **Block grid (`ui/grid.ts`):** 1 block = 100 world units. Columns are numbered from 1 at the left and rows from 1 at the top. The owner uses it to say sizes and places, for example "a forest of 6×4 blocks at columns 20–26". The world is 34×64 blocks, and the village sits at about columns 14–21, rows 32–48.
  - The follow pill appears when you tap a character.
  - There is no title card (removed at their request).

## 3. Getting started locally
```
git clone https://github.com/tom-lev/Living-Village.git && cd Living-Village
# all work is on main (the old ccr-7419da80-z53gxw branch was merged into it and deleted)
cd app && npm install && npm run dev    # open the URL, add ?debug
```
- Live site: https://tom-lev.github.io/Living-Village/
- Deploy: `.github/workflows/pages.yml` runs on every push to `main`. It does `npm ci && npm run build` in `app/` and copies `app/dist` (+ `.nojekyll`) to the `gh-pages` branch. GitHub Pages serves `gh-pages`. A push is live about 1–2 minutes later.
- The repo is public. (Pages was enabled by pushing an orphan `gh-pages` branch; `configure-pages` with `enablement` failed for lack of token permissions, so don't use it.)

### Commands (in `app/`)
```
npm run dev | build | typecheck | preview   (preview serves dist on :4173)
node tools/perf.mjs drag|zoom|idle|profile [url] [--phone|--desktop] [--throttle=N] [--headed] [--gpu-sw]
```
- `tools/perf.mjs` needs `npm i -D playwright && npx playwright install chromium`. Use `--headed` on a machine with a real GPU: headless without a GPU means software WebGL, so the GPU-path numbers are meaningless there.
- For readable profiles, temporarily set `minify: false` in `vite.config.ts`.
- URL flags:
  - `?debug` shows a badge: `gpu` or `2d`, and fps.
  - `?forcegpu` allows software WebGL, for tests only.
- `localStorage['village-palette']` remembers the chosen palette.
- **Test API:** `window.__village` = `{cam, walkers, followables, zoomAt(sx,sy,f), animateTo(k, wx, wy, ms), startFollow(f), setRunning(bool), fitK(), items, tileStats{missing,painted,mode}, vstats{built,flushes}, applyPalette(name)}`.
  - Example: `v.animateTo(v.fitK()*4, 560, 770, 1)` zooms to the roundabout.

## 4. Repo layout
- `app/` is the real project (Vite + TypeScript + **PixiJS v8**), deployed.
- `app/tools/perf.mjs` is the performance tool. `app/tools/history/relayout_village.py` is the one-off script that generated the current village layout. It's history: read it for the algorithm, never re-run it on the current `world.json`.
- `demo/index.html` is the old single-file version, reference only.
- `README.md` and `code/` are an earlier Hebrew guide about animating characters (distance-based steps, IK, holding objects). Background reading.

## 5. Architecture (`app/src`)
### Boot (`main.ts`)
Startup runs inside `async boot()`. **Never use top-level await**: it deadlocked with Pixi's lazy chunks and the page never loaded.

Order:
1. Read the saved palette.
2. `prepareGpu(canvas)` (Pixi WebGL, or replace the canvas and use the 2D fallback).
3. Set `ctx.gpuDyn` and `view.gpu`.
4. `buildScene()`.
5. `buildActors()`.
6. `initTiles()`.
7. `gpuOverlay(ctx.worldD.c)`.
8. `initCamera()`.
9. The rAF `tick`: `actors.update(dt)` → `cameraTick` → in GPU mode `renderNow()`, one combined frame of tiles and characters.

`view.live` means the loop draws; `requestStatic()` only schedules its own frame when paused.

### Content as data (`world/world.json`)
- **Top level:**
  - `seed` (mulberry32);
  - `palette` (the default name) and `palettes` (the menu: 'רכה', 'מאוזנת');
  - `home` [0,0,800,1700] (the home view: fills a phone in portrait);
  - `bounds` [-1300,-3100,2100,3300];
  - `roads.nodes/edges`: the walkable graph. Edges are `[a, b, c1x, c1y, c2x, c2y]` cubic Béziers.
  - `roads.outer`: decorative roads, `[[p0], c1x,c1y,c2x,c2y, [p1]]`. Index 4 carries the power line.
  - `trails` (footpaths), `river` (a polyline, smoothed with Catmull-Rom), `terrain` (beach/sea/snow/mountains/waterfall);
  - `objects` (each is `{type, ...params}`), `generators`, `actors`.
- `world/palettes-archive.json` holds the palettes removed from the menu ('מקורית', 'פילם 90'). To restore one, copy it back into `palettes`.
- **Adding content:** add objects to `objects`.
  - The prefab type names are registered in `prefabs/*.ts` via `register({...})`:
    - **nature:** pine, roundTree, palm, deer.
    - **buildings:** house `{x,y,w,h,rh,wall,roof,win,chimney,smoke,door,attic}` (in `prefabs/house.ts`), chalet, logCabin, modernHouse `{x,y,w,upper,wall,wood}`, shop `{x,y,name,color,wall,variant, form?, awning?, sign?, door?}` (in `prefabs/shop.ts`), church, chapel, barn, windmill, station, lighthouse, waterTower, greenhouse, observatory, lookoutTower, stoneFarm, tunnelPortal, well.
    - **Shop signs look like real shop signs, not UI chips:** a wooden fascia board with a frame, nails and serif lettering; letters painted straight on the wall; or a small board hanging from a wrought-iron bracket. Text supports `font-family`, `font-style` and a halo `stroke` (VNode text and the static-to-dynamic text move in `tiles.ts`).
    - **No two buildings or trees are alike (owner's rule, also for future content).** Variation comes from `rngAt(x, y, salt)` in `core/rng.ts`: a local RNG seeded by position. It is stable across loads and does **not** consume the global RNG, so adding variety never moves the forest or anything else.
      - `house()` picks the roof shape (gable, steep, hip, saltbox, gambrel, cross), the roof texture (tiles, shingles, slate, thatch), the walls (plaster, siding, boards, brick, stone, half-timber), window and door styles, shutters, flower boxes, canopy, chimney, dormer, annex, a second storey and small extras. The door always stays at `x`, because the plot path leads there. `snow` (white roof) and `logs` restrict the choices.
      - `shop()` builds from parts: the form (cottage, townhouse, pavilion, glassfront), wall, awning, sign style and door side. A trade kit in `KITS` (bakery, flowers, barber, icecream) supplies the window display, outdoor props and sign icon. An unknown `variant` gets a generic shop.
      - Pines and round trees jitter their size, lean, tint, trunk and crown slightly.
    - **props:** bench `{x,y,facing?: n|s|e|w}`, lamp, bike, signpost, mailbox, haybale, umbrella, sailboat, buoy, ship, beehives, picnicTable, picnicBlanket, igloo, snowman, skater, iceHut, turbine, cave, scarecrow, footbridge `{x,y,angle}`, stoneBridge `{x,y,angle}`, pier, pigeon, noTrees `{rect}`.
    - **areas:** paddock `{id,x0,y0,x1,y1}`, lake `{id,cx,cy,rx,ry,reeds}`, plaza, fountain, flowerField, vegGarden, tent, campfire, field `{x,y,w,h,a,b,vertical}`, vineyard, orchard, railway, train, mountainLake, cableCar, ruins, playground, fishingPond, footballPitch, maze, sunflowerField, island, rockIslet, frozenLake, skiSlope, hotSpring.
    - **village:** plot `{x0,y0,x1,y1,door:[x,y],street: top|bottom}` (no fence), roundabout `{x,y,r}`.
  - A house on a plot is a `plot`, a `house` whose door sits about 28 above the plot's bottom edge (less on a shallow plot, so the whole house fits), and optionally a small `roundTree` (s 0.7–0.9) in the back corner. See rules 28–29.
  - Buildings call `block()` so the forest generator doesn't plant trees over them.
  - **Removing an object:** objects whose drawing uses the global RNG (maze, ruins…) are not deleted but get `removed: true`; `drawAway` in `scene/build.ts` draws them into detached layers, so the RNG sequence and the forest stay put, and their tree block stays as a clearing. Objects that use no global RNG (ship) can simply be deleted.
  - **Forest stability:** the forest picks each tree's type and size with `rngAt(x, y)`, so adding or removing trees (a clearing, a new object) never changes the rest of the forest. Tree positions still come from the global RNG attempt loop, which consumes a fixed amount per attempt.
- `y` is the ground line. Objects are depth-sorted by y (`prop(y)`).

### Characters with an agenda (`world/places.ts`, `world/nav.ts`, `actors/agenda.ts`)
- **Places (destinations):** built automatically.
  - Every object that is not pure scenery becomes a destination through `autoPlace()` in `scene/build.ts`. Its kind comes from `KIND_OF_TYPE`: home, shop, church, train, workIn, work, play, animals, shore, stroll, view or rest. An unknown type with a name becomes 'visit' (come, stand and look). **Never require the owner to declare destinations.**
  - Prefabs that know their real door call `addPlace` themselves: `shop` and `stoneFarm`. The beach registers swim spots from `terrain.beach.swim`. Dead-end forest trails become 'hike' destinations.
  - `KINDS` defines whether you enter (fade out at the door and stay inside) and for how long.
- **Walk network:** all village roads, outer roads and trails, resampled every 14 units and joined at ends and crossings. Routes use A*. A door is reached from the node *in front* of it (`frontNode`: buildings face south) through a straight garden path (`vertical`).
- **Choosing a destination happens in two stages.** First the activity kind, weighted by the role's `LIKES`. Then a place of that kind, where closer is better ('hike', 'train' and 'swim' tolerate long trips). Recent places are skipped, and after a few outings the character goes home.
- **Role comes from `look.age`:** under 13 is a child, 65 and over is an elder. A dog owner gets the 'dog' role. Ages are in `world.json`.
- **Walker states:** walk → enter → inside → exit, or walk → stay. 18 walkers.
  - The dog waits outside the door while its owner is in a shop, and goes in at home.
  - The follow pill shows live status, for example "Following Noa Fisher · on the way to Bakery".
  - **Activities (stage 2).** At open places `actOf()` picks an act. The figure then uses `actPose` in `figure.ts`, which draws the side view with feet on the ground through IK:
    - look: standing, sometimes a hand shading the eyes;
    - work: bending and weeding;
    - feed: tossing food to ducks or horses;
    - play: small hops;
    - swim: the walker wades in, then `setSwim` hides legs, body and shadow so only head and arms show, with ripples;
    - sit: benches are 'sit' places with a seat, one person per bench (`busy`). Moshe's bench is always taken.
  - Side poses snap the facing to ±1; after walking straight down it can sit near 0, which squashes the figure.
  - **Trails (stage 3).** Leisure trips (hike, stroll, view, shore, sit, rest, animals, visit) cost 0.55 on trails, so they prefer park, river and forest paths. Park and riverside trail points near the village become 'stroll' places ("the riverside path", "the meadow path").
- **LOD:** figures under 30 px tall update their pose every second frame, but move every frame.

### Infrastructure rules (owner-approved, 2026-10-07)
1. **World check** (`world/check.ts`). After the world is built, every rule is checked and each violation is listed with a place: `water` (road or trail over water without a bridge), `trail-end` (a joining trail end that doesn't touch the drawn curve it joins), `prop` (a small prop on a path, water, building or private plot), `bench` (nothing to face), `plot-path` (a door's paved path that doesn't reach the road), `overlap` (plots overlapping, a road or trail through a plot, a plot without its house), `labels` (overlapping names), `reach` (a named place nobody can walk to; homes are tested as their residents), `undeclared` (a type without a declaration), `order` (code that ran before the build stage it needs). Rules also `note()` issues while building (`world/issues.ts`).
   - It only reports; it never changes the world. A deliberate exception: `allow: ['rule']` on the object.
   - With `?debug` the badge shows "N issues"; tapping it opens the list, and tapping a row flies the camera there. It is loaded only with `?debug`, so normal visitors pay nothing. `window.__check()` returns the list.
   - `tools/check.mjs` (`npm run check -- <url>`) opens the site headless, prints only the issues, and exits 1 if there are any.
   - Its first run found real bugs: trails into Mountain Lake, Fishing Pond, Frozen Lake and Hot Spring (rule 19 now covers lakes); creek bridges computed against straight data lines (now the drawn curve); a trail through Pike House's plot; and Horse Paddock, Finch House and Hot Spring unreachable. Routing used to give up after the 4 nearest network points, which near an obstacle were all useless or isolated; `connects()` now skips isolated nodes and searches up to 40 points.
2. **One source of truth for shape** (`world/curve.ts`). Trails, the river and the creek are Catmull-Rom curves through their data points. Drawing (`smoothOpen`), the walk map, nav, bridges (data and automatic), junctions, door paths and the check all use `curvePts` / `curveWithSegs` / `curveFixed` (the river keeps exactly 20 samples per segment, for RNG stability). No code measures distance or crossings against the straight lines between data points.
3. **Fixed build order** (`world/issues.ts`, `buildScene`): setup → geometry (roads, water samples, trail rules, junctions) → terrain (draw, mark water/roads/trails) → water (lakes and ponds marked) → bridges → objects (orient, place, draw, register place, mark, label) → generators → obstacles (tree/prop bases, final lakes, automatic bridges) → ready. Code that depends on a finished stage calls `need(stage, who)`; running too early is an `order` issue.
4. **Every type declares itself** (`world/decl.ts`, `DECL`): `kind` (destination kind), `scenery`, `topLeft`, `foot` (small-prop footprint for the placement rule), `solidBase` (building base blocks walking), `door`, `doorPath` (gets a garden path, rule 23), `noLabel`, `water` / `square` (ellipses benches face; water is marked early), `spot` (where people stand, e.g. the hot spring's rim). Places, placement, labels, benches, door paths and the walk map read only from here. A new prefab type must get a line in `DECL`, or the check reports it.

### World rules (`world/walk.ts`), applied to everyone
- **Owner-approved rules:**
  1. No walking on water. The only exception is swimming in the shallow `SWIM` zone by the beach.
  2. No walking through buildings or roofs; buildings are entered only by the door.
  3. No walking on fields, beds or gardens.
  4. Fenced yards are entered only through their gate.
  5. Private plots are open only to the people who live there.
  6. Detour around trees, benches and lamps.
  7. Cross the railway only where a road or trail crosses it.
  8. No climbing the mountains, entering deep sea or walking on the frozen lake.
  9. One person per bench.
  10. Children do not go far alone: no hike, train or swim, and nothing more than 700 units from home.
  11. People never enter the paddock (they feed animals from outside), and the dog never enters shops.
  12. Everyone stays on the ground and fades in or out.
  13. Calm movement: people keep personal space, step right when meeting someone, and slow down behind a slower walker.
  14. **Placement rule for small props** (owner's request). The check covers the prop's whole drawn area, including its height (hive bodies, bench backs), plus a 4-unit margin. A bench, picnic table, blanket, haybale, mailbox, bike, well or beehives never stands on a road or trail, on water, a building, a mountain or a private plot, and never straddles the edge of a paved plaza: it is fully on the paving or fully off it.
      - `placeSmall` in `scene/build.ts` checks each prop's footprint (`FOOT`) with `placeOk` before drawing it. If the spot is not allowed, it moves the prop to the nearest allowed spot (`findPlace`).
      - Sitters on a moved bench and nearby pigeons move with it, and the moves are listed in `relocated` (`window.__relocated`).
      - **Add a footprint to `FOOT` for any new small prop type.**
  15. **Trail junctions always look natural** (owner's request). `joinTrails` in `world/geometry.ts` adjusts every trail end in `world.json` automatically, before drawing, the walk map or nav see it, so new trails need no manual tuning:
      - Within 56 units of a road: the end snaps to the road centerline, hidden under the road. It enters at an angle halfway between its own and perpendicular, and gets a soft flare at the road edge (`geo.TRAIL_FLARES`).
      - At the end of a dead-end road: the trail continues the road in its direction, and the road narrows smoothly to trail width (`geo.ROAD_TAPERS`) instead of ending in a round cap.
      - **Within 40 units of another trail: it merges smoothly** (owner's request, rule 18). Trail-to-trail joins run after all road joins. The end snaps to the centerline of the other trail's *drawn* Catmull-Rom curve, never to the straight lines between its data points (that left the end beside the path with a round cap sticking out, like an X). It keeps its own direction (no hook before the junction); only when it would enter at under 35° is the angle opened to 35°, through an approach point up to 48 units out. Both corners are rounded by short quadratic fillets (`geo.TRAIL_FILLETS`, 15 units each way), drawn with the same outline and fill strokes as the trails, so there are no steps. Two trail ends at the same point (within 12) are one trail continuing, not a junction, and are left alone. Never place a signpost on the junction point itself; put it beside the trail.
      - Two free ends within 170 units: they join (for example the beach trail to the lighthouse trail).
      - Otherwise it is a free end (`geo.TRAIL_FREE`): drawn narrowing to a third of its width with uneven edges, then a few shrinking worn patches. Never a closed round cap.
      - **A trail may end in nothing, but never starts from nowhere** (owner's request). A trail that touches no road or other trail anywhere is extended, from its end nearest the network, to the closest road or trail, up to 400 units away. The exception: if that end sits at a named place (within 60 of a lake, farm and so on) and the network is more than 80 away, the trail starts at that place and is not extended through it.
  17. **Bridges from the data align themselves** (`alignBridges` in `scene/build.ts`). A `footbridge` or `stoneBridge` moves to the point where its trail or road actually crosses the river or creek, within 90 units. It turns to the path's direction, and a footbridge gets a `len` long enough for a skewed crossing. `geo.RIVER_SAMPLES` follow the drawn (Catmull-Rom) river curve, with the same sample count as before so the RNG stays stable.
  16. **Every bridge has a name** (owner's request). The bridges in `world.json` have a `name`. Automatic bridges (`autoBridges` in `scene/mountains.ts`) get a unique name from `BRIDGE_NAMES` (road, trail or snow pool, chosen by position with `rngAt`) and a label. They can be renamed in the browser like any name.
  19–27. **Layout rules (owner's request, 2026-10-07).** All automatic, applied to current and future content:
      - **19. Trails keep away from water** (`trailRules` in `world/geometry.ts`, runs before `joinTrails`): trails never enter a lake, pond or hot spring (data points and the drawn curve stay 16 beyond the shore; there are no bridges over lakes); data points stay at least 52 units from the river centerline (38 from the creek), mid-segments that dip toward the bank get an extra point, and every crossing is close to perpendicular (a crossing under 55° gets two points on the normal on both sides; `alignBridges` then follows it).
      - **20. No two trails side by side:** a stretch over 60 units where two trails run within 30 (away from their ends, where they join) pushes one trail's points out to 44.
      - **21. Junctions are not crowded:** a new trail-to-trail or trail-to-road join within 40 of an existing one joins that junction instead (at most 4 branches).
      - **22. Signposts stand beside the junction, never on it:** `signpost` has a `FOOT` (drawn to the right of its point), so `placeSmall` moves it off the path.
      - **23. Every building connects:** a house, chalet, cabin, chapel, barn, windmill, lighthouse, observatory, lookout tower or greenhouse whose door step is 14–320 units from the network, and not inside a `plot`, gets a garden trail from its door (`geo.DOOR_TRAILS`): one smooth cubic curve that leaves the door straight south and meets the road or trail at about 60° from the house's side, densely sampled so the drawn curve follows it exactly. Rules 19, 20 and 24 leave these alone; the door end is hidden under the building and never fades. `noPath: true` on the object skips it. `doorX(o)` knows where the door is (a modern house's door is right of center); `autoPlace` uses it too.
      - **24. Gentle curves:** any data corner sharper than 70° is cut into two points (runs last in `trailRules`, so it also smooths corners created by rules 19–20).
      - **25. Labels never overlap** (`layoutLabels` in `world/labels.ts`): laid out once for the zoom where labels appear (`SHOW_FROM × fitK`), bottom-up, moving a colliding label up or slightly sideways; re-run after a rename or a screen-size change. At closer zoom the gaps only grow.
      - **26. Lamps only in the village** (`streetLamps`): only within the home view + 40, never on a road/trail (`placeOk`), and never closer than 0.55 × spacing to another lamp.
      - **27. A bench faces what there is to see** (`orientBench` in `scene/build.ts`). Benches never move for this; they turn. The target is the nearest interesting thing within 180 units: water (lake, pond, hot spring, river, creek, sea) or a square (roundabout plaza, paved plaza, fountain); with none, the nearest road or trail within 90. The direction picks `facing`: `e`/`w` (side profile, sitters face right/left) only when the target is clearly to the side (horizontal distance more than 1.8× the vertical); otherwise `s` (front, target below) or `n` (back view, target above). A side profile does not read as facing something diagonal. `facing` in the data wins. Walkers who sit turn to the bench (`place.face`), and data sitters (Moshe) take the bench's side and sit in the middle of the seat. The bench footprint in `FOOT` follows its facing. Lakes, ponds and hot springs are marked WATER before any object is placed, so nothing is moved into them.
      - **28. Every house has a real garden** (owner's request): the plot is the house width + 64 wide (about 32 of lawn on each side), up to 112 deep, with a front yard of about 28. Plots in a row keep a 14-unit gap; rows that need more room lengthen their lane at its dead end. The one-off `tools/history/spread_plots.py` applied this to the existing village (2026-10-07); new plots must follow the same sizes.
      - **29. House plots have no fence** (owner's request, 2026-10-07): a lawn, a paved path and maybe a flower bed. The plot is still private (only residents enter), but there are no invisible walls around it. The only walled yard is the Old Stone Farm's (`stoneFarm`).
      - **30. A door path goes straight to the road in front** (owner's request, `pathAcross` in `prefabs/village.ts`): doors face south, so if a road or trail crosses the line straight below the door within 60 of the plot's edge, the paved path runs straight down to it, never around the house to the street behind. Only with nothing in front does it go around to the back street. Either way it ends exactly at the road's edge (roads are drawn under plot paths) or inside the trail, measured from the real curve, so there is never a gap.
      - **31. Level crossings** (`railway` in `prefabs/areas.ts`): wherever the drawn curve of a road or trail crosses the railway, a plank deck in the path colour is drawn between and beyond the rails, with the rails on top. Computed automatically; `crossingX` in the data is no longer used.
      - Plot paths (`plot` in `prefabs/village.ts`) are one continuous paved line with rounded corners; on a plot whose street is behind the house, the path runs in front of the planters, then up the middle of the side lawn (17 from the plot edge). Flower beds never sit on it. Trails have no dashed center line (owner's request).
- Walk-map flags also include BRIDGE (crossing water), LANE (road or trail) and PLAZA (paved square). Roads and trails are marked before objects, so the placement checks see them. Lakes clear PATH inside them at the end, except on bridges.
- **How the rules work:** a 6-unit grid with flags WATER, SWIM, DANGER, SOFT, SOLID and PATH, plus private plot ids.
  - Objects mark it while they are built, by type. This happens in `scene/build.ts` (`markObject`, `markTerrain`, and the base of every static prop), plus `plot`, `shop`, `house`, `stoneFarm` and mountains, which mark themselves.
  - Roads and trails are PATH except over water. Only bridges allow crossing water: `stoneBridge` and `footbridge` decks, plus **automatic bridges** that are drawn and marked wherever a road or trail crosses the river or the creek (`autoBridges`).
  - Tunnel portals are linked as a tunnel. Walkers are hidden inside it (lane −1).
- **Routing:** the walk network is repaired once against the grid.
  - A node inside a hard obstacle is cut off. A link that crosses an obstacle is replaced by a detour, and the outside nodes around one obstacle are joined. Dangling trail ends are joined to the nearest line within 220 units.
  - The first and last mile, from a door or spot to the network, is an A* path on the grid that obeys the walker's rules (`WalkRules {priv, swim}`).
  - `routeTo` picks end nodes in the same network component. A place counts as reachable only if a real route from the village exists.
- **Test hooks:** `window.__walk`, `__routeTo`, `__navParts`, `__compOf` and `__places`. In a 2-minute run, violations should stay well below 1% of samples. Leftovers are only edge touches.

### Code modules
- `prefabs/` draw with `el(tag, attrs, parent)` from `core/util.ts`. Static drawing goes into `ctx.L.ground/roads/groundProps/water/props`; animated drawing into `waterFx/cloudShadows/pad/fx/actors/air/clouds`. **All animation is JS** through the `FX` list (`world/context.ts`) or actor `update()`. Never use CSS/SMIL animation.
- **Culling (off-screen work is skipped).** `camera/view.ts` has `updateSeen()` (called once per frame in `actors.update`) and `inView(x, y, r)`.
  - A **fixed-position effect** must register with `fxAt(x, y, r, fn)`, not `FX.push`. It then runs only when visible. Effects depend only on time `t`, so they are correct the moment they come back on screen.
  - **Moving things** keep their logic running off screen (walking, turning at junctions, sheep wandering). They skip only drawing, and are hidden with `show(el, false)` from `core/util.ts`. Hiding matters: otherwise a stale drawing stays on screen at its old position.
  - Dog, leash and balloon follow their owner's `shown` (the owner's `cullR` is enlarged for them).
  - `ripple()` does nothing off screen.
  - While paused, `onStaticFrame` runs `actors.update(0, T)` before each redraw, so things that scroll into view appear.
- `scene/build.ts` order: setSeed → setPalette → initLayers → buildGeometry → buildTerrain → objects → generators (`forest` uses `villageForest` rects inside `home`, density, `pineZones`, `snowLine`) → sortStatics.
- `world/geometry.ts`: Bézier helpers, an occupancy grid (road/river/trail bits) and `treeOk()`.
- `core/palette.ts`: every color passes `grade()` in `el()`; the original color is remembered per element.
  - A palette spec has: saturation, contrast, lift, tint/tintAmount, `map` (exact overrides), blackPoint, highlightTint/shadowTint/splitAmount (film split toning), grain, and `base` (chain onto another palette).
  - Switching is live: `regrade(root)` plus `repaintTiles()` (workers get a color map with a generation number; stale tiles are dropped).
- **Static tiles** (`render/tiles.ts`, `tilePainter.ts`, `tileWorker.ts`):
  - The static SVG is built once and flattened into a display list. Text is moved to the dynamic layer so it stays sharp.
  - 1–2 workers (`floor(cores/3)`, at most 2) paint 256 px tiles at levels BASE = 1/8 px per unit × 2^l, l = 0..10.
  - Density is capped at 2× DPR.
  - Requests go in priority order: the screen → a 1-tile ring → l−1 over 2× the view → l+1 over 70% → l−2 over 4× → l+2 over 30%. The list is **budgeted to TILE_CAP = 300** (minus L0 tiles), the wanted set is never evicted, and the list is rebuilt only when the visible tile range changes.
  - Each tile belongs to one worker by hash.
- **GPU** (`render/gpu.ts`):
  - PixiJS Application on `#mapC`, with `autoStart` off; we call `render` ourselves.
  - The tiles live in one render group: a container per level, ordered coarse-to-fine with l+1 under l, so there are never holes.
  - Each tile's texture is uploaded on arrival (`initSource`). Sprite visibility changes only when a tile enters or leaves the view.
  - `failIfMajorPerformanceCaveat`: software WebGL is refused and the 2D fallback is used.
- **Dynamic layer** (`render/vnode.ts`):
  - VNode mimics the SVG element API: `setAttribute`/`getAttribute`, `appendChild`/`insertBefore`/`remove`, `firstChild`/`nextSibling`, `dataset`, `textContent`, `querySelectorAll('*')`.
  - Each VNode wraps a Pixi Container plus a Graphics, Text or Sprite.
  - Geometry is built at **S = 8×** and scaled back, so curves stay smooth at 24× zoom. SVG path numbers are scaled by our own parser.
  - Shapes rebuild lazily in `flushVNodes()`, only when an attribute value really changes.
  - Each dynamic layer is a Pixi render group.
  - Special cases: `clip-path` (the barber pole) becomes a Pixi mask; `url(#fireGlow)` becomes a radial-gradient sprite.
- **Actors** (`actors/`):
  - `figure.ts`: people are a **capsule skeleton**. Each limb segment is a round-capped stroke built once; each frame only `place()`/`bone()` (position, rotation, scale) run. Head, hair and face are built once per view (side/front/back with 9-unit hysteresis).
  - Walking uses distance-based steps (`footPath`) and two-bone IK. There is also a sit pose.
  - **The dog has three views** (`Dog` in `people.ts`): side (flipped left/right), front (walking toward the viewer) and back (walking away), built once and cross-faded. Moving: the view follows the direction of motion; standing: it looks at the owner. It switches only when one axis clearly dominates (1.4×), so diagonals don't flicker. The leash collar point follows the view.
  - `people.ts`: Walker plus Rover (walks the road graph; at dead ends it slows, waits 2.5–6 s and turns back), Dog (leash, trot), Balloon (spring), Sitter (`feedPigeons`, `warmHands`), and depth sort every 6 frames.
  - `animals.ts`: Horse (grazing neck), Sheep (wander in the paddock), ducks (lake), fish (jump), butterflies.
  - `ambient.ts`: clouds (with shadows; they fade out at deep zoom) and a bird flock.
- **Camera** (`camera/camera.ts`):
  - `cam {k,x,y}`, screen = world×k + (x,y).
  - fitK: the home view covers the screen when the aspect ratio is within 1.2, otherwise it's contained. minK = min(fitK, the world covering the screen), so zoom-out has no bands. The maximum is 24×fitK.
  - Wheel, pinch, drag, double-click, `animateTo` (log-interpolated zoom), tap a character to follow it (in GPU mode, a position hit test `pick()`).
  - GPU mode: everything is one Pixi transform. Fallback: the SVG `#mapD` moves with CSS during a gesture (overscan M = 0.3×max(vw,vh)) and is committed sharp at gesture end.

## 6. The world as it is now (coordinates are world units; y grows downward)
- **North** (y < −1440):
  - a snowy region behind mountain rows (with tunnel portals);
  - chalets around (440..530, −2010..−2380), a chapel (250, −2420), a frozen lake with skaters and ice huts (−260, −2430), a ski slope (1320..1640, −1880..−2660);
  - an observatory (1560, −2790), wind turbines (−1100.., −2580..−2790), a hot spring (−500, −2700), igloos, snowmen, deer;
  - a cable car (700, −1010) → (980, −1420), a mountain lake (280, −1180), a cave (−400, −1395).
- **Middle north** (y −1440..0):
  - forest with trails and signposts; a railway at y = −380 (a bridge where the river crosses), a station (170, −406) and a train;
  - a log cabin, a lookout tower (−800, −500), an old stone farmhouse with a walled yard and vegetable garden (`stoneFarm`, −950, 180; it replaced the castle at the owner's request), ruins, beehives, picnic spots, an orchard (−460, 470);
  - a maze (1570, 70), a vineyard (1192..1290, 300..820), a water tower, greenhouses (1520..1690, 1235), a sunflower field (1400, 1380).
- **River:** from the waterfall (1080, −1430) south → into the lake (535, 262; rx 132, ry 112; ducks, fish, reeds) from the north-east → out of the lake at its south-west → through the village (x ≈ 300 at y 640..920, then south-east to x ≈ 500 at y 1350..1500) → into the sea at (540, 2330). It has stone bridges where roads cross and footbridges where trails cross; all were computed from intersections.
- **Roads:** narrow (`ROAD_W` = 32 in `world/geometry.ts`) earthen village lanes with no centre stripe. They have worn patches, pebbles and grass tufts on the verges. Walker lanes, lamp offset (22), bridge widths and plot paths all follow `ROAD_W`. The old global RNG calls are still consumed, so the forest keeps its place.
- **Mountains and valley** (`scene/mountains.ts`, data in `terrain.mountains` and `terrain.creek`):
  - **Flat style (owner's request; they disliked strong 3D shading).** Each range is built from separate massifs with gaps (passes) between them. A massif has 1–3 broad peaks, a gently jagged ridge, one body colour, one subtle shadow face, uneven snow caps, foothills and rocks. The broad slopes leave room for future houses, paths and people.
  - `anchors` force a massif behind the tunnel portals, the waterfall and the cave. `gaps` sets how sparse a range is: the front range is 0.65.
  - **The valley** between the southern range (−1440) and the northern range (−2900) shows through two things. First, the snowy foothills at the base of the northern range. Second, a frozen **creek** along the valley floor. Bridges are added automatically wherever a road or trail crosses it, and the creek is stamped in the occupancy grid so trees avoid it.
  - Mountain shapes use local RNG. The old loop's global RNG calls are still consumed, so the forest keeps its exact place.
- The old roundabout is now a **paved village square** (radius r+42) with walking room around the fountain.
- **Village** (home 0..800 × 0..1700, "village on the river"):
  - The north road N0 (250, 30) comes from the station and crosses the north bridge to B (480, 485).
  - The **roundabout** R (560, 770), r 46, has a fountain. Shops sit on its corners: bakery (440, 718), flowers (688, 718), barber (690, 950), ice cream (445, 938).
  - Benches have pigeons; grandpa Moshe feeds them at (473, 812). The church (418, 585) faces a small plaza by the river.
  - The roads from R go: north to C (690, 480) → D (735, 185) on the lake's east shore (dead end); east to RX (794, 865) → the east road (power line); south to S (560, 1030).
  - From S, the middle bridge crosses west to W2 (190, 992). The south-east spine is S → J1 → T → J3 → U (690, 1610).
  - **West bank:**
    - the paddock (25..240, 470..720) with 2 horses and 4 sheep;
    - the vegetable garden with a scarecrow (40..240, 780..850);
    - the tent and campfire (110..180, 270..292) with Tamar warming her hands;
    - a farm track to the paddock.
  - **Residential lanes**, with plots on their north side, houses facing the street:
    - west of the river: W2–M (y ≈ 1000), Wa–M2 (≈ 1160), W3–LX (≈ 1310), J2–Q (≈ 1475), all running past the home view to x ≈ −270;
    - east: J1–K (≈ 1140), T–K2 (≈ 1300), J3–K3 (≈ 1455), all running to x ≈ 1030;
    - along R–RX and N0–B.
    - In total: 28 plots, each with a house (33 `house` objects in the whole world), plus 3 modern houses.
  - Riverside park trees and footpaths run along both banks. The flower field (150, 1625) has butterflies.
- **South:**
  - fields, haybales, a barn (225, 1925), a windmill (650, 1940);
  - the beach road BX (410, 1694) → the beach;
  - the beach at y 2225 with umbrellas and a lighthouse (−380, 2318); the sea from y 2330 with a pier (690), sailboats, buoys, a ship, a palm island (380, 2930) and a rock islet.
- **People:** walkers Noa, Itai (dog Boni), Maya (balloon, child), grandma Rachel, Dani, Lia, Omer, Yael, Avi. Sitters: grandpa Moshe and Tamar.
- **Known quirk:** the road graph passes through the roundabout centre, so walkers cross the green island. Fix by routing edges around R if it bothers the owner.

## 7. History: what was requested, decided and rejected (chronological)
1. **The idea:** they wanted a drawn map that is a computer object, not an image: zoom without losing sharpness, with moving characters. Inspiration images were cosy illustrated town maps. We chose SVG vectors with JS-animated characters, then deployed to GitHub Pages.
2. **Zoom:** the zoom was "stuck/not smooth", so we split static and dynamic layers. First the characters froze during gestures; the owner **rejected freezing**, so the dynamic layer moved with CSS during gestures.
3. **Map size:** the map should fill a phone in portrait. Then: enlarge the world in every direction, static scenery only (the animated characters stay in the village), many footpaths and new elements, a snowy north.
4. **Zoom-out and title:**
   - Full zoom-out: first "you must scroll to discover", then they changed their mind to "all the way out", but with **no bands**.
   - The title card was removed.
5. **Pixelation:** the barber pole was pixelated, so all effects moved to JS (no CSS animation).
6. **Performance independent of content**, which led to the canvas tile engine with Web Workers.
7. **Rules set by the owner:** calm and pleasant, no cars, electricity and modern houses.
8. **Stage 1 re-architecture:** Vite + TypeScript modules, with content in `world.json`.
9. **Pace, proportions and colors:**
   - Walking −40%.
   - Proportions: the horse was bigger than a house, so it was fixed (horse 0.62, sheep 0.8, houses larger).
   - Colors, three rounds:
     1. A "calmer palette" proposal was approved.
     2. The result was too grey and depressing, so it was rebalanced.
     3. They asked for a button to compare the versions, then for a **menu**, not cycling.
   - A 90s film palette (faded blacks, gold highlights, teal shadows, less saturation, grain) was added. Then: **remove the grain**.
   - Latest: the menu keeps only 'רכה' (soft) and 'מאוזנת' (balanced); the others are archived.
10. **Layout:**
    - "I don't like the current composition" → three sketches: A village on the river, B hill village, C around a lake.
    - The owner chose a river village "flowing to the water at the south edge, arranged more logically", with a reference layout image (not its style).
    - That gave the current layout. Houses on plots along residential lanes that continue off-screen, because the village was too small for a real street pattern.
11. **Examples they asked about:** Floor796 (floor796.com) is the closest technically. Hidden Folks and Tiny Glade are mood references. Also Townscaper, isometric.nyc and Ryogo Toyoda.
12. **Performance saga** (each step was reported by the owner from a real device):
    - Blur on fast zoom → prefetch of neighbouring levels and more workers.
    - A crossfade made zoom choppy → removed.
    - The 3× DPR cost → capped at 2×.
    - The prefetch list exceeded the cache and caused endless repainting that **slowed the whole computer** → budget plus protection.
    - Then a three-step plan was approved: (1) tiles on the GPU via PixiJS, done; (2) characters and effects on the GPU, done: VNode shim plus capsule skeleton; (3) culling, not done.
    - The owner's report after step 2: `?debug` shows **gpu ~61 fps**, but fps drops during fast zooms (they saw 13 before step 2). After step 2 it is **"still not completely smooth"** on both phone and desktop.
    - They then moved to local work (Claude Code in VS Code) so performance can be measured on a real GPU.

## 8. Where we stopped, and what to do next
**Measured on a real GPU (Windows laptop, Intel UHD, 1920×1080) on 2026-10-06, and fixed:**
- **The main cause of the stutter:** the tile workers painted on GPU-accelerated OffscreenCanvas. That raster work ran in the browser's GPU process and stalled frames by 80–500 ms during zoom and drag, while the main thread was idle (no long tasks). The fix is `getContext('2d', { willReadFrequently: true })` in `tilePainter.ts`, which makes the workers paint on the CPU. After it, zoom and drag hold a steady 60 fps (p99 16.9 ms) at the real screen size and in the phone viewport, and tiles are still sharp within about 100 ms.
- **Pixi rebuilt the instruction lists of every dynamic layer each frame**, because about 30 shapes rebuild each frame.
  - Fix in `vnode.ts`: a shape rebuilt 3 times in quick succession becomes `batchMode = 'no-batch'`.
  - Fix in `gpu.ts`: `validateRenderable` is patched, because Pixi's own check (`!!graphics._gpuData`) is always true.
  - Depth sorts no longer move nodes that are already in place.
- **Overdraw:** every coarser tile level used to be drawn under the current one across the whole screen. Now `gpu.ts` `pick()` shows exactly one tile per screen cell: the sharp tile, else 4 finer tiles, else one coarser tile.
- **Large retina screens:** cutting the tile list to the cache budget dropped visible edge tiles once more than about 276 cells were on screen, so those tiles stayed blurry forever. The cache cap now grows with the screen.
- Still open: at 3200×2000 device px this Intel GPU is fill-bound (clearing and presenting alone take about 7 ms). Real 2× screens with weak GPUs could benefit from a lower canvas resolution during gestures.

- **Plan step 3 (culling) is done** (2026-10-06).
  - Zoomed in on a quiet area: JS per frame went from 5.7 to 1.6 ms, and shape rebuilds from about 23 per frame to 0.
  - In the home view, where almost everything is on screen, nothing changes, as expected.
  - All three architecture steps are now complete.

The original plan follows. Steps 2, 4 and 5 are optional now; measure before doing them.
1. **Measure first, on this machine's GPU:**
   - `npm run build && npm run preview`, then `node tools/perf.mjs zoom http://localhost:4173/ --headed` and `drag`;
   - Chrome DevTools Performance during fast wheel zooms.
   - Find whether the frame-time spikes are JS (actors.update, flushVNodes, Pixi `_buildInstructions`), texture uploads (`initSource` on tile arrival) or GPU.
   - In the dev container the GPU path's JS was ~5 ms/frame (`vstats`: ~20 shape rebuilds per frame).
2. **Texture upload budget:** queue arriving tiles and upload at most N per frame, visible ones first. Today every arriving tile is uploaded at once in the worker message handler, and fast zooms bring bursts.
3. **Culling (plan step 3):**
   - Skip `update()` and shape rebuilds for actors and effects far off screen.
   - Hide off-screen dynamic groups. Toggle visibility only when crossing the edge, because each toggle rebuilds Pixi instructions.
4. **Remove the remaining per-frame rebuilds:** dog legs, leash and balloon string, skirts, ripples created and removed. Use transform-only updates like `place()`/`bone()` and avoid `parseTransform` on strings in hot paths.
5. **If still needed:**
   - pre-bake character frames into sprite atlases;
   - tune the prefetch amounts and the worker count per device;
   - consider 512 px tiles at deep levels.
6. After each improvement, deploy and ask the owner to check `?debug` on the phone and desktop during fast zoom.

## 8b. The owner's task list
**`TODO.md` (in Hebrew, at the repo root) is the prioritised task list. Work through it top to bottom, one task at a time, and tick items off as you finish them.**
- The owner wants each task done, deployed and checked before the next one starts.
- Large or visual tasks get a short proposal or sketch first.

## 9. Backlog (owner wishes, not started)
- A simple in-browser **editor**: drag objects, add from a list, draw roads and paths, export `world.json`. This was proposed as the next architecture stage after performance.
- **More content.** The empty area north-east of the lake (x 560..800, y 150..640) is a candidate for a café, playground or houses.
- **Behaviors:** characters on footpaths too (not only roads), sitting on benches, entering shops, day/night and seasons. All must stay calm.
- Possibly route walkers around the roundabout island.
