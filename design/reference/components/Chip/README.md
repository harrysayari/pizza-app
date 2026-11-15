Chip is a single-choice tap target for pizza size, bake day and bake time; it replaces every select box and date picker.

**Markup:** a `<fieldset class="chipset">` with a `<legend>`, and inside it `.chips` holding `label.chip > input[type=radio] + .chip-face`. The radio is the real control, so keyboard, screen readers and the native selected state work with no script. Add `chip-lg` on the label for size chips (display-face number plus a `chip-sub` ball weight).

**You provide:** the legend (`Pizza size`, `Bake day`, `Ready to bake at`), one chip per option, a `chip-sub` where a second fact helps (`280 g ball`, `7:30`), and one `checked` default.

**Rules**
- Selected is tomato fill plus a check mark plus a heavier key edge. Never convey it with colour alone.
- Day chips show weekday names or `Tomorrow`, never dates. Hide or relabel a day that cannot work (see Banner for the too-soon case).
- Minimum 72px wide and 56px tall (80px for size chips); chips wrap onto new lines and keep an 8px gap.
- The input fills the whole chip so the full face is tappable. Keep `pointer-events: none` on the face.
