import { expect, test } from '@playwright/test';

// A phone that is online must get the newest page, not the copy the service worker stored earlier.
// The built files have hashed names, so only the page itself (index.html) can go stale.
test('online, a reload takes the page from the network, not the stored copy', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not let tests intercept service worker requests');
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null), { timeout: 15_000 }).toBe(true);

  // The "server" now has a newer page.
  await context.route(/\/$|\/index\.html$/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace('<title>Pizza Dough Planner</title>', '<title>Pizza Dough Planner NEWER</title>');
    await route.fulfill({ response, body });
  });
  await page.reload();
  await expect(page).toHaveTitle('Pizza Dough Planner NEWER');
});
