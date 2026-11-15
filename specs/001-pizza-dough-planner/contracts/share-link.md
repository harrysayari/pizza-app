# Contract: Share link

A shared or bookmarked link restores the user's choices (FR-027, FR-039). It carries choices only, never progress, ticks or timers.

## Format

```
https://<host>/?s=<size>&n=<pizzas>&d=<date>&t=<time>
```

| Param | Values | Example |
|-------|--------|---------|
| `s` | `12`, `14`, `16` | `14` |
| `n` | integer 1 to 12 | `4` |
| `d` | local date `YYYY-MM-DD` | `2026-11-21` |
| `t` | `lunch`, `early`, `dinner` | `dinner` |

## Rules

- All params are optional. Valid ones set their choice. Invalid or missing ones are ignored, never an error.
- If `d` is in the past, or is more than six days after tomorrow, ignore `d` and leave the day unset. The other choices still apply.
- A link never starts a plan on its own. It fills the choices and shows the plan screen, with "Make my plan" ready.
- Saved data on the device wins over a link only if the user chooses "Resume". If both exist, the page asks once: "Open the shared plan or keep your current one?"
- Writing a link: build it from the current Request only; no other data.
- The address is never sent anywhere; there is no server.
