import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { expectSectionAtTop, stubSocialSites, waitForScrollToStop } from './helpers';

const SECTIONS = [
  { link: 'About', id: 'about' },
  { link: 'Menu', id: 'menu' },
  { link: 'Build your order', id: 'build' },
  { link: 'How to order', id: 'order' },
  { link: 'Reviews', id: 'reviews' },
];
const menuButton = (page: Page) => page.locator('.menu-toggle');
const phoneMenu = (page: Page) => page.locator('#mobile-menu');

test.describe('Phone menu', { tag: '@REQ-10' }, () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The phone menu only exists on phone-sized screens');
    await stubSocialSites(page);
    await page.goto('./');
  });

  test('TC-33 the menu button opens a full-screen menu and stops the page behind from scrolling', async ({ page }) => {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(menuButton(page)).toHaveAttribute('aria-label', 'Close menu');
    await expect(phoneMenu(page).locator('ul a')).toHaveCount(5);
    await expect(phoneMenu(page).getByRole('link', { name: /^About/ })).toBeVisible();
    await expect(phoneMenu(page).getByRole('link', { name: /^About/ })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('hidden');
  });

  test('TC-34 the menu closes with the same button, and the header\'s Order button and logo still work while it is open', { tag: '@BUG-007' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(phoneMenu(page)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');

    // "Order" in the header: the menu closes and the page goes to the order builder
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('header').getByRole('link', { name: 'Order', exact: true }).click();
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(phoneMenu(page)).toBeHidden();
    await expectSectionAtTop(page, 'build');

    // The logo: the menu closes and the page goes back to the top
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.locator('header .brand').click();
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => page.evaluate(() => scrollY), { message: 'the page should go back to the top' }).toBeLessThan(5);
  });

  test('TC-35 Esc closes the menu and puts keyboard focus back on the menu button', async ({ page }) => {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.keyboard.press('Escape');
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(menuButton(page)).toBeFocused();
  });

  // A fresh page for every link, because BUG-003 only showed on a first visit (photos not loaded yet)
  for (const s of SECTIONS) {
    test(`TC-36 tapping "${s.link}" closes the menu and lands on that section`, { tag: '@BUG-003' }, async ({ page }) => {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await phoneMenu(page).getByRole('link', { name: new RegExp(`^${s.link}`) }).click();
      await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
      await expectSectionAtTop(page, s.id);
    });
  }

  test('TC-37 every contact in the menu can be reached, even on a short screen, and opens the right place', { tag: '@BUG-006' }, async ({ page, browserName }) => {
    // A phone whose screen is shorter than the menu, like a Galaxy S24 Ultra with the browser bars showing
    await page.setViewportSize({ width: 384, height: 700 });
    await page.getByRole('button', { name: 'Open menu' }).click();
    const email = phoneMenu(page).getByRole('link', { name: /^Email/ });
    const lastLine = phoneMenu(page).getByText('whisked by hand in bay, laguna');
    await expect(lastLine).not.toBeInViewport({ ratio: 1 });                // the menu really is taller than the screen
    if (browserName === 'chromium') {
      // Swipe up inside the menu with a finger, like a customer would
      const pageScroll = await page.evaluate(() => scrollY);
      const cdp = await page.context().newCDPSession(page);
      const x = 192;
      for (let swipe = 0; swipe < 3; swipe++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: 600 }] });
        for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 600 - 50 * i }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      }
      await expect(email).toBeInViewport({ ratio: 1 });
      await expect(lastLine).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => scrollY), 'the page behind the menu should not move').toBe(pageScroll);
    } else {
      test.info().annotations.push({ type: 'checked by hand', description: 'WebKit cannot simulate a finger swipe here, so scrolling the menu on iPhone is part of manual test MT-03' });
    }

    for (const [name, url] of [
      [/^Messenger/, 'https://m.me/mirou.matchaph'],
      [/^Facebook/, 'https://www.facebook.com/mirou.matchaph'],
      [/^Instagram/, 'https://www.instagram.com/mirou.matcha/'],
    ] as const) {
      const link = phoneMenu(page).getByRole('link', { name });
      await expect(link).toHaveAttribute('href', url);
      await expect(link).toHaveAttribute('target', '_blank');
    }
    await expect(phoneMenu(page).getByRole('link', { name: /^Email/ })).toHaveAttribute('href', 'mailto:miroumatcha@gmail.com');
  });

  test('TC-38 the menu closes by itself if the screen becomes wide (phone turned sideways, window resized)', async ({ page }) => {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.setViewportSize({ width: 1024, height: 700 });
    await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(phoneMenu(page)).toBeHidden();
  });
});

test.describe('Desktop and phone layouts', { tag: '@REQ-12' }, () => {
  test('TC-39 desktops show the header links; phones show the menu button instead', async ({ page, isMobile }) => {
    await page.goto('./');
    const headerLinks = page.locator('header .nav ul');
    if (isMobile) {
      await expect(headerLinks).toBeHidden();
      await expect(menuButton(page)).toBeVisible();
    } else {
      await expect(headerLinks).toBeVisible();
      await expect(headerLinks.getByRole('link')).toHaveText(SECTIONS.map(s => s.link));
      await expect(menuButton(page)).toBeHidden();
    }
  });

  test('TC-40 each header link on desktop lands on its section', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Phones use the phone menu instead (TC-36)');
    await page.goto('./');
    for (const s of SECTIONS) {
      await page.locator('header .nav ul').getByRole('link', { name: s.link, exact: true }).click();
      await expectSectionAtTop(page, s.id);
    }
  });

  test('TC-41 phones get a floating "Build your order" button that hides while the order builder is on screen', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'The floating button is only on phones');
    await page.goto('./');
    const floating = page.locator('a.float-order');
    await expect(floating).toBeVisible();
    await floating.click();
    await waitForScrollToStop(page);
    await expect(page.getByRole('heading', { name: 'build your order' })).toBeInViewport();
    await expect(floating).toHaveClass(/\baway\b/);
  });
});
