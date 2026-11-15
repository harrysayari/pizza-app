# Contract: Domain functions

The pure, UI-free functions that the unit tests pin down (constitution III and IV). They take a `Clock` or an explicit `now`, never read the real time themselves, and never touch the DOM or storage. These signatures are the boundary between logic and screens.

```ts
type Instant = number;            // milliseconds since epoch
interface Clock { now(): Instant }

// Amounts
ballGrams(size: 12 | 14 | 16): number;
scaleIngredients(totalGrams: number): Ingredient[];   // recipe × (total ÷ 1230), full precision
formatGrams(grams: number): string;                   // "1.1 g" under 10 g, else "202 g"

// Schedule
buildPlan(request: Request, now: Instant, opts?: { fridgeMinutes?: number }): Plan;
earliestReady(now: Instant, today: LocalDate): { day: LocalDate; time: TimeChoice; bakeAt: Instant };
minimumLeadMinutes(): number;                         // 1313 at default durations
stepsFromSaved(saved: SavedPlanInputs): Step[];       // rebuild without re-planning

// Progress
estimateReady(plan: Plan, doneAt: Record<string, Instant>, now: Instant): { readyAt: Instant; minutesBehind: number };

// Timer
startTimer(step: Step, now: Instant): Timer;
pauseTimer(t: Timer, now: Instant): Timer;
resumeTimer(t: Timer, now: Instant): Timer;
addMinute(t: Timer): Timer;
tickTimer(t: Timer, now: Instant): { timer: Timer; fire: boolean; lateByMs: number };
//   fire is true once, when now >= endAt and alerted is false

// Calendar
buildIcs(plan: Plan, exportedAt: Instant): string;

// Sentence
parseRequest(text: string, today: LocalDate): ParsedRequest;   // see request-sentence.md
```

## Behaviour that must hold (becomes test cases)

- `buildPlan` for the same request and `now` returns the same plan every time.
- The last step's `endAt` equals `bakeAt` exactly; every earlier step ends where the next one starts.
- `fridgeMinutes` is always within 960 to 1,440; `status` is `tooSoon` only when 960 does not fit.
- `scaleIngredients(1230)` returns the reference grams; the sum of all ingredients always equals the total passed in.
- `formatGrams(1.1368)` returns "1.1 g"; `formatGrams(9.96)` returns "10 g"; `formatGrams(201.6)` returns "202 g".
- `tickTimer` after `endAt` fires exactly once, with a correct `lateByMs`, even if called a day later.
- Results do not change across a daylight-saving boundary: durations add as absolute milliseconds.
