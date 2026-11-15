import { INGREDIENTS, REFERENCE_TOTAL_GRAMS, SIZES, type IngredientGroup, type PizzaSize } from './recipe';

export interface Ingredient {
  id: string;
  group: IngredientGroup;
  name: string;
  /** Full precision. Round only for display, with formatGrams. */
  grams: number;
}

export function ballGrams(size: PizzaSize): number {
  return SIZES[size];
}

/** Recipe grams x (total / 1230), full precision, no allowance for loss. */
export function scaleIngredients(totalGrams: number): Ingredient[] {
  const factor = totalGrams / REFERENCE_TOTAL_GRAMS;
  return INGREDIENTS.map((i) => ({ id: i.id, group: i.group, name: i.name, grams: i.grams * factor }));
}

/** Display only: whole grams, except under 10 g shown to one decimal. */
export function formatGrams(grams: number): string {
  if (grams < 9.95) return `${grams.toFixed(1)} g`;
  return `${Math.round(grams)} g`;
}
