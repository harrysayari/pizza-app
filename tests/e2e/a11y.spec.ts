import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, expectTapTargets, expectTextSizes, useFakeClock } from './helpers';

// Quickstart scenario 13 (FR-030 to FR-036, SC-008) and the reduced-motion rule (FR-035).
// Sunday 15 Nov 2026, 10:00 local. Tomorrow dinner bakes Monday 7:30 pm; the first step starts Sunday 7:37 pm.
const NOW = '2026-11-15T10:00:00';
const MIN = 60_000;
const TO_FIRST_STEP = (9 * 60 + 37) * MIN;

const chip = (page: Page, text: string) =>
  page.locator('label.chip').filter({ has: page.locator('.chip-line', { hasText: new RegExp(`^${text}$`) }) });
// The step card's own button (the timer alert has one too, spec 002).
const done = (page: Page) => page.getByRole('article').getByRole('button', { name: 'Done, next step' });

async function makePlan(page: Page, now = NOW, day = 'Tomorrow', time = 'Dinner'): Promise<void> {
  await useFakeClock(page, now);
  await page.goto('/');
  await chip(page, day).click();
  await chip(page, time).click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
}

async function openSteps(page: Page): Promise<void> {
  await makePlan(page);
  await page.clock.fastForward(TO_FIRST_STEP);
  await page.getByRole('button', { name: 'Start step-by-step' }).click();
  await expect(page.getByText('Step 1 of 14')).toBeVisible();
}

/** The three layout and contrast checks. expectNoAxeViolations runs both themes. */
async function checkScreen(page: Page): Promise<void> {
  await expectTapTargets(page);
  await expectTextSizes(page);
  await expectNoAxeViolations(page);
}

/** macOS WebKit only tabs to text fields; Option+Tab reaches every control, as Safari's setting does. */
const tabKey = (page: Page): string => (page.context().browser()?.browserType().name() === 'webkit' ? 'Alt+Tab' : 'Tab');

/** Press Tab until the focused element matches, or fail. */
async function tabTo(page: Page, describe: string, match: (el: Element) => boolean): Promise<void> {
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press(tabKey(page));
    const ok = await page.evaluate(`(${match.toString()})(document.activeElement)`);
    if (ok) return;
  }
  throw new Error(`Tab never reached: ${describe}`);
}

// ---------- every screen and state ----------

test('plan screen: tap, text and contrast rules in both themes', async ({ page }) => {
  await useFakeClock(page, NOW);
  await page.goto('/');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  await checkScreen(page);
});

test('plan screen with a choice made and the too-soon banner', async ({ page }) => {
  await useFakeClock(page, '2026-11-20T18:00:00');
  await page.goto('/');
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Lunch').click();
  await expect(page.locator('.banner .banner-title')).toHaveText('Not enough time for Saturday 12:30 pm');
  await checkScreen(page);
});

test('schedule screen, with the too-soon banner and without', async ({ page }) => {
  await makePlan(page, '2026-11-20T18:00:00', 'Tomorrow', 'Lunch');
  await expect(page.locator('.banner[role=status]')).toHaveCount(1);
  await checkScreen(page);
  await page.getByRole('button', { name: 'Use Saturday 6:00 pm' }).click();
  await expect(page.locator('.banner')).toHaveCount(0);
  await checkScreen(page);
});

test('schedule screen after the calendar message appears', async ({ page }) => {
  await page.addInitScript(() => {
    // Hand the file to nothing; the page falls back to a message.
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
  await makePlan(page);
  await page.getByRole('button', { name: /calendar/i }).first().click();
  await expect(page.locator('.banner[role=status]').first()).toBeVisible();
  await checkScreen(page);
});

test('step mode: idle timer, running, paused, finished and the come-back step', async ({ page }) => {
  await openSteps(page);
  await checkScreen(page); // step 1, no timer
  await done(page).click();
  await expect(page.getByText('Step 2 of 14')).toBeVisible();
  await checkScreen(page); // idle timer
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await expect(page.getByText('Resting')).toBeVisible();
  await checkScreen(page);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('Paused')).toBeVisible();
  await checkScreen(page);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.fastForward(15 * MIN);
  await expect(page.getByText('Time is up').first()).toBeVisible();
  await checkScreen(page);
  await done(page).click();
  await done(page).click();
  await expect(page.getByText(/Come back at/)).toBeVisible();
  await checkScreen(page);
});

test('step mode: the late estimate and the all-done state', async ({ page }) => {
  await openSteps(page);
  await page.clock.fastForward(28 * MIN);
  await done(page).click();
  await expect(page.getByText('25 min behind')).toBeVisible();
  await checkScreen(page);
  for (let i = 0; i < 13; i++) await done(page).click();
  await expect(page.getByText(/All 14 steps are done/)).toBeVisible();
  await checkScreen(page);
});

test('settings screen and both confirmations', async ({ page }) => {
  await makePlan(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('[data-screen="settings"]')).toBeVisible();
  await checkScreen(page);
  await page.getByRole('button', { name: 'Start a new plan' }).click();
  await expect(page.getByText('Start a new plan?')).toBeVisible();
  await checkScreen(page);
  await page.getByRole('button', { name: 'Keep my plan' }).click();
  await page.getByRole('button', { name: 'Clear saved data' }).click();
  await expect(page.getByText('Clear saved data?')).toBeVisible();
  await checkScreen(page);
});

// ---------- keyboard ----------

test('SC-008: a keyboard-only user can complete a plan and the first step', async ({ page }) => {
  await useFakeClock(page, NOW);
  await page.goto('/');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();

  await tabTo(page, 'a bake day radio', (el) => el instanceof HTMLInputElement && el.name === 'day');
  await page.keyboard.press('Space');
  await tabTo(page, 'a ready time radio', (el) => el instanceof HTMLInputElement && el.name === 'time');
  await page.keyboard.press('Space');
  await expect(page.locator('input[name=day]:checked')).toHaveCount(1);
  await expect(page.locator('input[name=time]:checked')).toHaveCount(1);

  await tabTo(page, 'Make my plan', (el) => el.textContent === 'Make my plan');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();

  await tabTo(page, 'Start step-by-step', (el) => el.textContent === 'Start step-by-step');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Step 1 of 14')).toBeVisible();

  await tabTo(page, 'Done, next step', (el) => el.textContent === 'Done, next step');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Step 2 of 14')).toBeVisible();
});

test('FR-033: the focused control always shows a visible focus indicator', async ({ page }) => {
  await useFakeClock(page, NOW);
  await page.goto('/');
  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press(tabKey(page));
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      // Chips and ingredient rows hide the real input and draw the ring on the face beside it.
      const target =
        el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')
          ? ((el.nextElementSibling as HTMLElement | null) ?? el)
          : el;
      // The text field draws its ring on the wrapper (:focus-within).
      const wrap = el.closest('.field-wrap');
      const wrapCs = wrap ? getComputedStyle(wrap) : null;
      const cs = getComputedStyle(target);
      const own = getComputedStyle(el);
      const hasRing =
        (parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none') ||
        (parseFloat(own.outlineWidth) > 0 && own.outlineStyle !== 'none') ||
        cs.boxShadow !== 'none' ||
        (wrapCs !== null && parseFloat(wrapCs.outlineWidth) > 0 && wrapCs.outlineStyle !== 'none');
      return { key: el.dataset.key ?? el.tagName + (el.getAttribute('aria-label') ?? el.textContent ?? ''), hasRing };
    });
    if (info === null) break;
    if (seen.has(info.key)) break;
    seen.add(info.key);
    expect(info.hasRing, `no focus indicator on ${info.key}`).toBe(true);
  }
  expect(seen.size).toBeGreaterThan(5);
});

// ---------- names and non-colour cues ----------

async function unnamed(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const sel = 'button, input, a, select, textarea, [role=switch], [role=button]';
    document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      const labelled = (el as HTMLInputElement).labels?.length
        ? Array.from((el as HTMLInputElement).labels!).some((l) => (l.textContent ?? '').trim() !== '')
        : false;
      const byId = (el.getAttribute('aria-labelledby') ?? '')
        .split(' ')
        .some((id) => (document.getElementById(id)?.textContent ?? '').trim() !== '');
      const name =
        (el.getAttribute('aria-label') ?? '').trim() !== '' ||
        byId ||
        labelled ||
        (el.textContent ?? '').trim() !== '' ||
        (el.getAttribute('title') ?? '').trim() !== '';
      if (!name) out.push(`${el.tagName.toLowerCase()}[data-key=${el.dataset.key ?? ''}]`);
    });
    return out;
  });
}

test('FR-033: every control has an accessible name on every screen', async ({ page }) => {
  await useFakeClock(page, NOW);
  await page.goto('/');
  expect(await unnamed(page)).toEqual([]);
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Dinner').click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  expect(await unnamed(page)).toEqual([]);
  await page.clock.fastForward(TO_FIRST_STEP);
  await page.getByRole('button', { name: 'Start step-by-step' }).click();
  await done(page).click();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  expect(await unnamed(page)).toEqual([]);
  await page.getByRole('button', { name: 'Settings' }).click();
  expect(await unnamed(page)).toEqual([]);
});

test('FR-034: selected, done, running, paused and too-soon each carry more than colour', async ({ page }) => {
  await useFakeClock(page, '2026-11-20T18:00:00');
  await page.goto('/');

  // Selected: a tick shape appears inside the chosen chip and is hidden on the others.
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Lunch').click();
  const tick = async (text: string) =>
    chip(page, text).locator('.chip-check').evaluate((e) => getComputedStyle(e).display);
  expect(await tick('Lunch')).not.toBe('none');
  expect(await tick('Dinner')).toBe('none');

  // Too soon: an icon and the words, not a coloured box alone.
  const banner = page.locator('.banner[role=status]');
  await expect(banner.locator('svg.banner-icon')).toHaveCount(1);
  await expect(banner.locator('.banner-title')).toContainText('Not enough time');
  await expect(chip(page, 'Lunch').locator('.chip-sub')).toContainText('Too soon');

  // Ticked ingredient: a check drawn in the box and a line through the name.
  await page.getByRole('button', { name: 'Use Saturday 6:00 pm' }).click();
  const first = page.locator('.ing-list input[type=checkbox]').first();
  await first.check();
  await expect(first).toBeChecked();
  // Read inside the page: a tick re-renders the list, so a held locator can go stale.
  const ticked = await page.evaluate(() => {
    const row = document.querySelector('.ing-list input:checked')!.parentElement!;
    return {
      mark: getComputedStyle(row.querySelector('.ing-box')!, '::after').content,
      line: getComputedStyle(row.querySelector('.ing-name')!).textDecorationLine,
    };
  });
  expect(ticked.mark).not.toBe('none');
  expect(ticked.line).toContain('line-through');

  // Schedule "now" and "done" items carry words (Now, Done) and a mark.
  await expect(page.locator('.tl-item .tl-mark').first()).toBeAttached();
});

test('FR-034: done steps, running and paused timers show a word or shape', async ({ page }) => {
  await openSteps(page);
  await done(page).click();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await expect(page.locator('.timer-state')).toHaveText('Resting');
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.locator('.timer-state')).toContainText('Paused');
  await expect(page.locator('.timer-state .pause-bars')).toHaveCount(1);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Finish early' }).click();
  await expect(page.locator('.timer-state')).toContainText('Time is up');
  await expect(page.locator('.timer-state .tick')).toHaveCount(1);

  // Done steps on the schedule are marked with the word "Done".
  await page.getByRole('button', { name: 'Back to schedule' }).click();
  await expect(page.locator('.tl-badge-done').first()).toHaveText('Done');
  await expect(page.locator('.tl-item.is-done .tl-mark').first()).toBeAttached();
  const mark = await page.evaluate(() =>
    getComputedStyle(document.querySelector('.tl-item.is-done .tl-mark')!, '::after').content,
  );
  expect(mark).not.toBe('none');
});

test('FR-034: the step that is due now is marked with the word "Now"', async ({ page }) => {
  await makePlan(page);
  await page.clock.fastForward(TO_FIRST_STEP);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: 'Start step-by-step' }).click();
  await page.getByRole('button', { name: 'Back to schedule' }).click();
  await expect(page.locator('.tl-item.is-now .tl-badge-now').first()).toHaveText('Now');
  await expect(page.locator('.tl-item.is-now').first()).toHaveAttribute('aria-current', 'step');
});

// ---------- reduced motion (T066, FR-035) ----------

/** Longest running animation or transition on the page, in ms. */
async function longestMotionMs(page: Page): Promise<number> {
  return page.evaluate(() => {
    let longest = 0;
    for (const a of document.getAnimations()) {
      const t = a.effect?.getComputedTiming();
      const total = Number(t?.endTime ?? 0);
      const iterations = Number(t?.iterations ?? 1);
      longest = Math.max(longest, iterations === Infinity ? Infinity : total);
    }
    return longest;
  });
}

async function stubSpeech(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class NeverEnds {
      onresult = null;
      onend = null;
      onerror = null;
      interimResults = false;
      continuous = false;
      lang = '';
      start(): void {}
      stop(): void {}
      abort(): void {}
    }
    const w = window as unknown as Record<string, unknown>;
    w.SpeechRecognition = NeverEnds;
    w.webkitSpeechRecognition = NeverEnds;
  });
}

test('control: with normal motion the listening mic does pulse (so the reduced check can fail)', async ({ page }) => {
  await stubSpeech(page);
  await useFakeClock(page, NOW);
  await page.goto('/');
  await page.getByRole('button', { name: 'Speak your request' }).click();
  await expect(page.getByRole('button', { name: 'Speak your request' })).toHaveAttribute('aria-pressed', 'true');
  expect(await longestMotionMs(page)).toBe(Infinity);
});

test('FR-035: reduced motion stops the mic pulse and the states still show', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await stubSpeech(page);
  await useFakeClock(page, NOW);
  await page.goto('/');
  const mic = page.getByRole('button', { name: 'Speak your request' });
  await mic.click();
  await expect(mic).toHaveAttribute('aria-pressed', 'true');
  const pulse = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.mic')!);
    return { name: cs.animationName, duration: cs.animationDuration, count: cs.animationIterationCount };
  });
  expect(pulse.count, 'mic pulse must not repeat').toBe('1');
  expect(parseFloat(pulse.duration) * (pulse.duration.endsWith('ms') ? 1 : 1000)).toBeLessThanOrEqual(1);
  expect(Number.isFinite(await longestMotionMs(page))).toBe(true);
  // The pressed state still shows without motion: the button is filled and labelled.
  await expect(mic).toHaveAttribute('aria-pressed', 'true');
});

test('FR-035: reduced motion collapses the timer ball and the finished ring, and the states still show', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSteps(page);
  await done(page).click();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await expect(page.locator('.timer-state')).toHaveText('Resting');
  const ball = await page.evaluate(() => getComputedStyle(document.querySelector('.timer-ball')!).transitionDuration);
  expect(Math.max(...ball.split(',').map((d) => parseFloat(d) * (d.trim().endsWith('ms') ? 1 : 1000)))).toBeLessThanOrEqual(1);
  await page.clock.fastForward(5 * MIN);
  await expect(page.locator('.timer-digits')).toHaveText(/^10:0\d$|^09:5\d$/);

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.locator('.timer-state')).toContainText('Paused');

  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.fastForward(10 * MIN);
  await expect(page.locator('.timer-state')).toContainText('Time is up');
  // Read inside the page: the timer is re-rendered on each tick, so a held locator can go stale.
  const ring = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.timer-ring')!);
    return { duration: cs.animationDuration, count: cs.animationIterationCount };
  });
  expect(ring.count).toBe('1');
  expect(parseFloat(ring.duration) * (ring.duration.endsWith('ms') ? 1 : 1000)).toBeLessThanOrEqual(1);
  expect(Number.isFinite(await longestMotionMs(page))).toBe(true);
  await expectTapTargets(page);
});

test('control: with normal motion the finished ring animates for the full pop', async ({ page }) => {
  await openSteps(page);
  await done(page).click();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await page.getByRole('button', { name: 'Finish early' }).click();
  await expect(page.locator('.timer-state')).toContainText('Time is up');
  const d = await page.evaluate(() => getComputedStyle(document.querySelector('.timer-ring')!).animationDuration);
  expect(parseFloat(d)).toBeGreaterThan(0.1);
});
