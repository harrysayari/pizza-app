import { expect, test } from '@playwright/test';
import { openSteps } from './steps-helpers';

test('every screen ends with the copyright and the build version', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer.app-version');
  await expect(footer.locator('.app-copyright')).toHaveText(`© ${new Date().getFullYear()} Design & Inspire Lab`);
  await expect(footer.locator('.app-build')).toHaveText(/^Version built \d{1,2} [A-Z][a-z]{2} \d{2}:\d{2} · \S+$/);
  await openSteps(page);
  await expect(page.locator('footer.app-version')).toBeVisible();
});
