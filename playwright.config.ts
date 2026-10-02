// Playwright settings: which devices to test on, and how to start the site for testing.
import { defineConfig, devices } from '@playwright/test';

const onGitHub = !!process.env.CI;   // GitHub Actions sets CI=true
// Test another copy of the site instead, e.g. the live one:  BASE_URL=https://dionanthonyflores-prog.github.io/mirou-matcha/ npx playwright test
const baseURL = process.env.BASE_URL ?? 'http://localhost:5174/';

export default defineConfig({
  testDir: './tests',
  // Time limit per test. Real animations and smooth scrolling are left on (like a customer sees them),
  // so tests with many taps need more than Playwright's default 30 seconds on a busy computer.
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: onGitHub,               // a test accidentally left as test.only fails the run on GitHub
  retries: onGitHub ? 1 : 0,          // one retry on GitHub; a test that only passes on retry is marked "flaky" in the report
  reporter: onGitHub
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',       // a step-by-step recording of any failed test, viewable in the report
    screenshot: 'only-on-failure',
  },

  // The same tests run on a laptop and on two phones (Android uses Chrome's engine, iPhone uses Safari's)
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'android-phone', use: { ...devices['Pixel 7'] } },
    // WebKit is slower to drive (about 1s per click on Windows), so iPhone tests get more time
    { name: 'iphone', use: { ...devices['iPhone 15'] }, timeout: 120_000 },
  ],

  // Start the little local server before the tests (not needed when BASE_URL points somewhere else)
  webServer: process.env.BASE_URL ? undefined : {
    command: 'node scripts/serve.js',
    url: 'http://localhost:5174',
    reuseExistingServer: !onGitHub,
  },
});
