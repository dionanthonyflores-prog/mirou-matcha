import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const viewer = (page: Page) => page.getByRole('dialog', { name: 'Photo viewer' });
const shownPhoto = (page: Page) => page.locator('#lb-img');
const counter = (page: Page) => page.locator('#lb-count');

async function openReview(page: Page, n: number) {
  await page.locator('.reviews-grid a').nth(n - 1).click();
  await expect(viewer(page)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test.describe('Photo viewer', { tag: '@REQ-11' }, () => {
  test('TC-42 tapping a review photo opens it big on the same page', async ({ page }) => {
    await openReview(page, 1);
    await expect(shownPhoto(page)).toHaveAttribute('src', 'images/review-1.jpg');
    await expect(shownPhoto(page)).toHaveAttribute('alt', /caramiso/);
    await expect(counter(page)).toHaveText('1 / 3');
    expect(page.url()).not.toContain('review-1.jpg');           // it did not leave the page
  });

  test('TC-43 next and previous go through the photos and wrap around at the ends', async ({ page }) => {
    await openReview(page, 1);
    await page.getByRole('button', { name: 'Next photo' }).click();
    await expect(counter(page)).toHaveText('2 / 3');
    await expect(shownPhoto(page)).toHaveAttribute('src', 'images/review-2.jpg');
    await page.getByRole('button', { name: 'Previous photo' }).click();
    await page.getByRole('button', { name: 'Previous photo' }).click();
    await expect(counter(page)).toHaveText('3 / 3');             // before the first comes the last
    await page.getByRole('button', { name: 'Next photo' }).click();
    await expect(counter(page)).toHaveText('1 / 3');             // after the last comes the first
  });

  test('TC-44 the left and right arrow keys change the photo', async ({ page }) => {
    await openReview(page, 2);
    await page.keyboard.press('ArrowRight');
    await expect(counter(page)).toHaveText('3 / 3');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(counter(page)).toHaveText('1 / 3');
  });

  test('TC-45 the viewer closes with the × button, with Esc, and by tapping the dark background', async ({ page }) => {
    await openReview(page, 1);
    await page.getByRole('button', { name: 'Close photo' }).click();
    await expect(viewer(page)).toBeHidden();

    await openReview(page, 1);
    await page.keyboard.press('Escape');
    await expect(viewer(page)).toBeHidden();

    await openReview(page, 1);
    await viewer(page).click({ position: { x: 12, y: 40 } });    // empty dark area near the top-left corner
    await expect(viewer(page)).toBeHidden();
  });

  test('TC-46 gallery photos open in the viewer too (here using the keyboard)', async ({ page }) => {
    const firstGalleryPhoto = page.locator('.photo-strip img[role="button"]').first();
    await firstGalleryPhoto.focus();
    await page.keyboard.press('Enter');
    await expect(viewer(page)).toBeVisible();
    await expect(counter(page)).toHaveText('1 / 8');
    await expect(shownPhoto(page)).toHaveAttribute('src', 'images/gallery-1.jpg');
  });

  test('TC-47 swiping left and right on a phone changes the photo', async ({ page, isMobile, browserName }) => {
    test.skip(!isMobile, 'Swiping is for phones');
    test.skip(browserName !== 'chromium', 'Real finger swipes can only be simulated in Chrome; iPhone is covered by manual test MT-03');
    await openReview(page, 1);
    // A real finger swipe (a mouse drag would start dragging the image instead)
    const cdp = await page.context().newCDPSession(page);
    const { width, height } = page.viewportSize()!;
    const swipe = async (fromX: number, toX: number) => {
      const y = height / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fromX, y }] });
      for (let i = 1; i <= 8; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: fromX + (toX - fromX) * i / 8, y }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await swipe(width * 0.8, width * 0.2);                        // swipe left = next
    await expect(counter(page)).toHaveText('2 / 3');
    await swipe(width * 0.2, width * 0.8);                        // swipe right = previous
    await expect(counter(page)).toHaveText('1 / 3');
    await expect(viewer(page)).toBeVisible();                     // a swipe must not close the viewer
  });
});
