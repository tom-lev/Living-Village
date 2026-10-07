# HISTORICAL (one-off, 2026-10-07). Spread the village plots so every house has a real garden
# (owner's request: "more space between the house and the fence"). Run once on world.json at commit ab6fe06.
# Each row of plots along a lane is rebuilt outward from the lane's river end: plot width = house width + 64
# (about 32 of garden on each side, was ~17), the door sits 28 above the plot's lower edge (was 13), and the plot is
# as deep as the space to the next lane allows (up to 112). Lanes are lengthened at their outer end to fit the row.
# The house, and anything that stood inside the old plot (yard tree, bed, mailbox), moves with its plot.
# Object order is unchanged, so residents keep their homes. Do not re-run on the current world.json.
import json, math, sys

P = sys.argv[1]
W = json.load(open(P, encoding='utf-8'))
DRY = '--dry' in sys.argv
N = W['roads']['nodes']
EDGES = W['roads']['edges']


def cubic(a, b, c, d, t):
    u = 1 - t
    return (u**3 * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t**3 * d[0],
            u**3 * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t**3 * d[1])


def edge_pts(e, step=4):
    a, b = N[e[0]], N[e[1]]
    L = math.dist(a, (e[2], e[3])) + math.dist((e[2], e[3]), (e[4], e[5])) + math.dist((e[4], e[5]), b)
    k = max(8, int(L / step))
    return [cubic(a, (e[2], e[3]), (e[4], e[5]), b, j / k) for j in range(k + 1)]


def lane_y(pts, x):
    best = min(pts, key=lambda p: abs(p[0] - x))
    return best[1] if abs(best[0] - x) < 10 else None


LANES = [('W2', 'M'), ('S', 'W2'), ('Wa', 'M2'), ('W3', 'LX'), ('J2', 'Q'), ('J1', 'K'), ('T', 'K2'), ('J3', 'K3'), ('R', 'RX')]
E = {(e[0], e[1]): e for e in EDGES}
objs = W['objects']
plots = [o for o in objs if o['type'] == 'plot']
houses = [o for o in objs if o['type'] == 'house']


def house_of(p):
    return next((h for h in houses if p['x0'] <= h['x'] <= p['x1'] and p['y0'] <= h['y'] <= p['y1']), None)


# 1. which lane and side each plot belongs to
rows = {}
for p in plots:
    cx = (p['x0'] + p['x1']) / 2
    street = p.get('street', 'bottom')
    target = p['y1'] + 31 if street == 'bottom' else p['y0'] - 31
    best = None
    for key in LANES:
        y = lane_y(edge_pts(E[key]), cx)
        if y is not None and (best is None or abs(y - target) < best[0]): best = (abs(y - target), key)
    assert best and best[0] < 12, (p, best)
    rows.setdefault((best[1], street), []).append(p)

# 2. rebuild each row outward from the lane's inner (river) end
GAP, SIDE, FRONT, DEPTH = 14, 32, 28, 112
deg = {}
for e in EDGES: deg[e[0]] = deg.get(e[0], 0) + 1; deg[e[1]] = deg.get(e[1], 0) + 1
moves = []
for (key, street), ps in rows.items():
    inner, outer = N[key[0]], N[key[1]]
    out = 1 if outer[0] > inner[0] else -1
    ps.sort(key=lambda p: p['x0'] * out)
    x = ps[0]['x0'] if out > 0 else ps[0]['x1']
    if deg[key[1]] > 1:
        # הרחוב לא נגמר כאן (צומת): השורה נשארת בתוך הגבולות הישנים שלה ±10, והמגרשים גדלים כמה שאפשר
        lo, hi = min(p['x0'] for p in ps) - 10, max(p['x1'] for p in ps) + 10
        widths = [house_of(p)['w'] + 2 * SIDE for p in ps]
        k = min(1, (hi - lo - GAP * (len(ps) - 1)) / sum(widths))
        x = lo if out > 0 else hi
        for p, w0 in zip(ps, widths):
            pw = w0 * k
            x0, x1 = (x, x + pw) if out > 0 else (x - pw, x)
            x += out * (pw + GAP)
            moves.append((p, house_of(p), key, street, x0, x1))
        print(key, street, 'junction row, kept inside', (lo, hi), 'scale', round(k, 2))
        continue
    for p in ps:
        h = house_of(p)
        pw = h['w'] + 2 * SIDE
        x0, x1 = (x, x + pw) if out > 0 else (x - pw, x)
        x += out * (pw + GAP)
        moves.append((p, h, key, street, x0, x1))
    print(key, street, 'plots', len(ps), 'row ends at', round(x), 'lane end', outer[0])

# 3. lengthen lanes whose row now runs past the end (outer node and its control point move together)
ext = {}
for p, h, key, street, x0, x1 in moves:
    o = N[key[1]]
    out = 1 if o[0] > N[key[0]][0] else -1
    need = (x1 + 40 - o[0]) if out > 0 else (x0 - 40 - o[0])
    if need * out > 0 and deg[key[1]] == 1: ext[key[1]] = max(ext.get(key[1], 0) * out, need * out) * out
print('extend lane ends:', {k: round(v) for k, v in ext.items()})
if not DRY:
    for node, dx in ext.items():
        old = list(N[node])
        N[node] = [round(old[0] + dx), old[1]]
        for e in EDGES:
            if e[1] == node: e[4] = round(e[4] + dx)
            if e[0] == node: e[2] = round(e[2] + dx)
        for o in W['roads']['outer']:   # outer roads that start or end at that node follow it
            if o[0] == old: o[0] = list(N[node]); o[1] += dx
            if o[5] == old: o[5] = list(N[node]); o[3] += dx

# 4. depth: as much as fits before the next lane and before other areas (gardens, fields, paddock...), up to 112
lane_pts = {k: edge_pts(E[k]) for k in LANES}
OBST = []
for o in objs:
    t = o['type']
    if t in ('plot', 'house', 'roundTree', 'pine', 'lamp', 'deer', 'pigeon', 'noTrees', 'footbridge', 'stoneBridge', 'railway', 'train'): continue
    if 'x0' in o and 'x1' in o: OBST.append([o['x0'], o['y0'], o['x1'], o['y1']])
    elif t in ('vegGarden', 'field', 'footballPitch') and 'w' in o: OBST.append([o['x'], o['y'], o['x'] + o['w'], o['y'] + o['h']])
    elif 'cx' in o and 'rx' in o: OBST.append([o['cx'] - o['rx'], o['cy'] - o['ry'], o['cx'] + o['rx'], o['cy'] + o['ry']])
    elif t in ('shop', 'church', 'modernHouse', 'chalet', 'barn', 'windmill', 'greenhouse'): OBST.append([o['x'] - 50, o['y'] - 90, o['x'] + 50, o['y'] + 15])
newrects = []
for p, h, key, street, x0, x1 in moves:
    cx = (x0 + x1) / 2
    ly = lane_y(edge_pts(E[key]), cx)
    if ly is None: ly = p['y1'] + 31 if street == 'bottom' else p['y0'] - 31
    if street == 'bottom':
        y1 = round(ly - 31); lim = -1e9
        for k, pts in lane_pts.items():
            y = lane_y(pts, cx)
            if y is not None and y < ly - 40: lim = max(lim, y + 16 + 10)
        for q in OBST:
            if q[0] < x1 + 6 and q[2] > x0 - 6 and q[3] <= y1 and q[3] > y1 - DEPTH - 10: lim = max(lim, q[3] + 8)
        y0 = round(max(y1 - DEPTH, lim))
    else:
        y0 = round(ly + 31); lim = 1e9
        for k, pts in lane_pts.items():
            y = lane_y(pts, cx)
            if y is not None and y > ly + 40: lim = min(lim, y - 16 - 10)
        for q in OBST:
            if q[0] < x1 + 6 and q[2] > x0 - 6 and q[1] >= y0 and q[1] < y0 + DEPTH + 10: lim = min(lim, q[1] - 8)
        y1 = round(min(y0 + DEPTH, lim))
    newrects.append((p, h, [round(x0), y0, round(x1), y1]))

# 5. apply: plot, house, door, and whatever stood inside the old plot (decided before anything moves,
#    otherwise a house that already moved can land in its neighbour's old plot and move twice)
carried = {}
for p, h, r in newrects:
    old = [p['x0'], p['y0'], p['x1'], p['y1']]
    carried[id(p)] = [o for o in objs if o['type'] not in ('plot', 'house') and 'x' in o and 'y' in o and isinstance(o['x'], (int, float))
                      and old[0] <= o['x'] <= old[2] and old[1] <= o['y'] <= old[3]]
for p, h, r in newrects:
    old = [p['x0'], p['y0'], p['x1'], p['y1']]
    # חצר קדמית של 28, אבל בית שלם (קיר + גג ≈ 76) חייב להיכנס במגרש: במגרש רדוד החצר הקדמית קטנה יותר
    front = max(14, min(FRONT, r[3] - r[1] - (h.get('h', 38) + h.get('rh', 32) + 6)))
    hx, hy = round((r[0] + r[2]) / 2 + (h['x'] - (old[0] + old[2]) / 2) * .4), r[3] - front
    dx, dy = hx - h['x'], hy - h['y']
    inside = carried[id(p)]
    print(h.get('name'), old, '->', r, 'depth', r[3] - r[1], 'house', (h['x'], h['y']), '->', (hx, hy), 'carries', [o['type'] for o in inside])
    if DRY: continue
    for o in inside:
        if o['type'] == 'roundTree':   # the yard tree stays in the back corner on the far side from the door
            o['x'] = r[0] + 16 if hx > (r[0] + r[2]) / 2 else r[2] - 16; o['y'] = r[1] + 34
        else: o['x'] += dx; o['y'] += dy
    p['x0'], p['y0'], p['x1'], p['y1'] = r
    p['door'] = [hx, hy]
    h['x'], h['y'] = hx, hy
    if 'labelAt' in h: del h['labelAt']

# 6. עצים ושאר דברים בודדים שנשארו בתוך מגרש חדש (ולא היו במגרש הישן): עץ נמחק, השאר מדווח
rects = [r for _, _, r in newrects]
keep = []
for o in objs:
    if o['type'] in ('plot', 'house') or 'x' not in o or not isinstance(o.get('x'), (int, float)): keep.append(o); continue
    hit = next((r for r in rects if r[0] - 4 <= o['x'] <= r[2] + 4 and r[1] - 4 <= o['y'] <= r[3] + 4), None)
    yard_tree = o['type'] == 'roundTree' and hit and abs(o['y'] - (hit[1] + 34)) < 1 and (abs(o['x'] - hit[0] - 16) < 1 or abs(o['x'] - hit[2] + 16) < 1)
    if hit and not yard_tree:
        if o['type'] in ('roundTree', 'pine'): print('remove tree in new plot', o); continue
        print('WARNING: object inside a new plot', o)
    keep.append(o)
if not DRY: W['objects'] = keep

if not DRY:
    json.dump(W, open(P, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=1)
    open(P, 'a', encoding='utf-8', newline='\n').write('\n')
