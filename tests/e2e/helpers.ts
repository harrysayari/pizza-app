import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Freeze the page clock at an ISO time (local or with offset). Call before page.goto. */
export async function useFakeClock(page: Page, isoTime: string): Promise<void> {
  await page.clock.install({ time: new Date(isoTime) });
}

const TAPPABLE = 'button, input, a, [role=switch]';

/** Every tappable control is at least 48 x 48 CSS px and 8px from its neighbours. */
export async function expectTapTargets(page: Page): Promise<void> {
  const problems = await page.evaluate((selector) => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0 && r.height > 0;
    });
    const out: string[] = [];
    const name = (el: HTMLElement) =>
      `${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ').join('.') : ''}`;
    const boxes = els.map((el) => ({ el, r: el.getBoundingClientRect() }));
    for (const { el, r } of boxes) {
      if (r.width < 47.5 || r.height < 47.5) {
        out.push(`${name(el)} is ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const dx = Math.max(a.r.left - b.r.right, b.r.left - a.r.right);
        const dy = Math.max(a.r.top - b.r.bottom, b.r.top - a.r.bottom);
        const gap = Math.max(dx, dy);
        if (gap < 7.5) out.push(`${name(a.el)} and ${name(b.el)} are ${Math.round(gap)}px apart`);
      }
    }
    return out;
  }, TAPPABLE);
  expect(problems, problems.join('\n')).toEqual([]);
}

/** Body text at least 16px; .step-text at least 18px; .timer-digits at least 48px. */
export async function expectTextSizes(page: Page): Promise<void> {
  const problems = await page.evaluate(() => {
    const px = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
    const out: string[] = [];
    const bodySize = px(document.body);
    if (bodySize < 16) out.push(`body is ${bodySize}px`);
    document.querySelectorAll('.step-text').forEach((el) => {
      if (px(el) < 18) out.push(`.step-text is ${px(el)}px`);
    });
    // rules.md: text under 16px must not carry amounts; chip captions hold ball weights and times.
    document.querySelectorAll('.chip-sub, .ing-amount, .amount').forEach((el) => {
      if (px(el) < 16) out.push(`${el.className} is ${px(el)}px`);
    });
    document.querySelectorAll('.timer-digits').forEach((el) => {
      if (px(el) < 48) out.push(`.timer-digits is ${px(el)}px`);
    });
    return out;
  });
  expect(problems, problems.join('\n')).toEqual([]);
}

/** Run axe in both themes by setting data-theme on <html>, then restore the system theme. */
export async function expectNoAxeViolations(page: Page): Promise<void> {
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
    // Colour transitions can still be mid-flight right after a theme switch, which axe reads as low contrast.
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const results = await new AxeBuilder({ page }).analyze();
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    );
    expect(summary, `axe violations in ${theme} theme`).toEqual([]);
  }
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
}
