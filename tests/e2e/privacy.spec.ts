import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { useFakeClock } from './helpers';

// FR-029 and SC-010: nothing is sent anywhere. After the first load the page makes no request at
// all; the service worker may fill its own cache from the same origin. Nothing ever goes to
// another origin, there are no sockets, no beacons and no cookies.

const NOW = '2026-11-15T10:00:00';
const MIN = 60_000;
const TO_FIRST_STEP = (9 * 60 + 37) * MIN;

interface Seen {
  url: string;
  origin: string;
  fromServiceWorker: boolean;
  phase: 'load' | 'after';
}

const chip = (page: Page, text: string) =>
  page.locator('label.chip').filter({ has: page.locator('.chip-line', { hasText: new RegExp(`^${text}$`) }) });

function record(context: BrowserContext, page: Page, phase: { now: 'load' | 'after' }): Seen[] {
  const seen: Seen[] = [];
  context.on('request', (req) => {
    const url = req.url();
    if (!/^https?:/.test(url)) return; // data: and blob: URLs never leave the page
    seen.push({
      url,
      origin: new URL(url).origin,
      fromServiceWorker: req.serviceWorker() !== null,
      phase: phase.now,
    });
  });
  page.on('websocket', (ws) => {
    seen.push({ url: `websocket ${ws.url()}`, origin: 'websocket', fromServiceWorker: false, phase: phase.now });
  });
  return seen;
}

async function stubSendBeacon(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __beacons: number };
    w.__beacons = 0;
    navigator.sendBeacon = () => {
      w.__beacons++;
      return true;
    };
  });
}

test('the first load only talks to its own origin', async ({ page, context, baseURL }) => {
  const phase = { now: 'load' as const };
  const seen = record(context, page, phase);
  await page.goto('/');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const origin = new URL(baseURL!).origin;
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.filter((s) => s.origin !== origin).map((s) => s.url)).toEqual([]);
  expect(await context.cookies()).toEqual([]);
});

test('SC-010: a full plan, step mode, share and calendar flow sends no request once loaded', async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const phase: { now: 'load' | 'after' } = { now: 'load' };
  const seen = record(context, page, phase);
  await stubSendBeacon(page);
  await useFakeClock(page, NOW);
  await page.goto('/');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Let the service worker finish filling its cache before the quiet period starts.
  await page.waitForLoadState('networkidle');
  phase.now = 'after';

  // Plan, using the sentence box too.
  await page.getByLabel('Say or type it').fill('four 14-inch pizzas for tomorrow dinner');
  await page.getByLabel('Say or type it').press('Enter');
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Dinner').click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  await page.locator('.ing-list input[type=checkbox]').first().check();

  // Calendar.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Add to calendar' }).click();
  await download;

  // Share.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Share this plan' }).click();
  await expect(page.getByLabel('Share link')).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();

  // Step mode, with a timer to its end.
  await page.clock.fastForward(TO_FIRST_STEP);
  await page.getByRole('button', { name: 'Start step-by-step' }).click();
  await page.getByRole('button', { name: 'Done, next step' }).click();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await page.clock.fastForward(15 * MIN);
  await expect(page.getByText('Time is up').first()).toBeVisible();
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await page.waitForLoadState('networkidle');

  const after = seen.filter((s) => s.phase === 'after');
  const pageRequests = after.filter((s) => !s.fromServiceWorker).map((s) => s.url);
  expect(pageRequests, 'requests made by the page after load').toEqual([]);
  const foreign = after.filter((s) => s.origin !== origin).map((s) => s.url);
  expect(foreign, 'requests to another origin').toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { __beacons: number }).__beacons)).toBe(0);
  expect(await context.cookies()).toEqual([]);

  // Nothing on the page links or posts anywhere else.
  const outbound = await page.evaluate((o) => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).map((a) => a.href);
    const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form[action]')).map((f) => f.action);
    return [...links, ...forms].filter((u) => /^https?:/.test(u) && new URL(u).origin !== o);
  }, origin);
  expect(outbound).toEqual([]);
});

test('opening a shared link sends nothing but same-origin requests', async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const seen = record(context, page, { now: 'load' });
  await stubSendBeacon(page);
  await useFakeClock(page, NOW);
  await page.goto('/?s=14&n=4&d=2026-11-17&t=dinner');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(seen.filter((s) => s.origin !== origin).map((s) => s.url)).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { __beacons: number }).__beacons)).toBe(0);
});

// Spec 002 SC-010: opening the notification control, reading the explanation and even turning
// notifications on send nothing anywhere (there is no reminder service in this part of the feature).
test('using the notification control makes no request once the page has loaded', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'WebKit shows the iPhone Home Screen note instead');
  await page.addInitScript(() => {
    let asks = 0;
    class FakeNotification {
      static permission = 'default';
      static requestPermission(): Promise<string> {
        // The prompts on load and on the first tap are dismissed; the control's prompt is answered.
        if (++asks <= 2) return Promise.resolve('default');
        FakeNotification.permission = 'granted';
        return Promise.resolve('granted');
      }
    }
    (window as unknown as { Notification: unknown }).Notification = FakeNotification;
  });
  const phase = { now: 'load' as 'load' | 'after' };
  const seen = record(context, page, phase);
  await useFakeClock(page, NOW);
  await page.goto('/');
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Dinner').click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  phase.now = 'after';
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Turn on notifications' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('[data-slot="notify-control"]')).toHaveAttribute('data-state', 'on');
  await page.getByRole('button', { name: 'Turn off notifications' }).click();
  expect(seen.filter((s) => s.phase === 'after' && !s.fromServiceWorker).map((s) => s.url)).toEqual([]);
});
