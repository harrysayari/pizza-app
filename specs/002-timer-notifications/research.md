# Research: Timer-End Notifications

Decisions for the plan. Each fact is marked **Verified** (read from a primary source on 2026-11-15), **Known** (standard protocol behaviour, not re-checked here) or **Unverified** (must be tested before the work that depends on it). Unverified items become the spike S0 in `quickstart.md`.

## R1. Where the reminder service runs

- **Decision**: A small PHP service on the existing DreamHost account, next to the static app (same origin, under `/pizza/api/`), plus one cron job that runs every minute. This is **conditional on spike S0 passing**. If S0 fails, stop and ask the owner to choose one of the fallbacks below; do not build around a guess.
- **Facts**:
  - Node.js on DreamHost is only for Managed VPS and Dedicated plans, "Node.js apps can only be installed onto Managed VPS and Dedicated Servers" (**Verified**, DreamHost Node.js overview). So the service cannot be a Node program on shared hosting.
  - PHP is available on DreamHost shared hosting, with several versions selectable in the panel, and cURL is installed on all servers (**Verified**, DreamHost PHP version article and software table).
  - DreamHost's cron article describes the syntax and says jobs run on the server's Pacific time, but states **no minimum interval** (**Verified** that it is not documented). Other hosts reset every-minute jobs to every 15 minutes, and DreamPress (the WordPress product) defaults to 15 minutes with an option to ask support (**Verified** as reported; different product).
  - Whether shared hosting allows outbound HTTPS from PHP or cron to the push services: **Unverified**.
- **Rationale**: Same host means no new account, no cost, no cross-site requests, and nothing outside the project's own hosting (constitution IX exception). PHP is the one server language the plan can rely on there.
- **Alternatives considered**:
  - *Managed VPS (DreamHost)*: allows a long-running Node process with exact timers, but is a paid upgrade and an always-on server to maintain.
  - *A serverless platform with scheduled triggers*: precise and cheap, but a new account and a platform outside the project's hosting; needs an owner decision under principle IX.
  - *A cron interval of 5 or 15 minutes on DreamHost*: works technically but cannot meet the 2 minute target; see R5.

## R2. How the service sends a push

- **Decision**: Send standard Web Push (VAPID-signed, encrypted payload) using the `minishlink/web-push` PHP library, installed with Composer on the developer's machine and uploaded with the service (including its `vendor/` folder).
- **Rationale**: Web Push payloads need ECDH key agreement, HKDF and AES-128-GCM (RFC 8291) plus an ES256 JWT (RFC 8292). Hand-writing that is the kind of crypto code that should not be written for a small project. The library is a dependency of the **service only**; the browser app keeps zero runtime dependencies (principle V, justified in the plan's Complexity Tracking).
- **Facts**: Chrome, Firefox and Safari use the same standard (**Known**); Safari delivers through Apple's push service, so `*.push.apple.com` must be reachable from the server (**Verified**, WebKit "Web Push for Web Apps on iOS and iPadOS"). Required PHP extensions locally: openssl, curl, mbstring, gmp or bcmath, all present (**Verified** on the dev machine). The same extensions on DreamHost: **Unverified** (S0).
- **VAPID contact**: the VAPID token carries a "subject" that is sent to the push services. Use the site's https address, never an email address.
- **Alternatives considered**: a payload-less push (no encryption needed, the service worker would read the step from local storage) is simpler but its behaviour on iPhone is **Unverified**, and it would make the repeat and mute handling depend on storage the service worker may not reach. Rejected for now; the encrypted payload carries the few facts needed.

## R3. What the service stores and sends

- **Decision**: The service keeps rows `(endpoint, p256dh, auth, step_id, end_at, silent, sent_at, repeat_sent_at)` and nothing else. The client sends only a step id from a fixed list of 14; the service maps it to the step title itself, so it can never be made to send free text. The push payload is `{ v, kind: "end" | "repeat", stepId, title, silent }`.
- **Rationale**: Meets spec FR-021 to FR-025 with the least data. No IP address, user agent, plan or timestamp of the user's request is stored, so there is nothing to link a person to a plan. Abuse is bounded by hard caps (R6) instead of per-person rate limits, because per-person limits would need to store identifiers.
- **Retention**: delete a row when its reminder and repeat are sent or cancelled, and any row 24 hours after its `end_at`. A row for the 24 hour fridge rest therefore lives at most about 2 days.

## R4. iPhone and Android behaviour

- **Facts (Verified, WebKit post)**: iOS and iPadOS Web Push works for a web app added to the Home Screen, which then asks permission "in response to direct user interaction" such as a subscribe button; notifications come through Apple's push service.
- **Known**: A page open in a normal Safari tab on iPhone cannot subscribe, so the control must explain the Home Screen step first (spec FR-017). The manifest already has `display: standalone`, which the install needs.
- **Unverified**: whether Safari removes a subscription for pushes that do not show a notification (this plan always shows one), and how long Apple's service holds a message for an offline phone. Both go to the real-device list.
- **Android and desktop (Known)**: Chrome and Firefox allow a subscription from a normal tab after permission; a push wakes the service worker even when the browser is closed.

## R5. Timing

- **Decision**: The cron job runs every minute and sends everything due (`end_at <= now`), so a reminder is up to 60 seconds late plus delivery time (usually seconds). Push messages are sent with a time-to-live of 10 minutes so a late message does not arrive as stale news.
- **Consequence for the spec**: FR-027 and SC-005 said "within 1 minute" and now say "within 2 minutes". A once-a-minute scheduler can miss that by a few seconds. **Recommend changing both to "within 2 minutes"** (decision D2 in the plan). If DreamHost only allows 5 or 15 minute cron, the feature cannot meet either figure and the owner must choose a fallback (R1).
- The service never sends early: a reminder before the timer ends would mislead the cook.

## R6. Keeping the service safe without accounts

- **Decision**: No login. The browser's subscription address is an unguessable capability, and the service only accepts addresses on the known push services' domains (Google, Mozilla, Apple, Microsoft), over https. Hard limits: at most 4 reminders per subscription, `end_at` at most 48 hours ahead, request bodies under 2 KB, at most 5,000 stored rows in total. Requests outside these rules get a 400, 413 or 429 with no user data in the reply.
- **Rationale**: Nobody can use the service to send anything but the fixed message, and only to a phone that registered through the app, because the message text comes from the service's own step list.
- **Alternative rejected**: per-IP rate limiting, because it needs storing IP addresses.

## R7. Client design: one function that says what is wanted

- **Decision**: A pure function `desiredReminders(plan, timer, doneAt, snoozes, now)` returns the set of wait ends that should be registered right now (at most 2: the running timer and the current long wait). A sync step compares it with what was last sent and calls the service with the whole set (replace semantics, see `contracts/reminders-api.md`). Pause, finish early, +1 min, Done, a plan change, mute and turning notifications off all work by changing the inputs, so there is no separate cancel code to get wrong.
- **Rationale**: Idempotent "send the full list" is robust to retries, double taps and a lost connection: the next sync fixes any drift. It is also easy to unit test with the fake clock (principle IV).

## R8. The in-page alert

- **Decision**: An alert component mounted by the app shell above every screen, driven by a pure `activeAlert(plan, timer, doneAt, now)` and a pure `chimeTimes(endAt, now)` (every 30 seconds for up to 5 minutes). It reads from state, so it survives a reload and shows "ended N min ago" the same way for a missed timer.
- **Rationale**: Deriving the alert from state, not from events, keeps one rule for "the page was open", "the page was hidden" and "the app was closed".

## R9. Notification handling in the service worker

- **Decision**: Extend `public/sw.js` with `push` and `notificationclick`. On `push`: if a visible app window exists, tell it with a message and show nothing (FR-011); otherwise show the notification with a fixed tag so a repeat replaces the first (FR-012), silent when the payload says so (FR-013). On click: focus an open window or open the app's start page.
- **Facts (Known)**: showing a notification for every push is required (silent pushes can get a subscription revoked), so the handler always shows one unless a visible window is handling it.
- **Local fallback**: when there is no active registration (permission without a subscription, service unreachable, subscription failed), a page-side timer calls `registration.showNotification` while the page is hidden but running (spec User Story 2). It is switched off whenever a registration is active, so one end never produces two notifications.

## R10. Testing without a phone

- **Decision**: Unit tests (Vitest, fake clock) for the pure functions. Playwright in Chromium delivers a fake push event to the service worker through the browser's debugging protocol and checks the shown notification and the window message; WebKit tests cover the control states only. The PHP service is tested locally with PHPUnit and a small mock push server that stands in for Google's, Mozilla's and Apple's, using subscription keys made in the test.
- **Not testable here**: delivery by a real push service, iOS Home Screen behaviour, phone sleep and Do Not Disturb. These are the real-device checks (quickstart D1 to D6).
