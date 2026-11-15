# Deploying to DreamHost (static upload)

The app is plain files in `dist/`. No WordPress, database or server code is involved.

## Before you upload

1. `npm run lint && npm test && npm run build` (the build prints "check-budget: ok").
2. The upload is the **contents** of `dist/`, including the hidden file `.htaccess`. Turn on "show hidden files" in your SFTP app, or the file is skipped and caching headers are missing.

## Upload with the script (recommended)

`npm run deploy` runs lint, the unit tests and the build, uploads `dist/` (hidden `.htaccess` included) over SFTP, then checks the live site.

1. Copy `.env.deploy.example` to `.env.deploy` and fill in the SFTP host, user and the site folder (for example `pizza`). `.env.deploy` is git-ignored, and the script refuses to run if it has been committed.
2. Log in with an SSH key (`SFTP_KEY_FILE`), or leave the password out and type it when asked. A stored `SFTP_PASSWORD` is read from `.env.deploy` and handed to ssh through its `SSH_ASKPASS` hook, so nothing needs installing. The password is never put on a command line, written to a file or printed.
3. `npm run deploy -- --dry-run` lists what would be uploaded and uploads nothing. `npm run deploy` asks "Upload now?" before it sends anything (`--yes` skips the question, `--skip-checks` skips lint and tests, `--no-build` uploads the existing `dist/`).
4. The page and service worker are uploaded last, so visitors never see a page that points at files not there yet. Old hashed files in `assets/` are left in place; they are harmless and can be deleted by hand.
5. With `SITE_URL` set, the script then checks that the home page and `sw.js` answer and that `sw.js` is sent with `Cache-Control: no-cache`.

## Upload by hand


1. In the DreamHost panel, Users, make or reuse an SFTP user for the account that owns the subdomain, and note the server name and the subdomain's folder (for example `pizza.example.com`, a folder in the user's home).
2. Connect with an SFTP app (Cyberduck or FileZilla). Never put the password in the repo or in a chat.
3. Copy everything inside `dist/` into the subdomain's folder, so `index.html` sits directly in it, not in a `dist` subfolder.
4. Open `https://<subdomain>/` once the free certificate is active.

## Where it lives

The app is published at **https://designandinspire.com.au/pizza/** (open it with the trailing slash). The deploy settings use `SITE_URL=https://designandinspire.com.au/pizza`, and `SFTP_REMOTE_DIR` is the folder that serves `/pizza/` (on a DreamPress account SFTP lands in the WordPress folder, so it is `pizza`).

## Where it can live

The build uses relative paths (`base: './'`), so the same files work at the root of a subdomain (`https://pizza.example.com/`) or in a subfolder of a domain (`https://example.com/pizza/`). Open the app with the trailing slash. If `/pizza` without the slash does not redirect to `/pizza/`, assets will not load; Apache normally adds the redirect for a real folder. The service worker's scope is the folder it is uploaded to.

## Updating

Run the build again, then upload everything in `dist/` over the old files. The service worker changes its cache name whenever a file changes, so phones pick up the update on the next visit (they may need two opens).

## Check after upload (T074)

- Padlock shows, no mixed-content warnings.
- Reload with the network off (airplane mode): the app still opens.
- In a browser's developer tools, Application tab: service worker is activated and the manifest has no errors.
- `<app address>/sw.js` loads, and its response header `Cache-Control` is `no-cache`.
- Run the real-device list at the end of `quickstart.md` on the deployed address.
- If a WordPress caching or security plugin is active on the main site, confirm it does not apply to the subdomain.
