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
  - **Motion check** (`npm run motion -- <url> [seconds]`, `tools/motion.mjs`): runs the world headless and samples every walker, the dog, horses and sheep about 6 times a second; reports jumps, walkers stuck while walking, time on forbidden ground (sitting on a bench, leaving it, and leaving the sea after a swim are allowed), a dog far from its owner, sheep outside the paddock and left/right flicker. Run it after any change to movement. Test hooks: `window.__horses`, `window.__sheep`.
  - **Run the world check before every push:** `npm run dev`, then `npm run check -- http://localhost:5173/` (or the dev port). It must print `0 issues`. Fix the rule that caused an issue, never the check. See "Infrastructure rules" below.

## 2. The owner's rules and taste for this world (binding)
- Everything **calm, pleasant, no stress and no jitter**: slow, soft motion; soft colors; no flashing; static grain only (no animated noise).
- A mix of old and modern: **no cars**, but electricity exists (street lamps, power lines, solar panels, wind turbines), and modern houses stand next to old ones.
- **Walking is slow.** It was lowered 40% at their request. Per-character `speed` in `world.json`: 8.4–14.4 world units/s.
- **Proportions are a rule (owner's request, 2026-10-08): `world/scale.ts`.** An adult is 33 units = 1.70 m, so 1 m ≈ 19.4 units.
  - Real-size things declare their real height in metres: stationary types in `REAL_H` (picnic table, mailbox, bike, signpost, haybale, scarecrow, snowman, igloo, ice hut, tent, sailboat, buoy, deer, skater, well, street lamp), moving ones in `REAL_DYN` (dog, rabbit, squirrel, owl, fox, bear, train carriage).
  - Stationary: after a prefab draws, `buildScene` measures it (`o._bb`) and, if it is more than 30% off, scales its drawing around its ground point (`o._k`), together with its tree blocks, walk-map base and label. Moving: animals, the dog, lamps and trains compute their size with `fitScale(naturalDrawnHeight, realHeight)`.
  - The world check reports any real-size object that is still off (`scale`). **Any new real-size thing gets a line in `REAL_H` or `REAL_DYN`.**
  - The first pass fixed: trains (×2.4, they were toy-sized next to the bear), rabbits and squirrels (were twice too big), fox, dog, street lamps (were person-height), sailboats, igloos, ice huts, tent, snowman, scarecrow, signposts, bikes, buoys.
  - **Map scale for buildings and trees** (approved by the owner): not full real size, but the right relations. A regular house is about 83 units (`HOUSE_H`). Every tree is at least twice a person (`TREE_MIN` = 66; `pine` and `roundTree` grow their size ×1.35/×1.4 with that minimum, keeping their variety). Landmarks have a minimum height relative to a house (`MAP_MIN`): chapel and lookout tower 1.5×, church, windmill and water tower 2×, lighthouse 2.5×, wind turbine 3×; they are scaled up automatically (never down) with the same mechanism as real-size props. Taller crowns: `treeOk` keeps trees off roads up to 60 above their base and away from buildings by 60. The world check reports landmarks and data trees that are too short (`scale`).
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
  - **Block grid (`ui/grid.ts`):** 1 block = 100 world units. Columns are numbered from 1 at the left and rows from 1 at the top. The owner uses it to say sizes and places, for example "a forest of 6×4 blocks at columns 20–26". The world is 84×74 blocks since 2026-10-09 (it grew 20 blocks west and 10 north on 2026-10-08, and 30 east on 2026-10-09), and the village sits at about columns 34–41, rows 42–58.
  - The follow pill appears when you tap a character.
  - There is no title card (removed at their request).

## 3. Getting started locally
```
git clone https://github.com/tom-lev/Living-Village.git && cd Living-Village
# all work is on main (the old ccr-7419da80-z53gxw branch was merged into it and deleted)
cd app && npm install && npm run dev    # open the URL, add ?debug
```
- Live site: https://tom-lev.github.io/Living-Village/
- Deploy (since 2026-10-09, task 30): `.github/workflows/pages.yml` runs on every push to `main`: `npm ci`, installs Playwright's Chromium, runs `node tools/site.mjs` in `app/` (build, serve the built site, bake in a headless browser – `tools/bake.mjs` – and rebuild if the baked data changed), and publishes `app/dist` straight to GitHub Pages with `upload-pages-artifact` + `deploy-pages` (Pages source: GitHub Actions, switched with `gh api -X PUT repos/tom-lev/Living-Village/pages -f build_type=workflow`). No `gh-pages` branch any more, so pre-rendered files will not pile up in git history. A push is live a few minutes later.
- The repo is public. (The old `gh-pages` branch is no longer used for publishing.)

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
  - `bounds` [-3300,-4100,5100,3300] (grew west and north on 2026-10-08, and 30 columns east on 2026-10-09 for the ancient forest; the walk grid is anchored to world coordinates, so growing never shifts its cells);
  - `roads.nodes/edges`: the walkable graph. Edges are `[a, b, c1x, c1y, c2x, c2y]` cubic Béziers.
  - `roads.outer`: decorative roads, `[[p0], c1x,c1y,c2x,c2y, [p1]]`. Index 4 carries the power line.
  - `trails` (footpaths), `river` (a polyline, smoothed with Catmull-Rom), `terrain` (beach/sea/snow/mountains/waterfall);
  - `objects` (each is `{type, ...params}`), `generators`, `actors`.
- `world/palettes-archive.json` holds the palettes removed from the menu ('מקורית', 'פילם 90'). To restore one, copy it back into `palettes`.
- **Adding content:** add objects to `objects`.
  - The prefab type names are registered in `prefabs/*.ts` via `register({...})`:
    - **nature:** pine, roundTree, palm, deer.
    - **buildings:** house `{x,y,w,h,rh,wall,roof,win,chimney,smoke,door,attic}` (in `prefabs/house.ts`), chalet, logCabin, modernHouse `{x,y,w,upper,wall,wood}`, shop `{x,y,name,color,wall,variant, form?, awning?, sign?, door?}` (in `prefabs/shop.ts`), church, chapel, barn, windmill, station, lighthouse, waterTower, greenhouse, observatory, lookoutTower, stoneFarm, forestCabin, tunnelPortal, well. **Small life:** antHill (`prefabs/ants.ts`).
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

### World rules: the code is the source of truth
**All world rules live in `app/src/world/rules.ts` (`RULES`)**: id, title, where in the code it is enforced, and how it is verified (`check` = a world-check id, `motion` = the motion check, `built` = holds by construction). `docs/RULES.md` is generated from it (`npm run rules`); `npm run build` fails if it is out of date. Read `rules.ts` (or `docs/RULES.md`) for the rule list; do not keep a second copy here.
- **Performance budget** (`world/budget.ts`): per object ≤ 300 drawn elements and ≤ 20k path points (measured in `buildScene` via `drawCost` in `core/util.ts`, stored as `o._cost`); whole static map by area (owner's decision 2026-10-09): `ptsPerBlock` 113 points per 100×100 block, so 450k for the old 54×74 world and about 702k for 84×74 (2026-10-09: about 648k; the giant forest adds about 25% to the build time); moving things ≤ 4 ms per frame on average (`FRAME`, measured around `actors.update`; about 2.3 ms) and ≤ 120 at once (46). The world check reports `perf`. A new heavy object should be simplified, not the budget raised. `window.__budget` shows the current numbers.
- **Load time** (2026-10-08: world build 0.8 s, interactive about 2.7 s on the dev machine, was 5.4–9.9 s). What made it slow and must stay avoided: (1) measuring the drawing (`getBBox`) in between drawing steps — every measurement forces the browser to lay out the whole static SVG; use `bboxOf(st)` (measured once, cached; trees set `st.bb` from their own geometry) and measure right after each object is drawn; (2) "everything against everything" searches — bridges, auto-bridges, trail joins and trail rules now look only at nearby segments (`cachedCurve` with bounding boxes in `world/curve.ts`, spatial grids). `window.__boot` and `window.__stages` show the timings; the world check reports a build over `BUDGET.buildMs`.
- **Adding or changing a rule:** add or edit its entry in `rules.ts`, enforce it in code, add its check to `world/check.ts` (and its id to `IMPLEMENTED`) or mark it `motion`/`built`, then `npm run rules`. The world check itself reports a rule without a check, a check without a rule, and a rule that is not verified (`rules`).
- Implementation notes that are not rules (how things work) stay below and in the code comments.

- Walk-map flags also include BRIDGE (crossing water), LANE (road or trail) and PLAZA (paved square). Roads and trails are marked before objects, so the placement checks see them. Lakes clear PATH inside them at the end, except on bridges.
- **How the rules work:** a 6-unit grid with flags WATER, SWIM, DANGER, SOFT, SOLID and PATH, plus private plot ids.
  - Objects mark it while they are built, by type. This happens in `scene/build.ts` (`markObject`, `markTerrain`, and the base of every static prop), plus `plot`, `shop`, `house`, `stoneFarm` and mountains, which mark themselves.
  - Roads and trails are PATH except over water. Only bridges allow crossing water: `stoneBridge` and `footbridge` decks, plus **automatic bridges** that are drawn and marked wherever a road or trail crosses the river or the creek (`autoBridges`).
  - Tunnel portals (none in the world now) are linked as a tunnel. Walkers are hidden inside it (lane −1).
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
- **Fast loading (2026-10-09, owner's request "load time must stay low however big the world gets"):**
  - **No browser SVG for the static map** (`render/snode.ts`): static layers are `SNode`s (a light in-memory element with the same API: `setAttribute`, `appendChild`, `getBBox`…); `el()` creates an `SNode` whenever the parent is one. `getBBox` and the display-list extraction compute matrices and exact bounds themselves (Bézier extrema, exact arcs; checked against the browser on 3000 random paths and pixel-identical at 7 map spots).
  - **Tile workers:** started at the very beginning of boot and awaited (`paintersLoaded`), because a worker only starts when the page is free; the display list goes to them packed (`packDL`: one byte string for all paths plus typed arrays, transferred without copying); they compute every shape's bounds themselves; giant multi-part paths are split into parts with their own bounds and each tile draws only the parts inside it (`splitParts`, identical pixels); shapes covering more than 64 index cells go to a separate `wide` list; one canvas is reused for all tiles and handed over with `getImageData` → `createImageBitmap` (a new canvas per tile cost tens of ms). The first tile request is sent right after the display list, before the characters are built and before the first heavy frame.
  - **Building by areas (item 1) and level of detail (item 4)** (`scene/chunks.ts`, chunks of 800 units): the forest is only *planned* at boot – every tree's type, size and exact bounds (`pineBox`, `roundBox`, `sequoiaBox`, `firBox` in `prefabs/nature.ts` repeat the same random choices as the drawing, so the result is identical) – and enters `statics` with its bounds, so the walk map, the animals, the bluebirds and the bear know about it at once. The drawing happens per area: the areas of the first view while loading (`bootChunks`), the rest in the background nearest the view first (`chunkStep` in `main.ts`); fine details (ferns, mushrooms on the ancient floor) only when zoomed in on the area. `prop()` returns the reserved group while a deferred thing draws (`drawInto`). Tiles: every shape has a draw-order key `z` (layer, then the standing thing's y and index), so late areas slot in exactly; `addChunkItems` sends them to the workers and repaints the tiles they touch (coarse levels once at the end). `window.__built` = all areas drawn; the world check waits for it and builds every detail first. Round trees' twigs and fruit now use position randomness (`rngAt(x, y, 8)`).
  - **Effects off screen are skipped** in the GPU (`render/cull.ts`): top-level elements of the `fx` and `air` layers are measured once and marked `culled` while outside the view.
  - **Destination choice** checks reachability only for the place chosen (`chooseNext` → `chooseOnce`), not for every place in the world.
  - **Precomputed at upload (item 2)** (`world/bake.ts`, `tools/bake.mjs`, `tools/geohash.mjs`): the trail rules' result (trails, junction flares and fillets, tapers, door trails) is baked into `src/world/baked.json` with a fingerprint of the world data (without the palette) and the geometry code (`__GEO_CODE_HASH__` from `vite.config.ts`); the page uses it when the fingerprint matches (geometry stage 484 → 10 ms). **After changing `world.json` or `geometry.ts`/`curve.ts`/`decl.ts`: `npm run bake -- http://localhost:5199/`** – `npm run build` fails otherwise (`bake.mjs --check`), and the world check reports `baked`.
  - **Load budget (item 5, rule `boot-time`):** the page work before the map shows (`scene + tiles + actors`) ≤ `BUDGET.bootMs` and at most `bootChunks` areas drawn while loading; the world check reports `boot`.
  - Measured on the production build (phone viewport, 2026-10-09): the map is fully painted after 3.5 s instead of 6.35 s (with WebGL 3.4 instead of 6.6); building the map 1.45 s → 0.66 s.
  - **Pre-rendered tiles (task 30, stage 2):** at upload `tools/site.mjs` opens the built site in K headless pages (`?bake=tiles`: the whole world incl. every detail, world paused), draws every tile of levels 0..3 for each palette with the same painter (`bakeTile` in `render/tiles.ts`) and writes `dist/tiles/p<palette>/<level>/<i>_<j>.webp` + `tiles/manifest.json` (`maxL`, `pals`, bounds, home, default palette). ~2600 tiles, ~17 MB, ~2.5 min. On the site those levels are fetched as images (`fetchTile`) instead of painted, and are never repainted when an area is added (`isBaked`). The starting view on phones and desktops is level 3. Without a manifest (dev server, local build) everything is painted as before.
  - **Region files, no static drawing on the site (task 30, stage 3):** `tools/site.mjs` also writes the whole display list split into 1024-unit regions (`dist/regions/<cx>_<cy>.bin`, binary: `encodeRegion`/`decodeRegion` in `render/tilePainter.ts`; shapes covering more than 6 regions go to `regions/global.bin`), the bounds of every standing thing by creation id (`tiles/static.bin`, `cid` in `prop()`), and the static sign texts and colours (`tiles/static.json`); the manifest gets `regions: { RS }`. When the manifest has regions, the page sets `STATIC.off` (`core/util.ts`): every static `el()` returns one empty dummy, so the static scenery is never built – only the logic of the prefabs runs (places, walk map, labels, effects) – and statics take their bounds from `STATIC_BB`; `initTilesFromRegions` tells the workers where the regions are, and each worker downloads the regions a tile touches before painting it (each shape once, by id). The dev server has no manifest, so it still builds everything the old way – compare the two pixel by pixel after changes (identical at 6 spots and zooms 8–14 on 2026-10-09). 90 region files, 18.6 MB in total (each visitor downloads only what they look at).
  - **Instant picture:** a small inline script in `index.html` reads the manifest, computes the starting view exactly like the camera, and lays the ready tiles out as plain images in `#instant` before the main code runs (~0.4 s locally); it is removed when the live map is fully painted (identical) or at the first camera move. `main.ts` waits (max 1.5 s) until the instant picture has painted before the heavy scene build (the browser cannot paint during it), and the live map takes those tiles straight from the instant `<img>`s (`fetchTile`) instead of downloading them again.
  - **Load order (task 30, stage 4):** `tools/site.mjs` adds `<link rel="modulepreload">` for every startup JS chunk (Pixi, the tile worker), so they download in parallel with the main code; `startPainters()` runs before `prepareGpu`. Workers load `regions/global.bin` (1.7 MB) only when they really paint a tile (at start the visible tiles are baked images). Other-level prefetch (`around(l±1, l±2)`) and the level-0 overview start only after the first view is ready (`warmUp()`, from main), so they do not compete for the network.
  - **Actors in steps (task 30, stage 5):** `buildActors` (`actors/index.ts`) returns a list of build steps (village people, paddock, then wildlife, trains, birds, lizards, ducks, fish, butterflies, clouds, flock). `main.ts` builds only the first (people) before the map shows, the rest in ~8 ms slices between frames (`bgActors`, also when paused; `__boot.allActors` when done, `__actorTimes` per step). Every step runs on its own RNG stream (`withSeed` in `core/rng.ts`, continuing from step to step), so the actors come out exactly as if built in one go even though frames run in between. **The walk network and reachability are baked:** `tools/site.mjs` writes `tiles/nav.bin` (`navPack`/`navLoad` in `world/nav.ts`, 64-bit, identical network, ~305 KB) and `reach` (place id → reachable from the village, `reachPack`/`reachLoad` in `actors/agenda.ts`) into `static.json`; the site downloads nav.bin in parallel with the scene build and loads both before the actors. The upload check compares a signature of the network (`__navSig`) between the site and the full build. `__boot.wait` is the idle wait before building (painters, instant picture) and is not counted in the `bootMs` budget.
  - **Baked logic results (`world/lbake.ts`, task 30 stage 4):** `bakedInts(name, compute)` / `bakedF64(name, compute)`: on the full build the compute runs and its result is stored in `LBAKE.out` (baked into `static.json` as `logic`); on the published site `LBAKE.in` has it and the compute is skipped. Used for: the forest's chosen candidates (`forest0`, indices into the location-based candidate grid – the filtering with `treeOk` and spacing was the heaviest part), the terrain marks on the walk map (`walkTerrain`, the flags after `markTerrain`, run-length encoded), and the automatic bridge crossings (`bridges0..`, x/y/angle/road). A baked compute must not consume the global RNG. The upload check also compares the final walk map (`__walkSig`).
  - **First render:** before the first draw, `main.ts` runs `updateLabels()` and `refreshTextResolution()` – place names are hidden at the home zoom and the hidden labels layer is detached from the Pixi tree (`labels.ts`; Pixi rendered "invisible" text on the first draw because it updates visibility only after building the draw list), and text resolution comes from the exact global transform (`getGlobalTransform`), so every sign is rendered once. The labels layer is also culled (`CULL.layers`), so zooming in renders only the names on screen.
  - **Object logic baked, far objects deferred (task 30, stage 6 item 1):** the full build records, for every object, the global RNG state, the creation id (`cid`) and first place id when it starts, and what changed in its data before drawing (placement rule, bench facing, aligned bridges) and after; at the end the place list, `relocated`, `plotDoors`, and the final walk map (`walkFinal`, `walkPriv`) – all into `LBAKE.out.objs` etc. (`scene/build.ts`). On the published site the final walk map is loaded and frozen (`freezeWalk`: later marks are no-ops), the places come ready (`PLACE_REPLAY`: `addPlace` returns the stored place by order), and only objects inside the first view (`firstView` from `main.ts`, ×1.3 margin) run at boot (`replayObject`: same RNG, cid and places as the full build); the rest run in the background nearest first, before the animals (`deferredObjects`, `runDeferredObject`, `__objsDone`). Street lamps (`lamps`) and the ancient floor's fallen logs (`ancientLogs`) are baked too, because their choice reads the walk map. The upload check waits for `__objsDone`. A prefab must not read the walk map or other objects' results while building (it would see the final map on the site) – the logic check would catch it.
  - **Area work deferred or skipped on the site (task 30, stage 6 item 2):** the final walk map is decoded straight into the grid and frozen *before* the terrain (so no mark is wasted); mountain ranges are skipped on the site (they only draw and mark); the occupancy grid (`stamp` in `geometry.ts`, used only by tree choice and grass drawing) is not built on the site; the forest computes only its chosen candidates (`candAt`), plans only trees inside the first view at boot and the rest in background jobs (`BG_JOBS` in `context.ts`, run by `bgActors` in `main.ts` after the deferred objects; `TREES` is filled in the original order at the end – the bluebirds pick trees by index); auto-bridge trail curves are computed only on the full build. **The page stays small:** the logic data (static bounds, walk map, forest, objects…) is in `tiles/logic.json`, fetched by the inline script in `index.html` only after all instant tiles arrived (or 1.5 s) – on a phone network they competed with the tiles (`window.__LOGIC`, and `window.__NAV` for the walk network at low priority, gzipped by `site.mjs` as `tiles/nav.navz` – an unknown extension on purpose, so no server marks it as encoded – and opened with `DecompressionStream`; `nav.bin` stays as the fallback); only the manifest, sign texts, colours, RNG marks and reachability stay inline (`index.html` 28 KB instead of 210 KB). After changing `geometry.ts` restart the dev server before `npm run bake` (the code hash is computed at start).
  - **Logic by area – for a huge world (task 30, stage 6 item 2b, 2026-10-10):** the baked logic is split into areas of 2048 units (`world/lregions.ts`, `splitRegions` called from the bake page via `__tileBake.bakeLogicRegions`): one file per area `tiles/logic/<rx>_<ry>.json` with its objects' records (RNG state, cid, first place id, data changes, bounds), the places they created, the bounds of their standing things, the chosen forest candidates, the fallen logs (with cid) and its rectangle of the walk map (run-length). A small core (5 KB: terrain places, generator bounds, relocated, plot doors, lamps/bridges bakes, the area list) is inline in the page. At boot only the areas around the first view and the village (home ±500) load – `index.html` starts them right after the instant tiles (`window.__REG`) – and are applied after `initWalk` (`LREG.boot`); the rest load after the first view is ready, nearest first, two at a time (`loadRest` in `main.ts`), and their objects, trees and logs are built in the background (`LREG.newObjs`, `BG_JOBS`). Places of areas not loaded yet are holes in `places` (code that iterates places skips them). The walk network (`nav.navz`) also loads after the first view (`NAVSTATE.pending`): until it arrives every walker starts at home and comes out of the door when it does (people never stand frozen). Actor groups that need the whole world (`WHOLE`: wildlife, bluebirds, birds, lizards) wait for all areas; the rest (paddock, ducks, clouds…) build right away; every group has its own seed (`seedOf(name)`), so the build order does not change them. Region display-list files are gzipped (`regions/*.rgz`, opened in the painter with `DecompressionStream`): 18.6 → 4.8 MB.
  - **Fast zoom on phones (2026-10-10):** arriving tiles are uploaded to the GPU from a queue with a budget of ~4 ms per frame (`uploadSome` in `gpu.ts`; current level and screen centre first; a tile that replaces one already shown uploads at once, so no hole appears); until a tile is uploaded the previous coverage (coarser or finer tiles) stays. Pre-rendered tiles (levels ≤ 3) are downloaded and decoded by the painter workers (`fetch` message in `tilePainter.ts`, up to 4 at a time; answers arrive as ordinary `tile` messages, failures as `tilefail` → painted instead; `doneFetch` in `tiles.ts`); only the instant-picture reuse at boot stays on the page. After a zoom, text is re-rendered at most 3 per frame (`refreshTextResolution(dpr, max)`, `TEXT_MORE`). Phone emulation (CPU ×4): p90 frame 117 → 67 ms, worst time until sharp 0.83 → 0.3 s.
  - **Frame cost by distance and size (task 30, stage 5 part 2):** forest animals, birds, lizards and bluebirds far from the view (more than 250 units off screen) update every 4th frame with the accumulated time, staggered (`farDt`/`updateFar` in `camera/view.ts`); tiny birds (<10 px) and forest animals (<8 px) update their pose every second frame (position every frame); fixed effects update by their on-screen size (`fxAt(x, y, r, f, size)`: under 8 px every 3rd frame, under 24 px every 2nd); smoke puffs set their transform directly (`VNode.setTS`), and `parseTransform` is a hand-written parser without regex or cache (strings are new every frame); ripples smaller than 2 px are not created. With `?debug`, `window.__updT` accumulates ms per update group (`fx`, `people`, `wildlife`…; `frames`).
  - **Scale test (task 30, stage 6):** `node tools/scale.mjs` builds the published site twice – the real world (`dist`) and a 5× test world (`tools/scaleworld.mjs`: the world plus 4 copies eastward of roads, trails and objects; the forest fills the area; wildlife, birds, lizards and clouds ×5) in a separate worktree `../lv-scale` (never touches the real world) – and measures both under phone conditions (headed Chrome, CPU ×4, 150 ms / 1.5 MB/s): page work before the map shows, bytes downloaded until the first view is ready, frame update time (`LIMITS`). About 25 minutes. `--measure <url> <url>` only measures two built sites. First result (2026-10-09): work ×1.84, bytes ×2.33, frame ×1.97 – the objects stage (all objects' logic runs at boot), terrain (walk map size), the walk network file and per-frame updates of all animals grow with the world. It already found that 32-bit static bounds are not exact at far coordinates (now 64-bit).
  - **Draw-only blocks (`drawOnly` in `core/rng.ts`):** terrain blocks that only draw (grass/roads, trails, river, sea, snow, prairie, snow patches) and the rocks generator are wrapped in `drawOnly(STATIC.off, …)`. On the full build they run and record the global RNG state after each block (`RNG_MARKS`, baked into `static.json` as `rng`); on the published site they are skipped and the RNG jumps to the recorded state, so everything after them is identical. A new draw-only block must be wrapped the same way; a block that also creates logic (places, obstacles, trees) must NOT be. Statics bake their pre-scale bounds (`bb0`). `site.mjs` compares the published site's logic (trees, places, object boxes, RNG end) with the full build and fails the upload on any difference.
  - `window.__boot`: `scene`, `tiles`, `actors`, `first` (first frame), `ready` (all visible tiles painted), `bootChunks`. The `?debug` badge shows the real load time on the device (`load 2.3s` = until all tiles on screen are painted). `tileStats.log` records each tile's paint time.
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
  - **At a place (state `stay`)** walkers move to the seat or into the water at their normal walking speed (capped), never gliding fast. **Work pose:** a deep squat with the back bent forward and hands pulling weeds by the feet. Any pose's hand target is clamped to the arm's reach, so an arm never stretches into a straight stick.
  - **The dog has three views** (`Dog` in `people.ts`): side (flipped left/right), front (walking toward the viewer) and back (walking away), built once and cross-faded. Moving: the view follows the direction of motion; standing: it looks at the owner. It switches only when one axis clearly dominates (1.4×), so diagonals don't flicker. The leash collar point follows the view.
  - `people.ts`: Walker plus Rover (walks the road graph; at dead ends it slows, waits 2.5–6 s and turns back), Dog (leash, trot), Balloon (spring), Sitter (`feedPigeons`, `warmHands`), and depth sort every 6 frames.
  - `animals.ts`: Horse (grazing neck), Sheep (wander in the paddock), ducks (lake), fish (jump), butterflies.
  - `wildlife.ts` + `wildlife-art.ts`: forest animals (counts in `actors.wildlife`: 8 rabbits, 8 squirrels, 4 owls, 3 foxes, 2 bears). Each has a fixed home spot chosen by `rngAt` (stable): on walkable ground, not within 22 of a path or water, between the southern ridge and the beach, at least `homeGap` from any home door (bear 800). They roam around their spot (rabbits and squirrels hop, foxes trot, bears walk slowly; owls sit on stumps and turn their heads); they wander a lot (owner's request: "they stand still too long"): short rests, a 35% chance to walk on right after arriving, up to 28 tries per new target (half of them short steps near the current spot, since in dense forest most targets are hidden behind trees), and a quick retry when none is found. Measured share of time moving: fox ~43%, rabbit, squirrel, bear and deer ~31%, horses ~48%, sheep ~34%, never step on paths or water (`clearLine`), and move away from passers-by within 60. They join `dynamics`, so they are depth-sorted with people. Test hook `window.__wildlife`.
    - **Never behind a static thing:** trees, houses and props are part of the static tiles, drawn under every animal, so an animal behind a tree would look like it walks on the tree. `hidden()` checks the animal's box against the drawn boxes of all statics in front of it (a 64-unit grid built once from `statics`); rest spots and every step of a path must be clear.
    - **Three views** like the dog: side (flipped), front (walking toward the viewer) and back (`frontBack` in `wildlife-art.ts`), cross-faded; chosen when one axis clearly dominates (1.3×).
    - **Owls** stay on their stumps but turn their heads smoothly, blink, and every 30–60 s fly a short loop over the stump with flapping wings and land back.
  - **Train passengers** (`people.ts`, `actors/station.ts`): a walker going to the station waits on the platform (`platform`, gives up after 150 s), boards when a train stands at the station (`STATION.stopped`, set by `trains.ts`), is `away` for the place's duration, and comes back by a later train that stops (`alight`), then walks on. A dog waits at the station meanwhile.
  - `trains.ts` + `train-art.ts`: steam trains (`actors.trains`: every 45–90 s, speed 46, stop at x 170 for 7 s). One train at a time enters from a world edge, slows to a stop just past the station, waits, accelerates and leaves; the five locomotives (American, tank, red star, streamlined express, yellow forest engine) come in turn, alternating direction (mirrored so the locomotive leads). Wheels rotate; smoke uses a fixed pool of 14 puffs in the `air` layer. The train joins `dynamics` for depth sorting. The old parked `train` object was removed. Test hook `window.__train()`.
  - `bluebirds.ts`: 7 eastern bluebirds (`actors.bluebirds`) in the trees around Bluebird Pond (the `fishingPond`). Perches come from `TREES` (every forest tree's base and crown box, recorded by the forest generator). States: perch (look, preen, sing with a rising note, tail flick, turn, breathing), hop (to another branch on the same tree), fly (arc with bounding flight: flap bursts and glides, soft landing), drink (on the pond's south shore, dipping the beak). Map scale 0.45 m (`REAL_DYN.bluebird`, 2.5× real) so the design is visible at deep zoom, like trees. Test hook `window.__bluebirds`.
  - **360° movement, no fades (owner rules 2026-10-08, `animals-360` and `no-animal-fades` in `rules.ts`).** `actors/heading.ts` `Heading`: every four-legged animal (forest animals, the dog, horses, sheep) has a heading in any direction, turns toward its target at a limited rate (in an arc, or in place when the turn is sharp, with steps), and always moves exactly where it faces. Its view comes from the heading like animation frames: side, front (toward the viewer) or back, switched instantly with hysteresis, never cross-faded; the left/right mirror changes only while the view is front or back, so an animal never flips on an axis. On a diagonal the side view is slightly foreshortened (`sx`). Horses and sheep got front and back views and now walk anywhere in the paddock. Birds and ducks flip instantly (a bird turns in a quick hop). No animal fades: lizards disappear only into their burrow (see below).
  - **Four-legged walking** (`actors/quad.ts`, `Legs`): two-segment legs with IK knees (the front leg's visible joint points forward, the hind hock points back, as in real animals; reversed looks like walking backwards), far legs behind the body and darker, near legs in front; steps advance by distance (`phase += ds / (unit * cycle)`, cycle = 4·A), so planted feet never slide. Gaits: `trot` (diagonal pairs: fox, dog) and `walk` (four-beat: bear, deer, horse, sheep); the body bobs and the head nods with the steps; the bear rolls its shoulders.
  - **The bear** (redesigned 2026-10-08, sample page `?sample=bear`): a high shoulder hump, a back sloping to a round rump, a soft irregular belly fringe, a head lower than the hump with a long light muzzle; full tapered legs (`LegSpec.shape` [hip, knee, ankle widths] in `quad.ts`) with wide paws and claws (`paw`), hind knees forward and flat hind feet (`bend: 1`, plantigrade); long slow steps (A 4.2), rolling shoulders, the head swinging low with each step, and sniffing the ground at rest. **Scratching:** about 3 in 10 rests it walks to a forest tree near its home (`pickTree`, from `TREES`), stops, turns in place until its back is to the trunk (state `orient`), and rears up step by step with the same drawing (`Legs.rear` in `quad.ts`: the body rotates up to −74° around the hind hips, the hind legs straighten, the front paws leave the ground and hang before the belly, ~1.4 s), rubs up and down with its eyes closed for 7–13 s, and comes down the same way; passers-by within 60 make it come down and move away.
  - **Rabbits and squirrels hop** (`hopPose` in `wildlife.ts`): push with the hind legs (body stretches), flight (front paws reach, ears fold back), land on the front paws; when resting they sometimes sit up (rabbit: nose and ear twitch; squirrel: nibbles a nut, tail waves).
  - **Deer are living animals** (wildlife kind `deer`, 7 of them; the static `deer` objects were removed): they graze most of their rest time (neck down, chewing), look up, flick ears and the white tail; some are bucks with antlers.
  - **Horses** walk around the paddock (mostly sideways, so the side view fits), graze, swish tails and nod; **sheep** have curly fleece and jointed legs; horses and sheep are depth-sorted together.
  - **Ducks**: teardrop body, raised tail, folded wing, waterline, V wake; the mother sometimes dabbles (tail up, head under water); ducklings follow in a line. **Butterflies**: fore and hind wings with spots, flutter bursts and glides, and land on flowers with slowly opening wings.
  - `birds.ts`: 10 house sparrows on the church plaza and the roundabout (they forage in bouts of 2–7 small two-footed hops in a gently turning direction, with tiny pauses and pecks between hops, then stand to look, peck or preen; about 1 decision in 8 is a short low flight to another part of the same square; when someone comes within 34 they flee away from that person; they never leave their square or step into the fountain: `inSq`, the roundabout has an inner radius of 0.45), 4 grey herons on the shores of Duck Lake, Bluebird Pond and Silverwater Lake (slow wading with alternating long legs, freeze, strike with the bill, slow flight with the neck tucked and legs trailing), 10 skylarks in the prairie (hop, and song flights: rise to 80, hover fluttering, descend). Sizes in `REAL_DYN` (sparrow and lark at map scale 0.4 m, heron real 0.95 m). Data `actors.birds`; test hook `window.__birds`.
  - **Ant nests** (`prefabs/ants.ts`, object `antHill {x, y, dir, len, kind: forest|soil}`; 9 in the forest, the prairie and at field edges): a static mound (pine-needle thatch or sandy crater), a faint worn trail and food at its end (a fallen leaf or seeds); the ants are one path per nest in the `fx` layer, drawn only on screen (`fxAt`) and only from 7× the home zoom (fading in to 9×); they walk out and back on the two sides of the trail with small pauses, some carrying a leaf bit, and a few circle the entrance. `dir`/`len` were chosen clear of paths, water, trees and buildings (test hook `window.__trees`: every forest tree's base and crown box).
  - **Lizards** (`actors/lizards.ts`, `actors.lizards.count` 10): each lives in its own patch of tall grass with a flat basking stone south of it (`tallGrass {x, y, rock: [dx, dy]}` in `prefabs/tallgrass.ts`, 10 in the prairie). Seen from above like the ants: an S-shaped body that undulates while running, four sprawled legs in diagonal pairs, a tail that curls at rest, a back stripe, eyes and a quick tongue flick. Each patch has a burrow (`holeOf`, a dark hole at the grass edge opposite the stone): the lizard rests inside it (not drawn), comes out head first – the part still inside is not drawn – runs in short bursts with stops, basks on the stone (raised, turning the head), and goes back in head first; anyone within 45 sends it running into the burrow. No fading. Size `REAL_DYN.lizard` (0.45 m length, map scale). Test hook `window.__lizards`.
  - `ambient.ts`: clouds (with shadows; they fade out at deep zoom) and a bird flock.
- **Camera** (`camera/camera.ts`):
  - `cam {k,x,y}`, screen = world×k + (x,y).
  - fitK: the home view covers the screen when the aspect ratio is within 1.2, otherwise it's contained, but never less than the zoom at which the world covers the screen. minK = that cover zoom. So on any aspect ratio (even 21:9) nothing beyond the world's edge is ever shown: no bands. The maximum is 24×fitK.
  - **Responsive UI** (end of `styles.css`): safe-area insets on all sides; the follow pill and grid card never exceed the screen width; on narrow screens (≤560 px) the follow pill moves to the top; on short screens (≤480 px tall, phone landscape) the buttons form a row and the palette menu opens above them. Checked at 320×568, 390×844, 844×390, 768×1024, 1024×768, 1366×768, 1920×1080 and 2560×1080.
  - Wheel, pinch, drag, double-click, `animateTo` (log-interpolated zoom), tap a character to follow it (in GPU mode, a position hit test `pick()`).
  - GPU mode: everything is one Pixi transform. Fallback: the SVG `#mapD` moves with CSS during a gesture (overscan M = 0.3×max(vw,vh)) and is committed sharp at gesture end.

## 6. The world as it is now (coordinates are world units; y grows downward)
- **Prairie and the great western forest** (2026-10-08, `tools/history/prairie_and_west_forest.py`): everything north of y −2050 was removed (the northern range, frozen lake, ski slope, chapel, observatory, hot spring, turbines, northern chalets, creek and their roads and trails) and is now prairie (`terrain.prairie` {start −2020, full −2380}: a green-gold meadow – large patches of green and dry grass, dense grass tufts in three shades in their own detail groups above the tint, low plant clumps and clover, wildflowers in clusters, lone oaks). The snow is a band in the valley: `terrain.snow` {line −1440, full −1760, thaw [−1900, −2120]}; `winter(y)` rises and melts again into the prairie. West of x −1300 is a huge forest 2000 wide with five trails; in it, **Fernhollow Cabin** (`forestCabin` in `prefabs/cabin.ts`, x −2950, y 1030): a detailed, isolated log cabin in a clearing (3/4 view, logs with chinking and corner ends, stone chimney with smoke, porch, woodpile, chopping block, firepit, vegetable bed), a `visit` place reached by its own trail; the southern lake has a western shore (`terrain.sea.west`).
- **The ancient forest in the east** (task 28, 2026-10-09; owner chose option C of three sketches): the world grew 30 columns east (x 2100 → 5100). From `forest.ancient.x0` (2150) to `x1` (3700) the forest turns gradually into an ancient forest: giant redwoods (`sequoia` in `prefabs/nature.ts`: thick flared reddish trunk, bark lines, moss on the roots, a tall irregular cone of merging dark clumps lit on one side, about twice a pine) and dark ancient firs (`ancientFir`, drooping tiers, snowy in the snow band), spaced wider than the old forest; the floor gets moss patches, ferns, mushrooms and moss-covered fallen logs (`ancientFloor` in `scene/generators.ts`, all by `rngAt`). No large translucent tint layers: they left straight seams between tiles. In the north the prairie turns into forest gradually eastward (prairie details fade out before `terrain.prairie.east` 3600); the snow band continues across; the mountain ranges end at the old edge (`mountains[].end` 2100); south of it the forest reaches the lake, whose sand strip now ends at the lake in a soft tongue. Trails 19, 22 and 25 continue east into the forest; trail 19 ends at **The Old Giant** (`giantRedwood`, x 3800, y −960), a huge named redwood in a mossy clearing with ferns (a `view` place).
  - **Stability when the world grows (lessons):** anything that consumes a random sequence in proportion to the world's width changes the rest of the world when it grows. The mountain ranges draw all their shapes from one sequence per range, so they must keep the same span loop (`end`); the old global-RNG loop in `mountains.ts` is pinned to x 2100; the prairie details are drawn in two passes (the original area to `prairie.legacyX1` 2100 exactly as before, the new strip with its own RNG); tree colours now come from `rngAt` instead of the global RNG.
- **The forest is placed by position** (`forest` in `scene/generators.ts`): a grid of `cell` 52, each cell with `rngAt`; density by zone (village, forest, open, prairie). Changing the map, adding a clearing or an object never moves other trees.
- **North** (y < −1440, before 2026-10-08; most of this north of −2050 is gone, see above):
  - a snowy region behind mountain rows (the tunnels were removed on 2026-10-08; the road crosses an open pass at x ≈ 712);
  - chalets around (440..530, −2010..−2380), a chapel (250, −2420), a frozen lake with skaters and ice huts (−260, −2430), a ski slope (1320..1640, −1880..−2660);
  - an observatory (1560, −2790), wind turbines (−1100.., −2580..−2790), a hot spring (−500, −2700), igloos, snowmen, deer;
  - a cable car (700, −1010) → (980, −1420), a mountain lake (280, −1180). (The cave at (−400, −1395) was removed on 2026-10-08; its mountain anchor stays.)
- **Middle north** (y −1440..0):
  - forest with trails and signposts; a railway at y = −380 (a bridge where the river crosses), a station (170, −406) and a train;
  - a log cabin, a lookout tower (−800, −500), an old stone farmhouse with a walled yard and vegetable garden (`stoneFarm`, −950, 180; it replaced the castle at the owner's request), ruins, beehives, picnic spots, an orchard (−460, 470);
  - a maze (1570, 70), a vineyard (1192..1290, 300..820), a water tower, greenhouses (1520..1690, 1235), a sunflower field (1400, 1380).
- **River:** from the waterfall (1080, −1430) south → into the lake (535, 262; rx 132, ry 112; ducks, fish, reeds) from the north-east → out of the lake at its south-west → through the village (x ≈ 300 at y 640..920, then south-east to x ≈ 500 at y 1350..1500) → into the sea at (540, 2330). It has stone bridges where roads cross and footbridges where trails cross; all were computed from intersections.
- **Roads:** narrow (`ROAD_W` = 32 in `world/geometry.ts`) earthen village lanes with no centre stripe. They have worn patches, pebbles and grass tufts on the verges. Walker lanes, lamp offset (22), bridge widths and plot paths all follow `ROAD_W`. The old global RNG calls are still consumed, so the forest keeps its place.
- **Gradual winter** (task 10a): `terrain.snow.line` (−1440, the southern ridge) to `terrain.snow.full` (−2200, the valley floor). `winter(T)(y)` in `scene/terrain.ts` gives 0..1. In between: translucent straw bands, grass tufts that thin out and turn straw-coloured, snow patches that grow and merge (local RNG), and pines that get snow with probability `winter(y)^1.2`; full snow ground from `snow.full` north. Nothing here uses the global RNG.
- **Sample pages** for owner approval: `?sample=animals` (forest animals, `actors/wildlife-art.ts`) and `?sample=trains` (five steam locomotives with carriages, `actors/train-art.ts`), drawn by `actors/samples.ts` near the lake.
- **Mountains and valley** (`scene/mountains.ts`, data in `terrain.mountains` and `terrain.creek`):
  - **Flat style (owner's request; they disliked strong 3D shading).** Each range is built from separate massifs with gaps (passes) between them. A massif has 1–3 broad peaks, a gently jagged ridge, one body colour, one subtle shadow face, uneven snow caps, foothills and rocks. The broad slopes leave room for future houses, paths and people.
  - `anchors` force a massif behind the waterfall (and where the cave was); `passes` `[[x, half]]` cut an open pass through a range (the road north crosses at x 712, half-width 125). `gaps` sets how sparse a range is: the front range is 0.65.
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
- **The southern lake** (task 11): `terrain.sea` keeps its name, but with `south` (3110) and `east` (1880) it is a calm lake: `lakeShore(T)` in `scene/terrain.ts` gives the wavy east and south shorelines, `inside()` and the water polygon used by the walk map. Land with a sand shore surrounds it in the east and south; it stays open to the west edge (a future sea in the west, task 11a). The old wave strokes still consume the same RNG but are drawn only as small ripples inside the lake. The forest's `noBands` allow trees south of 3160. Swim spots are named after the lake: `terrain.sea.name` "Silverwater Lake" (label at `sea.labelAt`, renamable). Swimmers swim anywhere in the lake: from the beach to random points inside it (`lakeShore().inside`), slowly, and swim back to the shore before leaving (they never walk on water). Swim duration 50–110 s. **Swimming look:** breaststroke (period `SWIM_PERIOD` 2.2 s): the skeleton shows only the head (rising a little on each pull); `swimOverlay` in `people.ts` draws, in the `waterFx` layer and half transparent, the body under the surface, arms gliding forward and sweeping out, frog-kick legs, a foam ring at the neck and a V wake.
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
