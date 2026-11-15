import { expect, test } from '@playwright/test';
import { openSteps } from './steps-helpers';

// Spec 002, user story 4: the explanation says plainly what leaves the phone (FR-025).

test('the explanation names what the reminder service keeps, and what it does not', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'the control is only offered on Android Chrome here');
  await page.addInitScript(() => {
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => 'default' });
  });
  await openSteps(page);
  await page.getByRole('button', { name: 'Turn on notifications' }).click();
  const text = (await page.locator('[data-slot="notify-explain"]').innerText()).toLowerCase();
  expect(text).toContain('notification address');
  expect(text).toContain('the time the timer ends');
  expect(text).toContain('step name');
  expect(text).toMatch(/no plan, name or account/);
  expect(text).toMatch(/within a day/);
  expect(text).toContain('access log');
  expect(text).toMatch(/google, apple or mozilla/);
  expect(text).toMatch(/late or missed/);
  expect(text).toContain('calendar alarms');
  expect(text).not.toMatch(/nothing is sent/);
});

test('settings says what is sent, in plain words', async ({ page }) => {
  await openSteps(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText(/sends nothing anywhere unless you turn on timer notifications/)).toBeVisible();
});
