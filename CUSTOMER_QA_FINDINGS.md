# Customer Experience QA Findings

**Review date:** 28 October 2026

## Local changes implemented

- The header address selector is present locally, with saved-address, GPS-pin, and area-selection paths.
- Cart control is placed at bottom centre above the section navigation and uses the brand palette.
- The short cart view shows the signed-in customer's current Craving Points balance.
- Online delivery is free from ₹300 food subtotal; combos count.
- The free-delivery milestone has a ₹200 food-subtotal minimum; combos count.
- Admin has a restricted test-only ordering setting. Server code isolates tester orders and leaves production order, sales, loyalty, and rewards data untouched.

## Checks completed

- `node --check` passed for `script.js`, `admin.js`, `functions/index.js`, `rewards-config.js`, and `functions/rewards-config.js`.
- `git diff --check` passed.
- Source review confirmed the test mode and order-collection routing are implemented in trusted Firebase Functions, while Firestore client writes remain denied.

## Checks blocked or still outstanding

- Firebase emulators could not bind the configured ports. Retrying on alternate local ports also timed out before the emulator hub started.
- No authenticated browser checkout, test order, staff queue check, or admin save flow was completed in this pass.
- Mobile layout and address selection have not been verified in a browser during this pass.
- Production sync is still pending; do not treat the changes as live until deployment is confirmed.

The emulator failure means backend transaction behavior, Firestore rule behavior, and end-to-end customer/staff/admin integration are not yet verified.
