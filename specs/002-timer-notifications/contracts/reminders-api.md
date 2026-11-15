# Contract: Reminder service HTTP API

Base path: `/pizza/api/` on the same origin as the app (relative URL `./api/reminders` from the app page; constitution and `check-budget` forbid root-absolute URLs). All bodies are JSON, `Content-Type: application/json`, under 2 KB. No cookies, no login, no CORS (same origin). Replies never contain user data.

## `PUT api/reminders`
Replace the full set of reminders for one subscription. Idempotent. An empty `reminders` array cancels everything for it.

Request:
```json
{
  "subscription": { "endpoint": "https://…", "keys": { "p256dh": "…", "auth": "…" } },
  "reminders": [ { "stepId": "poolish-rest", "endAt": 1795000000, "silent": false } ]
}
```
Rules: `endpoint` is https on an allowed push domain (Google FCM, Mozilla autopush, Apple `*.push.apple.com`, Windows `*.notify.windows.com`); `stepId` is one of the 14 ids in `service/steps.php`; `endAt` is epoch seconds, from 60 s in the past to 48 h ahead; at most 4 reminders; no other fields (unknown fields give 400; `subscription.expirationTime` is tolerated because browsers include it).

| Status | Meaning |
|---|---|
| 204 | Stored (or cleared) |
| 400 | Invalid body, endpoint or step |
| 413 | Body over 2 KB |
| 429 | The 5,000-row cap is reached |
| 5xx | Service problem; the app keeps working and tells the user (FR-026) |

## `DELETE api/reminders`
Request body: `{ "endpoint": "https://…" }`. Removes every row for that endpoint. 204 whether or not rows existed, so the reply reveals nothing.

## Push message (service to phone)
Web Push, VAPID-signed, encrypted payload, TTL 600 s, urgency `high`.
```json
{ "v": 1, "kind": "end" | "repeat", "stepId": "poolish-rest", "title": "Poolish rest", "silent": false }
```
The service worker shows: title "Time is up", body = step `title`. Tag `pdp-<stepId>` so the repeat replaces the first. Never any other text.

## Sender (cron, every minute)
`php service/send-due.php`: sends due messages, deletes finished, cancelled, gone or over-age rows. Takes no input. Exit 0 on success; logs counts only.

## Configuration (outside the repo and web root)
`service-config.php` holds the VAPID private key and the database path. The VAPID public key is baked into the client at build time (`VITE_VAPID_PUBLIC_KEY`).

## Service worker messages (page and worker)
- Worker to page: `{ type: "pdp-timer-ended", stepId }` when a push arrives and a visible window exists (the page shows the in-page alert, no notification).
- Notification click: worker focuses or opens the app at `./?step=<stepId>#alert`, and the page shows the alert.
