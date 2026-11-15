Pizza Dough Planner helps a home cook plan and make Neapolitan-style dough on a phone in the kitchen: tap a size, a count and a bake time, get a back-timed schedule, then follow one step per screen. Everything here is built for one hand, floury fingers and dim light.

## Visual foundations

- **Ground and ink.** Put every screen on `surface-ground`. Cards, fields and secondary buttons sit on `surface-raised`; wells, the plan summary and disabled controls sit on `surface-sunken`. Body text is `ink`; secondary text is `ink-muted`, never for instructions or amounts.
- **Action colour.** `tomato` is the only action colour: primary buttons, selected chips, the running timer ring. Text on it is `on-tomato`. Use at most one primary button per screen.
- **Done colour.** `basil` means finished: done markers, ticked ingredients, the finished timer. Always pair it with a check mark or the word `Done`.
- **Heads-up colour.** `semolina-soft` with `semolina-text` is for the too-soon note and nothing else. It is a notice, not an error.
- **Signature.** The dough ball (`dough`, `dough-ball`) is the one decorative motif. It marks timeline steps and grows inside the countdown ring. Do not add other illustrations, emoji or photos.
- **Type.** Set headings and big numbers in Fraunces (`display`, `h1` to `h3`). Set everything else in Atkinson Hyperlegible: `body` 16px, `body-lg` 18px for step instructions, `label` for controls, `caption` 14px for helper text only. Clock times, amounts and the timer use tabular figures.
- **Shape.** Controls use `radius-lg`; toggles, stepper buttons and rings use `radius-pill`. Buttons and chips have a solid key edge (`shadow-key-tomato`, `shadow-key-neutral`) and sink 3px when pressed. Cards use `shadow-raised`.
- **Spacing.** Gaps come from `space-1` to `space-8`. Every tappable control is at least `tap-min` (48px), defaults to `tap-comfort` (56px), and stays `tap-gap` (8px) from its neighbours. The page gutter is `space-4`.
- **Themes.** Use `light` by default and `dark` for dim kitchens. `dark` is warm charcoal with bright accents and is designed to stay readable at low screen brightness. Pick the theme from the system setting and offer a manual switch.
- **Focus.** Keep the 3px `focus-ring` outline with 3px offset on every control.

## Content fundamentals

- Say what to do, in the second person, in short sentences: `Mix by hand for 2 to 3 minutes.`
- Write amounts as a number, a space and `g`: `302 g`. Use metric only. Times are 12-hour with am/pm: `7:25 pm`.
- Name days as `Tomorrow`, `Sat`, `Sun`. Never show a calendar date picker.
- No emoji, no exclamation marks, no jokes in instructions.

## Components

Button, Chip, Stepper, TextField, Toggle, TimelineItem, IngredientRow, StepCard, CountdownTimer and Banner cover the three screens. Their classes live in `components/bundle.css` and are plain CSS with no script required. Use only these components and tokens. If a screen needs a new one, add it here first.
