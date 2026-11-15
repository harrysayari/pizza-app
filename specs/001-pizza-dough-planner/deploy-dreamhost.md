# Deploying to DreamHost (static upload)

The app is plain files in `dist/`. No WordPress, database or server code is involved.

## Before you upload

1. `npm run lint && npm test && npm run build` (the build prints "check-budget: ok").
2. The upload is the **contents** of `dist/`, including the hidden file `.htaccess`. Turn on "show hidden files" in your SFTP app, or the file is skipped and caching headers are missing.

## Upload

1. In the DreamHost panel, Users, make or reuse an SFTP user for the account that owns the subdomain, and note the server name and the subdomain's folder (for example `pizza.example.com`, a folder in the user's home).
2. Connect with an SFTP app (Cyberduck or FileZilla). Never put the password in the repo or in a chat.
3. Copy everything inside `dist/` into the subdomain's folder, so `index.html` sits directly in it, not in a `dist` subfolder.
4. Open `https://<subdomain>/` once the free certificate is active.

## Why this works without changes

A subdomain pointed at a folder serves that folder as its root, so the root paths in the build (`/assets/...`, `/sw.js`, `/manifest.webmanifest`) resolve. Do not move the app into a subfolder of a domain (for example `example.com/pizza/`) without first making the build path-relative.

## Updating

Run the build again, then upload everything in `dist/` over the old files. The service worker changes its cache name whenever a file changes, so phones pick up the update on the next visit (they may need two opens).

## Check after upload (T074)

- Padlock shows, no mixed-content warnings.
- Reload with the network off (airplane mode): the app still opens.
- In a browser's developer tools, Application tab: service worker is activated and the manifest has no errors.
- `https://<subdomain>/sw.js` loads, and its response header `Cache-Control` is `no-cache`.
- Run the real-device list at the end of `quickstart.md` on the deployed address.
- If a WordPress caching or security plugin is active on the main site, confirm it does not apply to the subdomain.
