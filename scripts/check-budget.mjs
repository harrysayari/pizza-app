// Run after `vite build`. Two checks:
//   1. Performance budget (plan.md): the gzipped JavaScript in dist/ stays under 50 KB.
//   2. The hex colours the manifest and the home-screen icons carry match the light-theme
//      tokens (manifest: surface-ground and tomato; icons: tomato plus another token), because
//      those files sit outside src/ where check-style.mjs cannot see them.
// Set BUDGET_KB to try a different limit (used to test that the check can fail).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, inflateSync } from 'node:zlib';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const LIMIT_KB = Number(process.env.BUDGET_KB ?? 50);
const failures = [];

// ---- 1. JavaScript budget ----

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

let total = 0;
for (const file of walk(DIST)) {
  if (!/\.m?js$/.test(file)) continue;
  const raw = readFileSync(file);
  const gz = gzipSync(raw, { level: 9 }).length;
  total += gz;
  console.log(`  ${file.slice(DIST.length + 1)}: ${(raw.length / 1024).toFixed(1)} KB raw, ${(gz / 1024).toFixed(1)} KB gzip`);
}
console.log(`check-budget: gzipped JavaScript ${(total / 1024).toFixed(1)} KB of ${LIMIT_KB} KB`);
if (total === 0) failures.push('no JavaScript found in dist/ (run vite build first)');
if (total > LIMIT_KB * 1024) {
  failures.push(`gzipped JavaScript is ${(total / 1024).toFixed(1)} KB, over the ${LIMIT_KB} KB budget`);
}

// ---- 2. Manifest and icon colours against the light tokens ----

const tokens = JSON.parse(readFileSync(join(ROOT, 'design/tokens.json'), 'utf8'));
const light = (name) => tokens.color.tokens.find((t) => t.name === name)?.value.light.toUpperCase();
const lightValues = new Set(tokens.color.tokens.map((t) => t.value.light.toUpperCase()));
const ground = light('surface-ground');
const tomato = light('tomato');

const manifest = JSON.parse(readFileSync(join(ROOT, 'public/manifest.webmanifest'), 'utf8'));
if (manifest.background_color?.toUpperCase() !== ground) {
  failures.push(`manifest background_color ${manifest.background_color} is not surface-ground ${ground}`);
}
if (manifest.theme_color?.toUpperCase() !== tomato) {
  failures.push(`manifest theme_color ${manifest.theme_color} is not tomato ${tomato}`);
}
console.log(`check-budget: manifest colours ${manifest.background_color} / ${manifest.theme_color} (tokens ${ground} / ${tomato})`);

/** Decode a non-interlaced 8-bit RGB or RGBA PNG into { width, height, pixel(x, y) }. */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];
  for (let pos = 8; pos < buf.length; ) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const depth = data[8];
      const colour = data[9];
      if (depth !== 8 || data[12] !== 0 || (colour !== 2 && colour !== 6)) {
        throw new Error('only 8-bit RGB or RGBA, non-interlaced PNGs are supported');
      }
      channels = colour === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const cur = raw[y * (stride + 1) + 1 + x];
      const left = x >= channels ? out[y * stride + x - channels] : 0;
      const up = y > 0 ? out[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? out[(y - 1) * stride + x - channels] : 0;
      let v;
      if (filter === 0) v = cur;
      else if (filter === 1) v = cur + left;
      else if (filter === 2) v = cur + up;
      else if (filter === 3) v = cur + ((left + up) >> 1);
      else {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        v = cur + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      }
      out[y * stride + x] = v & 255;
    }
  }
  const pixel = (x, y) => {
    const i = y * stride + x * channels;
    const hex = (n) => n.toString(16).padStart(2, '0');
    return `#${hex(out[i])}${hex(out[i + 1])}${hex(out[i + 2])}`.toUpperCase();
  };
  return { width, height, pixel };
}

for (const icon of manifest.icons ?? []) {
  const file = join(ROOT, 'public', icon.src);
  let png;
  try {
    png = decodePng(readFileSync(file));
  } catch (error) {
    failures.push(`${icon.src}: ${error.message}`);
    continue;
  }
  // Which colours does the icon use? Count every pixel and keep the two most common.
  const counts = new Map();
  for (let y = 0; y < png.height; y += 2) {
    for (let x = 0; x < png.width; x += 2) {
      const c = png.pixel(x, y);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => c);
  console.log(`check-budget: ${icon.src} main colours ${top.join(', ')}`);
  // The icon's background is tomato, and its two main colours must both be light-theme tokens.
  if (!top.includes(tomato)) failures.push(`${icon.src} does not use tomato ${tomato} as a main colour (found ${top.join(', ')})`);
  for (const c of top) {
    if (!lightValues.has(c)) failures.push(`${icon.src} main colour ${c} is not a light-theme token value`);
  }
}

// 3. The build must not assume it is served from the site root: the app is hosted under a sub-path
//    (for example /pizza/), so every URL in the page, manifest and service worker must be relative.
{
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  for (const m of html.matchAll(/\b(?:src|href)="(\/[^"]*)"/g)) {
    failures.push(`dist/index.html has a root-absolute URL: ${m[1]}`);
  }
  const css = readdirSync(join(DIST, 'assets')).filter((f) => f.endsWith('.css'));
  for (const f of css) {
    for (const m of readFileSync(join(DIST, 'assets', f), 'utf8').matchAll(/url\(\s*["']?(\/[^)"']+)/g)) {
      failures.push(`dist/assets/${f} has a root-absolute url(): ${m[1]}`);
    }
  }
  const built = JSON.parse(readFileSync(join(DIST, 'manifest.webmanifest'), 'utf8'));
  for (const [key, value] of [['start_url', built.start_url], ['scope', built.scope], ...(built.icons ?? []).map((i) => ['icon', i.src])]) {
    if (typeof value === 'string' && value.startsWith('/')) failures.push(`manifest ${key} is root-absolute: ${value}`);
  }
  const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
  const list = JSON.parse(/const PRECACHE = (\[.*\]);/.exec(sw)?.[1] ?? '[]');
  if (list.length === 0) failures.push('dist/sw.js has an empty precache list');
  for (const url of list) if (url.startsWith('/')) failures.push(`sw.js precache entry is root-absolute: ${url}`);
  console.log(`check-budget: base path ok (${list.length} precache entries, all relative)`);
}


// ---- 3. Reminder service key (only when one is set) ----
// An empty key turns the reminder service off, which is allowed. A set key must look like a VAPID
// public key (65 bytes, base64url) and must really be in the build.
import { existsSync } from 'node:fs';
const envFile = join(ROOT, '.env.production');
const keyLine = existsSync(envFile) ? readFileSync(envFile, 'utf8').split('\n').find((l) => l.startsWith('VITE_VAPID_PUBLIC_KEY=')) : undefined;
const vapid = keyLine ? keyLine.slice('VITE_VAPID_PUBLIC_KEY='.length).trim() : '';
if (vapid === '') {
  console.log('check-budget: no VAPID key set, the reminder service is off in this build');
} else {
  if (!/^[A-Za-z0-9_-]{87}$/.test(vapid)) failures.push('VITE_VAPID_PUBLIC_KEY is not a 65-byte base64url key (87 characters)');
  let found = false;
  for (const file of walk(DIST)) if (/\.m?js$/.test(file) && readFileSync(file, 'utf8').includes(vapid)) found = true;
  if (!found) failures.push('VITE_VAPID_PUBLIC_KEY is set but is not in the built JavaScript');
  else console.log('check-budget: VAPID public key is in the build');
}

if (failures.length > 0) {
  console.error('check-budget failed:');
  for (const f of failures) console.error('  ' + f);
  process.exit(1);
}
console.log('check-budget: ok');
