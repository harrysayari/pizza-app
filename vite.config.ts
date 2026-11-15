import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
// @ts-ignore no types for node:child_process
import { execSync } from 'node:child_process';
// @ts-ignore no types for node:crypto
import { createHash } from 'node:crypto';

/** "0.1 · built 15 Nov 21:24 · 993b439", shown at the bottom of every screen so a phone can show which build it has. */
function buildInfo(): string {
  const d = new Date();
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const two = (n: number): string => String(n).padStart(2, '0');
  let commit = 'local';
  try {
    commit = String(execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })).trim() || 'local';
  } catch {
    // Not a git checkout: keep "local".
  }
  return `built ${d.getDate()} ${month} ${two(d.getHours())}:${two(d.getMinutes())} · ${commit}`;
}
// The Node types are not installed; these three calls are the only Node API this file uses.
// @ts-ignore no types for node:fs
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

/**
 * After the build, fills public/sw.js with the list of every emitted file (scripts, styles, font
 * files, icons, the manifest) and a cache name that changes whenever any file's contents do, so the service worker can precache everything on install (offline after first load).
 */
function precacheList(): Plugin {
  let outDir = '';

  function walk(dir: string, prefix: string, out: { url: string; size: number }[]): void {
    for (const entry of readdirSync(dir, { withFileTypes: true }) as { name: string; isDirectory(): boolean }[]) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(path, `${prefix}${entry.name}/`, out);
      else if (entry.name !== 'sw.js' && !entry.name.startsWith('.')) {
        out.push({ url: `${prefix}${entry.name}`, size: (statSync(path) as { size: number }).size });
      }
    }
  }

  return {
    name: 'precache-list',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir.startsWith('/') ? config.build.outDir : `${config.root}/${config.build.outDir}`;
    },
    writeBundle() {
      const files: { url: string; size: number }[] = [];
      walk(outDir, '', files);
      files.sort((a, b) => (a.url < b.url ? -1 : 1));
      // Relative to sw.js, which sits at the app root, so the app works under any sub-path such as /pizza/.
      const list = ['./', ...files.map((f) => f.url)];

      // The cache name comes from the file contents, so any change to any file gives a new cache.
      const digest = createHash('sha256');
      for (const f of files) {
        digest.update(f.url);
        digest.update(readFileSync(`${outDir}/${f.url}`));
      }
      const version = String(digest.digest('hex')).slice(0, 12);

      const target = `${outDir}/sw.js`;
      const source = readFileSync(target, 'utf8') as string;
      writeFileSync(
        target,
        source.replace('/*PRECACHE*/[]', JSON.stringify(list)).replace('/*VERSION*/dev', version),
      );
    },
  };
}

export default defineConfig({
  // Relative base: assets resolve next to index.html, so the app works at the site root or under a
  // sub-path such as /pizza/ without a rebuild. The host must serve the app with a trailing slash.
  base: './',
  define: { __BUILD_INFO__: JSON.stringify(buildInfo()) },
  plugins: [precacheList()],
  build: { outDir: 'dist' },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: true,
  },
});
