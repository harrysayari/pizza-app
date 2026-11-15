# Motion

Motion confirms a tap or shows progress. It never decorates. These values are plain CSS custom properties defined in `components/bundle.css` and in the pasted `tokens.css`.

| Token | Value | Use |
|---|---|---|
| `--motion-instant` | 80ms | Colour or opacity changes on press |
| `--motion-fast` | 140ms | Button and chip press, shadow change |
| `--motion-base` | 220ms | Toggle thumb, field focus |
| `--motion-slow` | 420ms | Dough ball growing, timer finish pop |
| `--ease-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Default for everything |
| `--ease-spring` | `cubic-bezier(0.34, 1.4, 0.5, 1)` | Toggle thumb and the finished ring settling, nothing else |

## Rules

- **Press.** Buttons, chips and stepper buttons sink 3px over `--motion-fast`.
- **Signature moments only.** The dough ball grows with timer progress, and the finished ring pops once. The mic pulses while listening. Everything else is still.
- **Reduced motion.** Under `prefers-reduced-motion: reduce`, all animation and transition durations collapse to near zero, the mic pulse stops, and the ball changes size without animating.
- **Never animate layout** (height, width, position of text) and never block a tap behind an animation.
- **Timers use timestamps.** The visible countdown and ring are drawn from the end time, so a sleeping tab never drifts.
