# Research: Pizza Dough Planner

All technical unknowns from the plan are resolved here. Browser behaviour changes between versions, so every item marked **Verify on device** MUST be checked on a real iPhone and a real Android phone before release.

## R1. Language, build and UI approach

- **Decision**: TypeScript (strict) built with Vite into static files. UI is plain TypeScript and DOM, no UI framework, using the class names from `design/components.css`.
- **Rationale**: The design system is plain CSS with native controls (radio chips, checkbox toggles), the app has four small screens, and the constitution requires simplicity and no unneeded dependencies. A framework would add runtime weight to a page that must load fast and work offline. TypeScript catches the date and unit mistakes that matter most here.
- **Alternatives considered**: Preact or Svelte (smaller than React but still a runtime dependency for four screens); plain JavaScript (no type safety on the schedule maths); a native or hybrid app (rejected by constitution VI).

## R2. Testing

- **Decision**: Vitest for unit tests (domain logic, request parser, ICS builder) and light DOM tests; Playwright with `@axe-core/playwright` for end-to-end tests on Chromium and WebKit with a mobile viewport and a fake clock.
- **Rationale**: Constitution IV requires acceptance tests and a clock that can be controlled. Playwright's clock control lets tests run an 18-hour schedule and a 15-minute timer instantly. Axe checks contrast in both themes. WebKit matters because iPhone Safari is the hardest target.
- **Alternatives considered**: Jest (slower setup with Vite); Cypress (no WebKit); manual testing only (cannot prove the constitution's contrast and tap-size rules).

## R3. Time and scheduling

- **Decision**: Use native `Date` with an injectable `Clock` interface. All durations are absolute milliseconds, so adding and subtracting them is correct across daylight-saving changes. Local wall-clock times are only built when converting a chosen day and chip (for example "Saturday, Dinner = 7:30 pm") into a `Date`, and only formatted for display.
- **Rationale**: Back-timing is subtraction of fixed durations from one instant. Only the user's choice and the display are wall-clock. The Temporal API is not yet available in all target browsers.
- **Alternatives considered**: A date library (extra dependency for one conversion); storing times as strings (drift on DST changes).

### Scheduling rules (from the reference recipe)

Planning durations: poolish mix 3 min, uncovered rest 15 min, sealed rest 60 min, fridge 16 to 24 h (default 18 h), warm-up 60 min, add flours 5 min, add salt water 5 min, mix 15 min, work the dough 10 min, oiled rest 15 min, form and oil 5 min, towel rest 60 min, portion 10 min, covered proof 90 min (range 60 to 120).

- Minimum lead time = 78 min (poolish) + 16 h + 275 min (final dough) ≈ 21 h 53 min, shown as "about 22 hours".
- Start with the fridge at 18 h. If the first step would be in the past, shorten the fridge toward 16 h. If still in the past, the request is too soon.
- **Earliest ready time**: the first of the next eight days' chip times (Lunch, Early dinner, Dinner) that fits with a 16 h fridge.

## R4. Saving and resuming

- **Decision**: `localStorage` holds one versioned JSON object (`pdp:v1`). Every read and write is wrapped in try and catch. The share link carries the choices in the query string.
- **Rationale**: The data is small (one plan, ticks, timers, mute). Cookies would send the plan to a server on every request, and there is no server. Closing the browser keeps `localStorage`.
- **Known limits**: Safari removes script-written storage for sites not visited for about 7 days, unless the page is added to the home screen. Private windows do not persist. The spec covers both (FR-039).
- **Alternatives considered**: Cookies (wrong tool, see above); IndexedDB (more code for a few kilobytes).

## R5. Offline

- **Decision**: A small hand-written service worker that precaches every built file (list injected at build time) and serves from cache first. A web app manifest makes home-screen install optional.
- **Rationale**: Constitution VII. Hand-written avoids a Workbox dependency for one fixed set of files. The service worker needs HTTPS (or localhost).
- **Alternatives considered**: `vite-plugin-pwa` (extra dependency for a fixed asset list).
- **Update rule**: A new build gets a new cache name; the old cache is deleted on activate. The page shows nothing about updates, and the new version applies on next full reload.

## R6. Fonts

- **Decision**: Self-host Fraunces and Atkinson Hyperlegible as bundled woff2 files from `@fontsource` packages (Latin subset), loaded by the app's CSS and precached.
- **Rationale**: The design-system preview used Google Fonts, which would be a third-party runtime service and would fail offline, so both constitution VII and IX rule it out. Both fonts are open-licensed.
- **Follow-up**: Add the font files to `design/tokens.json` `type.fonts` so the design system and the app agree.

## R7. Timer alerts

- **Sound**: Generate a short chime with the Web Audio API (no audio files). Resume the audio context on the first tap, and starting a timer is that tap. Respect the user's mute choice.
- **Vibration**: `navigator.vibrate` where it exists (Android Chrome); silently skipped on iPhone.
- **Keep screen on**: Screen Wake Lock API, requested when a timer starts and re-requested when the page becomes visible. If refused, show a note (FR-020).
- **Accuracy**: Store the end timestamp, never counted ticks. Draw the display every 250 ms while visible, and on the page becoming visible again compare with the clock and fire the missed alert (FR-021).
- **Rationale**: Timers throttle or stop in the background and on a locked phone, so only end-time arithmetic stays correct.
- **Verify on device**: Silent switch behaviour on iPhone; sound after an hour on screen; wake lock while another app is opened.

## R8. Calendar export

- **Decision**: Generate one `.ics` file (RFC 5545) in the browser, one event per step. Active steps get a reminder at their start. Waiting steps get an event that spans the wait and an **absolute-time** alarm at its end.
- **Rationale**: An absolute alarm time works in every calendar app, whereas end-relative alarms are handled inconsistently. A single file adds the whole schedule in one tap and works without a server.
- **Delivery**: Offer the file as a download or share target. **Verify on device**: iPhone Safari does not always hand a generated file to the Calendar app; the fallback is to serve the same text through a "Copy calendar file" sheet or an inline data link.
- **Alternatives considered**: Google or Outlook deep links (per-event, third party); pushing to a calendar API (needs sign-in and a server).

## R9. Say or type the request

- **Decision**: A small local rule-based parser turns a sentence into `{ size, count, day, time }`, with each field optional. The mic button uses the browser's speech recognition where it exists and falls back to the keyboard's dictation.
- **Rationale**: Rules are enough for four fields, run offline, and have no per-use cost. Number words and digits both need handling ("four", "4").
- **Privacy note**: Some browsers send microphone audio to the browser vendor for recognition. The page does not control this, so it is only started by the user tapping the mic and shows a one-line note. See Complexity Tracking in `plan.md`.
- **Alternatives considered**: A hosted AI model (needs a backend and a key, rejected by constitution IX).

## R10. Design tokens pipeline

- **Decision**: `design/tokens.json` is the only source. A small Node script generates `design/tokens.css` from it, and a test fails if a CSS file under `src/` contains a hex colour or if any listed text/background pair misses its contrast target in either theme.
- **Rationale**: Constitution I says tokens.css must be generated and never hand-edited, and the generator currently lives only in a working folder. Moving it into `scripts/` makes the rule enforceable.

## R11. Hosting

- **Decision**: Any static host over HTTPS (for example GitHub Pages, Netlify or Cloudflare Pages). The host is chosen at deploy time and is not part of the code.
- **Rationale**: Service workers, wake lock and speech recognition all need a secure context.

## R12. Browser support

- **Decision**: The last two major versions of Safari on iOS (16.4 or newer), Chrome on Android, and current desktop Chrome, Safari and Firefox for development. Features that are missing degrade quietly (vibration, wake lock, speech).
- **Rationale**: iOS 16.4 added the Wake Lock API for web pages, and the audience is phones.

## Open risks

| ID | Risk | Mitigation |
|----|------|-----------|
| R-1 | iPhone does not open a generated calendar file | Test early; add the copy-file fallback |
| R-2 | Sound blocked by the iPhone silent switch | Always show the finished state; test the mute note |
| R-3 | Safari clears saved data after about 7 days | Share link restores choices; message on empty state |
| R-4 | Ball weights for 14" and 16" are rule-of-thumb | Keep them in one data table; easy to adjust |
