// Pure helpers for scripts/deploy.mjs: reading the settings, listing the files and building the
// sftp batch. No network and no secrets here, so they can be unit tested (tests/unit/deploy.test.ts).
import { readdirSync, statSync } from 'node:fs';
import { join, posix, sep } from 'node:path';

/** Parse KEY=VALUE lines. `#` starts a comment line; values may be wrapped in single or double quotes. */
export function parseEnv(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}

const UNSAFE = /[\r\n"'`$\\]/;

/**
 * Check the settings and return them in one shape. Throws an Error that says what to fix.
 * The remote folder must be a real folder name: never empty, never the home or root folder.
 */
export function readConfig(env) {
  const need = (key) => {
    const v = (env[key] ?? '').trim();
    if (v === '') throw new Error(`${key} is missing in the deploy settings file`);
    if (UNSAFE.test(v)) throw new Error(`${key} contains a character that is not allowed (quotes, backslash, $, backtick or a line break)`);
    return v;
  };
  const host = need('SFTP_HOST');
  const user = need('SFTP_USER');
  const remoteDir = need('SFTP_REMOTE_DIR').replace(/\/+$/, '');
  if (remoteDir === '' || remoteDir === '.' || remoteDir === '~' || remoteDir.split('/').includes('..')) {
    throw new Error('SFTP_REMOTE_DIR must be the site folder, for example pizza.ccc.com.au (not the home folder, "/" or a path with "..")');
  }
  const portText = (env.SFTP_PORT ?? '22').trim();
  if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) throw new Error('SFTP_PORT must be a number from 1 to 65535');
  const keyFile = (env.SFTP_KEY_FILE ?? '').trim();
  if (UNSAFE.test(keyFile)) throw new Error('SFTP_KEY_FILE contains a character that is not allowed');
  const siteUrl = (env.SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (siteUrl !== '' && !/^https:\/\/[^\s/]+(\/[^\s]*)?$/.test(siteUrl)) throw new Error('SITE_URL must start with https://');
  return {
    host,
    user,
    port: Number(portText),
    remoteDir,
    keyFile: keyFile === '' ? null : keyFile,
    password: env.SFTP_PASSWORD ? env.SFTP_PASSWORD : null,
    siteUrl: siteUrl === '' ? null : siteUrl,
  };
}

/** Every file under `dir`, dotfiles included (.htaccess), as sorted posix paths relative to `dir`. */
export function listFiles(dir) {
  const out = [];
  const walk = (current) => {
    for (const name of readdirSync(join(dir, current))) {
      const rel = current === '' ? name : `${current}/${name}`;
      if (statSync(join(dir, ...rel.split('/'))).isDirectory()) walk(rel);
      else out.push(rel.split(sep).join('/'));
    }
  };
  walk('');
  return out.sort();
}

/** Last to upload, in this order, so a visitor never gets a page that points at files not there yet. */
const LAST = ['manifest.webmanifest', 'sw.js', 'index.html'];

export function orderForUpload(files) {
  const rank = (f) => {
    const i = LAST.indexOf(f);
    return i < 0 ? -1 : i;
  };
  return [...files].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** The sftp batch: make each folder (a failure there is ignored: it may exist), then put each file. */
export function buildBatch(files, localDir, remoteDir) {
  const lines = [];
  const made = new Set();
  const mk = (dir) => {
    if (dir === '' || made.has(dir)) return;
    made.add(dir);
    lines.push(`-mkdir "${dir}"`);
  };
  mk(remoteDir);
  for (const file of orderForUpload(files)) {
    if (/["\r\n\\]/.test(file)) throw new Error(`Cannot upload a file with this name: ${file}`);
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) mk(posix.join(remoteDir, ...parts.slice(0, i)));
  }
  for (const file of orderForUpload(files)) {
    lines.push(`put "${join(localDir, ...file.split('/'))}" "${posix.join(remoteDir, file)}"`);
  }
  return lines.join('\n') + '\n';
}

/** Checks on the published site after an upload. Each result is { ok, text }. */
export function judgeSite({ indexStatus, swStatus, swCacheControl }) {
  return [
    { ok: indexStatus === 200, text: `home page answers ${indexStatus}` },
    { ok: swStatus === 200, text: `sw.js answers ${swStatus}` },
    { ok: /no-cache|no-store|max-age=0/i.test(swCacheControl ?? ''), text: `sw.js Cache-Control is "${swCacheControl ?? 'missing'}" (must make browsers recheck it)` },
  ];
}
