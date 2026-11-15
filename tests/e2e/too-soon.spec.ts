import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, expectTapTargets, useFakeClock } from './helpers';

// Friday 20 Nov 2026, 18:00 local (quickstart scenario 3).
const NOW = '2026-11-20T18:00:00';

const chip = (page: Page, text: string) =>
  page.locator('label.chip').filter({ has: page.locator('.chip-line', { hasText: new RegExp(`^${text}$`) }) });
const makePlan = (page: Page) => page.getByRole('button', { name: 'Make my plan' });

async function start(page: Page, now = NOW): Promise<void> {
  await useFakeClock(page, now);
  await page.goto('/');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
}

test('scenario 3: Saturday lunch shows the earliest time and a button, never an error', async ({ page }) => {
  await start(page);
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Lunch').click();
  await makePlan(page).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();

  const banner = page.locator('.banner[role=status]');
  await expect(banner).toHaveCount(1);
  await expect(banner.locator('.banner-title')).toHaveText('Not enough time for Saturday 12:30 pm');
  await expect(banner).toContainText('This dough needs about 22 hours. The earliest it can be ready is Saturday 6:00 pm.');
  await expect(page.getByText(/error/i)).toHaveCount(0);
  await expectTapTargets(page);
  await expectNoAxeViolations(page);

  await page.getByRole('button', { name: 'Use Saturday 6:00 pm' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  await expect(page.locator('.banner')).toHaveCount(0);
  await expect(page.getByText('Ready to bake Sat 6:00 pm')).toBeVisible();
  await expect(page.locator('li.tl-item').first().locator('.clock')).toHaveText('6:07 pm');
});

test('the plan screen warns before making the plan, and labels the unworkable time chip', async ({ page }) => {
  await start(page);
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Lunch').click();
  await expect(page.locator('.banner .banner-title')).toHaveText('Not enough time for Saturday 12:30 pm');
  await expect(chip(page, 'Lunch').locator('.chip-sub')).toContainText('Too soon');
  await expect(chip(page, 'Early dinner').locator('.chip-sub')).not.toContainText('Too soon');
  await page.getByRole('button', { name: 'Use Saturday 6:00 pm' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  await expect(page.locator('.banner')).toHaveCount(0);
});

test('a day with no workable time is labelled on its chip', async ({ page }) => {
  await start(page, '2026-11-20T23:30:00');
  await expect(chip(page, 'Tomorrow').locator('.chip-sub')).toContainText('Too soon');
  await expect(chip(page, 'Mon').locator('.chip-sub')).toHaveCount(0);
});
