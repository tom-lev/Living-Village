/* צייר האריחים: מקבל את רשימת הציור פעם אחת, ואז מצייר אריחי bitmap לפי בקשה.
   רץ בתוך Web Worker; בדפדפן בלי OffscreenCanvas אותו קוד רץ בדף עצמו. */
export interface DLItem {
  d: string; m: number[]; a: number; det: boolean; bb: number[];
  fill: string | null; stroke: string | null; sw: number; cap: string; join: string; dash: number[] | null;
  p?: Path2D;
}
export interface TileMsg { type: 'tile'; l: number; i: number; j: number; bmp: any }

const DLC = 160;   // גודל תא באינדקס המרחבי

export function createPainter(post: (m: TileMsg, transfer?: any[]) => void) {
  let items: DLItem[] = [], grid = new Map<string, number[]>(), B: any, TILE = 256, BASE = 1 / 8;
  let queue: number[][] = [], busy = false, stamp = 1, seen: Uint32Array;
  const mk = (n: number): any => typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(n, n) : Object.assign(document.createElement('canvas'), { width: n, height: n });

  function render(l: number, tx: number, ty: number) {
    const sc = BASE * 2 ** l, tw = TILE / sc, x0 = B.x0 + tx * tw, y0 = B.y0 + ty * tw, x1 = x0 + tw, y1 = y0 + tw;
    const cv = mk(TILE), c = cv.getContext('2d'), ids: number[] = []; stamp++;
    for (let cy = Math.floor(y0 / DLC); cy <= Math.floor(y1 / DLC); cy++)
      for (let cx = Math.floor(x0 / DLC); cx <= Math.floor(x1 / DLC); cx++)
        for (const id of grid.get(cx + ',' + cy) || []) if (seen[id] !== stamp) { seen[id] = stamp; ids.push(id); }
    ids.sort((a, b) => a - b);   // סדר הציור המקורי
    for (const id of ids) {
      const it = items[id], b = it.bb;
      if (b[2] < x0 || b[0] > x1 || b[3] < y0 || b[1] > y1) continue;
      if (it.det && sc < .6) continue;                                 // דשא: רק כשקרובים
      if (Math.max(b[2] - b[0], b[3] - b[1]) * sc < .4) continue;      // קטן מפיקסל: מדלגים
      const m = it.m;
      c.setTransform(sc * m[0], sc * m[1], sc * m[2], sc * m[3], sc * (m[4] - x0), sc * (m[5] - y0));
      c.globalAlpha = it.a;
      const p = it.p || (it.p = new Path2D(it.d));
      if (it.fill) { c.fillStyle = it.fill; c.fill(p); }
      if (it.stroke) { c.strokeStyle = it.stroke; c.lineWidth = it.sw; c.lineCap = it.cap; c.lineJoin = it.join; c.setLineDash(it.dash || []); c.stroke(p); }
    }
    return cv.transferToImageBitmap ? cv.transferToImageBitmap() : cv;
  }

  function pump() {
    busy = false;
    if (!queue.length) return;
    const [l, i, j] = queue.shift(), bmp = render(l, i, j);
    post({ type: 'tile', l, i, j, bmp }, bmp.close ? [bmp] : undefined);
    busy = true; setTimeout(pump, 0);
  }

  return (m: any) => {
    if (m.type === 'init') {
      ({ items, B, TILE, BASE } = m); seen = new Uint32Array(items.length);
      items.forEach((it, id) => {
        for (let cy = Math.floor(it.bb[1] / DLC); cy <= Math.floor(it.bb[3] / DLC); cy++)
          for (let cx = Math.floor(it.bb[0] / DLC); cx <= Math.floor(it.bb[2] / DLC); cx++) {
            const k = cx + ',' + cy; (grid.get(k) || grid.set(k, []).get(k)).push(id);
          }
      });
    } else if (m.type === 'need') {
      queue = m.list;                     // התור מתחלף בכל בקשה: תמיד מה שרלוונטי עכשיו
      if (!busy) { busy = true; setTimeout(pump, 0); }
    }
  };
}
