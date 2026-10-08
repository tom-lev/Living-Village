# HISTORICAL (one-off, 2026-10-08). Owner's request: "everything north of row 11 becomes prairie (gradually, connecting
# naturally to the existing land); extend the map north if needed; extend the map west with a huge forest 20 blocks wide."
# Decisions: remove everything north of the line, extend 10 blocks north, close the southern lake with a western shore.
# Run once on world.json at commit 4214879. Do not re-run.
import json, sys

P = sys.argv[1]
W = json.load(open(P, encoding='utf-8'))
LINE = -2050                 # the middle of row 11 (rows counted from the old top edge, -3100)
NORTH, WEST = 1000, 2000     # 10 blocks north, 20 blocks west

x0, y0, x1, y1 = W['bounds']
W['bounds'] = [x0 - WEST, y0 - NORTH, x1, y1]


def ys(o):
    """the y values that say where an object is"""
    if 'y' in o and isinstance(o['y'], (int, float)): return [o['y']]
    if 'cy' in o: return [o['cy']]
    if 'y0' in o: return [o['y0'], o['y1']]
    if 'rect' in o: return [o['rect'][1], o['rect'][3]]
    if 'a' in o and isinstance(o['a'], list): return [o['a'][1], o['b'][1]]
    return []


keep, gone = [], []
for o in W['objects']:
    Y = ys(o)
    if Y and min(Y) < LINE: gone.append((o['type'], o.get('name'))); continue
    keep.append(o)
W['objects'] = keep
print('removed', len(gone), sorted({g[0] for g in gone}))

# roads that lead north: keep the road from the tunnel to the chalets and North Lodge, drop the two that run deep north
outer = W['roads']['outer']
W['roads']['outer'] = [o for o in outer if not (o[0] == [600, -2120] and o[5] in ([-120, -2290], [1560, -2760]))]
print('outer roads', len(outer), '->', len(W['roads']['outer']))
assert len(W['roads']['outer']) == len(outer) - 2

# trails: cut everything north of the line (a cut end fades into the grass by itself)
trails = []
for t in W['trails']:
    pts = [p for p in t if p[1] >= LINE - 60]
    if len(pts) >= 2: trails.append(pts)
print('trails', len(W['trails']), '->', len(trails))
W['trails'] = trails

T = W['terrain']
T['mountains'] = [m for m in T['mountains'] if m['baseY'] > LINE]   # the northern range goes
T.pop('creek', None)                                                 # the frozen creek was north of the line
T['snow'] = {'line': -1440, 'full': -1760, 'thaw': [-1900, -2120], 'patches': 0, 'patchesTo': -1760}
T['prairie'] = {'start': -2020, 'full': -2380}
T['sea']['west'] = x0 + 40                                            # the lake's western shore, near the old edge
T['grass']['patches'] = 780
T['grass']['tufts'] = 15000

for g in W['generators']:
    if g['type'] == 'forest':
        g['noBands'] = [b for b in g['noBands'] if b[0] != -99999 and b[0] != 2190]
        g['density']['prairie'] = .035
        g['cell'] = 13
        g.pop('attempts', None); g.pop('max', None)

# the huge western forest: a few trails into it, joined automatically to the roads and trails that end at the old edge
W['trails'] += [
    [[-860, 235], [-1250, 300], [-1650, 240], [-2050, 380], [-2500, 320], [-2950, 450]],
    [[-870, 2050], [-1300, 1900], [-1800, 1950], [-2300, 1760], [-2850, 1820]],
    [[-2050, 380], [-2170, 800], [-2060, 1300], [-2300, 1760]],
    [[-1650, 240], [-1720, -300], [-1900, -880], [-2150, -1280]],
    [[-2500, 320], [-2700, 1000], [-2950, 1350]],
]

W['actors']['wildlife'] = {'rabbit': 14, 'squirrel': 14, 'owl': 7, 'fox': 5, 'bear': 4}

s = json.dumps(W, indent=1, ensure_ascii=False) + '\n'
old = '''   [
    735,
    185
   ],
   [
    728,
    150
   ],
   [
    702,
    118
   ],
   [
    662,
    86
   ],
   [
    600,
    72
   ],
'''
if s.count(old) == 1: s = s.replace(old, '   [735, 185], [728, 150], [702, 118], [662, 86], [600, 72],\n')
open(P, 'w', encoding='utf-8', newline='\n').write(s)
