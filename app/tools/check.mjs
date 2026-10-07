// בדיקת העולם מהשורה (כלל תשתית 1): פותח את האתר בדפדפן בלי מסך, מריץ את כל הבדיקות ומדפיס רק את ההפרות.
// שימוש: node tools/check.mjs [url]   (ברירת מחדל: שרת הפיתוח http://localhost:5173/)
// קוד יציאה 1 אם יש הפרות, כדי שאפשר יהיה לעצור דחיפה. דורש: npm i -D playwright && npx playwright install chromium
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:5173/';
const url = base + (base.includes('?') ? '&' : '?') + 'debug&forcegpu';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(url);
await page.waitForFunction(() => window.__check && window.__village, null, { timeout: 90000 });
await page.waitForTimeout(1000);
const list = await page.evaluate(() => window.__check());
await browser.close();

for (const e of errors) console.log(`error: ${e}`);
if (!list.length && !errors.length) { console.log('0 issues'); process.exit(0); }
const byRule = {};
for (const it of list) (byRule[it.rule] ||= []).push(it);
for (const [rule, items] of Object.entries(byRule)) {
  console.log(`${rule} (${items.length})`);
  for (const it of items) console.log(`  ${it.msg}  at (${it.x}, ${it.y})`);
}
console.log(`${list.length} issue${list.length === 1 ? '' : 's'}`);
process.exit(1);
