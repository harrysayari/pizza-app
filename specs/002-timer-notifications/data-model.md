# Data Model: Timer-End Notifications

Two places hold data: the phone (browser) and the reminder service. The service holds the smaller set.

## On the phone

### Notification preference (saved state, additive)
Added to the existing `pdp:v1` object under `prefs`. An older saved object without it reads as `off`.

| Field | Type | Notes |
|---|---|---|
| `prefs.notify` | `"off" \| "on"` | The user's choice (FR-018). It is `on` only after the user opted in; the browser's permission is read live and never stored. Cleared by "Clear saved data", kept by "Start a new plan". |

### Control state (derived, not stored)
Shown in words and an icon (FR-008). Computed from `prefs.notify`, the browser permission and what the browser supports.

| State | When | Next step shown |
|---|---|---|
| `unavailable` | No notification support, or iPhone in a normal tab | Explain "Add to Home Screen" where that is the cause |
| `blocked` | Permission is denied | How to allow it in the phone's settings |
| `off` | Supported, not on | "Turn on" opens the explanation (FR-007) |
| `on` | Permission granted and `prefs.notify = on` | "Turn off" |

### Subscription and registration (held by the browser, not in `pdp:v1`)
- The browser's push subscription (endpoint address and two keys) lives in the browser. The app reads it with `getSubscription()`.
- `lastSynced`: a small in-memory copy of the set last sent to the service, so a sync only sends changes. It is rebuilt on start, so losing it is harmless.

### Desired reminder (derived by `desiredReminders`, not stored)
| Field | Type | Notes |
|---|---|---|
| `stepId` | one of the 14 step ids | Maps to the step title on the service |
| `endAt` | epoch ms | A timer's `endAt`, or a long wait's planned end ("Come back at") |
| `silent` | boolean | True when sound is muted (FR-013) |

Rules (what makes a wait appear in the desired set):
- A running timer is included. Paused, finished, done and cleared timers are not.
- The current long wait (over 2 hours) is included once the step before it is marked done (spec clarification), using its planned end, or the end moved by "Remind me in 15 min".
- A set holds at most 2 entries (one running timer and one long wait).
- `prefs.notify` off, permission not granted, or no subscription gives an empty set.

### Active alert (derived by `activeAlert`)
| Field | Notes |
|---|---|
| `stepId`, `endedAt` | From the ended timer or wait |
| `kind` | `timer` (buttons: Done, next step; +1 min) or `wait` (buttons: Done, next step; Remind me in 15 min) |
| `agoMs` | Shown as "ended N min ago" when the page was not in view (FR-016) |
| `chimeTimes` | Every 30 s from `endedAt` for up to 5 minutes; none before the user's first tap, none when muted |

State transitions: `running -> ended` (alert appears) `-> acted` (Done / +1 min / Remind me, alert gone, sound stops). The alert never persists as its own state; it is recomputed from the timer state, so a reload restores it.

## In the reminder service

One table, `reminder`. Nothing else is stored (no log of requests, no IP address, no user agent).

| Column | Type | Notes |
|---|---|---|
| `endpoint` | text, part of key | The phone's notification address; https and on the allowed domains only |
| `p256dh`, `auth` | text | The subscription's two public keys, needed to encrypt the message |
| `step_id` | text, part of key | One of the 14 step ids; the title comes from the service's own fixed list |
| `end_at` | integer (epoch s) | When the reminder is due |
| `silent` | integer 0/1 | Whether the notification should be silent |
| `sent_at` | integer or null | Set when the first message is sent |
| `repeat_due` | integer | `end_at + 300` seconds; the single repeat |
| `repeat_sent_at` | integer or null | Set when the repeat is sent |

Key: (`endpoint`, `step_id`). Replacing a subscription's set deletes its other rows (idempotent sync).

Lifecycle:
1. `PUT` creates or replaces the rows for one subscription.
2. The sender (every minute) sends the first message when `end_at <= now` and `sent_at` is null, then sets `sent_at`.
3. It sends the repeat when `repeat_due <= now` and `repeat_sent_at` is null. A sync that no longer contains the step (the user acted or opened the app) deletes the row, which cancels the repeat.
4. A row is deleted when the repeat is sent, when it is cancelled, when the push service reports the address gone (404/410), and in any case when `now > end_at + 24 h` (FR-022).
5. `DELETE` removes every row for one subscription (FR-023).

Limits: at most 4 rows per endpoint, `end_at` at most 48 h ahead, at most 5,000 rows in all.
