// Upload dist/ to the web host over SFTP.   npm run deploy [-- --dry-run] [-- --yes]
//
// The connection details live in `.env.deploy` (git-ignored; copy `.env.deploy.example`).
// Nothing secret is ever put on a command line, in a file in the repo or in the output:
//   - Best: an SSH key (SFTP_KEY_FILE, or one already loaded in ssh-agent).
//   - Or a password typed when the connection opens (nothing stored).
//   - Or SFTP_PASSWORD in `.env.deploy`, which needs the `sshpass` tool installed.
// It uses the `ssh` and `sftp` programs already on macOS and Linux, so there is nothing to install.
//
// Flags: --dry-run  list what would be uploaded, upload nothing
//        --yes      do not ask for confirmation
//        --skip-checks  skip lint and unit tests (the build and its budget check still run)
//        --no-build     upload the existing dist/ as it is
//        --env <file>   use another settings file
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { buildBatch, judgeSite, listFiles, parseEnv, readConfig } from './deploy-lib.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const envFile = args.includes('--env') ? args[args.indexOf('--env') + 1] : join(ROOT, '.env.deploy');

function fail(message) {
  console.error(`deploy: ${message}`);
  process.exit(1);
}

function run(cmd, cmdArgs, options = {}) {
  return spawnSync(cmd, cmdArgs, { stdio: 'inherit', cwd: ROOT, ...options });
}

// ---- 1. Settings ----

if (!existsSync(envFile)) {
  fail(`no settings file at ${envFile}.\n  Copy .env.deploy.example to .env.deploy and fill it in. It is git-ignored.`);
}
// Refuse to run if the settings file has been committed, so a password cannot ship by accident.
const tracked = spawnSync('git', ['ls-files', '--error-unmatch', envFile], { cwd: ROOT, stdio: 'ignore' });
if (tracked.status === 0) fail(`${envFile} is tracked by git. Run: git rm --cached ${envFile}  (then change any password it held).`);

let config;
try {
  config = readConfig(parseEnv(readFileSync(envFile, 'utf8')));
} catch (error) {
  fail(error.message);
}

// ---- 2. Checks and build ----

if (!flag('--no-build')) {
  const steps = flag('--skip-checks') ? [['npm', ['run', 'build']]] : [['npm', ['run', 'lint']], ['npm', ['test']], ['npm', ['run', 'build']]];
  for (const [cmd, cmdArgs] of steps) {
    console.log(`\n$ ${cmd} ${cmdArgs.join(' ')}`);
    if (run(cmd, cmdArgs).status !== 0) fail(`"${cmd} ${cmdArgs.join(' ')}" failed. Nothing was uploaded.`);
  }
}
for (const needed of ['index.html', 'sw.js', 'manifest.webmanifest', '.htaccess']) {
  if (!existsSync(join(DIST, needed))) fail(`dist/${needed} is missing. Run the build first (without --no-build).`);
}

const files = listFiles(DIST);
const bytes = files.reduce((sum, f) => sum + statSync(join(DIST, f)).size, 0);
console.log(`\ndeploy: ${files.length} files, ${(bytes / 1024).toFixed(0)} KB, to ${config.user}@${config.host}:${config.remoteDir} (port ${config.port})`);

if (flag('--dry-run')) {
  for (const line of buildBatch(files, DIST, config.remoteDir).trim().split('\n')) console.log('  ' + line.replace(DIST + '/', 'dist/'));
  console.log('\ndeploy: dry run, nothing uploaded.');
  process.exit(0);
}

if (!flag('--yes')) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('Upload now? Existing files with the same names are replaced. (yes/no) ')).trim().toLowerCase();
  rl.close();
  if (answer !== 'yes' && answer !== 'y') fail('cancelled. Nothing was uploaded.');
}

// ---- 3. Upload ----
// One ssh connection is opened first (this is where a password or key passphrase is asked for), then
// sftp reuses it in batch mode, which stops at the first real error.

const work = mkdtempSync(join(tmpdir(), 'pdp-'));
const socket = join(work, 'cm');
const common = ['-p', String(config.port), ...(config.keyFile ? ['-i', config.keyFile] : [])];
const target = `${config.user}@${config.host}`;
const reuse = ['-o', `ControlPath=${socket}`];
let exitCode = 0;

try {
  let master;
  const masterArgs = [...common, '-o', 'ControlMaster=yes', ...reuse, '-o', 'ControlPersist=300', '-N', '-f', target];
  if (config.password !== null) {
    if (spawnSync('sshpass', ['-V'], { stdio: 'ignore' }).error) fail('SFTP_PASSWORD needs the sshpass tool, which is not installed. Use an SSH key (SFTP_KEY_FILE), or remove SFTP_PASSWORD and type the password when asked.');
    master = run('sshpass', ['-e', 'ssh', ...masterArgs], { env: { ...process.env, SSHPASS: config.password } });
  } else {
    master = run('ssh', masterArgs);
  }
  if (master.status !== 0) fail('could not connect. Check the host, user, port and key or password.');

  const batchFile = join(work, 'batch.txt');
  writeFileSync(batchFile, buildBatch(files, DIST, config.remoteDir), { mode: 0o600 });
  const sftp = run('sftp', ['-P', String(config.port), ...reuse, '-o', 'ControlMaster=no', '-b', batchFile, target]);
  if (sftp.status !== 0) {
    console.error('\ndeploy: the upload stopped with an error. The site may be half updated: run it again.');
    exitCode = 1;
  } else {
    console.log('\ndeploy: upload finished.');
  }
  spawnSync('ssh', [...reuse, '-O', 'exit', target], { stdio: 'ignore' });
} finally {
  rmSync(work, { recursive: true, force: true });
}
if (exitCode !== 0) process.exit(exitCode);

// ---- 4. Look at the live site ----

if (config.siteUrl === null) {
  console.log('deploy: set SITE_URL in the settings file to have the live site checked after each upload.');
} else {
  try {
    const home = await fetch(`${config.siteUrl}/`, { redirect: 'follow' });
    const sw = await fetch(`${config.siteUrl}/sw.js`, { redirect: 'follow' });
    const results = judgeSite({ indexStatus: home.status, swStatus: sw.status, swCacheControl: sw.headers.get('cache-control') });
    for (const r of results) console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.text}`);
    if (results.some((r) => !r.ok)) process.exit(2);
    console.log(`deploy: ${config.siteUrl}/ looks right.`);
  } catch (error) {
    console.error(`deploy: could not reach ${config.siteUrl} (${error.message}). The files are uploaded; check it in a browser.`);
    process.exit(2);
  }
}
