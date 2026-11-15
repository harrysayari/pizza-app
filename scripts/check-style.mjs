// Constitution I: no literal colours under src/. Colours come from design/tokens.css.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('../src', import.meta.url).pathname;
const EXTENSIONS = new Set(['.css', '.ts']);
const PATTERNS = [
  /#[0-9a-fA-F]{3,8}\b/,
  /\brgba?\(/i,
  /\bhsla?\(/i,
  /\boklch\(/i,
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(path))) yield path;
  }
}

const hits = [];
for (const file of walk(ROOT)) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (PATTERNS.some((p) => p.test(line))) hits.push(`${file}:${i + 1}: ${line.trim()}`);
    });
}

if (hits.length > 0) {
  console.error('Literal colour values found under src/ (use design tokens instead):');
  for (const h of hits) console.error('  ' + h);
  process.exit(1);
}
console.log('check-style: no literal colours under src/');
