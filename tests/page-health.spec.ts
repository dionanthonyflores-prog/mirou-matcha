import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const LIVE = 'https://dionanthonyflores-prog.github.io/mirou-matcha/';

/** Scroll down the whole page like a visitor would, so late-loading photos load */
async function scrollThroughPage(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate(y => window.scrollTo(0, y), y);
    await page.waitForTimeout(80);
  }
  await page.waitForLoadState('networkidle');
}

test.describe('Page health', { tag: '@REQ-13' }, () => {
  test('TC-48 the page loads with no errors and no missing files', async ({ page }) => {
    const problems: string[] = [];
    page.on('pageerror', e => problems.push(`script error: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`); });
    page.on('response', r => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
    page.on('requestfailed', r => problems.push(`failed: ${r.url()} (${r.failure()?.errorText})`));
    await page.goto('./');
    await expect(page).toHaveTitle('mirou matcha · homebased matcha slow bar in Bay, Laguna');
    await scrollThroughPage(page);
    expect(problems).toEqual([]);
  });

  test('TC-49 every photo loads, including the hojicha ones behind their tab', async ({ page }) => {
    await page.goto('./');
    await scrollThroughPage(page);
    const notLoaded = () => page.evaluate(() => [...document.images]
      .filter(i => i.getAttribute('src') && !i.closest('[hidden]') && !(i.complete && i.naturalWidth > 0))
      .map(i => i.getAttribute('src')));
    expect(await notLoaded()).toEqual([]);
    await page.getByRole('tab', { name: 'hojicha' }).click();
    await expect(page.locator('#panel-hojicha')).toBeVisible();
    for (const photo of await page.locator('#panel-hojicha img').all()) await photo.scrollIntoViewIfNeeded();   // late-loading photos load when near the screen
    await expect.poll(notLoaded).toEqual([]);
  });
});

test('TC-50 nothing sticks out sideways (no left-right scrolling)', { tag: '@REQ-12' }, async ({ page }) => {
  await page.goto('./');
  await scrollThroughPage(page);
  const { pageWidth, screenWidth } = await page.evaluate(() => ({ pageWidth: document.documentElement.scrollWidth, screenWidth: window.innerWidth }));
  expect(pageWidth, 'page width should not be wider than the screen').toBeLessThanOrEqual(screenWidth);
});

test('TC-51 the title, description and share preview are set for Facebook and Messenger', { tag: '@REQ-14' }, async ({ page }) => {
  await page.goto('./');
  const meta = (selector: string) => page.locator(selector).getAttribute('content');
  expect(await meta('meta[name="description"]')).toContain('homebased matcha slow bar in Bay, Laguna');
  expect(await meta('meta[property="og:title"]')).toBe('mirou matcha · homebased matcha slow bar in Bay, Laguna');
  expect(await meta('meta[property="og:url"]')).toBe(LIVE);
  expect(await meta('meta[property="og:image"]')).toBe(`${LIVE}images/share.jpg`);
  const size = await page.evaluate(() => new Promise<string>(resolve => {
    const img = new Image();
    img.onload = () => resolve(`${img.naturalWidth}x${img.naturalHeight}`);
    img.src = 'images/share.jpg';
  }));
  expect(size, 'Facebook wants a 1200×630 share picture').toBe('1200x630');
});

test.describe('Accessibility basics', { tag: '@REQ-15' }, () => {
  test('TC-52 every photo has a description for screen readers (purely decorative copies are marked as such)', async ({ page }) => {
    await page.goto('./');
    const missing = await page.evaluate(() => [...document.images]
      .filter(i => i.id !== 'lb-img')
      .filter(i => {
        if (!i.hasAttribute('alt')) return true;                                       // no alt at all
        const decorative = !!i.closest('[aria-hidden="true"]') || i.closest('.brand') !== null || i.classList.contains('fly');
        return i.alt.trim() === '' && !decorative;                                     // empty alt on a photo that matters
      })
      .map(i => i.getAttribute('src')));
    expect(missing).toEqual([]);
  });

  test.describe('visitor has "reduce motion" turned on', () => {
    test.use({ reducedMotion: 'reduce' });
    test('TC-53 content shows straight away, without fade-ins or sliding photo strips', async ({ page }) => {
      await page.goto('./');
      const farDown = page.locator('#reviews .section-head');               // normally fades in only when scrolled to
      await expect(farDown).toHaveCSS('opacity', '1');
      await expect(page.locator('.photo-strip .marquee-track').first()).toHaveCSS('animation-name', 'none');
    });
  });
});

test('TC-54 links that leave the site open in a new tab safely', { tag: '@REQ-16' }, async ({ page }) => {
  await page.goto('./');
  const external = await page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')]
    .filter(a => new URL(a.href).origin !== location.origin)
    .map(a => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel })));
  expect(external.length).toBeGreaterThan(0);
  const unsafe = external.filter(a => !a.href!.startsWith('https://') || a.target !== '_blank' || !a.rel.includes('noopener'));
  expect(unsafe).toEqual([]);
});
