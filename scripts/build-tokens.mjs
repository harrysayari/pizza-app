// Generates design/tokens.css from design/tokens.json, then checks WCAG contrast.
// Constitution I: tokens.json is the source of truth. Plain Node, no dependencies.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const JSON_PATH = new URL('../design/tokens.json', import.meta.url);
const CSS_PATH = new URL('../design/tokens.css', import.meta.url);

const SURFACES = ['surface-ground', 'surface-raised', 'surface-sunken'];
const TEXT_PAIRS = [
  ['ink', [...SURFACES, 'tomato-soft', 'basil-soft', 'semolina-soft']],
  ['ink-muted', SURFACES],
  ['tomato', ['surface-ground', 'surface-raised']],
  ['on-tomato', ['tomato', 'tomato-pressed']],
  ['basil', ['surface-ground', 'surface-raised', 'basil-soft']],
  ['on-basil', ['basil']],
  ['semolina-text', ['semolina-soft', 'surface-ground']],
];
const NON_TEXT_PAIRS = [
  ['border-strong', SURFACES],
  ['focus-ring', SURFACES],
  ['tomato', ['surface-sunken']],
  ['basil', ['surface-sunken']],
];

const decl = (name, value) => `  --${name}: ${value};`;
const block = (selector, lines) => `${selector} {\n${lines.join('\n')}\n}`;

export function buildCss(tokens) {
  const themeLines = (theme) => [
    ...tokens.color.tokens.map((t) => decl(t.name, t.value[theme])),
    ...tokens.shadow.tokens.map((t) => decl(t.name, t.value[theme])),
    `  color-scheme: ${theme};`,
  ];
  const plain = (group) => tokens[group].tokens.map((t) => decl(t.name, t.value));

  const darkMedia = [
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) {',
    ...themeLines('dark').map((l) => '  ' + l),
    '  }',
    '}',
  ].join('\n');

  const parts = [
    '/* Pizza Dough Planner: generated from tokens.json, do not edit. Run `npm run tokens`. */',
    block(':root,\n[data-theme="light"]', themeLines('light')),
    darkMedia,
    block('[data-theme="dark"]', themeLines('dark')),
    block(':root', [
      ...plain('spacing'),
      ...plain('radius'),
      ...plain('zIndex'),
      decl('font-display', tokens.type.families.display),
      decl('font-sans', tokens.type.families.sans),
      ...plain('motion'),
    ]),
  ];

  for (const group of tokens.type.groups) {
    for (const s of group.styles) {
      const lines = [
        `  font-family: var(--font-${group.family});`,
        `  font-size: ${s.fontSize};`,
        `  line-height: ${s.lineHeight};`,
        `  font-weight: ${s.fontWeight};`,
      ];
      if (group.name === 'Numerals') lines.push('  font-variant-numeric: tabular-nums;');
      parts.push(block(`.${s.name}`, lines));
    }
  }
  return parts.join('\n\n') + '\n';
}

function luminance(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Contrast check needs a 6-digit hex colour, got "${hex}"`);
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function checkContrast(tokens) {
  const byName = new Map(tokens.color.tokens.map((t) => [t.name, t.value]));
  const get = (name, theme) => {
    const v = byName.get(name);
    if (!v) throw new Error(`Unknown colour token "${name}"`);
    return v[theme];
  };
  const results = [];
  for (const [min, pairs] of [
    [4.5, TEXT_PAIRS],
    [3, NON_TEXT_PAIRS],
  ]) {
    for (const [fg, bgs] of pairs) {
      for (const bg of bgs) {
        for (const { id: theme } of tokens.color.themes) {
          const fgv = get(fg, theme);
          const bgv = get(bg, theme);
          const ratio = contrast(fgv, bgv);
          results.push({ theme, fg, bg, fgv, bgv, min, ratio, ok: ratio >= min });
        }
      }
    }
  }
  return results;
}

export function run(jsonUrl = JSON_PATH, cssUrl = CSS_PATH) {
  const tokens = JSON.parse(readFileSync(jsonUrl, 'utf8'));
  writeFileSync(cssUrl, buildCss(tokens));
  const results = checkContrast(tokens);
  const fails = results.filter((r) => !r.ok);
  for (const r of fails) {
    console.error(
      `FAIL [${r.theme}] ${r.fg} ${r.fgv} on ${r.bg} ${r.bgv}: ${r.ratio.toFixed(2)}:1 (needs ${r.min}:1)`,
    );
  }
  if (fails.length > 0) {
    console.error(`build-tokens: ${fails.length} contrast pair(s) failed`);
    return 1;
  }
  console.log(`build-tokens: wrote design/tokens.css; ${results.length} contrast checks passed`);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = run();
}
