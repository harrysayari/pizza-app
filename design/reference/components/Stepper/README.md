Stepper sets how many pizzas to make with two large round buttons around a big number, so nobody has to type.

**Markup:** `.stepper[role=group]` containing `.stepper-btn` (minus), `.stepper-value` (`aria-live="polite"`), `.stepper-btn` (plus) and an optional `.stepper-unit`.

**You provide:** the group label, `aria-label`s that say what the button does (`One fewer pizza`), and the limits. The plan allows 1 to 12 pizzas.

**Rules**
- Both buttons are 56px circles, 8px or more from the number and from other controls.
- At a limit, set `disabled` on that button. It gets a dashed edge, so it does not rely on colour.
- The value is `display`-sized Fraunces with tabular figures so the number does not jitter.
- Never replace it with a free-text number field.
