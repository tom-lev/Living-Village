# HISTORICAL (one-off). Generated the current "village on the river" layout in world.json from the
# previous world (input IN = app/src/world/world.json at commit 82b0ad5, before the relayout commit 022e13f). Kept for reference:
# it shows how roads, plots, bridges and riverside trees were placed. world.json is now the source of truth;
# do not re-run on the current world.json (it would remove and duplicate content).

"""Village relayout: river through the village, roundabout centre, streets with plots.
Reads app/src/world/world.json (current world), rewrites the village part, writes it back."""
import json, math, random, sys

IN = 'world_before_relayout.json'   # git show 82b0ad5:app/src/world/world.json > world_before_relayout.json
P = 'world_after_relayout.json'
W = json.load(open(IN))
rng = random.Random(1990)

# ───────── geometry helpers ─────────
def catmull(pts, step=6):
    """Sample a Catmull-Rom spline (same as smoothOpen in the app)."""
    out = []
    n = len(pts)
    for i in range(n - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(n - 1, i + 2)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        L = math.dist(p1, p2); k = max(2, int(L / step))
        for j in range(k):
            out.append(cubic(p1, c1, c2, p2, j / k))
    out.append(tuple(pts[-1]))
    return out

def cubic(a, b, c, d, t):
    u = 1 - t
    return (u**3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t**3 * d[0],
            u**3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t**3 * d[1])

def sample_cubic(a, b, c, d, step=6):
    L = math.dist(a, b) + math.dist(b, c) + math.dist(c, d); k = max(4, int(L / step))
    return [cubic(a, b, c, d, j / k) for j in range(k + 1)]

def via(a, m, b):
    """Cubic controls for a curve a→b passing through m at t=.5 (quadratic raised to cubic)."""
    q = (2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2)
    return [round(a[0] + 2 / 3 * (q[0] - a[0])), round(a[1] + 2 / 3 * (q[1] - a[1])),
            round(b[0] + 2 / 3 * (q[0] - b[0])), round(b[1] + 2 / 3 * (q[1] - b[1]))]

def seg_inter(p, p2, q, q2):
    r = (p2[0] - p[0], p2[1] - p[1]); s = (q2[0] - q[0], q2[1] - q[1])
    den = r[0] * s[1] - r[1] * s[0]
    if abs(den) < 1e-9: return None
    t = ((q[0] - p[0]) * s[1] - (q[1] - p[1]) * s[0]) / den
    u = ((q[0] - p[0]) * r[1] - (q[1] - p[1]) * r[0]) / den
    if 0 <= t <= 1 and 0 <= u <= 1: return (p[0] + t * r[0], p[1] + t * r[1]), math.degrees(math.atan2(r[1], r[0]))
    return None

def crossings(path, river):
    hits = []
    for i in range(len(path) - 1):
        for j in range(len(river) - 1):
            h = seg_inter(path[i], path[i + 1], river[j], river[j + 1])
            if h: hits.append(h)
    return hits

def dist_to(pts, x, y):
    return min(math.hypot(px - x, py - y) for px, py in pts)

# ───────── 1. river ─────────
RIVER = [[1080, -1430], [1120, -1150], [1050, -880], [1100, -640], [1050, -420], [985, -260], [860, -80], [745, 55], [650, 170],
         [560, 250], [450, 330], [380, 420], [330, 520], [300, 640], [298, 780], [330, 920], [400, 1060], [470, 1200], [500, 1350],
         [490, 1500], [520, 1650], [555, 1800], [540, 1960], [522, 2120], [540, 2330]]
W['river'] = RIVER
RS = catmull(RIVER, 5)

# ───────── 2. roads inside the village ─────────
N = {'N0': [250, 30], 'B': [480, 485], 'R': [560, 770], 'C': [690, 480], 'D': [735, 185], 'RX': [794, 865],
     'S': [560, 1030], 'W2': [190, 992], 'M': [-270, 1010],
     'Wa': [205, 1160], 'M2': [-270, 1165], 'W3': [245, 1318], 'LX': [-300, 1300], 'J2': [300, 1470], 'Q': [-260, 1480], 'BX': [410, 1694],
     'J1': [596, 1150], 'K': [1030, 1135], 'T': [628, 1300], 'K2': [1030, 1300], 'J3': [652, 1450], 'K3': [1020, 1460], 'U': [690, 1610]}
VIA = {('N0', 'B'): (300, 330), ('B', 'R'): (530, 620), ('R', 'C'): (640, 640), ('C', 'D'): (735, 330), ('R', 'RX'): (680, 835),
       ('R', 'S'): (575, 900), ('S', 'W2'): (370, 1000), ('W2', 'M'): (-40, 990),
       ('W2', 'Wa'): (192, 1075), ('Wa', 'M2'): (-40, 1170), ('Wa', 'W3'): (220, 1240), ('W3', 'LX'): (-30, 1325),
       ('W3', 'J2'): (268, 1395), ('J2', 'Q'): (20, 1490), ('J2', 'BX'): (360, 1590),
       ('S', 'J1'): (578, 1090), ('J1', 'K'): (810, 1150), ('J1', 'T'): (612, 1225), ('T', 'K2'): (830, 1310),
       ('T', 'J3'): (640, 1375), ('J3', 'K3'): (840, 1462), ('J3', 'U'): (672, 1530)}
EDGES = []
for (a, b), m in VIA.items():
    EDGES.append([a, b] + via(N[a], m, N[b]))
W['roads']['nodes'] = N
W['roads']['edges'] = EDGES
W['roads']['outer'][0] = [[250, 30], 240, -120, 280, -280, [300, -380]]
W['roads']['outer'][2] = [[-300, 1300], -300, 1300, -300, 1300, [-300, 1300]]   # הרחוב עצמו מגיע עכשיו עד לשם
ROAD_PTS = {}
for e in EDGES:
    a, b = N[e[0]], N[e[1]]
    ROAD_PTS[(e[0], e[1])] = sample_cubic(a, (e[2], e[3]), (e[4], e[5]), b, 5)
ALL_ROAD = [p for v in ROAD_PTS.values() for p in v]
OUTER_PTS = [sample_cubic(o[0], (o[1], o[2]), (o[3], o[4]), o[5], 6) for o in W['roads']['outer']]

# ───────── 3. remove the old village ─────────
def old_village(o):
    t = o['type']
    if t in ('lake',): return False
    if t == 'church': return True
    if t in ('house', 'well') and -460 <= o.get('x', 0) <= -150 and 1230 <= o.get('y', 0) <= 1420: return True
    if t == 'noTrees' and o['rect'][0] >= 0 and o['rect'][2] <= 800: return True
    x = o.get('x', o.get('x0', o.get('cx')))
    y = o.get('y', o.get('y0', o.get('cy')))
    if x is None: return False
    if -40 <= x <= 840 and -20 <= y <= 1720: return t not in ('deer',)
    return False
removed = [o['type'] for o in W['objects'] if old_village(o)]
objs = [o for o in W['objects'] if not old_village(o) and o['type'] not in ('stoneBridge', 'footbridge')]
print('removed', len(removed), 'objects:', sorted(set(removed)))

# outside fixes for the new river course
for o in objs:
    if o['type'] == 'field' and o['x'] == 470 and o['y'] == 2010: o['x'], o['w'] = 590, 200
    if o['type'] == 'umbrella' and o['x'] == 540: o['x'] = 650
    if o['type'] == 'orchard': o['rows'] = 9
    if o['type'] == 'railway':
        h = crossings([(-2000, -380), (3000, -380)], RS); o['bridgeX'] = round(h[0][0][0])

new = []
RES = []   # reserved rects [x0,y0,x1,y1] (no plots)
for o in objs:   # existing world objects near the extended streets
    if 'x0' in o and 'x1' in o: RES.append([o['x0'], o['y0'], o['x1'], o['y1']])
    elif o['type'] in ('field',): RES.append([o['x'], o['y'], o['x'] + o['w'], o['y'] + o['h']])
    elif o['type'] == 'orchard': RES.append([o['x'] - 20, o['y'] - 40, o['x'] + o['cols'] * o['dx'] + 20, o['y'] + o['rows'] * o['dy']])
    elif 'x' in o and 'y' in o: RES.append([o['x'] - 45, o['y'] - 60, o['x'] + 45, o['y'] + 20])
def add(o, res=None):
    new.append(o)
    if res: RES.append(res)

# ───────── 4. centre: roundabout, shops, church ─────────
R = N['R']
add({'type': 'roundabout', 'x': R[0], 'y': R[1], 'r': 46}, [R[0] - 75, R[1] - 75, R[0] + 75, R[1] + 75])
add({'type': 'fountain', 'x': R[0], 'y': R[1] + 6})
SHOPS = [(440, 718, 'מאפייה', '#e2574c', '#fff4dc', 'bakery'), (688, 718, 'פרחים', '#45a85a', '#effaf1', 'flowers'),
         (690, 950, 'מספרה', '#3d7bd9', '#eef3ff', 'barber'), (445, 938, 'גלידה', '#ef6fa4', '#ffeef5', 'icecream')]
for x, y, name, c, wall, v in SHOPS:
    add({'type': 'shop', 'x': x, 'y': y, 'name': name, 'color': c, 'wall': wall, 'variant': v}, [x - 58, y - 92, x + 58, y + 18])
add({'type': 'bike', 'x': 498, 'y': 722, 'color': '#e2574c', 'flip': 1})
add({'type': 'bike', 'x': 512, 'y': 724, 'color': '#3d9bd9', 'flip': -1})
add({'type': 'bike', 'x': 632, 'y': 955, 'color': '#ffd23f', 'flip': -1})
add({'type': 'bench', 'x': 470, 'y': 812}); add({'type': 'bench', 'x': 650, 'y': 812})
add({'type': 'pigeon', 'x': 492, 'y': 826, 'flip': 1}); add({'type': 'pigeon', 'x': 506, 'y': 820, 'flip': -1}); add({'type': 'pigeon', 'x': 486, 'y': 836, 'flip': 1})
# church by the river with a small square in front
add({'type': 'plaza', 'x': 420, 'y': 600, 'rx': 62, 'ry': 30}, None)
add({'type': 'church', 'x': 418, 'y': 585}, [350, 420, 495, 640])

# ───────── 5. west bank: paddock, garden, camp ─────────
PAD = {'type': 'paddock', 'id': 'paddock', 'x0': 25, 'y0': 470, 'x1': 240, 'y1': 720}
add(PAD, [5, 450, 262, 742])
add({'type': 'vegGarden', 'x': 40, 'y': 780, 'w': 200, 'h': 70}, [25, 765, 255, 865])
add({'type': 'scarecrow', 'x': 150, 'y': 835})
add({'type': 'tent', 'x': 110, 'y': 270}, [50, 190, 175, 290])
add({'type': 'campfire', 'id': 'campfire', 'x': 180, 'y': 292}, [150, 250, 225, 310])
add({'type': 'flowerField', 'id': 'flowerField', 'x': 150, 'y': 1625, 'rx': 105, 'ry': 45}, [35, 1575, 265, 1675])
add({'type': 'mailbox', 'x': 336, 'y': 1300})

# lakeside
add({'type': 'bench', 'x': 700, 'y': 300}); add({'type': 'bench', 'x': 420, 'y': 150})

# ───────── 6. trails ─────────
trails = [t for t in W['trails'] if t[0] != [60, 600]]
trails.append([[290, 345], [180, 400], [130, 455]])                              # farm track to the paddock gate
trails.append([[130, 455], [-120, 560], [-170, 800]])                             # into the western forest
trails.append([[735, 185], [700, 95], [600, 70], [470, 95], [390, 160], [330, 250]])   # north shore of the lake
def offset_path(pts, d, y0, y1, step=40):
    out, last = [], None
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        if not (y0 <= y <= y1): continue
        tx, ty = pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]; L = math.hypot(tx, ty)
        q = (round(x - ty / L * d), round(y + tx / L * d))
        if last is None or math.dist(q, last) >= step: out.append(list(q)); last = q
    return out
riverwalk_e = offset_path(RS, -62, 470, 1000)     # east bank, from the church to the middle bridge
riverwalk_w = offset_path(RS, 60, 1080, 1690)     # west bank, down to the beach road
trails += [riverwalk_e, riverwalk_w]
W['trails'] = trails
TRAIL_PTS = [p for t in trails for p in catmull(t, 6)]

# ───────── 7. bridges (computed) ─────────
for (a, b), pts in ROAD_PTS.items():
    for (x, y), ang in crossings(pts, RS):
        add({'type': 'stoneBridge', 'x': round(x), 'y': round(y), 'angle': round(ang)})
for pts in OUTER_PTS:
    for (x, y), ang in crossings(pts, RS):
        add({'type': 'stoneBridge', 'x': round(x), 'y': round(y), 'angle': round(ang)})
for t in trails:
    for (x, y), ang in crossings(catmull(t, 6), RS):
        add({'type': 'footbridge', 'x': round(x), 'y': round(y), 'angle': round(ang)})

# ───────── 8. plots and houses along streets ─────────
ROOFS = ['#e2574c', '#7a52a8', '#f29e38', '#3d9bd9', '#e96aa4', '#4caf50', '#d9473d', '#3d6fd0']
WALLS = ['#fff3d6', '#fffaf0', '#fde9c8', '#fffaf2', '#fdeccc']
lake = next(o for o in W['objects'] if o['type'] == 'lake')
def in_lake(x, y, pad):
    return ((x - lake['cx']) / (lake['rx'] + pad)) ** 2 + ((y - lake['cy']) / (lake['ry'] + pad)) ** 2 < 1
CANDS = []
def rect_ok(r):
    why = _rect_ok(r); CANDS.append((r, why)); return why == 'ok'
def _rect_ok(r):
    x0, y0, x1, y1 = r
    if x0 < -420 or x1 > 1150 or y0 < 20 or y1 > 1690: return 'bounds'
    for q in RES:
        if x0 < q[2] + 6 and x1 > q[0] - 6 and y0 < q[3] + 6 and y1 > q[1] - 6: return 'res'
    pts = [(x, y) for x in (x0, (x0 + x1) / 2, x1) for y in (y0, (y0 + y1) / 2, y1)]
    for (x, y) in pts:
        if in_lake(x, y, 18): return 'lake'
    cx, cy, hw, hh = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    def near(P, d):
        return any(abs(px - cx) < hw + d and abs(py - cy) < hh + d for px, py in P)
    if near(ALL_ROAD, 27): return 'road'
    if near(RS, 34): return 'river'
    if near(TRAIL_PTS, 8): return 'trail'
    if any(near(o, 30) for o in OUTER_PTS): return 'outer'
    return 'ok'

# residential streets: rows of plots on the north side, houses facing the street
LANES = [('W2', 'M'), ('S', 'W2'), ('Wa', 'M2'), ('W3', 'LX'), ('J2', 'Q'), ('J1', 'K'), ('T', 'K2'), ('J3', 'K3'), ('R', 'RX')]
def lane_y(pts, x):
    best = min(pts, key=lambda p: abs(p[0] - x)); return best[1] if abs(best[0] - x) < 8 else None
houses = 0
for key in LANES + [('N0', 'B')]:
    pts = ROAD_PTS[key]
    xs = sorted(p[0] for p in pts); x0, x1 = xs[0], xs[-1]
    for side in ('north', 'south'):
        x = x0 + 8
        while x < x1 - 30:
            pw, ph = rng.choice([86, 90, 94]), rng.choice([80, 84])
            cx = x + pw / 2
            span = [p[1] for p in pts if x - 4 <= p[0] <= x + pw + 4]
            if len(span) < 3 or lane_y(pts, cx) is None: x += 12; continue
            if side == 'north': ly = min(span); r = [round(x), round(ly - 31 - ph), round(x + pw), round(ly - 31)]
            else: ly = max(span); r = [round(x), round(ly + 31), round(x + pw), round(ly + 31 + ph)]
            if not rect_ok(r): x += 12; continue
            hx = round(cx + rng.uniform(-5, 5)); hy = r[3] - 13
            add({'type': 'plot', 'x0': r[0], 'y0': r[1], 'x1': r[2], 'y1': r[3], 'fence': rng.choice(['hedge', 'hedge', 'picket']),
                 'door': [hx, hy], 'street': 'bottom' if side == 'north' else 'top'}, [r[0] - 3, min(r[1], hy - 75), r[2] + 3, r[3] + 3])
            add({'type': 'house', 'x': hx, 'y': hy, 'w': rng.choice([48, 52, 56]), 'h': rng.choice([36, 38, 40]), 'rh': rng.choice([30, 32, 34]),
                 'wall': rng.choice(WALLS), 'roof': rng.choice(ROOFS), 'win': 1, 'chimney': rng.random() < .45})
            if rng.random() < .6:
                tx2 = r[0] + 13 if hx > cx else r[2] - 13
                add({'type': 'roundTree', 'x': tx2, 'y': r[1] + 34, 's': round(rng.uniform(.7, .9), 2)})
            houses += 1; x += pw + 14
print('houses', houses)

# a few modern houses in the south-east cul-de-sac (already placed by plots? replace some)
# ───────── 9. riverside park trees ─────────
for i in range(0, len(RS), 9):
    x, y = RS[i]
    if not (60 < y < 1680): continue
    for side in (1, -1):
        if rng.random() < .45: continue
        j = min(len(RS) - 2, i + 1); tx, ty = RS[j][0] - RS[i - 1][0], RS[j][1] - RS[i - 1][1]; L = math.hypot(tx, ty) or 1
        d = rng.uniform(56, 80); px, py = x - ty / L * d * side, y + tx / L * d * side
        r = [px - 12, py - 40, px + 12, py + 4]
        if not (10 < px < 790) or in_lake(px, py, 20): continue
        if any(r[0] < q[2] and r[2] > q[0] and r[1] < q[3] and r[3] > q[1] for q in RES): continue
        if dist_to(ALL_ROAD, px, py) < 40 or dist_to(TRAIL_PTS, px, py) < 14 or dist_to(RS, px, py) < 48: continue
        add({'type': 'roundTree', 'x': round(px), 'y': round(py), 's': round(rng.uniform(1.0, 1.35), 2)}, [px - 14, py - 44, px + 14, py + 6])

W['objects'] = new + objs   # village first, then the rest of the world (same order rules as before)

# ───────── 10. generators and actors ─────────
for g in W['generators']:
    if g['type'] == 'forest':
        g['villageForest'] = [[0, 0, 800, 30], [770, 0, 800, 1700], [0, 0, 22, 1700], [0, 1675, 800, 1700], [0, 0, 220, 190]]
A = W['actors']
A['horses'][0].update(x=90, y=640); A['horses'][1].update(x=175, y=560)
A['sheep']['positions'] = [[60, 540], [200, 650], [120, 690], [190, 520]]
A['sitters'][0].update(x=473, y=812)            # grandpa on the bench by the roundabout, feeding pigeons
A['sitters'][1].update(x=214, y=293)            # Tamar by the campfire
A['butterflies'].update(x=100, y=1625)
A['clouds']['fixed'] = [[120, 160, 1], [640, 600, 0.9], [230, 1080, 1.1], [620, 1430, 0.9]]

json.dump(W, open(P, 'w'), ensure_ascii=False, indent=1)
print('objects', len(W['objects']), 'trails', len(W['trails']))
if '--dbg' in sys.argv:
    from PIL import Image, ImageDraw
    im = Image.new('RGB', (800, 1700), 'white'); d = ImageDraw.Draw(im)
    for p in ALL_ROAD: d.ellipse([p[0] - 25, p[1] - 25, p[0] + 25, p[1] + 25], fill=(235, 215, 180))
    for p in RS: d.ellipse([p[0] - 25, p[1] - 25, p[0] + 25, p[1] + 25], fill=(150, 200, 230))
    for q in RES: d.rectangle(q, outline=(150, 150, 150))
    col = {'res': (200, 0, 200), 'road': (230, 120, 0), 'river': (0, 0, 220), 'trail': (0, 160, 160), 'lake': (0, 0, 120), 'bounds': (160, 160, 160), 'outer': (0, 0, 0)}
    for r, w in CANDS:
        if w != 'ok': d.rectangle(r, outline=col[w])
    for r, w in CANDS:
        if w == 'ok': d.rectangle(r, outline=(0, 160, 0), width=3)
    from collections import Counter; print(Counter(w for r, w in CANDS))
    im.save('/tmp/claude-0/-home-user-Living-Village/767319a9-06c6-584f-93cd-313be847e976/scratchpad/dbg.png')
