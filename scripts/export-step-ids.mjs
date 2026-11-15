// Writes service/src/steps.json from the recipe: the only list of step ids and titles the reminder
// service accepts (spec 002 FR-024: it can only ever send a fixed message). Run: npm run steps
// recipe.ts has no imports, so Node can read it directly with type stripping.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('..', import.meta.url);
const { STEPS } = await import(pathToFileURL(new URL('src/domain/recipe.ts', ROOT).pathname).href);
const out = STEPS.map((s) => ({ id: s.id, title: s.title }));
writeFileSync(new URL('service/src/steps.json', ROOT), JSON.stringify(out, null, 2) + '\n');
console.log(`export-step-ids: wrote service/src/steps.json (${out.length} steps)`);
