# Test plan: mirou matcha website

| | |
| --- | --- |
| **Product** | [mirou matcha](https://dionanthonyflores-prog.github.io/mirou-matcha/), a one-page ordering website for a home-based matcha bar in Bay, Laguna |
| **Version tested** | `main` branch, October 2026 |
| **Tester** | Dion Anthony Flores |
| **Product owner** | The owner of mirou matcha (confirms prices, opening hours, delivery towns and order rules) |
| **Related documents** | [Test cases and traceability](test-cases.md) · [Defect log](defect-log.md) · [Case study summary](README.md) |

## 1. Purpose

Customers use the site to see the menu, put an order together and send it to the shop on Messenger. A wrong total, a lost item or a broken button on a phone means a wrong or lost order. This plan describes how the site is tested so that customers can order correctly on the phones and computers they actually use.

## 2. Scope

### In scope

| ID | Requirement |
| --- | --- |
| REQ-01 | The menu shows every drink with its price, split into matcha and hojicha tabs. |
| REQ-02 | "+ order this" on a menu card picks that drink in the order builder and goes there. |
| REQ-03 | The order builder lets the customer pick a drink, regular milk or oatmilk (+₱10), and a quantity from 1 to 99, with − and + or by typing it. |
| REQ-04 | The order slip shows each line and a correct total. The same drink and milk join one line, one drink stops at 99 (a guard against typing mistakes; the owner has no limit on order size), and lines can be removed or the slip cleared. |
| REQ-05 | The order is kept if the page is reloaded, and is re-checked against today's menu and prices. |
| REQ-06 | The customer chooses pick up or delivery. Delivery asks for the area and mentions the delivery fee. |
| REQ-07 | "Copy order & open Messenger" copies a complete order message and opens the shop's Messenger chat. An empty order cannot be sent. |
| REQ-08 | The delivery checker recognises the 5 delivery towns, however they are typed, and tells other towns to message the shop. |
| REQ-09 | The "Open now" badge follows the shop's hours (12nn to 9pm, "closing soon" in the last 30 minutes) in Manila time, whatever time zone the visitor's phone uses. |
| REQ-10 | On phones, a full-screen menu opens and closes properly, and its links land on the right section. |
| REQ-11 | Review and gallery photos open in a photo viewer with next/previous, keyboard, swipe and close. |
| REQ-12 | The layout works on phones and desktops, with no sideways scrolling. |
| REQ-13 | The page loads with no errors or missing files, and photos display correctly. |
| REQ-14 | Links shared on Facebook or Messenger show the right title, description and picture. |
| REQ-15 | Accessibility basics: photo descriptions, keyboard use, and respect for the "reduce motion" setting. |
| REQ-16 | Security basics: typed text is never run as code, and links to other sites open safely. |

### Out of scope

- Messenger, Facebook and Instagram themselves. The tests check that the site sends customers to the right place with the right text; what those apps do afterwards is checked by hand (MT-04, MT-05).
- The accuracy of prices and hours. These are business decisions; the tests check the site matches what the owner listed.
- Load and performance testing. A small shop site gets low traffic, and it is hosted on GitHub Pages.
- Old browsers that are no longer updated (for example Internet Explorer).

### Changes to the requirements

| ID | Date | Changed | Why | What was done |
| --- | --- | --- | --- | --- |
| CR-01 | 3 Oct 2026 | REQ-03, REQ-04 | During exploratory session MT-08, the tester built a 60-cup order (20 each of 3 drinks) and questioned the limit. Checking the rule showed it counted each drink-and-milk pair, so the same drink could reach 40 cups (20 with regular milk plus 20 with oatmilk) while the message said "20 of one drink is the most". Asked about it, the owner said the 20-cup limit was never her rule: she has no limit on order size. It had come with the site's original code. | The limit was raised to 99 per drink, only to stop typing mistakes like 1000 cups. Customers can now type the quantity instead of tapping + many times. The message now reads "The order slip takes up to 99 of each drink." TC-07, TC-11, TC-14 and TC-16 were updated, and TC-07 now also covers typing (letters, 0, an empty box, Enter). |

## 3. Approach

The risk is highest where money and orders are involved, so the order builder, totals and the Messenger message get the most test cases. Navigation, photos and the badge come next.

| Type of testing | How |
| --- | --- |
| Functional, end-to-end | Automated with Playwright: a real browser clicks through the site like a customer. |
| Cross-browser and device | Every automated test runs on 3 set-ups (see section 4). |
| Evidence | Every automated test in the report has a video of the run and a picture of its final screen. Failed tests also keep a full-size screenshot and a step-by-step trace. |
| Regression | The full suite runs on every push. Each fixed bug has a test tagged with its ID (for example `@BUG-002`) so it cannot come back unnoticed. |
| Exploratory and visual | Manual sessions, mainly on real phones, looking for anything the scripts cannot judge (see manual tests MT-01 to MT-08). |
| Accessibility basics | Automated checks for photo descriptions, keyboard use and "reduce motion", plus a manual screen-reader spot check. |
| Security basics | Automated checks that typed text is shown as plain text and that outside links open safely. |

Test design techniques used:

- **Boundary values:** quantity 1 and 99 (plus 0, an empty box and letters when typed); the badge at 11:59, 12:00, 20:29, 20:30, 20:59 and 21:00.
- **Equivalence classes:** town spellings (exact, all caps, no accents, with "city" or "Laguna", nicknames, partial names), towns outside the area, and inputs that are too short.
- **Decision table:** pick up vs delivery × area chosen / not chosen / "somewhere else".
- **State transitions:** menu tabs, phone menu open/closed, photo viewer open/closed and wrap-around.
- **Error guessing:** damaged saved data, a saved drink that is no longer on the menu, script-like text typed into the town box, very fast taps.

## 4. Test environments

| Set-up | Browser engine | Screen | Used for |
| --- | --- | --- | --- |
| `desktop-chrome` | Chromium 153 | 1280 × 720 | Automated |
| `android-phone` (Pixel 7) | Chromium 153, touch | 412 × 839 | Automated |
| `iphone` (iPhone 15) | WebKit 26.6 (Safari's engine), touch | 393 × 659 | Automated |
| Real Android phone, Chrome | | | Manual |
| Real iPhone, Safari | | | Manual |

- **Tools:** Playwright 1.63 with TypeScript, Node.js 24, GitHub Actions on Ubuntu, and Chrome DevTools for manual checks.
- **Where tests run:** on a laptop against a local copy (`npm test`), and on GitHub for every push. They can also run against the live site: `BASE_URL=https://dionanthonyflores-prog.github.io/mirou-matcha/ npx playwright test`.
- **Test data:** the shop's real menu and delivery towns. No customer data is used.
- **External services:** links to Messenger, Facebook and Instagram are replaced with a stand-in page during automated tests, so the tests never contact those sites.

Emulated phones are close to real ones but not identical. That is why the plan keeps manual checks on real devices (MT-02, MT-03).

## 5. Entry and exit criteria

**Testing starts when** the site runs locally and the requirements above are agreed with the product owner.

**A release is ready when:**

- every automated test passes on all 3 set-ups (GitHub refuses to publish otherwise),
- there are no open Critical or Major bugs,
- every fixed bug has a regression test, and that test was seen to fail on the old code,
- the manual checks for anything that changed have been done.

## 6. Bug reporting

Every bug gets an ID, steps to reproduce, expected vs actual result, evidence (screenshots before and after), severity, priority, root cause, fix and how it was verified. See the [defect log](defect-log.md).

| Severity | Meaning |
| --- | --- |
| Critical | Customers cannot order, or are charged the wrong amount. |
| Major | A main feature gives a wrong result, or an order changes without the customer knowing. |
| Minor | A feature works, but awkwardly or incorrectly in some cases. There is an easy workaround. |
| Trivial | Looks wrong but does not affect anything. |

| Priority | Meaning |
| --- | --- |
| High | Fix before the next release. |
| Medium | Fix soon. |
| Low | Fix when convenient. |

**Bug life cycle:** New → Confirmed (reproduced) → Fixed → Verified (the regression test passes and fails on the old code) → Closed.

## 7. Risks

| Risk | What is done about it |
| --- | --- |
| Animations and smooth scrolling make automated tests flaky. | Tests wait for scrolling and animations to finish. Unstable tests are repeated (for example 5 runs per set-up) before they are trusted. GitHub retries once and marks any test that only passes on retry as "flaky" in the report. |
| Emulated phones differ from real ones. | Manual checks on a real Android phone and a real iPhone (MT-02, MT-03). |
| Messenger and Facebook cannot be tested automatically. | Automated tests check the link and message text. Manual tests check the hand-off (MT-04, MT-05). |
| Outside files (fonts, the smooth-scrolling library) fail to load. | TC-48 fails if any file is missing or the page shows an error. |
| A test passes even when the feature is broken. | Each bug's regression test is run against the old, buggy code to prove it fails there. |

## 8. Deliverables

- This test plan
- [Test cases and traceability matrix](test-cases.md)
- Automated tests in [`tests/`](../tests), with the [latest test report](https://dionanthonyflores-prog.github.io/mirou-matcha/report/)
- [Defect log](defect-log.md) with full bug reports and [evidence](evidence/)
