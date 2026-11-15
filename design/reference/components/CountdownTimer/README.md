CountdownTimer counts down a waiting step and shows the dough ball rising inside a progress ring as the time passes; it is the system's signature element.

**Markup:** `.timer[role=timer]` with an inline `--p` (0 to 100, percent elapsed), `.timer-ring > .timer-ball > .dough-ball` (decorative, `aria-hidden`), `.timer-digits`, `.timer-state`, `.timer-sub` and `.timer-actions`. States are classes on `.timer`: none (running or idle), `is-paused`, `is-done`.

**You provide:** the duration, an `aria-label` that updates with the time left (`Rest, 8 minutes 12 seconds left`), and the state words. Update `--p` once a second from a timestamp, not by adding up ticks, so it stays right when the tab sleeps.

**States (all carry words, none rely on colour)**
- Idle: empty ring, the full time, `Ready to start`, a primary Start button.
- Running: `tomato` ring fills clockwise, the ball grows from half size to full, state `Resting`; Pause and `+1 min` are secondary.
- Paused: ring turns `ink-muted`, a pause glyph and the word `Paused`; Resume is primary.
- Finished: ring turns solid `basil`, the ball settles with one spring, a check mark and `Time is up`. Also announce it with sound or vibration only after the user has interacted.

**Rules**
- Digits are `timer`: 56px bold with tabular figures, never below 48px.
- The ring is 220px and sits above the digits. Never place text on the dough ball.
- Under reduced motion the ball changes size without animation and the finish pop is skipped.
