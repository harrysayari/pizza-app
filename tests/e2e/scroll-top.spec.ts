import { expect, test, type Page } from '@playwright/test';
import { useFakeClock } from './helpers';
import { NOW, TO_FIRST_STEP, chip, done, stubBrowser } from './steps-helpers';

// Moving to a new screen or a new step always starts at the top of the page.
const scrollDown = (page: Page) => page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 420 });
  await stubBrowser(page);
  await useFakeClock(page, NOW);
  await page.goto('/');
});

test('Make my plan, Start step-by-step, Done and Back each land at the top', async ({ page }) => {
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Dinner').click();
  await scrollDown(page);
  expect(await scrollY(page)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  expect(await scrollY(page)).toBe(0);

  await page.clock.fastForward(TO_FIRST_STEP);
  await page.getByRole('button', { name: 'Start step-by-step' }).scrollIntoViewIfNeeded();
  expect(await scrollY(page)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Start step-by-step' }).click();
  await expect(page.locator('[data-screen="steps"]')).toBeVisible();
  expect(await scrollY(page)).toBe(0);

  await scrollDown(page);
  expect(await scrollY(page)).toBeGreaterThan(0);
  await done(page).click();
  await expect(page.getByText('Step 2 of 14')).toBeVisible();
  expect(await scrollY(page)).toBe(0);

  await scrollDown(page);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByText('Step 1 of 14')).toBeVisible();
  expect(await scrollY(page)).toBe(0);
});

test('opening and leaving Settings land at the top, but ticking an ingredient does not move the page', async ({ page }) => {
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Dinner').click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();

  await page.locator('label.ing').first().scrollIntoViewIfNeeded();
  const before = await scrollY(page);
  expect(before).toBeGreaterThan(0);
  await page.locator('label.ing').first().click();
  expect(await scrollY(page)).toBe(before); // a redraw on the same screen keeps the place

  await scrollDown(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await scrollY(page)).toBe(0);
});

test('Change choices returns to the top of the plan screen', async ({ page }) => {
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Dinner').click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  await scrollDown(page);
  await page.getByRole('button', { name: 'Change choices' }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Change choices' }).click();
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  expect(await scrollY(page)).toBe(0);
});
