// Recipe constants, copied from specs/001-pizza-dough-planner/data-model.md.
// Wording follows design/reference/copy.md. Pure data: no DOM, storage or clock.

export type PizzaSize = 12 | 14 | 16;
export type TimeChoiceId = 'lunch' | 'early' | 'dinner';
export type IngredientGroup = 'Poolish' | 'Final dough';
export type StepKind = 'active' | 'wait';

export interface TimeChoice {
  id: TimeChoiceId;
  label: string;
  /** Local time, HH:MM. */
  time: string;
}

export interface RecipeIngredient {
  id: string;
  group: IngredientGroup;
  name: string;
  /** Grams in the 1,230 g reference batch. */
  grams: number;
}

export interface RecipeStep {
  id: string;
  title: string;
  instruction: string;
  kind: StepKind;
  /** Planning minutes (the default for ranged steps). */
  minutes: number;
  /** Allowed minutes, for steps whose length varies. */
  range?: readonly [number, number];
  /** Ingredient ids this step uses. */
  uses: readonly string[];
  /** True when the step uses the ball weight (portioning). */
  usesBallWeight?: boolean;
}

/** Ball weight in grams per pizza size. */
export const SIZES: Readonly<Record<PizzaSize, number>> = { 12: 280, 14: 310, 16: 350 };

export const TIME_CHOICES: readonly TimeChoice[] = [
  { id: 'lunch', label: 'Lunch', time: '12:30' },
  { id: 'early', label: 'Early dinner', time: '18:00' },
  { id: 'dinner', label: 'Dinner', time: '19:30' },
];

export const REFERENCE_TOTAL_GRAMS = 1230;

export const INGREDIENTS: readonly RecipeIngredient[] = [
  { id: 'p-water', group: 'Poolish', name: 'Water', grams: 200 },
  { id: 'p-honey', group: 'Poolish', name: 'Honey', grams: 5 },
  { id: 'p-yeast', group: 'Poolish', name: 'Yeast', grams: 5 },
  { id: 'p-flour', group: 'Poolish', name: '00 flour', grams: 200 },
  { id: 'f-manitoba', group: 'Final dough', name: 'Manitoba (bread) flour', grams: 300 },
  { id: 'f-flour', group: 'Final dough', name: '00 flour (or all-purpose)', grams: 200 },
  { id: 'f-water', group: 'Final dough', name: 'Water', grams: 300 },
  { id: 'f-salt', group: 'Final dough', name: 'Salt', grams: 20 },
];

export const FRIDGE_RANGE = [960, 1440] as const;
export const FRIDGE_DEFAULT_MINUTES = 1080;
export const LONG_WAIT_OVER_MINUTES = 120;

export const STEPS: readonly RecipeStep[] = [
  {
    id: 'poolish-mix',
    title: 'Mix the poolish',
    instruction:
      'Mix the poolish ingredients by hand for 2 to 3 minutes. Stop when no dry flour is left.',
    kind: 'active',
    minutes: 3,
    uses: ['p-water', 'p-honey', 'p-yeast', 'p-flour'],
  },
  {
    id: 'poolish-rest-open',
    title: 'Rest uncovered',
    instruction: 'Leave the poolish uncovered for 15 minutes.',
    kind: 'wait',
    minutes: 15,
    uses: [],
  },
  {
    id: 'poolish-rest-sealed',
    title: 'Seal it and rest',
    instruction: 'Seal the container and rest it at room temperature for 1 hour.',
    kind: 'wait',
    minutes: 60,
    uses: [],
  },
  {
    id: 'poolish-fridge',
    title: 'Into the fridge',
    instruction:
      'Put the sealed poolish in the fridge for 16 to 24 hours. Do not go past 24 hours.',
    kind: 'wait',
    minutes: FRIDGE_DEFAULT_MINUTES,
    range: FRIDGE_RANGE,
    uses: [],
  },
  {
    id: 'poolish-warm',
    title: 'Poolish out of the fridge',
    instruction: 'Take the poolish out 1 hour before you mix. It warms up while you wait.',
    kind: 'wait',
    minutes: 60,
    uses: [],
  },
  {
    id: 'final-flours',
    title: 'Add the flours',
    instruction: 'Add the Manitoba flour and the 00 flour to the poolish.',
    kind: 'active',
    minutes: 5,
    uses: ['f-manitoba', 'f-flour'],
  },
  {
    id: 'final-water',
    title: 'Add the salt water slowly',
    instruction:
      'Stir the salt into the water, then pour it in a little at a time. Mix slowly after each part.',
    kind: 'active',
    minutes: 5,
    uses: ['f-water', 'f-salt'],
  },
  {
    id: 'final-mix',
    title: 'Mix the dough',
    instruction: 'Mix for 10 to 15 minutes, until the dough comes together.',
    kind: 'active',
    minutes: 15,
    uses: [],
  },
  {
    id: 'final-work',
    title: 'Work the dough into a ball',
    instruction: 'Work the dough on the counter until no lumps are left. Shape it into a ball.',
    kind: 'active',
    minutes: 10,
    uses: [],
  },
  {
    id: 'final-oil-rest',
    title: 'Oil the surface and rest',
    instruction: 'Oil the work surface and set the dough on it. Rest it uncovered for 15 minutes.',
    kind: 'wait',
    minutes: 15,
    uses: [],
  },
  {
    id: 'final-form',
    title: 'Form a smooth ball',
    instruction:
      'Slap the top and free the dough with a spatula. Form a smooth ball in a bowl and oil the top.',
    kind: 'active',
    minutes: 5,
    uses: [],
  },
  {
    id: 'final-bulk',
    title: 'Cover with a towel and rest',
    instruction: 'Cover the bowl with a towel. Rest it for 1 hour.',
    kind: 'wait',
    minutes: 60,
    uses: [],
  },
  {
    id: 'final-portion',
    title: 'Cut into balls',
    instruction: 'Cut the dough into balls of the weight shown for your pizza size.',
    kind: 'active',
    minutes: 10,
    uses: [],
    usesBallWeight: true,
  },
  {
    id: 'final-proof',
    title: 'Cover and rest',
    instruction:
      'Cover the balls and rest them for 1 to 2 hours before baking. The plan ends at bake time.',
    kind: 'wait',
    minutes: 90,
    range: [60, 120],
    uses: [],
  },
];

/** A wait counts as long when it exceeds 120 minutes (only the fridge step). */
export function isLongWait(step: Pick<RecipeStep, 'kind' | 'minutes'>): boolean {
  return step.kind === 'wait' && step.minutes > LONG_WAIT_OVER_MINUTES;
}
