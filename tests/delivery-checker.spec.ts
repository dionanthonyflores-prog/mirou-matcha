import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { slipTotal, stubSocialSites } from './helpers';

const townBox = (page: Page) => page.getByLabel('Do we deliver to you?');
const answer = (page: Page) => page.locator('#area-result');
const TOWNS = ['Bay', 'Calamba', 'Los Baños', 'Cabuyao', 'Victoria'];

test.beforeEach(async ({ page }) => {
  await stubSocialSites(page);
  await page.goto('./');
});

test.describe('Delivery checker', { tag: '@REQ-08' }, () => {
  test('TC-23 the 5 delivery towns are buttons, and tapping one says yes', async ({ page }) => {
    const chips = page.locator('#area-chips button');
    await expect(chips).toHaveText(TOWNS);
    await chips.filter({ hasText: 'Cabuyao' }).click();
    await expect(townBox(page)).toHaveValue('Cabuyao');
    await expect(chips.filter({ hasText: 'Cabuyao' })).toHaveClass(/\bon\b/);
    await expect(answer(page)).toContainText('Yes, we deliver to Cabuyao!');
  });

  // Different ways customers might type a town they live in
  for (const [typed, town] of [
    ['Calamba', 'Calamba'], ['CALAMBA', 'Calamba'], ['calamba city', 'Calamba'], ['Calamba, Laguna', 'Calamba'],
    ['Los Baños', 'Los Baños'], ['los banos', 'Los Baños'], ['UPLB', 'Los Baños'], ['elbi', 'Los Baños'], ['LB', 'Los Baños'],
    ['cabu', 'Cabuyao'], ['Victoria, Laguna', 'Victoria'],
  ]) {
    test(`TC-24 typing "${typed}" finds ${town}`, async ({ page }) => {
      await townBox(page).fill(typed);
      await expect(answer(page)).toContainText(`Yes, we deliver to ${town}!`);
      await expect(page.locator('#area-chips button.on')).toHaveText(town);
    });
  }

  test('TC-25 Bay gets its own "home" answer', async ({ page }) => {
    await townBox(page).fill('bay');
    await expect(answer(page)).toContainText('Bay is home! We deliver around Bay, or you can pick up.');
  });

  for (const town of ['Calauan', 'Santa Rosa', 'Manila']) {
    test(`TC-26 a town outside the area ("${town}") is asked to message the shop`, async ({ page }) => {
      await townBox(page).fill(town);
      await expect(answer(page)).toContainText(`${town} isn't on our usual list, but message us and we'll check if we can reach you.`);
      await expect(answer(page).getByRole('link', { name: 'Ask on Messenger →' })).toHaveAttribute('href', 'https://m.me/mirou.matchaph');
    });
  }

  test('TC-27 fewer than 3 letters gives no answer yet, and clearing the box clears the answer', async ({ page }) => {
    await townBox(page).fill('ca');
    await expect(answer(page)).toHaveText('');
    await townBox(page).fill('Calamba');
    await expect(answer(page)).not.toHaveText('');
    await townBox(page).fill('');
    await expect(answer(page)).toHaveText('');
    await expect(page.locator('#area-chips button.on')).toHaveCount(0);
  });

  test('TC-28 "Build your order →" sets the order slip to delivery to that town', async ({ page }) => {
    await townBox(page).fill('los banos');
    await answer(page).getByRole('link', { name: 'Build your order →' }).click();
    await expect(page.getByRole('radio', { name: 'Delivery', exact: true })).toBeChecked();
    await expect(page.getByLabel('Delivery area')).toHaveValue('Los Baños');
    await expect(page.locator('#fee-note')).toBeVisible();
    await expect(slipTotal(page)).toHaveText('₱0');
  });
});

test('TC-29 anything typed is shown as plain text, never run as code', { tag: '@REQ-16' }, async ({ page }) => {
  let popupAlert = false;
  page.on('dialog', async d => { popupAlert = true; await d.dismiss(); });
  const sneaky = '<img src=x onerror=alert(1)>';
  await townBox(page).fill(sneaky);
  await expect(answer(page)).toContainText(`${sneaky} isn't on our usual list`);
  await expect(answer(page).locator('img')).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(popupAlert).toBe(false);
});
