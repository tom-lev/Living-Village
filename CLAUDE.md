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
  - Hebrew/RTL.
  - Bottom-left: + − (hidden on touch), ⤢ (home view), ❚❚/▶ (pause), 🎨 (palette menu). Bottom-right: the zoom label.
  - The follow pill appears when you tap a character.
  - There is no title card (removed at their request).

## 3. Getting started locally
```
git clone https://github.com/tom-lev/Living-Village.git && cd Living-Village
git checkout ccr-7419da80-z53gxw        # ALL work is on this branch (main is far behind)
cd app && npm install && npm run dev    # open the URL, add ?debug
```
- Live site: https://tom-lev.github.io/Living-Village/
- Deploy: `.github/workflows/pages.yml` runs on every push to `main` or `ccr-7419da80-z53gxw`. It does `npm ci && npm run build` in `app/` and copies `app/dist` (+ `.nojekyll`) to the `gh-pages` branch. GitHub Pages serves `gh-pages`. A push is live about 1–2 minutes later.
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
    - **buildings:** house `{x,y,w,h,rh,wall,roof,win,chimney,smoke,door,attic}`, chalet, logCabin, modernHouse `{x,y,w,upper,wall,wood}`, shop `{x,y,name,color,wall,variant: bakery|flowers|barber|icecream}`, church, chapel, barn, windmill, station, lighthouse, waterTower, greenhouse, observatory, lookoutTower, castle, tunnelPortal, well.
    - **props:** bench, lamp, bike, signpost, mailbox, haybale, umbrella, sailboat, buoy, ship, beehives, picnicTable, picnicBlanket, igloo, snowman, skater, iceHut, turbine, cave, scarecrow, footbridge `{x,y,angle}`, stoneBridge `{x,y,angle}`, pier, pigeon, noTrees `{rect}`.
    - **areas:** paddock `{id,x0,y0,x1,y1}`, lake `{id,cx,cy,rx,ry,reeds}`, plaza, fountain, flowerField, vegGarden, tent, campfire, field `{x,y,w,h,a,b,vertical}`, vineyard, orchard, railway, train, mountainLake, cableCar, ruins, playground, fishingPond, footballPitch, maze, sunflowerField, island, rockIslet, frozenLake, skiSlope, hotSpring.
    - **village:** plot `{x0,y0,x1,y1,fence: hedge|picket,door:[x,y],street: top|bottom}`, roundabout `{x,y,r}`.
  - A house on a plot is a `plot`, a `house` whose door sits about 13 above the plot's bottom edge, and optionally a small `roundTree` (s 0.7–0.9) in the back corner.
  - Buildings call `block()` so the forest generator doesn't plant trees over them.
- `y` is the ground line. Objects are depth-sorted by y (`prop(y)`).

### Code modules
- `prefabs/` draw with `el(tag, attrs, parent)` from `core/util.ts`. Static drawing goes into `ctx.L.ground/roads/groundProps/water/props`; animated drawing into `waterFx/cloudShadows/pad/fx/actors/air/clouds`. **All animation is JS** through the `FX` list (`world/context.ts`) or actor `update()`. Never use CSS/SMIL animation.
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
  - a log cabin, a lookout tower (−800, −500), a castle with a moat (−950, 180), ruins, beehives, picnic spots, an orchard (−460, 470);
  - a maze (1570, 70), a vineyard (1192..1290, 300..820), a water tower, greenhouses (1520..1690, 1235), a sunflower field (1400, 1380).
- **River:** from the waterfall (1080, −1430) south → into the lake (535, 262; rx 132, ry 112; ducks, fish, reeds) from the north-east → out of the lake at its south-west → through the village (x ≈ 300 at y 640..920, then south-east to x ≈ 500 at y 1350..1500) → into the sea at (540, 2330). It has stone bridges where roads cross and footbridges where trails cross; all were computed from intersections.
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
**Current task: make zoom and drag perfectly smooth on real devices.** This is the first thing to work on.
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

## 9. Backlog (owner wishes, not started)
- A simple in-browser **editor**: drag objects, add from a list, draw roads and paths, export `world.json`. This was proposed as the next architecture stage after performance.
- **More content.** The empty area north-east of the lake (x 560..800, y 150..640) is a candidate for a café, playground or houses.
- **Behaviors:** characters on footpaths too (not only roads), sitting on benches, entering shops, day/night and seasons. All must stay calm.
- Possibly route walkers around the roundabout island.
