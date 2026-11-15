// @ts-nocheck -- uses node:fs and node:path, whose type packages are not installed (no new dependencies)
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildBatch, judgeSite, listFiles, orderForUpload, parseEnv, readConfig } from '../../scripts/deploy-lib.mjs';

const good = { SFTP_HOST: 'sftp.example.com', SFTP_USER: 'pizza', SFTP_REMOTE_DIR: 'pizza.ccc.com.au' };

describe('parseEnv', () => {
  it('reads keys, ignores comments and blank lines, and strips quotes', () => {
    expect(parseEnv('# note\n\nA=1\nB="two words"\nC=\'x\'\nD = spaced \n')).toEqual({ A: '1', B: 'two words', C: 'x', D: 'spaced' });
  });
});

describe('readConfig', () => {
  it('accepts the three required settings and defaults the port', () => {
    expect(readConfig(good)).toMatchObject({ host: 'sftp.example.com', user: 'pizza', port: 22, remoteDir: 'pizza.ccc.com.au', keyFile: null, password: null, siteUrl: null });
  });
  it.each(['SFTP_HOST', 'SFTP_USER', 'SFTP_REMOTE_DIR'])('says which setting is missing: %s', (key) => {
    expect(() => readConfig({ ...good, [key]: '' })).toThrow(key);
  });
  it('refuses a remote folder that could upload outside the site folder', () => {
    for (const dir of ['/', '.', '~', '../x', 'a/../b']) expect(() => readConfig({ ...good, SFTP_REMOTE_DIR: dir })).toThrow(/SFTP_REMOTE_DIR/);
  });
  it('refuses characters that could change the sftp commands', () => {
    for (const v of ['a"b', 'a\nb', 'a$b', 'a`b', "a'b"]) expect(() => readConfig({ ...good, SFTP_USER: v })).toThrow(/not allowed/);
  });
  it('checks the port and the site address', () => {
    expect(() => readConfig({ ...good, SFTP_PORT: 'abc' })).toThrow(/SFTP_PORT/);
    expect(() => readConfig({ ...good, SITE_URL: 'http://x' })).toThrow(/https/);
    expect(readConfig({ ...good, SITE_URL: 'https://pizza.ccc.com.au/' }).siteUrl).toBe('https://pizza.ccc.com.au');
  });
});

describe('files and batch', () => {
  const root = mkdtempSync(join(tmpdir(), 'pdp-deploy-test-'));
  mkdirSync(join(root, 'assets'));
  for (const f of ['index.html', 'sw.js', 'manifest.webmanifest', '.htaccess', 'assets/app-1.js', 'assets/app-1.css']) writeFileSync(join(root, f), 'x');

  it('lists every file, hidden ones included', () => {
    expect(listFiles(root)).toEqual(['.htaccess', 'assets/app-1.css', 'assets/app-1.js', 'index.html', 'manifest.webmanifest', 'sw.js']);
  });
  it('uploads the page and service worker last, the page very last', () => {
    const order = orderForUpload(listFiles(root));
    expect(order.slice(-3)).toEqual(['manifest.webmanifest', 'sw.js', 'index.html']);
    expect(order).toContain('.htaccess');
  });
  it('makes folders first (ignoring "exists" errors) and then puts each file', () => {
    const lines = buildBatch(listFiles(root), root, 'pizza.ccc.com.au').trim().split('\n');
    expect(lines[0]).toBe('-mkdir "pizza.ccc.com.au"');
    expect(lines[1]).toBe('-mkdir "pizza.ccc.com.au/assets"');
    expect(lines.filter((l) => l.startsWith('put '))).toHaveLength(6);
    expect(lines.at(-1)).toBe(`put "${join(root, 'index.html')}" "pizza.ccc.com.au/index.html"`);
    expect(lines.some((l) => l.includes('"pizza.ccc.com.au/.htaccess"'))).toBe(true);
  });
});

describe('judgeSite', () => {
  it('passes a healthy site and fails a cached service worker', () => {
    expect(judgeSite({ indexStatus: 200, swStatus: 200, swCacheControl: 'no-cache' }).every((r) => r.ok)).toBe(true);
    const bad = judgeSite({ indexStatus: 200, swStatus: 200, swCacheControl: 'public, max-age=31536000' });
    expect(bad.filter((r) => !r.ok)).toHaveLength(1);
  });
});

describe('secrets stay out of git', () => {
  it('.gitignore lists the deploy settings file and its variants but not the example', () => {
    const ignore = readFileSync('.gitignore', 'utf8').split('\n').map((l) => l.trim());
    expect(ignore).toContain('.env.deploy');
    expect(ignore).toContain('.env.deploy.*');
    expect(ignore).toContain('!.env.deploy.example');
  });
});
