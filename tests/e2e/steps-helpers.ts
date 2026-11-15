import { expect, type Page } from '@playwright/test';
import { useFakeClock } from './helpers';

// Sunday 15 Nov 2026, 10:00 local. Tomorrow dinner bakes Monday 7:30 pm; the first step starts Sunday 7:37 pm.
export const NOW = '2026-11-15T10:00:00';
export const MIN = 60_000;
export const TO_FIRST_STEP = (9 * 60 + 37) * MIN;

export interface Rec {
  vibrate: unknown[];
  oscStarts: number;
  contexts: number;
  wakeRequests: number;
}

/** Recording fakes for audio, vibration and the wake lock, installed before the page loads. */
export async function stubBrowser(page: Page, wake: 'ok' | 'refuse' = 'ok'): Promise<void> {
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

export const rec = (page: Page): Promise<Rec> => page.evaluate(() => (window as unknown as { __rec: Rec }).__rec);

export async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => s === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

export const chip = (page: Page, text: string) =>
  page.locator('label.chip').filter({ has: page.locator('.chip-line', { hasText: new RegExp(`^${text}$`) }) });
/** The step card's own button (the timer alert has one too). */
export const done = (page: Page) => page.getByRole('article').getByRole('button', { name: 'Done, next step' });

export async function openSteps(page: Page, wake: 'ok' | 'refuse' = 'ok'): Promise<void> {
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

export async function nextSteps(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i++) await done(page).click();
}

/** Step 2 is the 15 minute rest. */
export async function startRest(page: Page): Promise<void> {
  await openSteps(page);
  await nextSteps(page, 1);
  await expect(page.getByText('Step 2 of 14')).toBeVisible();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await expect(page.getByText('Resting')).toBeVisible();
}

