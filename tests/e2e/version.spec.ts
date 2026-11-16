import { expect, test } from '@playwright/test';
import { openSteps } from './steps-helpers';

test('every screen ends with the copyright and the build version', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer.app-version');
  await expect(footer.locator('.app-copyright')).toHaveText(`© ${new Date().getFullYear()} Design & Inspire Lab`);
  await expect(footer.locator('.app-build')).toHaveText(/^Version built \d{1,2} [A-Z][a-z]{2} \d{2}:\d{2} · \S+$/);
  await openSteps(page);
  await expect(page.locator('footer.app-version')).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('footer.app-version')).toHaveText(/Design & Inspire Lab/);
});

// The version line is read to check a build, so it follows the 16px rule (FR-031), not the caption size.
test('the footer text is at least 16px on the plan and settings screens', async ({ page }) => {
  await page.goto('/');
  const sizes = () =>
    page.locator('footer.app-version p').evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
  expect((await sizes()).every((n) => n >= 16)).toBe(true);
  await page.getByRole('button', { name: 'Settings' }).click();
  expect((await sizes()).every((n) => n >= 16)).toBe(true);
});
