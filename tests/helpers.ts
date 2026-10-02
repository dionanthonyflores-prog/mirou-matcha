// Shared steps used by many tests, so each test reads like a list of customer actions.
import { expect, type Locator, type Page } from '@playwright/test';

/** A moment in Manila time (UTC+8), e.g. manila('20:30') */
export const manila = (time: string) => new Date(`2026-10-02T${time.length === 5 ? `${time}:00` : time}+08:00`);

/** The menu, as the shop lists it. Tests compare the website against this. */
export const DRINKS = [
  { name: 'Matcha latte', price: 160, type: 'matcha' },
  { name: 'Seasalt Matcha', price: 170, type: 'matcha' },
  { name: 'Earl Grey latte', price: 200, type: 'matcha' },
  { name: 'Toasted Milk Cereal', price: 210, type: 'matcha' },
  { name: 'Vanilla Crunch', price: 195, type: 'matcha' },
  { name: 'Caramiso latte', price: 200, type: 'matcha' },
  { name: 'Hojicha latte', price: 150, type: 'hojicha' },
  { name: 'Seasalt Hojicha', price: 160, type: 'hojicha' },
  { name: 'Hor-jicha', price: 200, type: 'hojicha' },
  { name: 'Vanilla Crunch Hojicha', price: 195, type: 'hojicha' },
];

/** Links to Messenger, Facebook and Instagram open a fake page instead of the real site */
export async function stubSocialSites(page: Page) {
  await page.context().route(/^https:\/\/(m\.me|www\.facebook\.com|www\.instagram\.com)\//, route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }));
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The radio button for a drink in the order builder ("Vanilla Crunch" won't match "Vanilla Crunch Hojicha") */
export const drinkChoice = (page: Page, name: string) =>
  page.getByRole('radio', { name: new RegExp(`^${escape(name)} ₱`) });

/** Tap the pill-shaped label around a choice (the round radio button itself is hidden), then make sure it took */
export async function choose(radio: Locator) {
  await radio.locator('xpath=ancestor::label[1]').click();
  await expect(radio).toBeChecked();
}

/** Press + or − until the quantity shows n */
export async function setQty(page: Page, n: number) {
  const qty = page.locator('#qty');
  for (let i = 0; i < 25 && Number(await qty.textContent()) < n; i++) await page.getByRole('button', { name: 'One more' }).click();
  for (let i = 0; i < 25 && Number(await qty.textContent()) > n; i++) await page.getByRole('button', { name: 'One less' }).click();
}

/** Pick a drink, milk and quantity, then press "+ Add to order" */
export async function addToOrder(page: Page, name: string, qty = 1, milk: 'regular' | 'oatmilk' = 'regular') {
  await choose(drinkChoice(page, name));
  await choose(page.getByRole('radio', { name: milk === 'oatmilk' ? /^Oatmilk/ : 'Regular milk' }));
  await setQty(page, qty);
  await page.getByRole('button', { name: '+ Add to order' }).click();
  await expect(page.locator('img.fly')).toHaveCount(0);   // the little cup has landed and the slip is updated
}

/** The lines on the order slip, e.g. ["2× Vanilla Crunch", "1× Matcha latte"] */
export const slipLines = (page: Page) => page.locator('#order-lines li:not(.empty) > span:first-child');
/** The grand total on the order slip, e.g. "₱560" */
export const slipTotal = (page: Page) => page.locator('#order-total .sr-only');

/** The order message that goes to Messenger (read from the button's link) */
export async function messengerText(page: Page) {
  const href = await page.locator('#send-order').getAttribute('href');
  return new URL(href!).searchParams.get('text') ?? '';
}

/**
 * Wait until smooth scrolling has completely finished. The site glides with the Lenis library, whose
 * last fraction of a pixel can take a moment; scrolling again before then makes the two fight.
 */
export async function waitForScrollToStop(page: Page) {
  await page.waitForFunction(() => {
    const lenis = (0, eval)('typeof lenis === "undefined" ? null : lenis');
    return !lenis || !lenis.isScrolling;
  }, null, { timeout: 8000 });
  let same = 0, last = await page.evaluate(() => scrollY);
  for (let i = 0; i < 40 && same < 2; i++) {
    await page.waitForTimeout(150);
    const now = await page.evaluate(() => scrollY);
    same = Math.abs(now - last) < 1 ? same + 1 : 0;
    last = now;
  }
}

/**
 * Bring something on screen the way a customer's swipe or mouse wheel would: through the site's
 * smooth-scrolling library (Lenis), so it always knows where the page is. Playwright's own scrolling
 * jumps the page directly, and on slower computers (like GitHub's) Lenis can miss that jump; the next
 * "+ order this" then glides from the wrong starting point and overshoots.
 */
export async function scrollToLikeACustomer(page: Page, target: Locator) {
  await target.evaluate(el => {
    const lenis = (0, eval)('typeof lenis === "undefined" ? null : lenis');
    // Work out the spot from the page's real position, so this also puts Lenis back in step if it had lost track
    const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - innerHeight / 3);
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  });
  await waitForScrollToStop(page);
}

/**
 * Check a section ends up just under the sticky header (70px from the top, give or take 12px).
 * It waits for the page to STOP moving and for late photos to finish loading first, because
 * BUG-003 reached the right spot and was then pushed away by a photo loading in.
 */
export async function expectSectionAtTop(page: Page, id: string) {
  const top = () => page.evaluate(id => Math.round(document.getElementById(id)!.getBoundingClientRect().top), id);
  const settle = async () => {   // same position 3 readings in a row = stopped moving
    let same = 0, last = await top();
    for (let i = 0; i < 30 && same < 2; i++) {
      await page.waitForTimeout(400);
      const now = await top();
      same = now === last ? same + 1 : 0;
      last = now;
    }
  };
  await settle();
  await page.waitForLoadState('networkidle');
  await settle();
  const final = await top();
  expect(final, `#${id} should sit just under the header`).toBeGreaterThanOrEqual(58);
  expect(final, `#${id} should sit just under the header`).toBeLessThanOrEqual(82);
}
