# Living Village: context for Claude

The user writes in Hebrew; reply in Hebrew. Code comments in this repo are in Hebrew, commit messages in English.

## What this is
An illustrated, vector, top-down village map in the browser. You can zoom and pan smoothly (up to 24× without losing sharpness) and small animated characters live in it.
Live site: https://tom-lev.github.io/Living-Village/ (add `?debug` for an fps and render-path badge).

### The owner's rules for this world (keep them)
- Everything **calm, pleasant, no stress and no jitter**. Slow, soft movement and soft colors.
- A mix of old and modern: **no cars**, but there is electricity (street lamps, power lines, solar panels) and modern houses next to old ones.
- Characters walk slowly. Speeds are per character in `world.json` and were lowered 40% at the owner's request.
- Proportions matter: horse ≈ person height at the back, a house door ≈ person height.
- The owner plans **a lot more content**, so performance must not depend on content amount.
- UI is Hebrew/RTL. Controls (+ − ⤢ ❚❚ 🎨) sit bottom-left. The 🎨 menu lists the palettes.

## Getting started on a local machine
```
git clone https://github.com/tom-lev/Living-Village.git && cd Living-Village
git checkout ccr-7419da80-z53gxw        # all recent work is here (main is behind)
cd app && npm install && npm run dev    # open the printed URL, add ?debug
```
First task when resuming: the open performance issue below. Measure on this machine's real GPU before changing code.

## Repo layout
- `app/` is the real project (Vite + TypeScript + PixiJS v8). This is what gets deployed.
- `demo/index.html` is the old single-file version, kept for reference only.
- `code/` and `README.md` are an earlier Hebrew guide about animating characters. They're background reading, not part of the build.
- `.github/workflows/pages.yml` builds `app/` and publishes `app/dist` to the `gh-pages` branch on every push to `main` or `ccr-7419da80-z53gxw`. That branch is where all the work so far has been done. Pages serves from `gh-pages`.

## Commands (in `app/`)
```
npm install
npm run dev        # vite dev server
npm run build      # tsc --noEmit && vite build  (always run before committing)
npm run preview    # serve dist on :4173
node tools/perf.mjs drag|zoom|idle|profile [url] [--phone|--desktop] [--throttle=N] [--headed] [--gpu-sw]
```
`tools/perf.mjs` needs `npm i -D playwright && npx playwright install chromium`. Run it with `--headed` on a machine with a real GPU: headless Chromium without a GPU uses software WebGL, and the numbers are meaningless for the GPU path. For a readable profile, build temporarily with `minify: false` in `vite.config.ts`.

## Architecture (app/src)
- `main.ts`, the boot sequence (inside `async boot()`, **not** top-level await, because TLA deadlocks with Pixi's lazily loaded chunks):
  1. Apply the saved palette.
  2. `prepareGpu()`.
  3. `buildScene()`.
  4. `buildActors()`.
  5. `initTiles()`.
  6. `gpuOverlay()`.
  7. `initCamera()`.
  8. The rAF loop: `actors.update` → `cameraTick` → `renderNow()` (GPU mode draws one combined frame per tick).
  - `window.__village` exposes `cam, walkers, followables, zoomAt, animateTo, startFollow, setRunning, fitK, tileStats, vstats, applyPalette` for tests.
- `world/world.json` is **all content** as data:
  - seed and palettes;
  - `home` (the 800×1700 home view) and `bounds` (the whole world: x −1300..2100, y −3100..3300);
  - roads (graph `nodes`/`edges` as cubic Béziers that the walkers use, plus `outer` decorative roads), trails and the river polyline;
  - terrain, `objects` (a prefab type plus params), generators (forest, lamps, power line, rocks);
  - actors (walkers, companions, sitters, horses, sheep, ducks, fish, butterflies, clouds, flock).
  - `world/palettes-archive.json` holds palettes removed from the menu ('מקורית', 'פילם 90'). To restore one, copy it back into `palettes`.
- `prefabs/` are drawing functions registered by type name:
  - `nature`: trees, deer;
  - `buildings`: house, shop, church, modernHouse, …;
  - `props`: bench, lamp, bridges, …;
  - `areas`: paddock, lake, plaza, fields, …;
  - `village`: plot (a garden lot with a hedge or picket fence, a path and a flower bed) and roundabout.
  - Static things go into `ctx.L.ground/roads/groundProps/water/props`. Animated things go into `waterFx/cloudShadows/pad/fx/actors/air/clouds`. Effects animate through the `FX` list in `world/context.ts`, never through CSS animations.
- `scene/`: `build.ts` (order: palette → layers → geometry → terrain → objects → generators → sort), `terrain.ts`, `generators.ts`.
- `world/geometry.ts`: road/river Béziers, an occupancy grid, and `treeOk` (trees avoid roads, the river, `NO_TREE` blocks and water).
- `core/palette.ts`: every color goes through `grade()` when an element is created via `el()`. Palettes can chain (`base`) and have a film grade: blackPoint, split toning and grain (grain is currently 0). Original colors are remembered per element so palettes switch live (`regrade` plus `repaintTiles`).
- **Static layer, the tile engine** (`render/tiles.ts`, `tilePainter.ts`, `tileWorker.ts`):
  - The static SVG is built once, flattened into a display list, then painted by 1–2 Web Workers (OffscreenCanvas) into 256 px tiles.
  - Levels go from BASE = 1/8 px per unit up to LMAX = 10. Static density is capped at 2× DPR.
  - Requests are prioritised: the screen, a ring around it, l+1 over 70% of the view, l−1 over 2×, l+2 over 30%, l−2 over 4×. The list is **budgeted to fit TILE_CAP = 300**, and tiles in the wanted set are never evicted. Without that, prefetched tiles evicted each other and the workers repainted about 120 tiles/s forever.
  - The list is rebuilt only when the visible tile range changes.
- **GPU path** (`render/gpu.ts`, PixiJS):
  - Each tile becomes a texture uploaded on arrival. Coarser levels sit under the current one, so there are no holes.
  - Visibility only changes for tiles entering or leaving the screen.
  - Software WebGL is refused (`failIfMajorPerformanceCaveat`), and then the old 2D-canvas plus SVG path is used. `?forcegpu` forces the GPU path, for tests only.
- **Dynamic layer on the GPU** (`render/vnode.ts`):
  - VNode is an SVG-compatible shim. `el()` creates VNodes when the parent is a VNode, so actor and effect code is unchanged.
  - Shapes become Pixi Graphics built at S = 8× internal scale, so curves stay smooth at deep zoom.
  - Shapes rebuild lazily (`flushVNodes`), and only when an attribute value really changes.
  - Each dynamic layer is a Pixi render group.
  - The `clip-path` (barber pole) and the `url(#fireGlow)` gradient have special handling.
- `actors/`:
  - `figure.ts`: people are a skeleton of capsules (round-capped strokes built once, then moved and rotated each frame through `place()`/`bone()`), plus head, hair and face built once per view. Uses IK and distance-based steps.
  - `people.ts`: Walker, Rover (follows the road graph), Dog with leash, Balloon, Sitter.
  - `animals.ts`: Horse (`scale`), Sheep (`scale`), ducks, fish, butterflies.
  - `ambient.ts`: clouds, birds.
- `camera/camera.ts`: pinch, wheel, drag, `animateTo` and follow. In GPU mode the whole world is one Pixi transform. In fallback mode the SVG layer moves with CSS during a gesture and is committed sharp at the end. Tapping a character uses a position hit test in GPU mode.

## Performance: what we learned
Things that hurt, and the fix:
- A per-tile crossfade forced constant redraws. Removed.
- More than 2 workers compete with frame drawing on phones.
- Rendering tiles at 3× DPR is 2.25× the work for no visible gain, hence the 2× cap.
- `mix-blend-mode: overlay` grain is costly on mobile GPUs. It's now plain alpha, and grain is 0 anyway.
- A prefetch list bigger than the cache caused endless repainting. Now budgeted.
- Toggling visibility of every tile every frame forces Pixi to rebuild its instructions.
- Rebuilding every limb path every frame (140 Graphics a frame) dropped to 20 with the capsule skeleton.

Current JS per frame in the GPU path is about 5 ms on the dev container (measured with software WebGL; real GPU timings are unknown).

**Open issue (the owner's latest report):** zoom and drag are much better but **still not perfectly smooth** on both phone and desktop. The `?debug` badge shows `gpu`; fps dips during fast zooms. Next steps, roughly in order:
1. Measure on the owner's real hardware: `tools/perf.mjs zoom|drag --headed`, and Chrome DevTools Performance on desktop. Find whether the dips come from JS, texture uploads or GPU.
2. A texture upload budget: upload at most N new tiles per frame, visible first. Right now every arriving tile is uploaded immediately in the message handler.
3. Culling (step 3 of the plan): skip `update()` and `flushVNodes` for actors and effects off screen, and set `visible = false` on off-screen dynamic groups (only when they cross the view edge, to avoid instruction rebuilds).
4. Reduce the remaining per-frame Graphics rebuilds (dog legs, leash, skirts, ripples added/removed) and the per-frame `parseTransform` of transform strings: use direct `c.position/rotation/scale` like `place()`.
5. If still needed: pre-baked character sprite atlases (frames per view), and fewer or larger tiles at deep zoom.

## Plan / wishes not done yet
- A simple in-browser editor: drag objects, draw roads and paths, export `world.json`.
- More content. The empty area north-east of the lake is a candidate for a café, playground or houses.
- Behaviors: characters on footpaths, sitting on benches, entering shops, day/night.
- The village layout ("village on the river") was generated once by a Python script (not in the repo). `world.json` is now the source of truth: edit objects directly. Houses are explicit `plot` + `house` (+ `roundTree`) objects along residential lanes, and the lanes continue past the home view to the west (to x −270) and east (to x 1030).
