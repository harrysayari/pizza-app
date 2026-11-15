# Contract: Calendar export

"Add to calendar" produces one iCalendar file (RFC 5545) containing one event per step (FR-023, FR-024). It is generated in the browser; nothing is sent anywhere.

## File

- Media type `text/calendar`, file name `pizza-dough-<bake date>.ics`, UTF-8, CRLF line endings, lines folded at 75 octets.
- `PRODID:-//Pizza Dough Planner//EN`, `VERSION:2.0`, `CALSCALE:GREGORIAN`.

## Per step

| Property | Value |
|----------|-------|
| `UID` | `<planId>-<stepId>@pizza-dough-planner`, where `planId` is a hash of the Request and `bakeAt`, so re-adding the same plan updates events instead of duplicating them |
| `DTSTAMP` | export instant, UTC |
| `DTSTART`, `DTEND` | the step's `startAt` and `endAt`, UTC (`...Z`). An active step with a short duration still gets at least 5 minutes so it is visible |
| `SUMMARY` | `Pizza dough: <step title>` |
| `DESCRIPTION` | the instruction plus the scaled amounts for that step, in grams |
| `TRANSP` | `TRANSPARENT` so dough steps do not block the calendar |

## Alarms

- **Active step**: one `VALARM` with `ACTION:DISPLAY` at the step's start (`TRIGGER;VALUE=DATE-TIME:<startAt>`).
- **Waiting step**: one `VALARM` at the end of the wait (`TRIGGER;VALUE=DATE-TIME:<endAt>`) with the description `Time to move on: <next step title>`.
- Absolute `DATE-TIME` triggers are used instead of end-relative ones because calendar apps handle end-relative triggers inconsistently.
- The `final-proof` step's alarm sits at the bake time.

## Delivery and failure

- Deliver as a file download or the device's share action.
- If the device does not open the file, show a plain message and a "Copy calendar file" option; the plan is unaffected (US4 scenario 3).
- An export always reflects the planned times, not progress. If the user is running late (FR-040), the file is unchanged.
