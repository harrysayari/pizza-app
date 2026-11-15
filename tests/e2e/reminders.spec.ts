import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { MIN, nextSteps, openSteps } from './steps-helpers';

// Spec 002, user story 3 (client side): the page keeps the reminder service in step with its timers.

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/test-device';

async function setup(page: Page, context: BrowserContext): Promise<void> {
  await context.grantPermissions(['notifications']);
  await page.addInitScript((endpoint) => {
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
    // Headless Chromium has no push service, so stand one in.
    const sub = { endpoint, toJSON: () => ({ endpoint, expirationTime: null, keys: { p256dh: 'p', auth: 'a' } }), unsubscribe: async () => true };
    PushManager.prototype.getSubscription = async () => sub as unknown as PushSubscription;
    PushManager.prototype.subscribe = async () => sub as unknown as PushSubscription;
  }, ENDPOINT);
}

async function turnOn(page: Page): Promise<void> {
  await openSteps(page);
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.getByRole('button', { name: 'Turn on notifications' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('[data-slot="notify-control"]')).toHaveAttribute('data-state', 'on');
}

test.describe('reminder service client (Android Chrome)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'push is stubbed for Chromium only');

  test('a running timer is registered, and pausing replaces it with an empty set', async ({ page, context }) => {
    const bodies: { subscription: { endpoint: string }; reminders: { stepId: string; endAt: number; silent: boolean }[] }[] = [];
    await page.route('**/api/reminders', async (route) => {
      bodies.push(JSON.parse(route.request().postData() ?? '{}'));
      await route.fulfill({ status: 204 });
    });
    await setup(page, context);
    await turnOn(page);
    await nextSteps(page, 1);
    await page.getByRole('button', { name: 'Start 15 min' }).click();
    await expect.poll(() => bodies.at(-1)?.reminders.length).toBe(1);
    const last = bodies.at(-1)!;
    expect(last.subscription.endpoint).toBe(ENDPOINT);
    expect(last.reminders[0]!.stepId).toBe('poolish-rest-open');
    expect(Object.keys(last.reminders[0]!).sort()).toEqual(['endAt', 'silent', 'stepId']);
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect.poll(() => bodies.at(-1)?.reminders.length).toBe(0);
    await page.clock.fastForward(MIN);
  });

  test('turning notifications off tells the service to forget the device', async ({ page, context }) => {
    const calls: { method: string; body: string }[] = [];
    await page.route('**/api/reminders', async (route) => {
      calls.push({ method: route.request().method(), body: route.request().postData() ?? '' });
      await route.fulfill({ status: 204 });
    });
    await setup(page, context);
    await turnOn(page);
    await page.getByRole('button', { name: 'Turn off notifications' }).click();
    await expect.poll(() => calls.some((c) => c.method === 'DELETE')).toBe(true);
    expect(JSON.parse(calls.find((c) => c.method === 'DELETE')!.body)).toEqual({ endpoint: ENDPOINT });
  });

  test('service down: one plain line, and the app keeps working (FR-016)', async ({ page, context }) => {
    await page.route('**/api/reminders', (route) => route.abort());
    await setup(page, context);
    await turnOn(page);
    await nextSteps(page, 1);
    await page.getByRole('button', { name: 'Start 15 min' }).click();
    await expect(page.locator('[data-slot="notify-control"]')).toContainText('reminder service is not answering');
    await expect(page.getByText('Resting')).toBeVisible();
  });
});
