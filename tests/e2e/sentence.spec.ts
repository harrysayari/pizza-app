import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, expectTapTargets, useFakeClock } from './helpers';

// Sunday 15 Nov 2026, 10:00 local.
const NOW = '2026-11-15T10:00:00';

const field = (page: Page) => page.getByLabel('Say or type it');
const chip = (page: Page, text: string) =>
  page.locator('label.chip').filter({ has: page.locator('.chip-line', { hasText: new RegExp(`^${text}$`) }) });
const tags = (page: Page) => page.locator('.tags .tag');

async function start(page: Page, speech: 'none' | 'fake' = 'fake'): Promise<void> {
  await useFakeClock(page, NOW);
  await page.addInitScript((mode) => {
    const w = window as unknown as Record<string, unknown>;
    if (mode === 'none') {
      w.SpeechRecognition = undefined;
      w.webkitSpeechRecognition = undefined;
      return;
    }
    class FakeRecognition {
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      interimResults = false;
      continuous = false;
      lang = '';
      start(): void {
        setTimeout(() => {
          const alt = { transcript: 'six 16 inch pizzas tomorrow lunch' };
          const result = Object.assign([alt], { isFinal: true });
          this.onresult?.({ resultIndex: 0, results: [result] });
          this.onend?.();
        }, 100);
      }
      stop(): void {
        this.onend?.();
      }
      abort(): void {
        this.onend?.();
      }
    }
    w.SpeechRecognition = FakeRecognition;
    w.webkitSpeechRecognition = FakeRecognition;
  }, speech);
  await page.goto('/');
  await expect(page.locator('[data-screen="plan"]')).toBeVisible();
}

test('scenario 9: a full sentence sets the chips and shows tags', async ({ page }) => {
  await start(page);
  await field(page).fill('four 14-inch pizzas for Saturday dinner');
  await field(page).press('Enter');
  await expect(tags(page)).toHaveText(['4 pizzas', '14"', 'Sat', 'Dinner']);
  await expect(chip(page, '14"').locator('input')).toBeChecked();
  await expect(page.locator('.stepper-value')).toHaveText('4');
  await expect(chip(page, 'Sat').locator('input')).toBeChecked();
  await expect(chip(page, 'Dinner').locator('input')).toBeChecked();
  await expect(page.getByRole('button', { name: 'Make my plan' })).toBeEnabled();
  await expect(page.getByText('Got it.')).toBeVisible();
});

test('the chips stay editable after a sentence', async ({ page }) => {
  await start(page);
  await field(page).fill('six 16 inch pizzas tomorrow lunch');
  await field(page).press('Enter');
  await expect(chip(page, '16"').locator('input')).toBeChecked();
  await expect(page.locator('.stepper-value')).toHaveText('6');
  await chip(page, 'Fri').click();
  await expect(chip(page, 'Fri').locator('input')).toBeChecked();
  // the Tomorrow tag no longer matches the chips, so it is not shown as heard
  await expect(tags(page).filter({ hasText: 'Tomorrow' })).toHaveCount(0);
  await expect(tags(page).filter({ hasText: '16"' })).toHaveCount(1);
});

test('a partly understood sentence sets only those fields', async ({ page }) => {
  await start(page);
  await field(page).fill('sixteen inch pizzas on Friday');
  await field(page).press('Enter');
  await expect(tags(page)).toHaveText(['16"', 'Fri']);
  await expect(chip(page, '16"').locator('input')).toBeChecked();
  await expect(chip(page, 'Fri').locator('input')).toBeChecked();
  await expect(page.locator('.stepper-value')).toHaveText('4');
  await expect(page.locator('input[name=time]:checked')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Make my plan' })).toBeDisabled();
});

test('an unreadable sentence shows an example and changes nothing', async ({ page }) => {
  await start(page);
  await chip(page, 'Sat').click();
  await field(page).fill('pizza night');
  await field(page).press('Enter');
  await expect(page.getByText('Try: 4 pizzas, 14 inch, Saturday dinner')).toBeVisible();
  await expect(tags(page)).toHaveCount(0);
  await expect(chip(page, 'Sat').locator('input')).toBeChecked();
  await expect(chip(page, '14"').locator('input')).toBeChecked();
  await expect(page.locator('.stepper-value')).toHaveText('4');
});

test('speech unavailable: typing only, with the keyboard dictation hint', async ({ page }) => {
  await start(page, 'none');
  await expect(page.getByRole('button', { name: 'Speak your request' })).toHaveCount(0);
  await expect(page.getByText('Use the microphone on your keyboard to dictate.')).toBeVisible();
  await field(page).fill('2 pizzas tomorrow lunch');
  await field(page).press('Enter');
  await expect(tags(page)).toHaveText(['2 pizzas', 'Tomorrow', 'Lunch']);
});

test('speech available: the mic listens after a tap and fills the same box', async ({ page }) => {
  await start(page);
  const mic = page.getByRole('button', { name: 'Speak your request' });
  await expect(mic).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('may send the audio to its vendor')).toBeVisible();
  await mic.click();
  await expect(tags(page)).toHaveText(['6 pizzas', '16"', 'Tomorrow', 'Lunch']);
  await expect(field(page)).toHaveValue('six 16 inch pizzas tomorrow lunch');
  await expect(chip(page, '16"').locator('input')).toBeChecked();
  await expect(mic).toHaveAttribute('aria-pressed', 'false');
});

test('the field meets tap size and accessibility rules in both themes', async ({ page }) => {
  await start(page);
  await field(page).fill('four 14-inch pizzas for Saturday dinner');
  await field(page).press('Enter');
  await expectTapTargets(page);
  await expectNoAxeViolations(page);
});
