/* טביעת האצבע של חישובי הגיאומטריה (כלל baked-fresh): נתוני העולם + קבצי הקוד שקובעים את כללי השבילים.
   משותף לתצורת Vite (מוזרק לקוד כ-__GEO_CODE_HASH__) ולכלי האפייה (tools/bake.mjs). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const GEO_FILES = ['src/world/geometry.ts', 'src/world/curve.ts', 'src/world/decl.ts'];
/** FNV-1a של 32 ביט (אותה פונקציה גם בדפדפן, src/world/bake.ts) */
export function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
// סופי שורה אחידים: אותה טביעה ב-Windows ובשרת הבנייה
export const codeHash = () => fnv(GEO_FILES.map(f => readFileSync(join(root, f), 'utf8').replace(/\r\n/g, '\n')).join('\n'));
/** אותו טקסט כמו worldKey בדפדפן (src/world/bake.ts): בלי הפלטה */
export const worldText = () => JSON.stringify(JSON.parse(readFileSync(join(root, 'src/world/world.json'), 'utf8')), (k, v) => k === 'palette' || k === 'palettes' ? undefined : v);
