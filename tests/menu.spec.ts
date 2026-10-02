import { test, expect, type Page } from '@playwright/test';
import { DRINKS, drinkChoice, waitForScrollToStop } from './helpers';

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
        await page.getByRole('tab', { name: 'hojicha' }).click();
        await expect(page.locator('#panel-hojicha')).toBeVisible();
      }
      for (const d of drinksOf(type)) {
        const card = page.locator(`#panel-${type} article.item`).filter({ has: page.locator('h3', { hasText: cardHeadingText(d) }) });
        const orderThis = card.getByRole('button', { name: '+ order this' });
        // Scroll to the card first and let the page settle, like a person would. Playwright can otherwise
        // scroll and tap in the same instant, before the smooth-scrolling library notices the new position.
        await orderThis.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await orderThis.click();
        await expect(drinkChoice(page, d.name), `${d.name} is picked`).toBeChecked();
        await waitForScrollToStop(page);
        await expect(page.getByRole('heading', { name: 'build your order' }), `after "+ order this" on ${d.name}`).toBeInViewport();
      }
    }
  });
});
