const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { MENU_DATA, COMBO_MENU_DATA } = require("./menu-catalog");
const REWARDS = require("./rewards-config");

initializeApp();
const activeProjectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "";
if (activeProjectId === "demo-craving-heaven-local" && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9400";
}
const db = getFirestore();
const REGION = "asia-south1";
const DELIVERY_CHARGE = 30;
const FREE_DELIVERY_THRESHOLD = 300;
const DELIVERY_AREAS = new Set([
  "Pathanwadi", "Kurar Village", "Koknipada", "Triveni Nagar", "Sanjay Nagar",
  "MHB Colony", "Dindoshi", "Laxman Nagar", "Rani Sati Marg", "Gokuldham", "Tapovan"
]);
const ORDERING_STATUS_REF = () => db.collection("restaurantSettings").doc("onlineOrdering");

function mumbaiDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isStoreOpenNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  const hour = Number(parts.find(part => part.type === "hour")?.value || 0);
  const minute = Number(parts.find(part => part.type === "minute")?.value || 0);
  const currentMinutes = hour * 60 + minute;
  return currentMinutes >= 16 * 60 + 30 && currentMinutes < 23 * 60 + 45;
}

async function readOrderingStatus() {
  const snapshot = await ORDERING_STATUS_REF().get();
  const settings = snapshot.exists ? snapshot.data() : {};
  const paused = settings.paused === true;
  const staffEnabled = settings.enabled === true && settings.enabledForDate === mumbaiDateKey();
  const isOpen = isStoreOpenNow();
  const acceptingOnlineOrders = isOpen && staffEnabled && !paused;
  return {
    isOpen,
    paused,
    staffEnabled,
    acceptingOnlineOrders,
    message: !staffEnabled
      ? "Online ordering is off until staff starts taking orders. Please check back soon."
      : paused
        ? "High order volume: we’re temporarily not taking online orders. Please try again shortly."
        : !isOpen
      ? "Online ordering is closed right now. Please check back later."
        : "Online ordering is open."
  };
}

exports.getOrderingStatus = onCall({ region: REGION }, async () => readOrderingStatus());

exports.staffSetOnlineOrderingEnabled = onCall({ region: REGION }, async request => {
  const staffUid = await requireStaff(request);
  if (typeof request.data?.enabled !== "boolean") {
    throw new HttpsError("invalid-argument", "Choose whether online ordering should be on or off.");
  }
  await ORDERING_STATUS_REF().set({
    enabled: request.data.enabled,
    enabledForDate: request.data.enabled ? mumbaiDateKey() : null,
    paused: false,
    updatedBy: staffUid,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return readOrderingStatus();
});

exports.staffSetOnlineOrderingPaused = onCall({ region: REGION }, async request => {
  const staffUid = await requireStaff(request);
  if (typeof request.data?.paused !== "boolean") {
    throw new HttpsError("invalid-argument", "Choose whether online orders should be paused.");
  }
  await ORDERING_STATUS_REF().set({
    paused: request.data.paused,
    updatedBy: staffUid,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return readOrderingStatus();
});

async function requireStaff(request) {
  if (!request.auth?.uid || request.auth.token.staff !== true) {
    throw new HttpsError("permission-denied", "Staff access is required.");
  }
  // Check the current Auth record as well as the ID token. This makes staff
  // removal effective immediately instead of waiting for the token to expire.
  let currentUser;
  try {
    currentUser = await getAuth().getUser(request.auth.uid);
  } catch (error) {
    console.error("Could not verify current staff access", error);
    throw new HttpsError("permission-denied", "Staff access could not be verified.");
  }
  if (currentUser.disabled || currentUser.customClaims?.staff !== true) {
    throw new HttpsError("permission-denied", "Staff access is required.");
  }
  return request.auth.uid;
}

function normalizeIndianMobile(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return "";
}

const PRICE_BY_NAME = new Map();
const EXTRA_NAMES = new Set((MENU_DATA.extras?.items || []).map(item => item.name));
for (const section of Object.values(MENU_DATA)) {
  for (const item of section.items) {
    if (Array.isArray(item.options)) {
      for (const option of item.options) PRICE_BY_NAME.set(option.name, Number(option.price));
    } else {
      PRICE_BY_NAME.set(item.name, Number(item.price));
    }
  }
}
for (const combo of COMBO_MENU_DATA) PRICE_BY_NAME.set(combo.name, Number(combo.price));

const FREE_OFFERS = Object.freeze({});

function mumbaiWeekday() {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" }).format(new Date());
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function validateAndPriceItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
    throw new HttpsError("invalid-argument", "Your cart is empty or has too many different items.");
  }
  let quantityTotal = 0;
  let subtotal = 0;
  let eligibleSubtotal = 0;
  let regularPointSubtotal = 0;
  let comboPointSubtotal = 0;
  let burgerCount = 0;
  let freeOffer = null;
  const pricedItems = [];
  const comboNames = new Set(COMBO_MENU_DATA.map(combo => combo.name));

  for (const line of items) {
    const name = typeof line?.name === "string" ? line.name.trim() : "";
    const qty = Number(line?.qty);
    if (!name || !Number.isSafeInteger(qty) || qty < 1 || qty > 50) {
      throw new HttpsError("invalid-argument", "One or more cart items are invalid.");
    }
    quantityTotal += qty;
    if (quantityTotal > 100) throw new HttpsError("invalid-argument", "Your order contains too many items.");

    if (line.isFreeOffer) {
      if (freeOffer || qty !== 1 || !FREE_OFFERS[line.freeOfferId]) {
        throw new HttpsError("failed-precondition", "Only one valid free offer may be used per order.");
      }
      freeOffer = { id: line.freeOfferId, ...FREE_OFFERS[line.freeOfferId] };
      if (name.toUpperCase() !== freeOffer.name) {
        throw new HttpsError("failed-precondition", "The selected free offer does not match the cart.");
      }
      pricedItems.push({ name: freeOffer.name, price: 0, qty: 1, isFreeOffer: true });
      continue;
    }

    const price = PRICE_BY_NAME.get(name);
    if (!Number.isSafeInteger(price) || price <= 0) {
      throw new HttpsError("invalid-argument", `The menu item “${name}” is not available.`);
    }
    const isCombo = comboNames.has(name);
    const lineTotal = price * qty;
    subtotal += lineTotal;
    if (!isCombo && !EXTRA_NAMES.has(name)) eligibleSubtotal += lineTotal;
    if (isCombo) comboPointSubtotal += lineTotal;
    else if (!EXTRA_NAMES.has(name)) regularPointSubtotal += lineTotal;
    if (!isCombo && name.toLowerCase() === "classic crunchy burger") burgerCount += qty;
    pricedItems.push({ name, price, qty, isCombo, isFreeOffer: false, lineTotal });
  }

  if (freeOffer) {
    const weekday = mumbaiWeekday();
    if (!freeOffer.days.includes(weekday)) throw new HttpsError("failed-precondition", "This free offer is not available today.");
    if (freeOffer.kind === "subtotal" && eligibleSubtotal < freeOffer.threshold) {
      throw new HttpsError("failed-precondition", "Add more regular menu items to qualify for this free offer. Combos do not count toward spend offers.");
    }
    if (freeOffer.kind === "burger-count" && burgerCount < freeOffer.requiredQty) {
      throw new HttpsError("failed-precondition", "Add 3 Classic Crunchy Burgers to qualify for this offer.");
    }
  }

  return { pricedItems, subtotal, eligibleSubtotal, regularPointSubtotal, comboPointSubtotal, freeOffer };
}

exports.createOrder = onCall({ region: REGION }, async request => {
  if (!request.auth?.uid || !request.auth.token.phone_number) {
    throw new HttpsError("unauthenticated", "Sign in with your mobile number to place an order.");
  }
  const data = request.data || {};
  const orderType = data.orderType === undefined ? "delivery" : data.orderType;
  if (!["delivery", "pickup"].includes(orderType)) {
    throw new HttpsError("invalid-argument", "Choose delivery or store pickup.");
  }
  const customerName = typeof data.customerName === "string" ? data.customerName.trim() : "";
  const address = orderType === "delivery" && typeof data.address === "string" ? data.address.trim() : "";
  const landmark = orderType === "delivery" && typeof data.landmark === "string" ? data.landmark.trim() : "";
  const area = orderType === "delivery" && typeof data.area === "string" ? data.area.trim() : "";
  const requestId = typeof data.requestId === "string" ? data.requestId : "";
  if (customerName.length < 2 || customerName.length > 80 || (orderType === "delivery" && (address.length < 8 || address.length > 300 || landmark.length > 100 || !DELIVERY_AREAS.has(area)))) {
    throw new HttpsError("invalid-argument", "Enter a valid name, full address, landmark, and supported delivery area.");
  }
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) {
    throw new HttpsError("invalid-argument", "Order reference is missing. Please retry checkout.");
  }
  const paymentMethod = orderType === "pickup" ? "Pay on Pickup" : "Pay on Delivery";
  if (data.paymentMethod && data.paymentMethod !== paymentMethod) {
    throw new HttpsError("invalid-argument", "Choose the payment method for your delivery or pickup order.");
  }

  const { pricedItems, subtotal, eligibleSubtotal, regularPointSubtotal, comboPointSubtotal, freeOffer } = validateAndPriceItems(data.items);
  const uid = request.auth.uid;
  const accountRef = db.collection("loyaltyAccounts").doc(uid);
  const requestRef = db.collection("orderRequests").doc(`${uid}_${requestId}`);
  const orderRef = db.collection("orders").doc();
  const orderingStatusRef = ORDERING_STATUS_REF();

  const result = await db.runTransaction(async transaction => {
    const existingRequest = await transaction.get(requestRef);
    if (existingRequest.exists) return existingRequest.data().response;

    const orderingStatusSnapshot = await transaction.get(orderingStatusRef);
    const orderingSettings = orderingStatusSnapshot.exists ? orderingStatusSnapshot.data() : {};
    if (!isStoreOpenNow()) {
      throw new HttpsError("failed-precondition", "Online ordering is closed right now. Please check back later.");
    }
    if (orderingSettings.enabled !== true || orderingSettings.enabledForDate !== mumbaiDateKey()) {
      throw new HttpsError("failed-precondition", "Online ordering is off until our team starts taking orders. Please check back soon.");
    }
    if (orderingSettings.paused === true) {
      throw new HttpsError("failed-precondition", "High order volume: online ordering is temporarily paused. Please try again shortly.");
    }

    const accountSnapshot = await transaction.get(accountRef);
    const account = accountSnapshot.exists ? accountSnapshot.data() : {};
    const balance = Math.max(0, Number(account.points || 0));
    const availableRewards = Array.isArray(account.availableRewards) ? account.availableRewards : [];
    const loyaltyRewardTicketId = typeof data.loyaltyRewardId === "string" ? data.loyaltyRewardId : "";
    const requestedPoints = Number(data.redeemPoints || 0);
    const applyFirstOrderReward = data.applyFirstOrderReward === true;
    const hasOtherBenefit = Boolean(freeOffer || loyaltyRewardTicketId || requestedPoints > 0);
    let welcomeUsed = false;
    let pointsDiscount = 0;
    let discountAmount = 0;
    let deliveryReward = false;
    let pointsBonus = 0;
    let pointsMultiplier = 1;
    let claimedReward = null;
    let loyaltyReward = null;

    if (!Number.isSafeInteger(requestedPoints) || requestedPoints < 0 || requestedPoints > REWARDS.maxRedeemPointsPerOrder || requestedPoints % 100 !== 0) {
      throw new HttpsError("invalid-argument", "Redeem Craving Points in 100-point steps, up to 1,000 per order.");
    }
    if (requestedPoints && (requestedPoints > balance || freeOffer || loyaltyRewardTicketId || applyFirstOrderReward)) {
      throw new HttpsError("failed-precondition", "Craving Points cannot be combined with another offer or reward, or your balance is too low.");
    }
    if (loyaltyRewardTicketId) {
      claimedReward = availableRewards.find(reward => reward.ticketId === loyaltyRewardTicketId || (!reward.ticketId && reward.id === loyaltyRewardTicketId));
      loyaltyReward = claimedReward ? REWARDS.rewardById[claimedReward.id] : null;
      if (!loyaltyReward || freeOffer || requestedPoints) {
        throw new HttpsError("failed-precondition", "This reward is no longer available or cannot be combined with another offer.");
      }
      const oldestReward = availableRewards.filter(reward => !reward.expiresAt || timestampMillis(reward.expiresAt) > Date.now()).sort((a, b) => timestampMillis(a.issuedAt) - timestampMillis(b.issuedAt))[0];
      if (!oldestReward || (oldestReward.ticketId || oldestReward.id) !== loyaltyRewardTicketId) {
        throw new HttpsError("failed-precondition", "Use your oldest available Royal Rewards benefit first.");
      }
      if (claimedReward.expiresAt && timestampMillis(claimedReward.expiresAt) <= Date.now()) {
        throw new HttpsError("failed-precondition", "This reward has expired. Choose another available reward.");
      }
      if (eligibleSubtotal < Number(loyaltyReward.minimum || 0)) {
        throw new HttpsError("failed-precondition", `Add ${Math.max(0, Number(loyaltyReward.minimum) - eligibleSubtotal)} more in regular menu items to use this reward. Combos do not count toward spend rewards.`);
      }
      if (loyaltyReward.kind === "free-delivery" && orderType === "pickup") {
        throw new HttpsError("failed-precondition", "Free-delivery rewards can only be used on delivery orders.");
      }
      if (loyaltyReward.kind === "free-delivery") deliveryReward = true;
      if (loyaltyReward.kind === "free-delivery" && subtotal >= FREE_DELIVERY_THRESHOLD) {
        throw new HttpsError("failed-precondition", "Your order already qualifies for free delivery. Save this reward for a future order.");
      }
      if (loyaltyReward.kind === "discount") discountAmount = loyaltyReward.amount;
      if (loyaltyReward.kind === "bonus-points") pointsBonus = loyaltyReward.points;
      if (loyaltyReward.kind === "double-points") pointsMultiplier = 2;
      if (loyaltyReward.kind === "free-item") {
        const itemPrice = PRICE_BY_NAME.get(loyaltyReward.item);
        if (!Number.isSafeInteger(itemPrice) || itemPrice <= 0) throw new HttpsError("failed-precondition", "This reward item is unavailable.");
        pricedItems.push({ name: loyaltyReward.item, price: 0, qty: 1, isCombo: false, isFreeOffer: false, isLoyaltyReward: true, loyaltyRewardId: loyaltyRewardTicketId, lineTotal: 0 });
      }
    }
    if (applyFirstOrderReward) {
      if (hasOtherBenefit || account.welcomeCompleted || account.welcomeReservationId || eligibleSubtotal <= 0) {
        throw new HttpsError("failed-precondition", "Your first-order burger reward needs a paid regular-menu item and cannot be combined with another offer or reward.");
      }
      const oldOrders = await transaction.get(db.collection("orders").where("uid", "==", uid).where("source", "==", "website").limit(1));
      if (!oldOrders.empty) throw new HttpsError("failed-precondition", "The free burger reward is only for your first online order.");
      welcomeUsed = true;
      const welcomeItemPrice = PRICE_BY_NAME.get(REWARDS.welcomeItem);
      if (!Number.isSafeInteger(welcomeItemPrice) || welcomeItemPrice <= 0) throw new HttpsError("failed-precondition", "The first-order reward item is unavailable.");
      pricedItems.push({ name: REWARDS.welcomeItem, price: 0, qty: 1, isCombo: false, isFreeOffer: false, isLoyaltyReward: true, isWelcomeReward: true, lineTotal: 0 });
    }

    pointsDiscount = requestedPoints / REWARDS.pointsPerRedemptionRupees * 10;
    if (pointsDiscount > eligibleSubtotal) throw new HttpsError("failed-precondition", "Your food subtotal is too low for that points redemption.");
    const deliveryCharge = orderType === "pickup" || deliveryReward || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
    const totalDiscount = discountAmount + pointsDiscount;
    const total = Math.max(0, subtotal - totalDiscount + deliveryCharge);
    const regularSpentForPoints = Math.max(0, regularPointSubtotal - discountAmount - pointsDiscount);
    const basePoints = Math.floor(regularSpentForPoints / REWARDS.pointRateRegularRupees) + Math.floor(comboPointSubtotal / REWARDS.pointRateComboRupees);
    const pointsToAward = (pointsMultiplier === 2 ? basePoints + Math.min(basePoints, Number(loyaltyReward.maxBonusPoints || 0)) : basePoints) + pointsBonus;
    const remainingRewards = loyaltyRewardTicketId ? availableRewards.filter(reward => reward.ticketId !== loyaltyRewardTicketId && !( !reward.ticketId && reward.id === loyaltyRewardTicketId)) : availableRewards;

    transaction.create(orderRef, {
      uid,
      customerName,
      mobile: request.auth.token.phone_number,
      address,
      landmark,
      area,
      paymentMethod,
      items: pricedItems,
      subtotal,
      eligibleSubtotal,
      discountAmount: totalDiscount,
      discountType: welcomeUsed ? "welcome-gift" : loyaltyReward?.kind || (freeOffer ? "daily-offer" : requestedPoints ? "points" : "none"),
      deliveryReward,
      pointsRedeemed: requestedPoints,
      pointsDiscount,
      pointsToAward,
      claimedRewardId: loyaltyRewardTicketId || null,
      claimedReward: loyaltyRewardTicketId ? { ticketId: loyaltyRewardTicketId, id: claimedReward.id, kind: loyaltyReward.kind, title: loyaltyReward.title, expiresAt: claimedReward.expiresAt || null } : null,
      welcomeUsed,
      deliveryCharge,
      total,
      status: "new",
      orderType,
      source: "website",
      pointsStatus: orderType === "pickup" ? "pending-completion" : "pending-delivery",
      createdAt: FieldValue.serverTimestamp()
    });
    if (requestedPoints || loyaltyRewardTicketId || welcomeUsed) {
      transaction.set(accountRef, {
        uid,
        points: balance - requestedPoints,
        availableRewards: remainingRewards,
        ...(welcomeUsed ? { welcomeReservationId: orderRef.id } : {}),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    const response = { orderId: orderRef.id, subtotal, discountAmount: totalDiscount, deliveryCharge, total, pointsRedeemed: requestedPoints, items: pricedItems };
    transaction.create(requestRef, { uid, orderId: orderRef.id, response, createdAt: FieldValue.serverTimestamp() });
    return response;
  });
  return result;
});

exports.staffListOrders = onCall({ region: REGION }, async request => {
  await requireStaff(request);
  const snapshot = await db.collection("orders").orderBy("createdAt", "desc").limit(100).get();
  return {
    orders: snapshot.docs.map(document => {
      const order = document.data();
      return {
        id: document.id,
        customerName: String(order.customerName || "Customer"),
        mobile: String(order.mobile || ""),
        address: String(order.address || ""),
        landmark: String(order.landmark || ""),
        area: String(order.area || ""),
        items: Array.isArray(order.items) ? order.items : [],
        subtotal: Number(order.subtotal || 0),
        discountAmount: Number(order.discountAmount || 0),
        deliveryCharge: Number(order.deliveryCharge || 0),
        total: Number(order.total || 0),
        paymentMethod: String(order.paymentMethod || ""),
        paymentStatus: String(order.paymentStatus || "pending"),
        status: String(order.status || "new"),
        pointsToAward: Number(order.pointsToAward || 0),
        loyaltyLinked: Boolean(order.uid),
        source: String(order.source || "website"),
        orderType: String(order.orderType || "delivery"),
        createdAt: order.createdAt?.toDate?.().toISOString?.() || null
      };
    })
  };
});

exports.staffGetTodaySales = onCall({ region: REGION }, async request => {
  await requireStaff(request);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const part = type => parts.find(value => value.type === type)?.value;
  const dayKey = `${part("year")}-${part("month")}-${part("day")}`;
  const [year, month, day] = dayKey.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const snapshot = await db.collection("orders")
    .where("createdAt", ">=", start)
    .where("createdAt", "<", end)
    .get();
  const totals = {
    date: dayKey,
    timezone: "Asia/Kolkata",
    total: { sales: 0, orders: 0 },
    online: { sales: 0, orders: 0 },
    walkIn: { sales: 0, orders: 0 }
  };
  for (const document of snapshot.docs) {
    const order = document.data();
    if (["cancelled", "canceled"].includes(String(order.status || "").toLowerCase())) continue;
    const channel = order.source === "walk-in" ? totals.walkIn : totals.online;
    const amount = Math.max(0, Number(order.total || 0));
    totals.total.sales += amount;
    totals.total.orders += 1;
    channel.sales += amount;
    channel.orders += 1;
  }
  return totals;
});

exports.staffLookupCustomer = onCall({ region: REGION }, async request => {
  await requireStaff(request);
  const mobile = normalizeIndianMobile(request.data?.mobile);
  if (!mobile) throw new HttpsError("invalid-argument", "Enter a valid Indian mobile number.");
  let user;
  try {
    user = await getAuth().getUserByPhoneNumber(mobile);
  } catch (error) {
    if (error.code === "auth/user-not-found") return { found: false };
    console.error("Could not look up customer account by phone", error);
    throw new HttpsError("unavailable", "Customer lookup is temporarily unavailable.");
  }
  const [profileSnapshot, loyaltySnapshot, orderSnapshot] = await Promise.all([
    db.collection("customerProfiles").doc(user.uid).get(),
    db.collection("loyaltyAccounts").doc(user.uid).get(),
    db.collection("orders").where("uid", "==", user.uid).limit(20).get()
  ]);
  const profile = profileSnapshot.exists ? profileSnapshot.data() : {};
  const loyalty = loyaltySnapshot.exists ? loyaltySnapshot.data() : {};
  const availableRewards = Array.isArray(loyalty.availableRewards) ? loyalty.availableRewards : [];
  const activeRewards = availableRewards
    .filter(reward => !reward.expiresAt || timestampMillis(reward.expiresAt) > Date.now())
    .sort((left, right) => timestampMillis(left.issuedAt) - timestampMillis(right.issuedAt));
  const completedOrders = Math.max(0, Number(loyalty.completedOrders || 0));
  const cycleOrder = completedOrders === 0 ? 0 : ((completedOrders - 1) % 30) + 1;
  const previewOrder = cycleOrder === 30 ? 0 : cycleOrder;
  const activeRewardIds = new Set(activeRewards.map(reward => reward.id));
  const upcomingRewards = REWARDS.journey.filter(reward => reward.id && reward.order > previewOrder && !activeRewardIds.has(reward.id)).slice(0, 2);
  const recentOrderName = [...orderSnapshot.docs]
    .sort((left, right) => timestampMillis(right.data().createdAt) - timestampMillis(left.data().createdAt))
    .map(document => String(document.data().customerName || "").trim())
    .find(name => name.length >= 2);
  return {
    found: true,
    name: String(profile.name || user.displayName || recentOrderName || "").slice(0, 80),
    points: Math.max(0, Number(loyalty.points || 0)),
    completedOrders,
    availableRewards: activeRewards.map(reward => {
      const definition = REWARDS.rewardById[reward.id] || reward;
      const expiry = reward.expiresAt ? timestampMillis(reward.expiresAt) : 0;
      return {
        ticketId: String(reward.ticketId || reward.id || ""),
        id: String(reward.id || ""),
        kind: String(definition.kind || reward.kind || ""),
        title: String(definition.title || reward.title || "Reward"),
        detail: String(definition.detail || reward.detail || "Ready to use"),
        expiresAt: expiry ? new Date(expiry).toISOString() : null,
        minimum: Number(definition.minimum || 0),
        amount: Number(definition.amount || 0),
        item: String(definition.item || ""),
        itemPrice: Number(definition.itemPrice || 0),
        points: Number(definition.points || 0),
        maxBonusPoints: Number(definition.maxBonusPoints || 0),
        issuedAt: timestampMillis(reward.issuedAt)
      };
    }),
    upcomingRewards: upcomingRewards.map(reward => ({ order: reward.order, title: reward.title, detail: reward.detail }))
  };
});

exports.staffUpdateOrderStatus = onCall({ region: REGION }, async request => {
  await requireStaff(request);
  const orderId = typeof request.data?.orderId === "string" ? request.data.orderId.trim() : "";
  const nextStatus = typeof request.data?.status === "string" ? request.data.status : "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) {
    throw new HttpsError("invalid-argument", "Choose a valid order.");
  }
  const orderRef = db.collection("orders").doc(orderId);
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snapshot.data();
    const currentStatus = String(order.status || "new").toLowerCase();
    const finishStatus = order.source === "walk-in" || order.orderType === "pickup" ? "completed" : "delivered";
    const allowedNext = {
      new: ["preparing", finishStatus, "cancelled"],
      preparing: ["ready", finishStatus, "cancelled"],
      ready: [finishStatus, "cancelled"]
    };
    if (!allowedNext[currentStatus]?.includes(nextStatus)) {
      throw new HttpsError("failed-precondition", "That status change is no longer available. Refresh the order list.");
    }
    transaction.update(orderRef, { status: nextStatus, updatedAt: FieldValue.serverTimestamp() });
    return { orderId, status: nextStatus };
  });
});

exports.staffMarkOrderPaid = onCall({ region: REGION }, async request => {
  const staffUid = await requireStaff(request);
  const orderId = typeof request.data?.orderId === "string" ? request.data.orderId.trim() : "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(orderId)) {
    throw new HttpsError("invalid-argument", "Choose a valid order.");
  }
  const orderRef = db.collection("orders").doc(orderId);
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) throw new HttpsError("not-found", "Order not found.");
    const order = snapshot.data();
    if (["cancelled", "canceled"].includes(String(order.status || "").toLowerCase())) {
      throw new HttpsError("failed-precondition", "Cancelled orders cannot be marked as paid.");
    }
    if (String(order.paymentStatus || "pending").toLowerCase() !== "pending") {
      throw new HttpsError("failed-precondition", "This order is already marked as paid.");
    }
    transaction.update(orderRef, {
      paymentStatus: "paid",
      paymentReceivedAt: FieldValue.serverTimestamp(),
      paymentRecordedBy: staffUid,
      updatedAt: FieldValue.serverTimestamp()
    });
    return { orderId, paymentStatus: "paid" };
  });
});

exports.createWalkInOrder = onCall({ region: REGION }, async request => {
  const staffUid = await requireStaff(request);
  const data = request.data || {};
  const customerName = typeof data.customerName === "string" ? data.customerName.trim() : "Walk-in customer";
  const rawMobile = typeof data.mobile === "string" ? data.mobile.trim() : "";
  const mobile = rawMobile ? normalizeIndianMobile(rawMobile) : "";
  const paymentMethod = typeof data.paymentMethod === "string" ? data.paymentMethod : "";
  const paymentStatus = typeof data.paymentStatus === "string" ? data.paymentStatus : "";
  const requestId = typeof data.requestId === "string" ? data.requestId : "";
  if (customerName.length < 2 || customerName.length > 80) {
    throw new HttpsError("invalid-argument", "Enter a customer name (2 to 80 characters).");
  }
  if (rawMobile && !mobile) {
    throw new HttpsError("invalid-argument", "Enter a valid mobile number or leave it blank.");
  }
  if (!["Cash", "UPI"].includes(paymentMethod) || !["paid", "pending"].includes(paymentStatus)) {
    throw new HttpsError("invalid-argument", "Choose a valid payment method and payment status.");
  }
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) {
    throw new HttpsError("invalid-argument", "Order reference is missing. Please retry.");
  }
  const { pricedItems, subtotal, eligibleSubtotal, regularPointSubtotal, comboPointSubtotal } = validateAndPriceItems(data.items);
  let customerUid = null;
  if (mobile) {
    try {
      customerUid = (await getAuth().getUserByPhoneNumber(mobile)).uid;
    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        console.error("Could not match walk-in phone to a customer account", error);
        throw new HttpsError("unavailable", "Could not verify the customer account. Please retry the order.");
      }
    }
  }
  const orderRef = db.collection("orders").doc();
  const requestRef = db.collection("orderRequests").doc(`staff_${staffUid}_${requestId}`);
  return db.runTransaction(async transaction => {
    const existing = await transaction.get(requestRef);
    if (existing.exists) return existing.data().response;
    const accountRef = customerUid ? db.collection("loyaltyAccounts").doc(customerUid) : null;
    const accountSnapshot = accountRef ? await transaction.get(accountRef) : null;
    const account = accountSnapshot?.exists ? accountSnapshot.data() : {};
    const balance = Math.max(0, Number(account.points || 0));
    const availableRewards = Array.isArray(account.availableRewards) ? account.availableRewards : [];
    const requestedPoints = Number(data.redeemPoints || 0);
    const loyaltyRewardTicketId = typeof data.loyaltyRewardId === "string" ? data.loyaltyRewardId : "";
    if (!Number.isSafeInteger(requestedPoints) || requestedPoints < 0 || requestedPoints > REWARDS.maxRedeemPointsPerOrder || requestedPoints % 100 !== 0) {
      throw new HttpsError("invalid-argument", "Redeem Craving Points in 100-point steps, up to 1,000 per order.");
    }
    if ((requestedPoints || loyaltyRewardTicketId) && !customerUid) {
      throw new HttpsError("failed-precondition", "Enter the mobile number linked to the customer's website account to use loyalty benefits.");
    }
    if (requestedPoints && (requestedPoints > balance || loyaltyRewardTicketId)) {
      throw new HttpsError("failed-precondition", "Use Craving Points alone, and check the customer's balance.");
    }

    let claimedReward = null;
    let loyaltyReward = null;
    let discountAmount = 0;
    let deliveryReward = false;
    let pointsBonus = 0;
    let pointsMultiplier = 1;
    if (loyaltyRewardTicketId) {
      claimedReward = availableRewards.find(reward => reward.ticketId === loyaltyRewardTicketId || (!reward.ticketId && reward.id === loyaltyRewardTicketId));
      loyaltyReward = claimedReward ? REWARDS.rewardById[claimedReward.id] : null;
      if (!loyaltyReward || requestedPoints) throw new HttpsError("failed-precondition", "This reward is no longer available or cannot be combined with points.");
      const activeRewards = availableRewards.filter(reward => !reward.expiresAt || timestampMillis(reward.expiresAt) > Date.now());
      const oldestReward = activeRewards.sort((a, b) => timestampMillis(a.issuedAt) - timestampMillis(b.issuedAt))[0];
      if (!oldestReward || (oldestReward.ticketId || oldestReward.id) !== loyaltyRewardTicketId) {
        throw new HttpsError("failed-precondition", "Use the oldest available Royal Rewards benefit first.");
      }
      if (claimedReward.expiresAt && timestampMillis(claimedReward.expiresAt) <= Date.now()) {
        throw new HttpsError("failed-precondition", "This reward has expired. Choose another available reward.");
      }
      if (loyaltyReward.kind === "free-delivery") {
        throw new HttpsError("failed-precondition", "Free delivery rewards can be used on website delivery orders, not counter orders.");
      }
      if (eligibleSubtotal < Number(loyaltyReward.minimum || 0)) {
        throw new HttpsError("failed-precondition", `Add ${Math.max(0, Number(loyaltyReward.minimum) - eligibleSubtotal)} more in regular menu items to use this reward. Combos do not count toward spend rewards.`);
      }
      if (loyaltyReward.kind === "discount") discountAmount = Number(loyaltyReward.amount || 0);
      if (loyaltyReward.kind === "bonus-points") pointsBonus = Number(loyaltyReward.points || 0);
      if (loyaltyReward.kind === "double-points") pointsMultiplier = 2;
      if (loyaltyReward.kind === "free-item") {
        const itemPrice = PRICE_BY_NAME.get(loyaltyReward.item);
        if (!Number.isSafeInteger(itemPrice) || itemPrice <= 0) throw new HttpsError("failed-precondition", "This reward item is unavailable.");
        pricedItems.push({ name: loyaltyReward.item, price: 0, qty: 1, isCombo: false, isFreeOffer: false, isLoyaltyReward: true, loyaltyRewardId: loyaltyRewardTicketId, lineTotal: 0 });
      }
    }
    const pointsDiscount = requestedPoints / REWARDS.pointsPerRedemptionRupees * 10;
    if (pointsDiscount > eligibleSubtotal) throw new HttpsError("failed-precondition", "Craving Points cannot reduce the eligible food subtotal below zero.");
    const totalDiscount = discountAmount + pointsDiscount;
    const total = Math.max(0, subtotal - totalDiscount);
    const regularSpentForPoints = Math.max(0, regularPointSubtotal - discountAmount - pointsDiscount);
    const basePoints = customerUid
      ? Math.floor(regularSpentForPoints / REWARDS.pointRateRegularRupees) + Math.floor(comboPointSubtotal / REWARDS.pointRateComboRupees)
      : 0;
    const pointsToAward = (pointsMultiplier === 2 ? basePoints + Math.min(basePoints, Number(loyaltyReward?.maxBonusPoints || 0)) : basePoints) + pointsBonus;
    const remainingRewards = loyaltyRewardTicketId
      ? availableRewards.filter(reward => reward.ticketId !== loyaltyRewardTicketId && !(!reward.ticketId && reward.id === loyaltyRewardTicketId))
      : availableRewards;

    const order = {
      uid: customerUid,
      customerName,
      mobile,
      address: "",
      landmark: "",
      area: "",
      paymentMethod,
      paymentStatus,
      items: pricedItems,
      subtotal,
      eligibleSubtotal,
      discountAmount: totalDiscount,
      discountType: loyaltyReward?.kind || (requestedPoints ? "points" : "none"),
      deliveryCharge: 0,
      total,
      status: "new",
      source: "walk-in",
      orderType: "walk-in",
      createdBy: staffUid,
      pointsToAward,
      pointsRedeemed: requestedPoints,
      pointsDiscount,
      claimedRewardId: loyaltyRewardTicketId || null,
      claimedReward: loyaltyRewardTicketId ? { ticketId: loyaltyRewardTicketId, id: claimedReward.id, kind: loyaltyReward.kind, title: claimedReward.title, expiresAt: claimedReward.expiresAt || null } : null,
      pointsStatus: customerUid ? "pending-delivery" : "not-applicable",
      createdAt: FieldValue.serverTimestamp()
    };
    transaction.create(orderRef, order);
    if (requestedPoints || loyaltyRewardTicketId) {
      transaction.set(accountRef, {
        uid: customerUid,
        points: balance - requestedPoints,
        availableRewards: remainingRewards,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
    const response = { orderId: orderRef.id, subtotal, discountAmount: totalDiscount, pointsDiscount, total, pointsRedeemed: requestedPoints, loyaltyLinked: Boolean(customerUid), pointsToAward, benefitTitle: loyaltyReward?.title || (requestedPoints ? `${requestedPoints} Craving Points` : ""), items: pricedItems };
    transaction.create(requestRef, { orderId: orderRef.id, response, createdAt: FieldValue.serverTimestamp() });
    return response;
  });
});

// Keep the deployed trigger's stable name so a deploy updates the existing
// production trigger instead of creating a second points-awarding trigger.
exports.onOrderStatusChanged = onDocumentUpdated({ document: "orders/{orderId}", region: REGION }, async event => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || !["website", "walk-in"].includes(after.source) || !after.uid) return;

  const accountRef = db.collection("loyaltyAccounts").doc(after.uid);
  const entryRef = accountRef.collection("entries").doc(event.params.orderId);
  const isLoyaltyComplete = order => order.source === "walk-in" || order.orderType === "pickup"
    ? ["completed", "delivered"].includes(String(order.status || "").toLowerCase())
    : String(order.status || "").toLowerCase() === "delivered";
  const becameDelivered = !isLoyaltyComplete(before) && isLoyaltyComplete(after);
  const becameCancelled = !["cancelled", "canceled"].includes(String(before.status || "").toLowerCase()) && ["cancelled", "canceled"].includes(String(after.status || "").toLowerCase());
  if (!becameDelivered && !becameCancelled) return;
  await db.runTransaction(async transaction => {
    const [orderSnapshot, entrySnapshot, accountSnapshot] = await Promise.all([
      transaction.get(event.data.after.ref), transaction.get(entryRef), transaction.get(accountRef)
    ]);
    if (!orderSnapshot.exists) return;
    const order = orderSnapshot.data();
    const account = accountSnapshot.exists ? accountSnapshot.data() : {};
    const points = Math.max(0, Number(order.pointsToAward || 0));
    if (becameDelivered) {
      if (entrySnapshot.exists) return;
      const completedOrders = Math.max(0, Number(account.completedOrders || 0)) + 1;
      // The welcome offer is first-order only; later cycles continue at journey order 2.
      const step = completedOrders === 1 ? 1 : ((completedOrders - 2) % 29) + 2;
      const milestone = REWARDS.journey.find(item => item.order === step && item.id);
      const availableRewards = Array.isArray(account.availableRewards) ? [...account.availableRewards] : [];
      if (milestone) {
        availableRewards.push({
          ticketId: `${event.params.orderId}-${milestone.id}`,
          id: milestone.id,
          order: milestone.order,
          title: milestone.title,
          detail: milestone.detail,
          expiresAt: milestone.kind === "free-item" ? new Date(Date.now() + REWARDS.freeItemExpiryDays * 86400000) : null,
          issuedAt: new Date()
        });
      }
      const currentPoints = Math.max(0, Number(account.points || 0));
      transaction.set(entryRef, { orderId: event.params.orderId, points, amount: Number(order.subtotal || 0), reason: "delivered-order", createdAt: FieldValue.serverTimestamp() });
      transaction.set(accountRef, {
        uid: order.uid,
        points: currentPoints + points,
        totalEarned: Math.max(0, Number(account.totalEarned || 0)) + points,
        totalRedeemed: Math.max(0, Number(account.totalRedeemed || 0)) + Number(order.pointsRedeemed || 0),
        completedOrders,
        availableRewards,
        ...(order.welcomeUsed ? { welcomeCompleted: true, welcomeReservationId: FieldValue.delete() } : {}),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      transaction.update(event.data.after.ref, { pointsStatus: "awarded", pointsAwarded: points, rewardsJourneyOrder: completedOrders });
      return;
    }
    if (order.loyaltyReversed) return;
    const availableRewards = Array.isArray(account.availableRewards) ? [...account.availableRewards] : [];
    if (order.claimedRewardId && order.claimedReward && !availableRewards.some(item => item.ticketId === order.claimedRewardId)) {
      const definition = REWARDS.rewardById[order.claimedReward.id];
      const expired = order.claimedReward.expiresAt && timestampMillis(order.claimedReward.expiresAt) <= Date.now();
      if (definition && !expired) availableRewards.push({ ...order.claimedReward, order: definition.order, detail: definition.detail, expiresAt: order.claimedReward.expiresAt || null });
    }
    transaction.set(accountRef, {
      uid: order.uid,
      points: Math.max(0, Number(account.points || 0)) + Number(order.pointsRedeemed || 0),
      availableRewards,
      ...(order.welcomeUsed ? { welcomeReservationId: FieldValue.delete() } : {}),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.update(event.data.after.ref, { loyaltyReversed: true });
  });
});
