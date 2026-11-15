StepCard is the single screen of step-by-step mode: where you are, what to do, how much of each ingredient, and one big button to move on.

**Markup:** `article.step` with `.step-meta` (`.step-count` and `.dough-dots`), `h2.step-title`, `ul.step-amounts`, `p.step-text`, an optional CountdownTimer, and `.step-actions` with Back (secondary) and `Done, next step` (primary).

**You provide:** the step title as a verb phrase, the scaled amounts for this step only, one or two sentences of instruction, and the timer when the step is a wait.

**Rules**
- Instruction text is `body-lg`: 18px or larger. Amounts are 20px bold with tabular figures; the ingredient name next to them is plain 16px.
- `Step 4 of 13` is the real position in the sequence, so counting is justified. The dots repeat it visually and are `aria-hidden`; done dots are `basil`, the current dot is `dough` with an `ink` edge.
- Back is one third of the row, `Done, next step` is two thirds, and both are 56px tall. The primary button sits in the thumb zone at the bottom.
- One step per screen. Never stack two instructions that need different timers.
