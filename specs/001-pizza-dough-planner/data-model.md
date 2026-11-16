# Data Model: Pizza Dough Planner

The product keeps no server data. Everything below lives in the browser, in one saved object plus the share link. Names match the spec's Key Entities.

## Constants (data, not saved)

### Sizes and ball weights

| Size | Ball weight (g) |
|------|-----------------|
| 12" | 280 |
| 14" | 310 |
| 16" | 350 |

Constraint: `pizzas` is an integer from 1 to 12. Total dough = pizzas × ball weight.

### Time-of-day choices

| Id | Label | Local time |
|----|-------|-----------|
| `lunch` | Lunch | 12:30 |
| `early` | Early dinner | 18:00 |
| `dinner` | Dinner | 19:30 |

### Recipe (reference batch = 1,230 g)

**Ingredients** (grams in the reference batch):

| Id | Group | Name | Grams |
|----|-------|------|-------|
| `p-water` | Poolish | Water | 200 |
| `p-honey` | Poolish | Honey | 5 |
| `p-yeast` | Poolish | Yeast | 5 |
| `p-flour` | Poolish | 00 flour | 200 |
| `f-manitoba` | Final dough | Manitoba (bread) flour | 300 |
| `f-flour` | Final dough | 00 flour (or all-purpose) | 200 |
| `f-water` | Final dough | Water | 300 |
| `f-salt` | Final dough | Salt | 20 |

Check: total = 1,230 g. Scale factor = total dough ÷ 1,230.

**Steps** (planning durations; "wait" = the cook does nothing while time passes):

| # | Id | Title | Kind | Minutes | Notes |
|---|----|-------|------|---------|-------|
| 1 | `poolish-mix` | Mix the poolish | active | 3 | uses p-* ingredients |
| 2 | `poolish-rest-open` | Rest uncovered | wait | 15 | countdown |
| 3 | `poolish-rest-sealed` | Seal it and rest | wait | 60 | countdown |
| 4 | `poolish-fridge` | Into the fridge | wait | 960 to 1,440 (default 1,080) | long wait: come-back time |
| 5 | `poolish-warm` | Poolish out of the fridge | wait | 60 | countdown |
| 6 | `final-flours` | Add the flours | active | 5 | uses f-manitoba, f-flour |
| 7 | `final-water` | Add the salt water slowly | active | 5 | uses f-water, f-salt |
| 8 | `final-mix` | Mix the dough | active | 15 | |
| 9 | `final-work` | Work the dough into a ball | active | 10 | |
| 10 | `final-oil-rest` | Oil the surface and rest | wait | 15 | countdown |
| 11 | `final-form` | Form a smooth ball | active | 5 | |
| 12 | `final-bulk` | Cover with a towel and rest | wait | 60 | countdown |
| 13 | `final-portion` | Cut into balls | active | 10 | uses ball weight |
| 14 | `final-proof` | Cover and rest | wait | 90 (range 60 to 120) | countdown; ends at bake time |

A wait step counts as "long" when it exceeds 120 minutes (only step 4).

## Entities

### Request (the user's choices)

| Field | Type | Rule |
|-------|------|------|
| `size` | `12 \| 14 \| 16` | required |
| `pizzas` | integer | 1 to 12 |
| `day` | local date `YYYY-MM-DD` | tomorrow through six days after tomorrow (7 days) at the time of choosing |
| `time` | `lunch \| early \| dinner` | required |

### Plan (derived from Request and the clock)

| Field | Type | Rule |
|-------|------|------|
| `request` | Request | as above |
| `bakeAt` | instant | `day` + `time` in local time |
| `ballGrams` | number | from the size table |
| `totalGrams` | number | pizzas × `ballGrams` |
| `fridgeMinutes` | integer | 960 to 1,440; 1,080 unless shortened to fit |
| `steps` | Step[] | in order, times back-timed from `bakeAt` |
| `status` | `ok \| tooSoon` | `tooSoon` if not even a 960 min fridge fits |
| `earliest` | `{day, time}` or null | set when `tooSoon` |

State transitions: a changed Request recomputes the whole Plan. A Plan never changes on its own over time. `status` is re-evaluated when the page opens.

### Ingredient (per plan)

| Field | Type | Rule |
|-------|------|------|
| `id`, `group`, `name` | from the recipe | |
| `grams` | number | recipe grams × scale factor; whole grams, except under 10 g shown to one decimal |
| `ticked` | boolean | saved |

Display rule: under 10 g use one decimal place (a 1.1 g yeast stays 1.1 g); 10 g or more use whole grams. Rounding is for display only; calculations use full precision.

### Step (per plan)

| Field | Type | Rule |
|-------|------|------|
| `id`, `title`, `instruction`, `kind` | from the recipe | |
| `startAt` | instant | planned start |
| `endAt` | instant | `startAt` + minutes; for `final-proof`, equals `bakeAt` |
| `amounts` | Ingredient list for this step | scaled |
| `long` | boolean | wait longer than 120 minutes |
| `doneAt` | instant or null | saved when the user taps Done |

### Timer (one at most is active; saved)

| Field | Type | Rule |
|-------|------|------|
| `stepId` | string | a wait step of 120 minutes or less |
| `state` | `idle \| running \| paused \| finished` | |
| `endAt` | instant | set on start; moved by +1 min |
| `remainingMs` | integer | stored when paused |
| `alerted` | boolean | prevents repeating the alert |

State transitions: `idle → running → finished`; `running ⇄ paused`; `running → finished` also by tapping "finish early".

### Preferences (saved; kept by "Start a new plan")

| Field | Type | Default |
|-------|------|---------|
| `muted` | boolean | false |
| `keepScreenOn` | boolean | true |
| `theme` | `system \| light \| dark` | `system` |

### Progress (saved)

| Field | Type | Rule |
|-------|------|------|
| `screen` | `plan \| schedule \| steps` | last screen shown |
| `currentStepId` | string or null | |
| `estimatedReadyAt` | derived | now or `doneAt` + remaining planned durations; shown with minutes ahead or behind (FR-040) |

## Saved object

One JSON object under the key `pdp:v1`: `{ version, request, plan inputs, ticks, doneAt per step, timer, preferences, progress, savedAt }`. The step list is not stored. The saved object keeps the Request, the `bakeAt` instant and the chosen `fridgeMinutes`, and the steps are rebuilt from those three on open. The fridge duration is stored so that reopening later never re-plans the schedule against a newer clock. Schema: `contracts/saved-state.schema.json`.

## Validation rules (from the spec)

- FR-002: `pizzas` 1 to 12.
- FR-009: grams display rule above.
- FR-012: `fridgeMinutes` always within 960 to 1,440.
- FR-013: `tooSoon` is never an error; it always carries `earliest`.
- FR-026, FR-038, FR-039: clear and restore behaviour operates on the saved object and the link.
