# Customer Experience QA Findings

**Review date:** 28 October 2026

## Implemented and synced

- The header address selector is present, with saved-address, GPS-pin, and area-selection paths.
- Cart control is positioned at bottom centre above section navigation in the brand palette.
- The short cart view shows the signed-in customer's Craving Points balance.
- Delivery is free from ₹300 food subtotal; combos count.
- The free-delivery milestone uses a ₹200 food-subtotal minimum and counts combos.
- Admin test-only ordering configuration is available. Test orders are isolated from production orders, staff queues, sales, points, and rewards.

## Sync record

- GitHub `main` is pushed at commit `5618f67`.
- Firebase Hosting release completed.
- Firestore rules compiled and released.
- The Functions deployment was partial. `getOrderingStatus`, `createOrder`, and both test-mode admin callables deployed. Several other Functions could not update because the project exceeded its Cloud Run CPU quota; `adminSaveRewardsConfig` is still pending. The legacy live-only `getLoyaltySummary` function was preserved.

## Tests completed after Hosting release

- Live customer `/`, admin `/admin.html`, staff `/staff.html`, and their main JS/CSS assets returned HTTP 200.
- Live `getOrderingStatus` callable returned HTTP 200 and correctly reported current restaurant ordering state.
- Unauthenticated `adminGetOrderTestMode` was rejected with `PERMISSION_DENIED`.
- Unauthenticated `createOrder` was rejected with `UNAUTHENTICATED`; no order was created.
- Local JavaScript syntax checks passed for `script.js`, `admin.js`, `functions/index.js`, `rewards-config.js`, and `functions/rewards-config.js`.
- `git diff --check` passed before the commit.

## Not verified

- Firebase emulators could not bind their configured ports; the alternate-port attempt also failed before the emulator hub started.
- No signed-in customer checkout, OTP, test order, staff queue, or authenticated admin save was run. No real order was placed.
- Mobile browser layout and GPS/address saving were not interactively checked during this pass.
- Because the reward-lineup save Function did not deploy, reward administration and end-to-end reward changes must not be treated as fully live yet.

## Interactive customer follow-up — 28 October 2026

### Passed

- Signed-in customer session survived a page refresh; phone `+919702108779` remained signed in.
- Menu search filtered to the matching Tandoori Chicken Shawarma item and clearing the search restored the full menu.
- Customer order history loaded after a short delay and showed existing orders. The failed test attempt did not add an order.
- Pickup checkout opened with the store address, no delivery-address fields, and Pay on Pickup. The delivery form showed the saved name/address and Pay on Delivery.
- Admin test mode was turned off and the page confirmed: “Test mode is off. Normal online-order rules apply.”
- Temporary test cart items were cleared. No order was placed.

### Failed or incomplete

- On the first cart attempt, an available free-delivery reward was marked selected on an ₹80 cart even though the card said it needed ₹200. The cart then showed free delivery and a ₹30 reward saving. Checkout rejected submission with “Craving Points and rewards are disabled for test orders. [400]”. After switching to pickup and back, the reward appeared locked and the cart correctly showed ₹30 delivery. This is inconsistent UI state and the customer reward eligibility rule still needs verification against the intended ₹200 total food value including combos.
- After refresh, Profile reported “Saved addresses could not load” and the header reverted to “Choose your location”, despite the account remaining signed in. The Craving Points header also showed a dash until the rewards/orders data loaded. This is a customer-critical loading/retry issue.
- The cart showed points to earn (+8 for the ₹80 item) but did not show the existing 67-point balance in the cart summary.
- At 400px responsive width, the fixed bottom navigation covered lower menu cards and content. The cart control appeared at the top-right during one menu state, inconsistent with the requested bottom-centre placement.
- The customer Play page is offline and still labelled “Craving Run”; the planned Food Crush game is not present.
- The checkout backend returned a 400, so successful order placement, order-history update, and reward/point handling were not verified. No real order was submitted. OTP, account creation, address saving/GPS permission, payment completion/refund, and game reward flows were not retested.

### Current live safety state

- Test-only ordering is OFF. Normal customer ordering rules apply.
- The customer cart is empty and no test order was created.

### Local fixes applied after this pass

- The test-order query now includes `isTestOrder == true`, as required by the Firestore read rule.
- Account, loyalty and order-history reads now fail independently, and failed address/account reads have a retry action.
- Free-delivery rewards are cleared when the cart becomes ineligible or changes to pickup; the cart copy no longer implies combos are excluded from every reward.
- The cart now shows a balance only after the loyalty read succeeds, and disables redemption while the balance is unavailable.
- Added mobile scroll clearance and a single final bottom-centre cart position rule; cache query versions were updated.
- These changes have not yet been checked in a fresh browser session or deployed to Hosting.
