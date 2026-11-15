import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, expectTapTargets, expectTextSizes, useFakeClock } from './helpers';

// Sunday 15 Nov 2026, 10:00 local. Tomorrow dinner bakes Monday 7:30 pm; the first step starts Sunday 7:37 pm.
const NOW = '2026-11-15T10:00:00';
const MIN = 60_000;
const TO_FIRST_STEP = (9 * 60 + 37) * MIN;

interface Rec {
  vibrate: unknown[];
  oscStarts: number;
  contexts: number;
  wakeRequests: number;
}

/** Recording fakes for audio, vibration and the wake lock, installed before the page loads. */
async function stubBrowser(page: Page, wake: 'ok' | 'refuse' = 'ok'): Promise<void> {
  await page.addInitScript((mode) => {
    const w = window as unknown as Record<string, unknown>;
    const rec: Rec = { vibrate: [], oscStarts: 0, contexts: 0, wakeRequests: 0 };
    w.__rec = rec;
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (p: unknown) => {
        rec.vibrate.push(p);
        return true;
      },
    });
    class FakeAudioContext {
      state = 'suspended';
      currentTime = 0;
      destination = {};
      constructor() {
        rec.contexts++;
      }
      resume(): Promise<void> {
        this.state = 'running';
        return Promise.resolve();
      }
      createGain() {
        const param = { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
        return { gain: param, connect() {}, disconnect() {} };
      }
      createOscillator() {
        return {
          type: 'sine',
          frequency: { value: 0, setValueAtTime() {} },
          connect() {},
          disconnect() {},
          start() {
            rec.oscStarts++;
          },
          stop() {},
          addEventListener() {},
        };
      }
    }
    w.AudioContext = FakeAudioContext;
    w.webkitAudioContext = FakeAudioContext;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          rec.wakeRequests++;
          if (mode === 'refuse') throw new DOMException('refused', 'NotAllowedError');
          return { released: false, release: async () => {}, addEventListener() {} };
        },
      },
    });
  }, wake);
}

const rec = (page: Page): Promise<Rec> => page.evaluate(() => (window as unknown as { __rec: Rec }).__rec);

async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => s === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

const chip = (page: Page, text: string) =>
  page.locator('label.chip').filter({ has: page.locator('.chip-line', { hasText: new RegExp(`^${text}$`) }) });
const done = (page: Page) => page.getByRole('button', { name: 'Done, next step' });

async function openSteps(page: Page, wake: 'ok' | 'refuse' = 'ok'): Promise<void> {
  await stubBrowser(page, wake);
  await useFakeClock(page, NOW);
  await page.goto('/');
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Dinner').click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  await page.clock.fastForward(TO_FIRST_STEP);
  await page.getByRole('button', { name: 'Start step-by-step' }).click();
  await expect(page.locator('[data-screen="steps"]')).toBeVisible();
  await expect(page.getByText('Step 1 of 14')).toBeVisible();
}

async function nextSteps(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i++) await done(page).click();
}

/** Step 2 is the 15 minute rest. */
async function startRest(page: Page): Promise<void> {
  await openSteps(page);
  await nextSteps(page, 1);
  await expect(page.getByText('Step 2 of 14')).toBeVisible();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await expect(page.getByText('Resting')).toBeVisible();
}

test('scenario 4: the 15 minute rest ends with "Time is up", one chime and one vibration', async ({ page }) => {
  await startRest(page);
  expect((await rec(page)).oscStarts).toBe(0);
  await page.clock.fastForward(15 * MIN);
  await expect(page.getByText('Time is up')).toBeVisible();
  const r = await rec(page);
  expect(r.oscStarts).toBe(2); // one two-note chime
  expect(r.vibrate).toEqual([[200, 100, 200]]);
  await page.clock.fastForward(MIN);
  expect((await rec(page)).oscStarts).toBe(2);
});

test('no sound is made before the first tap', async ({ page }) => {
  await stubBrowser(page);
  await useFakeClock(page, NOW);
  await page.goto('/');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  const before = await rec(page);
  expect(before.contexts).toBe(0);
  expect(before.oscStarts).toBe(0);
});

test('muted: no sound, but the finished state and vibration still appear', async ({ page }) => {
  await openSteps(page);
  await nextSteps(page, 1);
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await expect(page.getByRole('button', { name: 'Unmute sound' })).toBeVisible();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await page.clock.fastForward(15 * MIN);
  await expect(page.getByText('Time is up')).toBeVisible();
  const r = await rec(page);
  expect(r.oscStarts).toBe(0);
  expect(r.vibrate).toEqual([[200, 100, 200]]);
});

test('muted stays muted on the next visit', async ({ page }) => {
  await openSteps(page);
  await nextSteps(page, 1);
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unmute sound' })).toBeVisible();
});

test('scenario 5: hiding the page for 20 minutes then showing it plays the alert and says how long ago', async ({ page }) => {
  await startRest(page);
  await setVisibility(page, 'hidden');
  await page.clock.fastForward(20 * MIN);
  expect((await rec(page)).oscStarts).toBe(0);
  await setVisibility(page, 'visible');
  await expect(page.getByText('Time is up')).toBeVisible();
  await expect(page.getByText(/ended 5 min ago/i)).toBeVisible();
  const r = await rec(page);
  expect(r.oscStarts).toBe(2);
  expect(r.vibrate).toHaveLength(1);
});

test('scenario 6: the fridge step shows "Come back at" and no countdown', async ({ page }) => {
  await openSteps(page);
  await nextSteps(page, 3);
  await expect(page.getByText('Step 4 of 14')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Into the fridge' })).toBeVisible();
  await expect(page.getByText(/Come back at (Sun|Mon) \d{1,2}:\d{2} (am|pm)/)).toBeVisible();
  await expect(page.locator('.timer')).toHaveCount(0);
  await expect(page.locator('.timer-digits')).toHaveCount(0);
});

test('scenario 7: finishing a step 25 minutes late shows "25 min behind" and a new ready time', async ({ page }) => {
  await openSteps(page);
  await expect(page.getByText(/On time\. Ready about Mon 7:30 pm/)).toBeVisible();
  await page.clock.fastForward(28 * MIN); // step 1 was due to end 3 minutes after it started
  await done(page).click();
  await expect(page.getByText('25 min behind')).toBeVisible();
  await expect(page.getByText(/Ready about Mon 7:55 pm/)).toBeVisible();

  await page.getByRole('button', { name: 'Back to schedule' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  const first = page.locator('li.tl-item').first();
  await expect(first.locator('.clock')).toHaveText('7:37 pm');
  await expect(page.locator('li.tl-item').last().locator('.clock')).toHaveText('6:00 pm');
  await expect(page.getByText('Ready to bake Mon 7:30 pm')).toBeVisible();
});

test('a refused wake lock shows the "screen may lock" note', async ({ page }) => {
  await openSteps(page, 'refuse');
  await nextSteps(page, 1);
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await expect(page.getByText(/screen may lock/i)).toBeVisible();
});

test('keep screen on is requested when a timer starts and can be switched off', async ({ page }) => {
  await openSteps(page);
  await nextSteps(page, 1);
  const toggle = page.getByRole('switch', { name: /Keep screen on/ });
  await expect(toggle).toBeChecked();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await expect.poll(async () => (await rec(page)).wakeRequests).toBe(1);
});

test('timer controls: pause, resume, add a minute and finish early', async ({ page }) => {
  await startRest(page);
  await page.getByRole('button', { name: '+1 min' }).click();
  await expect(page.locator('.timer-digits')).toHaveText(/^(15:5\d|16:00)$/);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('Paused')).toBeVisible();
  const frozen = await page.locator('.timer-digits').innerText();
  await page.clock.fastForward(5 * MIN);
  await expect(page.locator('.timer-digits')).toHaveText(frozen);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('Resting')).toBeVisible();
  await page.getByRole('button', { name: 'Finish early' }).click();
  await expect(page.getByText('Time is up')).toBeVisible();
  expect((await rec(page)).oscStarts).toBe(0);
});

test('Back goes to the previous step and Done on the last step finishes', async ({ page }) => {
  await openSteps(page);
  await nextSteps(page, 1);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByText('Step 1 of 14')).toBeVisible();
  await nextSteps(page, 14);
  await expect(page.getByText(/All 14 steps are done/)).toBeVisible();
});

test('FR-022: the alert note is shown and no copy promises alerts on a locked or closed page', async ({ page }) => {
  await openSteps(page);
  await nextSteps(page, 1);
  const note = 'Alerts play while this page is open. Calendar alarms cover a locked phone.';
  await expect(page.getByText(note)).toBeVisible();
  const steps = await page.locator('body').innerText();
  const schedule = await (async () => {
    await page.getByRole('button', { name: 'Back to schedule' }).click();
    return page.locator('body').innerText();
  })();
  for (const text of [steps, schedule]) {
    const without = text.replace(note, '');
    expect(without).not.toMatch(/locked|closed|background|even when|even if/i);
  }
});

test('step screen meets tap, text and contrast rules in both themes', async ({ page }) => {
  await openSteps(page);
  await nextSteps(page, 1);
  await expectTapTargets(page);
  await expectTextSizes(page);
  await expectNoAxeViolations(page);
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await expect(page.getByText('Resting')).toBeVisible();
  await expectTapTargets(page);
  await expectNoAxeViolations(page);
  await page.clock.fastForward(15 * MIN);
  await expect(page.getByText('Time is up')).toBeVisible();
  await expectNoAxeViolations(page);
});
