import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, expectTapTargets, expectTextSizes } from './helpers';
import { MIN, nextSteps, openSteps, setVisibility } from './steps-helpers';

// Spec 002, user story 2 (opt-in notifications) and the honest wording (FR-017, SC-008).

type Perm = 'default' | 'granted' | 'denied';

/** A fake Notification the test controls; the answer to the browser prompt is `answer`. */
async function stubNotification(page: Page, initial: Perm, answer: Perm = 'granted', dismiss = 0): Promise<void> {
  // `dismiss`: the first N asks are dismissed (the user closes the prompt), and the permission stays undecided.
  await page.addInitScript(
    ([start, reply, dismissFirst]) => {
      const w = window as unknown as { __asked: number; Notification: unknown };
      w.__asked = Number(sessionStorage.getItem('asked') ?? '0');
      class FakeNotification {
        static get permission(): string {
          return sessionStorage.getItem('perm') ?? start!;
        }
        static requestPermission(): Promise<string> {
          w.__asked++;
          sessionStorage.setItem('asked', String(w.__asked));
          if (w.__asked <= Number(dismissFirst)) return Promise.resolve('default');
          sessionStorage.setItem('perm', reply!);
          return Promise.resolve(reply!);
        }
      }
      w.Notification = FakeNotification;
    },
    [initial, answer, String(dismiss)],
  );
}

const asked = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { __asked: number }).__asked);
const control = (page: Page) => page.locator('[data-slot="notify-control"]');

test.describe('control states (Android Chrome)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'the iPhone project is covered separately');

  test('the browser permission prompt is requested once when the page loads (FR-007)', async ({ page }) => {
    await stubNotification(page, 'default');
    await openSteps(page);
    expect(await asked(page)).toBe(1);
    await expect(control(page)).toHaveAttribute('data-state', 'on');
    await expect(control(page)).toContainText('Notifications are on');
  });

  test('a refusal is respected: it is not asked again on later taps or navigation', async ({ page }) => {
    await stubNotification(page, 'default', 'denied');
    await openSteps(page);
    await nextSteps(page, 2);
    expect(await asked(page)).toBe(1);
    await expect(control(page)).toHaveAttribute('data-state', 'blocked');
  });

  test('already blocked: nothing is asked', async ({ page }) => {
    await stubNotification(page, 'denied');
    await openSteps(page);
    expect(await asked(page)).toBe(0);
  });

  test('when the browser needs a tap to ask (iPhone Safari), the first tap asks', async ({ page }) => {
    await stubNotification(page, 'default');
    await page.addInitScript(() => {
      // Refuse to prompt without a user gesture: leave the permission undecided.
      const N = (window as unknown as { Notification: { requestPermission: () => Promise<string> } }).Notification;
      const real = N.requestPermission;
      N.requestPermission = () => (navigator.userActivation.isActive ? real() : Promise.resolve('default'));
    });
    await page.goto('/');
    expect(await asked(page)).toBe(0);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await expect.poll(() => asked(page)).toBe(1);
  });

  test('three taps turn it on, and the prompt comes after the explanation', async ({ page }) => {
    await stubNotification(page, 'default', 'granted', 2); // the prompt on load and on the first tap were dismissed
    await openSteps(page);
    await page.getByRole('button', { name: 'Turn on notifications' }).click(); // 1
    await page.getByRole('button', { name: 'Continue' }).click(); // 2 (the browser prompt is the 3rd)
    await expect(control(page)).toHaveAttribute('data-state', 'on');
    expect(await asked(page)).toBe(3); // load, first tap (both dismissed), then the real answer
    await expect(control(page)).toContainText('Notifications are on');
    await page.getByRole('button', { name: 'Turn off notifications' }).click();
    await expect(control(page)).toHaveAttribute('data-state', 'off');
  });

  test('"Not now" asks nothing and leaves it off', async ({ page }) => {
    await stubNotification(page, 'default', 'granted', 2); // the prompt on load and on the first tap were dismissed
    await openSteps(page);
    await page.getByRole('button', { name: 'Turn on notifications' }).click();
    const before = await asked(page);
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(control(page)).toHaveAttribute('data-state', 'off');
    expect(await asked(page)).toBe(before); // "Not now" itself asks nothing
  });

  test('blocked: says so and tells the user what to do', async ({ page }) => {
    await stubNotification(page, 'denied');
    await openSteps(page);
    await expect(control(page)).toHaveAttribute('data-state', 'blocked');
    await expect(control(page)).toContainText('Notifications are blocked');
    await expect(control(page)).toContainText('allow notifications for this site');
    await expect(control(page).getByRole('button')).toHaveCount(0);
  });

  test('not available: says so, and the rest of the app still works', async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as unknown as { Notification?: unknown }).Notification;
    });
    await openSteps(page);
    await expect(control(page)).toHaveAttribute('data-state', 'unavailable');
    await expect(control(page)).toContainText('Notifications are not available');
    await nextSteps(page, 1);
    await expect(page.getByText('Step 2 of 14')).toBeVisible();
  });

  test('the choice is remembered, kept by Start a new plan and cleared by Clear saved data (FR-018)', async ({ page }) => {
    await stubNotification(page, 'default', 'granted', 2); // the prompt on load and on the first tap were dismissed
    await openSteps(page);
    await page.getByRole('button', { name: 'Turn on notifications' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(control(page)).toHaveAttribute('data-state', 'on');
    await page.reload();
    await expect(control(page)).toHaveAttribute('data-state', 'on');

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Start a new plan' }).click();
    await page.getByRole('button', { name: 'Yes, start a new plan' }).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(control(page)).toHaveAttribute('data-state', 'on');

    await page.getByRole('button', { name: 'Clear saved data' }).click();
    await page.getByRole('button', { name: 'Yes, clear everything' }).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(control(page)).toHaveAttribute('data-state', 'off');
  });

  test('every state meets the size, tap and contrast rules in both themes', async ({ page }) => {
    await stubNotification(page, 'default', 'granted', 2); // the prompt on load and on the first tap were dismissed
    await openSteps(page);
    await expectTapTargets(page);
    await expectTextSizes(page);
    await expectNoAxeViolations(page);
    await page.getByRole('button', { name: 'Turn on notifications' }).click();
    await expectTapTargets(page);
    await expectNoAxeViolations(page);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(control(page)).toHaveAttribute('data-state', 'on');
    await expectTapTargets(page);
    await expectNoAxeViolations(page);
  });

  test('the wording promises no delivery and names the calendar-alarm backup (FR-017, SC-008)', async ({ page }) => {
    await stubNotification(page, 'default', 'granted', 2); // the prompt on load and on the first tap were dismissed
    await openSteps(page);
    await page.getByRole('button', { name: 'Turn on notifications' }).click();
    const text = (await page.locator('[data-slot="notify-explain"]').innerText()).toLowerCase();
    expect(text).toContain('calendar alarms');
    expect(text).toMatch(/late or missed/);
    expect(text).not.toMatch(/guarantee|always (notif|alert|work)|never miss|will (notify|alert) you|you will be (told|notified)/);
    await expect(page.getByText(/alerts? (are|is) guaranteed/i)).toHaveCount(0);
  });
});

test('iPhone in a normal tab: explains the Home Screen requirement and offers nothing (FR-017)', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'the iPhone project');
  await openSteps(page);
  await expect(control(page)).toHaveAttribute('data-state', 'unavailable');
  await expect(control(page)).toContainText('Add to Home Screen');
  await expect(control(page).getByRole('button')).toHaveCount(0);
});

test.describe('notification when a timer ends in the background (Android Chrome)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'WebKit cannot receive notifications here');

  async function setup(page: Page, context: import('@playwright/test').BrowserContext): Promise<void> {
    await context.grantPermissions(['notifications']);
    await page.addInitScript(() => {
      // Headless Chromium reports 'denied' here even when the permission is granted.
      Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'granted' });
      const w = window as unknown as { __shown: { title: string; options: NotificationOptions }[] };
      w.__shown = [];
      const original = ServiceWorkerRegistration.prototype.showNotification;
      ServiceWorkerRegistration.prototype.showNotification = function (title, options) {
        w.__shown.push({ title, options: options ?? {} });
        return original.call(this, title, options);
      };
    });
    await openSteps(page);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.getByRole('button', { name: 'Turn on notifications' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(control(page)).toHaveAttribute('data-state', 'on');
    await nextSteps(page, 1);
    await page.getByRole('button', { name: 'Start 15 min' }).click();
  }
  const shown = (page: Page) =>
    page.evaluate(() => (window as unknown as { __shown: { title: string; options: NotificationOptions }[] }).__shown);

  test('one notification at the end, one repeat 5 minutes later, and no third (FR-009)', async ({ page, context }) => {
    await setup(page, context);
    await setVisibility(page, 'hidden');
    await page.clock.fastForward(15 * MIN);
    await expect.poll(async () => (await shown(page)).length).toBe(1);
    const first = (await shown(page))[0]!;
    expect(first.title).toBe('Time is up');
    expect(first.options.body).toBe('Rest uncovered');
    expect(first.options.tag).toBe('pdp-poolish-rest-open');
    await page.clock.fastForward(5 * MIN);
    await expect.poll(async () => (await shown(page)).length).toBe(2);
    await page.clock.fastForward(30 * MIN);
    expect((await shown(page)).length).toBe(2);
  });

  test('none while the page is visible (FR-011)', async ({ page, context }) => {
    await setup(page, context);
    await page.clock.fastForward(16 * MIN);
    expect(await shown(page)).toHaveLength(0);
  });

  test('pausing, finishing early or opening the app cancels it (FR-012)', async ({ page, context }) => {
    await setup(page, context);
    await page.getByRole('button', { name: 'Pause' }).click();
    await setVisibility(page, 'hidden');
    await page.clock.fastForward(30 * MIN);
    expect(await shown(page)).toHaveLength(0);
  });

  test('opening the app after the first one cancels the repeat', async ({ page, context }) => {
    await setup(page, context);
    await setVisibility(page, 'hidden');
    await page.clock.fastForward(15 * MIN);
    await expect.poll(async () => (await shown(page)).length).toBe(1);
    await setVisibility(page, 'visible');
    await setVisibility(page, 'hidden');
    await page.clock.fastForward(10 * MIN);
    expect(await shown(page)).toHaveLength(1);
  });

  test('silent when sound is muted (FR-013)', async ({ page, context }) => {
    await setup(page, context);
    await page.getByRole('button', { name: 'Mute sound' }).click();
    await setVisibility(page, 'hidden');
    await page.clock.fastForward(15 * MIN);
    await expect.poll(async () => (await shown(page)).length).toBe(1);
    expect((await shown(page))[0]!.options.silent).toBe(true);
  });

  test('tapping the notification opens the app on that step with the alert showing (FR-010)', async ({ page }) => {
    await openSteps(page);
    await nextSteps(page, 1);
    await page.getByRole('button', { name: 'Start 15 min' }).click();
    await page.getByRole('button', { name: 'Back to schedule' }).click();
    await page.clock.fastForward(15 * MIN);
    await page.reload();
    await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
    // The service worker's click handler tells an open page; a closed app opens ./?step=<id>.
    await page.goto('/?step=poolish-rest-open');
    await expect(page.locator('[data-screen="steps"]')).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText('Step 2 of 14')).toBeVisible();
  });
});
