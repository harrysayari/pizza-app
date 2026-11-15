import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/** Filled in T063: injects the list of emitted files into sw.js at build time. */
function precacheList(): Plugin {
  return { name: 'precache-list' };
}

export default defineConfig({
  plugins: [precacheList()],
  build: { outDir: 'dist' },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: true,
  },
});
