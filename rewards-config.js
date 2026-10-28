(function (root, build) {
  const config = build();
  if (typeof module !== "undefined" && module.exports) module.exports = config;
  root.CRAVING_REWARDS = config;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const journey = [
    { order: 1, id: "order-1-burger", kind: "free-item", title: "Free Classic Crunchy Burger", detail: "Unlocked after completing order 1 · use on a later order", minimum: 0, item: "Classic Crunchy Burger", itemPrice: 80 },
    { order: 2, id: "delivery-200", kind: "free-delivery", title: "Free delivery", detail: "On ₹200 food subtotal · combos count", minimum: 200 },
    { order: 3, id: "fries-250", kind: "free-item", title: "Classic Salted Fries (Half) on us", detail: "On ₹250 regular menu spend", minimum: 250, item: "Classic Salted Fries (HALF)", itemPrice: 70 },
    { order: 4, kind: "progress", title: "Keep the cravings going", detail: "Your next reward is getting closer" },
    { order: 5, id: "points-150", kind: "bonus-points", title: "150 bonus Craving Points", detail: "Added after your next delivered order", points: 150 },
    { order: 6, kind: "progress", title: "One order closer", detail: "Keep ordering to unlock your next treat" },
    { order: 7, id: "burger-270", kind: "free-item", title: "Classic Crunchy Burger on us", detail: "On ₹270 regular menu spend", minimum: 270, item: "Classic Crunchy Burger", itemPrice: 80 },
    { order: 8, id: "off-25-325", kind: "discount", title: "₹25 off", detail: "On ₹325 regular menu spend", minimum: 325, amount: 25 },
    { order: 9, kind: "progress", title: "A little more to go", detail: "Your next reward is ahead" },
    { order: 10, kind: "progress", title: "Keep building your streak", detail: "Every delivered order moves you forward" },
    { order: 11, id: "shawarma-275", kind: "free-item", title: "Classic Chicken Shawarma on us", detail: "On ₹275 regular menu spend", minimum: 275, item: "Classic Chicken Shawarma", itemPrice: 90 },
    { order: 12, kind: "progress", title: "Your next treat is coming", detail: "Keep going" },
    { order: 13, kind: "progress", title: "Almost at your next milestone", detail: "One more order after this" },
    { order: 14, id: "double-points", kind: "double-points", title: "Double Craving Points", detail: "Earn double Craving Points on one order · up to 100 bonus Craving Points", maxBonusPoints: 100 },
    { order: 15, kind: "progress", title: "Keep the streak alive", detail: "Your next reward is ahead" },
    { order: 16, kind: "progress", title: "A treat is getting closer", detail: "Every delivered order moves you forward" },
    { order: 17, id: "off-30-349", kind: "discount", title: "₹30 off", detail: "On ₹349 regular menu spend", minimum: 349, amount: 30 },
    { order: 18, kind: "progress", title: "Keep building your streak", detail: "Your next reward is ahead" },
    { order: 19, kind: "progress", title: "One order away", detail: "A new treat is coming" },
    { order: 20, id: "popcorn-240", kind: "free-item", title: "Crunchy Chicken Popcorn (Medium) on us", detail: "On ₹240 regular menu spend", minimum: 240, item: "Crunchy Chicken Popcorn (MEDIUM)", itemPrice: 110 },
    { order: 21, kind: "progress", title: "Keep the cravings going", detail: "Your next reward is ahead" },
    { order: 22, kind: "progress", title: "Your next treat is getting closer", detail: "Every delivered order moves you forward" },
    { order: 23, kind: "progress", title: "Almost there", detail: "One more order after this" },
    { order: 24, id: "points-250", kind: "bonus-points", title: "250 bonus Craving Points", detail: "Added after your next delivered order", points: 250 },
    { order: 25, kind: "progress", title: "Keep the streak alive", detail: "Your next reward is ahead" },
    { order: 26, kind: "progress", title: "A fresh reward is coming", detail: "Every delivered order moves you forward" },
    { order: 27, id: "off-40-375", kind: "discount", title: "₹40 off", detail: "On ₹375 regular menu spend", minimum: 375, amount: 40 },
    { order: 28, kind: "progress", title: "Nearly at the final treat", detail: "Keep ordering" },
    { order: 29, kind: "progress", title: "One order from your milestone", detail: "Your next reward is almost here" },
    { order: 30, id: "wrap-225", kind: "free-item", title: "Regular Chicken Wrap on us", detail: "On ₹225 regular menu spend", minimum: 225, item: "Regular Chicken Wrap", itemPrice: 80 }
  ];
  return {
    pointRateRegularRupees: 10,
    pointRateComboRupees: 20,
    pointsPerRedemptionRupees: 100,
    maxRedeemPointsPerOrder: 1000,
    welcomeItem: "Classic Crunchy Burger",
    freeItemExpiryDays: 7,
    journey,
    rewardById: Object.fromEntries(journey.filter(item => item.id).map(item => [item.id, item]))
  };
});
