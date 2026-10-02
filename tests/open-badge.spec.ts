import { test, expect, type Page } from '@playwright/test';
import { manila } from './helpers';

const badge = (page: Page) => page.locator('#open-badge');
const badgeText = (page: Page) => page.locator('#open-text');

// Shop hours: 12nn – 9pm Manila time, every day. "Closing soon" in the last 30 minutes.
const SCHEDULE: [string, 'open' | 'soon' | 'closed', string][] = [
  ['00:00', 'closed', 'Opens today at 12nn'],
  ['11:59', 'closed', 'Opens today at 12nn'],
  ['12:00', 'open', 'Open now · until 9pm'],
  ['15:00', 'open', 'Open now · until 9pm'],
  ['20:29', 'open', 'Open now · until 9pm'],
  ['20:30', 'soon', 'Closing soon · until 9pm'],
  ['20:59', 'soon', 'Closing soon · until 9pm'],
  ['21:00', 'closed', 'Closed · opens tomorrow 12nn'],
  ['23:59', 'closed', 'Closed · opens tomorrow 12nn'],
];

test.describe('"Open now" badge', { tag: '@REQ-09' }, () => {
  for (const [time, state, text] of SCHEDULE) {
    test(`TC-30 at ${time} Manila time the badge says "${text}"`, async ({ page }) => {
      await page.clock.setFixedTime(manila(time));
      await page.goto('./');
      await expect(badgeText(page)).toHaveText(text);
      await expect(badge(page)).toHaveClass(`open-badge is-${state}`);
    });
  }

  // A visitor whose phone is set to another country's time still sees Manila hours
  for (const timezoneId of ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Pacific/Auckland']) {
    test.describe(`visitor's phone set to ${timezoneId}`, () => {
      test.use({ timezoneId });
      test(`TC-31 badge still follows Manila time (phone set to ${timezoneId})`, async ({ page }) => {
        await page.clock.setFixedTime(manila('15:00'));
        await page.goto('./');
        await expect(badgeText(page)).toHaveText('Open now · until 9pm');
        await page.clock.setFixedTime(manila('22:00'));
        await page.reload();
        await expect(badgeText(page)).toHaveText('Closed · opens tomorrow 12nn');
      });
    });
  }

  test('TC-32 the badge changes by itself while the page is open', async ({ page }) => {
    await page.clock.install({ time: manila('11:59:30') });
    await page.goto('./');
    await expect(badgeText(page)).toHaveText('Opens today at 12nn');
    await page.clock.fastForward('01:00');                       // one minute later: 12:00:30
    await expect(badgeText(page)).toHaveText('Open now · until 9pm');
    await page.clock.fastForward(8.5 * 60 * 60 * 1000);          // 8½ hours later: 20:30:30
    await expect(badgeText(page)).toHaveText('Closing soon · until 9pm');
    await page.clock.fastForward('30:00');                       // 21:00:30
    await expect(badgeText(page)).toHaveText('Closed · opens tomorrow 12nn');
  });
});
