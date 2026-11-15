import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, expectTapTargets, expectTextSizes, useFakeClock } from './helpers';

// Sunday 15 Nov 2026, 10:00 local. Saturday is the sixth day after tomorrow's chip.
const NOW = '2026-11-15T10:00:00';

async function start(page: Page): Promise<void> {
  await useFakeClock(page, NOW);
  await page.goto('/');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
}

const chip = (page: Page, text: string) =>
  page.locator('label.chip').filter({ has: page.locator('.chip-line', { hasText: new RegExp(`^${text}$`) }) });
const makePlan = (page: Page) => page.getByRole('button', { name: 'Make my plan' });

async function choose(page: Page, ...labels: string[]): Promise<void> {
  for (const l of labels) await chip(page, l).click();
}

async function planSaturdayDinner(page: Page): Promise<void> {
  await start(page);
  await choose(page, 'Sat', 'Dinner');
  await makePlan(page).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
}

test('Make my plan stays disabled until a day and time are chosen, with defaults 14" and 4', async ({ page }) => {
  await start(page);
  await expect(chip(page, '14"').locator('input')).toBeChecked();
  await expect(page.locator('.stepper-value')).toHaveText('4');
  await expect(makePlan(page)).toBeDisabled();
  await expect(page.getByText('Choose a day and a time to make your plan.')).toBeVisible();
  await chip(page, 'Sat').click();
  await expect(makePlan(page)).toBeDisabled();
  await chip(page, 'Dinner').click();
  await expect(makePlan(page)).toBeEnabled();
});

test('offers Tomorrow plus six weekday names, never dates', async ({ page }) => {
  await start(page);
  const labels = await page.locator('fieldset', { hasText: 'Bake day' }).locator('label.chip').allInnerTexts();
  expect(labels.map((l) => l.trim())).toEqual(['Tomorrow', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  await expect(page.locator('input[type=date]')).toHaveCount(0);
});

test('scenario 1: 14", 4 pizzas, Saturday dinner', async ({ page }) => {
  await planSaturdayDinner(page);
  const summary = page.getByRole('group', { name: 'Plan summary' });
  await expect(summary).toContainText('4 × 14"');
  await expect(summary).toContainText('310 g');
  await expect(summary).toContainText('1,240 g');
  await expect(page.getByRole('heading', { name: 'Poolish', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Final dough', exact: true })).toBeVisible();
  await expect(page.locator('.ing-list')).toHaveCount(2);
  await expect(page.locator('.ing-list').nth(0).locator('label.ing', { hasText: 'Water' })).toContainText('202 g');
  await expect(page.getByText('Ready to bake Sat 7:30 pm')).toBeVisible();

  const items = page.locator('li.tl-item');
  await expect(items).toHaveCount(14);
  await expect(items.first().locator('.clock')).toHaveText('7:37 pm');
  await expect(items.first().locator('.tl-day')).toHaveText('Fri');
  await expect(items.first().locator('.tl-title')).toHaveText('Mix the poolish');
  await expect(items.last().locator('.clock')).toHaveText('6:00 pm');
  await expect(items.last().locator('.tl-day')).toHaveText('Sat');
});

test('scenario 2 and US1.2: changing size and count updates amounts without restarting', async ({ page }) => {
  await planSaturdayDinner(page);
  await page.getByRole('button', { name: 'Change choices' }).click();
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  // Choices are kept.
  await expect(chip(page, '14"').locator('input')).toBeChecked();
  await expect(chip(page, 'Sat').locator('input')).toBeChecked();
  await expect(chip(page, 'Dinner').locator('input')).toBeChecked();
  await expect(page.locator('.stepper-value')).toHaveText('4');
  await page.getByRole('button', { name: 'One more pizza' }).click();
  await page.getByRole('button', { name: 'One more pizza' }).click();
  await chip(page, '16"').click();
  await expect(makePlan(page)).toBeEnabled();
  await makePlan(page).click();
  const summary = page.getByRole('group', { name: 'Plan summary' });
  await expect(summary).toContainText('6 × 16"');
  await expect(summary).toContainText('350 g');
  await expect(summary).toContainText('2,100 g');
});

test('US1.3: a different time chip shifts every step and the last still ends at the bake time', async ({ page }) => {
  await planSaturdayDinner(page);
  await page.getByRole('button', { name: 'Change choices' }).click();
  await chip(page, 'Lunch').click();
  await makePlan(page).click();
  await expect(page.getByText('Ready to bake Sat 12:30 pm')).toBeVisible();
  const items = page.locator('li.tl-item');
  await expect(items.first().locator('.clock')).toHaveText('12:37 pm');
  await expect(items.first().locator('.tl-day')).toHaveText('Fri');
  await expect(items.last().locator('.clock')).toHaveText('11:00 am');
  await expect(items.last().locator('.tl-day')).toHaveText('Sat');
});

test('US1.4: a ticked ingredient stays ticked while the time changes', async ({ page }) => {
  await planSaturdayDinner(page);
  const water = () => page.locator('.ing-list').nth(0).locator('label.ing', { hasText: 'Water' }).locator('input');
  await water().check();
  await expect(water()).toBeChecked();
  await page.getByRole('button', { name: 'Change choices' }).click();
  await chip(page, 'Early dinner').click();
  await makePlan(page).click();
  await expect(water()).toBeChecked();
  await water().uncheck();
  await expect(water()).not.toBeChecked();
});

test('scenario 2: 12" and 1 pizza show one decimal for yeast and honey, whole grams for flour', async ({ page }) => {
  await start(page);
  await choose(page, '12"', 'Sat', 'Dinner');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'One fewer pizza' }).click();
  await expect(page.locator('.stepper-value')).toHaveText('1');
  await expect(page.getByRole('button', { name: 'One fewer pizza' })).toBeDisabled();
  await makePlan(page).click();
  const poolish = page.locator('.ing-list').nth(0);
  await expect(poolish.locator('label.ing', { hasText: 'Yeast' })).toContainText('1.1 g');
  await expect(poolish.locator('label.ing', { hasText: 'Honey' })).toContainText('1.1 g');
  await expect(poolish.locator('label.ing', { hasText: '00 flour' })).toContainText('46 g');
  await expect(page.getByRole('group', { name: 'Plan summary' })).toContainText('280 g');
});

// Added by lane J (T071): FR-001 and FR-002 had no direct test of the bounds.
test('FR-001: exactly three sizes are offered, one tap each, and each sets the ball weight', async ({ page }) => {
  await start(page);
  const sizes = page.locator('fieldset', { hasText: 'Pizza size' }).locator('label.chip');
  await expect(sizes).toHaveCount(3);
  for (const [label, grams] of [['12"', '280 g'], ['16"', '350 g'], ['14"', '310 g']] as const) {
    await chip(page, label).click();
    await expect(chip(page, label).locator('input')).toBeChecked();
    await expect(chip(page, label)).toContainText(grams);
  }
});

test('FR-002: the stepper stops at 1 and counts by taps, with no typing', async ({ page }) => {
  await start(page);
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'One fewer pizza' }).click();
  await expect(page.locator('.stepper-value')).toHaveText('1');
  await expect(page.getByRole('button', { name: 'One fewer pizza' })).toBeDisabled();
  await page.getByRole('button', { name: 'One more pizza' }).click();
  await expect(page.locator('.stepper-value')).toHaveText('2');
  await expect(page.locator('.stepper input[type=text], .stepper input[type=number]')).toHaveCount(0);
});

test('the stepper stops at 12', async ({ page }) => {
  await start(page);
  for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'One more pizza' }).click();
  await expect(page.locator('.stepper-value')).toHaveText('12');
  await expect(page.getByRole('button', { name: 'One more pizza' })).toBeDisabled();
});

for (const width of [360, 430]) {
  test(`tap targets, text sizes and no overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await start(page);
    const overflows = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(await overflows()).toBe(false);
    await expectTapTargets(page);
    await expectTextSizes(page);
    await choose(page, 'Sat', 'Dinner');
    await expectTapTargets(page);
    // Chips fade their background; axe must not sample a theme switch mid-transition.
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
    await expectNoAxeViolations(page);
    await makePlan(page).click();
    await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
    expect(await overflows()).toBe(false);
    await expectTapTargets(page);
    await expectTextSizes(page);
    await expectNoAxeViolations(page);
  });
}
