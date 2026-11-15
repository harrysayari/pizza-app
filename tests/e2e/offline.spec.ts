import { expect, test, type Page } from '@playwright/test';

// Quickstart scenario 11 and spec US6.3. Runs against the production build (the service worker is
// only registered there). The real clock is used, so the last bake-day chip is always valid.

const chip = (page: Page, text: string) =>
  page.locator('label.chip').filter({ has: page.locator('.chip-line', { hasText: new RegExp(`^${text}$`) }) });

test('load once, go offline, reload, plan and follow the steps', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();

  // Wait for the service worker to be active and in control of the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 15_000 })
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pizza Dough Planner');

  const days = page.locator('fieldset', { hasText: 'Bake day' }).locator('label.chip');
  await days.last().click();
  await chip(page, 'Dinner').click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your steps' })).toBeVisible();

  await page.getByRole('button', { name: 'Start step-by-step' }).click();
  await expect(page.locator('[data-screen="steps"]')).toBeVisible();
  await expect(page.getByText('Step 1 of 14')).toBeVisible();
  await page.getByRole('button', { name: 'Done, next step' }).click();
  await expect(page.getByText('Step 2 of 14')).toBeVisible();

  // The fonts and styles came from the cache too: the page still has its theme.
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');

  await context.setOffline(false);
});

test('the manifest and its icons are served, with URLs relative to the manifest', async ({ request, baseURL }) => {
  const manifestUrl = new URL('manifest.webmanifest', baseURL).href;
  const res = await request.get(manifestUrl);
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBe('Pizza Dough Planner');
  expect(m.display).toBe('standalone');
  // Relative, so the app also works under a sub-path such as /pizza/.
  expect(m.start_url).toBe('./');
  expect(m.scope).toBe('./');
  for (const icon of m.icons as { src: string }[]) {
    expect(icon.src.startsWith('/')).toBe(false);
    expect((await request.get(new URL(icon.src, manifestUrl).href)).ok()).toBe(true);
  }
});
