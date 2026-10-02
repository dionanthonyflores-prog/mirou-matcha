# Test cases and traceability

Requirements (REQ-xx) are listed in the [test plan](test-plan.md#in-scope). Bugs (BUG-xxx) are in the [defect log](defect-log.md).

- **54 automated test cases (TC-01 to TC-54).** Some are run with several inputs (for example 11 ways of typing a town), which makes **81 automated tests**. Each one runs on desktop Chrome, an Android phone and an iPhone, so **243 runs** in total. Of these, 228 apply and 15 are skipped on purpose, for example phone-menu tests on desktop.
- **8 manual test cases (MT-01 to MT-08)** cover what automation cannot judge well, such as how photos look and real phones.
- **Evidence:** in the [test report](https://dionanthonyflores-prog.github.io/mirou-matcha/report/), open any test to see its video and a picture of the final screen.
- In the code, each test's name starts with its TC ID and is tagged with its requirement (`@REQ-04`) and any bug it guards (`@BUG-002`). You can filter by these tags in the [test report](https://dionanthonyflores-prog.github.io/mirou-matcha/report/).

**"Runs on"** means: **All** = desktop, Android and iPhone · **Phones** = Android and iPhone · **Desktop** = desktop only.

## Automated test cases

### Menu: [`tests/menu.spec.ts`](../tests/menu.spec.ts)

| ID | Test case | Expected result | Runs on | Guards |
| --- | --- | --- | --- | --- |
| TC-01 | Open the page | The matcha tab is selected and shows the 6 matcha drinks with the right names and prices. Hojicha is hidden. | All | |
| TC-02 | Tap the hojicha tab | The 4 hojicha drinks show with the right prices. Matcha is hidden. | All | |
| TC-03 | Tap hojicha, then tap matcha straight away, while the cards are still moving | The menu switches to matcha. The second tap is not lost. | All | BUG-004 |
| TC-04 | Compare menu prices with the order builder | All 10 drinks show the same price in both places. | All | |
| TC-05 | Tap "+ order this" on each of the 10 drinks | Each one picks that drink in the order builder, and the page moves down to the builder. | All | |

### Order builder: [`tests/order-builder.spec.ts`](../tests/order-builder.spec.ts)

| ID | Test case | Expected result | Runs on | Guards |
| --- | --- | --- | --- | --- |
| TC-06 | Pick Earl Grey latte, then oatmilk, then quantity 3 | The price next to "Add" goes ₱200 → ₱210 → ₱630. | All | |
| TC-07 | Press − at 1, then + 22 times | The quantity stays at 1, then stops at 20. | All | |
| TC-08 | Look at the slip before adding anything | It shows "no drinks yet" and ₱0, Send is disabled, and there is no "clear order" link. | All | BUG-005 |
| TC-09 | Add 2× Vanilla Crunch and 1× Seasalt Hojicha with oatmilk | Two lines, "oatmilk" noted on the second, total ₱560. | All | |
| TC-10 | Add Matcha latte 2, then 3, then 1 with oatmilk | "5× Matcha latte" on one line, the oatmilk one on its own line, total ₱970. | All | |
| TC-11 | Add 20 + 20 of one drink, then 1 more, then 15 + 10 of another | Each line stops at 20 with a message to order bigger amounts on Messenger. Total ₱6,200. | All | BUG-002 |
| TC-12 | Add two drinks, then press × on one | That line goes and the total drops from ₱600 to ₱400. | All | |
| TC-13 | Add a drink, then press "clear order" | The slip is empty, ₱0, and Send is disabled. | All | |
| TC-14 | Build an order (including a capped line), then reload the page | Same lines and total (₱3,640) after the reload. | All | BUG-002 |
| TC-15 | Damage the saved order data, then load the page | The page works with an empty slip and no script errors. | All | |
| TC-16 | Load a saved order with a drink no longer on the menu, 99 cups and an old price | The old drink is dropped, 99 becomes 20, today's prices are used: ₱3,880. | All | |
| TC-17 | Leave the slip on "Pick up" | No area box, no fee note, and the message says "For: Pick up". | All | |
| TC-18 | Choose "Delivery", then Calamba | The area list shows the 5 towns plus "Somewhere else", the fee note appears, and the message says "Delivery to Calamba" and "+ delivery fee". | All | |
| TC-19 | Choose "Delivery", then "Somewhere else" | The message asks the shop to check if they can deliver. | All | |
| TC-20 | Build an order with notes | The Messenger message matches exactly: greeting, each line with milk and price, total, pick up, notes. | All | |
| TC-21 | Tap Send with an empty slip | Nothing opens. | All | |
| TC-22 | Tap "Copy order & open Messenger" | The shop's Messenger chat opens, "Copied!" shows, and the copied text equals the order (clipboard read in Chromium only). | All | |

### Delivery checker: [`tests/delivery-checker.spec.ts`](../tests/delivery-checker.spec.ts)

| ID | Test case | Expected result | Runs on | Guards |
| --- | --- | --- | --- | --- |
| TC-23 | Look at the town buttons and tap Cabuyao | 5 buttons in order. Tapping fills the box, highlights the button and says "Yes, we deliver to Cabuyao!" | All | |
| TC-24 | Type 11 different spellings: `Calamba`, `CALAMBA`, `calamba city`, `Calamba, Laguna`, `Los Baños`, `los banos`, `UPLB`, `elbi`, `LB`, `cabu`, `Victoria, Laguna` | Each finds the right town. | All | |
| TC-25 | Type `bay` | "Bay is home!" message. | All | |
| TC-26 | Type 3 towns outside the area: `Calauan`, `Santa Rosa`, `Manila` | "…isn't on our usual list" with an "Ask on Messenger" link to the shop. | All | |
| TC-27 | Type 2 letters, then a town, then clear the box | No answer for 2 letters. The answer and highlight clear when the box is emptied. | All | |
| TC-28 | Find a town, then tap "Build your order →" | The slip switches to Delivery with that town chosen and the fee note shown. | All | |
| TC-29 | Type `<img src=x onerror=alert(1)>` | It is shown as plain text. No image is created and no pop-up appears. | All | |

### Open/closed badge: [`tests/open-badge.spec.ts`](../tests/open-badge.spec.ts)

These tests set the browser's clock to exact times.

| ID | Test case | Expected result | Runs on | Guards |
| --- | --- | --- | --- | --- |
| TC-30 | Load the page at 9 Manila times | 00:00 and 11:59: "Opens today at 12nn". 12:00, 15:00 and 20:29: "Open now · until 9pm". 20:30 and 20:59: "Closing soon · until 9pm". 21:00 and 23:59: "Closed · opens tomorrow 12nn". | All | |
| TC-31 | Visitor's phone set to New York, London, Tokyo and Auckland time | Still follows Manila time: open at 15:00 Manila, closed at 22:00 Manila. | All | |
| TC-32 | Leave the page open from 11:59:30 and move the clock forward | Changes by itself to open, then closing soon, then closed, without reloading. | All | |

### Navigation and layout: [`tests/navigation.spec.ts`](../tests/navigation.spec.ts)

| ID | Test case | Expected result | Runs on | Guards |
| --- | --- | --- | --- | --- |
| TC-33 | Tap the menu button | A full-screen menu with 5 links. The button now says "Close menu", focus is on the first link, and the page behind cannot scroll. | Phones | |
| TC-34 | Tap the button again | The menu closes and the page can scroll again. | Phones | |
| TC-35 | Press Esc with the menu open | The menu closes and keyboard focus returns to the menu button. | Phones | |
| TC-36 | On a fresh visit, tap each of the 5 menu links | The menu closes and the section ends up just under the header (58–82px), checked after the page stops moving. | Phones | BUG-003 |
| TC-37 | Check the contact links in the menu | Messenger, Facebook and Instagram open in a new tab at the right address. Email opens the mail app. | Phones | |
| TC-38 | Make the screen wide while the menu is open | The menu closes by itself. | Phones | |
| TC-39 | Check the header | Desktop shows the 5 header links. Phones show the menu button instead. | All | |
| TC-40 | Click each header link on desktop | Each section ends up just under the header. | Desktop | |
| TC-41 | Tap the floating "Build your order" button | It goes to the order builder and hides while the builder is on screen. | Phones | |

### Photo viewer: [`tests/photo-viewer.spec.ts`](../tests/photo-viewer.spec.ts)

| ID | Test case | Expected result | Runs on | Guards |
| --- | --- | --- | --- | --- |
| TC-42 | Tap the first review photo | It opens big on the same page, with its description and "1 / 3". | All | |
| TC-43 | Press next, previous, previous, next | 2 / 3, then 1 / 3, then wraps to 3 / 3, then wraps to 1 / 3. | All | |
| TC-44 | Use the arrow keys | Right and left change the photo. | All | |
| TC-45 | Close with ×, with Esc, and by tapping the dark background | All three close the viewer. | All | |
| TC-46 | Open a gallery photo with the keyboard (Tab, then Enter) | It opens at "1 / 8". | All | |
| TC-47 | Swipe left, then right, with a finger | Next photo, then previous. The viewer stays open. | Android (iPhone: MT-03) | |

### Page health: [`tests/page-health.spec.ts`](../tests/page-health.spec.ts)

| ID | Test case | Expected result | Runs on | Guards |
| --- | --- | --- | --- | --- |
| TC-48 | Load the page and scroll to the bottom | Right title. No script errors, console errors or missing files. | All | |
| TC-49 | Scroll past every photo, including the hojicha tab | Every photo loads. | All | |
| TC-50 | Scroll through the page | The page is never wider than the screen (no sideways scrolling). | All | |
| TC-51 | Read the share tags | Title, description, full web address, and a 1200 × 630 share picture. | All | |
| TC-52 | Check every photo | Each has a description for screen readers. Only decorative copies are left empty. | All | |
| TC-53 | Load with "reduce motion" turned on | Content shows straight away. No fade-ins and no sliding photo strips. | All | |
| TC-54 | Check links to other sites | All use https and open in a new tab with `noopener`. | All | |

## Manual test cases

Run these on real devices before a big change goes live, and after any change to photos.

| ID | Test case | Steps | Expected result | Status |
| --- | --- | --- | --- | --- |
| MT-01 | Visual check of every photo | Open each menu card (both tabs), review and gallery photo at full size, on a phone and on a laptop. | No patches, stray marks, cut-off cups, stretching or blur. Each photo matches its drink. | Not run yet |
| MT-02 | Real Android phone walkthrough (Chrome) | Browse the menu, build an order with delivery, check a town, use the phone menu and the photo viewer, and rotate the phone. | Everything works as on the emulated phone, and the text is readable without zooming. | Not run yet |
| MT-03 | Real iPhone walkthrough (Safari) | As MT-02, and also swipe left and right in the photo viewer. | As MT-02. Swiping changes photos and does not close the viewer. | Not run yet |
| MT-04 | Messenger hand-off on a real phone | Build an order, then tap "Copy order & open Messenger". In the chat, paste. | The Messenger app or chat with mirou matcha opens, and the pasted text is the full order. | Not run yet |
| MT-05 | Facebook share preview | Paste the site address into Facebook's Sharing Debugger (developers.facebook.com/tools/debug). | It shows the share picture, the title "mirou matcha · homebased matcha slow bar in Bay, Laguna" and the description. | Not run yet |
| MT-06 | Slow connection | In Chrome DevTools, set Network to "Slow 4G", reload and use the site. | The page is usable while photos load, and nothing jumps around. | Not run yet |
| MT-07 | Screen reader spot check | With TalkBack (Android) or VoiceOver (iPhone), go through the menu, add a drink and reach the total. | Drink names, prices, buttons and the total are read out clearly. | Not run yet |
| MT-08 | Exploratory session, 30 minutes | Charter: "try to make the order slip wrong". Rapid taps, back button, odd quantities, switching milk mid-way, reloading at odd moments. | Note anything surprising. Log real problems as bugs. | Not run yet |

## Traceability matrix

Every requirement is linked to its tests and to any bugs found in it. ✅ means all automated tests for it pass on all 3 set-ups.

| Requirement | Automated tests | Manual tests | Bugs found | Status |
| --- | --- | --- | --- | --- |
| REQ-01 Menu tabs and prices | TC-01, TC-02, TC-03, TC-04 | MT-01 | BUG-001, BUG-004 | ✅ |
| REQ-02 "+ order this" | TC-05 | MT-02 | | ✅ |
| REQ-03 Drink, milk, quantity | TC-06, TC-07 | MT-08 | | ✅ |
| REQ-04 Order slip | TC-08 – TC-13 | MT-08 | BUG-002, BUG-005 | ✅ |
| REQ-05 Saved order | TC-14, TC-15, TC-16 | MT-08 | BUG-002 | ✅ |
| REQ-06 Pick up or delivery | TC-17, TC-18, TC-19 | MT-02 | | ✅ |
| REQ-07 Send on Messenger | TC-20, TC-21, TC-22 | MT-04 | | ✅ |
| REQ-08 Delivery checker | TC-23 – TC-28 | MT-02 | | ✅ |
| REQ-09 Open/closed badge | TC-30, TC-31, TC-32 | | | ✅ |
| REQ-10 Phone menu | TC-33 – TC-38 | MT-02, MT-03 | BUG-003 | ✅ |
| REQ-11 Photo viewer | TC-42 – TC-47 | MT-03 | | ✅ |
| REQ-12 Phone and desktop layouts | TC-39, TC-40, TC-41, TC-50 | MT-02, MT-03 | | ✅ |
| REQ-13 Page health and photos | TC-48, TC-49 | MT-01, MT-06 | BUG-001 | ✅ |
| REQ-14 Share preview | TC-51 | MT-05 | | ✅ |
| REQ-15 Accessibility basics | TC-35, TC-44, TC-46, TC-52, TC-53 | MT-07 | | ✅ |
| REQ-16 Security basics | TC-29, TC-54 | | | ✅ |
