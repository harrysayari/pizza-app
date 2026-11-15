TimelineItem is one step of the back-timed schedule: a clock time, a short title, the instruction, and a dough-ball marker that shows whether the step is done, current or still to come.

**Markup:** an `ol.timeline` of `li.tl-item` with exactly one of `is-done`, `is-now` or `is-later`. Each item holds `.tl-mark > .dough-ball` (decorative, `aria-hidden`) and `.tl-body` with `.tl-time` (`.clock` plus `.tl-day`), `h3.tl-title`, `p.tl-detail` and optional `.tl-badges`. Put `aria-current="step"` on the current item.

**You provide:** the clock time in the user's local 12-hour format, the weekday, a title of five words or fewer, one instruction sentence, and wait badges such as `Wait 18 hr`.

**State is always shown three ways**
- Done: a filled `basil` ball with a check mark, plus the word `Done`.
- Now: a heavy `ink` outline and the word `Now`.
- Later: an empty dashed ball.

**Rules**
- Times use tabular figures and sit above the title so the eye can scan down the clock column.
- A connecting line (`border-strong`) joins the markers. The last item has no line.
- If the bake time is too soon, show a Banner above the timeline instead of an item with an error.
