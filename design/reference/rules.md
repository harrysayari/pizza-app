# Rules for the constitution

Copy this into the project constitution as one principle. Every line is testable.

## Design System Compliance (NON-NEGOTIABLE)

Every screen MUST be built only from the Pizza Dough Planner design system: its tokens, its components, and the layout rules in `layout.md`.

- **Tokens only.** Colours, type, spacing, radii, shadows, motion and z-index MUST come from CSS custom properties defined in `tokens.css`. No literal colour, font-size or spacing value appears in component or page CSS.
- **Components first.** A new UI element MUST first be added to the design system, with a preview and guidelines, before a screen uses it.
- **Tap targets.** Every tappable control MUST be at least 48px by 48px, default to 56px, and sit at least 8px from the next control.
- **Text size.** Body text MUST be at least 16px; step-mode instructions at least 18px; timer digits at least 48px. Text below 16px (14px captions) MUST NOT carry instructions or amounts.
- **Contrast.** Text MUST meet 4.5:1 and control edges, focus rings and icons 3:1, in both `light` and `dark` themes.
- **Not by colour alone.** Selected, done, running, paused and too-soon states MUST each carry a shape, icon or word in addition to colour.
- **Focus and labels.** Every control MUST show a visible focus ring and have an accessible name.
- **Motion.** Animation MUST respect `prefers-reduced-motion`.
- **Copy.** Interface copy MUST follow `copy.md`: imperative, metric grams, 12-hour times, no emoji.
- **Dependencies.** Styling MUST use plain CSS with fonts limited to Fraunces and Atkinson Hyperlegible from a free source. No UI framework or icon library without a constitution amendment.

Rationale: users have floury hands and a propped-up phone in variable light, so one consistent, large, high-contrast system is a requirement, not polish.
