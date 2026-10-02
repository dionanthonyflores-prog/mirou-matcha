import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { DRINKS, drinkChoice, scrollToLikeACustomer, waitForScrollToStop } from './helpers';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const drinksOf = (type: string) => DRINKS.filter(d => d.type === type);
/** Each drink's heading on the menu card reads like "★✽Toasted Milk Cereal ₱210" */
const cardHeadings = (page: Page, type: string) => page.locator(`#panel-${type} article.item h3`);
const cardHeadingText = (d: { name: string; price: number }) => new RegExp(`^[★✽\\s]*${escape(d.name)}\\s*₱${d.price}$`);

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test.describe('Menu', { tag: '@REQ-01' }, () => {
  test('TC-01 matcha tab is open first and lists the 6 matcha drinks with prices', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'matcha', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-hojicha')).toBeHidden();
    await expect(cardHeadings(page, 'matcha')).toHaveText(drinksOf('matcha').map(cardHeadingText));
  });

  test('TC-02 hojicha tab shows the 4 hojicha drinks and hides the matcha ones', async ({ page }) => {
    await page.getByRole('tab', { name: 'hojicha' }).click();
    await expect(page.getByRole('tab', { name: 'hojicha' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-hojicha')).toBeVisible();
    await expect(page.locator('#panel-matcha')).toBeHidden();
    await expect(cardHeadings(page, 'hojicha')).toHaveText(drinksOf('hojicha').map(cardHeadingText));
  });

  test('TC-03 tapping back to matcha straight away still switches (a quick tap is not lost)', { tag: '@BUG-004' }, async ({ page }) => {
    await page.getByRole('tab', { name: 'hojicha' }).click();
    await expect(page.locator('#panel-hojicha')).toBeVisible();   // cards are still animating in at this point
    await page.getByRole('tab', { name: 'matcha', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'matcha', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-matcha')).toBeVisible();
    await expect(page.locator('#panel-hojicha')).toBeHidden();
  });

  test('TC-04 every price in the order builder matches the menu', async ({ page }) => {
    for (const d of DRINKS) {
      await expect(page.getByRole('radio', { name: `${d.name} ₱${d.price}`, exact: true }), `${d.name} in the order builder`).toHaveCount(1);
    }
  });
});

test.describe('"+ order this" buttons', { tag: '@REQ-02' }, () => {
  test('TC-05 "+ order this" on each of the 10 drinks picks that drink and goes to the order builder', async ({ page }) => {
    test.slow();   // 10 trips down to the order builder and back
    for (const type of ['matcha', 'hojicha']) {
      if (type === 'hojicha') {
        const hojichaTab = page.getByRole('tab', { name: 'hojicha' });
        await scrollToLikeACustomer(page, hojichaTab);
        await hojichaTab.click();
        await expect(page.locator('#panel-hojicha')).toBeVisible();
      }
      for (const d of drinksOf(type)) {
        const card = page.locator(`#panel-${type} article.item`).filter({ has: page.locator('h3', { hasText: cardHeadingText(d) }) });
        const orderThis = card.getByRole('button', { name: '+ order this' });
        await scrollToLikeACustomer(page, orderThis);   // see helpers.ts: keeps the smooth scroller in step
        // Tap once the card has finished fading/sliding in, like a person would. Tapping a moving card makes
        // Playwright re-scroll the page by itself, and the smooth scroller can miss those sudden jumps.
        await expect(card).not.toHaveClass(/\b(reveal|in|enter|entering|leave)\b/);
        await orderThis.click();
        await expect(drinkChoice(page, d.name), `${d.name} is picked`).toBeChecked();
        await waitForScrollToStop(page);
        // The page has moved down to the order builder: its top has reached the header and it fills most of the
        // screen. (The exact landing spot is checked by TC-36 and TC-40; see the defect log for why not here.)
        const builder = await page.locator('#build').evaluate(el => {
          const r = el.getBoundingClientRect();
          return { top: Math.round(r.top), onScreen: r.top <= 82 && r.bottom > innerHeight / 2 };
        });
        expect(builder.onScreen, `after "+ order this" on ${d.name}, the order builder should be on screen (its top is at ${builder.top}px)`).toBe(true);
      }
    }
  });
});
