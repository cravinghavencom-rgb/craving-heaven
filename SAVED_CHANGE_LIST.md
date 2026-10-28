# Saved Change List

Status: customer UI and Firestore rules are live; Git is synced. Core order/status and test-mode Functions deployed. Some unrelated/current Functions updates, including reward-lineup saving, remain blocked by the Firebase project's regional Cloud Run CPU quota.

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
