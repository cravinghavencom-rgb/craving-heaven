# Saved Change List

Status: customer UI, Firestore rules, core order/status and test-mode Functions are live. Customer fixes 1–5 below and the later free-delivery cart correction are deployed to Hosting and synced to GitHub `main`. Some unrelated Functions updates, including reward-lineup saving, remain blocked by the Firebase project's regional Cloud Run CPU quota.

1. **Delivery-address selector:** The header has a tappable selector with saved addresses, GPS location entry, and address labels.
2. **Bottom-centre cart:** The cart is positioned above the bottom navigation in the brand palette.
3. **Craving Points balance in cart:** The short cart view shows the signed-in balance (or prompts sign-in) alongside estimated points for the order.
4. **Safe test ordering:** Admin can enable test-only ordering for up to 10 approved Indian phone numbers. Test orders are written to separate collections, excluded from staff queues and sales, and do not affect loyalty/rewards.
5. **Free delivery:** Food subtotal of ₹300 or more automatically qualifies, including combo-only and mixed orders.
6. **Free-delivery reward eligibility:** The configured free-delivery reward accepts a ₹200 food subtotal and counts combos, regular menu items, and mixed orders.

## Sync state

- GitHub `main`: commit `5618f67` pushed.
- Firebase Hosting: release completed.
- Firestore rules: compiled and released.
- Firebase Functions: `getOrderingStatus`, `createOrder`, and both test-mode admin callables deployed. Other updates hit the Cloud Run CPU quota; `adminSaveRewardsConfig` is among the functions still pending.

## Customer follow-up changes — 28 October 2026

1. **Free-delivery reward eligibility and cart state — deployed:** The cart clears a selected free-delivery reward if the subtotal falls below its configured minimum, the order already qualifies for automatic free delivery, or the customer switches to pickup. When the reward is applied, delivery progress says so instead of prompting for the automatic ₹300 threshold. Test orders cannot select offers, rewards, or points because the server does not allow them. Combos and regular items count toward the free-delivery reward; the server validates the minimum against the paid order subtotal.
2. **Address and points loading after refresh — implemented locally:** Test-order history reads now include the Firestore rule’s required `isTestOrder == true` filter. Account, loyalty, and order reads are isolated so an order-history failure does not hide saved addresses or points. Retry controls are available for failed account/address loads.
3. **Craving Points balance in cart — implemented locally:** The cart shows the signed-in balance when loaded, and a clear unavailable state if the balance cannot be fetched. Point redemption is unavailable until that balance loads.
4. **Responsive content overlap — implemented locally:** Added scroll clearance below the page content so menu cards can be brought above the fixed bottom navigation and cart button on mobile.
5. **Cart placement — implemented locally:** The cart button has one final bottom-centre position rule above the bottom navigation; CSS and JavaScript references have new cache versions.
6. **Replace the obsolete Play page — deferred by request:** Leave the game page unchanged for the next session.

Firebase Hosting deployment and GitHub sync are complete. The customer checks below remain unverified until a fresh browser session confirms the deployed behavior.

Successful production checkout, order-history update, OTP, address saving/GPS, payment/refund, and customer game reward flows remain unverified. Test mode was turned OFF after the check; no order was placed and the temporary cart was cleared.
