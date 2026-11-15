import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, expectTapTargets, expectTextSizes, useFakeClock } from './helpers';
import { MIN, NOW, TO_FIRST_STEP, chip, done, nextSteps, openSteps, rec, setVisibility, startRest, stubBrowser } from './steps-helpers';

test('scenario 4: the 15 minute rest ends with "Time is up", one chime and one vibration at first', async ({ page }) => {
  await startRest(page);
  expect((await rec(page)).oscStarts).toBe(0);
  await page.clock.fastForward(15 * MIN);
  await expect(page.getByText('Time is up').first()).toBeVisible();
  const r = await rec(page);
  expect(r.oscStarts).toBe(2); // one two-note chime
  expect(r.vibrate).toEqual([[200, 100, 200]]);
  // Spec 002 FR-003: it repeats every 30 seconds while the alert stays (see alert.spec.ts).
  await page.clock.fastForward(30_000);
  expect((await rec(page)).oscStarts).toBe(4);
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
  await expect(page.getByText('Time is up').first()).toBeVisible();
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

test('scenario 5: hiding the page for 18 minutes then showing it plays the alert and says how long ago', async ({ page }) => {
  await startRest(page);
  await setVisibility(page, 'hidden');
  await page.clock.fastForward(18 * MIN);
  expect((await rec(page)).oscStarts).toBe(0);
  await setVisibility(page, 'visible');
  await expect(page.getByText('Time is up').first()).toBeVisible();
  await expect(page.locator('.timer-sub', { hasText: /ended 3 min ago/i })).toBeVisible();
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
  await expect(page.getByText('Time is up').first()).toBeVisible();
  expect((await rec(page)).oscStarts).toBe(0);
});

test('Back goes to the previous step and Done on the last step finishes', async ({ page }) => {
  await openSteps(page);
  await nextSteps(page, 1);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByText('Step 1 of 14')).toBeVisible();
  await expect(page.locator('[data-art="pizza"]')).toHaveCount(0); // not before the dough is ready
  await nextSteps(page, 14);
  await expect(page.getByText(/All 14 steps are done/)).toBeVisible();
});

test('when the dough is ready the last screen shows a pizza drawing and says so', async ({ page }) => {
  await openSteps(page);
  await nextSteps(page, 14);
  await expect(page.getByRole('heading', { name: 'Your dough is ready' })).toBeVisible();
  const art = page.locator('[data-art="pizza"]');
  await expect(art).toBeVisible();
  await expect(art).toHaveAttribute('aria-hidden', 'true'); // decorative; the heading says it in words
  const box = (await art.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(160);
  expect(box.width).toBeLessThanOrEqual(390);
  // Drawn from the colour tokens: the sauce takes the theme's tomato colour, not a fixed value.
  const fills = async () => art.locator('.pizza-sauce').evaluate((e) => getComputedStyle(e).fill);
  const light = await fills();
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  expect(await fills()).not.toBe(light);
});

test('FR-022: the alert note is shown and no copy promises alerts on a locked or closed page', async ({ page }) => {
  await openSteps(page);
  await nextSteps(page, 1);
  const note = 'Alerts play while this page is open. Calendar alarms cover a locked phone.';
  await expect(page.getByText(note)).toBeVisible();
  // Spec 002 FR-017 replaces this rule: the notification control may speak of the background and a
  // locked phone, but only honestly (see notify.spec.ts). Everything else must still make no promise.
  const withoutControl = async (): Promise<string> => {
    const all = await page.locator('body').innerText();
    const ctl = await page.locator('[data-slot="notify-control"]').allInnerTexts();
    return ctl.reduce((t, c) => t.replace(c, ''), all);
  };
  const steps = await withoutControl();
  const schedule = await (async () => {
    await page.getByRole('button', { name: 'Back to schedule' }).click();
    return withoutControl();
  })();
  for (const text of [steps, schedule]) {
    const without = text.replace(note, '');
    expect(without).not.toMatch(/locked|closed|background|even when|even if/i);
  }
});

// Added by lane J (T071): FR-015 had no test of the step card's content.
test('FR-015: a step shows its position, title, instruction and its own amounts', async ({ page }) => {
  await openSteps(page);
  await expect(page.getByText('Step 1 of 14')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Mix the poolish' })).toBeVisible();
  await expect(page.locator('.step-text')).not.toBeEmpty();
  const amounts = page.getByRole('list', { name: 'Amounts for this step' });
  await expect(amounts).toContainText('202 g water');
  await expect(amounts).toContainText('5.0 g yeast');
  await nextSteps(page, 1);
  await expect(page.getByText('Step 2 of 14')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).not.toHaveText('Mix the poolish');
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
  await expect(page.getByText('Time is up').first()).toBeVisible();
  await expectNoAxeViolations(page);
});
