import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { addToOrder, choose, drinkChoice, messengerText, setQty, slipLines, slipTotal, stubSocialSites } from './helpers';

const lineTotal = (page: Page) => page.locator('#line-total .sr-only');
const status = (page: Page) => page.locator('#order-status');
const CAP_MESSAGE = 'The order slip takes up to 99 of each drink. For more, just message us on Messenger ✿';

test.beforeEach(async ({ page }) => {
  await stubSocialSites(page);
  await page.goto('./');
});

test.describe('Choosing a drink', { tag: '@REQ-03' }, () => {
  test('TC-06 the price next to "Add" follows the drink, milk and quantity', async ({ page }) => {
    await choose(drinkChoice(page, 'Earl Grey latte'));
    await expect(lineTotal(page)).toHaveText('₱200');
    await choose(page.getByRole('radio', { name: /^Oatmilk/ }));
    await expect(lineTotal(page)).toHaveText('₱210');
    await setQty(page, 3);
    await expect(lineTotal(page)).toHaveText('₱630');
  });

  test('TC-07 quantity stays from 1 to 99, with the buttons or by typing', { tag: '@CR-01' }, async ({ page }) => {
    const qty = page.locator('#qty');
    await page.getByRole('button', { name: 'One less' }).click();
    await expect(qty).toHaveValue('1');                              // never below 1
    await page.getByRole('button', { name: 'One more' }).click();
    await expect(qty).toHaveValue('2');
    await qty.fill('99');
    await page.getByRole('button', { name: 'One more' }).click();
    await expect(qty).toHaveValue('99');                             // never above 99
    await expect(lineTotal(page)).toHaveText('₱15,840');             // 99 × ₱160 Matcha latte
    await qty.fill('');
    await qty.pressSequentially('1a2b5');                            // letters are ignored, and only 2 digits fit
    await expect(qty).toHaveValue('12');
    await qty.press('Enter');                                        // Enter closes the keyboard...
    await expect(qty).not.toBeFocused();
    await expect(slipLines(page)).toHaveCount(0);                    // ...and does not add the drink
    await qty.fill('0');
    await qty.blur();
    await expect(qty).toHaveValue('1');                              // 0 becomes 1
    await qty.fill('');
    await qty.blur();
    await expect(qty).toHaveValue('1');                              // so does an empty box
  });
});

test.describe('Order slip', { tag: '@REQ-04' }, () => {
  test('TC-08 an empty slip says so, shows ₱0 and cannot be sent', async ({ page }) => {
    await expect(page.locator('#order-lines')).toHaveText(/no drinks yet/);
    await expect(slipTotal(page)).toHaveText('₱0');
    await expect(page.locator('#send-order')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('button', { name: 'clear order' })).toBeHidden();
  });

  test('TC-09 each drink gets its own line and the total adds up', async ({ page }) => {
    await addToOrder(page, 'Vanilla Crunch', 2);                 // 2 × 195 = 390
    await addToOrder(page, 'Seasalt Hojicha', 1, 'oatmilk');     // 1 × (160 + 10) = 170
    await expect(slipLines(page)).toHaveText(['2× Vanilla Crunch', '1× Seasalt Hojicha']);
    await expect(page.locator('#order-lines li').nth(1)).toContainText('oatmilk');
    await expect(slipTotal(page)).toHaveText('₱560');
  });

  test('TC-10 the same drink and milk join one line; a different milk gets its own line', async ({ page }) => {
    await addToOrder(page, 'Matcha latte', 2);
    await addToOrder(page, 'Matcha latte', 3);
    await expect(slipLines(page)).toHaveText(['5× Matcha latte']);
    await addToOrder(page, 'Matcha latte', 1, 'oatmilk');
    await expect(slipLines(page)).toHaveText(['5× Matcha latte', '1× Matcha latte']);
    await expect(slipTotal(page)).toHaveText('₱970');                // 5 × 160 + 170
  });

  test('TC-11 one drink stops at 99 on the slip, with a message, however it is added', { tag: ['@BUG-002', '@CR-01'] }, async ({ page }) => {
    await addToOrder(page, 'Matcha latte', 99);
    await addToOrder(page, 'Matcha latte', 99);
    await expect(slipLines(page)).toHaveText(['99× Matcha latte']);
    await expect(slipTotal(page)).toHaveText('₱15,840');
    await expect(status(page)).toHaveText(CAP_MESSAGE);

    await addToOrder(page, 'Matcha latte', 1);                       // already full
    await expect(slipLines(page)).toHaveText(['99× Matcha latte']);

    await addToOrder(page, 'Hojicha latte', 60);
    await addToOrder(page, 'Hojicha latte', 50);                     // only 39 more fit
    await expect(slipLines(page)).toHaveText(['99× Matcha latte', '99× Hojicha latte']);
    await expect(slipTotal(page)).toHaveText('₱30,690');             // 15,840 + 99 × 150
  });

  test('TC-12 the × button removes one line and the total updates', async ({ page }) => {
    await addToOrder(page, 'Hor-jicha', 1);
    await addToOrder(page, 'Caramiso latte', 2);
    await expect(slipTotal(page)).toHaveText('₱600');
    await page.getByRole('button', { name: 'Remove Hor-jicha' }).click();
    await expect(slipLines(page)).toHaveText(['2× Caramiso latte']);
    await expect(slipTotal(page)).toHaveText('₱400');
  });

  test('TC-13 "clear order" empties the slip', async ({ page }) => {
    await addToOrder(page, 'Seasalt Matcha', 2);
    await page.getByRole('button', { name: 'clear order' }).click();
    await expect(page.locator('#order-lines')).toHaveText(/no drinks yet/);
    await expect(slipTotal(page)).toHaveText('₱0');
    await expect(page.locator('#send-order')).toHaveAttribute('aria-disabled', 'true');
  });
});

test.describe('Saved order', { tag: '@REQ-05' }, () => {
  test('TC-14 the order is still there after the page is reloaded', { tag: '@BUG-002' }, async ({ page }) => {
    await addToOrder(page, 'Toasted Milk Cereal', 2, 'oatmilk');
    await addToOrder(page, 'Matcha latte', 99);
    await addToOrder(page, 'Matcha latte', 5);
    await expect(slipTotal(page)).toHaveText('₱16,280');             // 2 × 220 + 99 × 160
    await page.reload();
    await expect(slipLines(page)).toHaveText(['2× Toasted Milk Cereal', '99× Matcha latte']);
    await expect(slipTotal(page)).toHaveText('₱16,280');
  });

  test('TC-15 broken saved data does not break the page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem('mirou-order', '{this is not valid'));
    await page.reload();
    await expect(page.locator('#order-lines')).toHaveText(/no drinks yet/);
    await addToOrder(page, 'Matcha latte', 1);
    await expect(slipTotal(page)).toHaveText('₱160');
    expect(errors).toEqual([]);
  });

  test("TC-16 a saved order is re-checked against today's menu and prices", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mirou-order', JSON.stringify([
      { name: 'Ube latte', qty: 2, oat: false, unit: 180 },          // no longer on the menu
      { name: 'Matcha latte', qty: 150, oat: true, unit: 1 },        // too many, and an old price
      { name: 'Matcha latte', qty: 3, oat: false, unit: 1 },
    ])));
    await page.reload();
    await expect(slipLines(page)).toHaveText(['99× Matcha latte', '3× Matcha latte']);
    await expect(slipTotal(page)).toHaveText('₱17,310');             // 99 × 170 + 3 × 160
  });
});

test.describe('Pick up or delivery', { tag: '@REQ-06' }, () => {
  test.beforeEach(async ({ page }) => {
    await addToOrder(page, 'Hojicha latte', 2);
  });

  test('TC-17 pick up is the default and needs no area', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'Pick up' })).toBeChecked();
    await expect(page.getByLabel('Delivery area')).toBeHidden();
    await expect(page.locator('#fee-note')).toBeHidden();
    expect(await messengerText(page)).toContain('For: Pick up');
  });

  test('TC-18 delivery asks for the area, mentions the delivery fee and puts both in the message', async ({ page }) => {
    await choose(page.getByRole('radio', { name: 'Delivery', exact: true }));
    const area = page.getByLabel('Delivery area');
    await expect(area).toBeVisible();
    await expect(area.locator('option')).toHaveText(['Choose your area…', 'Bay', 'Calamba', 'Los Baños', 'Cabuyao', 'Victoria', "Somewhere else (we'll check)"]);
    await expect(page.locator('#fee-note')).toBeVisible();
    await area.selectOption('Calamba');
    const text = await messengerText(page);
    expect(text).toContain('For: Delivery to Calamba');
    expect(text).toContain("Total: ₱300 + delivery fee (let's settle it here)");
  });

  test('TC-19 "Somewhere else" asks the shop to check if they can deliver', async ({ page }) => {
    await choose(page.getByRole('radio', { name: 'Delivery', exact: true }));
    await page.getByLabel('Delivery area').selectOption({ label: "Somewhere else (we'll check)" });
    expect(await messengerText(page)).toContain('For: Delivery (outside your usual areas, can you check if you can reach me?)');
  });
});

test.describe('Sending the order on Messenger', { tag: '@REQ-07' }, () => {
  test('TC-20 the Messenger message lists every drink, the total, pick up or delivery, and notes', async ({ page }) => {
    await addToOrder(page, 'Vanilla Crunch', 2);
    await addToOrder(page, 'Seasalt Hojicha', 1, 'oatmilk');
    await page.getByRole('textbox', { name: 'Notes for your order' }).fill('less ice please');
    await expect(slipTotal(page)).toHaveText('₱560');
    expect(await messengerText(page)).toBe([
      "Hi mirou matcha! I'd like to order:",
      '• 2× Vanilla Crunch: ₱390',
      '• 1× Seasalt Hojicha (oatmilk): ₱170',
      'Total: ₱560',
      'For: Pick up',
      'Notes: less ice please',
    ].join('\n'));
  });

  test('TC-21 an empty order does not open Messenger', async ({ page }) => {
    const popup = page.waitForEvent('popup', { timeout: 1500 }).catch(() => null);
    await page.locator('#send-order').click({ force: true });       // it is marked disabled; tap it anyway, like an impatient customer
    expect(await popup).toBeNull();
  });

  test('TC-22 "Copy order & open Messenger" copies the order and opens the shop chat', async ({ page, context, browserName }) => {
    if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await addToOrder(page, 'Caramiso latte', 1);
    await expect(slipTotal(page)).toHaveText('₱200');
    const expected = await messengerText(page);
    expect(expected).toContain('• 1× Caramiso latte: ₱200');
    const popupOpened = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Copy order & open Messenger' }).click();
    const popup = await popupOpened;
    expect(popup.url()).toContain('https://m.me/mirou.matchaph');
    await expect(status(page)).toHaveText('Copied! Paste it in the Messenger chat ✿');
    // Reading the clipboard back is only allowed in Chrome-based browsers during tests.
    // (Windows stores line breaks as \r\n when copying; Messenger treats both the same.)
    if (browserName === 'chromium') {
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied.replace(/\r\n/g, '\n')).toBe(expected);
    }
  });
});
