IngredientRow is a tappable line in the ingredient list: a check box, the ingredient, and its amount in grams, so cooks can tick items off as they weigh them. The plan summary strip above the lists uses the same numerals.

**Markup:** `ul.ing-list > li > label.ing` containing `input[type=checkbox]`, `.ing-box`, `.ing-name` (with optional `.ing-note`) and `.ing-amount`. The summary is `.summary` with three `.summary-item`s.

**You provide:** the ingredient name, a note only when it changes what the cook does (`or all-purpose`), and the scaled amount rounded to whole grams. Amounts always carry the unit, `202 g`, with a space.

**Rules**
- The whole row is the tap target, at least 56px tall.
- Ticked means a `basil` box with a check mark and a struck-through name, so it is readable without colour.
- Amounts use `amount` (20px, bold, tabular figures) and align on the right edge.
- Use metric grams only. No cups, no ounces.
- Group by stage with an `h3` (`Poolish`, `Final dough`).
