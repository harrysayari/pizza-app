# Layout

Design phone-first for 360px to 430px wide, then widen.

| Width | Behaviour |
|---|---|
| 360 to 430px | One column. Side gutter `space-4` (16px), plus the device safe-area inset. Chips wrap. Size chips fit three across at 360px. |
| 431 to 767px | Same single column, centred, content capped at 480px wide. Gutter grows to `space-5`. |
| 768 to 1023px | Plan and Schedule sit side by side (inputs left, schedule right), each up to 440px. Step mode stays one centred column, 560px max. |
| 1024px and up | Content capped at 960px, centred. Same two-column Plan and Schedule. Step mode stays one column, 640px max, with larger `h2`. |

## Rules

- **No horizontal scroll** at any width. Anything that can overflow wraps or scrolls inside its own container.
- **Screen order.** Plan, then Schedule, then Step mode. The primary action sits at the end of each screen.
- **Thumb zone.** In step mode the `Done, next step` button sits in a bar fixed to the bottom edge. The bar adds `env(safe-area-inset-bottom)` to its padding and uses `z-sticky`.
- **Vertical rhythm.** `space-5` between groups inside a screen, `space-6` between sections, `space-7` below the header.
- **Reading width.** Instruction text stays at 65 characters or fewer per line.
- **Tap spacing.** Never place two tappable controls closer than `tap-gap` (8px), including chips that wrap onto a new row.
- **Media queries** use the pixel breakpoints above. CSS custom properties cannot be used inside them.
- **Landscape phones.** Step mode keeps its single column and lets the page scroll; the bottom bar stays visible.
