import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, expectTapTargets, expectTextSizes, useFakeClock } from './helpers';

test('an empty app renders', async ({ page }) => {
  await useFakeClock(page, '2026-11-15T10:00:00');
  await page.goto('/');
  await expect(page.locator('#app [data-screen="plan"]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pizza Dough Planner');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await expectTapTargets(page);
  await expectTextSizes(page);
  await expectNoAxeViolations(page);
});
