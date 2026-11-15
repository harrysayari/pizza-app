import { expect, test, type Page } from '@playwright/test';
import { useFakeClock } from './helpers';

// Sunday 15 Nov 2026, 10:00 local. Saturday dinner is the 21st.
const NOW = '2026-11-15T10:00:00';

const chip = (page: Page, text: string) =>
  page.locator('label.chip').filter({ has: page.locator('.chip-line', { hasText: new RegExp(`^${text}$`) }) });

async function planSaturdayDinner(page: Page): Promise<void> {
  await useFakeClock(page, NOW);
  await page.goto('/');
  await chip(page, 'Sat').click();
  await chip(page, 'Dinner').click();
  await page.getByRole('button', { name: 'Make my plan' }).click();
  await expect(page.locator('[data-screen="schedule"]')).toBeVisible();
}

test('scenario 8: Add to calendar downloads the .ics file and confirms', async ({ page }) => {
  await planSaturdayDinner(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Add to calendar' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('pizza-dough-2026-11-21.ics');
  const stream = await download.createReadStream();
  const chunks: string[] = [];
  for await (const chunk of stream) chunks.push(String(chunk));
  const text = chunks.join('');
  expect(text).toContain('BEGIN:VCALENDAR');
  expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(14);
  await expect(page.getByRole('status').filter({ hasText: 'Added to your calendar' })).toContainText(
    'You will get a reminder for every step.',
  );
});

test('scenario 3: when the file cannot be handed over, a plain message and Copy option appear', async ({ page }) => {
  await page.addInitScript(() => {
    URL.createObjectURL = () => {
      throw new Error('blocked');
    };
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  await planSaturdayDinner(page);
  await page.getByRole('button', { name: 'Add to calendar' }).click();
  await expect(page.getByText('Your device did not open the calendar file.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy calendar file' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your steps' })).toBeVisible();
  await expect(page.locator('li.tl-item')).toHaveCount(14);
  await expect(page.getByText('Added to your calendar')).toHaveCount(0);
});
