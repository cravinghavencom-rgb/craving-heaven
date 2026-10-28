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
