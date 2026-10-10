// מייצר את docs/RULES.md מתוך src/world/rules.ts (מקור האמת היחיד לכללי העולם). שימוש: npm run rules
// עם --check: לא כותב, רק נכשל אם הקובץ הקיים לא תואם לקוד (כדי שהתיעוד לא יתיישן).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url)), app = path.join(here, '..');
const src = fs.readFileSync(path.join(app, 'src/world/rules.ts'), 'utf8');
// קורא את המערך RULES בלי לקמפל TypeScript: כל כלל הוא אובייקט ליטרלי בשורה אחת
const rules = [...src.matchAll(/^\s*\{ id: '([^']+)'.*\},?\s*$/gm)].map(m => {
  const line = m[0].trim().replace(/,$/, '');
  return Function(`return (${line})`)();
});
const groups = { walking: 'Walking (everyone who moves)', layout: 'Layout (how the world is built)', proportions: 'Proportions', infrastructure: 'Infrastructure' };
let md = '# Living Village: world rules\n\n';
md += '_Generated from `app/src/world/rules.ts` by `npm run rules`. Do not edit by hand: change the code, then regenerate._\n\n';
md += 'Every rule says where in the code it is enforced and how it is verified: **check** = the world check (`npm run check`), **motion** = the motion check (`npm run motion`), **scale** = the scale test (`node tools/scale.mjs`: a 5× world against the real one, phone conditions, ~25 min; run after changing loading or per-frame infrastructure), **built** = it holds by construction.\n\n';
for (const [g, title] of Object.entries(groups)) {
  md += `## ${title}\n\n| Rule | Enforced in | Verified by |\n|---|---|---|\n`;
  for (const r of rules.filter(r => r.group === g)) {
    const v = r.check ? `check \`${r.check}\`` : r.motion ? `motion (${r.motion})` : r.scale ? `scale (${r.scale})` : 'built';
    md += `| **${r.id}**: ${r.title} | \`${r.where}\` | ${v} |\n`;
  }
  md += '\n';
}
const out = path.join(app, '..', 'docs', 'RULES.md');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (cur !== md) { console.log('docs/RULES.md is out of date: run npm run rules'); process.exit(1); }
  console.log(`docs/RULES.md is up to date (${rules.length} rules)`);
} else {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, md);
  console.log(`wrote docs/RULES.md (${rules.length} rules)`);
}
