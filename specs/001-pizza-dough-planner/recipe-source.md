# Recipe source: Neapolitan dough (poolish)

Extracted from the user's FigJam flowchart "PIZZA" (exported as PDF). This is the only source for the step wording in `src/domain/recipe.ts` (T008). Keep the meaning; write the app text in the voice of `design/reference/copy.md`.

**Not verified**: the YouTube video the user linked (its transcript could not be fetched), and a board note that mentions salt in the first stage while the flowchart lists honey. The flowchart is followed as written. Confirm both against the video before release.

## Poolish (makes the pre-ferment)

| Ingredient | Grams |
|---|---|
| Water | 200 |
| Honey | 5 |
| Yeast | 5 |
| 00 flour | 200 |

1. Mix by hand for 2 to 3 minutes.
2. Rest uncovered for 15 minutes.
3. Seal and rest at room temperature for 1 hour.
4. Fridge for 16 to 24 hours (24 hours is the maximum).

## Final dough

| Ingredient | Grams |
|---|---|
| Manitoba flour | 300 |
| 00 flour (or all-purpose) | 200 |
| Water | 300 |
| Salt | 20 |

5. Take the poolish out of the fridge 1 hour before mixing.
6. Add the Manitoba and 00 flour. Separately, mix the water and salt, and add that slowly in parts, mixing slowly.
7. Mix for 10 to 15 minutes.
8. Work the dough on a surface until it has no lumps. Shape it into a ball.
9. Oil the surface. Rest 15 minutes, uncovered.
10. Slap the top and detach the dough with a spatula. Form a smooth ball in a bowl and oil the top.
11. Cover with a towel and rest 1 hour.
12. Cut into balls.
13. Rest the balls 1 to 2 hours, covered, before baking.

## Yield

One batch is 1,230 g of dough: four balls of about 307 g. The app rounds to ball weights of 280 g (12"), 310 g (14") and 350 g (16"), and scales every ingredient from the full 1,230 g with no allowance for loss.

## Mapping to the 14 planning steps

The planning durations in `data-model.md` (3, 15, 60, fridge 960 to 1,440, 60, 5, 5, 15, 10, 15, 5, 60, 10, 90 minutes) are the app's own breakdown of the steps above. If wording or a duration looks wrong, fix `recipe.ts` and `data-model.md` together.
