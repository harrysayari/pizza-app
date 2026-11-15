import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, expectTapTargets, expectTextSizes } from './helpers';
import { MIN, done, nextSteps, openSteps, rec, startRest } from './steps-helpers';

// Spec 002, user story 1: the in-page timer alert (FR-001..005, FR-014, FR-016, FR-028).

const alert = (page: import('@playwright/test').Page) => page.getByRole('alert');

test('the alert appears when the timer ends, names the step and offers two one-tap actions', async ({ page }) => {
  await startRest(page);
  await expect(alert(page)).toHaveCount(0);
  await page.clock.fastForward(15 * MIN);
  await expect(alert(page)).toBeVisible();
  await expect(alert(page)).toContainText('Time is up');
  await expect(alert(page)).toContainText('Rest uncovered');
  await expect(alert(page).getByRole('button', { name: 'Done, next step' })).toBeVisible();
  await expect(alert(page).getByRole('button', { name: '+1 min' })).toBeVisible();
});

test('it stays on screen until acted on', async ({ page }) => {
  await startRest(page);
  await page.clock.fastForward(15 * MIN);
  await expect(alert(page)).toBeVisible();
  await page.clock.fastForward(30 * MIN);
  await expect(alert(page)).toBeVisible();
});

test('it shows on the schedule screen too, and Done there moves on', async ({ page }) => {
  await startRest(page);
  await page.getByRole('button', { name: 'Back to schedule' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  await page.clock.fastForward(15 * MIN);
  await expect(alert(page)).toBeVisible();
  await alert(page).getByRole('button', { name: 'Done, next step' }).click();
  await expect(alert(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Start step-by-step' }).click();
  await expect(page.getByText('Step 3 of 14')).toBeVisible();
});

test('"Done, next step" ends the alert and goes to the next step', async ({ page }) => {
  await startRest(page);
  await page.clock.fastForward(15 * MIN);
  await alert(page).getByRole('button', { name: 'Done, next step' }).click();
  await expect(alert(page)).toHaveCount(0);
  await expect(page.getByText('Step 3 of 14')).toBeVisible();
});

test('"+1 min" runs the timer for one more minute and clears the alert', async ({ page }) => {
  await startRest(page);
  await page.clock.fastForward(15 * MIN);
  await alert(page).getByRole('button', { name: '+1 min' }).click();
  await expect(alert(page)).toHaveCount(0);
  await expect(page.locator('.timer-digits')).toHaveText(/00:(59|60|00)|01:00/);
  await page.clock.fastForward(MIN);
  await expect(alert(page)).toBeVisible();
});

test('the chime and vibration repeat every 30 seconds for 5 minutes, then stop (FR-003)', async ({ page }) => {
  await startRest(page);
  await page.clock.fastForward(15 * MIN);
  await expect(alert(page)).toBeVisible();
  expect((await rec(page)).oscStarts).toBe(2);
  for (let i = 2; i <= 10; i++) {
    await page.clock.fastForward(30_000);
    expect((await rec(page)).oscStarts).toBe(2 * i);
  }
  await page.clock.fastForward(2 * MIN);
  const r = await rec(page);
  expect(r.oscStarts).toBe(20);
  expect(r.vibrate).toHaveLength(10);
  await expect(alert(page)).toBeVisible(); // the banner stays; only the sound stops
});

test('acting on the alert stops the sound at once (FR-005)', async ({ page }) => {
  await startRest(page);
  await page.clock.fastForward(15 * MIN);
  await alert(page).getByRole('button', { name: '+1 min' }).click();
  const before = await rec(page);
  await page.clock.fastForward(30_000);
  expect((await rec(page)).oscStarts).toBe(before.oscStarts);
  expect((await rec(page)).vibrate.at(-1)).toBe(0); // vibration cancelled
});

test('muted: no sound, the banner and vibration still appear (FR-004)', async ({ page }) => {
  await openSteps(page);
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await nextSteps(page, 1);
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await page.clock.fastForward(15 * MIN);
  await expect(alert(page)).toBeVisible();
  const r = await rec(page);
  expect(r.oscStarts).toBe(0);
  expect(r.vibrate.length).toBeGreaterThan(0);
});

test('finishing early gives no alert', async ({ page }) => {
  await startRest(page);
  await page.getByRole('button', { name: 'Finish early' }).click();
  await page.clock.fastForward(20 * MIN);
  await expect(alert(page)).toHaveCount(0);
});

test('reopening after a missed end shows the alert with how long ago (FR-016)', async ({ page }) => {
  await startRest(page);
  await page.clock.fastForward(18 * MIN);
  await page.reload();
  await expect(alert(page)).toBeVisible();
  await expect(alert(page)).toContainText('Ended 3 min ago');
});

test('a long wait alerts at its planned end with "Remind me in 15 min" instead of +1 min (FR-014)', async ({ page }) => {
  await openSteps(page);
  for (let i = 0; i < 20 && (await page.getByText(/Come back at/).count()) === 0; i++) await done(page).click();
  await expect(page.getByText(/Come back at/)).toBeVisible();
  await page.clock.fastForward(30 * 60 * MIN); // past the longest fridge rest
  await expect(alert(page)).toBeVisible();
  await expect(alert(page).getByRole('button', { name: '+1 min' })).toHaveCount(0);
  await alert(page).getByRole('button', { name: 'Remind me in 15 min' }).click();
  await expect(alert(page)).toHaveCount(0);
  await page.clock.fastForward(14 * MIN);
  await expect(alert(page)).toHaveCount(0);
  await page.clock.fastForward(2 * MIN);
  await expect(alert(page)).toBeVisible();
  await alert(page).getByRole('button', { name: 'Done, next step' }).click();
  await expect(alert(page)).toHaveCount(0);
});

test('the alert meets the size, tap and contrast rules in both themes (FR-028)', async ({ page }) => {
  await startRest(page);
  await page.clock.fastForward(15 * MIN);
  await expect(alert(page)).toBeVisible();
  await expectTapTargets(page);
  await expectTextSizes(page);
  await expectNoAxeViolations(page);
});

test('reduced motion: the alert shows without animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startRest(page);
  await page.clock.fastForward(15 * MIN);
  await expect(alert(page)).toBeVisible();
  const anim = await alert(page).evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('none');
});
