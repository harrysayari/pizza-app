import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, expectTapTargets, useFakeClock } from './helpers';

// Sunday 15 Nov 2026, 10:00 local. Tomorrow dinner bakes Monday 7:30 pm; the first step starts Sunday 7:37 pm.
const NOW_ISO = '2026-11-15T10:00:00';
const NOW = new Date(NOW_ISO).getTime();
const MIN = 60_000;
const TO_FIRST_STEP = (9 * 60 + 37) * MIN;

const chip = (page: Page, text: string) =>
  page.locator('label.chip').filter({ has: page.locator('.chip-line', { hasText: new RegExp(`^${text}$`) }) });
const done = (page: Page) => page.getByRole('button', { name: 'Done, next step' });

async function makePlan(page: Page): Promise<void> {
  await useFakeClock(page, NOW_ISO);
  await page.goto('/');
  await chip(page, 'Sat').click();
  await chip(page, 'Dinner').click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
}

/** Reload, then put the fake clock back where the test says it should be (a reload restarts it). */
async function reloadAt(page: Page, offsetMs: number): Promise<void> {
  await page.reload();
  await page.clock.setSystemTime(NOW + offsetMs);
  await page.clock.fastForward(1000);
}

async function openStepsTomorrow(page: Page): Promise<void> {
  await useFakeClock(page, NOW_ISO);
  await page.goto('/');
  await chip(page, 'Tomorrow').click();
  await chip(page, 'Dinner').click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await page.clock.fastForward(TO_FIRST_STEP);
  await page.getByRole('button', { name: 'Start step-by-step' }).click();
  await expect(page.getByText('Step 1 of 14')).toBeVisible();
}

const openSettings = async (page: Page) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('[data-screen="settings"]')).toBeVisible();
};

test('US6.1 and 5: reload resumes the same schedule screen with the same ticked ingredients', async ({ page }) => {
  await makePlan(page);
  const boxes = page.locator('.ing-list input[type=checkbox]');
  await boxes.nth(0).check();
  await boxes.nth(2).check();
  await expect(page.getByText('Ready to bake Sat 7:30 pm')).toBeVisible();
  await reloadAt(page, 0);
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  await expect(page.getByText('Ready to bake Sat 7:30 pm')).toBeVisible();
  await expect(boxes.nth(0)).toBeChecked();
  await expect(boxes.nth(1)).not.toBeChecked();
  await expect(boxes.nth(2)).toBeChecked();
});

test('US6.5: reload resumes at the same step, and earlier steps stay done', async ({ page }) => {
  await openStepsTomorrow(page);
  await done(page).click();
  await done(page).click();
  await expect(page.getByText('Step 3 of 14')).toBeVisible();
  await reloadAt(page, TO_FIRST_STEP);
  await expect(page.locator('[data-screen="steps"]')).toBeVisible();
  await expect(page.getByText('Step 3 of 14')).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByText('Step 2 of 14')).toBeVisible();
});

test('US6.4: a running timer comes back with the right time left after a reload', async ({ page }) => {
  await openStepsTomorrow(page);
  await done(page).click();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await expect(page.getByText('Resting')).toBeVisible();
  await page.clock.fastForward(5 * MIN);
  await reloadAt(page, TO_FIRST_STEP + 5 * MIN);
  await expect(page.getByText('Step 2 of 14')).toBeVisible();
  await expect(page.getByText('Resting')).toBeVisible();
  await expect(page.locator('.timer-digits')).toHaveText('10:00');
});

test('US6.4: a timer that ended while the page was closed shows the finished state', async ({ page }) => {
  await openStepsTomorrow(page);
  await done(page).click();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await reloadAt(page, TO_FIRST_STEP + 20 * MIN);
  await expect(page.getByText('Time is up')).toBeVisible();
});

test('a paused timer keeps its time left', async ({ page }) => {
  await openStepsTomorrow(page);
  await done(page).click();
  await page.getByRole('button', { name: 'Start 15 min' }).click();
  await page.clock.fastForward(4 * MIN);
  await page.getByRole('button', { name: 'Pause' }).click();
  await reloadAt(page, TO_FIRST_STEP + 60 * MIN);
  await expect(page.getByText('Paused')).toBeVisible();
  await expect(page.locator('.timer-digits')).toHaveText('11:00');
});

test('muted stays muted on the next visit', async ({ page }) => {
  await openStepsTomorrow(page);
  await done(page).click();
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unmute sound' })).toBeVisible();
});

test('US6.6: Start a new plan asks to confirm, clears the plan and keeps mute', async ({ page }) => {
  await openStepsTomorrow(page);
  await done(page).click();
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await openSettings(page);
  await page.getByRole('button', { name: 'Start a new plan' }).click();
  // Asked first: nothing changes until the user says yes.
  await expect(page.getByText('Start a new plan?')).toBeVisible();
  await page.getByRole('button', { name: 'Keep my plan' }).click();
  await expect(page.getByText('Start a new plan?')).toHaveCount(0);
  await page.getByRole('button', { name: 'Start a new plan' }).click();
  await page.getByRole('button', { name: 'Yes, start a new plan' }).click();
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Make my plan' })).toBeDisabled();
  await page.reload();
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Make my plan' })).toBeDisabled();
  await openSettings(page);
  await expect(page.getByRole('switch', { name: 'Mute sound' })).toBeChecked();
});

test('US6.7: Clear saved data asks to confirm and removes everything, mute included', async ({ page }) => {
  await openStepsTomorrow(page);
  await done(page).click();
  await page.getByRole('button', { name: 'Mute sound' }).click();
  await openSettings(page);
  await page.getByRole('button', { name: 'Clear saved data' }).click();
  await expect(page.getByText('Clear saved data?')).toBeVisible();
  await page.getByRole('button', { name: 'Keep my data' }).click();
  expect(await page.evaluate(() => localStorage.getItem('pdp:v1'))).not.toBeNull();
  await page.getByRole('button', { name: 'Clear saved data' }).click();
  await page.getByRole('button', { name: 'Yes, clear everything' }).click();
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('pdp:v1'))).toBeNull();
  await page.reload();
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  await openSettings(page);
  await expect(page.getByRole('switch', { name: 'Mute sound' })).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('pdp:v1'))).toBeNull();
});

test('missing, broken or unknown saved data shows the start screen with no error', async ({ page }) => {
  await useFakeClock(page, NOW_ISO);
  await page.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('pdp:v1', '{this is not json');
      }
    } catch {
      // ignore
    }
  });
  await page.goto('/');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Make my plan' })).toBeDisabled();
  await page.evaluate(() => localStorage.setItem('pdp:v1', JSON.stringify({ version: 99, preferences: {} })));
  await page.reload();
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
});

test('the settings menu is reachable from every screen and goes back', async ({ page }) => {
  await openStepsTomorrow(page);
  await openSettings(page);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('[data-screen="steps"]')).toBeVisible();
  await page.getByRole('button', { name: 'Back to schedule' }).click();
  await openSettings(page);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
});

test('theme choice applies and is remembered', async ({ page }) => {
  await makePlan(page);
  await openSettings(page);
  await chip(page, 'Dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('the settings screen meets tap-size and axe checks', async ({ page }) => {
  await makePlan(page);
  await openSettings(page);
  await page.getByRole('button', { name: 'Share this plan' }).click();
  await expectTapTargets(page);
  await expectNoAxeViolations(page);
});

test('US6.2: Share this plan shows a link that restores the four choices elsewhere', async ({ page, browser }) => {
  await makePlan(page);
  await openSettings(page);
  await page.getByRole('button', { name: 'Share this plan' }).click();
  const link = await page.getByLabel('Share link').inputValue();
  const url = new URL(link);
  expect([...url.searchParams.keys()].sort()).toEqual(['d', 'n', 's', 't']);
  expect(url.searchParams.get('s')).toBe('14');
  expect(url.searchParams.get('n')).toBe('4');
  expect(url.searchParams.get('t')).toBe('dinner');

  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await other.newPage();
  await useFakeClock(p2, NOW_ISO);
  await p2.goto(`/${url.search}`);
  await expect(p2.locator('[data-screen="plan"]')).toBeVisible();
  await expect(chip(p2, '14"').locator('input')).toBeChecked();
  await expect(p2.locator('.stepper-value')).toHaveText('4');
  await expect(chip(p2, 'Sat').locator('input')).toBeChecked();
  await expect(chip(p2, 'Dinner').locator('input')).toBeChecked();
  await expect(p2.getByRole('button', { name: 'Make my plan' })).toBeEnabled();
  await other.close();
});

test('a link with a past or far day keeps the other choices and leaves the day unset', async ({ page }) => {
  await useFakeClock(page, NOW_ISO);
  await page.goto('/?s=16&n=6&d=2026-11-10&t=lunch');
  await expect(chip(page, '16"').locator('input')).toBeChecked();
  await expect(page.locator('.stepper-value')).toHaveText('6');
  await expect(chip(page, 'Lunch').locator('input')).toBeChecked();
  await expect(page.getByRole('button', { name: 'Make my plan' })).toBeDisabled();
});

test('a shared link with saved data present asks once, and either answer works', async ({ page }) => {
  await makePlan(page);
  const share = '/?s=12&n=2&d=2026-11-17&t=lunch';

  await page.goto(share);
  await expect(page.getByText('Open the shared plan or keep your current one?')).toBeVisible();
  await page.getByRole('button', { name: 'Keep my current plan' }).click();
  await expect(page.getByText('Open the shared plan or keep your current one?')).toHaveCount(0);
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
  await expect(page.getByText('Ready to bake Sat 7:30 pm')).toBeVisible();

  await page.goto(share);
  await expect(page.getByText('Open the shared plan or keep your current one?')).toBeVisible();
  await page.getByRole('button', { name: 'Open the shared plan' }).click();
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
  await expect(chip(page, '12"').locator('input')).toBeChecked();
  await expect(page.locator('.stepper-value')).toHaveText('2');
  await expect(chip(page, 'Lunch').locator('input')).toBeChecked();
});
