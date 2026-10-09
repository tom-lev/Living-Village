/* אפייה מראש (כלל baked-fresh): מריץ את העולם בדפדפן, לוקח את תוצאת כללי השבילים ושומר ב-src/world/baked.json
   עם טביעת האצבע של הקלט. בטעינה האתר קורא את התוצאה במקום לחשב אותה.
   שימוש:  node tools/bake.mjs <url של שרת הפיתוח>    (אחרי שינוי ב-world.json או בקוד הגיאומטריה)
           node tools/bake.mjs --check                (ב-npm run build: נכשל אם הקובץ לא מעודכן) */
import { readFileSync, writeFileSync } from 'node:fs';
import { fnv, codeHash, worldText } from './geohash.mjs';

const FILE = new URL('../src/world/baked.json', import.meta.url);
const want = fnv(worldText() + '|' + codeHash());
if (process.argv[2] === '--check') {
  const have = JSON.parse(readFileSync(FILE, 'utf8')).hash;
  if (have !== want) { console.error(`baked.json is stale (have ${have}, want ${want}): run npm run dev, then npm run bake -- <dev url>`); process.exit(1); }
  console.log('baked.json is fresh'); process.exit(0);
}
const { chromium } = await import('playwright');
const b = await chromium.launch(), p = await b.newPage();
await p.goto(process.argv[2].replace(/\/?$/, '/') + '?nobake');
await p.waitForFunction(() => window.__geoBake && window.__village, null, { timeout: 120000 });
const data = await p.evaluate(() => window.__geoBake);
await b.close();
if (data.hash !== want) { console.error(`the page computed hash ${data.hash} but the files give ${want}: is the dev server serving this folder, after the latest changes?`); process.exit(1); }
writeFileSync(FILE, JSON.stringify(data));
console.log(`baked ${data.geo.trails.length} trails, hash ${data.hash}`);
