Toggle is the on/off switch used for "Keep screen on" in step mode.

**Markup:** `label.toggle` containing `input[type=checkbox][role=switch]`, `.toggle-track > .toggle-thumb`, and `.toggle-text` with the name and a `.toggle-state` line that holds both `On` and `Off` spans.

**You provide:** a label that names the effect, and a plain reason when it is disabled (`Not available in this browser`).

**Rules**
- On is shown three ways: the thumb moves right, the track turns `basil`, and the text says `On`. Off says `Off`.
- The whole row is the tap target and at least 56px tall.
- If the screen wake lock is refused, set `disabled` and say so. Do not hide the toggle.
