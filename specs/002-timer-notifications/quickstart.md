# Quickstart: validating Timer-End Notifications

Prerequisites: Node 22, PHP 8.2+ with openssl, curl, gmp or bcmath, mbstring and pdo_sqlite, and Composer, all present on the dev machine.

## S0. Spike on the real host (do first, blocks the service work)
On the owner's DreamHost account, with the owner present (needs their login; do not store the password anywhere):
1. A cron job `* * * * *` runs a PHP script that appends a time to a file. After 5 minutes the file has about 5 lines (proves a 1 minute interval is allowed).
2. A PHP script uses cURL to call `https://fcm.googleapis.com/` and `https://web.push.apple.com/` and prints the HTTP status (proves outbound HTTPS to push services).
3. `php -m` shows openssl, curl, mbstring, gmp or bcmath, pdo_sqlite.
Pass: all three. Fail: stop and take the owner's decision on the fallbacks in research R1.

## Local checks (no phone)
| # | Command / action | Expected |
|---|---|---|
| L1 | `npm run lint && npm test` | Pass; unit tests cover `desiredReminders`, `diffReminders`, `activeAlert`, `chimeTimes`, the saved-state field and the wording check (SC-008) |
| L2 | `npm run test:e2e` | Existing 166 tests still pass; new specs for the in-page alert (US1), the control states and prompt timing (US2), the honest wording and the privacy test with notifications off (SC-010) |
| L3 | e2e: fake push event in Chromium | Hidden page shows one notification "Time is up" with the step name; a visible page shows none and gets the alert; the repeat replaces the first |
| L4 | `cd service && composer install && vendor/bin/phpunit` | Valid and invalid requests, caps, allowlist, replace semantics, delete, retention at 24 h, repeat once, and a message sent to a mock push server decrypts to the fixed payload |
| L5 | `npm run build` | Passes the 50 KB budget and the relative-URL check; the service worker precache is unchanged apart from new files |

## Real-device checks (owner)
| # | Scenario | Expected |
|---|---|---|
| D1 | Android Chrome: turn on, start a 1 min timer, lock the phone | Notification within 2 minutes of the end; tap opens the step with the alert |
| D2 | iPhone, Home Screen app: turn on, 1 min timer, lock | Same; in a normal Safari tab the control explains "Add to Home Screen" |
| D3 | Do Not Disturb or silent switch | Delivery follows the phone's rules and the app's wording does not promise otherwise |
| D4 | Mark a wait done early and pause a timer | No notification arrives (registration cancelled) |
| D5 | Fridge rest | The notification arrives at "Come back at" |
| D6 | Turn notifications off, then check the service store | No rows remain for that phone |
